(()=>{
 const data=window.TinkleSettingsData,root=document.documentElement;
 const themeKey='tinkleImportedTheme',cloakKey='tinkleTabCloak';
 const read=key=>{try{return localStorage.getItem(key)}catch{return null}};
 const save=(key,value)=>{try{if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value)}catch{}};
 const properties=['--bg-base','--panel','--panel-soft','--border-soft','--text','--text-soft','--accent','--accent-2','--accent-3','--accent-soft','--radius-lg','--radius-md','--imported-cursor','--imported-link-cursor','--imported-text-cursor'];
 function applyTheme(id){
  if(!data.themes[id])id='default';const theme=data.themes[id];
  root.dataset.importedTheme=id;root.removeAttribute('data-theme');
  properties.forEach(key=>root.style.removeProperty(key));document.body.style.removeProperty('background');document.body.style.removeProperty('color');
  if(id!=='default'){
   const vars={'--bg-base':theme.bg,'--panel':theme.surface,'--panel-soft':theme.surface2,'--border-soft':theme.border,'--text':theme.text,'--text-soft':theme.muted,'--accent':theme.accent,'--accent-2':theme.highlight,'--accent-3':theme.accent,'--accent-soft':theme.highlight,'--radius-lg':theme.radius||'22px','--radius-md':theme.radius||'16px'};
   Object.entries(vars).forEach(([key,value])=>root.style.setProperty(key,value,'important'));
   const bg=theme.image?`linear-gradient(${theme.bg}66,${theme.bgAlt}88),url("${theme.image}") center/cover fixed`:`linear-gradient(145deg,${theme.bg},${theme.bgAlt}) fixed`;
   document.body.style.setProperty('background',bg,'important');document.body.style.setProperty('color',theme.text,'important');
   for(const [field,key] of [['cursor','--imported-cursor'],['linkCursor','--imported-link-cursor'],['textCursor','--imported-text-cursor']]){const c=theme[field];if(c)root.style.setProperty(key,`url("${c.url}") ${c.hotspot?.[0]||0} ${c.hotspot?.[1]||0}`);}
  }
  const select=document.getElementById('themeSelect');if(select)select.value=id;
 }
 const originalTitle=document.title,originalIcons=[...document.querySelectorAll('link[rel~="icon"]')].map(x=>x.cloneNode(true));
 function restoreIcons(){document.querySelectorAll('link[rel~="icon"]').forEach(x=>x.remove());originalIcons.forEach(x=>document.head.append(x.cloneNode(true)));}
 function applyCloak(value){window.TinkleCloakBridge?.apply(value);restoreIcons();document.title=value?.title||originalTitle;if(value?.icon){document.querySelectorAll('link[rel~="icon"]').forEach(x=>x.remove());const link=document.createElement('link');link.rel='icon';link.href=value.icon;link.onerror=()=>{link.onerror=null;restoreIcons()};document.head.append(link);}}
 window.TinkleSettings={applyTheme};applyTheme(read(themeKey)||'default');
 let cloak=null;try{cloak=JSON.parse(read(cloakKey))}catch{}applyCloak(cloak);
 const themeSelect=document.getElementById('themeSelect');if(themeSelect){themeSelect.replaceChildren();for(const [id,theme] of Object.entries(data.themes)){const option=document.createElement('option');option.value=id;option.textContent=id==='default'?'Default · Tinkle Terrors':theme.name.replace(/\b\w/g,x=>x.toUpperCase());themeSelect.append(option)}themeSelect.value=read(themeKey)||'default';themeSelect.addEventListener('change',()=>{save(themeKey,themeSelect.value);applyTheme(themeSelect.value)});}
 const select=document.getElementById('tabCloakPreset');if(select){const status=document.getElementById('tabCloakStatus');select.append(new Option('None · Original tab',''));data.cloaks.forEach((entry,i)=>select.append(new Option(entry.name,String(i))));
 const syncSelection=value=>{const index=data.cloaks.findIndex(entry=>entry.title===value?.title&&entry.icon===value?.icon);select.value=index<0?'':String(index);};syncSelection(cloak);
 select.onchange=()=>{const entry=select.value===''?null:data.cloaks[Number(select.value)];save(cloakKey,entry?JSON.stringify(entry):null);applyCloak(entry);status.textContent=entry?'Tab cloak applied.':'Original tab restored.';};
 document.getElementById('tabCloakReset').onclick=()=>{save(cloakKey,null);applyCloak(null);select.value='';status.textContent='Original tab title and icon restored.'};
 window.addEventListener('storage',event=>{if(event.key===cloakKey){let value=null;try{value=JSON.parse(read(cloakKey))}catch{}syncSelection(value)}});
 }
 window.addEventListener('storage',event=>{if(event.key===themeKey)applyTheme(read(themeKey)||'default');if(event.key===cloakKey){let value=null;try{value=JSON.parse(read(cloakKey))}catch{}applyCloak(value)}});
})();
