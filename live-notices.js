// Presentation only. Firebase subscriptions stay in codes.html.
(function(root){
    function isActive(value,now=Date.now()){return !!(value&&typeof value.id==='string'&&typeof value.text==='string'&&value.text.trim()&&(!value.expiresAt||Number(value.expiresAt)>now));}
    let mounted;
    function mount(){
        if(mounted)return mounted;
        const host=document.createElement('div');host.id='live-notices';document.body.append(host);const shadow=host.attachShadow({mode:'open'});
        const style=document.createElement('style');style.textContent=`
        *{box-sizing:border-box} .notice,dialog{font:16px/1.5 system-ui,sans-serif;color:#f5f7fc;background:#17202c;border:1px solid #586575;border-radius:14px;box-shadow:0 12px 45px #0007;padding:20px;overflow-wrap:anywhere} .notice{position:fixed;z-index:2147483000;max-width:480px;width:calc(100% - 32px)} .banner{left:16px;top:16px}.toast{left:16px;bottom:16px}.update{right:16px;bottom:16px}h2{font-size:18px;margin:0 0 8px}p{white-space:pre-wrap;margin:0 0 15px}button{cursor:pointer;font:600 14px system-ui;background:#c2f277;color:#142008;border:0;border-radius:7px;padding:10px 14px;margin:0 8px 0 0}button.secondary{background:#303f50;color:white}button:focus-visible{outline:3px solid white;outline-offset:3px}dialog{max-width:550px;width:calc(100% - 32px);margin:auto}dialog::backdrop{background:#030712b8} [hidden]{display:none!important}@media(max-width:650px){.update{bottom:16px;right:16px}.toast{bottom:auto;top:16px}.banner{top:16px}}`;
        shadow.append(style);
        const announcement=document.createElement('section');announcement.className='notice banner';announcement.hidden=true;announcement.setAttribute('aria-live','polite');
        const dialog=document.createElement('dialog');dialog.setAttribute('aria-label','Live announcement');
        const update=document.createElement('section');update.className='notice update';update.hidden=true;update.setAttribute('aria-live','polite');shadow.append(announcement,dialog,update);
        let annId=null,updateId=null,timer,clockOffset=0;const dismissed=new Set();
        function seen(id){try{return dismissed.has(id)||sessionStorage.getItem('notice:'+id)==='dismissed';}catch{return dismissed.has(id);}}
        function dismiss(id){dismissed.add(id);try{sessionStorage.setItem('notice:'+id,'dismissed');}catch{}}
        function closeAnnouncement(){announcement.hidden=true;if(dialog.open)dialog.close();clearTimeout(timer);}
        dialog.addEventListener('cancel',()=>{if(annId)dismiss(annId);});
        function content(node,title,text,close){node.replaceChildren();const heading=document.createElement('h2');heading.textContent=title;const body=document.createElement('p');body.textContent=text;node.append(heading,body);const button=document.createElement('button');button.textContent='Dismiss';button.onclick=close;node.append(button);}
        function render(settings){
            const ann=settings?.liveAnnouncement;
            if(!isActive(ann,Date.now()+clockOffset)){closeAnnouncement();annId=null;}
            else if(ann.id!==annId){
                closeAnnouncement();annId=ann.id;
                if(!seen(ann.id)){
                    const target=ann.style==='modal'?dialog:announcement;
                    content(target,'Announcement',ann.text,()=>{dismiss(ann.id);closeAnnouncement();});
                    if(target===dialog)dialog.showModal();else{announcement.className='notice '+(ann.style==='toast'?'toast':'banner');announcement.hidden=false;}
                    if(ann.expiresAt)timer=setTimeout(closeAnnouncement,Math.min(2147483647,Math.max(0,ann.expiresAt-Date.now()-clockOffset)));
                }
            }
            const notice=settings?.updateNotice;
            if(!isActive(notice,Date.now()+clockOffset)){update.hidden=true;updateId=null;}
            else if(notice.id!==updateId){
                updateId=notice.id;update.hidden=seen(notice.id);update.replaceChildren();
                const heading=document.createElement('h2');heading.textContent='Update available';const text=document.createElement('p');text.textContent=notice.text;
                const refresh=document.createElement('button');refresh.textContent='Refresh now';
                refresh.onclick=async()=>{
                    refresh.disabled=true;refresh.textContent='Refreshing…';
                    try{
                        if('serviceWorker' in navigator){const registration=await navigator.serviceWorker.getRegistration();if(registration)await Promise.race([registration.update(),new Promise(resolve=>setTimeout(resolve,3000))]);}
                    }catch{}
                    dismiss(notice.id);
                    const url=new URL(location.href);url.searchParams.set('site-update',notice.id);location.replace(url.href);
                };
                const later=document.createElement('button');later.textContent='Later';later.className='secondary';later.onclick=()=>{dismiss(notice.id);update.hidden=true;};
                update.append(heading,text,refresh,later);
            }
        }
        mounted={render,setClockOffset(value){clockOffset=Number(value)||0;}};return mounted;
    }
    root.LiveNotices={isActive,mount};
})(globalThis);
