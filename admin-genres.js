// Public Wikidata lookups; no key, backend, or card writes during a search.
(function(root){
 const normalize=value=>value.toLowerCase().replace(/\s*\((?:\d{4} )?(?:video |computer )?game\)\s*$/,'').replace(/[^\p{L}\p{N}]/gu,'');
 function mapGenres(labels){
  const text=labels.join(' ').toLowerCase(),result=[];
  for(const [category,pattern] of Object.entries({action:/action|shooter|shoot.?em.?up|fighting|beat.?em.?up|platform/,adventure:/adventure/,arcade:/arcade|rhythm|endless runner|racing/,horror:/horror/,multiplayer:/multiplayer|multi-player|co-op|cooperative/,puzzle:/puzzle/,simulator:/simulation|simulator/}))if(pattern.test(text))result.push(category);
  return result;
 }
 async function lookup(name,signal){
  async function request(params){
   const url='https://www.wikidata.org/w/api.php?'+new URLSearchParams({format:'json',origin:'*',...params});
   const response=await fetch(url,{signal,credentials:'omit'});
   if(!response.ok)throw Error('Search unavailable');const data=await response.json();if(data.error)throw Error('Search unavailable');return data;
  }
  const data=await request({action:'wbsearchentities',search:name,language:'en',uselang:'en',type:'item',limit:'10'});
  const matches=(data.search||[]).filter(item=>normalize(item.label||'')===normalize(name)&&/video game|computer game|browser game|online game|arcade game/i.test(item.description||''));
  if(matches.length!==1)return null;
  const match=matches[0];if(!/^Q\d+$/.test(match.id))return null;
  const details=await request({action:'wbgetentities',ids:match.id,props:'claims'});
  const claims=details.entities?.[match.id]?.claims||{};
  const ids=[...new Set(['P136','P404'].flatMap(key=>(claims[key]||[]).filter(claim=>claim.rank!=='deprecated').map(claim=>claim.mainsnak?.datavalue?.value?.id).filter(id=>/^Q\d+$/.test(id))))];
  if(!ids.length)return null;
  const labels=await request({action:'wbgetentities',ids:ids.join('|'),props:'labels',languages:'en'});
  const genres=ids.map(id=>labels.entities?.[id]?.labels?.en?.value).filter(Boolean);
  return {categories:mapGenres(genres),title:match.label,source:'https://www.wikidata.org/wiki/'+match.id};
 }
 function mount({getName,apply,onDirty}){
  const $=id=>document.getElementById(id);let timer,controller,version=0;
  function cancel(){version++;clearTimeout(timer);controller?.abort();controller=null;}
  function reset(){cancel();$('genre-status').textContent='Categories are suggested after you enter a game name.';$('genre-source').hidden=true;}
  async function search(){
   cancel();const name=getName().trim();if(name.length<3)return;
   const own=version;controller=new AbortController();const activeController=controller,signal=controller.signal;
   const timeout=setTimeout(()=>activeController.abort(),12000);
   $('genre-status').textContent='Looking up game genres…';$('genre-source').hidden=true;
   try{
    const result=await lookup(name,signal);
    if(own!==version||name!==getName().trim())return;
    if(!result?.categories.length){$('genre-status').textContent='No clear match with supported categories. Choose categories manually.';return;}
    apply(result.categories);onDirty();
    $('genre-status').textContent='Suggested categories for '+result.title+'. Review them before saving.';
    $('genre-source').href=result.source;$('genre-source').hidden=false;
   }catch(error){if(own===version)$('genre-status').textContent='Genre search unavailable. You can choose categories manually.';}
   finally{clearTimeout(timeout);}
  }
  $('game-name').addEventListener('input',()=>{reset();timer=setTimeout(search,900);});
  $('categories').addEventListener('change',()=>{cancel();$('genre-status').textContent='Using your category selections.';});
  $('genre-retry').addEventListener('click',search);
  $('game-form').addEventListener('submit',cancel);
  window.addEventListener('admin-card-selected',reset);
 }
 root.AdminGenres={lookup,mapGenres,mount};
})(globalThis);
