(()=>{
  'use strict';
  if(window.__lyTableFirstPaint)return;
  const VERSION='2026.08.29.2';
  const root=document.documentElement;
  const state={version:VERSION,state:'pending',reason:'',atomic:true};
  const pendingScopes=new Set();
  let settled=false;
  let scheduled=false;
  const frame=typeof requestAnimationFrame==='function'?requestAnimationFrame:fn=>setTimeout(fn,0);

  function tablesIn(scope=document){
    const tables=[];
    if(scope?.matches?.('table'))tables.push(scope);
    scope?.querySelectorAll?.('table')?.forEach?.(table=>tables.push(table));
    return tables;
  }

  function markReady(scope=document){
    tablesIn(scope).forEach(table=>{table.dataset.lyTablePaintReady='1';});
  }

  function applyLayers(scope=document){
    try{window.__lyUITableErgonomics?.apply?.(scope);}catch(e){}
    try{window.__lyTableViewV2?.apply?.(scope);}catch(e){}
  }

  function release(reason='ready'){
    if(settled)return true;
    settled=true;
    root.dataset.lyTableFirstPaintOwner='ready';
    root.removeAttribute('data-ly-table-first-paint');
    state.state='ready';
    state.reason=reason;
    return true;
  }

  function flush(reason='dynamic-table-ready'){
    scheduled=false;
    const scopes=[...pendingScopes];
    pendingScopes.clear();
    const targets=scopes.length?scopes:[document.querySelector?.('.panel.active')||document];
    targets.forEach(applyLayers);
    frame(()=>{
      targets.forEach(markReady);
      if(!settled)release(reason);
      if(pendingScopes.size)schedule('queued-table-ready');
    });
  }

  function schedule(reason='dynamic-table-ready',scope=document.querySelector?.('.panel.active')||document){
    if(scope)pendingScopes.add(scope);
    if(scheduled)return true;
    scheduled=true;
    frame(()=>flush(reason));
    return true;
  }

  function settle(reason='layers-ready'){
    if(!window.__lyUITableErgonomics||!window.__lyTableViewV2)return false;
    return schedule(reason,document);
  }

  function containsUnreadyTable(node){
    if(node?.nodeType!==1)return false;
    if(node.matches?.('table:not([data-ly-table-paint-ready="1"])'))return true;
    return !!node.querySelector?.('table:not([data-ly-table-paint-ready="1"])');
  }

  function handleMutations(records=[]){
    for(const record of records){
      if([...record.addedNodes||[]].some(containsUnreadyTable)){
        schedule('dynamic-table-ready',record.target?.closest?.('.panel')||document);
      }
    }
  }

  window.addEventListener?.('latyen:panel',event=>schedule('panel-table-ready',event?.target?.closest?.('.panel')||document.querySelector?.('.panel.active')||document));
  window.addEventListener?.('latyen:cloud-refreshed',()=>schedule('cloud-table-ready',document.querySelector?.('.panel.active')||document));
  window.__lyTableFirstPaint=Object.assign(state,{settle,release,schedule,markReady,handleMutations});
  if(document.readyState!=='loading')settle('script-ready');
})();
