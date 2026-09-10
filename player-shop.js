(() => {
 const shop=window.TinkleShop,host=document.getElementById('shop-grid'),filters=document.getElementById('shop-filters'),status=document.getElementById('shop-status');
 let category='all',pending=false;
 function preview(item){
  const box=document.createElement('div');box.className='cosmetic-preview';box.dataset[item.category==='card'?'card':item.category]=item.value;
  if(item.category==='badge'){const badge=document.createElement('span');badge.className='preview-badge';badge.textContent=item.value;box.append(badge);}
  if(item.category==='background'){const dots=document.createElement('span');dots.className='preview-dots';box.append(dots);}
  const profile=window.TinkleAccount.profile;box.append(TinkleCosmetics.name({username:profile?.username||'Your username',equipped:item.category==='name'?{name:item.id}:{}}));
  if(['card','theme','background'].includes(item.category)){const card=document.createElement('div');card.className='preview-game';const title=document.createElement('strong');title.textContent='Your next favorite';card.append(document.createTextNode('✦ ARCADE'),title,document.createTextNode('Jump into a game ↗'));box.append(card);}
  return box;
 }
 const dialog=document.createElement('dialog');dialog.className='player-dialog shop-dialog';document.body.append(dialog);
 function openPreview(item){dialog.replaceChildren(preview(item));const title=document.createElement('h2');title.textContent=item.name;const description=document.createElement('p');description.textContent=item.description+' Permanent purchase · '+item.price.toLocaleString()+' tokens.';const close=document.createElement('button');close.textContent='Back to shop';close.onclick=()=>dialog.close();dialog.append(title,description,close);dialog.showModal();}
 async function act(fn){if(pending)return;pending=true;render();try{const result=await fn();status.textContent=result.message;}catch(error){status.textContent=error.message;}finally{pending=false;render();}}
 for(const [id,label] of [['all','Everything'],...Object.entries(shop.categories),['owned','My collection']]){const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.category=id;button.onclick=()=>{category=id;render();};filters.append(button);}
 function render(){
  const profile=window.TinkleAccount.profile;
  filters.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===category)));
  host.replaceChildren();
  const items=shop.items.filter(i=>category==='all'||i.category===category||(category==='owned'&&profile?.owned.includes(i.id)));
  for(const item of items){
   const owned=profile?.owned.includes(item.id),equipped=profile?.equipped[item.category]===item.id;
   const article=document.createElement('article');article.className='shop-item';article.append(preview(item));
   const content=document.createElement('div');content.className='shop-item-content';const type=document.createElement('small');type.textContent=shop.categories[item.category];const title=document.createElement('h3');title.textContent=item.name;const description=document.createElement('p');description.textContent=item.description;const price=document.createElement('div');price.className='shop-price';price.textContent=owned?(equipped?'✓ Equipped':'✓ Owned forever'):`✦ ${item.price.toLocaleString()} tokens`;
   const actions=document.createElement('div');actions.className='shop-item-actions';const see=document.createElement('button');see.type='button';see.className='shop-preview-button';see.textContent='Preview';see.onclick=()=>openPreview(item);const buy=document.createElement('button');buy.type='button';buy.disabled=pending||!profile||(!owned&&profile.balance<item.price);buy.textContent=owned?(equipped?'Unequip':'Equip'):profile&&profile.balance<item.price?`Need ${(item.price-profile.balance).toLocaleString()} more`:'Buy permanently';buy.onclick=()=>act(()=>owned?TinkleWallet.equip(item.category,equipped?null:item.id):TinkleWallet.buy(item.id));actions.append(see,buy);content.append(type,title,description,price,actions);article.append(content);host.append(article);
  }
  if(!items.length){const empty=document.createElement('p');empty.textContent='Your collection starts here. Pick your first cosmetic from the shop.';host.append(empty);}
 }
 window.addEventListener('tinkle-player-change',render);render();
})();
