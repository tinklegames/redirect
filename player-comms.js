import * as f from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

export function mount(app,auth,a){
 const db=f.getFirestore(app),host=document.createElement('div');document.body.append(host);const ui=host.attachShadow({mode:'open'});
 ui.innerHTML=`<style>
 :host{font:15px/1.5 Inter,system-ui,sans-serif;color:#fff}*{box-sizing:border-box}[hidden]{display:none!important}button{font:inherit;color:white;background:#4f46e5;border:1px solid #ffffff44;border-radius:12px;padding:10px 16px;cursor:pointer}button:disabled{opacity:.6;cursor:default}button:focus-visible{outline:3px solid #22d3ee;outline-offset:2px}.poll{position:fixed;inset:0 0 auto;z-index:2147483100;width:100%;max-height:42dvh;overflow:auto;background:var(--panel,#10172a);border-bottom:1px solid #818cf880;padding:16px clamp(18px,5vw,80px);text-align:center;box-shadow:0 6px 20px #0003}.poll h2{font-size:clamp(24px,3.5vw,48px);line-height:1.15;overflow-wrap:anywhere;margin:8px auto 16px;max-width:1200px}.options{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}.options button{max-width:100%}.status{margin:10px 0 0;font-size:13px}.options button{text-align:left;overflow-wrap:anywhere}.hide{float:right;background:transparent;padding:4px 9px}dialog{position:fixed;inset:0;width:100vw;max-width:100vw;height:100dvh;max-height:100dvh;margin:0;padding:clamp(24px,6vw,90px);border:0;border-radius:0;background:rgba(0,0,0,.84);color:white;text-align:center;opacity:0;transition:opacity .7s ease}dialog[open]{display:flex;align-items:center;justify-content:center}dialog.visible{opacity:1}dialog::backdrop{background:transparent}dialog p{font:800 clamp(40px,7vw,112px)/1.15 Inter,system-ui,sans-serif;letter-spacing:-.035em;margin:0;max-height:100%;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere}small{color:#cbd5e1}@media(prefers-reduced-motion:reduce){dialog{transition:none}}
 </style><section class="poll" hidden aria-label="Live poll"><button class="hide" aria-label="Hide poll">×</button><small>LIVE POLL</small><h2></h2><div class="options"></div><p class="status" role="status"></p></section><dialog aria-label="Private message" closedby="none"><p class="message"></p></dialog>`;
 const pollUI=ui.querySelector('.poll'),dialog=ui.querySelector('dialog'),pollStatus=ui.querySelector('.status');
 let stops=[],voteStop=null,resultsStop=null,totals=null,resultsError=false,epoch=0,poll=null,vote=null,pending=false,inbox=[],message=null,timer=null,messageTimer=null,fadeTimer=null;
 const hiddenPolls=new Set(),seenMessages=new Set();
 const pollKey=id=>'tinkle:poll-hidden:'+auth.currentUser?.uid+':'+id;
 const messageKey=id=>'tinkle:message-seen:'+auth.currentUser?.uid+':'+id;
 const saved=key=>{try{return localStorage.getItem(key)==='1';}catch{return false;}};
 const save=key=>{try{localStorage.setItem(key,'1');}catch{}};
 const errorText=error=>/permission-denied/.test(error.code||'')?'This feature is not available yet. Please try again later.':'Could not connect. Please try again.';
 function renderPoll(){
  clearTimeout(timer);if(!poll||poll.closed||poll.closesAt.toMillis()<=Date.now()||hiddenPolls.has(poll.id)||saved(pollKey(poll.id))){pollUI.hidden=true;return;}pollUI.hidden=false;
  const closed=poll.closed||poll.closesAt.toMillis()<=Date.now();
  ui.querySelector('.poll h2').textContent=poll.question;const choices=ui.querySelector('.options');choices.replaceChildren();
  const total=totals?.reduce((sum,n)=>sum+n,0)||0;
  poll.options.forEach((option,i)=>{const button=document.createElement('button');button.textContent=(vote===i?'✓ ':'')+option+(vote!==null&&totals?` — ${totals[i]} votes (${total?Math.round(totals[i]/total*100):0}%)`:'');button.disabled=closed||pending||vote!==null;button.onclick=()=>castVote(i);choices.append(button);});
  pollStatus.textContent=closed?'Voting closed.':vote!==null?'Your vote has been counted.':'Choose one option.';
  if(vote!==null)pollStatus.textContent += totals?` · ${total} total votes · Live results`:resultsError?' Results unavailable. Try refreshing.':poll.liveResults?' Loading live results…':'';
  if(!closed)timer=setTimeout(renderPoll,Math.min(2147483647,Math.max(1,poll.closesAt.toMillis()-Date.now())));
 }
 function watchResults(){
  if(resultsStop||!poll?.liveResults||vote===null)return;
  const version=epoch,id=poll.id;resultsError=false;
  resultsStop=f.onSnapshot(f.collection(db,'tinklePolls',id,'results'),snapshot=>{
   if(version!==epoch||poll?.id!==id)return;
   totals=poll.options.map(()=>0);snapshot.forEach(doc=>{const i=Number(doc.id);if(Number.isInteger(i)&&i>=0&&i<totals.length)totals[i]=doc.data().count;});renderPoll();
  },()=>{if(version===epoch&&poll?.id===id){resultsError=true;renderPoll();}});
 }
 async function castVote(choice){
  if(!poll||pending||!auth.currentUser)return;
  const version=epoch,id=poll.id,uid=auth.currentUser.uid;pending=true;renderPoll();
  try{const batch=f.writeBatch(db);batch.set(f.doc(db,'tinklePolls',id,'votes',uid),{choice,createdAt:f.serverTimestamp()});if(poll.liveResults)batch.update(f.doc(db,'tinklePolls',id,'results',String(choice)),{count:f.increment(1)});await batch.commit();if(version===epoch&&poll?.id===id){vote=choice;pending=false;watchResults();renderPoll();}}
  catch(error){if(version===epoch&&poll?.id===id){pending=false;renderPoll();pollStatus.textContent=error.code==='permission-denied'?'Voting ended, or this account has already voted.':errorText(error);}}
 }
 ui.querySelector('.hide').onclick=()=>{if(poll){hiddenPolls.add(poll.id);save(pollKey(poll.id));}pollUI.hidden=true;};
 function nextMessage(){
  if(message&&inbox.some(item=>item.id===message.id))return;
  clearTimeout(messageTimer);clearTimeout(fadeTimer);dialog.classList.remove('visible');
  message=inbox.find(item=>!seenMessages.has(messageKey(item.id))&&!saved(messageKey(item.id)))||null;
  if(!message){if(dialog.open)dialog.close();return;}
  const target=message,version=epoch;
  ui.querySelector('.message').textContent=target.text;
  if(!dialog.open)dialog.showModal();
  requestAnimationFrame(()=>requestAnimationFrame(()=>{if(epoch===version&&message?.id===target.id)dialog.classList.add('visible');}));
  messageTimer=setTimeout(()=>{
   if(epoch!==version||message?.id!==target.id)return;
   dialog.classList.remove('visible');
   fadeTimer=setTimeout(()=>{
    if(epoch!==version||message?.id!==target.id)return;
    seenMessages.add(messageKey(target.id));save(messageKey(target.id));
    if(dialog.open)dialog.close();message=null;inbox=inbox.filter(item=>item.id!==target.id);nextMessage();
    f.updateDoc(target.ref,{read:true}).catch(error=>console.warn('Message acknowledgment pending:',error.code));
   },700);
  },10000);
 }
 dialog.addEventListener('cancel',event=>event.preventDefault());
 a.onAuthStateChanged(auth,user=>{
  const version=++epoch;clearTimeout(messageTimer);clearTimeout(fadeTimer);dialog.classList.remove('visible');stops.forEach(stop=>stop());stops=[];voteStop?.();voteStop=null;resultsStop?.();resultsStop=null;totals=null;resultsError=false;clearTimeout(timer);poll=null;vote=null;pending=false;inbox=[];message=null;pollUI.hidden=true;if(dialog.open)dialog.close();
  if(!user)return;
  stops.push(f.onSnapshot(f.doc(db,'tinkleLive','poll'),snapshot=>{
   if(version!==epoch)return;const next=snapshot.exists()?snapshot.data():null;
   if(next?.id!==poll?.id){voteStop?.();voteStop=null;resultsStop?.();resultsStop=null;totals=null;resultsError=false;vote=null;pending=false;
    if(next)voteStop=f.onSnapshot(f.doc(db,'tinklePolls',next.id,'votes',user.uid),snapshot=>{if(version!==epoch||poll?.id!==next.id||snapshot.metadata.hasPendingWrites)return;vote=snapshot.exists()?snapshot.data().choice:null;watchResults();renderPoll();},error=>{pollStatus.textContent=errorText(error);});
   }
   poll=next;renderPoll();
  },()=>{pollUI.hidden=true;}));
  stops.push(f.onSnapshot(f.query(f.collection(db,'tinkleInboxes',user.uid,'messages'),f.where('read','==',false),f.limit(20)),snapshot=>{
   if(version!==epoch||snapshot.metadata.hasPendingWrites)return;
   inbox=snapshot.docs.map(doc=>({id:doc.id,ref:doc.ref,...doc.data()})).sort((a,b)=>(a.createdAt?.toMillis()||0)-(b.createdAt?.toMillis()||0));for(const item of inbox){if(saved(messageKey(item.id)))f.updateDoc(item.ref,{read:true}).catch(()=>{});}
   nextMessage();
  },error=>console.warn('Private inbox unavailable:',error.code)));
 });
}
