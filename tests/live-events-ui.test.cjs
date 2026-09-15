const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(){
 const nodes=[],timers=new Map();let time=100000,id=0,tick;
 function node(tag){const classes=new Set();const n={tag,style:{},children:[],open:false,classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)},append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;},setAttribute(){},addEventListener(name,fn){this[name]=fn;},showModal(){this.open=true;},close(){this.open=false;},attachShadow(){return node('shadow');},remove(){}};nodes.push(n);return n;}
 const context={document:{createElement:node,createTextNode:text=>({textContent:text}),body:node('body'),addEventListener(){},removeEventListener(){}},navigator:{clipboard:{writeText:async()=>{}}},Audio:class{play(){return Promise.resolve();}pause(){}removeAttribute(){}load(){}addEventListener(){}},setTimeout:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),setInterval:fn=>{tick=fn;},clearInterval(){},requestAnimationFrame:fn=>fn()};
 vm.createContext(context);for(const file of ['event-core.js','live-events.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
 return {view:context.LiveEvents.mount({recruit:async()=>{},now:()=>time}),nodes,timers,advance(value){time=value;tick();}};
}
test('Mystery countdown and reveal share a fullscreen modal that expires and fades',()=>{
 const {view,nodes,timers,advance}=setup();view.render({id:'a',type:'mystery',startedAt:100000,countdown:2,duration:10,game:{name:'Test',code:'TEST'}});
 const dialog=nodes.find(n=>n.tag==='dialog');assert(dialog.open);assert.equal(dialog.className,'takeover');
 let blocked=false;dialog.cancel({preventDefault(){blocked=true;}});assert(blocked);
 advance(102500);assert(nodes.some(n=>n.textContent==='Test'));assert(nodes.some(n=>n.textContent==='Copy code'));
 assert(!nodes.some(n=>n.textContent==='×'));advance(113000);assert(dialog.open);[...timers.values()].find(t=>t.ms===700).fn();assert(!dialog.open);
});
test('Crab takeover keeps recruiting and music controls and closes after admin stop',()=>{
 const {view,nodes,timers}=setup();view.render({id:'b',type:'crabs',startedAt:100000,countdown:0,duration:60,crabs:2});
 assert(nodes.find(n=>n.tag==='dialog').open);assert(nodes.some(n=>n.textContent==='🦀 Recruit a crab'));assert(nodes.some(n=>n.textContent==='Enable music'));
 assert(nodes.some(n=>n.textContent==='2 crabs recruited'));view.render(null);[...timers.values()].find(t=>t.ms===700).fn();assert(!nodes.find(n=>n.tag==='dialog').open);
});
