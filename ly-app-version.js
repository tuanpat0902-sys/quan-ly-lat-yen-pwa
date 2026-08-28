(()=>{
  'use strict';
  const VERSION='3.0.12',REVISION='fresh-core-v3-shell-authoritative-v14',UI_BUILD='UI-2026.08.28.8';
  if(window.__lyAppVersion?.version===VERSION&&window.__lyAppVersion?.revision===REVISION&&window.__lyAppVersion?.uiBuild===UI_BUILD)return;
  const LABEL=`Ver ${VERSION} · ${UI_BUILD}`,STORAGE_KEY='lat_yen_last_seen_app_version';
  const state={version:VERSION,revision:REVISION,uiBuild:UI_BUILD,label:LABEL,mounted:false,updateNoticeShown:false};
  function mount(){const name=document.getElementById?.('appNameText');if(!name)return false;let badge=document.getElementById?.('appVersionStatic');if(!badge){badge=document.createElement?.('span');if(!badge)return false;badge.id='appVersionStatic';badge.className='badge';name.insertAdjacentElement?.('afterend',badge);}badge.textContent=LABEL;badge.setAttribute?.('data-ly-app-version',VERSION);badge.setAttribute?.('data-ly-ui-build',UI_BUILD);state.mounted=true;return true;}
  function ensureScript(globalTest,src,key){if(globalTest())return true;if(document.querySelector?.(`script[data-ly-bootstrap="${key}"]`))return true;const script=document.createElement?.('script');if(!script)return false;script.src=src;script.async=true;script.dataset.lyBootstrap=key;script.onerror=()=>script.remove?.();(document.head||document.documentElement).appendChild(script);return true;}
  const ensureUIStability=()=>ensureScript(()=>window.__lyUIStability?.version==='2026.08.28.4','./ly-ui-stability.js?v=20260828.4','ui-stability');
  const ensureUIFormErgonomics=()=>ensureScript(()=>window.__lyUIFormErgonomics?.version==='2026.08.28.2','./ly-ui-form-ergonomics.js?v=20260828.2','ui-form-ergonomics');
  const ensureUIDesignSystem=()=>ensureScript(()=>window.__lyUIDesignSystem?.version==='2026.08.28.2','./ly-ui-design-system.js?v=20260828.2','ui-design-system');
  const ensureUITableErgonomics=()=>ensureScript(()=>window.__lyUITableErgonomics?.version==='2026.08.28.2','./ly-ui-table-ergonomics.js?v=20260828.2','ui-table-ergonomics');
  const ensureUISalesWorkflow=()=>ensureScript(()=>window.__lyUISalesWorkflow?.version==='2026.08.28.3','./ly-ui-sales-workflow.js?v=20260828.3','ui-sales-workflow');
  const ensurePanelLazyRenderRecovery=()=>ensureScript(()=>window.__lyPanelLazyRenderRecovery?.version==='2026.08.28.1','./ly-panel-lazy-render-recovery.js?v=20260828.1','panel-lazy-render-recovery');
  function ensureEmployeesParityRunner(){if(window.__lyFreshCoreV3EmployeesParityRunner){try{window.__lyFreshCoreV3EmployeesParityRunner.render?.();}catch(e){}return true;}if(document.querySelector?.('script[data-ly-bootstrap="v3-6-employees-parity"]'))return true;const script=document.createElement?.('script');if(!script)return false;script.src='./ly-fresh-core-v3-employees-parity-runner.js?v=20260828.3';script.async=true;script.dataset.lyBootstrap='v3-6-employees-parity';script.onload=()=>{try{window.__lyFreshCoreV3EmployeesParityRunner?.render?.();}catch(e){}};script.onerror=()=>script.remove?.();(document.head||document.documentElement).appendChild(script);return true;}
  function previousVersion(){try{return localStorage.getItem(STORAGE_KEY)||'';}catch(e){return '';}}
  function rememberVersion(){try{localStorage.setItem(STORAGE_KEY,`${VERSION}|${UI_BUILD}`);}catch(e){}}
  function showUpdateNotice(){if(state.updateNoticeShown)return true;const previous=previousVersion();if(previous===`${VERSION}|${UI_BUILD}`)return true;const notifications=window.__lyInAppNotifications;if(typeof notifications?.show!=='function')return false;notifications.show(`Đã cập nhật lên ${LABEL}. Các bảng dài có cuộn dọc giới hạn chiều cao và sticky header trên máy tính; cách hiển thị ngang tối ưu hiện tại được giữ nguyên.`,'Quản Lý Lát Yên',false,'✨');rememberVersion();state.updateNoticeShown=true;return true;}
  function ensureUILayers(){ensureUIStability();ensureUIFormErgonomics();ensureUIDesignSystem();ensureUITableErgonomics();ensureUISalesWorkflow();ensurePanelLazyRenderRecovery();}
  function boot(){ensureUILayers();mount();ensureEmployeesParityRunner();if(!showUpdateNotice())setTimeout(showUpdateNotice,600);}
  window.__LY_APP_VERSION=VERSION;window.__LY_APP_VERSION_LABEL=LABEL;window.__LY_UI_BUILD=UI_BUILD;
  window.__lyAppVersion={version:VERSION,revision:REVISION,uiBuild:UI_BUILD,label:LABEL,mount,status:()=>({...state})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  [0,50,250,800,1800,3500,6000].forEach(delay=>setTimeout(()=>{ensureUILayers();mount();ensureEmployeesParityRunner();},delay));
  window.addEventListener?.('focus',()=>{ensureUILayers();mount();ensureEmployeesParityRunner();});
  window.addEventListener?.('latyen:branding-updated',()=>setTimeout(mount,0));
})();