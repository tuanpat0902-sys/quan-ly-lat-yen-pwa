export function createStore(initialState={}){
  let state=structuredClone(initialState);
  const listeners=new Set();
  const getState=()=>state;
  const setState=(updater,meta={})=>{
    const next=typeof updater==='function'?updater(state):updater;
    if(next===state)return state;
    state=next;
    for(const listener of [...listeners])listener(state,meta);
    return state;
  };
  const patch=(partial,meta={})=>setState(current=>({...current,...partial}),meta);
  const subscribe=listener=>{
    if(typeof listener!=='function')throw new TypeError('listener must be a function');
    listeners.add(listener);return()=>listeners.delete(listener);
  };
  return Object.freeze({getState,setState,patch,subscribe});
}
