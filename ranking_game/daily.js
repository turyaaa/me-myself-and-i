// Daily puzzles are pinned on first open; one saved attempt per Kyiv calendar day.
const DAILY_COLORS=['#e58a9b','#5b96e5','#f2c85b','#8d8d96'];
let D=null;
let dailyBoundary=null,dailyBoundaryDay=null;
const kyivDay=(now=new Date())=>{
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  return ['year','month','day'].map(key=>parts.find(p=>p.type===key).value).join('-');
};
function nextKyivDay(now=new Date()){
  const today=kyivDay(now);let lo=+now,hi=lo+27*3600000;
  while(hi-lo>1000){const mid=Math.floor((lo+hi)/2);if(kyivDay(new Date(mid))===today)lo=mid;else hi=mid;}
  return hi;
}
function dailyPlan(day){
  if(DAILY_SCHEDULE.days[day])return DAILY_SCHEDULE.days[day].map(id=>DAILY_BANK.find(q=>q.id===id));
  if(day>=DAILY_SCHEDULE.start)return [];
  let seed=Number(day.replaceAll('-',''))>>>0;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const pool=DAILY_BANK.filter(q=>!q.edition);for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  const chosen=[];for(const q of pool)if(!chosen.some(x=>x.family===q.family)){chosen.push(q);if(chosen.length===3)break;}
  return chosen;
}
function loadDaily(day=kyivDay()){
  try{const s=JSON.parse(store.get('ranking_daily_'+day));
    if(s&&s.day===day&&Array.isArray(s.plan)&&s.plan.length===3&&Array.isArray(s.results)&&s.results.length<=3&&s.results.every(r=>Number.isFinite(r.score)&&r.score>=0&&r.score<=100&&r.guess?.length===4)&&s.plan.every(q=>q.labels?.length===4&&q.values?.length===4&&q.values.every(Number.isFinite))&&s.shares?.length===4&&s.shares.every(v=>Number.isFinite(v)&&v>=0&&v<=100)&&Math.abs(s.shares.reduce((a,b)=>a+b,0)-100)<.01){
      if(!s.revealed&&s.results.length<3){const fixed=s.plan[s.results.length].values[3],total=s.shares.slice(0,3).reduce((a,b)=>a+b,0),budget=100-fixed;s.shares=s.shares.map((v,i)=>i===3?fixed:total>0?v/total*budget:budget/3);}
      return s;
    }
  }catch(_){}const plan=dailyPlan(day);return {day,plan,results:[],shares:initialDailyShares(plan[0]),revealed:false};
}
function initialDailyShares(q){if(!q)return [];const rest=q.values[3],part=(100-rest)/3;return [part,part,part,rest];}
function saveDaily(advance=false){
  const latest=loadDaily(D.day);
  if(latest.results.length>D.results.length||(!advance&&latest.results.length===D.results.length&&latest.revealed&&!D.revealed)){D=latest;renderDaily();return false;}
  const ok=store.set('ranking_daily_'+D.day,JSON.stringify(D));$('daily-error').textContent=ok?'':'Браузер не дозволив зберегти прогрес. Не закривай цю вкладку.';return ok;
}
// Only the three editable sectors count; the known grey remainder earns no points.
// Distribution overlap: moving 5% of the editable budget costs 5 points.
// Small true sectors no longer magnify tiny absolute errors.
function dailyAccuracy(guess,truth){const budget=truth.slice(0,3).reduce((a,b)=>a+b,0);if(budget<=.000001)return 100;const overlap=guess.slice(0,3).reduce((n,v,i)=>n+Math.min(v,truth[i]),0);return Math.max(0,Math.min(100,Math.round(100*overlap/budget)));}
function rebalanceShares(shares,index,value){
  if(!Number.isInteger(index)||index<0||index>2)return shares.slice();
  const budget=100-shares[3];value=Math.max(0,Math.min(budget,Number(value)));if(!Number.isFinite(value))return shares.slice();
  const other=shares.slice(0,3).reduce((sum,v,i)=>sum+(i===index?0:v),0),remaining=budget-value;
  const next=shares.map((v,i)=>i===3?v:i===index?value:other>.000001?v/other*remaining:remaining/2);
  const correction=[0,1,2].find(i=>i!==index);next[correction]+=100-next.reduce((a,b)=>a+b,0);return next;
}
function paintPie(el,values,labels){
  let edge=0;el.style.background='conic-gradient('+values.map((v,i)=>{const start=edge;edge+=v;return DAILY_COLORS[i]+' '+start+'% '+edge+'%';}).join(',')+')';
  el.setAttribute('role','img');el.setAttribute('aria-label',labels.map((x,i)=>x+': '+fmt(values[i])+'%').join(', '));
}
function dailyClock(){
  const now=new Date(),day=kyivDay(now);
  if(day!==dailyBoundaryDay){dailyBoundaryDay=day;dailyBoundary=nextKyivDay(now);}
  const seconds=Math.max(0,Math.ceil((dailyBoundary-now)/1000));
  const value=[Math.floor(seconds/3600),Math.floor(seconds%3600/60),seconds%60].map(n=>String(n).padStart(2,'0')).join(':');
  $('daily-countdown').textContent=value;$('daily-card-clock').textContent=value;
  const saved=loadDaily();$('mode-daily').classList.toggle('daily-done',saved.results.length===3);
  $('daily-card-state').textContent=!saved.plan.length?'Нові випуски готуємо':saved.results.length===3?(day>=DAILY_SCHEDULE.end?'Сезон завершено':'Повертайтесь завтра!'):saved.results.length?'Продовжити сьогоднішній виклик':'Три розподіли. Одна спроба на день.';
  $('daily-card-clock').hidden=day>=DAILY_SCHEDULE.end;
  $('daily-return').textContent=DAILY_SCHEDULE.days[day]&&day===DAILY_SCHEDULE.end?'Сьогоднішній сезон завершено. Нові випуски готуємо!':'Повертайтесь завтра!';
  $('daily-next-time').hidden=day>=DAILY_SCHEDULE.end;
  if(D&&D.day!==day&&!$('daily').hidden){D=null;showDaily();}
}
function showDaily(){
  D=loadDaily();show('daily');if(D.plan.length)saveDaily();renderDaily();dailyClock();
}
function renderDaily(){
  $('daily-date').textContent=new Intl.DateTimeFormat('uk-UA',{timeZone:'Europe/Kyiv',day:'numeric',month:'long',year:'numeric'}).format(new Date(D.day+'T12:00:00Z'));
  $('daily-unavailable').hidden=!!D.plan.length;
  if(!D.plan.length){$('daily-game').hidden=true;$('daily-finish').hidden=true;return;}
  const done=D.results.length===3&&!D.revealed,idx=Math.min(D.results.length,2),q=D.plan[idx];
  $('daily-game').hidden=done;$('daily-finish').hidden=!done;
  $('daily-date').textContent=new Intl.DateTimeFormat('uk-UA',{timeZone:'Europe/Kyiv',day:'numeric',month:'long',year:'numeric'}).format(new Date(D.day+'T12:00:00Z'));
  if(done){
    const total=D.results.reduce((n,r)=>n+r.score,0);$('daily-total').textContent=Math.round(total/3)+'%';$('daily-points').textContent=total+' із 300 очок';
    const summary=$('daily-summary');summary.replaceChildren();D.results.forEach((r,i)=>{
      const row=document.createElement('div');row.className='daily-round-result'+(r.score>=95?' exceptional':'');row.style.setProperty('--round-delay',i*140+'ms');
      const heading=document.createElement('div');heading.className='daily-result-heading';const title=document.createElement('span'),value=document.createElement('strong');title.textContent='Розподіл '+(i+1)+' · '+D.plan[i].title;value.textContent=r.score+'%';heading.append(title,value);
      const track=document.createElement('div');track.className='daily-result-track';track.setAttribute('role','progressbar');track.setAttribute('aria-label',D.plan[i].title);track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');track.setAttribute('aria-valuenow',String(r.score));
      const fill=document.createElement('div');fill.className='daily-result-fill';fill.style.width=r.score+'%';track.append(fill);row.append(heading,track);summary.append(row);
    });return;
  }
  $('daily-progress').textContent='Розподіл '+(idx+1)+' із 3';$('daily-question').textContent=q.title;$('daily-context').textContent=q.note;
  // Revealed rounds stay at their saved index until the player presses Next.
  renderDailyRound();
}
function renderDailyRound(){
  const idx=D.revealed?D.results.length-1:D.results.length,q=D.plan[idx],result=D.revealed?D.results[idx]:null;
  $('daily-progress').textContent='Розподіл '+(idx+1)+' із 3';$('daily-question').textContent=q.title;$('daily-context').textContent=q.note;
  paintPie($('daily-pie'),result?result.guess:D.shares,q.labels);
  $('daily-compare').hidden=!result;$('daily-controls').hidden=!!result;$('daily-submit').hidden=!!result;$('daily-next').hidden=!result;
  $('daily-next').textContent=idx===2?'Підсумок дня':'Наступний розподіл';
  const legend=$('daily-legend');legend.replaceChildren();q.labels.forEach((name,i)=>{const row=document.createElement('div');row.className='daily-key';const swatch=document.createElement('i');swatch.style.background=DAILY_COLORS[i];const label=document.createElement('span');label.textContent=name;const val=document.createElement('strong');val.id='daily-value-'+i;val.textContent=fmt((result?result.guess:D.shares)[i])+'%';row.append(swatch,label,val);legend.append(row);});
  if(result){
    paintPie($('daily-truth'),q.values,q.labels);$('daily-round-score').textContent=result.score+'% · '+result.score+' очок';
    const detail=$('daily-answer');detail.replaceChildren();q.labels.forEach((label,i)=>{const line=document.createElement('p');line.textContent=label+': '+fmt(q.values[i])+'% (твоя частка '+fmt(result.guess[i])+'%)';detail.append(line);});
    const source=$('daily-source');source.textContent='Джерело: '+q.sourceName;source.href=q.source;source.target='_blank';source.rel='noopener noreferrer';
    $('daily-your-caption').textContent='Твій розподіл';
  }else{
    $('daily-answer').replaceChildren();$('daily-round-score').textContent='';$('daily-source').textContent='';$('daily-source').removeAttribute('href');
    $('daily-your-caption').textContent='Твій розподіл';const controls=$('daily-controls');controls.replaceChildren();
    q.labels.slice(0,3).forEach((name,i)=>{const label=document.createElement('label');label.textContent=name;const input=document.createElement('input');input.type='range';input.min=0;input.max=100-D.shares[3];input.step='any';input.value=D.shares[i];input.setAttribute('aria-label',name+', частка у відсотках');input.id='daily-slider-'+i;input.oninput=()=>{D.shares=rebalanceShares(D.shares,i,input.value);paintPie($('daily-pie'),D.shares,q.labels);D.shares.forEach((v,j)=>{$('daily-value-'+j).textContent=fmt(Math.round(v*10)/10)+'%';if(j<3)$('daily-slider-'+j).value=v;});saveDaily();};label.append(input);controls.append(label);});
  }
}
function submitDaily(){
  if(!D||D.revealed||D.results.length>=3)return;
  if(D.day!==kyivDay()){showDaily();return;}
  const latest=loadDaily(D.day);if(latest.results.length>D.results.length||latest.revealed){D=latest;renderDaily();return;}
  const q=D.plan[D.results.length],guess=D.shares.slice(),score=dailyAccuracy(guess,q.values);
  D.results.push({guess,score});D.revealed=true;saveDaily();renderDailyRound();playSound(score===100?'perfect':'success');
}
function nextDaily(){if(!D?.revealed)return;D.revealed=false;D.shares=initialDailyShares(D.plan[Math.min(D.results.length,2)]);saveDaily(true);renderDaily();dailyClock();}
$('daily-submit').onclick=submitDaily;$('daily-next').onclick=nextDaily;$('mode-daily').onclick=showDaily;
setInterval(dailyClock,1000);
