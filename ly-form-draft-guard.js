(()=>{
  'use strict';
  if(window.__lyFormDraftGuard)return;

  const VERSION='2026.08.25.1';
  const KEY='__latyen_active_form_draft_v1';
  let lastSnapshot=null;
  let restoreToken=0;

  const visible=el=>{
    if(!el||!el.isConnected)return false;
    const s=getComputedStyle(el);
    return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)!==0;
  };

  function fieldKey(el,index){
    if(el.id)return `#${el.id}`;
    if(el.name)return `name:${el.name}`;
    const cls=[...el.classList].filter(Boolean).slice(0,2).join('.');
    return `${el.tagName.toLowerCase()}.${cls}:${index}`;
  }

  function captureFields(root){
    return [...root.querySelectorAll('input,select,textarea')]
      .filter(el=>String(el.type||'').toLowerCase()!=='password')
      .map((el,index)=>({
        key:fieldKey(el,index),
        tag:el.tagName,
        type:String(el.type||''),
        value:el.value,
        checked:!!el.checked,
        selectedIndex:el.tagName==='SELECT'?el.selectedIndex:null
      }));
  }

  function resolveField(root,item,index){
    if(item.key.startsWith('#')){
      const hit=document.getElementById(item.key.slice(1));
      if(hit&&root.contains(hit))return hit;
    }
    if(item.key.startsWith('name:')){
      const name=item.key.slice(5).replace(/"/g,'\\"');
      const hits=[...root.querySelectorAll(`[name="${name}"]`)];
      if(hits.length===1)return hits[0];
    }
    return [...root.querySelectorAll('input,select,textarea')]
      .filter(el=>String(el.type||'').toLowerCase()!=='password')[index]||null;
  }

  function candidateRoots(){
    const roots=new Set();
    const active=document.querySelector('.panel.active');
    if(active)roots.add(active);
    document.querySelectorAll('form,.inline-import-form,.modal.open,[id$="Form"],[id$="Panel"],[data-edit-id]').forEach(el=>{
      if(visible(el)&&el.querySelector('input,select,textarea'))roots.add(el);
    });
    const focused=document.activeElement?.closest?.('form,.inline-import-form,.modal-box,.card,[id$="Form"],[id$="Panel"],[data-edit-id]');
    if(focused&&focused.querySelector('input,select,textarea'))roots.add(focused);
    return [...roots];
  }

  function snapshot(){
    const roots=candidateRoots().filter(root=>root.id);
    if(!roots.length)return null;
    const activePanel=document.querySelector('.panel.active');
    const state={
      at:Date.now(),
      pageX:window.scrollX,
      pageY:window.scrollY,
      activePanelId:activePanel?.id||'',
      roots:roots.map(root=>({
        id:root.id,
        className:root.className,
        styleDisplay:root.style.display,
        scrollTop:root.scrollTop,
        scrollLeft:root.scrollLeft,
        dataset:{...root.dataset},
        fields:captureFields(root)
      }))
    };
    lastSnapshot=state;
    try{sessionStorage.setItem(KEY,JSON.stringify(state));}catch(e){}
    return state;
  }

  function readSnapshot(){
    if(lastSnapshot)return lastSnapshot;
    try{return JSON.parse(sessionStorage.getItem(KEY)||'null');}catch(e){return null;}
  }

  function restoreRoot(saved){
    const root=document.getElementById(saved.id);
    if(!root)return false;
    if(saved.className)root.className=saved.className;
    if(saved.styleDisplay!==undefined)root.style.display=saved.styleDisplay;
    Object.entries(saved.dataset||{}).forEach(([k,v])=>{try{root.dataset[k]=v;}catch(e){}});
    (saved.fields||[]).forEach((item,index)=>{
      const el=resolveField(root,item,index);if(!el)return;
      const type=String(el.type||'').toLowerCase();
      if(type==='checkbox'||type==='radio')el.checked=!!item.checked;
      else if(el.tagName==='SELECT'){
        el.value=item.value;
        if(el.value!==item.value&&Number.isInteger(item.selectedIndex))el.selectedIndex=item.selectedIndex;
      }else el.value=item.value;
      el.dispatchEvent(new Event('input',{bubbles:true}));
      el.dispatchEvent(new Event('change',{bubbles:true}));
    });
    if(Number.isFinite(saved.scrollTop))root.scrollTop=saved.scrollTop;
    if(Number.isFinite(saved.scrollLeft))root.scrollLeft=saved.scrollLeft;
    return true;
  }

  function restore(){
    const state=readSnapshot();
    if(!state||Date.now()-Number(state.at||0)>12*60*60*1000)return false;
    if(state.activePanelId){
      const target=document.getElementById(state.activePanelId);
      if(target&&!target.classList.contains('active')){
        document.querySelectorAll('.panel.active').forEach(p=>p.classList.remove('active'));
        target.classList.add('active');
      }
    }
    let restored=false;
    (state.roots||[]).forEach(saved=>{restored=restoreRoot(saved)||restored;});
    if(Number.isFinite(state.pageY))window.scrollTo({top:state.pageY,left:Number(state.pageX||0),behavior:'auto'});
    return restored;
  }

  function scheduleRestore(){
    const token=++restoreToken;
    const run=()=>{if(token===restoreToken)restore();};
    requestAnimationFrame(()=>requestAnimationFrame(run));
    setTimeout(run,80);
    setTimeout(run,220);
    setTimeout(run,600);
    setTimeout(run,1200);
  }

  function clear(){lastSnapshot=null;try{sessionStorage.removeItem(KEY);}catch(e){}}

  function boot(){
    document.addEventListener('input',()=>{if(!document.hidden)snapshot();},{capture:true});
    document.addEventListener('change',()=>{if(!document.hidden)snapshot();},{capture:true});
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden)snapshot();
      else scheduleRestore();
    },true);
    window.addEventListener('blur',snapshot,true);
    window.addEventListener('focus',scheduleRestore,true);
    window.addEventListener('pagehide',snapshot,true);
  }

  window.__lyFormDraftGuard={version:VERSION,snapshot,restore,clear};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
