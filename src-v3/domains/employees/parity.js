const COMPARABLE_FIELDS=Object.freeze(['code','name','role','shift','attendance_mode','active']);

function normalizeValue(field,value){
  if(field==='active')return value!==false;
  return value==null?null:String(value).trim();
}

function comparable(row={}){
  const out={};
  for(const field of COMPARABLE_FIELDS)out[field]=normalizeValue(field,row?.[field]);
  return out;
}

function byCode(a,b){return String(a.code||'').localeCompare(String(b.code||''));}

export function compareEmployeeDirectory(v2Rows,v3Rows,{warehouseId}={}){
  const wid=warehouseId==null?'':String(warehouseId);
  const legacy=(Array.isArray(v2Rows)?v2Rows:[])
    .filter(row=>!wid||row?.warehouse_id==null||String(row.warehouse_id)===wid)
    .map(comparable)
    .sort(byCode);
  const cloud=(Array.isArray(v3Rows)?v3Rows:[]).map(comparable).sort(byCode);
  const left=JSON.stringify(legacy),right=JSON.stringify(cloud);
  return Object.freeze({
    equal:left===right,
    legacyCount:legacy.length,
    cloudCount:cloud.length,
    comparableFields:COMPARABLE_FIELDS,
    legacy:Object.freeze(legacy),
    cloud:Object.freeze(cloud)
  });
}

export const EMPLOYEES_PARITY_FIELDS=COMPARABLE_FIELDS;
