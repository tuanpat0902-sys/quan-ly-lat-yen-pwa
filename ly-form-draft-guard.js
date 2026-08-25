(()=>{
  'use strict';
  if(window.__lyFormDraftGuard)return;

  const VERSION='2026.08.25.3';
  const KEY='__latyen_active_form_draft_v3';
  let hiddenSnapshot=null;
  let wasHidden=false;
  let restoring=false;
  let blurTimer=0;

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
      .map((el,index)=>({key:fieldKey(el,index),value:el.value,checked:!!el.checked,selectedIndex:el.tagName==='SELECT'?el.selectedIndex:null}));
  }

  function resolveField(root,item,index){
    if(item.key?.startsWith('#')){
      const hit=document.getElementById(item.key.slice(1));
      if(hit&&root.contains(hit))return hit;
    }
    if(item.key?.startsWith('name:')){
      const name=item.key.slice(5).replace(/"/g,'\\"');
      const hits=[...root.querySelectorAll(`[name="${name}"]`)];
      if(hits.length===1)return hits[0];
    }
    return [...root.querySelectorAll('input,select,textarea')]
      .filter(el=>String(el.type||'').toLowerCase()!=='password')[index]||null;
  }

  function candidateRoots(){
    const roots=new Set();
    document.querySelectorAll('form,.inline-import-form,.modal.open,[id$="Form"],[id$="Panel"],[data-edit-id]').forEach(el=>{
      if(visible(el)&&el.id&&el.querySelector('input,select,textarea'))roots.add(el);
    });
    const focused=document.activeElement?.closest?.('form,.inline-import-form,.modal-box,.card,[id$="Form"],[id$="Panel"],[data-edit-id]');
    if(focused?.id&&visible(focused)&&focused.querySelector('input,select,textarea'))roots.add(focused);
    return [...roots];
  }

  function snapshot(){
    const roots=candidateRoots();
    if(!roots.length)return null;
    const activePanel=document.querySelector('.panel.active');
    const state={
      at:Date.now(),pageX:window.scrollX,pageY:window.scrollY,activePanelId:activePanel?.id||'',
      roots:roots.map(root=>({id:root.id,scrollTop:root.scrollTop,scrollLeft:root.scrollLeft,fields:captureFields(root)}))
    };
    hiddenSnapshot=state;
    try{sessionStorage.setItem(KEY,JSON.stringify(state));}catch(e){}
    return state;
  }

  function readSnapshot(){
    if(hiddenSnapshot)return hiddenSnapshot;
    try{return JSON.parse(sessionStorage.getItem(KEY)||'null');}catch(e){return null;}
  }

  function hasActiveDraft(){
    if(wasHidden&&readSnapshot()?.roots?.length)return true;
    return candidateRoots().length>0;
  }

  function restoreFields(root,saved){
    (saved.fields||[]).forEach((item,index)=>{
      const el=resolveField(root,item,index);if(!el)return;
      const type=String(el.type||'').toLowerCase();
      let changed=false;
      if(type==='checkbox'||type==='radio'){
        if(el.checked!==!!item.checked){el.checked=!!item.checked;changed=true;}
      }else if(el.tagName==='SELECT'){
        if(el.value!==item.value){
          el.value=item.value;
          if(el.value!==item.value&&Number.isInteger(item.selectedIndex))el.selectedIndex=item.selectedIndex;
          changed=true;
        }
      }else if(el.value!==item.value){el.value=item.value;changed=true;}
      if(changed){
        el.dispatchEvent(new Event('input',{bubbles:true}));
        el.dispatchEvent(new Event('change',{bubbles:true}));
      }
    });
  }

  function restoreOnce(){
    if(restoring||!wasHidden||document.hidden)return false;
    const state=readSnapshot();
    wasHidden=false;
    if(!state||Date.now()-Number(state.at||0)>12*60*60*1000){clear();return false;}
    restoring=true;
    try{
      let restored=false;
      (state.roots||[]).forEach(saved=>{
        const root=document.getElementById(saved.id);
        if(!root||!visible(root))return;
        restoreFields(root,saved);
        if(Number.isFinite(saved.scrollTop))root.scrollTop=saved.scrollTop;
        if(Number.isFinite(saved.scrollLeft))root.scrollLeft=saved.scrollLeft;
        restored=true;
      });
      clear();
      return restored;
    }finally{restoring=false;}
  }

  function scheduleSingleRestore(){requestAnimationFrame(()=>setTimeout(restoreOnce,0));}
  function clear(){hiddenSnapshot=null;try{sessionStorage.removeItem(KEY);}catch(e){}}

  function markHiddenAndSnapshot(){
    if(wasHidden)return;
    const state=snapshot();
    wasHidden=!!state;
  }

  function boot(){
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden)markHiddenAndSnapshot();
      else if(wasHidden)scheduleSingleRestore();
    },true);
    window.addEventListener('blur',()=>{
      clearTimeout(blurTimer);
      blurTimer=setTimeout(()=>{if(document.hidden||!document.hasFocus())markHiddenAndSnapshot();},150);
    },true);
    window.addEventListener('focus',()=>{
      clearTimeout(blurTimer);
      if(wasHidden&&!document.hidden)scheduleSingleRestore();
    },true);
    window.addEventListener('pagehide',markHiddenAndSnapshot,true);
  }

  window.__lyFormDraftGuard={version:VERSION,snapshot,restore:restoreOnce,clear,isActive:hasActiveDraft};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
