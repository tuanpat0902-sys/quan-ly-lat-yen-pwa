const MINUTE=60_000;

export function classifyIposFailure(error){
  const status=Number(error?.status||0),message=String(error?.message||error||'');
  if(status===401||status===403||/jwt expired|token expired|đăng nhập/i.test(message))return {code:'AUTH_EXPIRED',retryable:false,needsReconnect:true};
  if(status===429)return {code:'RATE_LIMITED',retryable:true,needsReconnect:false};
  if(status>=500||/fetch failed|ECONNRESET|ETIMEDOUT|AbortError|aborted/i.test(message))return {code:'IPOS_UNAVAILABLE',retryable:true,needsReconnect:false};
  if(/Unexpected iPOS|Missing detail/i.test(message))return {code:'INVALID_RESPONSE',retryable:true,needsReconnect:false};
  return {code:'SYNC_FAILED',retryable:false,needsReconnect:false};
}

export function transientRetryDelay(attempt){return Math.min(8_000,1_000*(2**Math.max(0,attempt-1)));}

export async function withTransientRetry(operation,{attempts=3,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
  let lastError;
  for(let attempt=1;attempt<=attempts;attempt++){
    try{return await operation(attempt);}catch(error){
      lastError=error;
      const failure=classifyIposFailure(error);
      if(!failure.retryable||attempt===attempts)throw error;
      await sleep(transientRetryDelay(attempt));
    }
  }
  throw lastError;
}

export function failedHealth(previous,error,now=new Date()){
  const failure=classifyIposFailure(error),consecutiveFailures=Number(previous?.consecutive_failures||0)+1;
  const delayMinutes=failure.needsReconnect?60:Math.min(60,5*(2**Math.min(consecutiveFailures-1,4)));
  return {
    status:failure.needsReconnect?'needs_reconnect':'degraded',
    error_code:failure.code,
    consecutive_failures:consecutiveFailures,
    last_error_at:now.toISOString(),
    next_retry_at:new Date(now.getTime()+delayMinutes*MINUTE).toISOString(),
    last_success_at:previous?.last_success_at||null,
    last_success_day:previous?.last_success_day||null,
  };
}

export function successfulHealth(now=new Date(),summary={}){
  return {status:'healthy',error_code:null,consecutive_failures:0,last_error_at:null,next_retry_at:null,last_success_at:now.toISOString(),last_success_day:now.toISOString().slice(0,10),summary};
}

export function mayAttempt(health,now=Date.now()){
  return !health?.next_retry_at||Date.parse(health.next_retry_at)<=now;
}

export function recoveryStartDay(health,today,maxDays=14){
  const candidate=/^\d{4}-\d{2}-\d{2}$/.test(health?.last_success_day||'')?health.last_success_day:today;
  const floor=new Date(`${today}T00:00:00Z`);floor.setUTCDate(floor.getUTCDate()-Math.max(1,maxDays)+1);
  const floorLabel=floor.toISOString().slice(0,10);
  return candidate<floorLabel?floorLabel:candidate>today?today:candidate;
}
