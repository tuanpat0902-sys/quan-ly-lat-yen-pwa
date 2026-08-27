export function createFeatureRegistry(){
  const features=new Map();
  const states=new Map();

  function register(definition){
    if(!definition?.id||typeof definition.load!=='function')throw new TypeError('feature requires id and load');
    if(features.has(definition.id))throw new Error(`feature already registered: ${definition.id}`);
    features.set(definition.id,Object.freeze({...definition}));
    states.set(definition.id,{phase:'registered',instance:null,error:''});
  }

  async function activate(id,context){
    const def=features.get(id),state=states.get(id);
    if(!def)throw new Error(`unknown feature: ${id}`);
    if(state.phase==='active')return state.instance;
    state.phase='loading';state.error='';
    try{
      const module=await def.load();
      const instance=await (module.activate?.(context)??module.default?.activate?.(context)??module);
      state.phase='active';state.instance=instance;return instance;
    }catch(error){state.phase='error';state.error=String(error?.message||error);throw error;}
  }

  async function deactivate(id,context){
    const state=states.get(id);if(!state||state.phase!=='active')return;
    try{await state.instance?.deactivate?.(context);}finally{state.phase='registered';state.instance=null;}
  }

  const status=()=>Object.fromEntries([...states.entries()].map(([id,s])=>[id,{phase:s.phase,error:s.error}]));
  return Object.freeze({register,activate,deactivate,status});
}
