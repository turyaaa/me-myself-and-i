from pathlib import Path
import json
p=Path('index.html');s=p.read_text(encoding='utf-8');raw=s.split('const GROUPS = ',1)[1].split(';\n// Порядок тем',1)[0];groups=json.loads(raw)
def add(family,id,title,items):
 g=next(g for g in groups if g['name']==family)
 g['cats'].append(dict(title=title,unit='р.',order='від найпізнішого до найранішого',minDiff=1,topicFamily=family,items=[[n,v,[id]] for n,v in items]))
add('Фільми','starwars','Star Wars: рік виходу фільму',[
 ['Star Wars: Нова надія',1977],['Star Wars: Імперія завдає удару у відповідь',1980],['Star Wars: Повернення джедая',1983],['Star Wars: Прихована загроза',1999],['Star Wars: Атака клонів',2002],['Star Wars: Помста ситхів',2005],['Star Wars: Пробудження Сили',2015],['Star Wars: Бунтар Один',2016],['Star Wars: Останні джедаї',2017],['Star Wars: Соло',2018],['Star Wars: Скайвокер. Сходження',2019]])
add('Фільми','potter','Гаррі Поттер: рік виходу фільму',[
 ['Гаррі Поттер і філософський камінь',2001],['Гаррі Поттер і таємна кімната',2002],['Гаррі Поттер і в’язень Азкабану',2004],['Гаррі Поттер і келих вогню',2005],['Гаррі Поттер і Орден Фенікса',2007],['Гаррі Поттер і напівкровний Принц',2009],['Гаррі Поттер і Смертельні реліквії — частина 1',2010],['Гаррі Поттер і Смертельні реліквії — частина 2',2011]])
add('Фільми','marvel','Marvel: рік виходу фільму',[
 ['Marvel: Месники',2012],['Marvel: Залізна людина 3',2013],['Marvel: Перший месник. Друга війна',2014],['Marvel: Людина-мураха',2015],['Marvel: Доктор Стрендж',2016],['Marvel: Вартові галактики 2',2017],['Marvel: Чорна пантера',2018],['Marvel: Месники. Завершення',2019],['Marvel: Шан-Чі та легенда десяти кілець',2021],['Marvel: Чорна пантера. Ваканда назавжди',2022]])
add('Музика','rap','Реп: рік виходу альбому Eminem',[
 ['Eminem — The Slim Shady LP',1999],['Eminem — The Marshall Mathers LP',2000],['Eminem — The Eminem Show',2002],['Eminem — Encore',2004],['Eminem — Relapse',2009],['Eminem — Recovery',2010],['Eminem — The Marshall Mathers LP 2',2013]])
s=s.replace(raw,json.dumps(groups,ensure_ascii=False))
a=s.index('const QUIZ = ')+len('const QUIZ = ');quiz,end=json.JSONDecoder().raw_decode(s[a:])
for family,ids in [('Фільми',['potter','starwars','marvel']),('Музика',['rock','rap','pop'])]:
 for id in ids:
  qs=[];seen=set()
  for c in next(g for g in groups if g['name']==family)['cats']:
   for item in c['items']:
    if len(item)>2 and id in item[2]:
     q=c['title']+': '+item[0]+'?'
     if q not in seen:qs.append([q,str(item[1])+' '+c['unit']]);seen.add(q)
  qs=qs[:min(15,len(qs)//5*5)]
  if qs:quiz.append(dict(name={'potter':'Гаррі Поттер','starwars':'Star Wars','marvel':'Marvel','rock':'Рок','rap':'Реп / хіп-хоп','pop':'Поп'}[id],topicFamily=family,topicId=id,qs=qs))
s=s[:a]+json.dumps(quiz,ensure_ascii=False,indent=2)+s[a+end:]
p.write_text(s,encoding='utf-8')
