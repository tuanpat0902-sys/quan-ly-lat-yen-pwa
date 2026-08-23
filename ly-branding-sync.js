(()=>{
  'use strict';
  if(window.__lyBrandingSyncV2)return;
  window.__lyBrandingSyncV2=true;

  const VERSION='2026.08.24.1';
  const DEFAULT_NAME='QUẢN LÝ LÁT YÊN';
  const state={orgId:'',row:null,channel:null,startTimer:null,saving:false,applying:false,seedAttempted:false};
  const text=v=>String(v??'').trim();
  const stripVersion=v=>text(v).replace(/\s*(?:·|-)\s*Ver\s+\d+\.\d+\.\d+\s*$/i,'').trim();
  const getClient=()=>{try{if(typeof sb!=='undefined'&&sb?.from&&sb?.channel)return sb;}catch(e){}return null;};

  function findBrandingCard(){
    const root=document.getElementById('settings')||document.querySelector('main')||document.body;
    const cards=[...root.querySelectorAll('.card,section,article')];
    return cards.find(el=>/Nhận diện phần mềm/i.test(text(el.textContent))&&(/Tên phần mềm/i.test(text(el.textContent))||el.querySelector('input[type="text"]')))||null;
  }

  function cardParts(card=findBrandingCard()){
    if(!card)return {};
    const buttons=[...card.querySelectorAll('button')];
    return {card,nameInput:card.querySelector('input[type="text"],input:not([type])'),preview:card.querySelector('img'),fileInput:card.querySelector('input[type="file"]'),save:buttons.find(b=>/^Lưu$/i.test(text(b.textContent))),change:buttons.find(b=>/Thay logo/i.test(text(b.textContent))),remove:buttons.find(b=>/^Xóa$/i.test(text(b.textContent)))};
  }

  function blobToData(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=reject;r.readAsDataURL(blob);});}
  async function compressBlob(blob){
    const url=URL.createObjectURL(blob);try{
      const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=url;});
      const scale=Math.min(1,512/Math.max(img.naturalWidth||1,img.naturalHeight||1));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.naturalWidth*scale));c.height=Math.max(1,Math.round(img.naturalHeight*scale));c.getContext('2d').drawImage(img,0,0,c.width,c.height);let out=c.toDataURL('image/webp',.84);if(out.length>1450000)out=c.toDataURL('image/jpeg',.78);return out;
    }finally{URL.revokeObjectURL(url);}
  }
  async function imageSourceToData(src){
    src=text(src);if(!src||src==='about:blank')return null;if(src.startsWith('data:')&&src.length<=1450000)return src;
    try{const blob=await (await fetch(src,{cache:'no-store'})).blob();if(blob.size<=1050000)return await blobToData(blob);return await compressBlob(blob);}catch(e){return /^https?:/i.test(src)&&src.length<1400?src:null;}
  }

  function logoTargets(card){
    const targets=new Set(),roots=[document.querySelector('header'),document.getElementById('nav'),document.querySelector('aside'),document.querySelector('.sidebar')].filter(Boolean);
    roots.forEach(root=>root.querySelectorAll('img').forEach(img=>{const key=`${img.id} ${img.className} ${img.alt} ${img.title}`.toLowerCase();if(/logo|brand|app-logo|identity/.test(key)||(root.querySelectorAll('img').length===1))targets.add(img);}));
    document.querySelectorAll('img[id*="logo" i],img[class*="logo" i],img[alt*="logo" i]').forEach(img=>{if(!card?.contains(img))targets.add(img);});return [...targets];
  }
  function nameTargets(oldName){
    const roots=[document.querySelector('header'),document.getElementById('nav'),document.querySelector('aside'),document.querySelector('.sidebar')].filter(Boolean),names=new Set([stripVersion(oldName),DEFAULT_NAME].filter(Boolean).map(x=>x.toLowerCase())),out=[];
    roots.forEach(root=>root.querySelectorAll('span,div,strong,b,h1,h2,h3,p').forEach(el=>{if(el.children.length)return;const value=stripVersion(el.textContent);if(value&&names.has(value.toLowerCase()))out.push(el);}));return out;
  }
  function remountAppVersion(){
    try{
      if(window.__lyAppVersion?.mount){window.__lyAppVersion.mount();return;}
      if(document.querySelector('script[data-ly-app-version-loader]'))return;
      const s=document.createElement('script');s.src='./ly-app-version.js?v=2.0.3';s.async=false;s.dataset.lyAppVersionLoader='1';s.onload=()=>window.__lyAppVersion?.mount?.();(document.head||document.documentElement||document.body)?.appendChild(s);
    }catch(e){}
  }

  function applyBranding(row){
    if(!row)return;const name=text(row.software_name)||DEFAULT_NAME,logo=text(row.logo_data),parts=cardParts(),oldName=stripVersion(state.row?.software_name)||stripVersion(parts.nameInput?.value)||DEFAULT_NAME;state.applying=true;
    try{
      if(parts.nameInput&&parts.nameInput.value!==name)parts.nameInput.value=name;
      if(parts.preview){const current=parts.preview.getAttribute('src')||'';if(logo&&current!==logo){parts.preview.src=logo;parts.preview.style.display='';}if(!logo&&current){parts.preview.removeAttribute('src');parts.preview.style.display='none';}}
      nameTargets(oldName).forEach(el=>{if(stripVersion(el.textContent)!==name||text(el.textContent)!==name)el.textContent=name;});
      logoTargets(parts.card).forEach(img=>{const current=img.getAttribute('src')||'';if(logo&&current!==logo){img.src=logo;img.style.display='';}if(!logo&&current)img.removeAttribute('src');});
      if(document.title&&[oldName,DEFAULT_NAME].map(x=>x.toLowerCase()).includes(stripVersion(document.title).toLowerCase()))document.title=name;
      state.row={...row,software_name:name,logo_data:logo||null};
      try{window.dispatchEvent(new CustomEvent('latyen:branding-updated',{detail:{softwareName:name}}));}catch(e){}
      setTimeout(remountAppVersion,0);
    }finally{state.applying=false;}
  }

  async function currentPayload(forceLogo){
    const parts=cardParts(),software_name=text(parts.nameInput?.value)||text(state.row?.software_name)||DEFAULT_NAME;let logo_data;
    if(forceLogo===null)logo_data=null;else if(forceLogo!==undefined)logo_data=forceLogo;else{const src=parts.preview?.getAttribute('src')||parts.preview?.src||state.row?.logo_data||'';logo_data=await imageSourceToData(src);}return {software_name,logo_data:logo_data||null};
  }
  async function persist(forceLogo){
    if(state.applying||state.saving||!state.orgId)return false;const client=getClient();if(!client)return false;state.saving=true;
    try{const payload=await currentPayload(forceLogo);let userId=null;try{const {data}=await client.auth.getUser();userId=data?.user?.id||null;}catch(e){}const row={org_id:state.orgId,...payload,updated_at:new Date().toISOString(),updated_by:userId};const {data,error}=await client.from('ly_org_branding').upsert(row,{onConflict:'org_id'}).select('org_id,software_name,logo_data,updated_at,updated_by').single();if(error)throw error;applyBranding(data||row);return true;}catch(e){console.warn('[Lát Yên] branding save',e);return false;}finally{state.saving=false;}
  }
  async function seedIfNeeded(){if(state.seedAttempted||state.row||!state.orgId)return;const parts=cardParts();if(!parts.card)return;state.seedAttempted=true;await persist(undefined);}
  async function load(){
    const client=getClient(),org=text(window.__lyFreshOrgId||'');if(!client||!org){clearTimeout(state.startTimer);state.startTimer=setTimeout(start,800);return;}
    if(state.orgId!==org){stopChannel();state.orgId=org;state.row=null;state.seedAttempted=false;}
    try{const {data,error}=await client.from('ly_org_branding').select('org_id,software_name,logo_data,updated_at,updated_by').eq('org_id',org).maybeSingle();if(error)throw error;if(data)applyBranding(data);else await seedIfNeeded();}catch(e){console.warn('[Lát Yên] branding load',e);}
  }
  function stopChannel(){const c=getClient();if(c&&state.channel){try{c.removeChannel(state.channel);}catch(e){}}state.channel=null;}
  function ensureChannel(){
    const client=getClient();if(!client||!state.orgId||state.channel)return;let ch=client.channel(`latyen-branding-v2-${state.orgId}-${Math.random().toString(36).slice(2,7)}`);ch=ch.on('postgres_changes',{event:'*',schema:'public',table:'ly_org_branding',filter:`org_id=eq.${state.orgId}`},payload=>{if(payload.eventType==='DELETE'){state.row=null;return;}applyBranding(payload.new||{});});state.channel=ch;ch.subscribe();
  }
  async function start(){await load();ensureChannel();if(state.row)applyBranding(state.row);else remountAppVersion();}

  function isInsideBranding(target){const card=findBrandingCard();return !!(card&&target&&card.contains(target));}
  function isSettingsButton(target){const b=target?.closest?.('#nav button[data-panel],button[data-panel]');if(!b)return false;const id=text(b.dataset.panel).toLowerCase(),label=text(b.textContent).toLowerCase();return id==='settings'||label.includes('cài đặt');}
  function installEvents(){
    document.addEventListener('click',e=>{
      if(isSettingsButton(e.target)){setTimeout(()=>{if(state.row)applyBranding(state.row);else start();},180);return;}
      if(!isInsideBranding(e.target))return;const button=e.target.closest('button');if(!button)return;const label=text(button.textContent);if(/^Lưu$/i.test(label))setTimeout(()=>persist(undefined),80);else if(/^Xóa$/i.test(label))setTimeout(()=>persist(null),80);
    },true);
    document.addEventListener('change',e=>{if(!isInsideBranding(e.target))return;const input=e.target;if(input?.matches?.('input[type="file"]'))setTimeout(()=>persist(undefined),250);},true);
    window.addEventListener('focus',()=>{if(state.row)applyBranding(state.row);else remountAppVersion();});
  }
  function boot(){installEvents();start();setTimeout(remountAppVersion,300);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.__lyBrandingSync={version:VERSION,refresh:start,save:()=>persist(undefined),status:()=>({version:VERSION,orgId:state.orgId,hasCloudRow:!!state.row,softwareName:state.row?.software_name||''})};
})();
