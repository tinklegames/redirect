const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('admin-tools.js','utf8');
function editor(cards=[],dirty=false,confirm=true){
 const nodes={};const calls=[];
 const context={cards,editingIndex:null,formDirty:dirty,selectedCode:'GAME',codeDirty:false,codeMap:{GAME:'https://example.com|true'},
 $:id=>nodes[id]??=( {value:'',scrollIntoView(){},focus(){}}),confirm:()=>confirm,
 clearForm(){calls.push('clear');},updatePreview(){},switchTab(tab){calls.push(tab);},notify(){},editCard(index){calls.push(index);}};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('function cardIndexForCode'),source.indexOf('function updateCodeList')),context);
 return {context,nodes,calls};
}
test('Creating a card from a saved code prefills it and marks the draft unsaved',()=>{
 const {context,nodes,calls}=editor();context.cardFromCode('GAME');
 assert.equal(nodes['game-code'].value,'GAME');assert.equal(context.formDirty,true);assert.deepEqual(calls,['clear','games']);
});
test('An existing card is edited rather than duplicated, including case differences',()=>{
 const {context,calls}=editor([{code:'game',name:'Game'}]);context.cardFromCode('GAME');assert.deepEqual(calls,[0]);
});
test('Canceling preserves an unsaved card draft',()=>{
 const {context,calls}=editor([],true,false);context.cardFromCode('GAME');assert.deepEqual(calls,[]);
});
test('Unsaved destination edits disable the card action until the code is saved',()=>{
 const {context,nodes}=editor();context.codeDirty=true;context.syncCodeCardButton();assert.equal(nodes['code-card'].disabled,true);
 context.codeDirty=false;context.syncCodeCardButton();assert.equal(nodes['code-card'].disabled,false);
});
test('Unknown codes cannot create cards',()=>{
 const {context,calls}=editor();context.cardFromCode('MISSING');assert.deepEqual(calls,[]);
});

test('Choosing a saved code for a new card preserves the existing name and cover',()=>{
 const {context,nodes,calls}=editor();
 context.$('game-name').value='My game';context.$('game-image').value='https://example.com/cover.png';
 context.chooseCardCode('GAME');
 assert.equal(nodes['game-code'].value,'GAME');assert.equal(nodes['game-name'].value,'My game');
 assert.equal(nodes['game-image'].value,'https://example.com/cover.png');assert.equal(context.formDirty,true);
 assert.deepEqual(calls,[]);
});
