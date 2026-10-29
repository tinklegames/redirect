(()=>{
 const host=document.querySelector('#updateLog .log-content');if(!host)return;
 const key='tinkleUpdateHistory',allowed=new Set(['H2','H3','UL','OL','LI','P','DIV','SPAN','STRONG','EM','BR']);
 function safe(html){const doc=new DOMParser().parseFromString(html,'text/html'),fragment=document.createDocumentFragment();function copy(node,parent){if(node.nodeType===3){parent.append(document.createTextNode(node.textContent));return}if(node.nodeType!==1||!allowed.has(node.tagName))return;const next=document.createElement(node.tagName.toLowerCase());parent.append(next);node.childNodes.forEach(child=>copy(child,next));}doc.body.childNodes.forEach(node=>copy(node,fragment));return fragment;}
 function text(html){const doc=new DOMParser().parseFromString(html,'text/html');return doc.body.textContent.replace(/\s+/g,' ').trim()}
 const clone=host.cloneNode(true);clone.querySelectorAll('.close-btn,.update-history-tools').forEach(x=>x.remove());const current=clone.innerHTML.trim();let saved=[],embedded=[];
 try{saved=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(saved))saved=[]}catch{}
 try{embedded=JSON.parse(document.getElementById('tinkle-update-archive')?.textContent||'[]');if(!Array.isArray(embedded))embedded=[]}catch{}
 const history=[],seen=new Set([text(current)]);for(const item of [...embedded,...saved]){if(typeof item?.html!=='string')continue;const fingerprint=text(item.html);if(!fingerprint||seen.has(fingerprint))continue;seen.add(fingerprint);history.push(item)}
 try{localStorage.setItem(key,JSON.stringify([{html:current},...history].slice(0,60)))}catch{}
 const tools=document.createElement('div');tools.className='update-history-tools';const open=document.createElement('button');open.type='button';open.textContent='Past updates';open.className='btn-small-spacious';tools.append(open);host.append(tools);
 const dialog=document.createElement('dialog');dialog.className='player-dialog update-history-dialog';dialog.setAttribute('aria-labelledby','updateHistoryTitle');const heading=document.createElement('h2');heading.id='updateHistoryTitle';heading.textContent='Past updates';const select=document.createElement('select');select.setAttribute('aria-label','Choose a past update');const content=document.createElement('div');content.className='update-history-content';const close=document.createElement('button');close.type='button';close.className='player-button';close.textContent='Back to current update';close.onclick=()=>dialog.close();dialog.append(heading,select,content,close);document.body.append(dialog);
 history.forEach((entry,index)=>{const doc=new DOMParser().parseFromString(entry.html,'text/html');select.append(new Option(doc.querySelector('h3')?.textContent||doc.querySelector('h2')?.textContent||'Earlier update '+(index+1),String(index)))});
 function render(){content.replaceChildren();if(history.length)content.append(safe(history[Number(select.value)||0].html));else content.textContent='No earlier updates have been archived yet.';select.hidden=!history.length;}
 select.onchange=render;open.onclick=()=>{render();dialog.showModal()};
})();
