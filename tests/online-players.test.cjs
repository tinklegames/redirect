const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const helper=fs.readFileSync('online-players.js','utf8');
function api(){const window={};vm.runInNewContext(helper,{window,console});return window.TinkleOnlinePlayers;}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('named players are sorted, deduplicated and legacy guests ignored',()=>{
 assert.deepEqual(Array.from(api().names({a:true,b:{username:'Zelda'},c:{username:'alex'},d:{username:'ALEX'},e:{username:'<script>'},f:null})),['alex','Zelda']);
});
test('presence registers cleanup before publishing and restores after reconnect',async()=>{
 let online,change,profile=null;const writes=[],order=[];
 api().track({db:{},ref:(_,p)=>p,push:()=>'/entry',onValue:(_,fn)=>online=fn,onDisconnect:()=>({remove:async()=>order.push('cleanup')}),set:async(_,value)=>{order.push('write');writes.push(value);},getProfile:()=>profile,events:{addEventListener:(_,fn)=>change=fn}});
 await online({val:()=>true});await flush();assert.deepEqual(order,['cleanup','write']);assert.equal(writes[0],true);
 profile={username:'Alex'};change();await flush();assert.equal(writes[1].username,'Alex');change();await flush();assert.equal(writes.length,2);
 await online({val:()=>false});profile={username:'Zelda'};change();await flush();assert.equal(writes.length,2);
 await online({val:()=>true});await flush();assert.equal(writes[2].username,'Zelda');assert.deepEqual(order.slice(-2),['cleanup','write']);
});
test('online click and offline search share account selection; signout unsubscribes',async()=>{
 const elements={};const el=()=>({hidden:false,children:[],setAttribute(k,v){this[k]=v;},replaceChildren(){this.children=[];},append(n){this.children.push(n);}});
 const $=id=>elements[id]||=el();let authChange,presence,stopped=false;const found=[];
 const store={permitted:async()=>true,find:async name=>{found.push(name);return {uid:'verified-uid',username:name,balance:10};}};
 const firestore={collection:()=>({doc:()=>({onSnapshot:()=>()=>{}})})};
 const context={window:{},console,$,document:{createElement:el},firebase:{firestore:()=>firestore,database:()=>({ref:()=>({on:(_,fn)=>presence=fn,off:()=>stopped=true})})},TinkleModeration:{createStore:()=>store,label:()=> 'Not banned'},auth:{onAuthStateChanged:fn=>authChange=fn},serverClockOffset:0,setInterval:()=>{},Date};
 vm.createContext(context);vm.runInContext(helper,context);context.TinkleOnlinePlayers=context.window.TinkleOnlinePlayers;
 vm.runInContext(fs.readFileSync('admin-players.js','utf8'),context);
 await authChange({uid:'admin'});presence({val:()=>({a:{username:'Alex'},b:{username:'Alex'}})});
 assert.equal($('online-players-list').children.length,1);$('online-players-list').children[0].onclick();await flush();
 assert.equal(found[0],'Alex');assert.equal($('moderation-name').textContent,'Alex');assert.equal($('player-controls').hidden,false);
 $('player-search-name').value='OfflineUser';$('player-search-form').onsubmit({preventDefault(){}});await flush();assert.equal(found[1],'OfflineUser');
 await authChange(null);assert.equal(stopped,true);assert.equal($('online-players-list').children.length,0);
});
