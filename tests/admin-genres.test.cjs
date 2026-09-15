const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function setup(responses){let count=0;const context={URLSearchParams,fetch:async()=>({ok:true,json:async()=>responses[count++]})};vm.runInNewContext(fs.readFileSync('admin-genres.js','utf8'),context);return {api:context.AdminGenres,count:()=>count};}
const claim=id=>({mainsnak:{datavalue:{value:{id}}}});
test('Genres and modes map to supported categories without treating single-player as multiplayer',()=>{
 const {api}=setup([]);
 assert.deepEqual(Array.from(api.mapGenres(['action-adventure game','survival horror','single-player video game'])),['action','adventure','horror']);
 assert.deepEqual(Array.from(api.mapGenres(['puzzle video game','co-op mode'])),['multiplayer','puzzle']);
});
test('Exact game match uses structured genres and provides a source',async()=>{
 const {api}=setup([{search:[{id:'Q1',label:'Example (video game)',description:'2020 video game'}]},
 {entities:{Q1:{claims:{P136:[claim('Q2')],P404:[claim('Q3')]}}}},
 {entities:{Q2:{labels:{en:{value:'puzzle video game'}}},Q3:{labels:{en:{value:'multiplayer video game'}}}}}]);
 const result=await api.lookup('Example');assert.equal(result.source,'https://www.wikidata.org/wiki/Q1');assert.deepEqual(Array.from(result.categories),['multiplayer','puzzle']);
});
test('An ambiguous name never automatically picks one of two games',async()=>{
 const {api,count}=setup([{search:[{id:'Q1',label:'Example',description:'2000 video game'},{id:'Q2',label:'Example',description:'2010 video game'}]}]);
 assert.equal(await api.lookup('Example'),null);assert.equal(count(),1);
});
test('Different titles and non-game matches are not used',async()=>{
 const {api}=setup([{search:[{id:'Q1',label:'Example 2',description:'video game'},{id:'Q2',label:'Example',description:'film'}]}]);assert.equal(await api.lookup('Example'),null);
});
