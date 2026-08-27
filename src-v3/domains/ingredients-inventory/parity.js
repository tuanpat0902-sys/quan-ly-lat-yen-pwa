function norm(v){return v==null?'':String(v)}
function stableRows(rows=[]){
  return [...rows].map(row=>Object.fromEntries(Object.entries(row||{}).filter(([k])=>!['updated_at','created_at'].includes(k)).sort(([a],[b])=>a.localeCompare(b)))).sort((a,b)=>norm(a.id||a.ingredient_id).localeCompare(norm(b.id||b.ingredient_id)));
}
export function compareIngredientsInventory(v2={},v3={}){
  const a=stableRows(v2),b=stableRows(v3);
  return Object.freeze({equal:JSON.stringify(a)===JSON.stringify(b),v2Count:a.length,v3Count:b.length});
}
