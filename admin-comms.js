(() => {
 const db=firebase.firestore(),current=db.doc('tinkleLive/poll');
 let active=null,stop=null,stopVotes=null,epoch=0;
 const status=text=>$('poll-status').textContent=text;
 auth.onAuthStateChanged(user=>{
  const version=++epoch;stop?.();stopVotes?.();active=null;$('poll-results').replaceChildren();
  if(!user||user.isAnonymous)return;
  stop=current.onSnapshot(snapshot=>{
   if(version!==epoch)return;stopVotes?.();stopVotes=null;active=snapshot.exists?snapshot.data():null;
   $('poll-results').replaceChildren();if(!active){status('No poll has been published.');return;}
   const id=active.id;
   stopVotes=db.collection('tinklePolls').doc(id).collection('votes').onSnapshot(votes=>{
    if(active?.id!==id||version!==epoch)return;
    const totals=active.options.map(()=>0);votes.forEach(v=>{const choice=v.data().choice;if(Number.isInteger(choice)&&choice>=0&&choice<totals.length)totals[choice]++;});
    const heading=document.createElement('h3');heading.textContent=active.question;$('poll-results').replaceChildren(heading);
    active.options.forEach((option,i)=>{const row=document.createElement('p');row.textContent=`${option}: ${totals[i]} vote${totals[i]===1?'':'s'}`;$('poll-results').append(row);});
    status((active.closed||active.closesAt.toMillis()<=Date.now()+serverClockOffset?'Voting closed':'Voting open')+` · ${votes.size} votes`);
   },()=>status('Could not load results. Check Firestore admin access and rules.'));
  },()=>status('Polls need the updated Firestore rules.'));
 });
 $('poll-form').onsubmit=event=>{event.preventDefault();action($('poll-publish'),async()=>{
  requireAdmin();const question=$('poll-question').value.trim(),options=$('poll-options').value.split('\n').map(s=>s.trim()).filter(Boolean),minutes=Number($('poll-minutes').value);
  if(!question||options.length<2||options.length>6||options.some(s=>s.length>80)||new Set(options.map(s=>s.toLowerCase())).size!==options.length)throw Error('Enter a question and 2–6 different options, each up to 80 characters.');
  if(!Number.isInteger(minutes)||minutes<1||minutes>1440)throw Error('Choose 1–1440 minutes.');
  const poll={id:crypto.randomUUID(),question,options,liveResults:true,closed:false,createdAt:firebase.firestore.FieldValue.serverTimestamp(),closesAt:firebase.firestore.Timestamp.fromMillis(Date.now()+serverClockOffset+minutes*60000)};
  const batch=db.batch();batch.set(db.doc('tinklePolls/'+poll.id),poll);batch.set(current,poll);options.forEach((_,i)=>batch.set(db.doc('tinklePolls/'+poll.id+'/results/'+i),{count:0}));await batch.commit();status('Poll published.');
 });};
 $('poll-close').onclick=()=>action($('poll-close'),async()=>{
  requireAdmin();const id=active?.id;if(!id)return;
  await db.runTransaction(async tx=>{const snapshot=await tx.get(current);if(snapshot.data()?.id!==id)throw Error('The poll changed. Try again.');tx.update(current,{closed:true});tx.update(db.doc('tinklePolls/'+id),{closed:true});});
  status('Voting closed.');
 });
})();
