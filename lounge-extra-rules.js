/* Pure rules: every round stores its outcome before any reveal or animation. */
(() => {
  const plinkoPays = [12, 3, 1.5, 0.5, 0.25, 0.5, 1.5, 3, 12];
  const wheelPays = [0, 1, 0.5, 2, 0, 1, 0.5, 5, 0, 1, 0.5, 0];
  const prize = (stake, multiplier) => Math.floor(stake * multiplier);
  function shuffle(items, random) {
    for (let i = items.length - 1; i > 0; i--) {
      const j = random(i + 1); [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }
  function minesMultiplier(count) {
    let survival = 1;
    for (let i = 0; i < count; i++) survival *= (13 - i) / (16 - i);
    return count ? 0.96 / survival : 1;
  }
  const crashMultiplier = (round, now) => Math.min(20, Math.exp(Math.max(0, now - round.startedAt) / 6000));
  const crashDeadline = round => round.startedAt + Math.log(Math.min(20, round.crashAt)) * 6000;
  function create(game, stake, random, now, id) {
    const round = { id, stake, payout: 0, done: false };
    if (game === 'mines') return {...round, mines: shuffle(Array.from({length:16}, (_,i)=>i), random).slice(0,3), revealed: []};
    if (game === 'crash') return {...round, startedAt: now, crashAt: Math.max(1, 0.97 / (1 - random(1000000) / 1000000))};
    if (game === 'plinko') {
      const path = Array.from({length:8}, () => random(2));
      const bucket = path.reduce((sum, step) => sum + step, 0);
      return {...round, done:true, path, bucket, multiplier: plinkoPays[bucket], payout:prize(stake, plinkoPays[bucket])};
    }
    if (game === 'wheel') {
      const sector = random(wheelPays.length), multiplier = wheelPays[sector];
      return {...round, done:true, sector, multiplier, payout:prize(stake, multiplier)};
    }
    if (game === 'scratch') {
      // Fixed prize odds; losing tickets contain no three matching symbols.
      const draw = random(100);
      const multiplier = draw < 60 ? 0 : draw < 85 ? 1 : draw < 95 ? 2 : draw < 99 ? 5 : 10;
      const symbols = multiplier ? [multiplier, multiplier, multiplier, '★','★','◆','◆','♥','♥'] : ['★','★','◆','◆','♥','♥','●','●','✦'];
      return {...round, multiplier, symbols:shuffle(symbols, random), revealed:[]};
    }
    throw new Error('Unknown game.');
  }
  function move(game, round, action, now) {
    if (round.done) throw new Error('This round is finished.');
    if (game === 'mines') {
      if (action === 'cash') {
        if (!round.revealed.length) throw new Error('Reveal a safe tile before cashing out.');
        round.done = true; round.payout = prize(round.stake, minesMultiplier(round.revealed.length));
      } else {
        if (!Number.isInteger(action) || action < 0 || action > 15 || round.revealed.includes(action)) throw new Error('Choose an unrevealed tile.');
        round.revealed.push(action);
        if (round.mines.includes(action)) { round.done = true; round.exploded = action; }
        else if (round.revealed.length === 13) {
          round.done = true; round.payout = prize(round.stake, minesMultiplier(13));
        }
      }
    } else if (game === 'crash') {
      if (!['cash','tick'].includes(action)) throw new Error('Invalid crash action.');
      if (now >= crashDeadline(round)) {
        round.done = true;
        if (round.crashAt > 20) { round.cashedAt = 20; round.payout = prize(round.stake,20); }
      } else if (action === 'cash') {
        round.done = true;
        round.cashedAt = crashMultiplier(round, now);
        round.payout = prize(round.stake, round.cashedAt);
      } else throw new Error('The round is still running.');
    } else if (game === 'scratch') {
      if (action === 'all') round.revealed = Array.from({length:9}, (_,i)=>i);
      else {
        if (!Number.isInteger(action) || action < 0 || action > 8 || round.revealed.includes(action)) throw new Error('Choose a covered square.');
        round.revealed.push(action);
      }
      if (round.revealed.length === 9) { round.done = true; round.payout = prize(round.stake, round.multiplier); }
    } else throw new Error('Unknown game.');
    return round;
  }
  window.LoungeExtraRules = Object.freeze({create, move, prize, minesMultiplier, crashMultiplier, crashDeadline, plinkoPays, wheelPays});
})();
