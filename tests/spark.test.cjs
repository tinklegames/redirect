const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),{randomBytes,randomUUID}=require('node:crypto');
const appSdk=require('../functions/node_modules/firebase/app'),a=require('../functions/node_modules/firebase/auth'),f=require('../functions/node_modules/firebase/firestore');
const {initializeTestEnvironment,assertFails}=require('../functions/node_modules/@firebase/rules-unit-testing');
globalThis.window=globalThis;globalThis.__sparkFirestore=f;
const code=randomBytes(32).toString('hex');
async function setup(){
 const engineUrl=pathToFileURL(path.resolve('player-engine.js')).href;
 const source=fs.readFileSync('spark-account.js','utf8').replace(/import \* as f from '[^']+';/,"const f=globalThis.__sparkFirestore;").replace("'./player-engine.js'",JSON.stringify(engineUrl));
 const {createBackend}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const app=appSdk.initializeApp({apiKey:'demo-api-key',projectId:'demo-tinkle',authDomain:'demo-tinkle.firebaseapp.com'},randomUUID());const auth=a.getAuth(app);a.connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});await a.signInAnonymously(auth);
 const backend=createBackend(app,a,auth,true,()=>{});const call=backend.call;backend.call=async(...args)=>{try{return await call(...args);}catch(error){error.message=args[0]+' '+(args[1]?.kind||'')+': '+error.message;throw error;}};return {app,auth,backend,db:f.getFirestore(app)};
}
test('Spark signup, recovery, purchases, cooldown rules and leaderboard work without Functions',async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-tinkle',firestore:{host:'127.0.0.1',port:8080,rules:fs.readFileSync('firestore.accounts.rules','utf8')}});
 const one=await setup(),two=await setup(),name='Spark_'+Date.now().toString(36);
 try{
  let r=await one.backend.call('register',{username:name,recovery:code});assert.equal(r.wallet.balance,1000);assert.match(r.recoveryCode,/^[a-f0-9]{32}\.[a-f0-9]{64}$/);const recovery=r.recoveryCode,uid=one.auth.currentUser.uid;
  await assert.rejects(two.backend.call('register',{username:name.toUpperCase(),recovery:randomBytes(32).toString('hex')}),/taken/);
  const id=randomUUID();const purchases=await Promise.all([one.backend.call('buy',{id:'badge-star'},id),one.backend.call('buy',{id:'badge-star'},id)]);assert.equal(purchases[0].wallet.balance,750);assert.equal(purchases[1].wallet.balance,750);
  await assert.rejects(one.backend.call('buy',{id:'badge-star'}),/already own/);
  await assert.rejects(one.backend.call('equip',{category:'theme',id:'theme-cherry'}),/Buy/);
  r=await one.backend.call('equip',{category:'badge',id:'badge-star'});assert.equal(r.wallet.equipped.badge,'badge-star');
  r=await one.backend.call('reward',{kind:'visit',payload:null});assert.equal(r.wallet.balance,775);
  r=await one.backend.call('reward',{kind:'visit',payload:null});assert.equal(r.wallet.balance,775);
  const cards=globalThis.GAME_CARDS.slice(0,3);
  r=await one.backend.call('reward',{kind:'card',payload:{code:cards[0].code}});assert.equal(r.wallet.balance,825);
  r=await one.backend.call('reward',{kind:'card',payload:{code:cards[1].code}});assert.equal(r.wallet.balance,825);assert.equal(r.wallet.rewards.daily.games.length,1);
  // Direct edits cannot give free items, rename accounts, or change another player's data.
  const player=f.doc(one.db,'tinklePlayers',uid);
  await assertFails(f.updateDoc(player,{owned:['badge-star','badge-crown']}));
  await assertFails(f.updateDoc(player,{username:'StolenName'}));
  await assertFails(f.getDoc(f.doc(two.db,'tinklePlayers',uid)));
  await assertFails(f.setDoc(f.doc(two.db,'tinkleLeaderboard',uid),{username:name,balance:999999,equipped:{}}));
  // Advance client time to forge another rewarded click: the server timestamp still rejects it.
  const engine=await import(pathToFileURL(path.resolve('player-engine.js')).href);
  const old=(await f.getDoc(player)).data(),forged=structuredClone(r.wallet);delete forged.rewardState;
  engine.apply(forged,'reward',{kind:'card',payload:{code:cards[2].code}},Date.now()+300000);
  const batch=f.writeBatch(one.db);batch.set(player,{...forged,cardAt:f.serverTimestamp(),loginAt:old.loginAt,updatedAt:f.serverTimestamp(),operation:{id:randomUUID(),type:'reward',payload:{kind:'card',payload:{code:cards[2].code}},delta:50}});batch.set(f.doc(one.db,'tinkleLeaderboard',uid),engine.publicProfile(forged));await assertFails(batch.commit());
  // Simulate an elapsed cooldown in local emulator data, then the next click can progress.
  await env.withSecurityRulesDisabled(async context=>{await context.firestore().doc('tinklePlayers/'+uid).update({cardAt:new Date(Date.now()-301000),'rewards.nextCardAt':0});});
  r=await one.backend.call('reward',{kind:'card',payload:{code:cards[1].code}});assert.equal(r.wallet.rewards.daily.games.length,2);
  r=await one.backend.call('reward',{kind:'achievement',payload:{id:'first-pick'}});assert.equal(r.result.amount,50);
  r=await one.backend.call('reward',{kind:'code',payload:{code:'TINKLE100'}});assert.equal(r.result.amount,100);
  for(const game of ['coin','dice','slots']){r=await one.backend.call('instant',{game,stake:1,choice:'Heads'});assert.ok(Number.isSafeInteger(r.wallet.balance));}
  for(const game of ['blackjack','mines','crash','scratch','plinko','wheel','roulette']){
   r=await one.backend.call('start',{game,stake:1,choice:'red',pick:0,options:{size:4,mineCount:3}});const round=r.wallet.games[game];
   if(!round.done)await one.backend.call('move',{game,id:round.id,revision:0,move:game==='blackjack'?'stand':game==='mines'?0:game==='scratch'?'all':game==='roulette'?'skip':'cash'});
  }
  const recovered=await two.backend.call('recover',{code:recovery});assert.equal(two.auth.currentUser.uid,uid);assert.equal(recovered.wallet.username,name);assert.ok(recovered.wallet.owned.includes('badge-star'));
  const next=randomBytes(32).toString('hex');r=await two.backend.call('rotateRecovery',{currentCode:recovery,recovery:next});assert.ok(r.result.recoveryCode.endsWith(next));await assert.rejects(one.backend.call('recover',{code:recovery}));
  const scores=await two.backend.call('leaderboard');assert.ok(scores.players.some(p=>p.username===name));assert.ok(scores.players.length<=50);
 }finally{await appSdk.deleteApp(one.app);await appSdk.deleteApp(two.app);await env.cleanup();}
});
