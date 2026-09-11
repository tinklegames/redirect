// Presentation only. Firebase subscriptions stay in codes.html.
(function(root){
    function isActive(value,now=Date.now()){return !!(value&&typeof value.id==='string'&&typeof value.text==='string'&&value.text.trim()&&(!value.expiresAt||Number(value.expiresAt)>now));}
    let mounted;
    function mount(){
        if(mounted)return mounted;
        const host=document.createElement('div');host.id='live-notices';document.body.append(host);const shadow=host.attachShadow({mode:'open'});
        const style=document.createElement('style');style.textContent=`
        :host{--notice-bg:var(--panel,rgba(15,23,42,.97));--notice-soft:var(--panel-soft,rgba(15,23,42,.94));--notice-text:var(--text,#f9fafb);--notice-muted:var(--text-soft,#cbd5f5);--notice-line:var(--border-soft,rgba(148,163,184,.35));--notice-accent:var(--accent,#4f46e5);--notice-accent-2:var(--accent-2,#a855f7)}
        *{box-sizing:border-box}.notice,dialog{font:13px/1.65 Inter,system-ui,sans-serif;color:var(--notice-text);background:linear-gradient(135deg,var(--notice-soft),var(--notice-bg));border:1px solid var(--notice-line);border-radius:20px;box-shadow:0 24px 70px #0008;padding:22px;overflow-wrap:anywhere;backdrop-filter:blur(18px)}.notice{position:fixed;z-index:2147483000;max-width:420px;width:calc(100% - 32px);max-height:calc(50dvh - 32px);overflow:auto}.banner{left:16px;top:16px}.toast{left:16px;bottom:16px}.update{right:16px;bottom:80px}h2{font-size:11px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 10px;color:var(--notice-text)}p{white-space:pre-wrap;margin:0 0 18px;color:var(--notice-muted)}button{cursor:pointer;font:600 12px Inter,system-ui,sans-serif;background:linear-gradient(120deg,var(--notice-accent),var(--notice-accent-2));color:#fff;border:1px solid transparent;border-radius:999px;padding:10px 16px;margin:0 8px 4px 0}button:hover{filter:brightness(1.15)}button.secondary{background:transparent;color:var(--notice-muted);border-color:var(--notice-line)}button:focus-visible{outline:2px solid var(--accent-3,#22d3ee);outline-offset:3px}dialog{max-width:520px;width:calc(100% - 32px);max-height:calc(100dvh - 32px);overflow:auto;margin:auto}dialog::backdrop{background:#020617b8;backdrop-filter:blur(6px)}[hidden]{display:none!important}@media(max-width:650px){.update{bottom:80px;right:16px}.toast{bottom:auto;top:16px}.banner{top:16px}}
        `;
        style.textContent += `
        dialog.announcement-full{position:fixed;inset:0;width:100vw;max-width:100vw;height:100dvh;max-height:100dvh;margin:0;padding:clamp(24px,6vw,90px);border:0;border-radius:0;background:rgba(0,0,0,.84);box-shadow:none;backdrop-filter:none;text-align:center;opacity:0;transition:opacity .7s ease;overflow:auto;color:white}
        dialog.announcement-full[open]{display:flex;align-items:center;justify-content:center}
        dialog.announcement-full.visible{opacity:1}
        dialog.announcement-full p{font:800 clamp(40px,7vw,112px)/1.15 Inter,system-ui,sans-serif;letter-spacing:-.035em;color:#fff;white-space:pre-wrap;overflow-wrap:anywhere;width:100%;max-width:1500px;max-height:100%;overflow:auto;margin:0;text-shadow:0 4px 35px #0008}
        dialog.announcement-full::backdrop{background:transparent;backdrop-filter:none}
        @media(prefers-reduced-motion:reduce){dialog.announcement-full{transition:none}}
        `;
        shadow.append(style);
        const announcement=document.createElement('section');announcement.className='notice banner';announcement.hidden=true;announcement.setAttribute('aria-live','polite');
        const dialog=document.createElement('dialog');dialog.className='announcement-full';dialog.setAttribute('aria-label','Live announcement');dialog.setAttribute('closedby','none');
        const update=document.createElement('section');update.className='notice update';update.hidden=true;update.setAttribute('aria-live','polite');shadow.append(announcement,dialog,update);
        let updateInitialized=false,refreshing=false;
        let annId=null,updateId=null,timer,fadeTimer,clockOffset=0;const dismissed=new Set();
        function seen(id){try{return dismissed.has(id)||localStorage.getItem('notice:'+id)==='dismissed';}catch{return dismissed.has(id);}}
        function dismiss(id){dismissed.add(id);try{localStorage.setItem('notice:'+id,'dismissed');}catch{}}
        function closeAnnouncement(immediate=false){announcement.hidden=true;clearTimeout(timer);clearTimeout(fadeTimer);dialog.classList.remove('visible');if(immediate){if(dialog.open)dialog.close();}else fadeTimer=setTimeout(()=>{if(dialog.open)dialog.close();},700);}
        // Escape and backdrop clicks cannot dismiss an admin announcement.
        dialog.addEventListener('cancel',event=>event.preventDefault());
        function content(text){dialog.replaceChildren();const body=document.createElement('p');body.textContent=text;dialog.append(body);}
        function render(settings){
            const ann=settings?.liveAnnouncement;
            if(!isActive(ann,Date.now()+clockOffset)){closeAnnouncement();annId=null;}
            else if(ann.id!==annId){
                closeAnnouncement(true);annId=ann.id;
                {
                    content(ann.text);
                    dialog.showModal();requestAnimationFrame(()=>requestAnimationFrame(()=>{if(dialog.open)dialog.classList.add('visible');}));
                    if(ann.expiresAt)timer=setTimeout(closeAnnouncement,Math.min(2147483647,Math.max(0,ann.expiresAt-Date.now()-clockOffset)));
                }
            }
            const notice=settings?.updateNotice;
            // Establish a baseline on load; old commands must never cause reload loops.
            update.hidden=true;
            if(!updateInitialized){updateInitialized=true;updateId=notice?.id||null;return;}
            if(notice?.source!=='admin-button'||!notice.id){updateId=null;return;}
            if(notice.id===updateId||refreshing)return;
            updateId=notice.id;refreshing=true;
            (async()=>{
                try{if('serviceWorker' in navigator){const registration=await navigator.serviceWorker.getRegistration();if(registration)await Promise.race([registration.update(),new Promise(resolve=>setTimeout(resolve,3000))]);}}catch{}
                const url=new URL(location.href);url.searchParams.set('site-update',notice.id);location.replace(url.href);
            })();

        }
        mounted={render,setClockOffset(value){clockOffset=Number(value)||0;}};return mounted;
    }
    root.LiveNotices={isActive,mount};
})(globalThis);
