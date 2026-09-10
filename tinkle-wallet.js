/* Shared, browser-local currency for games and future cosmetic purchases. */
(() => {
  const key = 'tinkle.wallet.v1';
  function read() {
    const raw = localStorage.getItem(key);
    const wallet = raw === null ? { version: 1, balance: 1000 } : JSON.parse(raw);
    if (wallet.version !== 1 || !Number.isSafeInteger(wallet.balance) || wallet.balance < 0) {
      throw new Error('Your saved wallet could not be read. No tokens were changed.');
    }
    return wallet;
  }
  async function transact(change) {
    if (!navigator.locks) throw new Error('Please use a current browser on HTTPS or localhost to save tokens safely.');
    return navigator.locks.request(key, () => {
      const wallet = read();
      const result = change(wallet);
      if (!Number.isSafeInteger(wallet.balance) || wallet.balance < 0) throw new Error('Invalid token balance.');
      localStorage.setItem(key, JSON.stringify(wallet));
      window.dispatchEvent(new Event('tinkle-wallet-change'));
      return result;
    });
  }
  window.TinkleWallet = Object.freeze({
    balance: () => read().balance,
    // resolve returns { payout, ... }; payout includes the original stake.
    wager: (stake, resolve) => transact(wallet => {
      if (!Number.isSafeInteger(stake) || stake < 1) throw new Error('Choose a positive whole-number bet.');
      if (stake > wallet.balance) throw new Error('You do not have enough tokens for that bet.');
      const result = resolve();
      if (!Number.isSafeInteger(result.payout) || result.payout < 0) throw new Error('Invalid payout.');
      wallet.balance += result.payout - stake;
      return result;
    }),
    // Versioned, reserved-stake rounds survive reloads and settle under one lock.
    gameRounds: () => read().games || {},
    startGame: (game, stake, create) => transact(wallet => {
      if (!['mines', 'crash', 'plinko', 'wheel', 'scratch', 'roulette'].includes(game)) throw new Error('Unknown game.');
      const rounds = wallet.games || (wallet.games = {});
      if (rounds[game] && !rounds[game].done) throw new Error('Finish your current round first.');
      if (!Number.isSafeInteger(stake) || stake < 1 || stake > wallet.balance) throw new Error('Choose a positive whole-number bet within your balance.');
      const round = create(stake);
      if (!Number.isSafeInteger(round.payout) || round.payout < 0) throw new Error('Invalid payout.');
      round.revision = 0;
      wallet.balance -= stake;
      if (round.done) wallet.balance += round.payout;
      rounds[game] = round;
      return round;
    }),
    playGame: (game, id, revision, move) => transact(wallet => {
      const round = wallet.games?.[game];
      if (!round || round.done || round.id !== id || round.revision !== revision) throw new Error('This round changed in another tab. Check the updated game.');
      const next = move(round);
      if (!Number.isSafeInteger(next.payout) || next.payout < 0) throw new Error('Invalid payout.');
      next.revision = round.revision + 1;
      if (next.done) wallet.balance += next.payout;
      wallet.games[game] = next;
      return next;
    }),
    finishRoulette: (id, skip = false) => transact(wallet => {
      const round = wallet.games?.roulette;
      if (!round || round.done || round.id !== id) throw new Error('This spin already finished or changed in another tab.');
      const spinning = Date.now() < round.readyAt;
      if (spinning && !skip) throw new Error('The ball is still spinning.');
      const fee = spinning && skip ? 5 : 0;
      if (fee > wallet.balance) throw new Error('You need 5 available tokens to skip. You can wait for free.');
      if (!Number.isSafeInteger(round.result.payout) || round.result.payout < 0) throw new Error('Invalid payout.');
      wallet.balance = wallet.balance - fee + round.result.payout;
      round.payout = round.result.payout;
      round.skipFee = fee;
      round.done = true;
      round.revision++;
      return round;
    }),
    hasActiveGames: () => Object.values(read().games || {}).some(round => !round.done),
    round: () => read().blackjack || null,
    startBlackjack: (stake, create) => transact(wallet => {
      if (wallet.blackjack && !wallet.blackjack.done) throw new Error('Finish your current blackjack hand first.');
      if (!Number.isSafeInteger(stake) || stake < 1 || stake > wallet.balance) throw new Error('Choose a positive whole-number bet within your balance.');
      const round = create(stake);
      if (!Number.isSafeInteger(round.payout) || round.payout < 0) throw new Error('Invalid payout.');
      wallet.balance -= stake;
      if (round.done) wallet.balance += round.payout;
      wallet.blackjack = round;
      return round;
    }),
    playBlackjack: (id, revision, move) => transact(wallet => {
      const round = wallet.blackjack;
      if (!round || round.done || round.id !== id || round.player.length !== revision) throw new Error('This hand changed in another tab. Check the updated cards.');
      const next = move(round);
      if (!Number.isSafeInteger(next.payout) || next.payout < 0) throw new Error('Invalid payout.');
      if (next.done) wallet.balance += next.payout;
      wallet.blackjack = next;
      return next;
    }),
    spend: amount => transact(wallet => {
      if (!Number.isSafeInteger(amount) || amount < 1 || amount > wallet.balance) throw new Error('Invalid purchase or insufficient tokens.');
      wallet.balance -= amount;
      return wallet.balance;
    }),
    refill: () => transact(wallet => {
      if (wallet.blackjack && !wallet.blackjack.done) throw new Error('Finish your blackjack hand before refilling.');
      if (Object.values(wallet.games || {}).some(round => !round.done)) throw new Error('Finish your active games before refilling.');
      if (wallet.balance !== 0) throw new Error('Free refills are available when your balance reaches zero.');
      wallet.balance = 1000;
    })
  });
})();
