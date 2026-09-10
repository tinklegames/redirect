(() => {
  const wallet=window.TinkleWallet;
  const $=id=>document.getElementById(id);
  const rows=new Map(),busy=new Set();
  let toastTimer,visitDay=null;
  const toast=document.createElement('div');
  toast.className='token-reward-toast';toast.hidden=true;toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');
  document.body.appendChild(toast);
  function notify(message) {
    toast.replaceChildren(document.createTextNode(message+' '));
    const link=document.createElement('a');link.href='rewards.html';link.textContent='View rewards';toast.appendChild(link);
    toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.hidden=true,5000);
  }
  function remaining(next) {
    const seconds=Math.max(0,Math.ceil((next-Date.now())/1000));
    return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
  }
  function text(node,value) {if(node && node.textContent!==value)node.textContent=value;}
  function drawRewards(kind,items,day) {
    const host=$(kind==='daily'?'daily-reward-list':'achievement-list');
    if(!host)return;
    for(const item of items) {
      const key=kind+':'+item.id;
      let row=rows.get(key);
      if(!row) {
        const article=document.createElement('article');article.className='reward-item';
        const amount=document.createElement('span');amount.className='reward-amount';amount.textContent=`✦ ${item.amount} tokens`;
        const title=document.createElement('h3');title.textContent=item.title;
        const description=document.createElement('p');description.textContent=item.description;
        const progress=document.createElement('progress');progress.setAttribute('aria-label',item.title+' progress');
        const status=document.createElement('small'),button=document.createElement('button');button.type='button';
        button.addEventListener('click',()=>act(kind,{id:item.id,day:button.dataset.day},key));
        article.append(amount,title,description,progress,status,button);host.appendChild(article);
        row={progress,status,button};rows.set(key,row);
      }
      row.progress.max=item.target;row.progress.value=item.progress;
      text(row.status,`${item.progress} / ${item.target}${item.claimed?' · Collected':''}`);
      row.button.dataset.day=day;
      row.button.disabled=busy.has(key)||item.claimed||item.progress<item.target;
      text(row.button,item.claimed?'Claimed':busy.has(key)?'Claiming…':item.progress>=item.target?`Claim ${item.amount} tokens`:'In progress');
    }
  }
  function render() {
    try {
      const state=wallet.rewards();
      document.querySelectorAll('[data-token-balance]').forEach(node=>text(node,state.balance.toLocaleString()));
      document.querySelectorAll('[data-card-cooldown]').forEach(node=>text(node,state.nextCardAt>Date.now()?`Next +50 token reward in ${remaining(state.nextCardAt)}`:'Ready! Select any game card for +50 tokens.'));
      text($('rewards-login'),state.loginClaimed?`${state.loginAmount} tokens added for today. Come back tomorrow!`:'Your daily bonus will be added on this visit.');
      drawRewards('daily',state.daily,state.day);drawRewards('achievement',state.achievements,state.day);
    }catch(error){text($('rewards-message'),error.message);}
  }
  async function act(action,payload,key=action) {
    if(busy.has(key))return;
    busy.add(key);render();
    try {
      const result=await wallet.reward(action,payload);
      if(result.message) {
        text($(action==='code'?'code-message':'rewards-message'),result.message);
        // Claims and codes already show confirmation beside their controls.
      }
      return result;
    }catch(error){
      text($(action==='code'?'code-message':'rewards-message'),error.message);
      if(action!=='code')notify(error.message);
    }finally{busy.delete(key);render();}
  }
  async function visit() {
    visitDay=window.TinkleRewardsRules.dayOf(Date.now());
    await act('visit',null);
  }
  window.TinkleRewards=Object.freeze({
    onCard: code => {
      // This promise never delays or rejects into the card's copy/play handler.
      wallet.reward('card',{code}).then(result=>{
        if(result.amount)notify(result.message);
        // Cooldown stays visible on Rewards; copying another code needs no extra popup.
      }).catch(error=>notify(`Your game is still available. Token reward: ${error.message}`));
    }
  });
  $('token-code-form')?.addEventListener('submit',async event=>{
    event.preventDefault();
    const button=event.currentTarget.querySelector('button');
    if(button.disabled)return;
    button.disabled=true;
    try {
      const result=await act('code',{code:$('token-code').value});
      if(result?.amount)$('token-code').value='';
    }finally{button.disabled=false;}
  });
  window.addEventListener('tinkle-wallet-change',render);
  window.addEventListener('storage',render);
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden && visitDay!==window.TinkleRewardsRules.dayOf(Date.now()))visit();
    render();
  });
  render();visit();
  setInterval(()=>{
    if(document.hidden)return;
    if(visitDay!==window.TinkleRewardsRules.dayOf(Date.now()))visit();
    render();
  },1000);
})();
