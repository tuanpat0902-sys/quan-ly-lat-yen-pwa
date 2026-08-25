/* Lát Yên — employee termination date UX/persistence. */
(()=>{
  'use strict';
  if(window.__lyEmployeeTerminationDate)return;
  const VERSION='2026.08.26.2';
  const STORAGE_KEY='__latyen_employee_termination_dates_v1';
  let activeEmployeeId='';
  let timer=0;

  const fold=v=>String(v??'').trim().toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
  const read=()=>{try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{};}catch(e){return {};}};
  const write=data=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data));}catch(e){}};
  const getDate=id=>String(read()[String(id||'')]||'');
  const setDate=(id,value)=>{const key=String(id||'');if(!key)return;const data=read();if(value)data[key]=String(value);else delete data[key];write(data);};
  const fmt=value=>{if(!value)return '';const [y,m,d]=String(value).split('-');return y&&m&&d?`${d}/${m}/${y}`:String(value);};
  const visible=root=>{if(!root||!root.isConnected)return false;const style=getComputedStyle(root);if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)return false;const rect=root.getBoundingClientRect();return rect.width>0&&rect.height>0;};

  function statusControl(root){
    if(!root)return null;
    const direct=root.querySelector('select[id*="status" i],select[name*="status" i],select[id*="active" i],select[name*="active" i],input[type="checkbox"][id*="active" i],input[type="checkbox"][name*="active" i]');
    if(direct)return direct;
    for(const label of root.querySelectorAll('label')){
      const t=fold(label.textContent);if(!/(trang thai|dang lam|da nghi|hoat dong)/.test(t))continue;
      const forId=label.getAttribute('for');
      const control=(forId&&document.getElementById(forId))||label.parentElement?.querySelector('select,input[type="checkbox"],input[type="radio"]');
      if(control)return control;
    }
    return null;
  }

  function isInactive(control){
    if(!control)return false;
    if(control.type==='checkbox')return !control.checked;
    const selected=control.options?.[control.selectedIndex];
    return /(da nghi|nghi viec|inactive|false|0)/.test(fold(`${control.value||''} ${selected?.textContent||''}`));
  }

  function employeeIdFromRoot(root){return String(activeEmployeeId||root?.dataset?.employeeId||root?.dataset?.editId||root?.querySelector('[data-employee-id]')?.dataset?.employeeId||'');}

  function findEmployeeForm(visibleOnly=false){
    const candidates=[...document.querySelectorAll('.modal.open,.modal[style*="display"],form,[role="dialog"]')];
    return candidates.find(root=>{
      if(visibleOnly&&!visible(root))return false;
      const t=fold(root.textContent);
      return /(nhan vien|thong tin nhan vien|ho so nhan su)/.test(t)&&statusControl(root);
    })||null;
  }

  function syncAssistantLauncher(){
    const launcher=document.getElementById('lyAssistantLauncher');
    const drawer=document.getElementById('lyAssistantDrawer');
    if(!launcher)return;
    const mobile=window.matchMedia?.('(max-width: 700px)')?.matches??Number(window.innerWidth||0)<=700;
    const formOpen=mobile&&!!findEmployeeForm(true);
    launcher.style.setProperty('display',formOpen?'none':'','important');
    launcher.setAttribute('aria-hidden',formOpen?'true':'false');
    if(formOpen&&drawer?.classList.contains('is-open'))drawer.classList.remove('is-open');
  }

  function persistFromForm(root){
    if(!root)return;
    const control=statusControl(root),id=employeeIdFromRoot(root),input=root.querySelector('#lyEmployeeTerminationDate');
    if(!id||!control)return;
    if(isInactive(control))setDate(id,input?.value||'');else setDate(id,'');
  }

  function enhanceForm(){
    const root=findEmployeeForm();if(!root)return;
    const control=statusControl(root);if(!control)return;
    const id=employeeIdFromRoot(root);
    let field=root.querySelector('#lyEmployeeTerminationDateWrap');
    if(!field){
      field=document.createElement('div');field.id='lyEmployeeTerminationDateWrap';field.className='ly-employee-termination-date';
      field.innerHTML='<label for="lyEmployeeTerminationDate">Nghỉ làm từ ngày</label><input id="lyEmployeeTerminationDate" type="date">';
      const host=control.closest('.form-field,.field,.input-group,div')||control.parentElement;
      if(host?.parentElement)host.insertAdjacentElement('afterend',field);else root.appendChild(field);
      control.addEventListener('change',()=>{updateVisibility(root);persistFromForm(root);});
      field.querySelector('input')?.addEventListener('change',()=>persistFromForm(root));
    }
    if(id){field.querySelector('input').value=getDate(id);field.dataset.employeeId=id;}
    updateVisibility(root);
  }

  function updateVisibility(root){
    const control=statusControl(root),field=root?.querySelector('#lyEmployeeTerminationDateWrap');if(!field)return;
    const inactive=isInactive(control);field.style.display=inactive?'':'none';
    const input=field.querySelector('input');if(input)input.required=inactive;
  }

  function decorateTable(){
    document.querySelectorAll('.employee-list-table .employee-list-row').forEach(row=>{
      const id=row.querySelector('[data-employee-id]')?.dataset?.employeeId;if(!id)return;
      const cells=row.cells||[];if(cells.length<2)return;
      const statusCell=cells[cells.length-2];if(!statusCell)return;
      let note=statusCell.querySelector('.ly-employee-termination-note');
      const inactive=/da nghi/.test(fold(statusCell.textContent)),date=inactive?getDate(id):'';
      if(!inactive||!date){note?.remove();return;}
      if(!note){note=document.createElement('div');note.className='muted ly-employee-termination-note';statusCell.appendChild(note);}
      note.textContent=`Nghỉ từ ${fmt(date)}`;
    });
  }

  function wrapEmployeeModal(){
    const original=window.employeeModal;if(typeof original!=='function'||original.__lyTerminationWrapped)return false;
    const wrapped=function(employeeId,...rest){
      activeEmployeeId=String(employeeId||'');const result=original.call(this,employeeId,...rest);
      requestAnimationFrame(()=>requestAnimationFrame(()=>{enhanceForm();syncAssistantLauncher();}));
      setTimeout(()=>{enhanceForm();syncAssistantLauncher();},100);return result;
    };
    wrapped.__lyTerminationWrapped=true;wrapped.__lyOriginal=original;window.employeeModal=wrapped;return true;
  }

  function ensureStyle(){
    if(document.getElementById('lyEmployeeTerminationDateStyle'))return;
    const style=document.createElement('style');style.id='lyEmployeeTerminationDateStyle';style.textContent=`
      .ly-employee-termination-date{min-width:0}
      .ly-employee-termination-date label{display:block;margin-bottom:5px}
      .ly-employee-termination-date input{width:100%}
      .ly-employee-termination-note{margin-top:3px;font-size:11px;white-space:nowrap}
    `;document.head.appendChild(style);
  }

  function install(){wrapEmployeeModal();enhanceForm();decorateTable();syncAssistantLauncher();}
  function schedule(){clearTimeout(timer);timer=setTimeout(install,50);}
  function boot(){
    ensureStyle();install();
    new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden']});
    document.addEventListener('click',event=>{
      const root=findEmployeeForm();const button=event.target.closest('button');
      if(root&&button&&/^(luu|cap nhat|xac nhan)/.test(fold(button.textContent)))persistFromForm(root);
      setTimeout(syncAssistantLauncher,0);
    },true);
    window.addEventListener('resize',syncAssistantLauncher,{passive:true});
    setInterval(install,1500);
  }

  window.__lyEmployeeTerminationDate={version:VERSION,install,getDate,setDate,syncAssistantLauncher};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
