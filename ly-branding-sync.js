(()=>{
  'use strict';
  if(window.__lyBrandingSyncV1)return;
  window.__lyBrandingSyncV1=true;

  const VERSION='2026.08.23.1';
  const DEFAULT_NAME='QUẢN LÝ LÁT YÊN';
  const state={orgId:'',row:null,channel:null,timer:null,observer:null,cardObserver:null,applying:false,saving:false,saveTimer:null,startTimer:null,boundCard:null};
  const text=v=>String(v??'').trim();
  const getClient=()=>{try{if(typeof sb!=='undefined'&&sb?.from&&sb?.channel)return sb;}catch(e){}return null;};

  function findBrandingCard(){
    const candidates=[...document.querySelectorAll('.card,section,article,div')];
    return candidates.find(el=>{
      const children=[...el.children].slice(0,8).map(x=>text(x.textContent)).join(' ');
      return /Nhận diện phần mềm/i.test(children)&&(/Tên phần mềm/i.test(el.textContent||'')||el.querySelector('input[type="text"]'));
    })||null;
  }
  function cardParts(card=findBrandingCard()){
    if(!card)return {};
    const nameInput=card.querySelector('input[type="text"],input:not([type])');
    const preview=card.querySelector('img');
    const buttons=[...card.querySelectorAll('button')];
    return {card,nameInput,preview,save:buttons.find(b=>/^Lưu$/i.test(text(b.textContent))),change:buttons.find(b=>/Thay logo/i.test(text(b.textContent))),remove:buttons.find(b=>/^Xóa$/i.test(text(b.textContent)))};
  }

  async function imageSourceToData(src){
    src=text(src);if(!src||src==='about:blank')return null;
    if(src.startsWith('data:')&&src.length<=1450000)return src;
    try{
      let blob;if(src.startsWith('data:'))blob=await (await fetch(src)).blob();else blob=await (await fetch(src,{cache:'no-store'})).blob();
      if(blob.size<=1050000)return await blobToData(blob);return await compressBlob(blob);
    }catch(e){if(/^https?:/i.test(src)&&src.length<1400)return src;return null;}
  }
  function blobToData(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=reject;r.readAsDataURL(blob);});}
  async function compressBlob(blob){
    const url=URL.createObjectURL(blob);try{const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=url;});const scale=Math.min(1,512/Math.max(img.naturalWidth||1,img.naturalHeight||1));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.naturalWidth*scale));c.height=Math.max(1,Math.round(img.naturalHeight*scale));c.getContext('2d').drawImage(img,0,0,c.width,c.height);let out=c.toDataURL('image/webp',.84);if(out.length>1450000)out=c.toDataURL('image/jpeg',.78);return out;}finally{URL.revokeObjectURL(url);}
  }

  function brandNameTargets(oldName,newName){
    const roots=[document.querySelector('header'),document.getElementById('nav'),document.querySelector('aside'),document.querySelector('.sidebar')].filter(Boolean),names=new Set([text(oldName),DEFAULT_NAME].filter(Boolean).map(x=>x.toLowerCase()));
    roots.forEach(root=>root.querySelectorAll('span,div,strong,b,h1,h2,h3,p').forEach(el=>{if(el.children.length)return;const value=text(el.textContent);if(value&&names.has(value.toLowerCase()))el.textContent=newName;}));
    if(document.title&&names.has(text(document.title).toLowerCase()))document.title=newName;
  }
  function brandLogoTargets(card){
    const roots=[document.querySelector('header'),document.getElementById('nav'),document.querySelector('aside'),document.querySelector('.sidebar')].filter(Boolean),targets=new Set();
    roots.forEach(root=>{root.querySelectorAll('img').forEach(img=>{const key=`${img.id} ${img.className} ${img.alt} ${img.title}`.toLowerCase();if(/logo|brand|app-logo|identity/.test(key)||root.querySelectorAll('img').length===1)targets.add(img);});});
    document.querySelectorAll('img[id*="logo" i],img[class*="logo" i],img[alt*="logo" i]').forEach(img=>{if(!card?.contains(img))targets.add(img);});return [...targets];
  }
  function applyBranding(row){
    if(!row)return;state.applying=true;
    try{const parts=cardParts(),oldName=text(parts.nameInput?.value||state.row?.software_name||DEFAULT_NAME),name=text(row.software_name)||DEFAULT_NAME,logo=text(row.logo_data);if(parts.nameInput&&parts.nameInput.value!==name){parts.nameInput.value=name;parts.nameInput.dispatchEvent(new Event('input',{bubbles:true}));}if(parts.preview){if(logo&&parts.preview.src!==logo)parts.preview.src=logo;if(!logo){parts.preview.removeAttribute('src');parts.preview.style.display='none';}else parts.preview.style.display='';}brandNameTargets(oldName,name);brandLogoTargets(parts.card).forEach(img=>{if(logo){img.src=logo;img.style.display='';}else img.removeAttribute('src');});state.row={...row,software_name:name,logo_data:logo||null};}finally{setTimeout(()=>{state.applying=false;},120);}
  }

  async function currentPayload(forceLogo){
    const parts=cardParts(),name=text(parts.nameInput?.value)||text(state.row?.software_name)||DEFAULT_NAME;let logo=forceLogo===null?null:undefined;if(logo===undefined){const src=parts.preview?.getAttribute('src')||parts.preview?.src||state.row?.logo_data||'';logo=await imageSourceToData(src);}return {software_name:name,logo_data:logo||null};
  }
  async function persist(forceLogo){
    if(state.applying||state.saving||!state.orgId)return;const client=getClient();if(!client)return;state.saving=true;
    try{const payload=await currentPayload(forceLogo);let userId=null;try{const {data}=await client.auth.getUser();userId=data?.user?.id||null;}catch(e){}const row={org_id:state.orgId,...payload,updated_at:new Date().toISOString(),updated_by:userId};const {data,error}=await client.from('ly_org_branding').upsert(row,{onConflict:'org_id'}).select('org_id,software_name,logo_data,updated_at,updated_by').single();if(error)throw error;applyBranding(data||row);}catch(e){console.warn('[Lát Yên] branding sync save',e);}finally{state.saving=false;}
  }
  function schedulePersist(forceLogo){clearTimeout(state.saveTimer);state.saveTimer=setTimeout(()=>persist(forceLogo),350);}

  function bindCard(){
    const parts=cardParts();if(!parts.card)return;if(state.boundCard===parts.card)return;state.boundCard=parts.card;
    parts.save?.addEventListener('click',()=>setTimeout(()=>schedulePersist(undefined),80));parts.remove?.addEventListener('click',()=>setTimeout(()=>schedulePersist(null),80));parts.nameInput?.addEventListener('change',()=>schedulePersist(undefined));
    state.cardObserver?.disconnect();state.cardObserver=new MutationObserver(mutations=>{if(state.applying)return;if(mutations.some(m=>m.type==='attributes'&&m.attributeName==='src'))schedulePersist(undefined);});state.cardObserver.observe(parts.card,{subtree:true,attributes:true,attributeFilter:['src']});if(state.row)applyBranding(state.row);
  }

  async function loadOrSeed(client){const {data,error}=await client.from('ly_org_branding').select('org_id,software_name,logo_data,updated_at,updated_by').eq('org_id',state.orgId).maybeSingle();if(error)throw error;if(data){applyBranding(data);return;}const parts=cardParts();if(!parts.card)return;await persist(undefined);}
  function stopChannel(){const c=getClient();if(c&&state.channel){try{c.removeChannel(state.channel);}catch(e){}}state.channel=null;}
  async function start(){
    const client=getClient(),org=text(window.__lyFreshOrgId||'');if(!client||!org){clearTimeout(state.startTimer);state.startTimer=setTimeout(start,800);return;}bindCard();if(state.orgId!==org){stopChannel();state.orgId=org;state.row=null;}try{await loadOrSeed(client);}catch(e){console.warn('[Lát Yên] branding sync load',e);}if(!state.channel){let ch=client.channel(`latyen-branding-${org}-${Math.random().toString(36).slice(2,7)}`);ch=ch.on('postgres_changes',{event:'*',schema:'public',table:'ly_org_branding',filter:`org_id=eq.${org}`},payload=>{if(payload.eventType==='DELETE')return;applyBranding(payload.new||{});});state.channel=ch;ch.subscribe();}
  }
  function boot(){start();state.observer?.disconnect();state.observer=new MutationObserver(()=>bindCard());state.observer.observe(document.body,{subtree:true,childList:true});clearInterval(state.timer);state.timer=setInterval(()=>{bindCard();if(state.row)applyBranding(state.row);},1800);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.__lyBrandingSync={version:VERSION,refresh:start,save:()=>persist(undefined),status:()=>({version:VERSION,orgId:state.orgId,hasCloudRow:!!state.row,softwareName:state.row?.software_name||''})};
})();
