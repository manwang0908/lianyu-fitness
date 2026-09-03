import { exercises } from '../src/domain.mjs';

export class ApiError extends Error {
  constructor(status, message, code='request_failed') { super(message); this.status=status; this.code=code; }
}
export const requireThat=(ok,message,status=400,code='invalid_request')=>{if(!ok)throw new ApiError(status,message,code);};
const inRange=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
const choice=(v,choices)=>choices.includes(v);
export function trainingInput(body) {
  const p=body.profile,s=body.checkin;
  requireThat(p&&s,'请先填写个人档案与今日状态。');
  requireThat(inRange(p.age,18,100)&&inRange(p.years,0,60)&&inRange(p.minutes,15,60),'请检查年龄、训练年限和可用时间。');
  requireThat(inRange(p.weight,20,300)&&inRange(p.height,100,230)&&inRange(p.days,1,5),'请检查身体数据与训练天数。');
  requireThat(choice(p.equipment,['自重','哑铃','弹力带','健身房'])&&choice(p.goal,['建立习惯','增肌力量','体重管理','提升体能']),'请选择有效的目标和器械。');
  requireThat(choice(p.sex,['未填写','女性','男性','其他 / 不愿透露']),'性别选项无效。');
  requireThat(inRange(s.sleep,0,24)&&choice(s.energy,['充沛','一般','疲惫'])&&choice(s.recovery,['良好','一般','较差'])&&typeof s.discomfort==='boolean','请检查今日状态。');
  requireThat(!s.discomfort,'你标记了身体不适，今天暂停生成训练计划。',422,'rest_recommended');
  requireThat(body.aiConsent===true,'请确认将必要训练条件发送给 DeepSeek。',400,'consent_required');
  const profile=Object.fromEntries(['sex','age','weight','height','years','goal','equipment','minutes','days'].map(k=>[k,p[k]]));
  const checkin=Object.fromEntries(['sleep','energy','recovery','discomfort'].map(k=>[k,s[k]]));
  return {profile,checkin};
}
export function validatePlan(value,input) {
  const short=(s,max)=>typeof s==='string'&&s.trim().length>0&&s.length<=max;
  requireThat(value&&short(value.title,50)&&short(value.intensity,30),'AI 返回的计划格式不完整，请稍后重试。',502,'invalid_model_output');
  requireThat(Number.isInteger(value.minutes)&&inRange(value.minutes,5,input.profile.minutes),'AI 返回的训练时长超出可用时间。',502,'invalid_model_output');
  requireThat(Array.isArray(value.reasons)&&value.reasons.length>=1&&value.reasons.length<=5&&value.reasons.every(s=>short(s,250)),'AI 返回的推荐说明不完整。',502,'invalid_model_output');
  requireThat(Array.isArray(value.exercises)&&value.exercises.length>=1&&value.exercises.length<=6,'AI 返回的动作数量不符合要求。',502,'invalid_model_output');
  const allowed=exercises.filter(e=>e.equipment==='自重'||e.equipment===input.profile.equipment||input.profile.equipment==='健身房');
  const seen=new Set();
  const selected=value.exercises.map(e=>{
    requireThat(e&&allowed.some(x=>x.id===e.id)&&!seen.has(e.id),'AI 选择了不匹配或重复的动作。',502,'invalid_model_output');
    seen.add(e.id);
    requireThat(Number.isInteger(e.sets)&&inRange(e.sets,1,4)&&Number.isInteger(e.reps)&&inRange(e.reps,3,30)&&Number.isInteger(e.rest)&&inRange(e.rest,30,180),'AI 返回的组次或休息时间不符合要求。',502,'invalid_model_output');
    return {id:e.id,sets:e.sets,reps:e.reps,rest:e.rest,weight:0};
  });
  return {title:value.title,intensity:value.intensity,minutes:value.minutes,reasons:value.reasons,exercises:selected,source:'deepseek',model:'deepseek-v4-flash'};
}
export async function readBounded(response,maxBytes=100000) {
  const reader=response.body?.getReader();
  requireThat(reader,'响应内容为空。',502);
  const parts=[];let bytes=0;
  try {while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>maxBytes){await reader.cancel();throw new ApiError(413,'内容过大，请缩短后重试。');}parts.push(value);}}
  finally {reader.releaseLock();}
  const all=new Uint8Array(bytes);let offset=0;for(const part of parts){all.set(part,offset);offset+=part.length;}
  return new TextDecoder().decode(all);
}
export async function callModel(input,key,fetcher=fetch) {
  const allowed=exercises.filter(e=>e.equipment==='自重'||e.equipment===input.profile.equipment||input.profile.equipment==='健身房').map(({id,name,equipment})=>({id,name,equipment}));
  const messages=[{role:'system',content:'你是练遇的健身计划助手。根据用户填写的训练条件提供保守、可修改的成人训练建议，不提供医疗诊断、治疗或康复处方，不承诺效果，不推荐极端饮食，不按体重自动指定负重。睡眠不足、疲惫或恢复较差时减少训练量，可建议休息。只从给定动作库选动作，不输出动作库以外的运动，不索取联系方式。输出严格 JSON 对象：title(最多50字),intensity(最多30字),minutes(整数，不超过可用时间),reasons(1至5条，每条最多250字),exercises(1至6个不重复动作，每项{id,sets:1至4整数,reps:3至30整数,rest:30至180整数})。明确说明建议需按个人能力调整。'},
    {role:'user',content:JSON.stringify({...input,allowedExercises:allowed})}];
  const payload=JSON.stringify({model:'deepseek-v4-flash',messages,thinking:{type:'disabled'},response_format:{type:'json_object'},max_tokens:2048,stream:false});
  requireThat(new TextEncoder().encode(payload).length<=20000,'训练条件过长。');
  let response;
  try {response=await fetcher('https://api.deepseek.com/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:payload,signal:AbortSignal.timeout(30000)});}
  catch {throw new ApiError(502,'AI 服务暂时未响应，请稍后再试。','model_unavailable');}
  requireThat(response.ok,response.status===401?'AI 服务配置需要维护，请联系站点管理员。':'AI 服务暂时不可用，请稍后再试。',502,'model_unavailable');
  let raw,plan;
  try {raw=JSON.parse(await readBounded(response));plan=JSON.parse(raw.choices?.[0]?.message?.content);}
  catch {throw new ApiError(502,'AI 未返回完整计划，请稍后再试。','invalid_model_output');}
  requireThat(raw.choices?.[0]?.finish_reason==='stop','AI 计划未完整生成，请稍后再试。',502,'invalid_model_output');
  return {plan:validatePlan(plan,input),usage:{input:Number.isSafeInteger(raw.usage?.prompt_tokens)?raw.usage.prompt_tokens:null,output:Number.isSafeInteger(raw.usage?.completion_tokens)?raw.usage.completion_tokens:null}};
}
