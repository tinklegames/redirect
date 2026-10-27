import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';
import {getDatabase,ref,onValue,runTransaction} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js';
import {getAuth,signInAnonymously} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';
const app=initializeApp({apiKey:'AIzaSyC-IDS2wfF3ZgVzjwf0cHUazNGolLFhXVQ',authDomain:'mostpopular-39c60.firebaseapp.com',databaseURL:'https://mostpopular-39c60-default-rtdb.europe-west1.firebasedatabase.app',projectId:'mostpopular-39c60',appId:'1:939775132675:web:7d40bd8fff497c53553a36'},'tinkle-enter-live');
const db=getDatabase(app),auth=getAuth(app),authReady=signInAnonymously(auth).catch(error=>console.warn('Live controls sign-in unavailable',error));
let clockOffset=0;const now=()=>Date.now()+clockOffset;
const notices=LiveNotices.mount();const events=LiveEvents.mount({now,recruit:async id=>{await authReady;if(!auth.currentUser)throw Error('Live connection is unavailable.');const result=await runTransaction(ref(db,'siteSettings/liveEvent'),current=>EventCore.recruit(current,id,now()),{applyLocally:false});if(!result.committed)throw Error('This event has ended.');}});
const subscriptions=[];
function listen(path,handler){subscriptions.push(onValue(ref(db,path),snap=>handler(snap.val()),error=>console.warn('Live controls unavailable: '+path,error)));}
listen('.info/serverTimeOffset',value=>{clockOffset=Number(value)||0;notices.setClockOffset(clockOffset)});
listen('siteSettings',value=>{const settings=value||{};window.tinkleDiscoverySettings=settings;window.dispatchEvent(new Event('discovery-settings'));notices.render(settings);events.render(settings.liveEvent);if(settings.backgroundColor&&(!document.documentElement.dataset.importedTheme||document.documentElement.dataset.importedTheme==='default'))document.documentElement.style.setProperty('--admin-background',settings.backgroundColor);});
function command(path,handler){let initialized=false,last;listen(path,value=>{if(!initialized){initialized=true;last=value?.timestamp;return}if(!value||typeof value.timestamp!=='number'||value.timestamp===last)return;last=value.timestamp;if(Math.abs(now()-value.timestamp)>15000)return;handler(value)});}
command('announcementTriggerNow',value=>{if(typeof value.text==='string')notices.render({...window.tinkleDiscoverySettings,liveAnnouncement:{id:'legacy-'+value.timestamp,text:value.text,expiresAt:now()+15000}})});
command('jumpscareTriggerNow',value=>{if(!value.image)return;const img=document.createElement('img');img.src=value.image;img.alt='';img.style.cssText='position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:2147483000;pointer-events:none';document.body.append(img);setTimeout(()=>img.remove(),1500)});
command('trollTriggers/cursorChaos',()=>{const css=document.createElement('style');css.textContent='html *{cursor:none!important}';document.head.append(css);setTimeout(()=>css.remove(),3000)});
command('trollTriggers/flashbang',()=>{const flash=document.createElement('div');flash.style.cssText='position:fixed;inset:0;background:white;z-index:2147483000;pointer-events:none;transition:opacity .5s';document.body.append(flash);setTimeout(()=>flash.style.opacity='0',200);setTimeout(()=>flash.remove(),800)});
command('trollTriggers/reverseControls',()=>{const handler=()=>window.scrollBy((Math.random()-.5)*-50,(Math.random()-.5)*-50);document.addEventListener('mousemove',handler);setTimeout(()=>document.removeEventListener('mousemove',handler),3000)});
let sound=null,pendingSound=null;
async function playSound(url){if(sound){sound.pause();sound=null}pendingSound=null;if(!url)return;sound=new Audio(url);try{await sound.play()}catch{pendingSound=url}if(url.includes('rainingtacos.mp3'))startTacoRain();if(url.includes('crabrave.mp3'))startCrabRave();}
let audioBaseline=false,lastSound;listen('trollTriggers/creepySound',value=>{if(!value){sound?.pause();sound=null;pendingSound=null;audioBaseline=true;return}if(!audioBaseline){audioBaseline=true;lastSound=value.timestamp;return}if(value.timestamp===lastSound||Math.abs(now()-value.timestamp)>15000)return;lastSound=value.timestamp;playSound(value.url)});
document.addEventListener('pointerdown',()=>{if(pendingSound){const url=pendingSound;pendingSound=null;sound?.play().catch(()=>{pendingSound=url})}},{passive:true});
         function startTacoRain() {
             const tacoURL = "https://cdn-icons-png.flaticon.com/512/10342/10342492.png"; // <== your taco image URL
             const rainContainer = document.createElement("div");
             rainContainer.id = "taco-rain";
             rainContainer.style.position = "fixed";
             rainContainer.style.top = "0";
             rainContainer.style.left = "0";
             rainContainer.style.width = "100%";
             rainContainer.style.height = "100%";
             rainContainer.style.pointerEvents = "none";
             rainContainer.style.overflow = "hidden";
             rainContainer.style.zIndex = "99999";
             document.body.appendChild(rainContainer);

             // Generate tacos + spice particles
             const tacoCount = 20;
             const spiceCount = 40;
             for (let i = 0; i < tacoCount; i++) createTaco(rainContainer, tacoURL);
             for (let i = 0; i < spiceCount; i++) createSpice(rainContainer);

             // Remove after song ends (~30s)
             setTimeout(() => rainContainer.remove(), 33000);
         }

         function createTaco(container, tacoURL) {
             const taco = document.createElement("img");
             taco.src = tacoURL;
             taco.style.position = "absolute";
             taco.style.top = "-100px";
             taco.style.left = Math.random() * 100 + "vw";
             taco.style.width = 50 + Math.random() * 50 + "px";
             taco.style.opacity = 0.9;
             taco.style.transform = `rotate(${Math.random() * 360}deg)`;
             taco.style.animation = `tacoFall ${4 + Math.random() * 5}s linear infinite`;
             taco.style.animationDelay = Math.random() * 5 + "s";
             container.appendChild(taco);
         }

         function createSpice(container) {
             const spice = document.createElement("div");
             spice.style.position = "absolute";
             spice.style.top = "-10px";
             spice.style.left = Math.random() * 100 + "vw";
             spice.style.width = "8px";
             spice.style.height = "8px";
             spice.style.borderRadius = "50%";
             spice.style.background = Math.random() > 0.5 ? "#d17f3f" : "#f5c26b"; // taco spice colors
             spice.style.opacity = 0.8;
             spice.style.animation = `spiceFall ${3 + Math.random() * 3}s linear infinite`;
             spice.style.animationDelay = Math.random() * 5 + "s";
             container.appendChild(spice);
         }

         // === CSS Animations ===
         const style = document.createElement("style");
         style.textContent = `
  @keyframes tacoFall {
    0% { transform: translateY(-100px) rotate(0deg); opacity: 1; }
    100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
  }

  @keyframes spiceFall {
    0% { transform: translateY(-10px); opacity: 1; }
    100% { transform: translateY(110vh); opacity: 0; }
  }
  `;
         document.head.appendChild(style);

         function startCrabRave() {
             const crabURL = "https://media3.giphy.com/media/v1.Y2lkPTZjMDliOTUyYXJjYTZ2YWxsdTU4bjZleW0yczdxYmhjcmVjMnJob2cwOHlpNTlieiZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/NitS36ljNxQcfT0QIT/200.gif";
             const pageHeight = Math.max(document.body.scrollHeight, window.innerHeight);
             const raveContainer = document.createElement("div");
             raveContainer.id = "crab-rave";
             Object.assign(raveContainer.style, {
                 position: "absolute",
                 top: "0",
                 left: "0",
                 width: "100%",
                 height: pageHeight + "px",
                 pointerEvents: "none",
                 zIndex: "99998",
             });
             document.body.appendChild(raveContainer);

             // === Create full-page spotlights ===
             const spotlight = document.createElement("div");
             Object.assign(spotlight.style, {
                 position: "absolute", // scrolls with page
                 top: "0",
                 left: "0",
                 width: "100%",
                 height: pageHeight + "px",
                 pointerEvents: "none",
                 zIndex: "99999",
                 background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.2) 0%, transparent 70%)",
                 mixBlendMode: "screen",
                 transition: "background 0.3s ease",
             });
             document.body.appendChild(spotlight);

             // === Create crab crowd ===
             const crabCount = 50;
             for (let i = 0; i < crabCount; i++) {
                 const crab = document.createElement("img");
                 crab.src = crabURL;
                 crab.style.position = "absolute";
                 crab.style.transition = "transform 0.2s ease";
                 crab.style.willChange = "transform";

                 const x = Math.random() * 95 + 2.5;
                 const y = Math.random() * pageHeight;

                 const scale = 0.3 + Math.random() * 0.4;

                 Object.assign(crab.style, {
                     left: `${x}%`,
                     top: `${y}px`,
                     transform: `translate(-50%, 0) scale(${scale})`,
                     zIndex: Math.floor(scale * 100),
                 });

                 raveContainer.appendChild(crab);
             }

             // === Beat sync: page scale + crab bounce + spotlight color ===
             const colors = ["#ff00ff", "#00ffff", "#ffcc00", "#ff69b4", "#00ff00"];
             let beatUp = false;
             let colorIndex = 0;

             const beatInterval = setInterval(() => {
                 beatUp = !beatUp;

                 // Page scaling bounce
                 const scale = beatUp ? 1.03 : 1; // grow slightly on beat
                 document.body.style.transform = `scale(${scale})`;
                 document.body.style.transformOrigin = "center top";
                 document.body.style.transition = "transform 0.2s ease";

                 // Spotlight moves randomly
                 const spotlightX = Math.random() * 100;
                 const spotlightY = Math.random() * 100;
                 const color = colors[colorIndex % colors.length];
                 colorIndex++;
                 spotlight.style.background = `radial-gradient(circle at ${spotlightX}% ${spotlightY}%, ${color}40 0%, transparent 70%)`;

                 // Crab bounce per beat
                 document.querySelectorAll("#crab-rave img").forEach((crab) => {
                     const bounce = `translateY(${beatUp ? -6 : 0}px)`;
                     crab.style.transform = crab.style.transform.replace(/translateY\(.*?\)/, "") + ` ${bounce}`;
                 });
             }, 480); // ~125 BPM

             // === End effect after ~17s ===
             setTimeout(() => {
                 clearInterval(beatInterval);
                 document.body.style.transform = "scale(1)";
                 raveContainer.remove();
                 spotlight.remove();
             }, 17000);
         }

