(()=>{
  'use strict';
  if(window.__lyMenuSecurityV13)return;
  window.__lyMenuSecurityV13=true;

  const VERSION='2026.08.23.1.3';
  const UNLOCK_MS=10*60*1000;
  const RPC_TIMEOUT_MS=12000;
  const ENABLE_CACHE='lat_yen_menu_security_enabled_v1';
  const FALLBACK_IDS=new Set(['ingredients','recipes','finance','employees','warehouses','history']);
  const PROTECTED_LABELS=[
    /nguyên\s*liệu.*dụng\s*cụ/i,
    /thực\s*đơn.*công\s*thức/i,
    /báo\s*cáo\s*tài\s*chính/i,
    /nhân\s*viên/i,
    /kho\s*\/?\s*chi\s*nhánh/i,
    /lịch\s*sử\s*hoạt\s*động/i
  ];

  let cachedEnabled=false;try{cachedEnabled=localStorage.getItem(ENABLE_CACHE)==='1';}catch(e){}
  const state={enabled:cachedEnabled,loaded:false,unlockUntil:0,pending:null,timer:null,observer:null,baseShowTab:null,guard:null,uiTimer:null};

  const text=v=>String(v??'').trim();
  const norm=s=>text(s).replace(/\s+/g,' ');
  const getClient=()=>{try{if(typeof sb!=='undefined'&&sb?.rpc)return sb;}catch(e){}return null;};
  const isUnlocked=()=>state.enabled&&Date.now()<state.unlockUntil;
  const lockSvg=open=>open?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 11V8a5 5 0 0 1 9.6-2"></path><rect x="5" y="11" width="14" height="9" rx="2"></rect></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg>';

  function withTimeout(promise,label='Thao tác'){
    return Promise.race([
      promise,
      new Promise((_,reject)=>setTimeout(()=>reject(new Error(`${label} quá thời gian chờ`)),RPC_TIMEOUT_MS))
    ]);
  }

  function isProtected(panel,btn){
    if(FALLBACK_IDS.has(text(panel)))return true;
    const label=norm(btn?.innerText||btn?.textContent||'');
    return PROTECTED_LABELS.some(rx=>rx.test(label));
  }

  function protectedButtonForPanel(panel){
    const id=text(panel);
    let direct=null;try{direct=document.querySelector(`#nav button[data-panel="${CSS.escape(id)}"]`);}catch(e){}
    if(direct)return direct;
    return [...document.querySelectorAll('#nav button[data-panel]')].find(b=>isProtected(b.dataset.panel,b))||null;
  }

  function injectStyles(){
    if(document.getElementById('lyMenuSecurityStyles'))return;
    const s=document.createElement('style');s.id='lyMenuSecurityStyles';s.textContent=`
      .ly-menu-lock-mark{margin-left:auto;display:inline-grid;place-items:center;width:18px;height:18px;border-radius:6px;background:#f2f4f7;color:#667085;flex:0 0 auto}.ly-menu-lock-mark svg{width:11px;height:11px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}#nav button.ly-protected-menu.ly-protected-unlocked .ly-menu-lock-mark{background:#ecfdf3;color:#067647}
      #lyMenuSecuritySettings.ly-security-card{grid-column:1/-1!important;width:100%!important;min-width:0!important;margin:0!important;border:1px solid #d7e5e3!important;border-left:4px solid #0f766e!important;border-radius:10px!important;background:linear-gradient(180deg,#fff,#fbfefd)!important;box-shadow:0 6px 20px rgba(16,24,40,.05)!important;padding:16px!important;box-sizing:border-box!important;display:block!important;min-height:0!important}.ly-security-head{display:flex;align-items:flex-start;gap:12px;margin-bottom:14px}.ly-security-icon{width:38px;height:38px;border-radius:11px;background:#ecfdf5;color:#087f6f;display:grid;place-items:center;flex:0 0 auto}.ly-security-icon svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.ly-security-copy{min-width:0;flex:1}.ly-security-title{font-size:15px;font-weight:850;color:#1d2939}.ly-security-desc{font-size:12.5px;color:#667085;line-height:1.45;margin-top:3px}.ly-security-status{display:inline-flex;align-items:center;gap:6px;margin-top:8px;padding:4px 8px;border-radius:999px;background:#f2f4f7;color:#475467;font-size:11px;font-weight:750}.ly-security-status.on{background:#ecfdf3;color:#067647}.ly-security-status.unlocked{background:#eff8ff;color:#175cd3}.ly-security-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.ly-security-fields label{font-size:12px;color:#475467}.ly-security-fields input{display:block;width:100%;height:38px;box-sizing:border-box;margin-top:5px;border:1px solid #d0d5dd;border-radius:8px;padding:0 10px;background:#fff}.ly-security-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.ly-security-actions button{border:1px solid #d0d5dd;border-radius:8px;padding:8px 11px;background:#fff;color:#344054;font-weight:700;cursor:pointer}.ly-security-actions button.primary{background:#0f766e;border-color:#0f766e;color:#fff}.ly-security-actions button.danger{color:#b42318;border-color:#fecdca;background:#fff}.ly-security-note{font-size:11.5px;color:#667085;margin-top:10px;line-height:1.45}
      .ly-security-overlay{position:fixed;inset:0;z-index:2147483647;background:rgba(15,23,42,.38);display:none;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px)}.ly-security-overlay.open{display:flex}.ly-security-modal{width:min(410px,100%);background:#fff;border:1px solid #dfe7e6;border-radius:18px;box-shadow:0 24px 70px rgba(15,23,42,.24);padding:18px}.ly-security-modal-head{display:flex;gap:12px;align-items:center}.ly-security-modal-icon{width:42px;height:42px;border-radius:13px;background:#ecfdf5;color:#087f6f;display:grid;place-items:center}.ly-security-modal-icon svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}.ly-security-modal-title{font-size:17px;font-weight:850;color:#1d2939}.ly-security-modal-sub{font-size:12.5px;color:#667085;margin-top:2px}.ly-security-input-wrap{margin-top:16px}.ly-security-input-wrap label{font-size:12px;color:#475467}.ly-security-input{margin-top:6px;width:100%;height:42px;box-sizing:border-box;border:1px solid #d0d5dd;border-radius:10px;padding:0 12px;font-size:15px;outline:none}.ly-security-input:focus{border-color:#0f766e;box-shadow:0 0 0 3px rgba(15,118,110,.12)}.ly-security-error{min-height:18px;margin-top:7px;font-size:12px;color:#b42318}.ly-security-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}.ly-security-btn{border-radius:10px;padding:9px 12px;font-weight:750;border:1px solid #d0d5dd;background:#fff;color:#344054}.ly-security-btn.primary{background:#0f766e;color:#fff;border-color:#0f766e}@media(max-width:700px){.ly-security-fields{grid-template-columns:1fr}.ly-security-modal{border-radius:16px}}
    `;document.head.appendChild(s);
  }

  function updateMark(mark,open){
    const mode=open?'open':'locked';
    if(mark.dataset.mode!==mode){mark.dataset.mode=mode;mark.innerHTML=lockSvg(open);}
    const title=open?'Đã mở khóa tạm thời':'Cần mật khẩu';if(mark.title!==title)mark.title=title;
  }

  function markMenus(){
    document.querySelectorAll('#nav button[data-panel]').forEach(btn=>{
      const protectedMenu=isProtected(btn.dataset.panel,btn);
      if(!protectedMenu){btn.classList.remove('ly-protected-menu','ly-protected-unlocked');const mark=btn.querySelector('.ly-menu-lock-mark');if(mark)mark.remove();return;}
      btn.classList.add('ly-protected-menu');btn.classList.toggle('ly-protected-unlocked',isUnlocked());
      let mark=btn.querySelector('.ly-menu-lock-mark');
      if(!state.enabled){if(mark)mark.remove();return;}
      if(!mark){mark=document.createElement('span');mark.className='ly-menu-lock-mark';btn.appendChild(mark);}
      updateMark(mark,isUnlocked());
    });
  }

  function notify(msg,ok=true){try{window.__lyInAppNotifications?.show?.(msg,ok?'Bảo mật':'Không thể thực hiện',false,ok?'🔐':'⚠️');}catch(e){}}

  function ensureModal(){
    let ov=document.getElementById('lyMenuSecurityOverlay');if(ov)return ov;
    ov=document.createElement('div');ov.id='lyMenuSecurityOverlay';ov.className='ly-security-overlay';
    ov.innerHTML=`<div class="ly-security-modal" role="dialog" aria-modal="true" aria-label="Nhập mật khẩu"><div class="ly-security-modal-head"><div class="ly-security-modal-icon">${lockSvg(false)}</div><div><div class="ly-security-modal-title">Khu vực được bảo vệ</div><div class="ly-security-modal-sub">Nhập mật khẩu để mở khóa trong 10 phút.</div></div></div><div class="ly-security-input-wrap"><label>Mật khẩu</label><input id="lyMenuSecurityPassword" class="ly-security-input" type="password" autocomplete="current-password" maxlength="64" placeholder="Nhập mật khẩu"><div id="lyMenuSecurityError" class="ly-security-error"></div></div><div class="ly-security-modal-actions"><button id="lyMenuSecurityCancel" class="ly-security-btn" type="button">Hủy</button><button id="lyMenuSecuritySubmit" class="ly-security-btn primary" type="button">Mở khóa</button></div></div>`;
    ov.addEventListener('click',e=>{if(e.target===ov)closeModal();});
    ov.querySelector('#lyMenuSecurityCancel').onclick=closeModal;
    ov.querySelector('#lyMenuSecuritySubmit').onclick=verifyFromModal;
    ov.querySelector('#lyMenuSecurityPassword').addEventListener('keydown',e=>{if(e.key==='Enter')verifyFromModal();});
    document.body.appendChild(ov);return ov;
  }

  function openModal(panel,btn){state.pending={panel,btn};const ov=ensureModal(),input=ov.querySelector('#lyMenuSecurityPassword'),err=ov.querySelector('#lyMenuSecurityError');if(err)err.textContent='';if(input){input.value='';setTimeout(()=>input.focus(),30);}ov.classList.add('open');}
  function closeModal(){document.getElementById('lyMenuSecurityOverlay')?.classList.remove('open');state.pending=null;}

  async function verifyFromModal(){
    const client=getClient(),input=document.getElementById('lyMenuSecurityPassword'),err=document.getElementById('lyMenuSecurityError'),submit=document.getElementById('lyMenuSecuritySubmit');if(!client||!input)return;
    const password=input.value;if(!password){if(err)err.textContent='Vui lòng nhập mật khẩu.';return;}
    if(submit){submit.disabled=true;submit.textContent='Đang kiểm tra…';}
    try{
      const {data,error}=await withTimeout(client.rpc('ly_verify_menu_password',{p_password:password}),'Xác minh mật khẩu');
      if(error)throw error;if(data!==true){if(err)err.textContent='Mật khẩu không đúng.';input.select();return;}
      state.unlockUntil=Date.now()+UNLOCK_MS;const pending=state.pending;document.getElementById('lyMenuSecurityOverlay')?.classList.remove('open');state.pending=null;markMenus();renderSettingsCard();notify('Đã mở khóa các menu được bảo vệ trong 10 phút.');if(pending)state.baseShowTab?.call(window,pending.panel,pending.btn);
    }catch(e){if(err)err.textContent='Không thể xác minh lúc này. Vui lòng thử lại.';console.warn('[Lát Yên] menu password verify',e);}finally{if(submit?.isConnected){submit.disabled=false;submit.textContent='Mở khóa';}}
  }

  async function loadStatus(force=false){
    if(state.loaded&&!force)return state.enabled;const client=getClient();if(!client)return state.enabled;
    try{
      const {data,error}=await withTimeout(client.rpc('ly_menu_password_status'),'Kiểm tra trạng thái mật khẩu');if(error)throw error;
      const row=Array.isArray(data)?data[0]:data;state.enabled=typeof row==='boolean'?row:!!row?.enabled;state.loaded=true;
      try{localStorage.setItem(ENABLE_CACHE,state.enabled?'1':'0');}catch(e){}if(!state.enabled)state.unlockUntil=0;markMenus();renderSettingsCard();return state.enabled;
    }catch(e){console.warn('[Lát Yên] menu password status',e);return state.enabled;}
  }

  function getSettingsPanel(){
    const direct=document.getElementById('settings');if(direct)return direct;
    const candidates=[...document.querySelectorAll('section,.panel,.tab-content,main>div,main section,main')];
    return candidates.find(el=>{const t=norm(el.innerText||'');return /Cloud\s*&\s*tài khoản/i.test(t)&&/Nhận diện phần mềm/i.test(t);})||null;
  }

  function ensureSettingsCard(){
    injectStyles();const panel=getSettingsPanel();if(!panel)return null;
    let card=document.getElementById('lyMenuSecuritySettings');if(card&&!panel.contains(card)){card.remove();card=null;}
    if(!card){card=document.createElement('div');card.id='lyMenuSecuritySettings';card.className='card ly-security-card';panel.appendChild(card);}return card;
  }

  function renderSettingsCard(){
    const card=ensureSettingsCard();if(!card)return;const unlocked=isUnlocked();
    card.innerHTML=`<div class="ly-security-head"><div class="ly-security-icon">${lockSvg(unlocked)}</div><div class="ly-security-copy"><div class="ly-security-title">Bảo vệ menu bằng mật khẩu</div><div class="ly-security-desc">Áp dụng cho Nguyên liệu & dụng cụ, Thực đơn & công thức, Báo cáo tài chính, Nhân viên, Kho / Chi nhánh và Lịch sử hoạt động.</div><span class="ly-security-status ${state.enabled?(unlocked?'unlocked':'on'):''}">${!state.loaded?'Đang kiểm tra…':!state.enabled?'Chưa thiết lập':unlocked?'Đang mở khóa tạm thời':'Đang bảo vệ'}</span></div></div><div class="ly-security-fields">${state.enabled?'<label>Mật khẩu hiện tại<input id="lySecCurrent" type="password" maxlength="64" autocomplete="current-password" placeholder="Mật khẩu hiện tại"></label>':''}<label>Mật khẩu mới<input id="lySecNew" type="password" maxlength="64" autocomplete="new-password" placeholder="Tối thiểu 4 ký tự"></label><label>Xác nhận mật khẩu<input id="lySecConfirm" type="password" maxlength="64" autocomplete="new-password" placeholder="Nhập lại mật khẩu"></label></div><div class="ly-security-actions"><button id="lySecSave" class="primary" type="button">${state.enabled?'Đổi mật khẩu':'Thiết lập mật khẩu'}</button>${state.enabled?'<button id="lySecLockNow" type="button">Khóa ngay</button><button id="lySecDisable" class="danger" type="button">Tắt bảo vệ</button>':''}</div><div class="ly-security-note">Mật khẩu được băm và lưu trong vùng private của Supabase. Mở khóa có hiệu lực 10 phút trên thiết bị hiện tại và tự khóa lại khi hết thời gian hoặc tải lại app.</div>`;
    card.querySelector('#lySecSave')?.addEventListener('click',savePassword);
    card.querySelector('#lySecLockNow')?.addEventListener('click',()=>{state.unlockUntil=0;markMenus();renderSettingsCard();notify('Đã khóa lại các menu được bảo vệ.');});
    card.querySelector('#lySecDisable')?.addEventListener('click',disablePassword);
  }

  function ensureSettingsRendered(){const card=ensureSettingsCard();if(card&&!card.querySelector('.ly-security-title'))renderSettingsCard();}
  function scheduleUiRefresh(){
    if(state.uiTimer)return;state.uiTimer=setTimeout(()=>{state.uiTimer=null;installGuard();ensureSettingsRendered();markMenus();},80);
  }

  async function savePassword(){
    const client=getClient(),cur=document.getElementById('lySecCurrent'),nw=document.getElementById('lySecNew'),cf=document.getElementById('lySecConfirm'),btn=document.getElementById('lySecSave');if(!client||!nw||!cf)return;
    const next=nw.value,confirm=cf.value,current=cur?.value||'';
    if(next.length<4){notify('Mật khẩu cần ít nhất 4 ký tự.',false);nw.focus();return;}
    if(next!==confirm){notify('Xác nhận mật khẩu chưa khớp.',false);cf.focus();return;}
    if(state.enabled&&!current){notify('Vui lòng nhập mật khẩu hiện tại.',false);cur?.focus();return;}
    if(btn){btn.disabled=true;btn.textContent='Đang lưu…';}
    try{
      const {data,error}=await withTimeout(client.rpc('ly_set_menu_password',{p_new_password:next,p_current_password:current||null}),'Lưu mật khẩu');
      if(error)throw error;if(data!==true){notify('Mật khẩu hiện tại không đúng.',false);return;}
      state.enabled=true;state.loaded=true;try{localStorage.setItem(ENABLE_CACHE,'1');}catch(e){}state.unlockUntil=0;renderSettingsCard();markMenus();notify('Đã cập nhật mật khẩu bảo vệ menu.');
    }catch(e){console.warn('[Lát Yên] set menu password',e);notify(e?.message?.includes('quá thời gian')?'Lưu mật khẩu quá thời gian chờ. Hãy thử lại.':'Không thể lưu mật khẩu. Kiểm tra quyền quản trị và thử lại.',false);loadStatus(true);}
    finally{if(btn?.isConnected){btn.disabled=false;btn.textContent=state.enabled?'Đổi mật khẩu':'Thiết lập mật khẩu';}}
  }

  async function disablePassword(){
    const client=getClient(),cur=document.getElementById('lySecCurrent');if(!client||!cur)return;const current=cur.value;if(!current){notify('Nhập mật khẩu hiện tại để tắt bảo vệ.',false);cur.focus();return;}
    try{
      const {data,error}=await withTimeout(client.rpc('ly_disable_menu_password',{p_current_password:current}),'Tắt bảo vệ');if(error)throw error;if(data!==true){notify('Mật khẩu hiện tại không đúng.',false);return;}
      state.enabled=false;state.loaded=true;try{localStorage.setItem(ENABLE_CACHE,'0');}catch(e){}state.unlockUntil=0;renderSettingsCard();markMenus();notify('Đã tắt bảo vệ menu.');
    }catch(e){console.warn('[Lát Yên] disable menu password',e);notify('Không thể tắt bảo vệ lúc này.',false);}
  }

  function installGuard(){
    if(typeof window.showTab!=='function')return;if(window.showTab===state.guard)return;
    state.baseShowTab=window.showTab;
    state.guard=function(id,btn){
      const panel=text(id),button=btn||protectedButtonForPanel(panel);
      if(!isProtected(panel,button))return state.baseShowTab.apply(this,arguments);
      if(isUnlocked())return state.baseShowTab.apply(this,arguments);
      if(!state.loaded){loadStatus(true).then(enabled=>{if(!enabled)state.baseShowTab?.call(window,panel,button);else openModal(panel,button);});return false;}
      if(!state.enabled)return state.baseShowTab.apply(this,arguments);openModal(panel,button);return false;
    };
    window.showTab=state.guard;
  }

  function start(){
    injectStyles();installGuard();ensureModal();renderSettingsCard();loadStatus(true);markMenus();
    state.observer?.disconnect();state.observer=new MutationObserver(()=>scheduleUiRefresh());state.observer.observe(document.body,{subtree:true,childList:true});
    clearInterval(state.timer);state.timer=setInterval(()=>{installGuard();markMenus();ensureSettingsRendered();if(state.enabled&&state.unlockUntil&&Date.now()>=state.unlockUntil){state.unlockUntil=0;markMenus();renderSettingsCard();}},1200);
  }

  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.__lyMenuSecurity={version:VERSION,status:()=>({version:VERSION,enabled:state.enabled,loaded:state.loaded,unlocked:isUnlocked(),unlockUntil:state.unlockUntil}),lock:()=>{state.unlockUntil=0;markMenus();renderSettingsCard();},refresh:()=>loadStatus(true)};
})();
