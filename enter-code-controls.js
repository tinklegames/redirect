(()=>{
 function panic(event){
  if(event.defaultPrevented||event.isComposing||event.repeat)return;
  let key='`',url='https://google.com';try{key=localStorage.getItem('panicKey')||key;url=localStorage.getItem('panicUrl')||url}catch{}
  const pressed=event.key==='Escape'?'esc':event.key===' '?'space':event.key.toLowerCase();if(pressed!==key.toLowerCase())return;
  if(!/^https?:\/\//i.test(url))url='https://'+url;try{if(!['https:','http:'].includes(new URL(url).protocol))return}catch{return}
  window.TinkleAntiClose?.suspend();event.preventDefault();event.stopImmediatePropagation();try{window.top.location.replace(url)}catch{location.replace(url)}
 }
 document.addEventListener('keydown',panic,true);
 document.getElementById('siteFrame')?.addEventListener('load',event=>{try{event.target.contentDocument?.addEventListener('keydown',panic,true)}catch{}});
 document.getElementById('codeInput')?.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.defaultPrevented){event.preventDefault();document.getElementById('submitBtn').click()}});
})();
