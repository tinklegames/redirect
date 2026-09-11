const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(storage=new Map()){
 const nodes=new Map(),listeners=new Map(),timers=[],writes=[];let authCallback;
 function node(){return {children:[],hidden:false,open:false,textContent:'',classList:{add(){},remove(){}},append(...n){this.children.push(...n);},replaceChildren(...n){this.children=n;},showModal(){this.open=true;},close(){this.open=false;},addEventListener(n,fn){this[n]=fn;},attachShadow(){return this;},querySelector(s){if(!nodes.has(s))nodes.set(s,node());return nodes.get(s);}};}
 const host=node();const db={};const f={getFirestore:()=>db,doc:(_, ...parts)=>parts.join('/'),collection:(_, ...parts)=>parts.join('/'),where:()=>{},limit:()=>{},query:r=>r,onSnapshot:(r,fn)=>{listeners.set(r,fn);return ()=>listeners.delete(r);},updateDoc:async(r,data)=>writes.push([r,data])};
 const context={f,document:{body:node(),createElement:()=>host},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},setTimeout:(fn,ms)=>{const t={fn,ms};timers.push(t);return t;},clearTimeout:t=>{if(t)t.cancelled=true;},requestAnimationFrame:fn=>fn(),console,Date};vm.createContext(context);vm.runInContext(fs.readFileSync('player-comms.js','utf8').replace(/^import .*;\n/,'').replace('export function','function'),context);
 context.mount({}, {currentUser:{uid:'alice'}},{onAuthStateChanged:(_,fn)=>authCallback=fn});authCallback({uid:'alice'});
 return {nodes,listeners,timers,writes,storage};
}
const snap=data=>({exists:()=>!!data,data:()=>data,metadata:{hasPendingWrites:false}});
test('closed polls hide and manually hidden polls remain hidden after a reload',()=>{
 const s=setup(),poll={id:'p',question:'Pick one',options:['A','B'],closed:false,closesAt:{toMillis:()=>Date.now()+60000}};
 s.listeners.get('tinkleLive/poll')(snap(poll));assert.equal(s.nodes.get('.poll').hidden,false);
 s.nodes.get('.hide').onclick();assert.equal(s.nodes.get('.poll').hidden,true);
 const reload=setup(s.storage);reload.listeners.get('tinkleLive/poll')(snap(poll));assert.equal(reload.nodes.get('.poll').hidden,true);
 reload.listeners.get('tinkleLive/poll')(snap({...poll,id:'new',closed:true}));assert.equal(reload.nodes.get('.poll').hidden,true);
});
test('private message displays only text, blocks Escape and auto-acknowledges after fade',async()=>{
 const s=setup(),doc={id:'m',ref:'inbox/m',data:()=>({text:'Hello',createdAt:{toMillis:()=>1}})};
 s.listeners.get('tinkleInboxes/alice/messages')({docs:[doc],metadata:{hasPendingWrites:false}});
 assert.equal(s.nodes.get('.message').textContent,'Hello');assert.equal(s.nodes.get('dialog').open,true);
 let prevented=false;s.nodes.get('dialog').cancel({preventDefault(){prevented=true;}});assert(prevented);
 s.timers.find(t=>t.ms===10000).fn();assert.equal(s.nodes.get('dialog').open,true);
 s.timers.find(t=>t.ms===700).fn();assert.equal(s.nodes.get('dialog').open,false);assert.equal(s.writes.length,1);
 const markup=fs.readFileSync('player-comms.js','utf8');assert(!markup.includes('Got it'));assert(!markup.includes('Only your account'));
});
