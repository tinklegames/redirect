// Control records only. Creating events does not edit the game-card or code files.
let activeSiteEvent=null,eventStatusRef=null,eventStatusCallback=null;
function refreshRevealGames(){
    const selected=$('mystery-game').value;$('mystery-game').replaceChildren();
    cards.map((game,index)=>({game,index})).sort((a,b)=>a.game.name.localeCompare(b.game.name)).forEach(({game,index})=>{
        const option=document.createElement('option');option.value=game.code;option.textContent=game.name+' · '+game.code;$('mystery-game').append(option);
    });
    if(cards.some(game=>game.code===selected))$('mystery-game').value=selected;
}
function updateEventStatus(){
    const state=EventCore.state(activeSiteEvent,Date.now()+serverClockOffset);
    $('stop-event').disabled=!state;
    if(!state){$('event-status').textContent='No event running.';return;}
    const name=activeSiteEvent.type==='crabs'?'Crab Rave':'Mystery reveal';
    $('event-status').textContent=name+' · '+(state.phase==='countdown'?'starts in ':'ends in ')+state.seconds+'s'+(activeSiteEvent.type==='crabs'?' · '+(activeSiteEvent.crabs||0)+' crabs recruited':'');
}
auth.onAuthStateChanged(user=>{
    if(eventStatusRef&&eventStatusCallback)eventStatusRef.off('value',eventStatusCallback);
    activeSiteEvent=null;updateEventStatus();
    if(!user||user.isAnonymous)return;
    eventStatusRef=db.ref('siteSettings/liveEvent');
    eventStatusCallback=snapshot=>{activeSiteEvent=snapshot.val();updateEventStatus();};
    eventStatusRef.on('value',eventStatusCallback,error=>{$('event-status').textContent='Could not read event status: '+error.message;});
});
function eventOptions(countdownId,durationId){
    const countdown=Number($(countdownId).value),duration=Number($(durationId).value);
    if(!Number.isInteger(countdown)||countdown<0||countdown>120||!Number.isInteger(duration)||duration<10||duration>600)throw new Error('Use a countdown of 0–120 seconds and duration of 10–600 seconds.');
    return {id:crypto.randomUUID(),startedAt:firebase.database.ServerValue.TIMESTAMP,countdown,duration};
}
async function startSiteEvent(next){
    requireAdmin();await weeklyClockReady;
    const existing=(await db.ref('siteSettings/liveEvent').once('value')).val();
    if(EventCore.state(existing,Date.now()+serverClockOffset)&&!confirm('Replace the running event? Its music and effects will stop.'))return;
    // A simultaneous start from another admin tab must not silently overwrite it.
    const expected=existing?.id||null;
    const result=await db.ref('siteSettings/liveEvent').transaction(current=>{
        if((current?.id||null)!==expected)return;
        return next;
    },undefined,false);
    if(!result.committed)throw new Error('Another event changed while starting. Try again.');
    notify(next.type==='crabs'?'Crab Rave started.':'Mystery reveal started.');
}
$('mystery-event-form').onsubmit=event=>{event.preventDefault();action($('start-mystery'),async()=>{
    requireAdmin();
    const game=cards.find(game=>game.code===$('mystery-game').value);if(!game)throw new Error('Select a game.');
    const options=eventOptions('mystery-countdown','mystery-duration');
    const response=await fetch('codes.json',{cache:'no-store',signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw new Error('Could not verify the published codes.json. Upload the game destination first.');
    const destinations=AdminData.parseCodes(await response.text());
    if(!Object.hasOwn(destinations,game.code))throw new Error('This game code is not in the uploaded codes.json yet. Upload it before revealing.');
    await startSiteEvent({...options,type:'mystery',game:{name:game.name,code:game.code,img:game.img}});
});};
$('crab-event-form').onsubmit=event=>{event.preventDefault();action($('start-crabs'),()=>startSiteEvent({...eventOptions('crab-countdown','crab-duration'),type:'crabs',crabs:0}));};
$('stop-event').onclick=()=>action($('stop-event'),async()=>{
    requireAdmin();const id=activeSiteEvent?.id;if(!id)return;
    const result=await db.ref('siteSettings/liveEvent').transaction(current=>current?.id===id?null:undefined,undefined,false);
    if(!result.committed)throw new Error('The active event changed. Check its status before stopping it.');
    notify('Event stopped. Its music and decorations are cleared.');
});
$('reload-event-games').onclick=refreshRevealGames;
document.querySelector('[data-tab="live"]').addEventListener('click',refreshRevealGames);
setInterval(updateEventStatus,1000);refreshRevealGames();
