export function createScheduler({now=()=>Date.now(),setTimer=setTimeout,clearTimer=clearTimeout,isOnline=()=>navigator.onLine,isHidden=()=>document.hidden}={}){
  const tasks=new Map();
  const running=new Set();

  function canRun(task){
    if(task.onlineOnly&& !isOnline())return false;
    if(task.pauseWhenHidden&&isHidden())return false;
    return task.enabled!==false;
  }

  function schedule(id,delay){
    const task=tasks.get(id);if(!task)return;
    if(task.timer)clearTimer(task.timer);
    task.timer=setTimer(()=>run(id,'timer'),Math.max(0,Number(delay??task.intervalMs) || 0));
  }

  async function run(id,reason='manual'){
    const task=tasks.get(id);
    if(!task||running.has(id))return false;
    if(!canRun(task)){schedule(id,task.intervalMs);return false;}
    running.add(id);task.lastRunAt=now();task.lastReason=reason;
    try{await task.run({reason,scheduledAt:task.lastRunAt});task.runs++;task.lastError='';}
    catch(error){task.errors++;task.lastError=String(error?.message||error);}
    finally{running.delete(id);if(task.repeat!==false)schedule(id,task.intervalMs);}
    return true;
  }

  function register(spec){
    if(!spec?.id||typeof spec.run!=='function')throw new TypeError('scheduler task requires id and run');
    if(tasks.has(spec.id))throw new Error(`scheduler task already exists: ${spec.id}`);
    const task={intervalMs:60000,repeat:true,onlineOnly:false,pauseWhenHidden:true,enabled:true,runs:0,errors:0,lastRunAt:0,lastReason:'',lastError:'',timer:null,...spec};
    tasks.set(task.id,task);
    if(task.autoStart!==false)schedule(task.id,task.initialDelayMs??task.intervalMs);
    return()=>unregister(task.id);
  }

  function unregister(id){const task=tasks.get(id);if(!task)return false;if(task.timer)clearTimer(task.timer);tasks.delete(id);return true;}
  function stopAll(){for(const id of [...tasks.keys()])unregister(id);}
  function status(){return [...tasks.values()].map(({run,timer,...task})=>({...task,running:running.has(task.id)}));}
  return Object.freeze({register,unregister,run,stopAll,status});
}
