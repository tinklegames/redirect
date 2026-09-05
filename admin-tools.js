// Additional admin tools. Code/card edits remain local; live controls use existing Firebase paths.
let codeMap = null, codeHandle = null, codeSource = null, selectedCode = null, codeDirty = false;
let codesLoadVersion = 0;
let linkController = null, linkResults = [], linkVersion = 0;
let statsVersion = 0, statsWeek = null, statsWeekly = {}, statsAllTime = {}, stopStats = [];
let fileBusy = false;
function syncUndoButton(){ $('undo-edit').disabled = !fileHistory.length || fileBusy; }
function downloadText(name,text,type='application/json'){
    const url=URL.createObjectURL(new Blob([text],{type}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function updateCodeList(){
    $('codes-list').replaceChildren();
    if(!codeMap)return;
    const query=$('codes-search').value.toLowerCase();
    for(const [code,value] of Object.entries(codeMap).sort(([a],[b])=>a.localeCompare(b))){
        if(!(code+' '+value).toLowerCase().includes(query))continue;
        const button=document.createElement('button');button.type='button';button.className='catalog-item';
        const name=document.createElement('strong');name.textContent=code;const detail=document.createElement('small');detail.textContent=AdminData.decode(value).url;
        const span=document.createElement('span');span.append(name,detail);button.append(span);button.addEventListener('click',()=>editCode(code));$('codes-list').append(button);
    }
}
function editCode(code){
    if(codeDirty && !confirm('Discard unsaved destination edits?'))return;
    if(!codeMap || !Object.hasOwn(codeMap,code))return;
    const destination=AdminData.decode(codeMap[code]);selectedCode=code;
    $('destination-code').value=code;$('destination-url').value=destination.url;$('destination-iframe').checked=destination.iframe;codeDirty=false;
    switchTab('codes');$('code-form').scrollIntoView({behavior:'smooth',block:'center'});
}
function resetCodeForm(){selectedCode=null;$('code-form').reset();codeDirty=false;}
function invalidateLinks(){ linkVersion++;linkController?.abort();linkController=null;linkResults=[];$('links-results').replaceChildren();$('links-status').textContent='Destinations changed. Run a new check.';$('check-links').disabled=!codeMap;$('stop-links').disabled=true;$('export-links').disabled=true; }
async function openCodes(file,handle=null){
    const source=await file.text();const parsed=AdminData.parseCodes(source);
    codesLoadVersion++;codeMap=parsed;codeHandle=handle;codeSource=source;fileHistory.length=0;syncUndoButton();resetCodeForm();updateCodeList();invalidateLinks();
    $('save-code').disabled=false;$('download-codes').disabled=false;
    $('codes-file-status').textContent=handle?'Local codes.json connected. Saving writes back to this file.':'File loaded. Saving downloads an updated codes.json.';
}
$('open-codes').onclick=()=>action($('open-codes'),async()=>{
    if(codeDirty&&!confirm('Discard unsaved destination edits?'))return;
    if(!window.showOpenFilePicker){$('codes-upload').click();return;}
    const [handle]=await window.showOpenFilePicker({multiple:false,types:[{description:'Game codes',accept:{'application/json':['.json']}}]});await openCodes(await handle.getFile(),handle);
});
$('codes-upload').onchange=()=>{const file=$('codes-upload').files[0];if(file)action($('open-codes'),()=>openCodes(file));$('codes-upload').value='';};
$('codes-search').oninput=updateCodeList;
$('edit-destination').onclick=()=>{
    const code=$('game-code').value.trim();
    if(!codeMap){notify('Open codes.json in Codes & links first.',true);switchTab('codes');return;}
    if(Object.hasOwn(codeMap,code)){editCode(code);return;}
    if(codeDirty&&!confirm('Discard unsaved destination edits?'))return;
    resetCodeForm();$('destination-code').value=code;switchTab('codes');$('destination-url').focus();
};
$('new-code').onclick=()=>{if(!codeDirty||confirm('Discard unsaved destination edits?'))resetCodeForm();};
$('code-form').oninput=()=>{codeDirty=true;};
$('destination-code').oninput=()=>{$('destination-code').value=$('destination-code').value.toUpperCase();};
async function writeCodes(next){
    const source=JSON.stringify(next,null,2)+'\n';let handle=codeHandle;let picked=false;
    if(!handle&&window.showSaveFilePicker){handle=await window.showSaveFilePicker({suggestedName:'codes.json',types:[{description:'Game codes',accept:{'application/json':['.json']}}]});picked=true;}
    if(handle){
        if(!picked&&codeSource!==null&&await(await handle.getFile()).text()!==codeSource)throw new Error('codes.json changed outside the editor. Open it again before saving.');
        const stream=await handle.createWritable();try{await stream.write(source);await stream.close();}catch(e){await stream.abort().catch(()=>{});throw e;}
        codeHandle=handle;codeSource=source;$('codes-file-status').textContent='Saved locally. Upload codes.json to update the site.';
    }else{downloadText('codes.json',source);$('codes-file-status').textContent='Downloaded codes.json. Upload it to update the site.';}
}
$('code-form').onsubmit=event=>{event.preventDefault();action($('save-code'),async()=>{
    if(!codeMap)throw new Error('Open codes.json first.');
    const next=AdminData.putCode(codeMap,selectedCode,$('destination-code').value,$('destination-url').value,$('destination-iframe').checked);
    await writeCodes(next);fileHistory.push({kind:'codes',before:structuredClone(codeMap)});syncUndoButton();codeMap=next;selectedCode=$('destination-code').value.trim();codeDirty=false;updateCodeList();invalidateLinks();notify('Code saved.');
});};
$('download-codes').onclick=()=>{if(codeMap){downloadText('codes.json',JSON.stringify(codeMap,null,2)+'\n');notify(codeDirty?'Downloaded saved codes. Save the form first to include current edits.':'Downloaded codes.json.');}};
$('undo-edit').onclick=()=>action($('undo-edit'),async()=>{
    const edit=fileHistory.at(-1);if(!edit)return;
    if((formDirty||codeDirty)&&!confirm('Undo the last saved file edit and discard current form edits?'))return;
    fileBusy=true;
    try{
        if(edit.kind==='cards'){await saveCardFile(edit.before);cards=structuredClone(edit.before);clearForm();renderCatalog();imageChecker.changed();}
        else{await writeCodes(edit.before);codeMap=structuredClone(edit.before);resetCodeForm();updateCodeList();invalidateLinks();}
        fileHistory.pop();notify('Last edit undone. The restored file was saved or downloaded.');
    }finally{fileBusy=false;queueMicrotask(syncUndoButton);}
});
window.addEventListener('beforeunload',event=>{if(codeDirty){event.preventDefault();event.returnValue='';}});
(async()=>{
    const version=++codesLoadVersion;
    try{const response=await fetch('codes.json',{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error('Open a local codes.json file to begin.');const source=await response.text();const parsed=AdminData.parseCodes(source);if(version!==codesLoadVersion)return;codeMap=parsed;updateCodeList();$('codes-file-status').textContent='Website copy loaded. Open a local file to save directly.';$('save-code').disabled=false;$('download-codes').disabled=false;$('check-links').disabled=false;}
    catch(error){if(version===codesLoadVersion)$('codes-file-status').textContent='Could not load website copy. Open your local codes.json.';}
})();

// Honest browser link checks: unreadable cross-origin responses are not called broken or working.
function renderLinkResults(){
    $('links-results').replaceChildren();
    for(const result of linkResults){const row=document.createElement('div');row.className='catalog-item';const info=document.createElement('span');const label=document.createElement('strong');label.textContent=result.code+' · '+result.status;const url=document.createElement('a');url.href=result.url;url.target='_blank';url.rel='noopener noreferrer';url.textContent='Open game ↗';info.append(label,url);const edit=document.createElement('button');edit.textContent='Edit URL';edit.onclick=()=>editCode(result.code);row.append(info,edit);$('links-results').append(row);}
}
$('check-links').onclick=async()=>{
    if(!codeMap||linkController)return;
    const version=++linkVersion;const controller=new AbortController();linkController=controller;linkResults=[];renderLinkResults();
    const entries=Object.entries(codeMap);let next=0;$('check-links').disabled=true;$('stop-links').disabled=false;$('export-links').disabled=true;$('links-status').textContent='Checking…';
    async function worker(){while(!controller.signal.aborted&&next<entries.length){const [code,value]=entries[next++];const {url}=AdminData.decode(value);const result=await AdminData.probeLink(url,controller.signal);if(version!==linkVersion||result.status==='canceled')return;linkResults.push({code,url,...result});renderLinkResults();$('links-status').textContent=`${linkResults.length} / ${entries.length} checked. Unverified means the browser could not read the response.`;}}
    try{await Promise.all(Array.from({length:4},worker));}finally{if(version===linkVersion){linkController=null;$('check-links').disabled=false;$('stop-links').disabled=true;$('export-links').disabled=!linkResults.length;$('links-status').textContent=(controller.signal.aborted?'Stopped. ':'Finished. ')+$('links-status').textContent;}}
};
$('stop-links').onclick=()=>linkController?.abort();
$('export-links').onclick=()=>downloadText('game-link-report.json',JSON.stringify({checkedAt:new Date().toISOString(),results:linkResults},null,2));

// Live weekly and all-time rankings, scoped to the selected week.
function renderStats(){const data=AdminData.stats(statsWeekly,statsAllTime);$('stats-weekly').textContent=data.weeklyTotal.toLocaleString();$('stats-alltime').textContent=data.allTimeTotal.toLocaleString();$('stats-games').textContent=data.rows.length;$('stats-rows').replaceChildren();data.rows.forEach((row,index)=>{const tr=document.createElement('tr');for(const value of [index+1,row.name,row.count,row.allTime]){const td=document.createElement('td');td.textContent=value;tr.append(td);}$('stats-rows').append(tr);});}
function detachStats(){stopStats.forEach(fn=>fn());stopStats=[];}
window.loadWeeklyStats=async function(){
    const version=++statsVersion;detachStats();$('stats-status').textContent='Loading…';
    try{
        requireAdmin();await weeklyClockReady;
        const snap=await db.ref('weeklyClickData').once('value');if(version!==statsVersion)return;
        const data=snap.val()||{};const current=WeeklyPopularity.weekKey();const weeks=Object.keys(data).filter(k=>/^\d{4}-\d{2}-\d{2}$/.test(k));if(!weeks.includes(current))weeks.push(current);weeks.sort().reverse();
        const selected=weeks.includes($('stats-week').value)?$('stats-week').value:current;
        $('stats-week').replaceChildren();for(const week of weeks){const option=document.createElement('option');option.value=week;option.textContent=week+(week===current?' · current week':'');$('stats-week').append(option);}$('stats-week').value=selected;statsWeek=selected;
        statsWeekly={};statsAllTime={};renderStats();
        let loaded=0;const error=e=>{$('stats-status').textContent='Stats unavailable: '+e.message;};
        for(const [path,apply] of [['weeklyClickData/'+selected,value=>statsWeekly=value],['allTimeClickData',value=>statsAllTime=value]]){const reference=db.ref(path);const callback=snapshot=>{if(version!==statsVersion)return;apply(snapshot.val()||{});renderStats();loaded++;$('stats-status').textContent=loaded>=2?'Live counts for week starting '+selected:'Loading…';};reference.on('value',callback,error);stopStats.push(()=>reference.off('value',callback));}
        if(Object.values(data).some(v=>typeof v==='number')&&!data.__legacyMigrated)$('stats-status').textContent='Legacy counts have not migrated yet. Open Popular on the game page once to initialize the current week.';
    }catch(error){if(version===statsVersion)$('stats-status').textContent=error.message;}
};
$('stats-week').onchange=window.loadWeeklyStats;$('refresh-stats').onclick=window.loadWeeklyStats;
auth.onAuthStateChanged(user=>{if(!user||user.isAnonymous){statsVersion++;detachStats();}});
setInterval(()=>{if(!$('panel-stats').hidden&&statsWeek&&statsWeek!==WeeklyPopularity.weekKey()&&$('stats-week').selectedIndex===0){$('stats-week').value='';window.loadWeeklyStats();}},60000);

// Broadcast controls. Clear operations leave card files and click counts untouched.
function liveWrite(button,path,value,message){return action(button,async()=>{requireAdmin();await db.ref(path).set(value);},message);}
$('send-live').onclick=()=>action($('send-live'),async()=>{
    requireAdmin();const text=$('live-message').value.trim();if(!text)throw new Error('Enter an announcement.');const duration=Number($('live-duration').value);
    await db.ref('siteSettings/liveAnnouncement').set({id:crypto.randomUUID(),text,style:$('live-style').value,timestamp:firebase.database.ServerValue.TIMESTAMP,expiresAt:duration?Date.now()+serverClockOffset+duration*1000:0});
    $('live-status').textContent='Announcement sent.';notify('Announcement sent.');
});
$('clear-live').onclick=()=>liveWrite($('clear-live'),'siteSettings/liveAnnouncement',null,'Announcement cleared.');
$('publish-update').onclick=()=>action($('publish-update'),async()=>{
    requireAdmin();const text=$('update-message').value.trim();if(!text)throw new Error('Enter an update message.');
    await db.ref('siteSettings/updateNotice').set({id:crypto.randomUUID(),text,timestamp:firebase.database.ServerValue.TIMESTAMP});$('update-status').textContent='Update banner is live.';notify('Update banner published.');
});
$('clear-update').onclick=()=>liveWrite($('clear-update'),'siteSettings/updateNotice',null,'Update banner cleared.');
syncUndoButton();
