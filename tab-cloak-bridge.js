(()=>{
 const originals=new WeakMap();
 function update(doc,value){if(!originals.has(doc))originals.set(doc,{title:doc.title,icons:[...doc.querySelectorAll('link[rel~="icon"]')].map(x=>x.cloneNode(true))});const original=originals.get(doc);doc.title=value?.title||original.title;doc.querySelectorAll('link[rel~="icon"]').forEach(x=>x.remove());if(value?.icon){const icon=doc.createElement('link');icon.rel='icon';icon.href=new URL(value.icon,location.href).href;doc.head.append(icon)}else original.icons.forEach(x=>doc.head.append(x.cloneNode(true)));}
 function apply(value){let target=window.parent;while(target!==window){try{if(target.location.href!=='about:blank')break;update(target.document,value);if(target.parent===target)break;target=target.parent}catch{break}}
  if(window.parent!==window)window.parent.postMessage({type:'tinkle:tab-cloak',title:value?.title||null,icon:value?.icon?new URL(value.icon,location.href).href:null},'*');
 }
 function refresh(value){
  const pageURL=location.href;
  window.TinkleAntiClose?.suspend();apply(value);
  // An existing compatible blank wrapper already owns the visible tab.
  try{if(window.parent!==window&&window.parent.location.href==='about:blank'){location.reload();return true;}}catch{
   // An unrelated wrapper must cooperate through the message bridge.
   location.reload();return true;
  }
  let target=window;try{if(window.top.location.origin===location.origin)target=window.top;}catch{}
  const tab=target.open('about:blank','_self');if(!tab)return false;
  const doc=tab.document;doc.open();doc.write('<!doctype html><html><head><meta charset="utf-8"><title>Tinkle Games</title></head><body style="margin:0;background:#100b18;overflow:hidden"></body></html>');doc.close();
  const frame=doc.createElement('iframe');frame.src=pageURL;frame.title='Tinkle Games';frame.allow='fullscreen; autoplay; clipboard-write';frame.style.cssText='position:fixed;inset:0;width:100%;height:100%;border:0';
  tab.addEventListener('message',event=>{if(event.source!==frame.contentWindow||event.origin!==new URL(pageURL).origin||event.data?.type!=='tinkle:tab-cloak')return;const next=event.data;if(next.icon){try{if(!['http:','https:'].includes(new URL(next.icon).protocol))return}catch{return}}update(doc,next.title?{title:String(next.title).slice(0,120),icon:next.icon}:null)});
  doc.body.append(frame);update(doc,value);return true;
 }
 window.TinkleCloakBridge={apply,refresh};
})();
