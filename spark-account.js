import * as f from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import * as engine from './player-engine.js';
const emailFor=alias=>`${alias}@recovery.tinkle.invalid`;
export function recoveryParts(code){
 const match=String(code).trim().toLowerCase().match(/^([a-f0-9]{32})\.([a-f0-9]{64})$/);
 if(!match)throw Error('Enter your complete recovery code.');
 return {alias:match[1],password:match[2],email:emailFor(match[1])};
}
export function createBackend(app,a,auth,useEmulators,onWallet,onBan=()=>{}){
 const db=f.getFirestore(app);if(useEmulators)f.connectFirestoreEmulator(db,'127.0.0.1',8080);
 let stop=null,stopBan=null;
 const ref=()=>{if(!auth.currentUser)throw Error('Connect your account first.');return f.doc(db,'tinklePlayers',auth.currentUser.uid);};
 const readWallet=data=>{if(!data)return null;const copy={...data};delete copy.updatedAt;delete copy.operation;delete copy.cardAt;delete copy.loginAt;return copy;};
 function watch(){
  stop?.();stopBan?.();const uid=auth.currentUser?.uid;if(!uid)return;
  stopBan=f.onSnapshot(f.doc(db,'tinkleBans',uid),snapshot=>{if(!snapshot.metadata.hasPendingWrites&&!snapshot.metadata.fromCache&&auth.currentUser?.uid===uid)onBan(snapshot.exists()?snapshot.data():null);},()=>{});
  stop=f.onSnapshot(ref(),snapshot=>{if(!snapshot.metadata.hasPendingWrites&&auth.currentUser?.uid===uid&&snapshot.exists())onWallet(engine.view(readWallet(snapshot.data())));},()=>{});
 }
 const publicData=wallet=>JSON.parse(JSON.stringify(engine.publicProfile(wallet)));
 async function load(){const [snapshot,ban]=await Promise.all([f.getDocFromServer(ref()),f.getDocFromServer(f.doc(db,'tinkleBans',auth.currentUser.uid))]);return {wallet:snapshot.exists()?engine.view(readWallet(snapshot.data())):null,ban:ban.exists()?ban.data():null};}
 async function register(payload,requestId){
  const name=engine.username(payload.username),user=auth.currentUser;
  // Link a random, private credential to the existing browser identity. No real email is requested or sent.
  let code=payload.recovery;
  if(user.isAnonymous){const alias=Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');code=alias+'.'+payload.recovery;const parts=recoveryParts(code);await a.linkWithCredential(user,a.EmailAuthProvider.credential(parts.email,parts.password));}
  else{await a.updatePassword(user,payload.recovery);code=user.email.split('@')[0]+'.'+payload.recovery;}
  await user.getIdToken(true);
  const player=ref(),claim=f.doc(db,'tinkleUsernames',name.toLowerCase()),score=f.doc(db,'tinkleLeaderboard',user.uid);
  const wallet=engine.fresh(name,Date.now());
  await f.runTransaction(db,async tx=>{
   const [existing,reserved]=await Promise.all([tx.get(player),tx.get(claim)]);
   if(existing.exists())throw Error('This account already has a username.');
   if(reserved.exists())throw Error('That username is taken.');
   tx.set(claim,{uid:user.uid});tx.set(player,{...wallet,updatedAt:f.serverTimestamp(),cardAt:null,loginAt:null,operation:{id:requestId,type:'register'}});tx.set(score,publicData(wallet));
  });
  return {wallet:engine.view(wallet),recoveryCode:code};
 }
 async function recover(code){const parts=recoveryParts(code);await a.signInWithEmailAndPassword(auth,parts.email,parts.password);watch();return load();}
 async function rotate(payload){
  const parts=recoveryParts(payload.currentCode),user=auth.currentUser;
  if(parts.email!==user.email)throw Error('Use this account’s current recovery code.');
  await a.reauthenticateWithCredential(user,a.EmailAuthProvider.credential(parts.email,parts.password));
  await a.updatePassword(user,payload.recovery);
  return {result:{message:'Code replaced.',recoveryCode:parts.alias+'.'+payload.recovery}};
 }
 async function change(action,payload,requestId){
  const uid=auth.currentUser.uid,player=ref(),receipt=f.doc(player,'requests',requestId),score=f.doc(db,'tinkleLeaderboard',uid);
  const run=()=>f.runTransaction(db,async tx=>{
   const [snapshot,saved]=await Promise.all([tx.get(player),tx.get(receipt)]);
   if(!snapshot.exists())throw Error('Choose your username first.');
   const previous=snapshot.data(),wallet=readWallet(previous),now=Date.now();
   if(saved.exists())return {wallet:engine.view(wallet),result:saved.data().result};
   let kind=action,args=payload;
   if(action==='reward'&&payload.kind==='code')args={...payload,payload:{code:String(payload.payload?.code||'').trim().toUpperCase()}};
   if(action==='crashPoll'){
    const round=wallet.games.crash;
    if(!round||round.done||now<round.startedAt+Math.log(Math.min(20,round.crashAt))*6000)return {wallet:engine.view(wallet)};
    kind='move';args={game:'crash',id:round.id,revision:round.revision,move:'tick'};
   }
   const result=engine.apply(wallet,kind,args,now);
   const cleanResult=JSON.parse(JSON.stringify(args.game?engine.publicRound(args.game,result):result));
   const operation={id:requestId,type:kind,payload:JSON.parse(JSON.stringify(args)),delta:wallet.balance-previous.balance};
   const cardReward=kind==='reward'&&args.kind==='card'&&result.amount>0;
   const loginReward=kind==='reward'&&args.kind==='visit'&&result.amount>0;
   // Server timestamps let the rules enforce daily login and the shared five-minute cooldown.
   tx.set(player,{...JSON.parse(JSON.stringify(wallet)),updatedAt:f.serverTimestamp(),cardAt:cardReward?f.serverTimestamp():previous.cardAt,loginAt:loginReward?f.serverTimestamp():previous.loginAt,operation});
   tx.set(score,publicData(wallet));
   tx.set(receipt,{result:cleanResult,revision:wallet.revision});
   return {wallet:engine.view(wallet),result:cleanResult};
  });
  try{return await run();}catch(error){
   if(error.code!=='permission-denied')throw error;
   // A concurrent commit can win before the rules check the losing transaction.
   const saved=await f.getDocFromServer(receipt);
   if(saved.exists()){const snapshot=await f.getDocFromServer(player);return {wallet:engine.view(readWallet(snapshot.data())),result:saved.data().result};}
   throw error;
  }
 }
 return {watch,load,async call(action,payload={},requestId=crypto.randomUUID()){
  if(action==='recover')return recover(payload.code);
  if(action==='register')return register(payload,requestId);
  if(action==='rotateRecovery')return rotate(payload);
  if(action==='load')return load();
  if(action==='leaderboard'){
   const snapshot=await f.getDocs(f.query(f.collection(db,'tinkleLeaderboard'),f.orderBy('balance','desc'),f.limit(50)));
   return {players:snapshot.docs.map(doc=>({...doc.data(),isYou:doc.id===auth.currentUser.uid}))};
  }
  return change(action,payload,requestId);
 }};
}
