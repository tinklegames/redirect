const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function setup() {
 const data=new Map();let queue=Promise.resolve(),now=0;
 const ctx={window:{dispatchEvent(){}},Event:class{},Date:{now:()=>now},localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},navigator:{locks:{request:(key,fn)=>{const result=queue.then(fn);queue=result.catch(()=>{});return result;}}}};
 vm.createContext(ctx);
 const load=file=>vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ctx);
 ['lounge-games.js','lounge-extra-rules.js','tinkle-wallet.js'].forEach(load);
 return {g:ctx.window.LoungeGames,r:ctx.window.LoungeExtraRules,w:ctx.window.TinkleWallet,clock:t=>now=t,reload:()=>{load('tinkle-wallet.js');return ctx.window.TinkleWallet;}};
}
test('Any available whole-token bet including odd blackjack bets and all-in; reject overdrafts',async()=>{
 const {w,g,r}=setup();
 await w.wager(1000,()=>({payout:2000}));assert.equal(w.balance(),2000);
 await w.startGame('wheel',2000,stake=>r.create('wheel',stake,()=>1,0,'wheel'));assert.equal(w.balance(),2000);
 await w.startBlackjack(1999,stake=>({id:'bj',stake,player:[0,9],dealer:[9,8],deck:[],done:false,payout:0}));
 await w.playBlackjack('bj',2,round=>g.act(round,'stand'));assert.equal(w.balance(),4998);
 assert.doesNotThrow(()=>g.start(1,n=>n-1));
 for(const stake of [0,-1,1.5,NaN,4999])await assert.rejects(w.wager(stake,()=>({payout:0})));
 await w.wager(4998,()=>({payout:0}));assert.equal(w.balance(),0);
});
test('Balanced instant games have documented lower expected returns with fair faces',()=>{
 const {g}=setup();
 const coin=[0,1].reduce((sum,n)=>sum+g.instant('coin',100,()=>n,'Heads').payout,0)/2;assert.equal(coin,70);
 const dice=Array.from({length:6},(_,n)=>g.instant('dice',100,()=>n).payout).reduce((a,b)=>a+b)/6;assert.equal(dice,400/6);
 let sum=0,wins=0,pairs=0;
 for(let a=0;a<6;a++)for(let b=0;b<6;b++)for(let c=0;c<6;c++){
  const values=[a,b,c];const result=g.instant('slots',100,()=>values.shift());sum+=result.payout;
  if(result.payout>100)wins++;if(result.payout===50)pairs++;
 }
 assert.equal(wins,6);assert.equal(pairs,90);assert.equal(sum/216,1300/24);
});
test('New scratch tickets have 75% no prize and 10% profitable tickets; stored tickets keep their prize',()=>{
 const {r}=setup(),counts={};let sum=0;
 for(let n=0;n<100;n++){
  let first=true;
  const ticket=r.create('scratch',100,max=>{if(first){first=false;return n;}return max-1;},0,'ticket');
  counts[ticket.multiplier]=(counts[ticket.multiplier]||0)+1;
  r.move('scratch',ticket,'all',0);sum+=ticket.payout;
 }
 assert.deepEqual(counts,{0:75,1:15,2:7,5:2,10:1});assert.equal(sum/100,49);
 const old={stake:100,multiplier:5,revealed:[],done:false,payout:0};r.move('scratch',old,'all',0);assert.equal(old.payout,500);
});
test('Every Mines size supports minimum/maximum mine counts, correct payouts, bounds and saved legacy boards',()=>{
 const {r}=setup();
 for(const size of [3,4,5,6])for(const mineCount of [1,3,size*size-1]){
  const round=r.create('mines',100,n=>n-1,0,'mines',{size,mineCount});assert.equal(round.mines.length,mineCount);
  assert.throws(()=>r.move('mines',round,size*size,0));
  r.move('mines',round,mineCount,0);
  if(!round.done)r.move('mines',round,'cash',0);
  assert.equal(round.payout,Number(96n * BigInt(size*size) / BigInt(size*size-mineCount)));
 }
 for(const options of [{size:2,mineCount:1},{size:3,mineCount:9},{size:6,mineCount:0},{size:4,mineCount:1.5}]) assert.throws(()=>r.create('mines',10,n=>n-1,0,'bad',options));
 const legacy={stake:50,mines:[0,1,2],revealed:[],done:false,payout:0};r.move('mines',legacy,3,0);r.move('mines',legacy,'cash',0);assert.equal(legacy.payout,59);
});
test('Plinko ballistic paths stay finite, rebound at each peg, and end at their selected pocket',()=>{
 const {r}=setup();
 for(let bits=0;bits<256;bits++){
  const steps=Array.from({length:8},(_,i)=>bits>>i&1),trajectory=r.plinkoFrames(steps);
  assert.ok(trajectory.duration>2500 && trajectory.duration<6000);
  assert.equal(trajectory.frames[0].offset,0);assert.equal(trajectory.frames.at(-1).offset,1);
  assert.equal(trajectory.frames.at(-1).transform,`translate(${(steps.reduce((a,b)=>a+b)-4)*30}px, 191px)`);
  assert.ok(trajectory.frames.every(frame=>!frame.transform.includes('NaN')));
  assert.ok(trajectory.frames.every((f,i,arr)=>!i || f.offset>arr[i-1].offset));
 }
});
test('Roulette skip costs 5 exactly once, settles the original outcome, and natural completion is free',async()=>{
 const {w,clock,reload}=setup();
 const create=stake=>({id:'spin',stake,done:false,payout:0,startedAt:0,readyAt:6500,result:{payout:100,display:'3'}});
 await w.startGame('roulette',50,create);assert.equal(w.balance(),950);
 await assert.rejects(w.finishRoulette('spin',false));
 const results=await Promise.allSettled([w.finishRoulette('spin',true),w.finishRoulette('spin',true)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(w.balance(),1045);assert.equal(w.gameRounds().roulette.skipFee,5);
 await w.startGame('roulette',50,create);clock(7000);await reload().finishRoulette('spin',true);
 assert.equal(w.balance(),1095);assert.equal(w.gameRounds().roulette.skipFee,0);
});
test('All-in roulette cannot skip without spare tokens, resumes after reload and blocks free refill',async()=>{
 const {w,clock,reload}=setup();
 await w.startGame('roulette',1000,stake=>({id:'all',stake,done:false,payout:0,readyAt:6500,result:{payout:0}}));
 await assert.rejects(w.finishRoulette('all',true));assert.equal(w.balance(),0);assert.equal(w.gameRounds().roulette.done,false);
 await assert.rejects(w.refill());clock(6500);await reload().finishRoulette('all',false);await w.refill();assert.equal(w.balance(),1000);
});
test('Crash cashout preserves the original future crash and can never award a second payout',async()=>{
 const {r,w,reload}=setup();
 await w.startGame('crash',100,stake=>r.create('crash',stake,()=>800000,0,'flight'));
 const round=await w.playGame('crash','flight',0,current=>r.move('crash',current,'cash',1000));
 assert.equal(round.payout,118);assert.ok(round.crashAt>round.cashedAt);
 const saved=reload().gameRounds().crash;assert.equal(saved.crashAt,round.crashAt);
 assert.ok(r.crashMultiplier(saved,2000)>saved.cashedAt);
 await assert.rejects(w.playGame('crash','flight',1,current=>r.move('crash',current,'tick',999999)));
 assert.equal(w.balance(),1018);
});
