const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('launch.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
function launch({embedded=false,blocked=false}={}){
 const elements={games:{},'launch-link':{},'launch-status':{}};
 const calls=[];let click;
 const document={getElementById:id=>elements[id],createElement:()=>({addEventListener:(_,fn)=>click=fn}),body:{prepend(){}},write(html){calls.push(['write',html]);},close(){}};
 const window={document,addEventListener:(_,fn)=>fn(),open(...args){calls.push(args);return blocked?null:{document};}};
 window.self=window;window.top=embedded?{}:window;
 const location={href:'https://tinklegames.github.io/redirect/launch.html?target=https://other.example'};
 vm.runInNewContext(source,{window,document,location,URL});
 return {elements,calls,click};
}
test('Launcher automatically opens a blank window with a fixed same-origin game destination',()=>{
 const {elements,calls}=launch();
 assert.deepEqual(calls[0],['about:blank','_blank']);
 assert.match(calls[1][1],/src="https:\/\/tinklegames.github.io\/redirect\/codes.html"/);
 assert.doesNotMatch(calls[1][1],/other.example/);
 assert.match(calls[1][1],/History Study Guide/);
});
test('Embedding the launcher offers a top-level launch',()=>{
 const {elements,calls}=launch({embedded:true});assert.equal(calls.length,0);
 assert.equal(elements['launch-link'].href,'https://tinklegames.github.io/redirect/launch.html');
 assert.equal(elements['launch-link'].target,'_blank');
});
test('Blocked popups explain how to retry without silently opening the ordinary site',()=>{
 const {elements,calls}=launch({blocked:true});assert.equal(calls.length,1);
 assert.match(elements['launch-status'].textContent,/Allow pop-ups/);
});
