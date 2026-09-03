import { useEffect, useRef, useState } from 'react';
import { initialData } from './domain.mjs';
import {hydrationDecision} from './cloud-sync.mjs';
const META='lianyu-cloud-saved-v1';
const readSaved=()=>{try{return localStorage.getItem(META);}catch{return null;}};
const remember=encoded=>{try{if(encoded===null)localStorage.removeItem(META);else localStorage.setItem(META,encoded);}catch{}};

export async function api(path,method='GET',payload) {
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),path==='/api/ai/plan'?40000:12000);
  try {
  const response=await fetch(path,{method,credentials:'same-origin',signal:controller.signal,headers:method==='GET'?{}:{'Content-Type':'application/json'},body:payload===undefined?undefined:JSON.stringify(payload)});
  const result=await response.json().catch(()=>({error:'云端服务暂时不可用。'}));
  if(!response.ok){const error=new Error(result.error||'操作失败，请稍后重试。');error.code=result.code;throw error;}
  return result;
  }catch(e){if(e.name==='AbortError'||e instanceof TypeError)throw new Error('连接暂时中断，记录已留在本机，请稍后重试。');throw e;}finally{clearTimeout(timer);}
}
export function useCloud(data,setData) {
  const [state,setState]=useState({loading:true,available:false,active:false,saving:false,error:'',ai:false,community:false,isAdmin:false});
  const sync=useRef({active:false,revision:0,saved:'',latest:data,blocked:false,conflict:false,inFlight:null});
  sync.current.latest=data;
  async function refresh(){
    const result=await api('/api/bootstrap');
    sync.current.active=result.active;sync.current.revision=result.revision;sync.current.blocked=false;sync.current.conflict=false;
    if(result.active){sync.current.saved=JSON.stringify(result.state);remember(sync.current.saved);setData(result.state);}
    setState(s=>({...s,...result,available:true,loading:false,error:''}));
    return result;
  }
  useEffect(()=>{let live=true;api('/api/bootstrap').then(result=>{
    if(!live)return;sync.current.active=result.active;sync.current.revision=result.revision;
    let conflict=false;
    if(result.active){const decision=hydrationDecision(sync.current.latest,result.state,readSaved());sync.current.saved=JSON.stringify(result.state);conflict=decision==='conflict';sync.current.blocked=conflict;sync.current.conflict=conflict;if(decision==='use-cloud'){remember(sync.current.saved);setData(result.state);}}
    setState(s=>({...s,...result,available:true,loading:false,error:conflict?'本机有未保存记录，云端也有更新。请先导出本机备份，再重新载入云端。':''}));
  }).catch(()=>{if(live)setState(s=>({...s,loading:false,available:false}));});return()=>{live=false;};},[]);
  async function flush(){
    const current=sync.current;
    if(current.inFlight)return current.inFlight;
    if(!current.active||current.blocked||JSON.stringify(current.latest)===current.saved)return;
    current.inFlight=(async()=>{
      setState(s=>({...s,saving:true,error:''}));
      try {
        while(current.active){const encoded=JSON.stringify(current.latest);if(encoded===current.saved)break;
          const result=await api('/api/state','PUT',{revision:current.revision,state:current.latest});current.revision=result.revision;current.saved=encoded;remember(encoded);
        }
      }catch(e){current.blocked=true;current.conflict=e.code==='revision_conflict';setState(s=>({...s,error:e.message}));throw e;}
      finally{setState(s=>({...s,saving:false}));}
    })().finally(()=>{current.inFlight=null;});return current.inFlight;
  }
  useEffect(()=>{if(!state.active)return;const timer=setTimeout(()=>flush().catch(()=>{}),700);return()=>clearTimeout(timer);},[data,state.active]);
  useEffect(()=>{const warn=e=>{if(sync.current.active&&JSON.stringify(sync.current.latest)!==sync.current.saved){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[]);
  async function activate(){const result=await api('/api/activate','POST',{consent:true,state:sync.current.latest});sync.current.active=true;sync.current.revision=result.revision;sync.current.saved=JSON.stringify(result.state);remember(sync.current.saved);sync.current.blocked=false;setData(result.state);setState(s=>({...s,active:true,error:''}));}
  async function remove(){sync.current.active=false;try{await sync.current.inFlight?.catch(()=>{});await api('/api/account','DELETE',{});}catch(e){sync.current.active=true;throw e;}sync.current.saved='';remember(null);sync.current.blocked=false;setData(initialData());setState(s=>({...s,active:false,error:''}));}
  async function retry(){if(sync.current.conflict)throw new Error('请先导出本机备份，再重新载入云端，避免覆盖另一个页面的更新。');sync.current.blocked=false;await flush();}
  return {...state,activate,remove,refresh,flush,retry};
}
