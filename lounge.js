(() => {
  const wallet = window.TinkleWallet;
  const notice = document.getElementById('notice');
  const stakeInput = document.getElementById('stake');
  const refill = document.getElementById('refill');
  const buttons = [...document.querySelectorAll('[data-game], #refill, #blackjack-deal, #blackjack-hit, #blackjack-stand')];
  let displayedRound = null;
  let busy = false;
  function render() {
    try {
      const balance = wallet.balance();
      document.getElementById('balance').textContent = balance.toLocaleString();
      const round = wallet.round();
      displayedRound = round;
      const active = round && !round.done;
      refill.hidden = balance !== 0 || active || wallet.hasActiveGames();
      document.getElementById('blackjack-deal').hidden = !!active;
      document.getElementById('blackjack-hit').hidden = !active;
      document.getElementById('blackjack-stand').hidden = !active;
      if (round) {
        for (const who of ['dealer', 'player']) {
          const cards = document.getElementById(`${who}-cards`);
          cards.replaceChildren();
          round[who].forEach((card, i) => {
            const face = document.createElement('span');
            const concealed = who === 'dealer' && i === 1 && active;
            face.className = 'playing-card';
            face.textContent = concealed ? '✦' : LoungeGames.cardLabel(card);
            if (!concealed && [1,2].includes(Math.floor(card / 13))) face.classList.add('red-suit');
            cards.appendChild(face);
          });
          document.getElementById(`${who}-total`).textContent = `${who === 'dealer' ? 'Dealer' : 'Your hand'} · ${who === 'dealer' && active ? 'Hidden total' : LoungeGames.total(round[who])}`;
        }
        document.getElementById('blackjack-stake').textContent = `This hand: ${round.stake} tokens`;
        document.getElementById('blackjack-result').textContent = active ? 'Hit to draw a card, or stand to let the dealer play.' : `${round.message} ${round.payout} tokens returned.`;
      }
    } catch (error) { notice.textContent = error.message; }
  }
  // Rejection sampling avoids modulo bias for every game outcome.
  function randomInt(n) {
    const values = new Uint32Array(1);
    const limit = Math.floor(4294967296 / n) * n;
    do { crypto.getRandomValues(values); } while (values[0] >= limit);
    return values[0] % n;
  }
  async function run(action) {
    if (busy) return;
    busy = true;
    buttons.forEach(button => button.disabled = true);
    try { await action(); } catch (error) { notice.textContent = error.message; }
    finally { busy = false; buttons.forEach(button => button.disabled = false); render(); }
  }
  document.querySelectorAll('[data-stake]').forEach(button => button.addEventListener('click', () => {
    stakeInput.value = button.dataset.stake;
  }));
  document.querySelectorAll('[data-game]').forEach(button => button.addEventListener('click', () => run(async () => {
    const stake = Number(stakeInput.value);
    const game = button.dataset.game;
    const result = await wallet.wager(stake, () => {
      if (game === 'roulette') {
        const choice = document.getElementById('roulette-choice').value;
        const raw = document.getElementById('roulette-number').value;
        const pick = Number(raw);
        if (choice === 'number' && (raw.trim() === '' || !Number.isInteger(pick) || pick < 0 || pick > 36)) throw new Error('Pick a whole number from 0 to 36.');
        return LoungeGames.roulette(randomInt(37), choice, pick, stake);
      }
      if (game === 'coin') {
        const side = ['Heads', 'Tails'][randomInt(2)];
        return { payout: side === button.dataset.choice ? stake * 2 : 0, display: side, message: `The coin landed on ${side.toLowerCase()}.` };
      }
      if (game === 'dice') {
        const roll = randomInt(6) + 1;
        return { payout: roll === 6 ? stake * 6 : 0, display: ['⚀','⚁','⚂','⚃','⚄','⚅'][roll - 1], message: `You rolled a ${roll}.` };
      }
      const symbols = ['★','◆','●','✦','♥'];
      const reels = Array.from({ length: 3 }, () => symbols[randomInt(5)]);
      const unique = new Set(reels).size;
      return { payout: stake * (unique === 1 ? 10 : unique === 2 ? 2 : 0), display: reels, message: unique === 1 ? 'Three of a kind!' : unique === 2 ? 'A matching pair!' : 'No matches this time.' };
    });
    const art = document.getElementById(`${game}-art`);
    if (game === 'slots') [...art.children].forEach((reel, index) => reel.textContent = result.display[index]);
    else { art.textContent = result.display; art.style.fontSize = game === 'coin' ? '38px' : '74px'; }
    if (game === 'roulette') art.dataset.color = result.color;
    const net = result.payout - stake;
    document.getElementById(`${game}-result`).textContent = `${result.message} ${result.payout ? `${result.payout.toLocaleString()} tokens returned.` : `${stake.toLocaleString()} tokens lost.`}`;
    notice.textContent = `${net >= 0 ? '+' : '−'}${Math.abs(net).toLocaleString()} tokens this round. ${wallet.balance() === 0 ? 'Out of tokens? Grab a free refill.' : 'Your wallet is saved.'}`;
  })));
  document.getElementById('roulette-choice').addEventListener('change', event => {
    const hidden = event.target.value !== 'number';
    document.getElementById('roulette-number').hidden = hidden;
    document.getElementById('roulette-number-label').hidden = hidden;
  });
  document.getElementById('blackjack-deal').addEventListener('click', () => run(async () => {
    await wallet.startBlackjack(Number(stakeInput.value), stake => ({ ...LoungeGames.start(stake, randomInt), id: crypto.randomUUID() }));
    notice.textContent = 'Blackjack hand saved. Your bet is locked for this hand.';
  }));
  for (const action of ['hit', 'stand']) {
    document.getElementById(`blackjack-${action}`).addEventListener('click', () => run(async () => {
      const round = displayedRound;
      if (!round || round.done) return;
      const next = await wallet.playBlackjack(round.id, round.player.length, current => LoungeGames.act(current, action));
      notice.textContent = next.done ? `${next.message} ${next.payout} tokens returned. Your wallet is saved.` : 'Card drawn. Your hand is saved.';
    }));
  }
  refill.addEventListener('click', () => run(async () => {
    await wallet.refill();
    notice.textContent = 'Added 1,000 free tokens. You’re ready to play again.';
  }));
  window.addEventListener('tinkle-wallet-change', render);
  window.addEventListener('storage', render);
  render();
})();
