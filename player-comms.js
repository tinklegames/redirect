import * as f from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

export function mount(app,auth,a){
 const db=f.getFirestore(app),host=document.createElement('div');document.body.append(host);const ui=host.attachShadow({mode:'open'});
 ui.innerHTML=`<style>
 :host{font:15px/1.5 Inter,system-ui,sans-serif;color:#fff}*{box-sizing:border-box}[hidden]{display:none!important}button{font:inherit;color:white;background:#4f46e5;border:1px solid #ffffff44;border-radius:12px;padding:10px 16px;cursor:pointer}button:disabled{opacity:.6;cursor:default}button:focus-visible{outline:3px solid #22d3ee;outline-offset:2px}.poll{position:fixed;right:18px;bottom:18px;z-index:2147483100;width:min(380px,calc(100vw - 36px));max-height:75dvh;overflow:auto;background:#10172af5;border:1px solid #818cf880;border-radius:20px;padding:20px;box-shadow:0 20px 65px #0008}.poll h2{font-size:20px;overflow-wrap:anywhere}.options{display:grid;gap:8px}.options button{text-align:left;overflow-wrap:anywhere}.hide{float:right;background:transparent;padding:4px 9px}dialog{color:white;background:#080d20f5;border:1px solid #818cf880;border-radius:24px;padding:32px;width:min(600px,calc(100vw - 32px));max-height:85dvh;overflow:auto}dialog::backdrop{background:#020617b8;backdrop-filter:blur(5px)}dialog p{white-space:pre-wrap;overflow-wrap:anywhere;font-size:clamp(20px,3vw,32px)}small{color:#cbd5e1}
 </style><section class="poll" hidden aria-label="Live poll"><button class="hide" aria-label="Hide poll">×</button><small>LIVE POLL</small><h2></h2><div class="options"></div><p class="status" role="status"></p></section><dialog aria-label="Private message from admin"><h2>Message from admin</h2><p class="message"></p><small class="message-status" role="status"></small><br><button class="read">Got it</button></dialog>`;
 const pollUI=ui.querySelector('.poll'),dialog=ui.querySelector('dialog'),pollStatus=ui.querySelector('.status'),read=ui.querySelector('.read');
 let stops=[],voteStop=null,epoch=0,poll=null,vote=null,pending=false,inbox=[],message=null,timer=null;
 const hiddenPolls=new Set();
 const errorText=error=>/permission-denied/.test(error.code||'')?'This feature is not available yet. Please try again later.':'Could not connect. Please try again.';
 function renderPoll(){
  clearTimeout(timer);if(!poll||hiddenPolls.has(poll.id)){pollUI.hidden=true;return;}pollUI.hidden=false;
  const closed=poll.closed||poll.closesAt.toMillis()<=Date.now();
  ui.querySelector('.poll h2').textContent=poll.question;const choices=ui.querySelector('.options');choices.replaceChildren();
  poll.options.forEach((option,i)=>{const button=document.createElement('button');button.textContent=(vote===i?'✓ ':'')+option;button.disabled=closed||pending||vote!==null;button.onclick=()=>castVote(i);choices.append(button);});
  pollStatus.textContent=closed?'Voting closed.':vote!==null?'Your vote has been counted.':'Choose one option.';
  if(!closed)timer=setTimeout(renderPoll,Math.min(2147483647,Math.max(1,poll.closesAt.toMillis()-Date.now())));
 }
 async function castVote(choice){
  if(!poll||pending||!auth.currentUser)return;
  const version=epoch,id=poll.id,uid=auth.currentUser.uid;pending=true;renderPoll();
  try{await f.setDoc(f.doc(db,'tinklePolls',id,'votes',uid),{choice,createdAt:f.serverTimestamp()});if(version===epoch&&poll?.id===id){vote=choice;pending=false;renderPoll();}}
  catch(error){if(version===epoch&&poll?.id===id){pending=false;renderPoll();pollStatus.textContent=error.code==='permission-denied'?'Voting ended, or this account has already voted.':errorText(error);}}
 }
 ui.querySelector('.hide').onclick=()=>{if(poll)hiddenPolls.add(poll.id);pollUI.hidden=true;};
 function nextMessage(){
  if(message&&inbox.some(item=>item.id===message.id))return;
  message=inbox[0]||null;
  if(!message){if(dialog.open)dialog.close();return;}
  ui.querySelector('.message').textContent=message.text;ui.querySelector('.message-status').textContent='Only your account can read this message.';
  read.disabled=false;if(!dialog.open)dialog.showModal();
 }
 async function acknowledge(){
  if(!message||read.disabled)return;const version=epoch,target=message;read.disabled=true;
  try{await f.updateDoc(target.ref,{read:true});}
  catch(error){if(version===epoch){ui.querySelector('.message-status').textContent=errorText(error);read.disabled=false;}}
 }
 read.onclick=acknowledge;dialog.addEventListener('cancel',event=>{event.preventDefault();acknowledge();});
 a.onAuthStateChanged(auth,user=>{
  const version=++epoch;stops.forEach(stop=>stop());stops=[];voteStop?.();voteStop=null;clearTimeout(timer);poll=null;vote=null;pending=false;inbox=[];message=null;pollUI.hidden=true;if(dialog.open)dialog.close();
  if(!user)return;
  stops.push(f.onSnapshot(f.doc(db,'tinkleLive','poll'),snapshot=>{
   if(version!==epoch)return;const next=snapshot.exists()?snapshot.data():null;
   if(next?.id!==poll?.id){voteStop?.();voteStop=null;vote=null;pending=false;
    if(next)voteStop=f.onSnapshot(f.doc(db,'tinklePolls',next.id,'votes',user.uid),snapshot=>{if(version!==epoch||poll?.id!==next.id)return;vote=snapshot.exists()?snapshot.data().choice:null;renderPoll();},error=>{pollStatus.textContent=errorText(error);});
   }
   poll=next;renderPoll();
  },()=>{pollUI.hidden=true;}));
  stops.push(f.onSnapshot(f.query(f.collection(db,'tinkleInboxes',user.uid,'messages'),f.where('read','==',false),f.limit(20)),snapshot=>{
   if(version!==epoch||snapshot.metadata.hasPendingWrites)return;
   inbox=snapshot.docs.map(doc=>({id:doc.id,ref:doc.ref,...doc.data()})).sort((a,b)=>(a.createdAt?.toMillis()||0)-(b.createdAt?.toMillis()||0));nextMessage();
  },error=>console.warn('Private inbox unavailable:',error.code)));
 });
}
