/* Device-persistent Firebase identity, with a high-entropy recovery secret. */
(() => {
 let currentBan=null,wasBanned=false,deleted=false;
 let state=null,backend,auth,authTools,resolveReady,busy=false,recovering=false,recoveryPending=false,switching=false;
 const ready=new Promise(resolve=>resolveReady=resolve),$=id=>document.getElementById(id);
 function accountDeleted(){
  deleted=true;state=null;currentBan=null;wasBanned=false;recoveryPending=false;recovering=false;switching=false;
  $('player-save-code').hidden=true;$('player-form').hidden=false;$('player-mode').hidden=true;$('player-cancel-restore').hidden=true;
  setMode();status('Your account was deleted. Enter a username to start again.');showGate();changed();
 }
 function isBanned(){return !!currentBan&&(currentBan.permanent||currentBan.startedAt.toMillis()+currentBan.durationSeconds*1000>Date.now());}
 function applyBan(ban){
  currentBan=ban;
  if(isBanned()){
   wasBanned=true;showGate();$('player-title').textContent='Account banned';
   for(const id of ['player-form','player-save-code','player-mode','player-cancel-restore','player-reconnect'])$(id).hidden=true;
   status((ban.permanent?'This account is permanently banned.':'Banned until '+new Date(ban.startedAt.toMillis()+ban.durationSeconds*1000).toLocaleString()+'.')+(ban.reason?' '+ban.reason:''));
  }else if(wasBanned){wasBanned=false;$('player-form').hidden=false;$('player-mode').hidden=false;setMode();if(state)finish();}
 }
 function changed(){window.dispatchEvent(new Event('tinkle-wallet-change'));window.dispatchEvent(new Event('tinkle-player-change'));}
 function status(message){$('player-status').textContent=message;}
 function connectionError(error){
  showGate();$('player-title').textContent='Could not connect';
  $('player-form').hidden=true;$('player-mode').hidden=true;
  status(errorMessage(error));$('player-reconnect').hidden=false;
 }
 function errorMessage(error){
  const code=error.code||'';
  if(/permission-denied/.test(code))return 'Could not save. Check your connection and device clock, then try again.';
  if(/resource-exhausted/.test(code))return 'The site has reached its free daily limit. Try again later.';
  if(/invalid-credential|wrong-password|user-not-found/.test(code))return 'Recovery code not found.';
  if(/network|unavailable/.test(code))return 'Could not connect. Check your connection and try again.';
  if(/operation-not-allowed|internal/.test(code))return 'Player accounts are not available yet. Please try again later.';
  return error.message||'Something went wrong. Please try again.';
 }
 function accept(response){
  if(response.wallet&&(!state||response.wallet.revision>=state.revision))state=response.wallet;
  changed();return response.result;
 }
 async function call(action,payload={},requestId=crypto.randomUUID()){
  if(!backend||(!auth?.currentUser&&action!=='recover'))throw Error('Connect your account first.');
  if(isBanned()&&!['load','recover'].includes(action))throw Error('This account is banned.');
  const callerUid=auth?.currentUser?.uid;
  let response;
  try{response=await backend.call(action,payload,requestId);}catch(error){throw Error(errorMessage(error));}
  if(deleted&&!['load','recover','register'].includes(action))throw Error('Your account was deleted.');
  if(!['recover','register'].includes(action)&&auth.currentUser?.uid!==callerUid)throw Error('Your account changed. Please try again.');
  return response;
 }
 async function mutate(action,payload){await ready;return accept(await call(action,payload));}
 function showGate(){const dialog=$('player-gate');if(!dialog.open)dialog.showModal();}
 function finish(){if(isBanned()){applyBan(currentBan);return;}switching=false;recoveryPending=false;$('player-gate').close();resolveReady();changed();}
 async function load(){
  const response=await call('load');
  if(response.deleted){accountDeleted();return;}
  if(!response.wallet||!state||response.wallet.username!==state.username||response.wallet.revision>=state.revision)state=response.wallet;
  applyBan(response.ban);
  if(isBanned())return;
  if(state&&!recoveryPending)finish();
  else if(!state){$('player-form').hidden=false;$('player-mode').hidden=false;$('player-reconnect').hidden=true;setMode();showGate();}
 }
 window.TinkleAccount=Object.freeze({ready,get profile(){return state?{username:state.username,balance:state.balance,owned:state.owned,equipped:state.equipped}:null;},get wallet(){return state;},now:()=>Date.now(),mutate,
  leaderboard:async()=>{await ready;return (await call('leaderboard')).players;},
  showRecovery:()=>{if(isBanned())return;recovering=true;switching=true;$('player-cancel-restore').hidden=false;$('player-form').hidden=false;$('player-save-code').hidden=true;$('player-mode').hidden=true;showGate();setMode();},
  refresh:async()=>{if(auth?.currentUser&&state&&!busy&&!switching)await load();}
 });
 function setMode(){
  $('player-username-field').hidden=recovering;$('player-username').required=!recovering;
  $('player-recovery-field').hidden=!recovering;$('player-recovery').required=recovering;
  $('player-title').textContent=recovering?'Recovery code':'Enter username';
  $('player-submit').textContent='Continue';
  $('player-mode').textContent=recovering?'Use username':'Use recovery code';status('');
 }
 function mount(){
  const dialog=document.createElement('dialog');dialog.id='player-gate';dialog.className='player-dialog player-login';dialog.setAttribute('aria-labelledby','player-title');
  dialog.innerHTML=`<h1 id="player-title">Enter username</h1><form id="player-form"><div id="player-username-field"><input id="player-username" aria-label="Username" placeholder="Username" minlength="3" maxlength="20" pattern="[A-Za-z0-9_]{3,20}" title="3–20 letters, numbers or underscores" autocomplete="nickname" required></div><div id="player-recovery-field" hidden><textarea id="player-recovery" aria-label="Recovery code" placeholder="Recovery code" autocomplete="off" spellcheck="false" rows="3" maxlength="120"></textarea></div><button id="player-submit" type="submit" disabled>Continue</button></form><section id="player-save-code" hidden><p>Save this private code to recover your account.</p><code id="player-new-code"></code><div class="player-actions"><button id="player-download-code" type="button">Save code</button><button id="player-finish" type="button">Continue</button></div></section><p id="player-status" role="status">Connecting…</p><button id="player-mode" class="player-quiet" type="button">Use recovery code</button><button id="player-cancel-restore" class="player-quiet" type="button" hidden>Back</button><button id="player-reconnect" class="player-quiet" type="button" hidden>Try again</button>`;
  document.body.append(dialog);dialog.addEventListener('cancel',event=>event.preventDefault());
  $('player-mode').onclick=()=>{recovering=!recovering;setMode();};
  $('player-reconnect').onclick=()=>location.reload();
  $('player-cancel-restore').onclick=()=>{if(state){$('player-cancel-restore').hidden=true;finish();}};
  $('player-finish').onclick=()=>{$('player-new-code').textContent='';finish();};
  $('player-download-code').onclick=()=>{const url=URL.createObjectURL(new Blob([`Tinkle account: ${state.username}\nRecovery code: ${$('player-new-code').textContent}\nKeep this private. Anyone with this code can access your account.\n`],{type:'text/plain'}));const link=document.createElement('a');link.href=url;link.download='tinkle-recovery-code.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  $('player-form').onsubmit=async event=>{
   event.preventDefault();if(busy)return;busy=true;$('player-submit').disabled=true;status('Saving…');
   try{
    if(recovering){const response=await call('recover',{code:$('player-recovery').value.trim()});state=null;accept(response);$('player-recovery').value='';await load();}
    else{
     const recovery=Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');
     const response=await call('register',{username:$('player-username').value.trim(),recovery});
     deleted=false;recoveryPending=true;accept(response);$('player-form').hidden=true;$('player-mode').hidden=true;$('player-save-code').hidden=false;
     $('player-title').textContent='Recovery code';$('player-new-code').textContent=response.recoveryCode;status('');
    }
   }catch(error){status(errorMessage(error));}
   finally{busy=false;$('player-submit').disabled=false;}
  };
 }
 async function init(){
  mount();
  try{
   const [appTools,a,spark]=await Promise.all([import('https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js'),import('./spark-account.js?v=20260910-wheel24')]);
   const useEmulators=['localhost','127.0.0.1'].includes(location.hostname)&&(new URLSearchParams(location.search).get('emulator')==='1'||sessionStorage.getItem('tinkle.emulator')==='1');
   if(useEmulators)sessionStorage.setItem('tinkle.emulator','1');
   const config=useEmulators?{...window.TINKLE_PLAYER_CONFIG.firebase,projectId:'demo-tinkle',apiKey:'demo-api-key',authDomain:'demo-tinkle.firebaseapp.com'}:window.TINKLE_PLAYER_CONFIG.firebase;
   authTools=a;const app=appTools.initializeApp(config,'tinkle-player');auth=a.getAuth(app);backend=spark.createBackend(app,a,auth,useEmulators,wallet=>{if(!deleted&&state&&wallet.revision>=state.revision){state=wallet;changed();}},ban=>{if(!deleted)applyBan(ban);},accountDeleted);
   if(useEmulators){a.connectAuthEmulator(auth,'http://127.0.0.1:9099');}
   await a.setPersistence(auth,a.browserLocalPersistence);
   import('./player-comms.js?v=20260911').then(module=>module.mount(app,auth,a)).catch(error=>console.warn('Messages and polls unavailable:',error));
   a.onAuthStateChanged(auth,async user=>{
    if(busy)return;
    if(!user){try{await a.signInAnonymously(auth);}catch(error){connectionError(error);}return;}
    try{await load();backend.watch();}catch(error){connectionError(error);}
    $('player-submit').disabled=false;
   });
  }catch(error){connectionError(error);}
 }
 setInterval(()=>{if(wasBanned&&!isBanned())load().catch(()=>{});},1000);
 init();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state)window.TinkleAccount.refresh().catch(()=>{});});
})();
