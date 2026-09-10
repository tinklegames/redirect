(() => {
  const wallet = window.TinkleWallet, $ = id => document.getElementById(id);
  const order = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
  const ns = 'http://www.w3.org/2000/svg';
  const board = $('roulette-wheel');
  function svg(tag, attrs, text) {
    const node = document.createElementNS(ns,tag);
    for (const [key,value] of Object.entries(attrs)) node.setAttribute(key,value);
    if (text !== undefined) node.textContent=text;
    board.appendChild(node); return node;
  }
  const point = (angle,radius) => [120+Math.sin(angle)*radius,120-Math.cos(angle)*radius];
  order.forEach((number,i)=>{
    const angle=i*2*Math.PI/37, half=Math.PI/37;
    const a=point(angle-half,109),b=point(angle+half,109),c=point(angle+half,73),d=point(angle-half,73);
    const color=LoungeGames.roulette(number,'red',0,1).color;
    svg('path',{d:`M${a} A109 109 0 0 1 ${b} L${c} A73 73 0 0 0 ${d} Z`,fill:color==='red'?'#92334b':color==='green'?'#23654a':'#201c29',stroke:'#c5a871','stroke-width':0.6});
    const label=point(angle,99);
    svg('text',{x:label[0],y:label[1]+2.5,'text-anchor':'middle',fill:'#fff3dd','font-size':7,transform:`rotate(${i*360/37} ${label[0]} ${label[1]})`},number);
  });
  svg('circle',{cx:120,cy:120,r:70,fill:'#171421',stroke:'#b89963','stroke-width':2});
  const center=svg('text',{x:120,y:129,'text-anchor':'middle',fill:'#eee0bb','font-size':30},'✦');
  const ball=svg('circle',{cx:120,cy:5,r:3.6,fill:'#fffbea',stroke:'#b5a985','stroke-width':0.8});
  let round=null, busy=false, failedId=null;
  const duration=6500;
  function random(n) {
    const value=new Uint32Array(1),limit=Math.floor(4294967296/n)*n;
    do {crypto.getRandomValues(value);} while(value[0]>=limit);
    return value[0]%n;
  }
  function draw(now) {
    if(!round) return;
    const t=round.done?1:Math.min(1,Math.max(0,(now-round.startedAt)/duration));
    const angle=(2160+order.indexOf(Number(round.result.display))*360/37)*(1-Math.pow(1-t,3));
    const radius=115-32*Math.pow(t,4);
    const p=point(angle*Math.PI/180,radius);
    ball.setAttribute('cx',p[0]);ball.setAttribute('cy',p[1]);
    center.textContent=round.done?round.result.display:'…';
  }
  function render() {
    try {
      round=wallet.gameRounds().roulette || null;
      const active=round && !round.done;
      $('roulette-spin').disabled=busy || !!active;
      $('roulette-choice').disabled=!!active || busy;
      $('roulette-number').disabled=!!active || busy;
      if (active && round.choice) {
        $('roulette-choice').value = round.choice;
        $('roulette-number').value = round.pick;
        $('roulette-number').hidden = round.choice !== 'number';
        $('roulette-number-label').hidden = round.choice !== 'number';
      }
      $('roulette-skip').hidden=!active;
      $('roulette-skip').disabled=busy || wallet.balance()<5 || Date.now()>=round?.readyAt;
      if(round) $('roulette-result').textContent=round.done
        ? `${round.result.message} ${round.payout.toLocaleString()} tokens returned · ${round.stake.toLocaleString()} bet.${round.skipFee ? ' Skip cost: 5 tokens.' : ''}`
        : `Ball spinning · ${round.stake.toLocaleString()} tokens bet. Wait for free or skip for 5 tokens.`;
      draw(Date.now());
    } catch(error) {$('notice').textContent=error.message;}
  }
  async function finish(skip) {
    if(busy || !round || round.done) return;
    const id=round.id;
    busy=true;render();
    try {
      const result=await wallet.finishRoulette(id,skip);
      $('notice').textContent=`Roulette: ${result.result.message} ${result.payout.toLocaleString()} tokens returned.${result.skipFee ? ' 5 tokens spent to skip.' : ''}`;
      failedId=null;
    } catch(error) {
      $('notice').textContent=error.message;
      if(!skip) failedId=id;
    } finally {busy=false;render();}
  }
  $('roulette-spin').addEventListener('click',async()=>{
    if(busy) return;
    busy=true;render();
    try {
      const choice=$('roulette-choice').value,raw=$('roulette-number').value,pick=Number(raw);
      if(choice==='number' && (!raw.trim() || !Number.isInteger(pick) || pick<0 || pick>36)) throw new Error('Pick a whole number from 0 to 36.');
      const stake=Number($('stake').value);
      await wallet.startGame('roulette',stake,{choice,pick});
      failedId=null;
    }catch(error){$('notice').textContent=error.message;}
    finally{busy=false;render();}
  });
  $('roulette-skip').addEventListener('click',()=>finish(true));
  function tick() {
    const now=Date.now();
    if(round && !round.done) {
      if(!matchMedia('(prefers-reduced-motion: reduce)').matches) draw(now);
      if(now>=round.readyAt && round.id!==failedId) finish(false);
    }
    requestAnimationFrame(tick);
  }
  window.addEventListener('tinkle-wallet-change',render);
  window.addEventListener('storage',()=>{failedId=null;render();});
  document.addEventListener('visibilitychange',()=>{failedId=null;render();});
  render();requestAnimationFrame(tick);
})();
