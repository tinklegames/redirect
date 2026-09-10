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
  function minesMultiplier(count, size = 4, mineCount = 3) {
    const cells = size * size;
    let survival = 1;
    for (let i = 0; i < count; i++) survival *= (cells - mineCount - i) / (cells - i);
    return count ? 0.96 / survival : 1;
  }
  function minesPayout(stake, count, size = 4, mineCount = 3) {
    let numerator = BigInt(stake) * 96n, denominator = 100n;
    for (let i = 0; i < count; i++) {
      numerator *= BigInt(size * size - i);
      denominator *= BigInt(size * size - mineCount - i);
    }
    return count ? Number(numerator / denominator) : stake;
  }
  const crashMultiplier = (round, now) => Math.min(20, Math.exp(Math.max(0, now - round.startedAt) / 6000));
  const crashDeadline = round => round.startedAt + Math.log(Math.min(20, round.crashAt)) * 6000;
  function create(game, stake, random, now, id, options = {}) {
    const round = { id, stake, payout: 0, done: false };
    if (game === 'mines') {
      const size = options.size ?? 4, mineCount = options.mineCount ?? 3;
      if (![3,4,5,6].includes(size) || !Number.isInteger(mineCount) || mineCount < 1 || mineCount >= size * size) throw new Error('Choose a board from 3×3 to 6×6 and at least one mine, leaving one safe tile.');
      return {...round, size, mines: shuffle(Array.from({length:size*size}, (_,i)=>i), random).slice(0,mineCount), revealed: []};
    }
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
      const multiplier = draw < 75 ? 0 : draw < 90 ? 1 : draw < 97 ? 2 : draw < 99 ? 5 : 10;
      const symbols = multiplier ? [multiplier, multiplier, multiplier, '★','★','◆','◆','♥','♥'] : ['★','★','◆','◆','♥','♥','●','●','✦'];
      return {...round, multiplier, symbols:shuffle(symbols, random), revealed:[]};
    }
    throw new Error('Unknown game.');
  }
  function move(game, round, action, now) {
    if (round.done) throw new Error('This round is finished.');
    if (game === 'mines') {
      const size = round.size || 4, cells = size * size, safeCount = cells - round.mines.length;
      if (action === 'cash') {
        if (!round.revealed.length) throw new Error('Reveal a safe tile before cashing out.');
        round.done = true; round.payout = minesPayout(round.stake, round.revealed.length, size, round.mines.length);
      } else {
        if (!Number.isInteger(action) || action < 0 || action >= cells || round.revealed.includes(action)) throw new Error('Choose an unrevealed tile.');
        round.revealed.push(action);
        if (round.mines.includes(action)) { round.done = true; round.exploded = action; }
        else if (round.revealed.length === safeCount) {
          round.done = true; round.payout = minesPayout(round.stake, safeCount, size, round.mines.length);
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
  function plinkoFrames(path) {
    const points = [{ x: 0, y: 0, time: 0 }];
    const gravity = 620, launch = -45;
    let time = 0, x = 0, y = 0;
    function arc(dx, dy, vy) {
      const duration = (-vy + Math.sqrt(vy * vy + 2 * gravity * dy)) / gravity;
      const steps = Math.ceil(duration * 60);
      for (let step = 1; step <= steps; step++) {
        const t = duration * step / steps;
        points.push({x: x + dx * t / duration, y: y + vy * t + gravity * t * t / 2, time:time + t});
      }
      x += dx; y += dy; time += duration;
    }
    arc(0, 11, 0); // First contact: ball center (150, 19), peg center (150, 27).
    path.forEach((direction, row) => arc(direction ? 15 : -15, row === 7 ? 26 : 22, launch));
    arc(0, 0, -55); // Small final rebound against the pocket floor.
    const duration = time * 1000;
    return { duration, frames: points.map(p => ({ offset: p.time / time, transform: `translate(${p.x}px, ${p.y}px)` })) };
  }
  window.LoungeExtraRules = Object.freeze({create, move, prize, minesMultiplier, minesPayout, crashMultiplier, crashDeadline, plinkoFrames, plinkoPays, wheelPays});
})();
