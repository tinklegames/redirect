/* Game rules kept separate from the page and wallet. */
(() => {
  const red = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
  function roulette(number, choice, pick, stake) {
    const color = number === 0 ? 'green' : red.has(number) ? 'red' : 'black';
    const win = choice === 'number' ? number === pick : number !== 0 &&
      (choice === color || (choice === 'even' && number % 2 === 0) || (choice === 'odd' && number % 2 === 1));
    return { payout: win ? stake * (choice === 'number' ? 36 : 2) : 0, display: String(number), color,
      message: `The ball landed on ${number} ${color}.` };
  }
  function total(cards) {
    let value = cards.reduce((sum, card) => sum + Math.min(card % 13 + 1, 10), 0);
    if (cards.some(card => card % 13 === 0) && value + 10 <= 21) value += 10;
    return value;
  }
  function settle(round) {
    const player = total(round.player), dealer = total(round.dealer);
    const natural = round.player.length === 2 && player === 21;
    const dealerNatural = round.dealer.length === 2 && dealer === 21;
    round.done = true;
    if (player > 21) { round.payout = 0; round.message = 'You busted.'; }
    else if (dealerNatural && !natural) { round.payout = 0; round.message = 'Dealer blackjack.'; }
    else if (natural && !dealerNatural) { round.payout = round.stake * 2.5; round.message = 'Blackjack!'; }
    else if (dealer > 21 || player > dealer) { round.payout = round.stake * 2; round.message = dealer > 21 ? 'Dealer busted. You win!' : 'You win!'; }
    else if (player === dealer) { round.payout = round.stake; round.message = 'Push. Your bet is returned.'; }
    else { round.payout = 0; round.message = 'Dealer wins.'; }
    return round;
  }
  function start(stake, randomInt) {
    if (stake % 2 !== 0) throw new Error('Blackjack needs an even bet so its 3:2 bonus pays whole tokens.');
    const deck = Array.from({length:52}, (_,i) => i);
    for (let i=51;i>0;i--) { const j=randomInt(i+1); [deck[i],deck[j]]=[deck[j],deck[i]]; }
    const round = { stake, deck, player: [deck.pop()], dealer: [deck.pop()], done:false, payout:0 };
    round.player.push(deck.pop()); round.dealer.push(deck.pop());
    if (total(round.player) === 21 || total(round.dealer) === 21) settle(round);
    return round;
  }
  function act(round, action) {
    if (round.done || !['hit','stand'].includes(action)) throw new Error('That hand is already finished or the move is invalid.');
    if (action === 'hit') {
      round.player.push(round.deck.pop());
      if (total(round.player) > 21) return settle(round);
      if (total(round.player) < 21) return round;
    }
    while (total(round.dealer) < 17) round.dealer.push(round.deck.pop());
    return settle(round);
  }
  const cardLabel = card => `${['A','2','3','4','5','6','7','8','9','10','J','Q','K'][card % 13]}${['♠','♥','♦','♣'][Math.floor(card/13)]}`;
  window.LoungeGames = Object.freeze({roulette, total, start, act, cardLabel});
})();
