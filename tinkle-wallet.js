/* Account-backed currency. Ownership and shop spending use database rules; game outcomes run in the browser on Spark. */
(() => {
 const account=()=>window.TinkleAccount;
 const read=()=>{const wallet=account()?.wallet;if(!wallet)throw Error('Sign in to load your tokens.');return wallet;};
 const mutate=(action,payload)=>account().mutate(action,payload);
 window.TinkleWallet=Object.freeze({
  balance:()=>read().balance,
  rewards:()=>read().rewardState,
  reward:(kind,payload)=>mutate('reward',{kind,payload:payload??null}),
  wager:(stake,game,choice)=>mutate('instant',{stake,game,choice:choice??null}),
  gameRounds:()=>structuredClone(read().games),
  startGame:(game,stake,options={})=>mutate('start',{game,stake,...options}),
  playGame:(game,id,revision,move)=>mutate('move',{game,id,revision,move}),
  finishRoulette:(id,skip=false)=>mutate('move',{game:'roulette',id,revision:read().games.roulette.revision,move:skip?'skip':'finish'}),
  hasActiveGames:()=>Object.values(read().games).some(round=>!round.done),
  round:()=>structuredClone(read().games.blackjack||null),
  startBlackjack:stake=>mutate('start',{game:'blackjack',stake}),
  playBlackjack:(id,revision,move)=>mutate('move',{game:'blackjack',id,revision,move}),
  buy:id=>mutate('buy',{id}),
  equip:(category,id)=>mutate('equip',{category,id}),
  pollCrash:()=>mutate('crashPoll',{})
 });
})();
