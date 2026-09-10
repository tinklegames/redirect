const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function page(response){
 const elements=new Map();
 const element=id=>{if(!elements.has(id))elements.set(id,{hidden:false,open:false,value:'',textContent:'',setAttribute(){},addEventListener(){},showModal(){this.open=true;this.opens=(this.opens||0)+1;},close(){this.open=false;}});return elements.get(id);};
 let restore;const user={uid:'saved-user'};
 const context={window:{TINKLE_PLAYER_CONFIG:{firebase:{}}},document:{getElementById:element,createElement:()=>element('player-gate'),body:{append(){}},addEventListener(){}},location:{hostname:'example.com',search:''},sessionStorage:{getItem:()=>null},crypto:{randomUUID:()=> 'test'},Event:class{},setInterval(){},setTimeout,URL,URLSearchParams,Blob,console};
 context.window.dispatchEvent=()=>{};
 context.modules=[{initializeApp:()=>({})},{getAuth:()=>({currentUser:user}),setPersistence:async()=>{},onAuthStateChanged:(_,callback)=>{restore=callback;}},{createBackend:()=>({call:async()=>{if(response instanceof Error)throw response;return response;},watch(){}})}];
 const source=fs.readFileSync('player-account.js','utf8').replace(/const \[appTools,a,spark\]=await Promise\.all\(\[.*?\]\);/,'const [appTools,a,spark]=await Promise.resolve(modules);');
 vm.runInNewContext(source,context);await tick();
 return {gate:element('player-gate'),element,restore:()=>restore(user),account:context.window.TinkleAccount};
}
test('Returning accounts never see the username dialog during restoration or navigation',async()=>{
 for(let i=0;i<3;i++){
  const p=await page({wallet:{username:'Player',revision:1,balance:1000},ban:null});
  assert.equal(p.gate.open,false);await p.restore();await p.account.ready;
  assert.equal(p.gate.opens,undefined);assert.equal(p.account.profile.username,'Player');
 }
});
test('Only a confirmed missing profile opens username registration',async()=>{
 const p=await page({wallet:null,ban:null});assert.equal(p.gate.open,false);
 await p.restore();assert.equal(p.gate.open,true);assert.equal(p.element('player-title').textContent,'Enter username');assert.equal(p.element('player-form').hidden,false);
});
test('Connection failures show retry rather than asking an existing user to register',async()=>{
 const p=await page(new Error('Offline'));await p.restore();
 assert.equal(p.gate.open,true);assert.equal(p.element('player-form').hidden,true);assert.equal(p.element('player-reconnect').hidden,false);
});
test('A restored banned account still opens the ban gate',async()=>{
 const p=await page({wallet:{username:'Player',revision:1},ban:{permanent:true,reason:'Test'}});await p.restore();
 assert.equal(p.gate.open,true);assert.equal(p.element('player-title').textContent,'Account banned');assert.equal(p.element('player-form').hidden,true);
});
test('Enter Code navigation stays on the current origin and directory',()=>{
 const source=fs.readFileSync('codes.html','utf8');
 assert.equal((source.match(/const codeSiteURL = new URL\("index.html", window.location.href\).href;/g)||[]).length,2);
 assert.equal(new URL('index.html','https://example.com/site/codes.html').href,'https://example.com/site/index.html');
});
