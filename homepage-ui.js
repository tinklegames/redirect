(function(root){
    const sections=['intro','recent','favorites','games'];
    const labels={intro:'Welcome',recent:'Recently played',favorites:'Favorites',games:'Game grid'};
    function normalize(value={}){
        if(!value||typeof value!=='object')value={};
        const order=[...new Set((Array.isArray(value.order)?value.order:[]).filter(id=>sections.includes(id)))];
        sections.forEach(id=>{if(!order.includes(id))order.push(id);});
        return {order,hidden:sections.filter(id=>id!=='games'&&Array.isArray(value.hidden)&&value.hidden.includes(id)),density:value.density==='compact'?'compact':'comfortable',sort:['az','popular','recent'].includes(value.sort)?value.sort:'az'};
    }
    function nextCard(rects,index,key){
        if(!rects.length)return -1;
        if(key==='Home')return 0;if(key==='End')return rects.length-1;
        if(key==='ArrowRight')return Math.min(rects.length-1,index+1);if(key==='ArrowLeft')return Math.max(0,index-1);
        const current=rects[index];if(!current)return 0;
        const cx=current.left+current.width/2,cy=current.top+current.height/2;
        let best=index,score=Infinity;
        rects.forEach((rect,i)=>{const x=rect.left+rect.width/2,y=rect.top+rect.height/2,dy=y-cy;if((key==='ArrowDown'&&dy>10)||(key==='ArrowUp'&&dy < -10)){const distance=Math.abs(dy)+Math.abs(x-cx)*2;if(distance<score){score=distance;best=i;}}});return best;
    }
    function mount({onSort,refreshFavorites,panicKey,settingPanic}){
        const $=id=>document.getElementById(id),key='tinkleHomepageV1';let prefs;
        try{const saved=localStorage.getItem(key);prefs=normalize(saved?JSON.parse(saved):{});if(!saved&&localStorage.getItem('tinkleHeroHidden')==='1')prefs.hidden.push('intro');}catch{prefs=normalize();}
        const nodes={intro:$('homeIntro'),recent:$('recentSection'),favorites:$('homeFavorites'),games:$('homeGames')};
        const dialog=$('homeCustomize');let draft;
        function save(){try{localStorage.setItem(key,JSON.stringify(prefs));localStorage.setItem('tinkleHeroHidden',prefs.hidden.includes('intro')?'1':'0');$('homeSaveStatus').textContent='Saved on this device.';}catch{$('homeSaveStatus').textContent='Applied for this visit. Browser storage is unavailable.';}}
        function apply(){
            prefs.order.forEach(id=>{$('homeSections').append(nodes[id]);nodes[id].classList.toggle('home-section-hidden',prefs.hidden.includes(id));});
            document.body.classList.toggle('hide-hero',prefs.hidden.includes('intro'));if($('heroToggle'))$('heroToggle').checked=prefs.hidden.includes('intro');
            $('page-codes').dataset.density=prefs.density;
            refreshFavorites(!prefs.hidden.includes('favorites'));onSort(prefs.sort);
        }
        function draw(){
            $('homeOrder').replaceChildren();
            draft.order.forEach((id,index)=>{
                const row=document.createElement('div');row.className='home-order-row';
                const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=!draft.hidden.includes(id);check.disabled=id==='games';
                check.addEventListener('change',()=>{draft.hidden=draft.hidden.filter(item=>item!==id);if(!check.checked)draft.hidden.push(id);});label.append(check,document.createTextNode(labels[id]+(id==='games'?' (always shown)':'')));row.append(label);
                for(const [text,delta]of [['↑',-1],['↓',1]]){const button=document.createElement('button');button.type='button';button.textContent=text;button.setAttribute('aria-label','Move '+labels[id]+(delta<0?' up':' down'));button.disabled=index+delta<0||index+delta>=draft.order.length;button.onclick=()=>{[draft.order[index],draft.order[index+delta]]=[draft.order[index+delta],draft.order[index]];draw();const buttons=$('homeOrder').children[index+delta].querySelectorAll('button');buttons[delta<0?0:1].focus();};row.append(button);}$('homeOrder').append(row);
            });
            $('homeDensity').value=draft.density;$('homeDefaultSort').value=draft.sort;
        }
        function open(){draft=normalize(prefs);draw();$('homeSaveStatus').textContent='';dialog.showModal();}
        $('customizeHome').onclick=open;$('homeClose').onclick=()=>dialog.close();
        $('homeReset').onclick=()=>{draft=normalize();draw();};
        $('homeForm').onsubmit=event=>{event.preventDefault();draft.density=$('homeDensity').value;draft.sort=$('homeDefaultSort').value;prefs=normalize(draft);save();apply();if($('homeSaveStatus').textContent.startsWith('Saved'))dialog.close();};
        $('heroToggle')?.addEventListener('change',()=>{prefs.hidden=prefs.hidden.filter(id=>id!=='intro');if($('heroToggle').checked)prefs.hidden.push('intro');nodes.intro.classList.toggle('home-section-hidden',prefs.hidden.includes('intro'));save();});
        window.addEventListener('favorites-changed',()=>refreshFavorites(!prefs.hidden.includes('favorites')));
        const visible=element=>!!element&&element.getClientRects().length>0&&getComputedStyle(element).visibility!=='hidden';
        const availableCards=()=>[...document.querySelectorAll('.page.active .card')].filter(visible);
        document.addEventListener('keydown',event=>{
            if(event.defaultPrevented||event.ctrlKey||event.metaKey||event.altKey||event.isComposing||settingPanic())return;
            const normalized=event.key==='Escape'?'esc':event.key===' '?'space':event.key.toLowerCase();if(normalized===panicKey().toLowerCase())return;
            const target=event.composedPath()[0];
            if(!(target instanceof Element)||target.closest('dialog,[role="dialog"]')||document.querySelector('dialog[open]'))return;
            if(visible($('loaderScreen'))&&getComputedStyle($('loaderScreen')).opacity!=='0')return;
            if(visible($('updateLog'))||visible($('aiWindow')))return;
            const editable=target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])');
            if(event.key==='/'&&!editable){event.preventDefault();document.querySelector('[data-page="codes"]').click();$('searchInput').focus();$('searchInput').select();return;}
            if(editable){
                if(target===$('searchInput')&&event.key==='ArrowDown'){const first=[...$('cardsGrid').querySelectorAll('.card')].find(visible);if(first){event.preventDefault();first.focus();}}
                if(target===$('searchInput')&&event.key==='Escape'){event.preventDefault();target.value='';target.dispatchEvent(new Event('input',{bubbles:true}));}
                return;
            }
            const card=target.closest('.card');if(!card)return;
            if(['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','Home','End'].includes(event.key)){
                const list=availableCards();const index=list.indexOf(card);if(index<0)return;event.preventDefault();const next=nextCard(list.map(item=>item.getBoundingClientRect()),index,event.key);list[next]?.focus();
            }else if((event.key==='Enter'||event.key===' ')&&target===card){event.preventDefault();if(!event.repeat)card.click();}
            else if(event.key.toLowerCase()==='f'){
                event.preventDefault();if(!event.repeat){const container=card.parentElement,code=card.dataset.code;card.querySelector('.card__favorite-btn')?.click();
                    const replacement=[...container.querySelectorAll('.card')].find(item=>item.dataset.code===code)||[...container.querySelectorAll('.card')].find(visible)||availableCards()[0];replacement?.focus();}
            }
        });
        apply();return {preferences:()=>normalize(prefs)};
    }
    root.HomepageUI={normalize,nextCard,mount};
})(globalThis);
