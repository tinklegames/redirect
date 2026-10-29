(()=>{
 const originals=new WeakMap();
 function update(doc,value){if(!originals.has(doc))originals.set(doc,{title:doc.title,icons:[...doc.querySelectorAll('link[rel~="icon"]')].map(x=>x.cloneNode(true))});const original=originals.get(doc);doc.title=value?.title||original.title;doc.querySelectorAll('link[rel~="icon"]').forEach(x=>x.remove());if(value?.icon){const icon=doc.createElement('link');icon.rel='icon';icon.href=new URL(value.icon,location.href).href;doc.head.append(icon)}else original.icons.forEach(x=>doc.head.append(x.cloneNode(true)));}
 function apply(value){let target=window.parent;while(target!==window){try{if(target.location.href!=='about:blank')break;update(target.document,value);if(target.parent===target)break;target=target.parent}catch{break}}
  if(window.parent!==window)window.parent.postMessage({type:'tinkle:tab-cloak',title:value?.title||null,icon:value?.icon?new URL(value.icon,location.href).href:null},'*');
 }
 function open(){const tab=window.open('about:blank','_blank');if(!tab)return false;const doc=tab.document;doc.title='Tinkle Games';doc.body.style.cssText='margin:0;background:#100b18;overflow:hidden';const frame=doc.createElement('iframe');frame.src=location.href;frame.title='Tinkle Games';frame.allow='fullscreen; autoplay; clipboard-write';frame.style.cssText='position:fixed;inset:0;width:100%;height:100%;border:0';doc.body.append(frame);
  tab.addEventListener('message',event=>{if(event.source!==frame.contentWindow||event.origin!==location.origin||event.data?.type!=='tinkle:tab-cloak')return;const value=event.data;if(value.icon){try{if(!['http:','https:'].includes(new URL(value.icon).protocol))return}catch{return}}update(doc,value.title?{title:String(value.title).slice(0,120),icon:value.icon}:null)});
  let saved=null;try{saved=JSON.parse(localStorage.getItem('tinkleTabCloak'))}catch{}update(doc,saved);return true;
 }
 window.TinkleCloakBridge={apply,open};
 const button=document.getElementById('openCloakedTab');if(button)button.onclick=()=>{if(!open())document.getElementById('tabCloakStatus').textContent='Allow pop-ups for this site, then try again.'};
})();
