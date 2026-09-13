const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('launch.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
function launch({embedded=false,blocked=false}={}){
 const elements={games:{},'launch-link':{},'launch-status':{}};
 const calls=[];
 const document={getElementById:id=>elements[id],open(){},write(html){calls.push(['write',html]);},close(){}};
 const window={document,open(...args){calls.push(args);return blocked?null:window;}};
 window.self=window;window.top=embedded?{}:window;
 const location={href:'https://tinklegames.github.io/redirect/launch.html?target=https://other.example',replace:url=>calls.push(['replace',url])};
 vm.runInNewContext(source,{window,document,location,URL});
 return {elements,calls};
}
test('Launcher creates a blank wrapper from the game site and uses a fixed same-origin destination',()=>{
 const {elements,calls}=launch();
 assert.deepEqual(calls[0],['about:blank','_self']);
 assert.equal(elements.games.src,'https://tinklegames.github.io/redirect/codes.html');
 assert.match(calls[1][1],/History Study Guide/);
});
test('Embedding the launcher requires a top-level launch instead of another partitioned wrapper',()=>{
 const {elements,calls}=launch({embedded:true});
 assert.equal(calls.length,0);
 assert.equal(elements['launch-link'].href,'https://tinklegames.github.io/redirect/launch.html');
 assert.equal(elements['launch-link'].target,'_blank');
 assert.equal(elements['launch-link'].rel,'noopener');
});
test('A failed blank launch falls back to the game site',()=>{
 const {calls}=launch({blocked:true});
 assert.deepEqual(calls[1],['replace','https://tinklegames.github.io/redirect/codes.html']);
});
