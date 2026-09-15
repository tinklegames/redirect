(function(root){
    function mount({recruit,now=()=>Date.now()}){
        const host=document.createElement('div');host.id='live-event-host';document.body.append(host);
        const shadow=host.attachShadow({mode:'open'});
        const style=document.createElement('style');style.textContent=`
        *{box-sizing:border-box}[hidden]{display:none!important}.ocean{position:fixed;inset:0;pointer-events:none;background:linear-gradient(transparent 45%,#007fbd35);z-index:2147482000}.crabs{position:fixed;inset:0;pointer-events:none;overflow:hidden}.crab{position:absolute;font-size:32px;animation:dance 1s ease-in-out infinite alternate;user-select:none;filter:drop-shadow(0 3px 4px #0005)}@keyframes dance{from{transform:translate(-8px,0) rotate(-9deg)}to{transform:translate(8px,-10px) rotate(9deg)}}
        .event{font:13px/1.65 Inter,system-ui,sans-serif;position:fixed;right:18px;top:85px;z-index:2147482500;width:min(360px,calc(100vw - 36px));background:var(--panel,rgba(15,23,42,.97));color:var(--text,#f9fafb);border:1px solid var(--border-soft,#94a3b859);border-radius:22px;backdrop-filter:blur(18px);box-shadow:0 18px 60px #0008;overflow:hidden}.top{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;background:var(--accent-soft,#4f46e580);color:var(--text-soft,#cbd5f5);font-size:11px;font-weight:800;letter-spacing:2px}.content{padding:22px;text-align:center}.icon{font-size:54px}.countdown{font-size:54px;font-weight:850;line-height:1.2;color:var(--accent-3,#22d3ee)}h2{font-size:23px;line-height:1.2;margin:12px 0}p{margin:9px 0;color:var(--text-soft,#cbd5f5)}.counter{font-size:26px;color:var(--accent-3,#22d3ee);font-weight:750;font-variant-numeric:tabular-nums}.cover{width:100%;height:175px;object-fit:cover;border-radius:9px;margin-bottom:8px}.code{font:700 18px ui-monospace,monospace;color:var(--accent-3,#22d3ee);overflow-wrap:anywhere}.actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:16px}button{font:600 12px Inter,system-ui,sans-serif;cursor:pointer;border:0;border-radius:999px;background:linear-gradient(120deg,var(--accent,#4f46e5),var(--accent-2,#a855f7));color:#fff;padding:10px 13px}button.secondary{background:var(--panel-soft,#0f172af0);color:var(--text-soft,#cbd5f5);border:1px solid var(--border-soft,#94a3b859)}button:disabled{opacity:.55;cursor:default}button:focus-visible{outline:2px solid var(--accent-3,#22d3ee);outline-offset:3px}.small{font-size:12px}.confetti{position:fixed;inset:0;pointer-events:none;z-index:2147482100;overflow:hidden}.confetti i{position:absolute;top:-20px;width:9px;height:16px;animation:fall 3s linear forwards}@keyframes fall{to{transform:translateY(110vh) rotate(500deg)}}@media(prefers-reduced-motion:reduce){.crab,.confetti i{animation:none}.confetti{display:none}}@media(max-width:500px){.event{top:70px;width:280px;right:10px}.content{padding:15px}.cover{height:135px}.crab{font-size:25px}}
        `;
        style.textContent += `
        dialog.takeover{position:fixed;inset:0;width:100vw;max-width:100vw;height:100dvh;max-height:100dvh;margin:0;padding:0;border:0;border-radius:0;background:rgba(0,0,0,.84);color:#fff;overflow:auto;opacity:0;transition:opacity .7s ease}
        dialog.takeover[open]{display:flex;align-items:safe center;justify-content:center}
        dialog.takeover.visible{opacity:1}dialog.takeover::backdrop{background:transparent}
        .event{position:relative;inset:auto;width:100%;max-width:1200px;margin:auto;padding:clamp(20px,4vw,64px);background:transparent;border:0;border-radius:0;backdrop-filter:none;box-shadow:none;overflow:visible;text-align:center;color:#fff}
        .top{justify-content:center;background:transparent;color:#cbd5e1;font-size:clamp(12px,1.5vw,18px);padding:0}.content{padding:clamp(12px,2vw,28px)}
        h2{font-size:clamp(32px,6vw,88px);overflow-wrap:anywhere;letter-spacing:-.035em}.icon{font-size:clamp(64px,10vw,140px)}.countdown{font-size:clamp(80px,16vw,210px)}.counter{font-size:clamp(28px,5vw,64px)}
        p{font-size:clamp(16px,2vw,24px);color:#cbd5e1}.small{font-size:clamp(13px,1.5vw,18px)}.code{font-size:clamp(24px,4vw,52px)}.cover{display:block;width:min(100%,620px);height:clamp(130px,28dvh,350px);object-fit:contain;margin:0 auto 18px}
        button{font-size:clamp(15px,1.8vw,22px);padding:14px 24px}.actions{gap:14px}.ocean{background:linear-gradient(transparent 30%,#007fbd35)}
        @media(prefers-reduced-motion:reduce){dialog.takeover{transition:none}}
        `;
        const dialog=document.createElement('dialog');dialog.className='takeover';dialog.setAttribute('aria-label','Live site event');dialog.setAttribute('closedby','none');
        dialog.addEventListener('cancel',event=>event.preventDefault());
        const ocean=document.createElement('div');ocean.className='ocean';ocean.hidden=true;
        const crabLayer=document.createElement('div');crabLayer.className='crabs';crabLayer.setAttribute('aria-hidden','true');ocean.append(crabLayer);
        const confetti=document.createElement('div');confetti.className='confetti';confetti.setAttribute('aria-hidden','true');
        const panel=document.createElement('section');panel.className='event';panel.hidden=true;panel.setAttribute('aria-label','Live site event');
        dialog.append(ocean,confetti,panel);shadow.append(style,dialog);
        let event=null,lastKey='',audio=null,musicEnabled=false,musicAttempted=false,busy=false,lastRecruit=0,burstTimer,fadeTimer;
        let countEl,timerEl,statusEl,recruitButton,musicButton,copyButton;
        function button(label,handler,secondary=false){const node=document.createElement('button');node.type='button';node.textContent=label;node.onclick=handler;if(secondary)node.className='secondary';return node;}
        function stopAudio(){if(audio){audio.pause();audio.removeAttribute('src');audio.load();audio=null;}musicEnabled=false;musicAttempted=false;}
        function clean(immediate=true){stopAudio();clearTimeout(fadeTimer);clearTimeout(burstTimer);dialog.classList.remove('visible');lastKey='';const close=()=>{if(dialog.open)dialog.close();ocean.hidden=true;crabLayer.replaceChildren();panel.hidden=true;panel.replaceChildren();confetti.replaceChildren();};if(immediate)close();else fadeTimer=setTimeout(close,700);}
        function burst(){confetti.replaceChildren();for(let i=0;i<35;i++){const bit=document.createElement('i');bit.style.left=(i*37%100)+'%';bit.style.background=['var(--accent,#4f46e5)','var(--accent-3,#22d3ee)','var(--accent-2,#a855f7)','#cbd5f5'][i%4];bit.style.animationDelay=(i%7)*.08+'s';confetti.append(bit);}clearTimeout(burstTimer);burstTimer=setTimeout(()=>confetti.replaceChildren(),4000);}
        function updateMusicLabel(){if(musicButton)musicButton.textContent=musicEnabled?'Mute music':'Enable music';}
        async function playMusic(){
            if(!event||event.type!=='crabs'||EventCore.state(event,now())?.phase!=='active')return;
            const id=event.id;if(!audio){audio=new Audio('crabrave.mp3');audio.loop=true;audio.volume=.4;}
            const track=audio;
            const align=()=>{if(event?.id===id&&Number.isFinite(track.duration)&&track.duration>0)track.currentTime=Math.max(0,(now()-(event.startedAt+event.countdown*1000))/1000)%track.duration;};
            if(track.readyState>=1)align();else track.addEventListener('loadedmetadata',align,{once:true});
            try{await track.play();if(event?.id!==id||audio!==track){track.pause();return;}musicEnabled=true;}
            catch{if(event?.id!==id||audio!==track)return;musicEnabled=false;if(statusEl)statusEl.textContent='Tap Enable music to join the rave.';}
            updateMusicLabel();
        }
        function build(state){
            clearTimeout(fadeTimer);panel.replaceChildren();panel.hidden=false;
            if(!dialog.open){dialog.showModal();requestAnimationFrame(()=>requestAnimationFrame(()=>{if(dialog.open)dialog.classList.add('visible');}));}
            const top=document.createElement('div');top.className='top';top.append(document.createTextNode(event.type==='crabs'?'LIVE · CRAB RAVE':'LIVE · MYSTERY REVEAL'));
            const content=document.createElement('div');content.className='content';panel.append(top,content);
            statusEl=document.createElement('p');statusEl.className='small';statusEl.setAttribute('role','status');
            timerEl=document.createElement('p');timerEl.className='small';
            countEl=null;recruitButton=null;musicButton=null;copyButton=null;
            if(state.phase==='countdown'){
                const icon=document.createElement('div');icon.className='icon';icon.textContent=event.type==='crabs'?'🦀':'?';
                const title=document.createElement('h2');title.textContent=event.type==='crabs'?'The crabs are coming.':'A mystery game approaches…';
                countEl=document.createElement('div');countEl.className='countdown';content.append(icon,title,countEl,timerEl);return;
            }
            if(event.type==='crabs'){
                const icon=document.createElement('div');icon.className='icon';icon.textContent='🦀';const title=document.createElement('h2');title.textContent='Recruit the crab army';
                countEl=document.createElement('div');countEl.className='counter';const hint=document.createElement('p');hint.textContent='Every recruit grows the crowd for everyone.';
                const actions=document.createElement('div');actions.className='actions';
                recruitButton=button('🦀 Recruit a crab',async()=>{
                    if(busy||now()-lastRecruit<600||EventCore.state(event,now())?.phase!=='active')return;
                    busy=true;lastRecruit=now();const id=event.id;recruitButton.disabled=true;
                    try{await recruit(id);if(event?.id===id)statusEl.textContent='';}
                    catch(error){if(event?.id===id)statusEl.textContent=error.message||'Could not recruit. Try again.';}
                    finally{busy=false;if(event?.id===id&&recruitButton)recruitButton.disabled=false;}
                });
                musicButton=button('Enable music',()=>{if(musicEnabled){audio?.pause();musicEnabled=false;updateMusicLabel();}else playMusic();},true);
                actions.append(recruitButton,musicButton);content.append(icon,title,countEl,hint,actions,timerEl,statusEl);
                ocean.hidden=false;burst();if(!musicAttempted){musicAttempted=true;playMusic();}
            }else{
                const game=event.game||{};
                if(typeof game.img==='string'&&/^https?:\/\//i.test(game.img)){const img=document.createElement('img');img.className='cover';img.src=game.img;img.alt=game.name||'Mystery game';img.onerror=()=>{img.hidden=true;};content.append(img);}
                const title=document.createElement('h2');title.textContent=game.name||'Mystery game';const code=document.createElement('div');code.className='code';code.textContent=game.code||'';
                copyButton=button('Copy code',async()=>{try{await navigator.clipboard.writeText(game.code||'');statusEl.textContent='Code copied. Enter it to play!';}catch{statusEl.textContent='Copy this code manually: '+(game.code||'');}});
                content.append(title,code,copyButton,timerEl,statusEl);burst();
            }
        }
        function tick(){
            const state=EventCore.state(event,now());
            if(!state){if(lastKey)clean(false);return;}
            const key=event.id+':'+state.phase;
            if(key!==lastKey){lastKey=key;build(state);}
            if(state.phase==='countdown'){countEl.textContent=state.seconds;timerEl.textContent='Starts in '+state.seconds+' seconds';return;}
            timerEl.textContent=state.seconds+' seconds remaining';
            if(event.type==='crabs'){
                const total=Math.max(0,Math.floor(Number(event.crabs)||0));countEl.textContent=total.toLocaleString()+' crabs recruited';
                const desired=EventCore.crowd(total);
                while(crabLayer.children.length>desired)crabLayer.lastChild.remove();
                while(crabLayer.children.length<desired){const n=crabLayer.children.length;const crab=document.createElement('span');crab.className='crab';crab.textContent='🦀';crab.style.left=((n*47+3)%95)+'%';crab.style.bottom=((n*29)%Math.min(65,10+total*.8))+'%';crab.style.animationDelay=-(n%10)/10+'s';crab.style.fontSize=(26+n%4*5)+'px';crabLayer.append(crab);}
            }
        }
        const interval=setInterval(tick,250);
        const resume=()=>{tick();if(musicEnabled)playMusic();};document.addEventListener('visibilitychange',resume);
        return {render(value){if(event?.id!==value?.id){if(value)clean();busy=false;}event=value;tick();},destroy(){clearInterval(interval);document.removeEventListener('visibilitychange',resume);clean();host.remove();}};
    }
    root.LiveEvents={mount};
})(globalThis);
