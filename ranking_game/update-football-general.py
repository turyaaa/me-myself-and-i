from pathlib import Path
import json,re
p=Path('index.html');s=p.read_text(encoding='utf-8');a=s.index('const QUIZ = ')+len('const QUIZ = ');quiz,n=json.JSONDecoder().raw_decode(s[a:]);old=[c for c in quiz if c.get('topicFamily')=='Футбол']
archive=Path('football-expert-archive.json')
if len(old)>1:archive.write_text(json.dumps(old,ensure_ascii=False,indent=2),encoding='utf-8')
original=json.loads(archive.read_text(encoding='utf-8'));keep={'fb-finals','fb-comebacks','fb-euro','fb-ukraine','fb-worldcup'}
qs=[];wrong={};sources=[]
for c in original:
 if c['topicId'] not in keep:continue
 qs+=c['qs'];wrong.update(c['distractors']);sources+=c.get('sources',[])
replacements=[
 ('Чому фінал Євро-2000 закінчився одразу після гола Трезеге в додатковий час?','Фінал Євро-2000: хто врятував Францію голом у компенсований час, перш ніж Трезеге забив переможний?','Сільвен Вільтор',['Тьєррі Анрі','Зінедін Зідан','Юрій Джоркаєфф']),
 ('Гол Делласа завершив півфінал Греція — Чехія на Євро-2004 наприкінці першого додаткового тайму. Яке правило тоді діяло?','На Євро-2004 Греція зупинила яскраву команду з Недведом, Росицьким і Барошем. Яку збірну вона вибила в півфіналі?','Чехію',['Нідерланди','Португалію','Данію'])]
for before,question,answer,distractors in replacements:
 index=next(i for i,q in enumerate(qs) if q[0]==before);qs[index]=[question,answer];wrong.pop(before);wrong[question]=distractors
new=[
 ('ЧС-2014: якого воротаря ван Гал випустив замість Сіллессена спеціально перед серією пенальті з Коста-Рикою?','Тім Крул',['Мартен Стекеленбург','Міхел Ворм','Кеннет Вермер'],'https://www.fifa.com/en/tournaments/mens/worldcup/articles/tim-krul-interview-costa-rica-shootout'),
 ('Гол Агуеро проти КПР приніс «Сіті» чемпіонство у 2012-му. Хто віддав йому останню передачу, падаючи під тиском захисника?','Маріо Балотеллі',['Давід Сілва','Едін Джеко','Яя Туре'],'https://www.premierleague.com/en/match/360841/manchester-city-vs-queens-park-rangers/highlights'),
 ('Франція поступалася Хорватії у півфіналі ЧС-1998, але один захисник забив обидва її голи. Хто це був?','Ліліан Тюрам',['Лоран Блан','Марсель Десаї','Біксант Лізаразю'],'https://inside.fifa.com/en/tournaments/mens/worldcup/1998france/news/worldcupathome-titanic-thuram-sinks-croatia-3072150'),
 ('Фінал жіночого ЧС-1999: хто реалізував вирішальний пенальті США й відсвяткував його, знявши футболку?','Бренді Честейн',['Міа Гемм','Джулі Фауді','Крістін Ліллі'],'https://inside.fifa.com/tournaments/womens/womensworldcup/usa1999/news/mo-3003-usa-v-chn-1999-wwc-3069388'),
 ('Японія виграла жіночий ЧС-2011, а її капітанка забрала і «Золотий м’яч», і «Золотий бутс». Хто вона?','Хомаре Сава',['Ая Міяма','Юкі Нагасато','Нахомі Кавасумі'],'https://inside.fifa.com/tournaments/womens/womensworldcup/france2019/news/classic-players--homare-sawa-2944420')]
for question,answer,distractors,source in new:qs.append([question,answer]);wrong[question]=distractors;sources.append(source)
sources.append('https://www.uefa.com/uefaeuro/history/news/0253-0d8169e80114-dc6c2ff63958-1000--ten-great-euro-moments-trezeguet-s-golden-goal/')
general=dict(name='Футбол',topicFamily='Футбол',topicId='football',blitz=True,qs=qs,distractors=wrong,sources=list(dict.fromkeys(sources)))
assert len(qs)==30 and len({q[0] for q in qs})==30
quiz=[c for c in quiz if c.get('topicFamily')!='Футбол']+[general]
s=s[:a]+json.dumps(quiz,ensure_ascii=False,indent=2)+s[a+n:]
s=s.replace("  if(menuMode==='blitz'&&g.name==='Футбол')return openTopicPicker(g,menuMode);\n",'')
s=s.replace("b.onclick=()=>openTopicPicker(GROUPS.find(g=>g.name===name),'quiz');filterRow.append(b);","b.onclick=()=>{if(name==='Футбол'){quizSelection={family:name,ids:[]};openQuiz();}else openTopicPicker(GROUPS.find(g=>g.name===name),'quiz');};filterRow.append(b);")
p.write_text(s,encoding='utf-8')
t=Path('topics.js');t.write_text(re.sub(r"^ 'Футбол':[^\n]+\n",'',t.read_text(encoding='utf-8'),flags=re.M),encoding='utf-8')
b=Path('blitz.js');b.write_text(b.read_text(encoding='utf-8').replace("else if(name==='Аніме')","else if(['Аніме','Футбол'].includes(name))"),encoding='utf-8')
Path('football-quiz.json').write_text(json.dumps([general],ensure_ascii=False,indent=2),encoding='utf-8')
Path('blitz-distractors.json').write_text(json.dumps([{k:c[k] for k in ['name','topicFamily','topicId','distractors'] if k in c} for c in quiz if c.get('blitz')],ensure_ascii=False,indent=2),encoding='utf-8')
print('Football: one general collection, 30 story questions, no technical subtopics.')
