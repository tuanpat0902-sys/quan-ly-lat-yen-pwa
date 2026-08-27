(()=>{
  'use strict';
  const VERSION='2026.08.27.1';
  if(window.__lyNotificationTimeSource?.version===VERSION)return;
  function preferred(row){
    const table=String(row?.entity_table??row?.table??'').trim();
    if(table==='ly_sales')return row?.occurred_at||row?.occurredAt||row?.created_at||row?.createdAt||new Date().toISOString();
    return row?.created_at||row?.createdAt||row?.occurred_at||row?.occurredAt||new Date().toISOString();
  }
  window.__lyNotificationTimeSource={version:VERSION,preferred};
})();
