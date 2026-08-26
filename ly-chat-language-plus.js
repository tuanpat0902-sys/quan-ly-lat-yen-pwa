(()=>{
  'use strict';
  const VERSION='2026.08.27.2';
  if(window.__lyChatLanguagePlus?.version===VERSION)return;

  const fold=value=>String(value??'').trim().toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9.,:/%\-\s]/g,' ').replace(/\s+/g,' ').trim();
  const REPORT_SIGNALS=/(bao cao|thong ke|tong quan|doanh thu|doanh so|tien ban|tong ban|ban ra|ton kho|thu chi|tien vao tien ra|thu vao chi ra|dong tien|chi phi|nhap xuat|ban chay|top mon|mon chay nhat|mon ban nhieu nhat|loi nhuan|lai nhuan|lai rong|lai lo|profit|bang luong|quy luong|tien luong|luong nhan vien|luong nv)/;
  const TIME_ONLY=/(bua nay|bua qua|tuan roi|thang roi|quy roi|nam ngoai|tuan trc|thang trc|hom qia|hom qua|tuan truoc|thang truoc|quy truoc|nam truoc)/;
  const EXPLICIT_MUTATION=/^(?:(?:hay|vui long|giup|minh|toi|cho)\s+){0,4}(tao|tap|lap|them|moi|sua|cap nhat|chinh|xoa|huy)\b/;
  const QUANTITY_DRAFT=/^(ban|nhap|xuat)\b[^\n]*\b\d+(?:[.,]\d+)?\s*(?:kg|g|ml|l|lit|chai|goi|hop|cai|chiec|phan|suat|ly|coc|cup|dia)?\b/;
  const MAPPINGS=[
    ['doang thu','doanh thu'],['doan thu','doanh thu'],['doanh thuu','doanh thu'],['doanh so','doanh thu'],['tien ban','doanh thu'],['tong ban','doanh thu'],['ban ra','doanh thu'],
    ['ton khp','tồn kho'],['ton khoo','tồn kho'],
    ['tien vao tien ra','thu chi'],['thu vao chi ra','thu chi'],
    ['top mon','món bán chạy'],['mon chay nhat','món bán chạy'],['mon ban nhieu nhat','món bán chạy'],
    ['lai nhuan','lợi nhuận'],['loi nhan','lợi nhuận'],['profit','lợi nhuận'],
    ['luong nv','lương nhân viên'],
    ['bua nay','hôm nay'],['bua qua','hôm qua'],['hom qia','hôm qua'],['tuan roi','tuần trước'],['thang roi','tháng trước'],['quy roi','quý trước'],['nam ngoai','năm trước'],['tuan trc','tuần trước'],['thang trc','tháng trước']
  ];

  function wordSpans(raw){const spans=[];for(const match of String(raw).matchAll(/[\p{L}\p{M}0-9]+/gu))spans.push({raw:match[0],folded:fold(match[0]),start:match.index,end:Number(match.index)+match[0].length});return spans;}
  function replacePhrase(raw,target,replacement){const targetWords=fold(target).split(' ').filter(Boolean);if(!targetWords.length)return raw;let result=String(raw),searchFrom=0;while(true){const spans=wordSpans(result).filter(row=>row.end>searchFrom);let found=null;for(let i=0;i<=spans.length-targetWords.length;i++){const slice=spans.slice(i,i+targetWords.length);if(slice.every((row,index)=>row.folded===targetWords[index])){found=slice;break;}}if(!found)break;const start=found[0].start,end=found.at(-1).end;result=result.slice(0,start)+replacement+result.slice(end);searchFrom=start+replacement.length;}return result;}
  function normalizeMessage(value){const original=String(value??'').trim();if(!original)return original;const source=fold(original);if(EXPLICIT_MUTATION.test(source)||QUANTITY_DRAFT.test(source))return original;const shouldNormalize=REPORT_SIGNALS.test(source)||TIME_ONLY.test(source);if(!shouldNormalize)return original;let output=original;for(const [target,replacement] of MAPPINGS)output=replacePhrase(output,target,replacement);return output.replace(/\s+/g,' ').trim();}
  function rewriteInput(){const input=document.getElementById?.('lyAssistantInput');if(!input?.value)return;const normalized=normalizeMessage(input.value);if(normalized!==input.value){input.value=normalized;input.dispatchEvent(new Event('input',{bubbles:true}));}}
  function loadInventoryQueries(){if(window.__lyChatInventoryQuery?.version==='2026.08.27.1')return true;if(!document?.createElement||document.querySelector?.('script[data-ly-chat-inventory-query]'))return false;const script=document.createElement('script');script.src='./ly-chat-inventory-query.js?v=20260827.1';script.async=true;script.dataset.lyChatInventoryQuery='1';(document.head||document.documentElement)?.appendChild?.(script);return true;}
  function loadSalesQueries(){if(window.__lyChatSalesQuery?.version==='2026.08.27.1')return true;if(!document?.createElement||document.querySelector?.('script[data-ly-chat-sales-query]'))return false;const script=document.createElement('script');script.src='./ly-chat-sales-query.js?v=20260827.1';script.async=true;script.dataset.lyChatSalesQuery='1';(document.head||document.documentElement)?.appendChild?.(script);return true;}
  function patchAssistant(){const assistant=window.__lyLocalAssistant;if(!assistant||assistant.__lyLanguagePlusPatched)return false;for(const key of ['assistantReply','reportReply','contextualReportMessage']){const original=typeof assistant[key]==='function'?assistant[key].bind(assistant):null;if(!original)continue;assistant[key]=(message,...rest)=>original(normalizeMessage(message),...rest);}const originalStatus=typeof assistant.status==='function'?assistant.status.bind(assistant):()=>({});assistant.status=()=>({...originalStatus(),languagePlus:VERSION,vietnameseNormalization:true});assistant.__lyLanguagePlusPatched=true;return true;}
  function sync(){patchAssistant();loadInventoryQueries();loadSalesQueries();}
  document.addEventListener('click',event=>{if(event.target?.closest?.('#lyAssistantDrawer [data-assistant-send]'))rewriteInput();},true);document.addEventListener('keydown',event=>{if(event.target?.id==='lyAssistantInput'&&event.key==='Enter'&&!event.shiftKey)rewriteInput();},true);window.addEventListener('latyen:hydrated',sync);window.addEventListener('latyen:v2-hydrated',sync);sync();
  const timer=setInterval(()=>{if(patchAssistant())clearInterval(timer);},250);setTimeout(()=>clearInterval(timer),30000);
  window.__lyChatLanguagePlus={version:VERSION,normalizeMessage,rewriteInput,loadInventoryQueries,loadSalesQueries,sync,status:()=>({version:VERSION,enabled:true,mappings:MAPPINGS.length,inventoryQueries:Boolean(window.__lyChatInventoryQuery),salesQueries:Boolean(window.__lyChatSalesQuery)})};
})();