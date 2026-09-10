(() => {
  const dayOf = now => new Date(now).toISOString().slice(0,10);
  const daily = [
    {id:'daily-explorer',title:'Try something different',description:'Earn the card reward on 3 different games today.',amount:100,target:3,metric:s=>s.daily.games.length},
    {id:'daily-variety',title:'Mix it up',description:'Earn card rewards covering 3 different categories today.',amount:75,target:3,metric:s=>s.daily.categories.length},
    {id:'daily-return',title:'Back for more',description:'Earn the 50-token card reward 3 times today.',amount:100,target:3,metric:s=>s.daily.rewardedClicks}
  ];
  const achievements = [
    {id:'first-pick',title:'First pick',description:'Select your first game card.',amount:50,target:1,metric:s=>s.games.length},
    {id:'explorer-10',title:'Game explorer',description:'Select 10 different game cards.',amount:150,target:10,metric:s=>s.games.length},
    {id:'regular-3',title:'Familiar face',description:'Visit on 3 different days. No streak required.',amount:100,target:3,metric:s=>s.loginDays},
    {id:'rewards-10',title:'Keep coming back',description:'Earn the card reward 10 times.',amount:200,target:10,metric:s=>s.rewardedClicks}
  ];
  function prepare(wallet, now) {
    if (!Number.isSafeInteger(now) || now < 0) throw new Error('The current time is unavailable.');
    const s = wallet.rewards || (wallet.rewards = {
      version:1, day:dayOf(now), daily:{games:[],categories:[],rewardedClicks:0,claimed:[]},
      games:[], loginDays:0, loginDay:null, rewardedClicks:0, nextCardAt:0,
      claimedAchievements:[], redeemedCodes:[], lastSeenAt:now
    });
    if(s.version !== 1) throw new Error('This rewards save needs a newer version of the site.');
    // Moving the clock backwards never reopens earlier daily rewards or cooldowns.
    const effectiveNow = Math.max(now, s.lastSeenAt);
    const today=dayOf(effectiveNow);
    if(today>s.day) {
      s.day=today;
      s.daily={games:[],categories:[],rewardedClicks:0,claimed:[]};
    }
    s.lastSeenAt=effectiveNow;
    return s;
  }
  function credit(wallet,amount) {
    if(!Number.isSafeInteger(amount) || amount<1 || !Number.isSafeInteger(wallet.balance+amount)) throw new Error('This reward cannot be added to the wallet.');
    wallet.balance+=amount;
  }
  const addUnique = (list,value) => {if(!list.includes(value)) list.push(value);};
  function apply(wallet,action,payload,now,config) {
    const s=prepare(wallet,now);
    if(action==='visit') {
      if(s.loginDay===s.day) return {amount:0};
      credit(wallet,config.loginAmount);
      s.loginDay=s.day; s.loginDays++;
      return {amount:config.loginAmount,message:`Daily bonus: +${config.loginAmount} Tinkle Tokens!`};
    }
    if(action==='card') {
      if(!payload || typeof payload.code!=='string' || !payload.code.trim()) throw new Error('This card has no game code.');
      addUnique(s.games,payload.code);
      if(now<s.nextCardAt) return {amount:0,nextCardAt:s.nextCardAt};
      addUnique(s.daily.games,payload.code);
      for(const category of payload.categories || []) if(typeof category==='string') addUnique(s.daily.categories,category);
      credit(wallet,config.cardAmount);
      // Use the real timestamp for eligibility; a backwards clock cannot bypass it.
      s.nextCardAt=Math.max(now,s.lastSeenAt)+config.cardCooldownMs;
      s.rewardedClicks++;s.daily.rewardedClicks++;
      return {amount:config.cardAmount,nextCardAt:s.nextCardAt,message:`+${config.cardAmount} Tinkle Tokens! Your next card reward is ready in 5 minutes.`};
    }
    if(action==='daily' || action==='achievement') {
      const list=action==='daily'?daily:achievements;
      if(action==='daily' && payload?.day!==s.day) throw new Error('A new day has started. Check today’s challenges.');
      const item=list.find(item=>item.id===payload?.id);
      if(!item) throw new Error('That reward does not exist.');
      const claimed=action==='daily'?s.daily.claimed:s.claimedAchievements;
      if(claimed.includes(item.id)) throw new Error('You already claimed this reward.');
      if(item.metric(s)<item.target) throw new Error('Finish the challenge before claiming its tokens.');
      credit(wallet,item.amount);claimed.push(item.id);
      return {amount:item.amount,message:`${item.title}: +${item.amount} Tinkle Tokens!`};
    }
    if(action==='code') {
      const entered=String(payload?.code || '').trim().toUpperCase();
      if(!entered) throw new Error('Enter a token code first.');
      const code=config.codes.find(item=>item.code.toUpperCase()===entered);
      if(!code) throw new Error('That token code was not found.');
      if(code.expiresAt && (!Number.isFinite(Date.parse(code.expiresAt)) || s.lastSeenAt>=Date.parse(code.expiresAt))) throw new Error('That token code has expired.');
      if(s.redeemedCodes.includes(code.id)) throw new Error('You already redeemed this code.');
      credit(wallet,code.amount);s.redeemedCodes.push(code.id);
      return {amount:code.amount,message:`Code redeemed: +${code.amount} Tinkle Tokens!`};
    }
    throw new Error('Unknown reward action.');
  }
  function snapshot(wallet,now,config) {
    const s=prepare(wallet,now);
    const project=(item,claimed)=>({id:item.id,title:item.title,description:item.description,amount:item.amount,target:item.target,progress:Math.min(item.target,item.metric(s)),claimed:claimed.includes(item.id)});
    return {balance:wallet.balance,day:s.day,loginClaimed:s.loginDay===s.day,loginAmount:config.loginAmount,nextCardAt:s.nextCardAt,
      daily:daily.map(item=>project(item,s.daily.claimed)),achievements:achievements.map(item=>project(item,s.claimedAchievements))};
  }
  window.TinkleRewardsRules=Object.freeze({apply,snapshot,dayOf});
})();
