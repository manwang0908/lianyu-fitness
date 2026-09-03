export const STORAGE_KEY = 'lianyu-experience-v1';
export const isoDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const parseDate = value => new Date(`${value}T12:00:00`);
export const shiftDate = (value, days) => { const d=parseDate(value); d.setDate(d.getDate()+days); return isoDate(d); };
export function weekDates(value) { const day=parseDate(value).getDay(); const start=shiftDate(value,-((day+6)%7)); return Array.from({length:7},(_,i)=>shiftDate(start,i)); }
export function monthCells(value) { const d=parseDate(value); const first=isoDate(new Date(d.getFullYear(),d.getMonth(),1,12)); const start=weekDates(first)[0]; return Array.from({length:42},(_,i)=>shiftDate(start,i)); }
export const uid=()=>crypto.randomUUID();
export const defaultProfile={name:'',sex:'未填写',age:28,weight:65,height:170,years:0,goal:'建立习惯',equipment:'哑铃',minutes:60,days:3,dating:false,bio:'',city:''};
export const defaultCheckin={sleep:6.5,energy:'一般',recovery:'一般',discomfort:false};
export const exercises=[
 {id:'goblet',name:'哑铃杯式深蹲',muscle:'下肢',detail:'股四头肌 / 臀部',equipment:'哑铃',image:'squat',steps:['双脚自然分开，双手将哑铃握于胸前。','保持脚掌稳定，屈髋屈膝，下蹲至舒适范围。','平稳站起，全程保持可控速度。'],sets:3,reps:12,rest:60,weight:0},
 {id:'row',name:'哑铃划船',muscle:'背部',detail:'背阔肌 / 斜方肌',equipment:'哑铃',image:'row',steps:['用稳定长凳支撑一侧手和膝，背部保持自然。','另一手握哑铃，将肘部拉向髋部。','缓慢放下，避免转动躯干借力。'],sets:3,reps:10,rest:60,weight:0},
 {id:'incline',name:'上斜俯卧撑',muscle:'胸部',detail:'胸大肌 / 肱三头肌',equipment:'自重',image:'pushup',steps:['双手支撑在牢固台面，身体保持一条直线。','屈肘缓慢下降，至能够控制的深度。','推起身体；提高支撑面可以降低难度。'],sets:3,reps:12,rest:45,weight:0},
 {id:'squat',name:'徒手深蹲',muscle:'下肢',detail:'股四头肌 / 臀部',equipment:'自重',steps:['双脚自然分开，选择稳定的站姿。','髋部向后、屈膝下蹲至舒适深度。','平稳站起，避免屏息和强行追求深度。'],sets:2,reps:10,rest:60,weight:0},
 {id:'bridge',name:'臀桥',muscle:'下肢',detail:'臀大肌 / 腘绳肌',equipment:'自重',steps:['仰卧屈膝，双脚平放地面。','收紧臀部，将髋部缓慢抬起。','平稳回到地面，避免腰部过度后仰。'],sets:3,reps:12,rest:45,weight:0},
 {id:'deadbug',name:'死虫式',muscle:'核心',detail:'腹部 / 躯干稳定',equipment:'自重',steps:['仰卧，双臂朝上，髋膝弯曲。','呼气时缓慢伸展对侧手脚。','保持腰背稳定，左右交替，每侧分别计次。'],sets:2,reps:8,rest:45,weight:0},
 {id:'press',name:'哑铃肩推',muscle:'肩部',detail:'三角肌 / 肱三头肌',equipment:'哑铃',steps:['坐稳或站稳，将轻哑铃置于肩部两侧。','缓慢向上推起，不要耸肩或过度挺腰。','受控回落至舒适位置。'],sets:3,reps:10,rest:90,weight:0},
 {id:'curl',name:'哑铃弯举',muscle:'手臂',detail:'肱二头肌',equipment:'哑铃',steps:['双脚站稳，手臂自然垂下。','保持上臂相对稳定，弯曲肘部。','缓慢回落，避免摆动身体。'],sets:3,reps:12,rest:60,weight:0},
 {id:'rdl',name:'哑铃罗马尼亚硬拉',muscle:'下肢',detail:'臀部 / 腘绳肌',equipment:'哑铃',steps:['轻微屈膝，双手持哑铃靠近腿部。','髋部向后移动，保持脊柱自然。','在可控范围内回到站姿，初学者先学习髋铰链。'],sets:3,reps:10,rest:90,weight:0},
 {id:'bandrow',name:'弹力带划船',muscle:'背部',detail:'背阔肌 / 上背部',equipment:'弹力带',steps:['确认弹力带和固定点牢固。','双手握带，肘部向后拉，保持躯干稳定。','缓慢还原，避免弹力带突然回弹。'],sets:3,reps:12,rest:60,weight:0},
 {id:'bench',name:'杠铃卧推',muscle:'胸部',detail:'胸大肌 / 肱三头肌',equipment:'健身房',steps:['调整保护杆，选择能稳定控制的重量。','握距自然，缓慢下放。','平稳推起；使用保护架或由有经验者保护。'],sets:3,reps:8,rest:120,weight:0},
 {id:'pulldown',name:'高位下拉',muscle:'背部',detail:'背阔肌 / 肱二头肌',equipment:'健身房',steps:['调节坐垫和腿部固定，双脚着地。','肩部下沉，将手柄拉向上胸部。','缓慢还原，不要在颈后下拉。'],sets:3,reps:10,rest:90,weight:0},
];
export const byId=id=>exercises.find(e=>e.id===id);
export function makePlan(ids, overrides={}) { return ids.map(id=>({...byId(id),...overrides,key:uid()})); }
export function recommend(profile, state, logs=[]) {
 const reasons=[];
 if(state.discomfort) return {title:'今天，先照顾好自己',intensity:'暂停训练',minutes:0,ids:[],sets:0,reasons:['你标记了身体不适。今天不生成训练动作；若持续不适，请咨询专业人士。'],blocked:true};
 if(profile.age<18) return {title:'需要适龄训练指导',intensity:'暂不生成',minutes:0,ids:[],sets:0,reasons:['当前体验版的规则适用于成年人。'],blocked:true};
 // A poor recovery signal overrides positive signals; subjective readiness never adds load.
 const tired=state.energy==='疲惫'||state.recovery==='较差'||state.sleep<6;
 const ordinary=Number(state.energy!=='充沛')+Number(state.recovery!=='良好');
 const level=tired?'recovery':ordinary===2?'light':ordinary===1?'balanced':'ready';
 const adjustment={
  ready:{label:'常规训练',intensity:'适中强度',targetMinutes:60,repsScale:1,restExtra:0,effort:'动作稳定，按熟悉的难度完成'},
  balanced:{label:'适当减量',intensity:'中低强度',targetMinutes:45,repsScale:0.85,restExtra:15,effort:'少做几次，完成后仍留有余力'},
  light:{label:'轻量练习',intensity:'轻强度',targetMinutes:30,repsScale:0.75,restExtra:30,effort:'轻松练习，不追求力竭'},
  recovery:{label:'恢复活动',intensity:'很轻强度',targetMinutes:15,repsScale:0.65,restExtra:30,effort:'以舒适为准，也可以直接休息'},
 }[level];
 const minutes=Math.min(profile.minutes,adjustment.targetMinutes);
 const timeNote=minutes<adjustment.targetMinutes?`本档标准时长为 ${adjustment.targetMinutes} 分钟，已按你设置的 ${profile.minutes} 分钟可用时间缩短。`:null;
 const baseSets=profile.years<1||profile.age>=65?2:3;
 const sets=tired?1:level==='light'?2:baseSets;
 let ids=profile.equipment==='自重'?['squat','incline','bridge','deadbug']:profile.equipment==='弹力带'?['squat','bandrow','bridge']:profile.equipment==='健身房'?['goblet','pulldown','incline']:['goblet','row','incline'];
 if(tired) ids=['bridge','deadbug'];
 else if(minutes<25) ids=ids.slice(0,2);
 if(!tired && profile.years>=2 && minutes>=45 && !ids.includes('deadbug')) ids=[...ids,'deadbug'];
 if(tired){const signals=[state.energy==='疲惫'?'精力疲惫':null,state.recovery==='较差'?'身体恢复较差':null,state.sleep<6?`昨晚睡眠 ${state.sleep} 小时`:null].filter(Boolean);reasons.push(`${signals.join('、')}：今天优先恢复，只安排少量舒适活动，也可以直接休息。`);}
 else if(level==='ready') reasons.push('精力充沛、恢复良好：按常规训练量安排，以动作稳定为目标，不因状态好就额外加重。');
 else if(level==='balanced') reasons.push(`${state.energy==='一般'?'精力一般、恢复良好':'精力充沛、恢复一般'}：今天适当减量，减少每组次数，并延长休息。`);
 else reasons.push('精力和恢复都一般：缩短训练时间，降低训练量，以轻松完成基础动作练习为主。');
 reasons.push(`建议约 ${minutes} 分钟、${ids.length} 个动作，每个 ${sets} 组。${adjustment.effort}；时间含热身、组间休息与整理，可按实际感受提前结束。`);
 if(timeNote) reasons.push(timeNote);
 reasons.push(tired?'采用不需要负重的基础动作，若活动中不舒服就停止。':`按${profile.equipment}条件筛选动作，${profile.years<1?'初学阶段优先基础动作':'保留熟悉动作并逐步记录反馈'}。`);
 if(profile.age>=65) reasons.push('年龄信息用于保守调整训练量，具体强度仍需结合个人能力。');
 const recent=logs.filter(l=>l.date===isoDate()).length;
 if(recent) reasons.push('你今天已有训练记录；请评估恢复情况，不必为了打卡追加训练。');
 reasons.push(`本次围绕「${profile.goal}」，控制在你的${profile.minutes}分钟时间预算内。`);
 return {title:tired?'轻量活动与恢复':level==='light'?'基础动作轻量练习':level==='balanced'?'全身训练 · 适当减量':profile.goal==='增肌力量'?'全身基础力量':'全身基础训练',level,label:adjustment.label,intensity:adjustment.intensity,minutes,targetMinutes:adjustment.targetMinutes,timeNote,ids,sets,repsScale:adjustment.repsScale,restExtra:adjustment.restExtra,effort:adjustment.effort,reasons,blocked:false};
}
// Preview and applying the recommendation must produce the same executable prescription.
export function makeRecommendedPlan(rec) {
 return makePlan(rec.ids,{sets:rec.sets}).map(e=>({...e,reps:Math.max(5,Math.round(e.reps*rec.repsScale)),rest:e.rest+rec.restExtra}));
}
export function secondsElapsed(s,now=Date.now()) { return Math.max(0, Math.floor((s.elapsedMs+(s.running?now-s.startedAt:0))/1000)); }
export function duration(seconds) { const m=Math.floor(seconds/60);return `${String(m).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`; }
export function stats(logs) { return {sessions:logs.length,days:new Set(logs.map(l=>l.date)).size,minutes:Math.floor(logs.reduce((a,l)=>a+l.seconds,0)/60),sets:logs.reduce((a,l)=>a+l.completedSets,0)}; }
export function consecutiveDays(logs,today=isoDate()) { const days=new Set(logs.map(l=>l.date));let cursor=days.has(today)?today:shiftDate(today,-1),n=0;while(days.has(cursor)){n++;cursor=shiftDate(cursor,-1);}return n; }
export function csvEscape(value) { let str=String(value??''); if(/^[=+@\-\t\r]/.test(str))str="'"+str;return '"'+str.replaceAll('"','""')+'"'; }
export const csvForLogs=logs=>'\uFEFF'+[['日期','训练名称','时长（秒）','完成组数','主观强度','备注'],...logs.map(l=>[l.date,l.title,l.seconds,l.completedSets,l.effort,l.note])].map(row=>row.map(csvEscape).join(',')).join('\r\n');
export function initialData() { return {version:1,profile:null,checkins:{},plan:makePlan(['goblet','row','incline']),planName:'我的全身训练',logs:[],weights:[],posts:[],likes:[],bookmarks:[],comments:{},interests:[],session:null}; }
export function loadData() { try { const value=JSON.parse(localStorage.getItem(STORAGE_KEY));if(!value||value.version!==1)return initialData();return {...initialData(),...value}; }catch{return initialData();} }
export const courseData=[
 {id:'foundation',name:'从零开始，练好每一个动作',tag:'基础入门',image:'squat',lessons:['认识训练与恢复','徒手深蹲的练习要点','上斜俯卧撑与难度调整','第一次全身训练'],desc:'用四节基础内容，建立属于自己的训练习惯。',duration:'4 节内容',intro:'先掌握动作，再逐步增加训练量。选择稳定的练习环境，从能轻松控制的难度开始。每次记录身体感受，留出恢复时间。'},
 {id:'strength',name:'力量训练，循序渐进',tag:'进阶训练',image:'row',lessons:['如何安排一周训练','记录组数、次数与重量','根据完成情况调整计划','训练量与恢复'],desc:'把训练记录变成下一次进步的依据。',duration:'4 节内容',intro:'训练进步可以体现在动作更稳定、同样重量下完成更多次数等方面。避免一次同时大幅增加重量、次数和训练频率。'},
 {id:'nutrition',name:'训练日，也好好吃饭',tag:'饮食习惯',image:'meal',lessons:['日常饮食记录','认识食物组成','准备一份日常餐食','复盘与坚持'],desc:'从日常餐食开始，建立可持续的饮食习惯。',duration:'4 节内容',intro:'记录真实的饮食习惯，关注食物多样性与规律用餐。照片和主观估算无法准确测出热量；不要把估算当成精确测量。'},
];

