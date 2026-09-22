(()=>{
  'use strict';
  if(window.__lyUIFormErgonomics?.version==='2026.09.22.2')return;
  const VERSION='2026.09.22.2';
  const STYLE_ID='lyUiFormErgonomicsStyle';
  const CSS=`
:where(.form-grid,.toolbar,.modal-box,.card)>*{min-width:0}
:where(.form-grid){align-items:start}
:where(.form-grid)>label,:where(.form-grid)>.field,:where(.form-grid)>.form-field{display:grid;gap:6px;align-content:start}
:where(input,select,textarea)::placeholder{color:#98a2b3;opacity:1}
:where(input,select,textarea){min-height:40px;padding-inline:11px}
:where(textarea){padding-block:9px;resize:vertical}
:where(input,select,textarea)[aria-invalid="true"],:where(input,select,textarea).is-invalid{border-color:#f04438!important;box-shadow:0 0 0 3px rgba(240,68,56,.10)!important;background:#fffafa}
@supports selector(input:user-invalid){:where(input,select,textarea):user-invalid{border-color:#f04438;box-shadow:0 0 0 3px rgba(240,68,56,.08)}}
:where([role="alert"],.field-error,.error-text,.form-error){color:#b42318;font-size:12px;line-height:1.4;overflow-wrap:anywhere;font-weight:560}
:where(.field-help,.help-text){color:#667085;font-size:12px;line-height:1.45}
:where([aria-disabled="true"]){cursor:not-allowed;opacity:.58}
:where(input,select,textarea):disabled{background:#f2f4f7;color:#667085}
:where(.notice,.warnbox,.empty){width:100%;max-width:100%;box-sizing:border-box}
:where(.card,.modal-box,.warnbox,.notice,.empty)>:last-child{margin-bottom:0}
:where(.card,.modal-box)>:first-child{margin-top:0}
:where(.receipt-modal-actions,.modal-title-row,.modal-head,.toolbar){min-width:0}
:where(.receipt-modal-actions,.toolbar) button{white-space:normal;text-wrap:balance}
:where(.receipt-modal-actions){justify-content:flex-end;align-items:center}
:where(.receipt-modal-actions)>button{min-width:96px}
:where(.toolbar){flex-wrap:wrap}
:where(.toolbar)>input,:where(.toolbar)>select{flex:1 1 180px}
:where(.toolbar)>button{flex:0 0 auto}
:where(details){border-radius:10px}
details>summary{min-height:38px;display:flex;align-items:center;gap:8px;outline-offset:2px;font-weight:650;cursor:pointer}
:where(input[type="checkbox"],input[type="radio"]){min-height:18px;min-width:18px;accent-color:var(--primary,#0f766e)}
:where(.recipe-line){align-items:end}
#imports .inline-import-form .import-lines-scroll{width:100%;max-width:100%;overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;scrollbar-gutter:stable}
#imports .inline-import-form :is(.import-receipt-columns,.import-receipt-line){grid-template-columns:36px minmax(190px,1.65fr) 64px minmax(150px,1.15fr) 78px 142px 92px 66px 105px 110px 30px!important}
#imports .inline-import-form :is(.irQty,.irConvertedQty,.irUnitCost,.irLineTotal){text-align:right!important;font-variant-numeric:tabular-nums}
#imports .inline-import-form :is(.irConversionRatio,.irConvertedQty,.irConvertedUnit){white-space:nowrap}
@media(min-width:701px){
  #imports .inline-import-form .import-lines-scroll>.import-receipt-columns,#imports .inline-import-form .import-lines-scroll>#importReceiptLines{min-width:1280px}
  #imports .inline-import-form .import-receipt-line .irStt{grid-column:1!important;grid-row:1!important}
  #imports .inline-import-form .import-receipt-line .irIngredient{grid-column:2!important;grid-row:1!important}
  #imports .inline-import-form .import-receipt-line .irUnit{grid-column:3!important;grid-row:1!important}
  #imports .inline-import-form .import-receipt-line .irSupplier{grid-column:4!important;grid-row:1!important}
  #imports .inline-import-form .import-receipt-line .irQty{grid-column:5!important;grid-row:1!important}
  #imports .inline-import-form .import-receipt-line .irConversionRatio{grid-column:6!important;grid-row:1!important}
  #imports .inline-import-form .import-receipt-line .irConvertedQty{grid-column:7!important;grid-row:1!important}
  #imports .inline-import-form .import-receipt-line .irConvertedUnit{grid-column:8!important;grid-row:1!important}
  #imports .inline-import-form .import-receipt-line .irUnitCost{grid-column:9!important;grid-row:1!important}
  #imports .inline-import-form .import-receipt-line .irLineTotal{grid-column:10!important;grid-row:1!important}
  #imports .inline-import-form .import-receipt-line>button{grid-column:11!important;grid-row:1!important}
}
@media(max-width:700px){
  #imports .inline-import-form .import-lines-scroll{overflow:visible}
  #imports .inline-import-form .import-lines-scroll>#importReceiptLines{min-width:0}
  #imports .inline-import-form .import-receipt-line .irQty{grid-column:1/2!important;grid-row:3!important}
  #imports .inline-import-form .import-receipt-line .irConversionRatio{grid-column:2/4!important;grid-row:3!important}
  #imports .inline-import-form .import-receipt-line .irConvertedQty{grid-column:1/2!important;grid-row:4!important}
  #imports .inline-import-form .import-receipt-line .irConvertedUnit{grid-column:2/3!important;grid-row:4!important}
  #imports .inline-import-form .import-receipt-line .irUnitCost{grid-column:3/4!important;grid-row:4!important}
  #imports .inline-import-form .import-receipt-line .irLineTotal{grid-column:2/4!important;grid-row:5!important;align-self:center!important}
  #imports .inline-import-form .import-receipt-line>button{grid-column:3/4!important;grid-row:2!important}
}
@media(max-width:760px){
  :where(.toolbar)>input,:where(.toolbar)>select{flex-basis:220px}
  :where(.toolbar)>button{min-height:42px}
}
@media(max-width:600px){
  .modal.open .modal-box{padding-top:0!important;padding-bottom:0!important}
  .modal.open .modal-head,.modal.open .modal-title-row{position:sticky;top:0;z-index:6;margin:0 -12px 10px!important;padding:11px 12px 9px!important;background:rgba(255,255,255,.97);border-bottom:1px solid #eef2f4;backdrop-filter:blur(10px)}
  .modal.open .receipt-modal-actions{position:sticky;bottom:0;z-index:6;margin:12px -12px 0!important;padding:9px 12px max(9px,env(safe-area-inset-bottom))!important;background:rgba(255,255,255,.97);border-top:1px solid #eef2f4;backdrop-filter:blur(10px)}
  .modal.open .receipt-modal-actions>button{flex:1 1 140px;min-height:44px;min-width:0}
  .form-grid{row-gap:10px!important}
  :where([role="alert"],.field-error,.error-text,.form-error){font-size:13px}
  :where(.field-help,.help-text){font-size:13px}
  details>summary{min-height:44px}
  :where(.toolbar)>input,:where(.toolbar)>select,:where(.toolbar)>button{flex:1 1 100%;width:100%}
}
@media(max-width:430px){
  .modal.open .modal-head,.modal.open .modal-title-row{margin-left:-12px!important;margin-right:-12px!important}
  :where(.receipt-modal-actions){gap:8px}
}
@media(prefers-reduced-motion:reduce){:where(input,select,textarea)[aria-invalid="true"],:where(input,select,textarea).is-invalid{transition:none!important}}
`;
  function mount(){let style=document.getElementById?.(STYLE_ID);if(!style){style=document.createElement?.('style');if(!style)return false;style.id=STYLE_ID;(document.head||document.documentElement)?.appendChild?.(style);}if(style.textContent!==CSS)style.textContent=CSS;return true;}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  window.__lyUIFormErgonomics=Object.freeze({version:VERSION,mount,status:()=>({version:VERSION,mounted:!!document.getElementById?.(STYLE_ID)})});
})();
