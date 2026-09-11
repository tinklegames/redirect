(() => {
 const db=firebase.firestore(),store=TinkleModeration.createStore(db,()=>firebase.firestore.FieldValue.serverTimestamp(),()=>auth.currentUser);
 let selected=null,stopPlayer=null,stopBan=null,ban=null,permitted=false,generation=0,busy=false;
 let stopOnline=null,onlineNames=[],onlineRenderKey='';
 function renderOnline(){
  const key=JSON.stringify([onlineNames,selected?.username?.toLowerCase(),busy,permitted]);
  if(key===onlineRenderKey)return;onlineRenderKey=key;
  const list=$('online-players-list');list.replaceChildren();
  $('online-players-count').textContent=onlineNames.length;
  for(const name of onlineNames){
   const button=document.createElement('button');button.type='button';button.className='online-player';
   button.textContent=name;button.disabled=busy||!permitted;
   button.setAttribute('aria-pressed',String(selected?.username?.toLowerCase()===name.toLowerCase()));
   button.onclick=()=>{if(busy||!permitted)return;$('player-search-name').value=name;selectPlayer(name);};list.append(button);
  }
 }
 function watchOnline(){
  const presence=firebase.database().ref('connectedUsers');
  const update=snapshot=>{onlineNames=TinkleOnlinePlayers.names(snapshot.val());renderOnline();$('online-players-status').textContent=onlineNames.length?'Click a username to manage that player.':'No named players are online. Players already on an older page will appear after refreshing.';};
  presence.on('value',update,()=>{onlineNames=[];renderOnline();$('online-players-status').textContent='Could not load online players. You can still search below.';});
  stopOnline=()=>presence.off('value',update);
 }
 const message=text=>{$('players-status').textContent=text;};
 function clear(){stopPlayer?.();stopBan?.();stopPlayer=stopBan=null;selected=null;ban=null;$('player-controls').hidden=true;renderOnline();}
 function draw(){if(!selected)return;$('moderation-name').textContent=selected.username;$('moderation-balance').textContent=selected.balance.toLocaleString();$('moderation-ban-status').textContent=TinkleModeration.label(ban,Date.now()+serverClockOffset);$('remove-token-amount').max=selected.balance;renderOnline();}
 async function run(button,fn,success){if(busy||!permitted||!selected)return;busy=true;renderOnline();button.disabled=true;message('Saving…');try{await fn(selected.uid);message(success);}catch(error){message(error.code==='permission-denied'?'Admin access is required.':error.message);}finally{busy=false;renderOnline();button.disabled=false;}}
 auth.onAuthStateChanged(async user=>{const token=++generation;stopOnline?.();stopOnline=null;onlineNames=[];clear();permitted=false;$('online-players-status').textContent='Sign in with player-management access to see online players.';$('player-search-button').disabled=true;$('moderation-setup').hidden=true;if(!user)return;try{const allowed=await store.permitted();if(token!==generation)return;permitted=allowed;if(!permitted){$('moderation-admin-uid').textContent=user.uid;$('moderation-setup').hidden=false;message('Player management needs admin access.');return;}$('player-search-button').disabled=false;watchOnline();message('');}catch(error){if(token===generation)message('Could not check admin access. Deploy the updated Firestore rules first.');}});
 async function selectPlayer(username){if(!permitted||busy)return;const token=++generation;clear();$('player-search-button').disabled=true;message('Finding player…');try{const result=await store.find(username);if(token!==generation)return;selected=result;$('player-controls').hidden=false;message('');draw();stopPlayer=db.collection('tinklePlayers').doc(selected.uid).onSnapshot(snapshot=>{if(token!==generation)return;if(snapshot.exists){selected={uid:snapshot.id,...snapshot.data()};draw();}else{clear();message('Account deleted.');}},()=>message('Could not refresh player balance.'));stopBan=db.collection('tinkleBans').doc(selected.uid).onSnapshot(snapshot=>{if(token!==generation||snapshot.metadata.hasPendingWrites)return;ban=snapshot.exists?snapshot.data():null;draw();},()=>message('Could not refresh ban status.'));}catch(error){if(token===generation)message(error.message);}finally{if(token===generation)$('player-search-button').disabled=false;}};
 $('player-search-form').onsubmit=event=>{event.preventDefault();selectPlayer($('player-search-name').value);};
 $('give-token-form').onsubmit=event=>{event.preventDefault();const amount=Number($('give-token-amount').value);if(!selected||busy)return;if(!confirm(`Give ${amount.toLocaleString()} tokens to ${selected.username}?`))return;run($('give-token-button'),uid=>store.giveTokens(uid,amount),'Tokens added.');};
 $('remove-token-form').onsubmit=event=>{event.preventDefault();const amount=Number($('remove-token-amount').value);if(!selected||busy)return;if(!confirm(`Remove ${amount.toLocaleString()} tokens from ${selected.username}?`))return;run($('remove-token-button'),uid=>store.removeTokens(uid,amount),'Tokens removed.');};
 $('delete-player-button').onclick=()=>{if(!selected||busy)return;if(!confirm(`Permanently delete ${selected.username}? All tokens, purchases, progress, and their leaderboard entry will be removed.`))return;run($('delete-player-button'),uid=>store.deleteAccount(uid),'Account deleted.');};
 $('ban-unit').onchange=()=>{$('ban-duration').disabled=$('ban-unit').value==='forever';};
 $('ban-player-form').onsubmit=event=>{event.preventDefault();if(!selected||busy)return;const unit=$('ban-unit').value,value=$('ban-duration').value;try{TinkleModeration.duration(value,unit);}catch(error){message(error.message);return;}if(!confirm(`Ban ${selected.username} ${unit==='forever'?'permanently':`for ${value}${unit}`}?`))return;run($('ban-player-button'),uid=>store.ban(uid,value,unit,$('ban-reason').value),'Ban saved.');};
 $('unban-player-button').onclick=()=>run($('unban-player-button'),uid=>store.unban(uid),'Ban removed.');
 setInterval(()=>{if(!document.hidden)draw();},1000);
})();
