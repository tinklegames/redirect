const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('announcements use fullscreen dialog, fade out, and cannot be dismissed by players',()=>{
 const nodes=[],timers=new Map();let next=0;
 function node(tag){const classes=new Set();const result={tag,children:[],hidden:false,open:false,classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},setAttribute(){},addEventListener(name,fn){this[name]=fn;},showModal(){this.open=true;},close(){this.open=false;},attachShadow(){return node('shadow');}};nodes.push(result);return result;}
 const context={document:{createElement:node,body:node('body')},localStorage:{getItem:()=>null,setItem(){}},setTimeout:(fn,ms)=>{timers.set(++next,{fn,ms});return next;},clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>fn(),Date,URL};vm.createContext(context);vm.runInContext(fs.readFileSync('live-notices.js','utf8'),context);
 const view=context.LiveNotices.mount(),ann={id:'a',text:'Hello players',style:'toast',expiresAt:Date.now()+15000};view.render({liveAnnouncement:ann});
 const dialog=nodes.find(n=>n.tag==='dialog');assert(dialog.open);assert.equal(dialog.className,'announcement-full');assert(dialog.classList.contains('visible'));assert.equal(dialog.children[0].textContent,'Hello players');
 assert.equal(dialog.children.length,1);let prevented=false;dialog.cancel({preventDefault(){prevented=true;}});assert(prevented);assert(dialog.open);assert(dialog.classList.contains('visible'));
 const expiry=[...timers.values()].find(t=>t.ms>700);assert(expiry);expiry.fn();assert(!dialog.classList.contains('visible'));assert(dialog.open);[...timers.values()].find(t=>t.ms===700).fn();assert(!dialog.open);
 view.render({liveAnnouncement:ann});assert(!dialog.open);
 view.render({liveAnnouncement:{...ann,id:'b'}});assert(dialog.open);
});
test('update command refreshes automatically once without a popup or reload loop',async()=>{
 const calls=[];function node(){return {children:[],hidden:true,open:false,classList:{add(){},remove(){}},append(...items){this.children.push(...items);},replaceChildren(){},setAttribute(){},addEventListener(){},attachShadow(){return node();},close(){}};}
 const context={document:{createElement:node,body:node()},localStorage:{getItem:()=>null},setTimeout,clearTimeout,navigator:{},location:{href:'https://example.com/codes.html',replace:url=>calls.push(url)},URL};vm.createContext(context);vm.runInContext(fs.readFileSync('live-notices.js','utf8'),context);
 const view=context.LiveNotices.mount();view.render({updateNotice:{id:'old',source:'admin-button'}});assert.equal(calls.length,0);
 view.render({updateNotice:{id:'new',source:'admin-button'}});await Promise.resolve();assert.equal(calls.length,1);assert.match(calls[0],/site-update=new/);
 view.render({updateNotice:{id:'new',source:'admin-button'}});assert.equal(calls.length,1);
});
