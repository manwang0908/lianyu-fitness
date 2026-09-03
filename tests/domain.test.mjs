import test from 'node:test';
import assert from 'node:assert/strict';
import {weekDates,monthCells,stats,consecutiveDays,secondsElapsed,recommend,makeRecommendedPlan,defaultProfile,defaultCheckin,byId,csvEscape,initialData} from '../src/domain.mjs';
test('calendar and streak span month/year boundaries without double counting',()=>{
 assert.deepEqual(weekDates('2026-09-03'),['2026-08-31','2026-09-01','2026-09-02','2026-09-03','2026-09-04','2026-09-05','2026-09-06']);
 assert.equal(monthCells('2026-02-15').length,42);
 assert.equal(consecutiveDays([{date:'2025-12-31'},{date:'2026-01-01'},{date:'2026-01-01'}],'2026-01-02'),2);
});
test('statistics distinguish sessions from unique training days',()=>{
 assert.deepEqual(stats([{date:'2026-09-03',seconds:50,completedSets:1},{date:'2026-09-03',seconds:80,completedSets:2}]),{sessions:2,days:1,minutes:2,sets:3});
});
test('paused time excludes time spent paused and active time adds persisted elapsed',()=>{
 assert.equal(secondsElapsed({running:false,elapsedMs:13000,startedAt:1000},20000),13);
 assert.equal(secondsElapsed({running:true,elapsedMs:13000,startedAt:10000},20000),23);
});
test('discomfort suppresses training and fatigue reduces volume',()=>{
 assert.equal(recommend(defaultProfile,{...defaultCheckin,discomfort:true}).blocked,true);
 const r=recommend({...defaultProfile,years:5,minutes:60},{...defaultCheckin,sleep:4});
 assert.equal(r.sets,1);assert.equal(r.minutes,15);
});
test('each ordinary readiness signal reduces planned time and executable repetitions',()=>{
 for(const years of [0,3]){
  const p={...defaultProfile,years};
  const states=[['充沛','良好'],['一般','良好'],['充沛','一般'],['一般','一般']];
  const recs=states.map(([energy,recovery])=>recommend(p,{...defaultCheckin,energy,recovery}));
  assert.deepEqual(recs.map(r=>r.minutes),[60,45,45,30]);
  assert.equal(new Set([recs[0].intensity,recs[1].intensity,recs[3].intensity]).size,3);
  const plans=recs.map(makeRecommendedPlan);
  for(const [higher,lower] of [[0,1],[0,2],[1,3],[2,3]]){
   assert(plans[lower].reduce((n,e)=>n+e.sets*e.reps,0)<plans[higher].reduce((n,e)=>n+e.sets*e.reps,0));
   assert(plans[lower].every(e=>e.rest>plans[higher].find(x=>x.id===e.id).rest));
  }
 }
});
test('poor recovery and short sleep cannot be offset by high energy',()=>{
 for(const energy of ['充沛','一般','疲惫'])for(const recovery of ['良好','一般','较差'])for(const sleep of [5,8]){
  const r=recommend({...defaultProfile,years:3,minutes:60},{...defaultCheckin,energy,recovery,sleep});
  if(energy==='疲惫'||recovery==='较差'||sleep<6){assert.equal(r.level,'recovery');assert.equal(r.minutes,15);assert(r.ids.every(id=>byId(id).equipment==='自重'));assert.equal(r.sets,1);}
 }
});
test('readiness levels respect time, experience and equipment without duplicate actions',()=>{
 for(const equipment of ['自重','哑铃','弹力带','健身房'])for(const minutes of [15,20,30,35,45,60])for(const years of [0,3]){
  const p={...defaultProfile,equipment,minutes,years};
  const recs=[['充沛','良好'],['一般','良好'],['一般','一般'],['疲惫','较差']].map(([energy,recovery])=>recommend(p,{...defaultCheckin,energy,recovery}));
  recs.forEach((r,i)=>{
   assert(r.minutes>0&&r.minutes<=minutes);if(i)assert(r.minutes<=recs[i-1].minutes);
   assert.equal(r.targetMinutes,[60,45,30,15][i]);
   assert.equal(r.minutes,Math.min(minutes,r.targetMinutes));
   assert.equal(Boolean(r.timeNote),minutes<r.targetMinutes);
   assert.equal(new Set(r.ids).size,r.ids.length);
   assert(r.ids.every(id=>byId(id).equipment==='自重'||byId(id).equipment===equipment||equipment==='健身房'));
   for(const e of makeRecommendedPlan(r)){assert(e.sets>=1&&e.sets<=(years<1?2:3));assert(e.reps>=5&&e.reps<=byId(e.id).reps);assert.equal(e.weight,0);}
  });
 }
 const senior=recommend({...defaultProfile,age:70,years:5},{...defaultCheckin,energy:'充沛',recovery:'良好'});assert.equal(senior.sets,2);
 assert.deepEqual(makeRecommendedPlan(recommend(defaultProfile,{...defaultCheckin,discomfort:true})),[]);
});
test('existing time budgets are preserved and reductions explain the cap',()=>{
 const p={...defaultProfile,minutes:35};
 const r=recommend(p,{...defaultCheckin,energy:'充沛',recovery:'良好'});
 assert.equal(p.minutes,35);assert.equal(r.minutes,35);assert.equal(r.targetMinutes,60);
 assert.match(r.timeNote,/60 分钟.*35 分钟/);assert(r.reasons.includes(r.timeNote));
 assert.equal(recommend(defaultProfile,{...defaultCheckin,energy:'充沛',recovery:'良好'}).timeNote,null);
});
test('bodyweight recommendation needs no weights, stays within short time budget',()=>{
 const r=recommend({...defaultProfile,equipment:'自重',minutes:15},defaultCheckin);
 assert(r.ids.every(id=>byId(id).equipment==='自重'));
 assert(r.minutes<=15);
});
test('CSV escapes quotes and formula injection; personal records start empty',()=>{
 assert.equal(csvEscape('=1+1'),'"\'=1+1"');assert.equal(csvEscape('a"b'),'"a""b"');
 const d=initialData();assert.equal(d.logs.length,0);assert.equal(d.weights.length,0);assert.equal(d.profile,null);
});
