(()=>{
  'use strict';
  if(window.__lyRuntimeErrorBoundaryV1)return;
  window.__lyRuntimeErrorBoundaryV1=true;

  const VERSION='2026.08.24.1';
  const MAX_RECENT=30;
  const recent=[];
  const counters=new Map();
  const NOISE=[
    /resizeobserver loop/i,
    /script error\.?$/i,
    /aborterror|operation was aborted/i,
    /networkerror|failed to fetch|load failed|network request failed/i,
    /browser metadata to extension/i
  ];

  function messageOf(value){
    if(value==null)return 'Unknown runtime error';
    if(typeof value==='string')return value;
    return String(value.message||value.reason?.message||value.error?.message||value);
  }

  function isNoise(message){return NOISE.some(pattern=>pattern.test(String(message||'')));}

  function remember(kind,message,details={}){
    const clean=String(message||'Unknown runtime error').slice(0,600);
    const signature=`${kind}:${clean}:${details.source||''}:${details.line||0}`;
    const count=(counters.get(signature)||0)+1;
    counters.set(signature,count);
    const entry={kind,message:clean,count,at:Date.now(),...details};
    const existing=recent.findIndex(item=>item.signature===signature);
    if(existing>=0)recent.splice(existing,1);
    recent.unshift({...entry,signature});
    if(recent.length>MAX_RECENT)recent.length=MAX_RECENT;
    return entry;
  }

  function onError(event){
    const resource=event?.target&&event.target!==window?event.target:null;
    const message=resource
      ?`Không tải được tài nguyên: ${resource.src||resource.href||resource.tagName||'unknown'}`
      :messageOf(event?.error||event?.message);
    const noisy=isNoise(message);
    const entry=remember(resource?'resource':'error',message,{
      source:String(event?.filename||resource?.src||resource?.href||''),
      line:Number(event?.lineno||0),
      column:Number(event?.colno||0),
      noisy
    });
    if(noisy){event?.preventDefault?.();return;}
    if(entry.count===1||entry.count%25===0)console.error('[Lát Yên] Runtime error',entry,event?.error||'');
    // User actions already show contextual errors. A global generic toast here
    // would hide the real cause and could repeatedly interrupt receipt entry.
  }

  function onRejection(event){
    const message=messageOf(event?.reason);
    const noisy=isNoise(message);
    const entry=remember('promise',message,{noisy});
    if(noisy){event?.preventDefault?.();return;}
    if(entry.count===1||entry.count%25===0)console.error('[Lát Yên] Unhandled async error',entry,event?.reason||'');
  }

  window.addEventListener('error',onError,true);
  window.addEventListener('unhandledrejection',onRejection);
  window.__lyRuntimeErrorBoundary={
    version:VERSION,
    recent:()=>recent.map(item=>({...item})),
    status:()=>({version:VERSION,total:[...counters.values()].reduce((sum,value)=>sum+value,0),unique:counters.size,recent:recent.length})
  };
})();
