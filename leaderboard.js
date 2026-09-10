(() => {
 const $=id=>document.getElementById(id);let busy=false,lastRefresh=0;
 const refreshEvery=60*60*1000;
 async function refresh(){if(busy)return;busy=true;
  try{
   const players=await TinkleAccount.leaderboard();$('podium').replaceChildren();$('ranking-list').replaceChildren();

   players.forEach((p,i)=>{
    const rank=i+1;
    if(i<3){const card=document.createElement('article');card.className='podium-card';card.dataset.rank=String(i+1);const place=document.createElement('span');place.className='podium-rank';place.textContent=i===0?'♛':String(rank).padStart(2,'0');place.setAttribute('aria-label',`Rank ${rank}`);const balance=document.createElement('strong');balance.textContent=p.balance.toLocaleString();const unit=document.createElement('small');unit.textContent='TINKLE TOKENS';card.append(place,TinkleCosmetics.name(p),balance,unit);$('podium').append(card);return;}
    const row=document.createElement('li');row.dataset.you=String(p.isYou);const number=document.createElement('span');number.className='ranking-position';number.textContent=String(rank).padStart(2,'0');const name=TinkleCosmetics.name(p);if(p.isYou)name.append(document.createTextNode(' · You'));const balance=document.createElement('strong');balance.className='ranking-balance';balance.textContent=`✦ ${p.balance.toLocaleString()}`;row.append(number,name,balance);$('ranking-list').append(row);
   });
   $('ranking-list').hidden=players.length<=3;
   $('leaderboard-status').textContent=players.length?'':'No players yet.';
   lastRefresh=Date.now();
  }catch(error){$('leaderboard-status').textContent='Could not load rankings.';}finally{busy=false;}
 }
 TinkleAccount.ready.then(refresh);
 setInterval(()=>{if(!document.hidden&&TinkleAccount.profile)refresh();},refreshEvery);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&TinkleAccount.profile&&Date.now()-lastRefresh>=refreshEvery)refresh();});
})();
