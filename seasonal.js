/* Visible seasonal decorations; normal mode is controlled by Site settings. */
(()=>{
 function sync(){const normal=window.tinkleDiscoverySettings?.seasonalTheme==='normal';document.documentElement.dataset.season=normal?'normal':'halloween';}
 function mount(){
  if(document.getElementById('halloween-banner'))return;
  const banner=document.createElement('aside');banner.id='halloween-banner';banner.setAttribute('aria-label','Halloween event');
  const icon=document.createElement('span');icon.className='halloween-pumpkin';icon.textContent='🎃';icon.setAttribute('aria-hidden','true');
  const text=document.createElement('div');const name=document.createElement('strong');name.textContent='Tinkle Terrors';text.append(name);
  const ghost=document.createElement('span');ghost.textContent='👻';ghost.className='halloween-ghost';ghost.setAttribute('aria-hidden','true');banner.append(icon,text,ghost);
  const host=document.querySelector('#app,.rewards-shell,.leaderboard-shell,main')||document.body;host.prepend(banner);
  for(const side of ['left','right']){const web=document.createElement('div');web.className='halloween-web halloween-web-'+side;web.setAttribute('aria-hidden','true');const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 180 180');svg.setAttribute('fill','none');svg.setAttribute('stroke','#e9d7f4');svg.setAttribute('stroke-width','0.85');
   for(let i=0;i<=6;i++){const angle=i*Math.PI/12,line=document.createElementNS(ns,'path');line.setAttribute('d','M 0 0 L '+(175*Math.cos(angle)).toFixed(2)+' '+(175*Math.sin(angle)).toFixed(2));svg.append(line);}
   for(const radius of [30,59,90,123,160]){let d='M '+radius+' 0';for(let i=0;i<6;i++){const a=i*Math.PI/12,b=(i+1)*Math.PI/12,m=(a+b)/2;d+=' Q '+(radius*.87*Math.cos(m)).toFixed(2)+' '+(radius*.87*Math.sin(m)).toFixed(2)+' '+(radius*Math.cos(b)).toFixed(2)+' '+(radius*Math.sin(b)).toFixed(2);}const arc=document.createElementNS(ns,'path');arc.setAttribute('d',d);svg.append(arc);}web.append(svg);document.body.append(web);}
  const scene=document.createElement('div');scene.className='halloween-scene';scene.setAttribute('aria-hidden','true');document.body.prepend(scene);
  sync();
 }
 window.addEventListener('discovery-settings',sync);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
