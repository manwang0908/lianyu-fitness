import { ApiError, requireThat, readBounded, trainingInput, callModel } from './ai.js';
import { initialData, exercises, courseData } from '../src/domain.mjs';

const COOKIE='__Host-lianyu-visitor';
const now=()=>Date.now();
const q=(db,sql,...args)=>db.prepare(sql).bind(...args);
const one=(db,sql,...args)=>q(db,sql,...args).first();
const run=(db,sql,...args)=>q(db,sql,...args).run();
const all=async(db,sql,...args)=>(await q(db,sql,...args).all()).results;
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
const date=ms=>new Date(ms+8*3600000).toISOString().slice(0,10);
const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const enabled=value=>value==='true';
const admin=(req,env)=>Boolean(env.ADMIN_SITE_USER_ID)&&req.headers.get('oai-authenticated-user-id')===env.ADMIN_SITE_USER_ID;
const text=(value,max)=>{requireThat(typeof value==='string'&&value.trim().length>0&&value.length<=max,'请检查文字长度。');return value.trim();};
async function body(req) {
  requireThat(req.headers.get('origin')===new URL(req.url).origin,'请从本站页面发起操作。',403,'origin_required');
  requireThat(req.headers.get('content-type')?.split(';')[0]==='application/json','请求格式不正确。',415);
  try {return JSON.parse(await readBounded(req,250000));}catch(e){if(e instanceof ApiError)throw e;throw new ApiError(400,'请求内容不正确。');}
}
async function visitor(req,db,required=true) {
  const raw=req.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  const v=raw&&/^[a-f0-9]{64}$/.test(raw)?await one(db,'SELECT id,state_json,revision FROM visitors WHERE token_hash = ?',await hash(raw)):null;
  if(required)requireThat(v,'请先启用云端体验。',401,'visitor_required');
  return v;
}
function checkedState(value) {
  requireThat(value&&typeof value==='object'&&!Array.isArray(value)&&value.version===1,'记录格式不正确。');
  const d=initialData();
  for(const k of ['profile','checkins','plan','planName','logs','weights','bookmarks','interests','session','courseProgress','posts','likes','comments'])if(k in value)d[k]=value[k];
  requireThat(d.profile===null||(typeof d.profile==='object'&&!Array.isArray(d.profile)&&typeof d.profile.name==='string'&&d.profile.name.length<=24),'个人档案格式不正确。');
  requireThat(typeof d.planName==='string'&&d.planName.length<=100,'计划名称过长。');
  requireThat(Array.isArray(d.plan)&&d.plan.length<=40&&d.plan.every(e=>exercises.some(x=>x.id===e.id)&&Number.isInteger(e.sets)&&e.sets>=1&&e.sets<=10&&Number.isFinite(e.reps)&&e.reps>=1&&e.reps<=100),'训练计划格式不正确。');
  for(const k of ['logs','weights','bookmarks','interests','posts','likes'])requireThat(Array.isArray(d[k])&&d[k].length<=2000,'记录数量超出内测上限，请先导出备份。');
  requireThat(d.checkins&&typeof d.checkins==='object'&&!Array.isArray(d.checkins)&&Object.keys(d.checkins).length<=2000,'状态记录格式不正确。');
  if(d.courseProgress){requireThat(typeof d.courseProgress==='object'&&!Array.isArray(d.courseProgress),'课程记录格式不正确。');for(const [id,list]of Object.entries(d.courseProgress))requireThat(courseData.some(c=>c.id===id)&&Array.isArray(list)&&list.length<=4&&list.every(n=>Number.isInteger(n)&&n>=0&&n<4),'课程记录格式不正确。');}
  const encoded=JSON.stringify(d);requireThat(new TextEncoder().encode(encoded).length<=220000,'记录已达到内测存储上限，请先导出备份。');
  return encoded;
}
async function recentLimit(db,table,owner,limit) {
  const row=await one(db,`SELECT count(*) AS n FROM ${table} WHERE owner_id = ? AND created_at > ?`,owner,now()-3600000);
  requireThat(row.n<limit,'操作太频繁，请稍后再试。',429,'rate_limited');
}
async function seedTestEvent(db) {await run(db,'INSERT OR IGNORE INTO events (id,title,capacity,is_test) VALUES (?,?,?,?)','test-outdoor','山野同行 · 报名流程测试',20,1);}
async function eventView(db,owner) {
  await seedTestEvent(db);
  return all(db,`SELECT e.id,e.title,e.capacity,e.is_test AS isTest,
    (SELECT count(*) FROM registrations r WHERE r.event_id=e.id AND r.status='confirmed') AS confirmed,
    (SELECT r.status FROM registrations r WHERE r.event_id=e.id AND r.owner_id=?) AS myStatus
    FROM events e`,owner||'');
}
export async function handleApi(req,env) {
  const url=new URL(req.url),path=url.pathname,method=req.method;
  try {
    if(path==='/api/health'&&method==='GET')return json({database:Boolean(env.DB),ai:Boolean(env.DEEPSEEK_API_KEY)&&enabled(env.AI_ENABLED),community:enabled(env.COMMUNITY_ENABLED)});
    requireThat(/^\/api\/(bootstrap|activate|state|account|ai\/(status|plan)|events(?:\/[a-z0-9-]+\/(register|cancel))?|posts(?:\/[a-zA-Z0-9-]+(?:\/(comments|like|report))?)?|admin\/(reports|posts\/[a-zA-Z0-9-]+\/hide))$/.test(path),'接口不存在。',404);
    requireThat(env.DB,'云端服务尚未开通，请继续使用本地训练。',503,'database_unavailable');
    const db=env.DB;
    if(path==='/api/bootstrap'&&method==='GET') {
      const v=await visitor(req,db,false);
      return json({active:Boolean(v),state:v?JSON.parse(v.state_json):null,revision:v?.revision??0,isAdmin:admin(req,env),siteUserId:req.headers.get('oai-authenticated-user-id')||null,community:enabled(env.COMMUNITY_ENABLED),ai:Boolean(env.DEEPSEEK_API_KEY)&&enabled(env.AI_ENABLED)});
    }
    if(path==='/api/activate'&&method==='POST') {
      const input=await body(req);requireThat(input.consent===true,'请确认云端存储说明。');
      const existing=await visitor(req,db,false);if(existing)return json({state:JSON.parse(existing.state_json),revision:existing.revision,active:true});
      const state=checkedState(input.state),raw=token(),id=crypto.randomUUID();
      const added=await run(db,'INSERT INTO visitors (id,token_hash,state_json,revision,created_at,updated_at) SELECT ?,?,?,1,?,? WHERE (SELECT count(*) FROM visitors)<500',id,await hash(raw),state,now(),now());
      requireThat(added.meta.changes===1,'本轮云端体验名额已满，本地训练仍可使用。',429,'visitor_limit');
      return json({state:JSON.parse(state),revision:1,active:true},201,{'Set-Cookie':`${COOKIE}=${raw}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=31536000`});
    }
    if(path==='/api/state'&&method==='PUT') {
      const input=await body(req),v=await visitor(req,db),state=checkedState(input.state);
      requireThat(Number.isInteger(input.revision),'缺少记录版本。');
      const result=await run(db,'UPDATE visitors SET state_json=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?',state,now(),v.id,input.revision);
      requireThat(result.meta.changes===1,'另一个页面更新了记录，请导出当前备份后刷新。',409,'revision_conflict');
      return json({revision:input.revision+1});
    }
    if(path==='/api/account'&&method==='DELETE') {
      await body(req);const v=await visitor(req,db);
      await db.batch([q(db,'UPDATE ai_requests SET result_json=NULL,owner_id=? WHERE owner_id=?','deleted:'+await hash(v.id),v.id),q(db,'DELETE FROM visitors WHERE id=?',v.id)]);
      return json({deleted:true},200,{'Set-Cookie':`${COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0`});
    }
    if(path==='/api/ai/status'&&method==='GET') {
      const v=await visitor(req,db),period=date(now()).slice(0,7);
      const {n}=await one(db,'SELECT count(*) AS n FROM ai_requests WHERE owner_id=? AND period=?',v.id,period);
      return json({configured:Boolean(env.DEEPSEEK_API_KEY)&&enabled(env.AI_ENABLED),remaining:Math.max(0,4-n)});
    }
    if(path==='/api/ai/plan'&&method==='POST') {
      const inputBody=await body(req),v=await visitor(req,db),input=trainingInput(inputBody);
      requireThat(env.DEEPSEEK_API_KEY&&enabled(env.AI_ENABLED),'AI 接入尚未启用，请使用自主训练。',503,'ai_not_configured');
      requireThat(typeof inputBody.requestKey==='string'&&/^[a-zA-Z0-9-]{16,80}$/.test(inputBody.requestKey),'请求标识不正确。');
      await run(db,"UPDATE ai_requests SET status='failed' WHERE owner_id=? AND status='pending' AND created_at<?",v.id,now()-120000);
      const prior=await one(db,'SELECT status,result_json FROM ai_requests WHERE owner_id=? AND request_key=?',v.id,inputBody.requestKey);
      if(prior){if(prior.status==='done')return json(JSON.parse(prior.result_json));throw new ApiError(409,'本次请求已受理或结束，请勿重复提交。','duplicate_request');}
      const budget=Number(env.AI_BUDGET_MICRO||5000000),reserve=100000,id=crypto.randomUUID(),period=date(now()).slice(0,7);
      requireThat(Number.isSafeInteger(budget)&&budget>=reserve&&budget<=100000000,'AI 费用配置需要维护。',503);
      const inserted=await run(db,`INSERT INTO ai_requests (id,owner_id,request_key,period,status,reserve_micro,created_at)
        SELECT ?,?,?,?,'pending',?,? WHERE
        (SELECT count(*) FROM ai_requests WHERE owner_id=? AND period=?) < 4
        AND (SELECT count(*) FROM ai_requests WHERE owner_id=? AND status='pending') = 0
        AND COALESCE((SELECT sum(reserve_micro) FROM ai_requests),0)+? <= ?`,id,v.id,inputBody.requestKey,period,reserve,now(),v.id,period,v.id,reserve,budget);
      requireThat(inserted.meta.changes===1,'本月次数、并发或全站体验额度已达上限，已有计划仍可使用。',429,'quota_exceeded');
      try {
        const result=await callModel(input,env.DEEPSEEK_API_KEY,env.MODEL_FETCH||fetch);
        await run(db,"UPDATE ai_requests SET status='done',result_json=?,input_tokens=?,output_tokens=? WHERE id=?",JSON.stringify(result.plan),result.usage.input,result.usage.output,id);
        return json(result.plan);
      }catch(e){await run(db,"UPDATE ai_requests SET status='failed' WHERE id=?",id);throw e;}
    }
    if(path==='/api/events'&&method==='GET') {const v=await visitor(req,db,false);return json({events:await eventView(db,v?.id)});}
    const eventMatch=path.match(/^\/api\/events\/([a-z0-9-]+)\/(register|cancel)$/);
    if(eventMatch&&method==='POST') {
      const input=await body(req),v=await visitor(req,db);await seedTestEvent(db);
      const event=await one(db,'SELECT * FROM events WHERE id=?',eventMatch[1]);requireThat(event,'未找到活动。',404);
      if(eventMatch[2]==='cancel')await run(db,"UPDATE registrations SET status='cancelled' WHERE event_id=? AND owner_id=?",event.id,v.id);
      else {
        requireThat(event.is_test===1&&input.testAcknowledged===true,'请确认这是没有线下名额承诺的测试活动。');
        const existing=await one(db,'SELECT status FROM registrations WHERE event_id=? AND owner_id=?',event.id,v.id);
        if(existing?.status!=='confirmed') {
          const r=await run(db,`INSERT INTO registrations (id,event_id,owner_id,status,created_at)
            SELECT ?,?,?,'confirmed',? WHERE (SELECT count(*) FROM registrations WHERE event_id=? AND status='confirmed') < ?
            ON CONFLICT(event_id,owner_id) DO UPDATE SET status='confirmed',created_at=excluded.created_at`,crypto.randomUUID(),event.id,v.id,now(),event.id,event.capacity);
          requireThat(r.meta.changes===1,'测试名额已满，可以稍后再试。',409,'event_full');
        }
      }
      return json({events:await eventView(db,v.id)});
    }
    if(path.startsWith('/api/admin/')) {
      requireThat(admin(req,env),'仅管理员可操作。',403);
      if(path==='/api/admin/reports'&&method==='GET')return json({reports:await all(db,'SELECT r.id,r.reason,r.created_at,p.id AS postId,p.body,p.hidden FROM reports r JOIN posts p ON p.id=r.post_id ORDER BY r.created_at DESC LIMIT 100')});
      const match=path.match(/^\/api\/admin\/posts\/([a-zA-Z0-9-]+)\/hide$/);
      if(match&&method==='POST'){await body(req);await run(db,'UPDATE posts SET hidden=1 WHERE id=?',match[1]);return json({hidden:true});}
      throw new ApiError(404,'接口不存在。');
    }
    if(path.startsWith('/api/posts')) {
      requireThat(enabled(env.COMMUNITY_ENABLED),'真实社区尚未开放，正在准备管理与举报功能。',503,'community_not_enabled');
      if(path==='/api/posts'&&method==='GET') {
        const v=await visitor(req,db,false);
        const rows=await all(db,`SELECT p.id,p.name,p.tag,p.body AS text,p.created_at,p.owner_id=? AS own,
          (SELECT count(*) FROM likes l WHERE l.post_id=p.id) AS likeCount,
          EXISTS(SELECT 1 FROM likes l WHERE l.post_id=p.id AND l.owner_id=?) AS liked
          FROM posts p WHERE hidden=0 ORDER BY p.created_at DESC LIMIT 80`,v?.id||'',v?.id||'');
        const cs=await all(db,`SELECT c.id,c.post_id,c.name,c.body AS text,c.created_at,c.owner_id=? AS own FROM comments c JOIN posts p ON p.id=c.post_id WHERE p.hidden=0 AND p.id IN (SELECT id FROM posts WHERE hidden=0 ORDER BY created_at DESC LIMIT 80) ORDER BY c.created_at DESC LIMIT 500`,v?.id||'');
        return json({posts:rows.map(p=>({...p,own:Boolean(p.own),liked:Boolean(p.liked),date:date(p.created_at),comments:cs.filter(c=>c.post_id===p.id).reverse().map(c=>({...c,own:Boolean(c.own),date:date(c.created_at)}))}))});
      }
      const input=await body(req),v=await visitor(req,db);
      const name=String(JSON.parse(v.state_json).profile?.name||'运动同行者').slice(0,24);
      if(path==='/api/posts'&&method==='POST') {
        await recentLimit(db,'posts',v.id,5);const value=text(input.text,1000);
        requireThat(['训练交流','饮食分享','找搭子','交友'].includes(input.tag),'请选择有效话题。');
        if(input.tag==='交友'){const p=JSON.parse(v.state_json).profile;requireThat(p?.dating===true&&typeof p.age==='number'&&p.age>=18,'请先确认成年并主动开启交友资料。');}
        const id=crypto.randomUUID();await run(db,'INSERT INTO posts (id,owner_id,name,tag,body,created_at) VALUES (?,?,?,?,?,?)',id,v.id,name,input.tag,value,now());return json({id},201);
      }
      const match=path.match(/^\/api\/posts\/([a-zA-Z0-9-]+)(?:\/(comments|like|report))?$/);requireThat(match,'接口不存在。',404);
      const post=await one(db,'SELECT owner_id,hidden FROM posts WHERE id=?',match[1]);requireThat(post&&!post.hidden,'动态不存在。',404);
      if(!match[2]&&method==='DELETE'){requireThat(post.owner_id===v.id,'只能删除自己的动态。',403);await run(db,'DELETE FROM posts WHERE id=?',match[1]);return json({deleted:true});}
      requireThat(method==='POST','不支持此操作。',405);
      if(match[2]==='comments'){await recentLimit(db,'comments',v.id,20);await run(db,'INSERT INTO comments (id,post_id,owner_id,name,body,created_at) VALUES (?,?,?,?,?,?)',crypto.randomUUID(),match[1],v.id,name,text(input.text,300),now());return json({created:true},201);}
      if(match[2]==='like'){requireThat(typeof input.liked==='boolean','点赞状态无效。');if(input.liked)await run(db,'INSERT OR IGNORE INTO likes (id,post_id,owner_id) VALUES (?,?,?)',crypto.randomUUID(),match[1],v.id);else await run(db,'DELETE FROM likes WHERE post_id=? AND owner_id=?',match[1],v.id);return json({liked:input.liked});}
      if(match[2]==='report'){await run(db,'INSERT OR IGNORE INTO reports (id,post_id,owner_id,reason,created_at) VALUES (?,?,?,?,?)',crypto.randomUUID(),match[1],v.id,text(input.reason,300),now());return json({reported:true});}
    }
    throw new ApiError(404,'接口不存在。');
  }catch(e){return json({error:e instanceof ApiError?e.message:'服务暂时不可用，请稍后再试。',code:e instanceof ApiError?e.code:'server_error'},e instanceof ApiError?e.status:500);}
}
