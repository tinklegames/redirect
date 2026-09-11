const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {initializeTestEnvironment,assertFails,assertSucceeds}=require('../functions/node_modules/@firebase/rules-unit-testing');
const f=require('../functions/node_modules/firebase/firestore');
test('poll and inbox rules enforce admin sending, recipient privacy, one vote and closing',async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-tinkle-comms',firestore:{host:'127.0.0.1',port:8185,rules:fs.readFileSync('firestore.accounts.rules','utf8')}});
 try{
  await env.withSecurityRulesDisabled(async context=>{const db=context.firestore();for(const uid of ['alice','bob'])await f.setDoc(f.doc(db,'tinklePlayers',uid),{username:uid});await f.setDoc(f.doc(db,'tinkleAdmins','admin'),{enabled:true});});
  const admin=env.authenticatedContext('admin').firestore(),alice=env.authenticatedContext('alice').firestore(),bob=env.authenticatedContext('bob').firestore();
  const poll={id:'one',question:'Which game?',options:['A','B'],closed:false,closesAt:f.Timestamp.fromMillis(Date.now()+60000)};
  await assertFails(f.setDoc(f.doc(alice,'tinkleLive','poll'),poll));
  await f.setDoc(f.doc(admin,'tinkleLive','poll'),poll);await f.setDoc(f.doc(admin,'tinklePolls','one'),poll);
  const vote=()=>({choice:0,createdAt:f.serverTimestamp()});
  await assertFails(f.setDoc(f.doc(alice,'tinklePolls','one','votes','bob'),vote()));
  await assertFails(f.setDoc(f.doc(alice,'tinklePolls','one','votes','alice'),{...vote(),choice:2}));
  await assertSucceeds(f.setDoc(f.doc(alice,'tinklePolls','one','votes','alice'),vote()));
  await assertFails(f.setDoc(f.doc(alice,'tinklePolls','one','votes','alice'),vote()));
  await assertFails(f.getDocs(f.collection(alice,'tinklePolls','one','votes')));
  assert.equal((await f.getDocs(f.collection(admin,'tinklePolls','one','votes'))).size,1);
  await f.updateDoc(f.doc(admin,'tinklePolls','one'),{closed:true});await assertFails(f.setDoc(f.doc(bob,'tinklePolls','one','votes','bob'),vote()));
  const message=()=>({text:'Hello Alice',by:'admin',createdAt:f.serverTimestamp(),read:false});
  await assertFails(f.setDoc(f.doc(bob,'tinkleInboxes','alice','messages','one'),message()));
  await assertSucceeds(f.setDoc(f.doc(admin,'tinkleInboxes','alice','messages','one'),message()));
  await assertFails(f.getDoc(f.doc(bob,'tinkleInboxes','alice','messages','one')));
  const inbox=f.query(f.collection(alice,'tinkleInboxes','alice','messages'),f.where('read','==',false),f.limit(20));assert.equal((await f.getDocs(inbox)).size,1);
  await assertFails(f.updateDoc(f.doc(alice,'tinkleInboxes','alice','messages','one'),{text:'Changed'}));
  await assertSucceeds(f.updateDoc(f.doc(alice,'tinkleInboxes','alice','messages','one'),{read:true}));assert.equal((await f.getDocs(inbox)).size,0);
 }finally{await env.cleanup();}
});
