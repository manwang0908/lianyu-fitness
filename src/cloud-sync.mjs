export function hydrationDecision(local,remote,lastSaved) {
  const remoteEncoded=JSON.stringify(remote),localEncoded=JSON.stringify(local);
  if(lastSaved&&localEncoded!==lastSaved){
    if(remoteEncoded!==lastSaved&&remoteEncoded!==localEncoded)return 'conflict';
    if(remoteEncoded===lastSaved)return 'keep-local';
  }
  return 'use-cloud';
}
