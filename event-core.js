// Shared timing/transaction logic. No browser UI or Firebase dependencies.
(function(root){
    function state(event, now=Date.now()){
        if(!event || typeof event.id!=='string' || !['mystery','crabs'].includes(event.type) || !Number.isFinite(event.startedAt))return null;
        if(!Number.isFinite(event.countdown)||event.countdown<0||event.countdown>120||!Number.isFinite(event.duration)||event.duration<10||event.duration>600)return null;
        const begins=event.startedAt+event.countdown*1000;const ends=begins+event.duration*1000;
        if(now>=ends)return null;
        return {phase:now<begins?'countdown':'active',begins,ends,seconds:Math.max(0,Math.ceil(((now<begins?begins:ends)-now)/1000))};
    }
    function recruit(current,id,now){
        if(current?.id!==id||current.type!=='crabs'||state(current,now)?.phase!=='active')return undefined;
        const count=Number.isSafeInteger(current.crabs)&&current.crabs>=0?current.crabs:0;
        if(count>=1000000)return undefined;
        return {...current,crabs:count+1};
    }
    function crowd(count){return 8+Math.min(240,Math.max(0,Math.floor(Number(count)||0)));}
    root.EventCore={state,recruit,crowd};
})(globalThis);
