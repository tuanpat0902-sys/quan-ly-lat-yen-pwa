import {normalizeMasterDataRows} from './schema-contract.js';

const signature=row=>JSON.stringify(row);
const keyOf=row=>String(row?.id??'');

export function compareMasterData(kind,v2Rows,v3Rows,{orgId}={}){
  const left=normalizeMasterDataRows(kind,v2Rows);
  const right=normalizeMasterDataRows(kind,v3Rows);
  const leftById=new Map(left.map(row=>[keyOf(row),row]));
  const rightById=new Map(right.map(row=>[keyOf(row),row]));
  const missingInV3=[],extraInV3=[],changed=[];

  for(const [id,row] of leftById){
    const other=rightById.get(id);
    if(!other){missingInV3.push(id);continue;}
    if(signature(row)!==signature(other))changed.push(id);
  }
  for(const id of rightById.keys())if(!leftById.has(id))extraInV3.push(id);

  const invalidOrgRows=orgId
    ?right.filter(row=>String(row.org_id??'')!==String(orgId)).map(row=>keyOf(row))
    :[];

  const duplicateIds=rows=>{
    const seen=new Set(),dupes=new Set();
    for(const row of rows){const id=keyOf(row);if(seen.has(id))dupes.add(id);else seen.add(id);}
    return [...dupes];
  };

  const duplicateV2=duplicateIds(left),duplicateV3=duplicateIds(right);
  const equal=!missingInV3.length&&!extraInV3.length&&!changed.length&&!invalidOrgRows.length&&!duplicateV2.length&&!duplicateV3.length;

  return Object.freeze({
    equal,
    v2Count:left.length,
    v3Count:right.length,
    missingInV3:Object.freeze(missingInV3),
    extraInV3:Object.freeze(extraInV3),
    changed:Object.freeze(changed),
    invalidOrgRows:Object.freeze(invalidOrgRows),
    duplicateV2:Object.freeze(duplicateV2),
    duplicateV3:Object.freeze(duplicateV3)
  });
}
