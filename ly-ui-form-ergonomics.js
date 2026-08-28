(()=>{
  'use strict';
  if(window.__lyUIFormErgonomics?.version==='2026.08.28.1')return;
  const VERSION='2026.08.28.1';
  const STYLE_ID='lyUiFormErgonomicsStyle';
  const CSS=`
:where(.form-grid,.toolbar,.modal-box,.card)>*{min-width:0}
:where(input,select,textarea)::placeholder{color:#98a2b3;opacity:1}
:where(input,select,textarea)[aria-invalid="true"],:where(input,select,textarea).is-invalid{border-color:#f04438!important;box-shadow:0 0 0 3px rgba(240,68,56,.10)!important}
@supports selector(input:user-invalid){:where(input,select,textarea):user-invalid{border-color:#f04438;box-shadow:0 0 0 3px rgba(240,68,56,.08)}}
:where([role="alert"],.field-error,.error-text,.form-error){color:#b42318;font-size:12px;line-height:1.4;overflow-wrap:anywhere}
:where([aria-disabled="true"]){cursor:not-allowed;opacity:.58}
:where(.notice,.warnbox,.empty){width:100%;max-width:100%;box-sizing:border-box}
:where(.card,.modal-box,.warnbox,.notice,.empty)>:last-child{margin-bottom:0}
:where(.card,.modal-box)>:first-child{margin-top:0}
:where(.receipt-modal-actions,.modal-title-row,.modal-head,.toolbar){min-width:0}
:where(.receipt-modal-actions,.toolbar) button{white-space:normal;text-wrap:balance}
details>summary{min-height:36px;display:flex;align-items:center;gap:8px;outline-offset:2px}
@media(max-width:600px){
  .modal.open .modal-box{padding-top:0!important;padding-bottom:0!important}
  .modal.open .modal-head,.modal.open .modal-title-row{position:sticky;top:0;z-index:6;margin:0 -12px 10px!important;padding:11px 12px 9px!important;background:rgba(255,255,255,.97);border-bottom:1px solid #eef2f4;backdrop-filter:blur(8px)}
  .modal.open .receipt-modal-actions{position:sticky;bottom:0;z-index:6;margin:12px -12px 0!important;padding:9px 12px max(9px,env(safe-area-inset-bottom))!important;background:rgba(255,255,255,.97);border-top:1px solid #eef2f4;backdrop-filter:blur(8px)}
  .modal.open .receipt-modal-actions>button{flex:1 1 140px;min-height:44px}
  .form-grid{row-gap:9px!important}
  :where([role="alert"],.field-error,.error-text,.form-error){font-size:13px}
  details>summary{min-height:44px}
}
@media(prefers-reduced-motion:reduce){:where(input,select,textarea)[aria-invalid="true"],:where(input,select,textarea).is-invalid{transition:none!important}}
`;
  function mount(){
    let style=document.getElementById?.(STYLE_ID);
    if(!style){style=document.createElement?.('style');if(!style)return false;style.id=STYLE_ID;(document.head||document.documentElement)?.appendChild?.(style);}
    if(style.textContent!==CSS)style.textContent=CSS;
    return true;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  window.__lyUIFormErgonomics=Object.freeze({version:VERSION,mount,status:()=>({version:VERSION,mounted:!!document.getElementById?.(STYLE_ID)})});
})();