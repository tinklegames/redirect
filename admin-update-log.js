// Replace only the update-log text; retain every other byte of codes.html.
(function(root){
 const start='<!-- ADMIN UPDATE LOG START -->',end='<!-- ADMIN UPDATE LOG END -->';
 function region(source){
  const a=source.indexOf(start),b=source.indexOf(end);
  if(a!==-1&&b>a)return {start:a,end:b+end.length,html:source.slice(a+start.length,b)};
  const overlay=source.indexOf('id="updateLog"');
  if(overlay===-1)throw Error('This file does not contain the update log. Open codes.html.');
  const match=/<h2>Update Log<\/h2>[\s\S]*?<div class="log-footer"[^>]*>[\s\S]*?<\/div>/.exec(source.slice(overlay));
  if(!match)throw Error('The update log format was not recognized. No changes were made.');
  return {start:overlay+match.index,end:overlay+match.index+match[0].length,html:match[0]};
 }
 const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const list=text=>'<ul>\n'+text.split('\n').map(s=>s.trim()).filter(Boolean).map(s=>'    <li>'+escape(s)+'</li>').join('\n')+'\n</ul>';
 function markup(data){return '<h2>'+escape(data.title)+'</h2>\n<h3>'+escape(data.release)+'</h3>\n'+list(data.items)+(data.coming.trim()?'\n<h3>'+escape(data.comingTitle)+'</h3>\n'+list(data.coming):'')+'\n<div class="log-footer" style="margin-top:20px;padding-top:12px;border-top:1px solid rgba(255,255,255,.2);font-size:.75rem;text-align:center"><span>'+escape(data.footer)+'</span></div>';}
 function replace(source,data){const r=region(source);return source.slice(0,r.start)+start+'\n'+markup(data)+'\n'+end+source.slice(r.end);}
 root.UpdateLogEditor={region,markup,replace};
 if(typeof document==='undefined')return;
 let source=null,handle=null,dirty=false,version=0;
 const fields={title:'update-title',release:'update-release',items:'update-items',comingTitle:'update-coming-title',coming:'update-coming',footer:'update-footer'};
 const values=()=>Object.fromEntries(Object.entries(fields).map(([key,id])=>[key,$(id).value]));
 function preview(){ $('update-preview').innerHTML=markup(values()); }
 function load(text,newHandle){
  const r=region(text),doc=new DOMParser().parseFromString(r.html,'text/html');
  const headings=doc.querySelectorAll('h3'),lists=doc.querySelectorAll('ul');
  if(headings.length>2||lists.length>2)throw Error('This log has extra sections. Edit the file directly to preserve them.');
  const lines=list=>[...(list?.querySelectorAll('li')||[])].map(li=>li.textContent).join('\n');
  const data={title:doc.querySelector('h2')?.textContent||'Update Log',release:headings[0]?.textContent||'',items:lines(lists[0]),comingTitle:headings[1]?.textContent||'Coming Soon',coming:lines(lists[1]),footer:doc.querySelector('.log-footer')?.textContent.trim()||''};
  source=text;handle=newHandle;dirty=false;version++;
  for(const [key,id] of Object.entries(fields))$(id).value=data[key];
  $('save-update-file').disabled=false;preview();$('update-file-status').textContent=handle?'Local codes.html connected. Save writes to this file.':'Website or imported copy loaded. Save creates an updated codes.html.';
 }
 $('update-editor').addEventListener('input',()=>{dirty=true;preview();});
 $('open-update-file').onclick=()=>action($('open-update-file'),async()=>{
  if(dirty&&!confirm('Discard unsaved update-log edits?'))return;
  if(!window.showOpenFilePicker){$('update-file-upload').click();return;}
  const [fileHandle]=await window.showOpenFilePicker({types:[{description:'Game page',accept:{'text/html':['.html']}}]});load(await(await fileHandle.getFile()).text(),fileHandle);
 });
 $('update-file-upload').onchange=()=>{const file=$('update-file-upload').files[0];if(file)action($('open-update-file'),async()=>load(await file.text(),null));$('update-file-upload').value='';};
 $('update-editor').onsubmit=event=>{event.preventDefault();action($('save-update-file'),async()=>{
  if(source===null)throw Error('Open codes.html first.');
  const next=replace(source,values());let target=handle,picked=false;
  if(!target&&window.showSaveFilePicker){target=await window.showSaveFilePicker({suggestedName:'codes.html',types:[{description:'Game page',accept:{'text/html':['.html']}}]});picked=true;}
  if(target){
   if(!picked&&await(await target.getFile()).text()!==source)throw Error('codes.html changed outside this editor. Open it again before saving.');
   const stream=await target.createWritable();try{await stream.write(next);await stream.close();}catch(error){await stream.abort().catch(()=>{});throw error;}handle=target;
  }else downloadText('codes.html',next,'text/html');
  source=next;dirty=false;$('update-file-status').textContent='Saved. Upload codes.html to publish the updated log.';notify('Update log saved to codes.html.');
 });};
 window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
 const initial=version;
 fetch('codes.html',{cache:'no-store',signal:AbortSignal.timeout(10000)}).then(response=>{if(!response.ok)throw Error('Load failed');return response.text();}).then(text=>{if(version===initial&&!dirty)load(text,null);}).catch(()=>{if(version===initial)$('update-file-status').textContent='Open your local codes.html to edit its update log.';});
})(globalThis);
