const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={};vm.runInNewContext(fs.readFileSync('admin-update-log.js','utf8'),context);const editor=context.UpdateLogEditor;
const original=fs.readFileSync('codes.html','utf8');
const data={title:'Update Log',release:'New update',items:'One\nTwo',comingTitle:'Coming Soon',coming:'More games',footer:'Version 3'};
test('Editing the actual page preserves all bytes outside the update log',()=>{
 const r=editor.region(original),next=editor.replace(original,data),after=editor.region(next);
 assert.equal(next.slice(0,after.start),original.slice(0,r.start));assert.equal(next.slice(after.end),original.slice(r.end));assert.match(after.html,/<li>Two<\/li>/);
});
test('Subsequent saves replace the same marked region without duplicated markers',()=>{
 const next=editor.replace(editor.replace(original,data),{...data,release:'Another update'});
 assert.equal(next.split('<!-- ADMIN UPDATE LOG START -->').length,2);assert.match(editor.region(next).html,/Another update/);
});
test('Text is escaped in both preview and saved markup',()=>{
 const html=editor.markup({...data,items:'<script>alert(1)</script> & test'});assert(!html.includes('<script>'));assert.match(html,/&lt;script&gt;/);assert.match(html,/&amp; test/);
});
test('Unrecognized files are rejected without rewriting them',()=>{assert.throws(()=>editor.replace('<html>Hello</html>',data),/does not contain/);});
