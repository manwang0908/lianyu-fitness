import { mkdirSync } from 'node:fs';
import path from 'node:path';
import {localD1,migrateLocal} from './local-d1.mjs';
import {handleApi} from '../worker/api.js';

export function localApi(){return {name:'lianyu-local-api',apply:'serve',configureServer(server){
  const root=server.config.root;mkdirSync(path.join(root,'.local'),{recursive:true});
  const db=localD1(path.join(root,'.local','development.sqlite'));migrateLocal(db,path.join(root,'.openai','drizzle'));
  const env={DB:db,AI_ENABLED:'false',COMMUNITY_ENABLED:'true'};
  server.middlewares.use(async(req,res,next)=>{
    if(!req.url?.startsWith('/api/'))return next();
    try {
      const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>250000){res.statusCode=413;res.end('Too large');return;}chunks.push(chunk);}
      const headers={...req.headers,cookie:(req.headers.cookie||'').replaceAll('lianyu-dev-visitor=','__Host-lianyu-visitor=')};
      const request=new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});
      const response=await handleApi(request,env);res.statusCode=response.status;for(const [key,value]of response.headers)res.setHeader(key,key==='set-cookie'?value.replace('__Host-lianyu-visitor=','lianyu-dev-visitor=').replace('; Secure',''):value);res.end(Buffer.from(await response.arrayBuffer()));
    }catch{res.statusCode=500;res.end('Local API unavailable');}
  });server.httpServer?.on('close',()=>db.close());
}};}
