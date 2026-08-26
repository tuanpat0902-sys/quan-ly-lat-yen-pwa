(()=>{
  'use strict';
  const VERSION='2026.08.27.2';
  if(window.__lyChatInventoryQuery?.version===VERSION)return;

  const text=value=>String(value??'').trim();
  const fold=value=>text(value).toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9.,:/%\-\s]/g,' ').replace(/\s+/g,' ').trim();
  const number=value=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:0;};
  const format=value=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2}).format(number(value));
  const MUTATION=/^(?:(?:hay|vui long|giup|minh|toi|cho)\s+){0,4}(tao|tap|lap|them|moi|cap nhat|chinh|xoa|huy|nhap|xuat|ban)\b/;
  const ITEM_QUERY=/(con bao nhieu|ton bao nhieu|ton kho bao nhieu|so luong.*con|con hang khong|co con khong|con khong|het chua|het hang chua|ton kho cua|kiem tra ton|xem ton)/;
  const LIST_QUERY=/(nguyen lieu nao|danh sach nguyen lieu|nhung nguyen lieu|mat hang nao).*(sap het|can nhap|het hang)|(sap het|can nhap|het hang).*(nguyen lieu nao|danh sach nguyen lieu|nhung nguyen lieu)/;
  const GENERAL_REPORT=/(bao cao|tong quan|thong ke).*(ton kho|nguyen lieu)|(ton kho|nguyen lieu).*(bao cao|tong quan|thong ke)/;

  function snapshot(){
    const core=window.__lyFreshCoreV2?.store?.getState?.()||{},legacy=window.db||{};
    return {ingredients:core.ingredients||legacy.ingredients||[],balances:core.inventoryData?.balances||legacy.inventory||[],warehouses:core.warehouses||legacy.warehouses||[]};
  }
  function classify(quantity,minimum){
    const qty=number(quantity),min=Math.max(0,number(minimum));
    if(qty<=0)return 'out';
    if(min<=0)return 'ok';
    if(qty<=min)return 'restock';
    if(qty<=min*1.5)return 'low';
    return 'ok';
  }
  function safeUnit(value){
    const raw=text(value).replace(/\s+/g,' ').trim();
    if(!raw||raw.length>12)return '';
    return /^[\p{L}\p{M}0-9%./-]+(?:\s+[\p{L}\p{M}0-9%./-]+)?$/u.test(raw)?raw:'';
  }
  function warehouseContext(data){
    const id=text(window.currentWarehouseId),name=text(data.warehouses.find(row=>String(row.id)===id)?.name)||'Kho đang chọn';
    return {id,name};
  }
  function activeIngredients(data){return (data.ingredients||[]).filter(row=>row?.active!==false&&row?.id&&text(row.name));}
  function queryTerms(message){
    return fold(message)
      .replace(/\b(nguyen lieu|ton kho|ton|con|bao nhieu|so luong|hien tai|hang|khong|co|het|chua|kiem tra|xem|giup|minh|toi|cho|o|tai|kho|dang chon|cua|la|nay)\b/g,' ')
      .replace(/\s+/g,' ').trim();
  }
  function editDistance(left,right){
    const a=fold(left),b=fold(right),row=Array(b.length+1).fill(0).map((_,index)=>index);
    for(let i=1;i<=a.length;i++){let prev=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old;}}
    return row[b.length];
  }
  function rankIngredients(message,data){
    const source=fold(message),ingredients=activeIngredients(data);
    const exact=ingredients.filter(row=>source.includes(fold(row.name))).sort((a,b)=>fold(b.name).length-fold(a.name).length);
    if(exact.length){const longest=fold(exact[0].name).length;return exact.filter(row=>fold(row.name).length===longest).map(row=>({row,score:100}));}
    const query=queryTerms(message),tokens=query.split(' ').filter(Boolean);if(!query)return [];
    return ingredients.map(row=>{
      const name=fold(row.name),nameTokens=name.split(' ').filter(Boolean);let score=0;
      if(name===query)score=100;
      else if(name.includes(query)||query.includes(name))score=80;
      else{
        const overlap=tokens.filter(token=>nameTokens.includes(token)).length;score+=overlap*20;
        for(const token of tokens)if(token.length>=4&&nameTokens.some(word=>editDistance(word,token)<=1))score+=8;
      }
      return {row,score};
    }).filter(item=>item.score>0).sort((a,b)=>b.score-a.score||fold(a.row.name).length-fold(b.row.name).length);
  }
  function balanceFor(ingredient,data,warehouseId){
    return (data.balances||[]).find(row=>String(row?.ingredient_id)===String(ingredient.id)&&(!warehouseId||String(row?.warehouse_id)===warehouseId))||null;
  }
  function statusText(level){return ({out:'đã hết hàng',restock:'đã chạm/ngang mức cần nhập',low:'đang sắp hết',ok:'đang ở mức ổn'})[level]||'chưa xác định';}
  function summaryReply(message,data=snapshot()){
    const source=fold(message);if(MUTATION.test(source)||!GENERAL_REPORT.test(source)||/chi tiet|day du|tung nguyen lieu|danh sach/.test(source))return null;
    const warehouse=warehouseContext(data),rows=[];
    for(const ingredient of activeIngredients(data)){
      const balance=balanceFor(ingredient,data,warehouse.id);if(!balance)continue;
      rows.push({ingredient,quantity:number(balance.quantity),unit:safeUnit(ingredient.unit)});
    }
    if(!rows.length)return {content:`Mình chưa thấy dữ liệu tồn kho tại ${warehouse.name}. Bạn thử đồng bộ lại dữ liệu hoặc kiểm tra đúng kho đang chọn nhé.`,report:true,report_kind:'inventory_summary'};
    const positive=rows.filter(row=>row.quantity>0),out=rows.filter(row=>row.quantity<=0),top=[...positive].sort((a,b)=>b.quantity-a.quantity).slice(0,3),topText=top.map(row=>`${row.ingredient.name}: ${format(row.quantity)}${row.unit?` ${row.unit}`:''}`).join('; ');
    return {content:`Tồn kho tại ${warehouse.name}: ${positive.length} nguyên liệu còn hàng và ${out.length} nguyên liệu đã hết.${topText?` Một số số dư lớn: ${topText}.`:''} Bạn có thể hỏi “Nguyên liệu nào sắp hết?” hoặc “Đường còn bao nhiêu?”.`,report:true,report_kind:'inventory_summary'};
  }
  function itemReply(message,data=snapshot()){
    const source=fold(message);if(MUTATION.test(source)||!ITEM_QUERY.test(source))return null;
    const warehouse=warehouseContext(data),ranked=rankIngredients(message,data);if(!ranked.length)return {content:`Mình chưa xác định được nguyên liệu bạn muốn kiểm tra tại ${warehouse.name}. Bạn gửi đúng tên nguyên liệu, ví dụ “Đường còn bao nhiêu?” nhé.`,report:true,report_kind:'inventory_item_unknown'};
    const topScore=ranked[0].score,candidates=ranked.filter(item=>item.score===topScore).slice(0,5);
    if(candidates.length>1)return {content:`Mình thấy nhiều nguyên liệu gần với tên bạn hỏi tại ${warehouse.name}. Bạn chọn tên cụ thể nhé.`,suggestions:candidates.map(item=>`Tồn kho ${item.row.name}`),report:true,report_kind:'inventory_item_ambiguous'};
    const ingredient=candidates[0].row,balance=balanceFor(ingredient,data,warehouse.id),unit=safeUnit(ingredient.unit);
    if(!balance)return {content:`Mình tìm thấy ${ingredient.name}, nhưng chưa thấy số dư tồn kho của nguyên liệu này tại ${warehouse.name}.`,report:true,report_kind:'inventory_item'};
    const quantity=number(balance.quantity),minimum=Math.max(0,number(ingredient.minimum_stock??ingredient.min_stock)),level=classify(quantity,minimum),threshold=minimum>0?` Mức tồn tối thiểu đang đặt là ${format(minimum)}${unit?` ${unit}`:''}.`:'';
    return {content:`${ingredient.name} tại ${warehouse.name} hiện còn ${format(quantity)}${unit?` ${unit}`:''} và ${statusText(level)}.${threshold}`,report:true,report_kind:'inventory_item',inventory_item_id:ingredient.id,inventory_level:level};
  }
  function listReply(message,data=snapshot()){
    const source=fold(message);if(MUTATION.test(source)||!LIST_QUERY.test(source))return null;
    const warehouse=warehouseContext(data),rows=[];
    for(const ingredient of activeIngredients(data)){
      const balance=balanceFor(ingredient,data,warehouse.id);if(!balance)continue;
      const quantity=number(balance.quantity),minimum=Math.max(0,number(ingredient.minimum_stock??ingredient.min_stock)),level=classify(quantity,minimum);
      if(level!=='ok')rows.push({ingredient,quantity,minimum,level});
    }
    const wantsOut=/het hang/.test(source)&&!/sap het/.test(source),wantsRestock=/can nhap/.test(source),severity={out:0,restock:1,low:2},selected=rows.filter(row=>wantsOut?row.level==='out':wantsRestock?['out','restock'].includes(row.level):true).sort((a,b)=>(severity[a.level]??9)-(severity[b.level]??9)||a.quantity-b.quantity);
    if(!selected.length)return {content:`Hiện mình chưa thấy nguyên liệu nào thuộc nhóm bạn hỏi tại ${warehouse.name}.`,report:true,report_kind:'inventory_attention'};
    const lines=selected.slice(0,10).map(row=>{const unit=safeUnit(row.ingredient.unit);return `${row.ingredient.name}: ${format(row.quantity)}${unit?` ${unit}`:''} (${statusText(row.level)})`;}),more=selected.length>10?` và ${selected.length-10} nguyên liệu khác`:'';
    return {content:`${warehouse.name} có ${selected.length} nguyên liệu cần chú ý: ${lines.join('; ')}${more}.`,report:true,report_kind:'inventory_attention'};
  }
  function inventoryReply(message,data=snapshot()){return summaryReply(message,data)||listReply(message,data)||itemReply(message,data);}
  function patchAssistant(){
    const assistant=window.__lyLocalAssistant;if(!assistant||assistant.__lyInventoryQueryPatchedV2)return false;
    const original=typeof assistant.assistantReply==='function'?assistant.assistantReply.bind(assistant):null;if(!original)return false;
    assistant.assistantReply=(message,...rest)=>inventoryReply(message)||original(message,...rest);
    const originalStatus=typeof assistant.status==='function'?assistant.status.bind(assistant):()=>({});
    assistant.status=()=>({...originalStatus(),inventoryQueries:VERSION});
    assistant.__lyInventoryQueryPatchedV2=true;return true;
  }
  function sync(){patchAssistant();}
  window.addEventListener?.('latyen:hydrated',sync);window.addEventListener?.('latyen:v2-hydrated',sync);sync();
  const timer=setInterval(()=>{if(patchAssistant())clearInterval(timer);},250);setTimeout(()=>clearInterval(timer),30000);
  window.__lyChatInventoryQuery={version:VERSION,classify,safeUnit,summaryReply,itemReply,listReply,inventoryReply,rankIngredients,sync,status:()=>({version:VERSION,enabled:true})};
})();
