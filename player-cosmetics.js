(() => {
 const shop=window.TinkleShop;
 const item=id=>shop.items.find(item=>item.id===id);
 function name(profile){const host=document.createElement('span');host.className='player-profile';const badge=item(profile.equipped?.badge);if(badge){const b=document.createElement('span');b.className='player-badge';b.textContent=badge.value;b.title=badge.name;host.append(b);}const text=document.createElement('span');text.className='player-name';text.textContent=profile.username;text.dataset.effect=item(profile.equipped?.name)?.value||'';host.append(text);return host;}
 window.TinkleCosmetics={name,item};
 let lastBackground;
 function apply(){
  const profile=window.TinkleAccount.profile,root=document.documentElement;
  for(const [category,key] of [['theme','shopTheme'],['card','cardStyle']]){const selected=item(profile?.equipped?.[category]);if(selected)root.dataset[key]=selected.value;else delete root.dataset[key];}
  const kind=item(profile?.equipped?.background)?.value;
  if(kind!==lastBackground){lastBackground=kind;document.getElementById('cosmetic-background')?.remove();if(kind){const bg=document.createElement('div');bg.id='cosmetic-background';bg.dataset.kind=kind;bg.setAttribute('aria-hidden','true');for(let i=0;i<(kind==='orbs'?10:45);i++){const particle=document.createElement('span');particle.style.left=`${(i*37)%100}%`;particle.style.top=`${(i*23)%100}%`;particle.style.animationDelay=`-${i*.73}s`;bg.append(particle);}document.body.prepend(bg);}}
  document.querySelectorAll('[data-player-name]').forEach(host=>{host.replaceChildren();if(profile)host.append(name(profile));});
 }
 const bar=document.createElement('nav');bar.className='player-bar';bar.setAttribute('aria-label','Player navigation');
 const who=document.createElement('span');who.dataset.playerName='';who.className='player-profile';bar.append(who);
 for(const [label,href] of [['Games','codes.html'],['Rewards & shop','rewards.html'],['Leaderboard','leaderboard.html']]){const a=document.createElement('a');a.href=href;a.textContent=label;bar.append(a);}
 const restore=document.createElement('a');restore.href='account.html';restore.textContent='Account';bar.append(restore);
 const host=document.querySelector('.rewards-shell,.leaderboard-shell,#app,main')||document.body;host.prepend(bar);
 window.addEventListener('tinkle-player-change',apply);apply();
})();
