(() => {
 const $=id=>document.getElementById(id);let busy=false,lastRefresh=0;
 const refreshEvery=60*60*1000;
 const retry=document.createElement('button');retry.type='button';retry.className='player-button';retry.textContent='Retry';retry.hidden=true;$('leaderboard-status').after(retry);retry.onclick=()=>refresh();
 async function refresh(){if(busy)return;busy=true;retry.hidden=true;$('leaderboard-status').textContent='Connecting and loading rankings…';let timer;
  try{
   const players=await Promise.race([TinkleAccount.leaderboard(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('The connection timed out. Check your connection and try again.')),20000)})]);clearTimeout(timer);$('podium').replaceChildren();$('ranking-list').replaceChildren();

   players.forEach((p,i)=>{
    const rank=i+1;
    if(i<3){const card=document.createElement('article');card.className='podium-card';card.dataset.rank=String(i+1);const place=document.createElement('span');place.className='podium-rank';place.textContent=i===0?'♛':String(rank).padStart(2,'0');place.setAttribute('aria-label',`Rank ${rank}`);const balance=document.createElement('strong');balance.textContent=p.balance.toLocaleString();const unit=document.createElement('small');unit.textContent='TINKLE TOKENS';card.append(place,TinkleCosmetics.name(p),balance,unit);$('podium').append(card);return;}
    const row=document.createElement('li');row.dataset.you=String(p.isYou);const number=document.createElement('span');number.className='ranking-position';number.textContent=String(rank).padStart(2,'0');const name=TinkleCosmetics.name(p);if(p.isYou)name.append(document.createTextNode(' · You'));const balance=document.createElement('strong');balance.className='ranking-balance';balance.textContent=`✦ ${p.balance.toLocaleString()}`;row.append(number,name,balance);$('ranking-list').append(row);
   });
   $('ranking-list').hidden=players.length<=3;
   $('leaderboard-status').textContent=players.length?'':'No players yet.';
   lastRefresh=Date.now();
  }catch(error){console.error('Leaderboard load failed:',error);$('leaderboard-status').textContent='Could not load rankings. '+(error.message||'Please try again.');retry.hidden=false;}finally{clearTimeout(timer);busy=false;}
 }
 refresh();
 window.addEventListener('online',refresh);
 window.addEventListener('tinkle-player-change',()=>{if(!busy&&(!lastRefresh||Date.now()-lastRefresh>=refreshEvery))refresh();});
 setInterval(()=>{if(!document.hidden)refresh();},refreshEvery);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-lastRefresh>=refreshEvery)refresh();});
})();