export const lessonContent={
 '认识训练与恢复':'先写下你的目标、可用时间和器械条件。把一次能完成的训练放进日程，也给恢复留出位置。本节练习：在个人档案中填写这些条件，并记录今天的精神与恢复状态。',
 '徒手深蹲的练习要点':'在自主训练的动作库中搜索「徒手深蹲」，查看动作要点。先从自己能够稳定控制的范围练习；结束后写下动作感受，供下一次调整参考。',
 '上斜俯卧撑与难度调整':'使用牢固、不会滑动的支撑面。先阅读动作库中的要点，选择能够控制的练习难度。本节练习：把上斜俯卧撑加入计划，并记录自己的支撑高度和感受。',
 '第一次全身训练':'打开「自主训练」，选择全身基础模板，按可用器械替换动作。开始后逐组标记实际完成情况；提前结束也可以保存已经完成的部分。',
 '如何安排一周训练':'先把真实可用的时段写下来，再安排训练和休息。用日历查看已经完成的训练，避免让计划与工作、出行和恢复需求冲突。',
 '记录组数、次数与重量':'区分计划量和完成量：开始前填写目标组数、次数与重量，训练中只勾选实际完成的组。重量未确定时保留 0，并在备注中说明。',
 '根据完成情况调整计划':'打开上一条训练记录，回顾完成组数和主观感受。下一次只调整一项容易观察的变量，并记录原因，便于比较。',
 '训练量与恢复':'把睡眠、精力和身体感受放在训练数字旁边一起看。疲惫时重新评估计划，不需要为了连续打卡补做训练；有不适时先暂停。',
 '日常饮食记录':'从一顿真实的餐食开始，记录时间、食物和用餐感受。社区饮食话题可以用于整理自己的体验，不必把每一餐做成完美范例。',
 '认识食物组成':'阅读包装上的配料与营养信息，区分每份和每 100 克的标示。餐食照片只能用于记录，不能替代实际称量或营养测量。',
 '准备一份日常餐食':'选择日常方便购买、自己喜欢的食材，提前安排采购和准备时间。将做法与用餐感受记下来，积累容易重复的餐食选择。',
 '复盘与坚持':'回顾一周的饮食记录，找出最容易执行的一项习惯。下一周保留这项习惯，再调整一个具体环节；需要个体营养方案时向合适的专业人士咨询。',
};
