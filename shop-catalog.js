/* Permanent cosmetics. IDs stay stable so purchases survive catalog edits. */
(function(root){
 const items=[
  ['badge-star','badge','Rising star','★',250,'A star beside your name.'],
  ['badge-arcade','badge','Arcade regular','👾',500,'For the arcade crowd.'],
  ['badge-crown','badge','Royal player','♛',1000,'A crown worth saving for.'],
  ['theme-sunset','theme','Sunset','sunset',750,'Warm coral and violet skies.'],
  ['theme-ocean','theme','Deep ocean','ocean',750,'Cool aqua on deep navy.'],
  ['theme-cherry','theme','Cherry blossom','cherry',1000,'Soft pink highlights after dark.'],
  ['name-glow','name','Neon glow','glow',600,'A gentle pulsing name glow.'],
  ['name-shimmer','name','Silver shimmer','shimmer',900,'A sweep of light across your name.'],
  ['name-rainbow','name','Prismatic','rainbow',1500,'An animated spectrum for your name.'],
  ['card-neon','card','Neon frame','neon',700,'Cyan borders on your game cards.'],
  ['card-holo','card','Holographic','holo',1200,'Color-shifting card borders.'],
  ['card-gold','card','Golden edge','gold',1500,'A warm gold finish on every card.'],
  ['background-stars','background','Stargazer','stars',800,'A slow-moving field of stars.'],
  ['background-rain','background','Rainy night','rain',1000,'Quiet rain across the background.'],
  ['background-orbs','background','Floating lights','orbs',1400,'Soft orbs drifting behind the page.']
 ].map(([id,category,name,value,price,description])=>Object.freeze({id,category,name,value,price,description}));
 root.TinkleShop=Object.freeze({items:Object.freeze(items),categories:Object.freeze({badge:'Profile badges',theme:'Themes',name:'Name effects',card:'Game-card styles',background:'Background effects'})});
})(typeof window==='undefined'?globalThis:window);
