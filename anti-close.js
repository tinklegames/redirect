(()=>{
 const key='tinkleAntiClose';let suspended=false;
 function enabled(){try{return localStorage.getItem(key)==='1'}catch{return false}}
 function warn(event){if(!enabled()||suspended)return;event.preventDefault();event.returnValue='';}
 window.addEventListener('beforeunload',warn);
 window.TinkleAntiClose={suspend(){suspended=true;setTimeout(()=>suspended=false,3000)}};
 const toggle=document.getElementById('antiCloseToggle'),status=document.getElementById('antiCloseStatus');
 function render(){if(toggle)toggle.checked=enabled();if(status)status.textContent=enabled()?'Enabled. Your browser may ask you to confirm before leaving.':'Disabled.'}
 if(toggle)toggle.addEventListener('change',()=>{try{localStorage.setItem(key,toggle.checked?'1':'0')}catch{toggle.checked=false;if(status)status.textContent='This browser could not save the setting.';return}render()});
 window.addEventListener('storage',event=>{if(event.key===key)render()});render();
})();
