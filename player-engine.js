/* Spark uses client-side game rules; database rules protect account ownership and shop spending. */
import './shop-catalog.js';
import './token-rewards-config.js';
import './token-rewards-rules.js';
import './lounge-games.js';
import './lounge-extra-rules.js';
import './game-cards.js';
const {TinkleShop:shop,TinkleRewardsRules:rewards,TINKLE_REWARD_CONFIG:config,LoungeGames:games,LoungeExtraRules:extra,GAME_CARDS:cards}=window;
function randomInt(n){const values=new Uint32Array(1),limit=Math.floor(4294967296/n)*n;do{crypto.getRandomValues(values);}while(values[0]>=limit);return values[0]%n;}
const randomUUID=()=>crypto.randomUUID();
function username(value){if(typeof value!=='string'||!/^[A-Za-z0-9_]{3,20}$/.test(value))throw Error('Use 3–20 letters, numbers or underscores.');if(['admin','administrator','moderator','tinkle','support'].includes(value.toLowerCase()))throw Error('Please choose another username.');return value;}
function fresh(name,now){const wallet={username:username(name),usernameKey:name.toLowerCase(),rewardDay:Math.floor(now/86400000),balance:1000,createdAt:now,revision:0,owned:[],equipped:{},games:{}};rewards.snapshot(wallet,now,config);return wallet;}
function apply(wallet,action,p={},now=Date.now(),random=randomInt){
 const stake=p.stake;
 const validStake=()=>{if(!Number.isSafeInteger(stake)||stake<1||stake>wallet.balance)throw Error('Choose a whole-token bet within your balance.');};
 const currentRound=game=>{const r=wallet.games?.[game];if(!r||r.done||r.id!==p.id||r.revision!==p.revision)throw Error('This round changed. Please try again.');return r;};
 let result;
 if(action==='reward'){
  wallet.rewardDay=Math.floor(now/86400000);
  let payload=p.payload;
  if(p.kind==='card'){const card=cards.find(c=>c.code===payload?.code);if(!card)throw Error('Game not found.');payload={code:card.code,categories:card.categories||[]};}
  result=rewards.apply(wallet,p.kind,payload,now,config);
 }else if(action==='buy'){
  const item=shop.items.find(i=>i.id===p.id);if(!item)throw Error('Item not found.');
  if(wallet.owned.includes(item.id))throw Error('You already own this item.');
  if(wallet.balance<item.price)throw Error('You need more tokens for this item.');
  wallet.balance-=item.price;wallet.owned.push(item.id);result={message:`${item.name} is yours! Equip it whenever you like.`};
 }else if(action==='equip'){
  if(!Object.hasOwn(shop.categories,p.category))throw Error('Unknown category.');
  if(p.id){const item=shop.items.find(i=>i.id===p.id&&i.category===p.category);if(!item||!wallet.owned.includes(p.id))throw Error('Buy this item before equipping it.');wallet.equipped[p.category]=p.id;}
  else delete wallet.equipped[p.category];
  result={message:p.id?'Equipped.':'Removed.'};
 }else if(action==='instant'){
  validStake();result=games.instant(p.game,stake,random,p.choice);wallet.balance+=result.payout-stake;
 }else if(action==='start'){
  validStake();if(wallet.games[p.game]&&!wallet.games[p.game].done)throw Error('Finish your current round first.');
  let round;
  if(p.game==='blackjack')round={...games.start(stake,random),id:randomUUID()};
  else if(p.game==='roulette'){
   if(!['red','black','odd','even','number'].includes(p.choice)||(p.choice==='number'&&(!Number.isInteger(p.pick)||p.pick<0||p.pick>36)))throw Error('Choose a valid roulette bet.');
   round={id:randomUUID(),stake,payout:0,done:false,choice:p.choice,pick:p.pick??0,startedAt:now,readyAt:now+6500,result:games.roulette(random(37),p.choice,p.pick,stake)};
  }else round=extra.create(p.game,stake,random,now,randomUUID(),p.options||{});
  round.revision=0;wallet.balance-=stake;if(round.done)wallet.balance+=round.payout;wallet.games[p.game]=round;result=round;
 }else if(action==='move'){
  const round=currentRound(p.game);
  if(p.game==='blackjack')games.act(round,p.move);
  else if(p.game==='roulette'){
   const spinning=now<round.readyAt;
   if(spinning&&p.move!=='skip')throw Error('The ball is still spinning.');
   const fee=spinning?5:0;if(wallet.balance<fee)throw Error('You need 5 tokens to skip, or wait for free.');
   wallet.balance-=fee;round.skipFee=fee;round.payout=round.result.payout;round.done=true;
  }else extra.move(p.game,round,p.move,now);
  round.revision++;if(round.done)wallet.balance+=round.payout;result=round;
 }else throw Error('Unknown action.');
 if(!Number.isSafeInteger(wallet.balance)||wallet.balance<0)throw Error('That payout is too large. No tokens were changed.');
 wallet.revision++;return result;
}
function publicRound(game,value){
 const r=structuredClone(value);if(game==='blackjack'&&r)delete r.deck;if(!r||r.done)return r;
 if(game==='mines'){r.mineCount=r.mines.length;r.mines=Array(r.mineCount).fill(-1);}
 if(game==='blackjack'){delete r.deck;r.dealer=[r.dealer[0],null];}
 // Conceal the crash point in the UI. The owner can still inspect the full round on Spark.
 if(game==='crash'){delete r.crashAt;r.pending=true;}
 if(game==='scratch'){r.symbols=r.symbols.map((v,i)=>r.revealed.includes(i)?v:null);delete r.multiplier;}
 return r;
}
function view(wallet,now=Date.now()){
 const out=structuredClone(wallet);delete out.recoveryHash;for(const [game,r] of Object.entries(out.games))out.games[game]=publicRound(game,r);
 if(out.games.blackjack)delete out.games.blackjack.deck;
 out.rewardState=JSON.parse(JSON.stringify(rewards.snapshot(structuredClone(wallet),now,config)));return out;
}
function publicProfile(w){return {username:w.username,balance:w.balance,equipped:w.equipped};}
export {apply,fresh,view,publicRound,publicProfile,username};
