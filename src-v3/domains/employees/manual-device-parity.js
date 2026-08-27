import {createEmployeesDomain} from './index.js';
import {persistEmployeesDeviceParityObservation} from './device-parity-observation.js';

function text(value){return String(value??'').trim();}

export async function runEmployeesManualDeviceParity({source,legacyRows,orgId,warehouseId,storage,events,now=Date.now}={}){
  const oid=text(orgId),wid=text(warehouseId);
  if(!oid)throw new Error('orgId is required');
  if(!wid)throw new Error('warehouseId is required');
  if(!Array.isArray(legacyRows))throw new Error('legacyRows are required');
  if(!source?.listDirectory)throw new Error('source.listDirectory is required');
  if(!storage?.getItem||!storage?.setItem)throw new Error('storage is required');

  const domain=createEmployeesDomain({source,events,v2Adapter:{getEmployees:()=>legacyRows}});
  const started=Date.now();
  const shadow=await domain.service.evaluateDirectoryShadow({orgId:oid,warehouseId:wid});
  const durationMs=Math.max(1,Date.now()-started);
  const persisted=persistEmployeesDeviceParityObservation({
    storage,orgId:oid,warehouseId:wid,now,
    observation:{
      source:'device-local',complete:true,parityReady:shadow.parityReady===true,
      reads:Number(shadow.reads||1),writes:Number(shadow.writes||0),durationMs,
      legacyCount:Number(shadow.parity?.legacyCount||0),cloudCount:Number(shadow.parity?.cloudCount||0)
    }
  });
  return Object.freeze({
    persisted:persisted.persisted===true,
    gate:persisted.gate,
    counts:Object.freeze({legacy:Number(shadow.parity?.legacyCount||0),cloud:Number(shadow.parity?.cloudCount||0)}),
    reads:Number(shadow.reads||1),writes:Number(shadow.writes||0),durationMs,
    authoritative:false,activationAllowed:false,autoPromotion:false
  });
}

export const EMPLOYEES_MANUAL_DEVICE_PARITY_POLICY=Object.freeze({
  manualOnly:true,
  cloudReadsPerRun:1,
  cloudWritesPerRun:0,
  storage:'localStorage-only',
  source:'device-local',
  containsEmployeeRows:false,
  authoritative:false,
  activationAllowed:false,
  autoPromotion:false
});
