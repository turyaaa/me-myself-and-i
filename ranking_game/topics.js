const TOPIC_OPTIONS={
 'Фільми':[['potter','Гаррі Поттер'],['starwars','Star Wars'],['marvel','Marvel']],
 'Музика':[['rock','Рок'],['rap','Реп / хіп-хоп'],['pop','Поп']],
 'Серіали':[['breakingbad','Breaking Bad'],['got','Гра престолів'],['friends','Друзі'],['stranger','Дивні дива'],['saul','Краще подзвоніть Солу'],['office','Офіс']]
};
let topicPicker=null,quizSelection=null,blitzSelection=null;
function topicCats(group,ids){return group.cats.map(c=>({...c,items:c.items.filter(i=>!ids.length||ids.some(id=>i[2]?.includes(id)))}));}
function selectionCats(selection){
 if(!selection)return allGroup.cats;
 const group=GROUPS.find(g=>g.name===selection.family);return group?topicCats(group,selection.ids):allGroup.cats;
}
function topicQuiz(selection){
 if(!selection)return QUIZ;
 const matching=TOPIC_MATCHERS;
 return QUIZ.filter(c=>c.name===selection.family||c.topicFamily===selection.family).map(c=>({...c,qs:c.qs.filter(q=>!selection.ids.length||selection.ids.includes(c.topicId)||selection.ids.some(id=>matching[id]?.test(q.join(' '))))})).filter(c=>c.qs.length);
}
function blitzPool(selection){return [...selectionCats(selection),...topicQuiz(selection).filter(c=>c.blitz).map(c=>({title:c.name,kind:'trivia',items:c.qs.map(q=>[q[0],q[1],[c.topicId]])}))];}
function openTopicPicker(group,kind){
 let ids=[];try{ids=JSON.parse(store.get('topic_'+group.name)||'[]').filter(id=>TOPIC_OPTIONS[group.name].some(x=>x[0]===id));}catch(_){}
 topicPicker={group,kind,ids};show('topic-picker');$('topic-title').textContent=group.name;renderTopicPicker();
}
function renderTopicPicker(){
 const {group,ids,kind}=topicPicker,box=$('topic-options');box.replaceChildren();
 [['','Усе разом'],...TOPIC_OPTIONS[group.name]].forEach(([id,label])=>{const b=document.createElement('button');b.textContent=label;b.setAttribute('aria-pressed',id?ids.includes(id):!ids.length);b.onclick=()=>{topicPicker.ids=id?(ids.includes(id)?ids.filter(x=>x!==id):[...ids,id]):[];renderTopicPicker();};box.append(b);});
 const selection={family:group.name,ids},cats=kind==='blitz'?blitzPool(selection):topicCats(group,ids),minimum=kind==='blitz'?4:5;
 const eligible=cats.filter(c=>new Set(c.items.map(i=>i[1])).size>=minimum),quiz=topicQuiz(selection),count=kind==='quiz'?quiz.reduce((n,c)=>n+c.qs.length,0):eligible.reduce((n,c)=>n+c.items.length,0);
 $('topic-note').textContent=count?count+' '+(kind==='quiz'?'питань':'карток')+' у добірці. Можна вибрати кілька тем.':'Для цього режиму матеріалу поки замало. Обери ще одну добірку або все разом.';
 $('topic-start').disabled=!count||(kind==='blitz'&&count<15);
 if(kind==='blitz'&&count<15)$('topic-note').textContent='Для Блітзу потрібно 15 різних питань. Обери кілька добірок або все разом.';
 $('topic-start').onclick=()=>{
  store.set('topic_'+group.name,JSON.stringify(ids));
  const label=ids.length?ids.map(id=>TOPIC_OPTIONS[group.name].find(x=>x[0]===id)[1]).join(' + '):'Усе разом';
  if(kind==='quiz'){quizSelection=selection;openQuiz();return;}
  if(kind==='blitz'){blitzSelection=selection;showBlitzSetup();return;}
  const selected={name:group.name+' · '+label,cats:eligible};kind==='guess'?startGuess(selected):startGame(selected);
 };
}
$('topic-back').onclick=()=>topicPicker?.kind==='quiz'?openQuiz():topicPicker?.kind==='blitz'?showBlitzSetup():showMenu(menuMode);
