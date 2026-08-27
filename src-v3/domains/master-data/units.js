const CATALOG=Object.freeze([
  {key:'mg',label:'mg — miligam',family:'mass',factor:.001},
  {key:'g',label:'g — gam',family:'mass',factor:1},
  {key:'kg',label:'kg — kilôgam',family:'mass',factor:1000},
  {key:'tấn',label:'tấn',family:'mass',factor:1000000},
  {key:'ml',label:'ml — mililít',family:'volume',factor:1},
  {key:'cl',label:'cl — centilít',family:'volume',factor:10},
  {key:'dl',label:'dl — đềxilít',family:'volume',factor:100},
  {key:'l',label:'l — lít',family:'volume',factor:1000},
  ...['cái','chiếc','bộ','đôi','ly','cốc','chai','lon','hũ','lọ','gói','túi','hộp','thùng','bao','khay','vỉ','cuộn','tờ','mét','phần','suất'].map(key=>({key,label:key,family:'count',factor:1}))
].map(Object.freeze));

const byKey=new Map(CATALOG.map(item=>[item.key,item]));
const fold=value=>String(value??'').trim().toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
const aliases=Object.freeze({gram:'g',gam:'g',kilogram:'kg',kilo:'kg',ky:'kg',ki:'kg',can:'kg',tan:'tấn',mililit:'ml',milliliter:'ml',centilit:'cl',decilit:'dl',lit:'l',liter:'l',cai:'cái',chiec:'chiếc',bo:'bộ',doi:'đôi',coc:'cốc',chai:'chai',lon:'lon',hu:'hũ',lo:'lọ',goi:'gói',tui:'túi',hop:'hộp',thung:'thùng',bao:'bao',khay:'khay',vi:'vỉ',cuon:'cuộn',to:'tờ',met:'mét',phan:'phần',suat:'suất'});

export function canonicalUnit(value){
  const raw=String(value??'').trim();
  if(byKey.has(raw))return raw;
  const normalized=fold(raw);
  return aliases[normalized]||CATALOG.find(item=>fold(item.key)===normalized)?.key||raw;
}

export function unitDefinition(value){return byKey.get(canonicalUnit(value))||null;}

export function unitsCompatible(from,to){
  const a=canonicalUnit(from),b=canonicalUnit(to);
  if(a===b)return true;
  const da=unitDefinition(a),db=unitDefinition(b);
  return !!(da&&db&&da.family===db.family&&da.family!=='count');
}

export function convertStandardUnit(quantity,from,to){
  const value=Number(quantity),a=canonicalUnit(from),b=canonicalUnit(to);
  if(!Number.isFinite(value))return NaN;
  if(a===b)return value;
  const da=unitDefinition(a),db=unitDefinition(b);
  if(!da||!db||da.family!==db.family||da.family==='count')return NaN;
  return value*da.factor/db.factor;
}

export const UNIT_CATALOG=CATALOG;
