/* Admin-only operations. Firestore rules, not the admin page, grant permission. */
(() => {
 const units={s:1,m:60,h:3600,d:86400};
 function duration(value,unit){if(unit==='forever')return 0;const n=Number(value),seconds=n*units[unit];if(!Number.isSafeInteger(n)||n<1||!Number.isSafeInteger(seconds)||seconds>3153600000)throw Error('Choose a positive duration, up to 100 years.');return seconds;}
 function active(ban,now=Date.now()){return !!ban&&(ban.permanent||ban.startedAt.toMillis()+ban.durationSeconds*1000>now);}
 function label(ban,now=Date.now()){if(!active(ban,now))return 'Not banned';return ban.permanent?'Banned permanently':`Banned until ${new Date(ban.startedAt.toMillis()+ban.durationSeconds*1000).toLocaleString()}`;}
 function createStore(db,serverTimestamp,getUser){
  const admin=()=>{const user=getUser();if(!user)throw Error('Sign in first.');return user.uid;};
  const audit=id=>db.collection('tinkleModerationLogs').doc(id);
  return {
   async deleteAccount(uid,id=crypto.randomUUID()){
    const by=admin(),player=db.collection('tinklePlayers').doc(uid),log=audit(id);
    await db.runTransaction(async tx=>{
     const [done,snapshot]=await Promise.all([tx.get(log),tx.get(player)]);if(done.exists)return;
     if(!snapshot.exists)throw Error('Player not found.');
     tx.set(db.collection('tinkleDeleted').doc(uid),{by,at:serverTimestamp()});
     tx.delete(player);tx.delete(db.collection('tinkleLeaderboard').doc(uid));
     tx.delete(db.collection('tinkleUsernames').doc(snapshot.data().usernameKey));tx.delete(db.collection('tinkleBans').doc(uid));
     tx.set(log,{action:'delete',target:uid,by,at:serverTimestamp()});
    });
    // Subcollections are not automatically deleted with a Firestore document.
    while(true){const receipts=await player.collection('requests').limit(400).get();if(receipts.empty)break;const batch=db.batch();receipts.docs.forEach(doc=>batch.delete(doc.ref));await batch.commit();}
   },
   async permitted(){return (await db.collection('tinkleAdmins').doc(admin()).get()).data()?.enabled===true;},
   async find(username){const key=String(username).trim().toLowerCase();if(!/^[a-z0-9_]{3,20}$/.test(key))throw Error('Enter a username.');const claim=await db.collection('tinkleUsernames').doc(key).get();if(!claim.exists)throw Error('Player not found.');const uid=claim.data().uid;const player=await db.collection('tinklePlayers').doc(uid).get();if(!player.exists)throw Error('Player not found.');return {uid,...player.data()};},
   removeTokens(uid,amount,id=crypto.randomUUID()){
    const by=admin(),player=db.collection('tinklePlayers').doc(uid),score=db.collection('tinkleLeaderboard').doc(uid),log=audit(id);
    if(!Number.isSafeInteger(amount)||amount<1)throw Error('Enter a positive whole-token amount.');
    return db.runTransaction(async tx=>{const [done,snapshot]=await Promise.all([tx.get(log),tx.get(player)]);if(done.exists)return done.data();if(!snapshot.exists)throw Error('Player not found.');const current=snapshot.data();if(amount>current.balance)throw Error(`This player only has ${current.balance.toLocaleString()} tokens.`);const balance=current.balance-amount;
     tx.update(player,{balance,revision:current.revision+1,updatedAt:serverTimestamp(),operation:{id,type:'admin-remove',by,amount}});
     tx.set(score,{username:current.username,balance,equipped:current.equipped});
     const result={action:'remove-tokens',target:uid,by,amount,balance,at:serverTimestamp()};tx.set(log,result);return result;
    });
   },
   ban(uid,value,unit,reason='',id=crypto.randomUUID()){
    const by=admin(),seconds=duration(value,unit),target=db.collection('tinkleBans').doc(uid),player=db.collection('tinklePlayers').doc(uid),log=audit(id);
    return db.runTransaction(async tx=>{const [done,snapshot]=await Promise.all([tx.get(log),tx.get(player)]);if(done.exists)return;if(!snapshot.exists)throw Error('Player not found.');tx.set(target,{permanent:unit==='forever',durationSeconds:seconds,startedAt:serverTimestamp(),reason:String(reason).trim().slice(0,200),by});tx.set(log,{action:'ban',target:uid,by,at:serverTimestamp()});});
   },
   unban(uid,id=crypto.randomUUID()){
    const by=admin(),target=db.collection('tinkleBans').doc(uid),log=audit(id);
    return db.runTransaction(async tx=>{if((await tx.get(log)).exists)return;tx.delete(target);tx.set(log,{action:'unban',target:uid,by,at:serverTimestamp()});});
   }
  };
 }
 window.TinkleModeration=Object.freeze({duration,active,label,createStore});
})();
