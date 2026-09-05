(function(root){
    function decode(value){
        if(typeof value !== 'string') throw new Error('Each code must contain a URL followed by |true or |false.');
        const split=value.lastIndexOf('|');const url=value.slice(0,split);const flag=value.slice(split+1);
        if(split<0 || !['true','false'].includes(flag) || !CardEditor.validImage(url)) throw new Error('Invalid game destination: '+value);
        return {url,iframe:flag==='true'};
    }
    function parseCodes(source){
        const data=JSON.parse(source);
        if(!data || Array.isArray(data) || typeof data!=='object') throw new Error('codes.json must contain a code-to-URL object.');
        for(const [key,value] of Object.entries(data)){if(!key.trim() || ['__proto__','constructor','prototype'].includes(key))throw new Error('Invalid code.');decode(value);}
        return data;
    }
    function putCode(data,original,code,url,iframe){
        code=code.trim();url=url.trim();
        if(!/^[A-Z0-9_!-]{1,40}$/.test(code))throw new Error('Use uppercase letters, numbers, !, _ or - in the code.');
        if(code!==original && Object.hasOwn(data,code))throw new Error('That code already exists. Select it to edit.');
        if(!CardEditor.validImage(url) || url.includes('|'))throw new Error('Enter a complete game URL without a literal | character.');
        const next={...data};if(original && original!==code)delete next[original];next[code]=url+'|'+Boolean(iframe);return next;
    }
    function stats(weekly,allTime){
        const valid=data=>Object.entries(data||{}).filter(([key,value])=>!key.startsWith('__')&&typeof value==='number'&&Number.isFinite(value)&&value>=0);
        const rows=valid(weekly).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
        return {rows:rows.map(([name,count])=>({name,count,allTime:Number(allTime?.[name])||0})),weeklyTotal:rows.reduce((n,[,v])=>n+v,0),allTimeTotal:valid(allTime).reduce((n,[,v])=>n+v,0)};
    }
    async function probeLink(url,signal,timeout=12000){
        if(!CardEditor.validImage(url))return {status:'invalid URL'};
        const controller=new AbortController();const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)controller.abort();
        const timer=setTimeout(abort,timeout);
        try{
            const response=await fetch(url,{method:'GET',credentials:'omit',signal:controller.signal,cache:'no-store'});
            await response.body?.cancel();
            if(response.type==='opaque'||response.status===0)return {status:'unverified'};
            return {status:response.ok?'reachable':'HTTP '+response.status,http:response.status};
        }catch(error){return {status:signal?.aborted?'canceled':controller.signal.aborted?'timeout':'unverified'};}
        finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
    }
    root.AdminData={decode,parseCodes,putCode,stats,probeLink};
})(globalThis);
