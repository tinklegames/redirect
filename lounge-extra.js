(() => {
  let crashPolling=false,lastCrashPoll=0;
  const wallet = window.TinkleWallet, rules = window.LoungeExtraRules;
  const $ = id => document.getElementById(id);
  const names = ['mines','crash','plinko','wheel','scratch'];
  const pending = new Set();
  let rounds = {}, crashFailure = null;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function random(n) {
    const value = new Uint32Array(1), limit = Math.floor(4294967296 / n) * n;
    do { crypto.getRandomValues(value); } while (value[0] >= limit);
    return value[0] % n;
  }
  const tokens = n => n.toLocaleString();
  function report(game, round) {
    const outcome = round.multiplier !== undefined ? `${round.multiplier}× · ` : "";
    const text = round.done ? `${outcome}${tokens(round.payout)} tokens returned · ${tokens(round.stake)} bet.` : `${tokens(round.stake)} tokens in play. Your round is saved.`;
    $(`${game}-result`).textContent = text;
  }
  let mineTiles = [], minePreview = false, mineSettingsLoaded = false;
  function buildMines(size) {
    if (mineTiles.length === size * size) return;
    $('mines-board').replaceChildren();
    $('mines-board').style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    mineTiles = Array.from({length:size*size}, (_,i) => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = '◇';
      button.addEventListener('click', () => play('mines', i));
      $('mines-board').appendChild(button); return button;
    });
  }
  for (const control of ['mines-size','mines-count']) $(control).addEventListener('change', () => {
    const max = Number($('mines-size').value) ** 2 - 1;
    $('mines-count').max = String(max);
    if (Number($('mines-count').value) > max) $('mines-count').value = max;
    minePreview = true; render();
  });
  const scratchTiles = Array.from({length:9}, (_,i) => {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = 'SCRATCH'; button.dataset.tile = i;
    button.addEventListener('click', () => play('scratch', i));
    $('scratch-board').appendChild(button); return button;
  });
  // Tap/keyboard activation and dragging all use the same persisted reveal action.
  let scratching = false;
  $('scratch-board').addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    scratching = true;
    const tile = event.target.closest('[data-tile]');
    if (tile && !tile.disabled) play('scratch', Number(tile.dataset.tile));
  });
  $('scratch-board').addEventListener('pointermove', event => {
    if (!scratching) return;
    const tile = document.elementFromPoint(event.clientX,event.clientY)?.closest('#scratch-board [data-tile]');
    if (tile && !tile.disabled) play('scratch', Number(tile.dataset.tile));
  });
  window.addEventListener('pointerup', () => scratching = false);
  window.addEventListener('pointercancel', () => scratching = false);
  window.addEventListener('blur', () => scratching = false);
  const svgNS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs, parent, text) {
    const element = document.createElementNS(svgNS,tag);
    for (const [key,value] of Object.entries(attrs)) element.setAttribute(key,value);
    if (text !== undefined) element.textContent = text;
    parent.appendChild(element); return element;
  }
  for (let row=0;row<8;row++) for (let peg=0;peg<=row;peg++) {
    svg('circle',{cx:150+(peg-row/2)*30,cy:27+row*22,r:3,fill:'#9483b0'},$('plinko-board'));
  }
  const pockets = rules.plinkoPays.map((pay,i) => {
    const group = svg('g',{},$('plinko-board'));
    const rect = svg('rect',{x:15+i*30,y:204,width:29,height:25,rx:4,fill:'#322544'},group);
    svg('text',{x:29.5+i*30,y:220,'text-anchor':'middle',fill:'#eee5ff','font-size':9},group,`${pay}×`);
    return rect;
  });
  const ball = svg('circle',{cx:150,cy:8,r:5,fill:'#c6f0b9'},$('plinko-board'));
  rules.wheelPays.forEach((pay,i) => {
    const a=(i*30-90)*Math.PI/180, b=((i+1)*30-90)*Math.PI/180, mid=(a+b)/2;
    svg('path',{d:`M120 120 L${120+112*Math.cos(a)} ${120+112*Math.sin(a)} A112 112 0 0 1 ${120+112*Math.cos(b)} ${120+112*Math.sin(b)} Z`,fill:['#503465','#263c3b','#3c2b50'][i%3],stroke:'#92809f','stroke-width':1},$('fortune-wheel'));
    svg('text',{x:120+80*Math.cos(mid),y:124+80*Math.sin(mid),'text-anchor':'middle',fill:'#fff2d2','font-size':13,'font-weight':700},$('fortune-wheel'),`${pay}×`);
  });
  svg('circle',{cx:120,cy:120,r:22,fill:'#dec389'},$('fortune-wheel'));
  svg('text',{x:120,y:127,'text-anchor':'middle',fill:'#463321','font-size':24},$('fortune-wheel'),'✦');
  function showPlinko(round) {
    if (!round) return;
    pockets.forEach((p,i)=>p.setAttribute('fill',i===round.bucket?'#617d43':'#322544'));
    ball.style.transform = `translate(${(round.bucket-4)*30}px, 191px)`;
  }
  function showWheel(round) {
    if (round) $('fortune-wheel').style.transform = `rotate(${-round.sector*30-15}deg)`;
  }
  function renderCrash() {
    const round=rounds.crash;
    if (!round) return;
    const now = window.TinkleAccount.now(), ended = !round.pending && now >= rules.crashDeadline(round);
    const ceiling = Math.min(20, round.crashAt ?? 20);
    const multiplier = ended ? ceiling : Math.min(ceiling, rules.crashMultiplier(round, now));
    $('crash-multiplier').textContent = `${multiplier.toFixed(2)}×`;
    $('crash-status').textContent = ended ? round.crashAt > 20 ? 'Flight reached the 20× limit' : 'Crashed' : round.cashedAt ? 'Cashed out · watching the flight' : 'In flight';
    $('crash-panel').classList.toggle('crashed', ended && round.crashAt <= 20);
    $('crash-curve').style.strokeDashoffset = String(330*(1-Math.min(1,Math.log(Math.max(1,multiplier))/Math.log(20))));
    $('crash-cash').textContent = `Cash out · ${tokens(rules.prize(round.stake,multiplier))}`;
    const followup = round.cashedAt ? ended
      ? `You collected at ${round.cashedAt.toFixed(2)}× (${tokens(round.payout)} tokens). The flight ${round.crashAt > 20 ? 'reached the limit of' : 'crashed at'} ${ceiling.toFixed(2)}×. Your payout stays unchanged.`
      : `You collected at ${round.cashedAt.toFixed(2)}× (${tokens(round.payout)} tokens). Watch to see where this flight ends.`
      : '';
    if ($('crash-followup').textContent !== followup) $('crash-followup').textContent = followup;
    const start = document.querySelector('[data-start="crash"]');
    // Keep the settled flight on screen through its endpoint, including after reload.
    start.hidden = !round.done || !ended;
    start.disabled = pending.has('crash');
  }
  function render() {
    try {
      rounds = wallet.gameRounds();
      for (const game of names) {
        const round=rounds[game], active=round && !round.done;
        const start=document.querySelector(`[data-start="${game}"]`);
        start.hidden=!!active; start.disabled=pending.has(game);
        if (round && !pending.has(game)) report(game,round);
      }
      const savedMines = rounds.mines, mining = savedMines && !savedMines.done;
      if (mining || (savedMines && !mineSettingsLoaded)) {
        mineSettingsLoaded = true;
        minePreview = false;
        $('mines-size').value = savedMines.size || 4;
        $('mines-count').value = savedMines.mines.length;
      }
      const mines = minePreview ? null : savedMines;
      const size = mines?.size || (mines ? 4 : Number($('mines-size').value));
      $('mines-size').disabled = !!mining || pending.has('mines');
      $('mines-count').disabled = !!mining || pending.has('mines');
      $('mines-count').max = String(Number($('mines-size').value) ** 2 - 1);
      buildMines(size);
      $('mines-badge').textContent = `${size}×${size} · ${mines ? mines.mines.length : $('mines-count').value} MINES`;
      if (!mines) $('mines-info').textContent = 'Choose your settings, then start a new board.';
      mineTiles.forEach((tile,i)=>{
        const revealed=mines?.revealed.includes(i), bomb=mines?.mines.includes(i);
        tile.disabled=!mining || revealed || pending.has('mines');
        tile.textContent=mines && (revealed || mines.done) ? bomb ? '✹' : '◆' : '◇';
        tile.classList.toggle('gem',!!revealed && !bomb);
        tile.classList.toggle('mine',!!mines?.done && bomb);
        tile.setAttribute('aria-label',`Tile ${i+1}: ${mines && (revealed || mines.done) ? bomb ? 'mine' : 'gem' : 'covered'}`);
      });
      $('mines-cash').hidden=!mining;
      $('mines-cash').disabled=pending.has('mines') || !mines?.revealed.length;
      if (mines) {
        const multiplier=rules.minesMultiplier(mines.revealed.length, size, mines.mines.length);
        $('mines-info').textContent = mines.done ? mines.exploded !== undefined ? 'Mine hit. This round is over.' : 'Tokens collected.' : `${mines.revealed.length} ${mines.revealed.length === 1 ? "gem" : "gems"} · ${multiplier.toFixed(2)}× · ${mines.stake} tokens bet`;
        $('mines-cash').textContent=`Cash out · ${tokens(rules.minesPayout(mines.stake,mines.revealed.length,size,mines.mines.length))}`;
      }
      const scratch=rounds.scratch, scratching=scratch && !scratch.done;
      scratchTiles.forEach((tile,i)=>{
        const revealed=scratch?.revealed.includes(i);
        tile.disabled=!scratching || revealed || pending.has('scratch');
        tile.textContent = revealed ? typeof scratch.symbols[i] === 'number' ? `${scratch.symbols[i]}×` : scratch.symbols[i] : 'SCRATCH';
        tile.classList.toggle('revealed',!!revealed);
        tile.setAttribute('aria-label',`Square ${i+1}: ${revealed ? tile.textContent : 'scratch to reveal'}`);
      });
      $('scratch-all').hidden=!scratching; $('scratch-all').disabled=pending.has('scratch');
      $('crash-cash').hidden=!rounds.crash || rounds.crash.done; $('crash-cash').disabled=pending.has('crash');
      renderCrash();
      if (!pending.has('plinko')) showPlinko(rounds.plinko);
      if (!pending.has('wheel')) showWheel(rounds.wheel);
    } catch (error) { $('notice').textContent=error.message; }
  }
  async function run(game, action) {
    if (pending.has(game)) return;
    pending.add(game); render();
    try { await action(); }
    catch(error) { $('notice').textContent=error.message; if(game==='crash') crashFailure=rounds.crash?.id; }
    finally { pending.delete(game); render(); }
  }
  async function animate(game,round) {
    if (reduced()) return;
    if (game === 'plinko') {
      pockets.forEach(p=>p.setAttribute('fill','#322544'));
      const trajectory = rules.plinkoFrames(round.path);
      await ball.animate(trajectory.frames,{duration:trajectory.duration,easing:'linear'}).finished;
    } else if (game === 'wheel') {
      const end=1440-round.sector*30-15;
      await $('fortune-wheel').animate([{transform:'rotate(0deg)'},{transform:`rotate(${end}deg)`}],{duration:2400,easing:'cubic-bezier(.15,.7,.12,1)'}).finished;
    }
  }
  document.querySelectorAll('[data-start]').forEach(button=>button.addEventListener('click',()=>run(button.dataset.start,async()=>{
    const game=button.dataset.start;
    const round=await wallet.startGame(game,Number($('stake').value),{options:{size:Number($('mines-size').value),mineCount:Number($('mines-count').value)}});
    if (game === 'crash') crashFailure=null;
    $(`${game}-result`).textContent = game === 'plinko' ? 'Ball dropping…' : game === 'wheel' ? 'Wheel spinning…' : `${round.stake} tokens in play.`;
    await animate(game,round);
    $('notice').textContent=round.done ? `${game === 'plinko' ? 'Plinko' : 'Wheel'}: ${round.multiplier}× · ${tokens(round.payout)} tokens returned.` : 'Round started. Your bet and progress are saved.';
  })));
  function play(game,action) {
    const round=rounds[game];
    if(!round || round.done) return;
    return run(game,async()=>{
      const next=await wallet.playGame(game,round.id,round.revision,action);
      if(next.done) $('notice').textContent=`${game[0].toUpperCase()+game.slice(1)} finished · ${tokens(next.payout)} tokens returned. Your wallet is saved.`;
    });
  }
  $('mines-cash').addEventListener('click',()=>play('mines','cash'));
  $('crash-cash').addEventListener('click',()=>play('crash','cash'));
  $('scratch-all').addEventListener('click',()=>play('scratch','all'));
  function tick() {
    renderCrash();
    const round=rounds.crash;
    if(!document.hidden && round && !round.done && !crashPolling && Date.now()-lastCrashPoll>=1000){crashPolling=true;lastCrashPoll=Date.now();wallet.pollCrash().catch(error=>{$('notice').textContent=error.message;}).finally(()=>crashPolling=false);}
  }
  window.addEventListener('tinkle-wallet-change',render);
  window.addEventListener('storage',()=>{crashFailure=null;render();tick();});
  document.addEventListener('visibilitychange',()=>{render();tick();});
  render();tick();setInterval(tick,100);
})();
