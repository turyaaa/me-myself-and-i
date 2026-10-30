const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(source);
const elements = new Map(), saved = new Map();
function element() {
  return {
    hidden: true, children: [], dataset: {}, attributes: {}, events: {},
    style: {setProperty() {}}, classList: {add() {}, remove() {}, toggle() {}},
    setAttribute(k,v) {this.attributes[k]=v}, removeAttribute(k){delete this.attributes[k]}, focus(){},
    addEventListener(k,fn) {this.events[k]=fn},
    appendChild(x) {this.children.push(x); return x}, append(...xs) {this.children.push(...xs)},
    replaceChildren(...xs) {this.children=xs}, querySelector() {return element()}, querySelectorAll() {return []}, insertAdjacentHTML() {},
    set innerHTML(v) {this.children=[]}, get innerHTML() {return ''},
    textContent: '', value: '', max: 1000, offsetWidth: 1,
  };
}
const byId = id => {if(!elements.has(id)) elements.set(id,element()); return elements.get(id)};
const context = vm.createContext({
  console, Math, Date, Number, JSON, Error, Set, Map, Array, Object, String, parseFloat, isFinite, Intl,
  assert, element, performance: {now:()=>0},
  localStorage: {getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,String(v))},
  document: {getElementById:byId,documentElement:{dataset:{}},body:element(),createElement:element,addEventListener(){},querySelectorAll:()=>[]},
  window: {scrollTo(){},addEventListener(){},matchMedia:()=>({matches:true})},
  matchMedia:()=>({matches:true}), requestAnimationFrame:()=>{},setTimeout:()=>1,clearTimeout:()=>{},setInterval:()=>1,clearInterval:()=>{},confirm:()=>false,
});
vm.runInContext(source,context);
const results = vm.runInContext(`
const results={};
let cards=0, rankingRounds=0;
for(const cat of GROUPS.flatMap(g=>g.cats)) {
  const sc=makeScale(cat,cat.items.every(i=>Number.isInteger(i[1])));
  assert(sc.minLabel>0 && sc.maxLabel>sc.minLabel && Number.isFinite(sc.ticks),cat.title);
  for(const [name,value]of cat.items) {
    assert(Number.isFinite(value) && value>0,name);
    assert(value>=sc.minLabel && value<=sc.maxLabel,name);
    assert(Math.abs(sc.toVal(sc.toPos(value))-value)<=sc.step*.5001,name);
    cards++;
  }
  for(let i=1;i<=150;i++) assert(sc.toVal(i/100)>=sc.toVal((i-1)/100),cat.title);
  assert(Math.abs(sc.toPos(sc.minLabel+(sc.maxLabel-sc.minLabel)*.75)-sc.toPos(sc.minLabel+(sc.maxLabel-sc.minLabel)*.25)-.5)<1e-9,cat.title);
  G={queues:{}};
  for(let i=0;i<10;i++) {
    const drawn=drawItems(cat);
    assert.equal(drawn.length,5);assert.equal(new Set(drawn.map(x=>x.name)).size,5);
    const far=(x,y)=>cat.minDiff?Math.abs(x.value-y.value)>=cat.minDiff:Math.max(x.value,y.value)/Math.min(x.value,y.value)>=(cat.minRatio||1.1)-1e-9;
    assert(drawn.every((x,i)=>drawn.slice(i+1).every(y=>far(x,y))),cat.title);
    rankingRounds++;
  }
}
for(const c of QUIZ) {
  assert.equal(c.qs.length%5,0,c.name);
  assert.equal(new Set(c.qs.map(p=>p[0])).size,c.qs.length,c.name);
  assert(c.qs.every(p=>p.length===2&&p.every(t=>typeof t==='string'&&t.trim())),c.name);
  for(let i=0;i<10;i++) assert(toSlots(c.qs).every(q=>q&&q.q&&q.a),c.name);
}
results.categories=GROUPS.flatMap(g=>g.cats).length;
results.cards=cards;results.rankingRounds=rankingRounds;
results.quizTopics=QUIZ.length;results.quizQuestions=QUIZ.reduce((n,c)=>n+c.qs.length,0);
// Equal year intervals have proportional space; even long periods retain a one-year step.
const yearCat={unit:'р.',items:[['a',1950],['b',2026]]};
const yearScale=makeScale(yearCat,true);
assert(Math.abs((yearScale.toPos(1980)-yearScale.toPos(1950))/30-(yearScale.toPos(2026)-yearScale.toPos(2023))/3)<1e-12);
const oldScale=makeScale({unit:'р.',items:[['a',9],['b',2026]]},true);
for(let y=oldScale.minLabel;y<=oldScale.maxLabel;y++) assert.equal(oldScale.toVal(oldScale.toPos(y)),y);
// A mixed fractional category must not round its small answers to one.
const mixed=makeScale({unit:'кг',items:[['a',.015],['b',25]]},false);
assert.equal(mixed.toVal(mixed.toPos(.015)),.015);
SCREENS.forEach(n=>$(n).hidden=true);$('guess').hidden=false;
V={phase:'guess',round:1,score:0,group:{name:'test'},cur:{cat:yearCat,item:['Event',2013],sc:yearScale,bounds:yearScale,whole:true}};
$('gval').value='2018';updateGuessSlider(2018);
$('gval').value='1950';$('gval').events.input();assert.equal(V.cur.sc,yearScale);assert.equal(Number($('gslider').value),Math.round(yearScale.toPos(1950)*yearScale.ticks));
$('gval').value='2020';$('gval').events.input();assert.equal(V.cur.sc,yearScale);
$('gval').value='2018.5';confirmGuess();assert.equal(V.phase,'guess');
$('gval').value='1800';confirmGuess();assert.equal(V.phase,'guess');
$('gval').value='2018';confirmGuess();assert.equal(V.phase,'done');assert.equal($('gtext').children.length,3);
const score=V.score;confirmGuess();assert.equal(V.score,score);
let left=false;navigate(()=>left=true);assert.equal(left,false);
SCREENS.forEach(n=>$(n).hidden=true);$('editor').hidden=false;$('edit').hidden=false;
editDraft={name:'changed'};editBaseline='{}';navigate(()=>left=true);assert.equal(left,false);
// Import remains non-destructive after expanding the built-in bank.
CUSTOM=[];
let imported=importData('категорія;бали;питання;відповідь\\nТест;100;Q;A\\nТест;100;overwrite;bad\\nТест;149;bad;bad');
assert.equal(imported.qn,1);assert.equal(imported.skipped,2);assert.equal(CUSTOM[0].qs[0][0],'Q');
imported=importData(JSON.stringify({categories:[{name:'Тест',questions:[{points:100,q:'overwrite',a:'bad'},{points:200,q:'Q2',a:'A2'}]}]}));
assert.equal(imported.qn,1);assert.equal(imported.skipped,1);assert.equal(CUSTOM[0].qs[0][0],'Q');
assert.throws(()=>importData('{"categories":{}}'));
assert.throws(()=>parseCSV('"unclosed'));
results.linearScales='passed';results.fullRangeSlider='passed';results.answerValidation='passed';results.resultCards='passed';results.doubleSubmit='passed';results.navigationSafeguards='passed';results.importRegression='passed';
assert.equal(GROUPS.filter(g=>['Література','Українська література'].includes(g.name)).reduce((n,g)=>n+g.cats.length,0),8);
assert.equal(QUIZ.find(c=>c.name==='Література').qs.length,75);
assert.equal(QUIZ.find(c=>c.name==='Українська література').qs.length,30);
for(const g of GROUPS) assert(ICONS[g.name]&&ICONS[g.name].includes('<svg'),g.name);
assert.notEqual(ICONS['Хімія'],ICONS['Біологія']);
assert.notEqual(ICONS['Література'],ICONS.edit);
assert.equal($('gslider').events.change,undefined);
const realSound=playSound, feedback=[];
playSound=kind=>feedback.push(kind);
V={phase:'guess',round:1,score:0,group:{name:'test'},cur:{cat:yearCat,item:['Event',2013],sc:yearScale,bounds:yearScale,whole:true}};
$('gval').value='2013';confirmGuess();assert.equal(feedback.pop(),'perfect');
V.phase='guess';$('gval').value='2014';confirmGuess();assert.notEqual(feedback.pop(),'perfect');
const decimalCat={unit:'кг',items:[['a',100],['b',200]]};
const decimalScale=makeScale(decimalCat,false);
V={phase:'guess',round:1,score:0,group:{name:'test'},cur:{cat:decimalCat,item:['a',100],sc:decimalScale,bounds:decimalScale,whole:false}};
$('gval').value='100.01';confirmGuess();assert.equal(guessScore(decimalCat,100.01,100),100);assert.notEqual(feedback.pop(),'perfect');
G={group:{name:'test'},round:1,score:0,max:0};
current={cat:{unit:'кг'},correct:Array.from({length:5},(_,i)=>({name:'card'+i,value:100-i*10}))};
list.children=current.correct.map(it=>{const c=element();c.dataset.name=it.name;return c;});
check();assert.equal(feedback.pop(),'perfect');
G.score=0;G.max=0;list.children=current.correct.map(it=>{const c=element();c.dataset.name=it.name;return c;});
[list.children[0],list.children[1]]=[list.children[1],list.children[0]];
check();assert.notEqual(feedback.pop(),'perfect');
playSound=realSound;
assert.equal(soundEnabled,false);assert.equal(audioContext,null);
let voicesCreated=0,voicesStopped=0;
window.AudioContext=function(){
  this.state='running';this.currentTime=0;this.destination={};
  this.createGain=()=>({gain:{value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}});
  this.createOscillator=()=>({frequency:{value:0},connect(){},disconnect(){},start(){voicesCreated++},stop(){voicesStopped++}});
};
playSound('win');assert.equal(voicesCreated,0);
$('sound').onclick();assert.equal(soundEnabled,true);assert.equal(voicesCreated,3);assert.equal(store.get('sound'),'on');
$('sound').onclick();assert.equal(soundEnabled,false);assert.equal(activeVoices.size,0);assert(voicesStopped>=6);assert.equal(store.get('sound'),'off');
playSound('success');assert.equal(voicesCreated,3);
soundEnabled=true;document.hidden=true;playSound('win');assert.equal(voicesCreated,3);document.hidden=false;
playSound('perfect');assert.equal(voicesCreated,11);assert.equal(activeVoices.size,8);muteSounds();assert.equal(activeVoices.size,0);
// Unsupported browsers and blocked audio must not prevent a game action.
audioContext=null;window.AudioContext=undefined;playSound('success');assert.equal(voicesCreated,11);
results.perfectRewardOnlyForExactAnswers='passed';results.sliderSilent='passed';
results.literatureExpansion='passed';results.iconCoverage='passed';results.soundOptInAndMute='passed';results.soundUnavailableFallback='passed';
// Blitz uses a monotonic ten-second deadline, rejects double submits, and ends after fifteen questions.
let blitzNow=1000;performance.now=()=>blitzNow;soundEnabled=false;
showBlitzSetup();assert.equal(B.phase,'setup');startSoloBlitz();
assert.equal(B.plan.length,15);assert.equal(B.startsAt-blitzNow,3000);assert.equal(B.deadline-B.startsAt,10000);submitBlitz(B.plan[0].correct);assert.equal(B.score,0);assert.equal(B.phase,'question');
assert(B.plan.every(q=>q.options.length===4&&new Set(q.options).size===4));
assert.equal(new Set(B.plan.map(q=>q.id)).size,15);
assert.equal(inProgress(),true);
blitzNow=B.deadline-1;submitBlitz(B.plan[0].correct);assert.equal(B.score,100);assert.equal(B.phase,'result');
submitBlitz(B.plan[0].correct);assert.equal(B.score,100);
nextSoloBlitz();blitzNow=B.deadline;submitBlitz(B.plan[1].correct);assert.equal(B.selected,null);assert.equal(B.score,100);
for(let i=3;i<=15;i++){nextSoloBlitz();submitBlitz(B.plan[i-1].correct);}
assert.equal(B.phase,'end');assert.equal(B.round,15);assert.equal(B.score,1400);assert.equal(store.get('bestb_Всі'),'93');assert.equal(inProgress(),false);
for(const [a,b,kind] of [[300,100,'win'],[200,200,'draw'],[100,300,'loss']]){
 const players=[{score:b,you:false},{score:a,you:true}];assert.equal(blitzOutcome(players).kind,kind);
 const dialog=$('boutcome');dialog.showModal=()=>dialog.open=true;dialog.close=()=>dialog.open=false;
 showBlitzOutcome(players);assert.equal(dialog.open,true);assert.equal(dialog.dataset.result,kind);assert.equal($('boutcome-score').textContent,a+' : '+b);closeBlitzOutcome();assert.equal(dialog.open,false);
}
results.duelOutcomeWinDrawLoss='passed';results.blitzInitialCountdown='passed';results.blitzTenSecondDeadline='passed';results.blitzDoubleSubmitAndFinalScore='passed';
// Daily attempts persist through reloads, show each reveal, and stay locked after completion.
assert.equal(kyivDay(new Date('2026-10-24T21:30:00Z')),'2026-10-25');
assert(Math.abs(nextKyivDay(new Date('2026-10-24T21:30:00Z'))-Date.parse('2026-10-25T22:00:00Z'))<1000);
assert(Math.abs(nextKyivDay(new Date('2026-03-28T22:30:00Z'))-Date.parse('2026-03-29T21:00:00Z'))<1000);
assert.equal(dailyAccuracy([25,25,25,25],[25,25,25,25]),100);
assert.equal(dailyAccuracy([100,0,0,0],[0,100,0,0]),0);
assert(dailyAccuracy([0,0,0,100],[3,3,3,91])<25);
for(const q of DAILY_BANK){assert.equal(q.values.length,4);assert(Math.abs(q.values.reduce((a,b)=>a+b,0)-100)<.001);assert(q.values.every(v=>v>=0));assert(q.source.startsWith('https://'));}
for(let i=0;i<100;i++){const shares=rebalanceShares([25,25,25,25],i%3,i);assert(Math.abs(shares.reduce((a,b)=>a+b,0)-100)<1e-9);assert(shares.every(v=>v>=-1e-9));assert.equal(shares[i%3],Math.min(i,75));assert.equal(shares[3],25);}
assert.equal(new Set(dailyPlan('2026-10-30').map(q=>q.family)).size,3);
assert.equal(JSON.stringify(dailyPlan('2026-10-30')),JSON.stringify(dailyPlan('2026-10-30')));
showDaily();assert.equal(D.results.length,0);
D.shares=D.plan[0].values.slice();submitDaily();assert.equal(D.results[0].score,100);submitDaily();assert.equal(D.results.length,1);
D=null;showDaily();assert.equal(D.results.length,1);assert.equal(D.revealed,true);nextDaily();
for(let i=1;i<3;i++){D.shares=D.plan[i].values.slice();submitDaily();if(i===1)nextDaily();}
D=null;showDaily();assert.equal(D.results.length,3);assert.equal($('daily-game').hidden,false);assert.equal($('daily-compare').hidden,false);
nextDaily();assert.equal($('daily-finish').hidden,false);assert.equal($('daily-total').textContent,'100%');
showDaily();submitDaily();assert.equal(D.results.length,3);assert.equal($('daily-card-state').textContent,'Повертайтесь завтра!');
const completedDay=D.day;D={...D,results:[],revealed:false};assert.equal(saveDaily(),false);assert.equal(D.results.length,3);assert.equal(loadDaily(completedDay).results.length,3);
results.dailySavedAttemptAndLock='passed';results.dailyKyivDST='passed';results.dailyScoringAndSectors='passed';
assert.deepEqual(CLUSTERS.map(c=>c[0]),['Світ','Наука','Природа','Спорт','Розваги','Література']);
assert(GROUPS.find(g=>g.name==='Аніме').cats.length>=3);
for(const [family,opts] of Object.entries(TOPIC_OPTIONS))for(const [id] of opts){
 const filtered=topicCats(GROUPS.find(g=>g.name===family),[id]);if(!['Серіали','Футбол'].includes(family))assert(filtered.some(c=>new Set(c.items.map(i=>i[1])).size>=5),id);
 assert(topicQuiz({family,ids:[id]}).reduce((n,c)=>n+c.qs.length,0)>=5,id);
}
const sample=GROUPS.find(g=>g.name==='Фільми');openTopicPicker(sample,'rank');topicPicker.ids=['starwars','potter'];renderTopicPicker();assert.equal($('topic-start').disabled,false);$('topic-start').onclick();assert(G.group.cats.every(c=>c.items.every(i=>i[2].some(id=>['starwars','potter'].includes(id)))));
assert(blitzLabels([2.952,.71,1.01,.217],'млн').every(x=>x.includes('млн')));
assert.equal(new Set(blitzLabels([1.001,1.002,1.003,1.004],'млн')).size,4);
results.topicFiltersAndAnime='passed';results.blitzReadableUnits='passed';
blitzSelection={family:'Фільми',ids:['potter','starwars']};const filteredBlitz=makeBlitzPlan();assert.equal(filteredBlitz.length,15);assert.equal(new Set(filteredBlitz.map(q=>q.id)).size,15);assert(filteredBlitz.every(q=>/Star Wars|Гаррі Поттер/.test(q.category)));
blitzSelection={family:'Аніме',ids:[]};assert.equal(makeBlitzPlan().length,15);blitzSelection=null;
results.blitzTopicSelection='passed';
// Fixed remainder survives long edits and cannot contribute to the score.
let fixed=initialDailyShares({values:[2,3,5,90]});for(let i=0;i<500;i++){fixed=rebalanceShares(fixed,i%3,(i*17)%101);assert.equal(fixed[3],90);assert(Math.abs(fixed.reduce((a,b)=>a+b,0)-100)<1e-8);assert(fixed.slice(0,3).every(v=>v>=-1e-8&&v<=10+1e-8));}
assert.equal(dailyAccuracy([2,3,5,90],[2,3,5,0]),100);
assert.deepEqual(rebalanceShares([0,0,0,100],0,50),[0,0,0,100]);
const dailyBefore=JSON.stringify(D);D.results=[{score:95},{score:94},{score:100}];D.revealed=false;renderDaily();
assert.equal($('daily-summary').children.length,3);assert($('daily-summary').children[0].className.includes('exceptional'));assert(!$('daily-summary').children[1].className.includes('exceptional'));assert.equal($('daily-summary').children[2].children[1].children[0].style.width,'100%');D=JSON.parse(dailyBefore);
V={phase:'guess',round:1,score:0,group:{name:'test'},cur:{cat:yearCat,item:['Event',2013],sc:yearScale,bounds:yearScale,whole:true}};$('gval').value='2013';confirmGuess();assert($('gtext').children[2].className.includes('exact'));assert.equal($('gtext').children[2].children[1].textContent,'Немає — точна відповідь!');
V.phase='guess';$('gval').value='2014';confirmGuess();assert(!$('gtext').children[2].className.includes('exact'));
assert(GROUPS.find(g=>g.name==='Фільми').cats.every(c=>c.items.every(i=>! /^(Star Wars|Marvel):/.test(i[0]))));
blitzSelection={family:'Серіали',ids:['breakingbad']};const bbPlan=makeBlitzPlan();assert.equal(bbPlan.length,15);assert(bbPlan.every(q=>q.category.includes('Breaking Bad')));assert(bbPlan.every(q=>q.options.every(v=>typeof v==='string')));blitzSelection=null;
results.dailyFixedRemainder='passed';results.dailySummaryBars='passed';results.exactGuessFeedback='passed';results.storyBlitzAndShortFilmTitles='passed';
for(const c of QUIZ.filter(c=>c.blitz))for(const [question,answer] of c.qs){const wrong=c.distractors[question];assert.equal(wrong.length,3);assert.equal(new Set([answer,...wrong]).size,4);}
const friends=QUIZ.find(c=>c.name==='Друзі · персонажі та історії');
assert(friends.distractors['У якому місті переважно живуть головні герої?'].every(v=>['Бостон','Чикаго','Сіетл'].includes(v)));
assert(friends.distractors['Як звати дружину Чендлера?'].every(v=>['Рейчел Ґрін','Фібі Буффе','Дженіс'].includes(v)));
for(const [id] of TOPIC_OPTIONS['Серіали']){
 const group=GROUPS.find(g=>g.name==='Серіали');
 for(const kind of ['rank','guess']){openTopicPicker(group,kind);topicPicker.ids=[id];renderTopicPicker();assert.equal($('topic-start').disabled,false,id+' '+kind);}
}
for(const [family,ids] of [['Фільми',['lotr','nolan','tarantino','spielberg']],['Серіали',TOPIC_OPTIONS['Серіали'].map(x=>x[0])]]){blitzSelection={family,ids};assert.equal(makeBlitzPlan().length,15);}
blitzSelection={family:'Географія',ids:[]};assert.equal(makeBlitzPlan().length,15);blitzSelection=null;
assert.equal(blitzPlan([{title:'Unreviewed',kind:'trivia',items:[['a','1'],['b','2'],['c','3'],['d','4']]}]).length,0);
results.curatedPlausibleDistractors='passed';results.allSeriesNumericPlayable='passed';results.newFilmCollections='passed';results.blitzAllTopics='passed';
for(const g of GROUPS){blitzSelection={family:g.name,ids:[]};assert.equal(makeBlitzPlan().length,15,g.name);}blitzSelection=null;
B={phase:'end',online:false};show('blitz');$('bhome').onclick();assert.equal($('home').hidden,false);
renderSidebar();const navLabels=$('sidebar').children.filter(x=>x.className?.startsWith('sbi')).map(x=>x.children[x.children.length-1].textContent);assert.equal(navLabels.slice(0,3).join('|'),'Головна|Профіль|Поділи світ · Щодня');assert.equal(navLabels.filter(x=>x==='Профіль').length,1);
results.blitzMenuAndNavigation='passed';
// Published Daily calendar: 90 new tasks, never a date-seeded repeat cycle.
const seasonDays=Object.keys(DAILY_SCHEDULE.days).sort(),seasonIds=seasonDays.flatMap(day=>DAILY_SCHEDULE.days[day]);
assert.equal(DAILY_BANK.length,101);assert.equal(seasonDays.length,30);assert.equal(seasonIds.length,90);assert.equal(new Set(seasonIds).size,90);
const familyCounts=new Map();let previousFamilies=[];
for(const [i,day] of seasonDays.entries()){
 const plan=dailyPlan(day);assert.equal(plan.length,3);assert(plan.every(q=>q.edition==='daily-2026-10'));
 const families=plan.map(q=>q.family);assert.equal(new Set(families).size,3);families.forEach(f=>familyCounts.set(f,(familyCounts.get(f)||0)+1));
 if(i)assert(families.filter(f=>previousFamilies.includes(f)).length<=1);
 if(i%2)assert.equal(new Set([...families,...previousFamilies]).size,6);
 previousFamilies=families;
}
assert.equal(familyCounts.size,6);assert([...familyCounts.values()].every(n=>n===15));
assert.equal(dailyPlan('2026-11-30').length,0);assert.equal(dailyPlan('2027-10-31').length,0);
const currentDaily=D;D=loadDaily('2026-11-30');renderDaily();assert.equal($('daily-unavailable').hidden,false);assert.equal($('daily-game').hidden,true);D=currentDaily;renderDaily();
// Five percentage points moved costs five points, even with tiny true sectors.
assert.equal(dailyAccuracy([.1,20,79.9,0],[.1,25,74.9,0]),95);
assert.equal(dailyAccuracy([25,25,25,25],[10,20,45,25]),73);
assert.equal(dailyAccuracy([0,40,60,0],[1,40,59,0]),99);
results.dailySeason={newTasks:90,days:30,noRepeats:true,balancedThemes:true,noLoopAfterEnd:true};results.dailyGentlerScoring='passed';
// All football selections use curated text questions, with the same rule online.
const football=QUIZ.filter(c=>c.topicFamily==='Футбол');assert.equal(football.length,1);assert.equal(football[0].name,'Футбол');assert.equal(football[0].qs.length,30);assert.equal(TOPIC_OPTIONS['Футбол'],undefined);
blitzSelection={family:'Футбол',ids:[]};assert.equal(makeBlitzPlan().length,15);assert(makeBlitzPlan().every(q=>q.options.every(v=>typeof v==='string')));
blitzSelection={family:'Футбол',ids:[]};assert.equal(makeBlitzPlan().length,15);blitzSelection=null;
results.footballCuratedQuiz={collections:1,questions:30};
// Timed overlays hide exactly when answers become available, and on leaving.
let countNow=0,timerTick,startedCount=0,expiredCount=0,popCount=0;performance.now=()=>countNow;
setInterval=fn=>{timerTick=fn;return 1;};
const oldDigitAdd=$('bcountdown-digit').classList.add;$('bcountdown-digit').classList.add=()=>popCount++;
startBlitzClock(13000,()=>expiredCount++,3000,()=>startedCount++);
assert.equal($('bcountdown').hidden,false);assert.equal($('bcountdown-digit').textContent,'3');assert.equal(popCount,1);
startBlitzClock(13000,()=>expiredCount++,3000,()=>startedCount++);assert.equal(popCount,1);
for(let second=1;second<3;second++){countNow=second*1000;timerTick();assert.equal($('bcountdown-digit').textContent,String(3-second));}
countNow=3000;timerTick();assert.equal($('bcountdown').hidden,true);assert.equal(startedCount,1);assert.equal(expiredCount,0);
countNow=13000;timerTick();assert.equal(expiredCount,1);showBlitzCountdown(3);stopBlitzClock();assert.equal($('bcountdown').hidden,true);
$('bcountdown-digit').classList.add=oldDigitAdd;results.blitzBigCountdown='passed';
// Secret triggers on click 15, ignores clicks during the spin, then resets.
const previousSound=playSound,previousTimeout=setTimeout;let secretSounds=[],spinReset;
playSound=kind=>secretSounds.push(kind);setTimeout=fn=>{spinReset=fn;return 1;};
for(let i=0;i<14;i++)tapMainLogo();assert.equal(secretSounds.length,0);tapMainLogo();assert.equal(secretSounds.join('|'),'silly');assert.equal(logoSpinning,true);
tapMainLogo();assert.equal(secretSounds.length,1);spinReset();assert.equal(logoSpinning,false);assert.equal(logoClicks,0);
for(let i=0;i<15;i++)tapMainLogo();assert.equal(secretSounds.length,2);spinReset();playSound=previousSound;setTimeout=previousTimeout;
results.logoSecret15Clicks='passed';
const savedDailyForQA=D;
for(const day of seasonDays){
 const plan=dailyPlan(day);D={day,plan,results:[],shares:initialDailyShares(plan[0]),revealed:false};
 for(let i=0;i<3;i++){
  renderDaily();assert.equal($('daily-controls').children.length,3);
  D.shares=plan[i].values.slice();D.results.push({guess:D.shares.slice(),score:dailyAccuracy(D.shares,plan[i].values)});D.revealed=true;renderDailyRound();
  assert.equal(D.results[i].score,100);assert.equal($('daily-source').href,plan[i].source);D.revealed=false;
  if(i<2)D.shares=initialDailyShares(plan[i+1]);
 }
 renderDaily();assert.equal($('daily-finish').hidden,false);assert.equal($('daily-total').textContent,'100%');
}
D=savedDailyForQA;results.dailyAll90RoundsRender='passed';
// Selecting five exact categories must not randomize or duplicate them.
openQuiz();chooseQuizCategories('std');
const chooserBox=$('qsetup'),choiceGrid=chooserBox.children[3],choiceActions=chooserBox.children[4];
assert.equal(choiceActions.children[0].disabled,true);
for(let i=0;i<5;i++)choiceGrid.children[i].onclick();
assert.equal(quizCategoryChoice.selected.length,5);assert.equal(choiceActions.children[0].disabled,false);assert.equal(choiceGrid.children[5].disabled,true);
const expectedCategories=quizCategoryChoice.selected.map(i=>quizCategoryChoice.source[i].name).join('|');choiceActions.children[0].onclick();
assert.equal(Q.cats.map(c=>c.name).join('|'),expectedCategories);assert.equal(Q.cats.length,5);
openQuiz();chooseQuizCategories('std');$('qsetup').children[4].children[1].onclick();assert.equal(Q.cats.length,5);
$('qend').hidden=false;$('qsetup').hidden=true;chooseQuizCategories('std');assert.equal($('qsetup').hidden,false);assert.equal($('qend').hidden,true);
const libraryCats=Array.from({length:7},(_,i)=>({name:'Авторська '+i,qs:Array.from({length:5},(_,j)=>['Питання '+j,'Відповідь '+j])}));
const libraryRow={title:'Гра для компанії',author_name:'Автор',description:'Опис',categories:libraryCats};
assert.equal(cleanLibraryQuiz(libraryRow,true).categories.length,7);
for(const bad of [{...libraryRow,categories:libraryCats.slice(0,4)},{...libraryRow,title:''},{...libraryRow,categories:[libraryCats[0],...libraryCats.slice(0,4)]},{...libraryRow,categories:libraryCats.map(c=>({...c,qs:[['q','a']]}))}])assert.throws(()=>cleanLibraryQuiz(bad,true));
playLibraryQuiz(libraryRow);const libraryGrid=$('qsetup').children[3];for(let i=6;i>=2;i--)libraryGrid.children[i].onclick();$('qsetup').children[4].children[0].onclick();
assert.equal(Q.cats.map(c=>c.name).join('|'),'Авторська 6|Авторська 5|Авторська 4|Авторська 3|Авторська 2');
libraryQuizSource.categories[6].qs[0][0]='changed';assert.equal(libraryCats[6].qs[0][0],'Питання 0');
L.user={id:'author-a'};L.draft={...libraryRow,owner_id:'author-a'};persistLibraryDraft();assert(store.get('ranking_library_draft_author-a'));L.user={id:'author-b'};composeLibraryQuiz();assert.notEqual(L.draft.owner_id,'author-a');
quizSelection={family:'Футбол',ids:[]};openQuiz();chooseQuizCategories('std');assert.equal(quizCategoryChoice.source.length,1);$('qsetup').children[3].children[0].onclick();assert.equal($('qsetup').children[4].children[0].disabled,false);$('qsetup').children[4].children[0].onclick();assert.equal(Q.cats.length,1);assert.equal(Q.total,5);quizSelection=null;results.footballSingleCategoryPlayable='passed';
results.quizManualFiveAndRandom='passed';results.libraryAuthorValidation='passed';results.libraryLocalMultiplayer='passed';results.libraryDraftAccountIsolation='passed';
L.user=null;A.profile=null;renderAccountLinks();assert.equal($('home-auth-actions').hidden,false);assert.equal($('lib-auth-actions').hidden,false);assert($('profile-toggle').attributes['aria-label'].includes('Увійти'));
show('quiz');Q.used=1;$('profile-toggle').onclick();assert.equal($('quiz').hidden,false);Q.used=0;$('profile-toggle').onclick();assert.equal($('account').hidden,false);
L.user={id:'icon-test'};A.profile={id:'icon-test',nickname:'Мій нік'};renderAccountLinks();assert.equal($('home-auth-actions').hidden,true);assert.equal($('lib-auth-actions').hidden,true);assert.equal($('profile-toggle').attributes['title'],'Профіль · Мій нік');
results.profileIconAndNavigation='passed';
JSON.stringify(results,null,2);
`,context);
assert(html.indexOf('id="mode-blitz"')<html.indexOf('id="mode-rank"'));
assert(html.indexOf('id="mode-rank"')<html.indexOf('id="mode-guess"'));
assert(!html.includes('id="gzoom"'));assert(!html.includes('id="greset"'));assert(!html.includes('refineGuessScale'));assert(!html.includes('id="home-profile"'));assert(!html.includes('id="lib-profile"'));assert(html.includes('id="profile-toggle"'));
console.log(results);
