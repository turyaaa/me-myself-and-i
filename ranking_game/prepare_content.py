from pathlib import Path
import json,re
p=Path('index.html');s=p.read_text(encoding='utf-8')
raw=s.split('const GROUPS = ',1)[1].split(';\n// Порядок тем',1)[0];groups=json.loads(raw)
anime=[['Навсікая з Долини Вітрів',1984],['Небесний замок Лапута',1986],['Мій сусід Тоторо',1988],['Відьмина служба доставки',1989],['Порко Россо',1992],['Принцеса Мононоке',1997],['Віднесені привидами',2001],['Мандрівний замок',2004],['Рибка Поньо',2008],['Вітер дужчає',2013]]
groups.append({'name':'Аніме','cats':[
 {'title':'Аніме-фільми: рік прем’єри в Японії','unit':'р.','order':'від найпізнішого до найранішого','items':anime,'minDiff':1},
 {'title':'Тривалість аніме-фільму (за каталогом Studio Ghibli)','unit':'хв','order':'від найдовшого до найкоротшого','items':[[anime[i][0],v] for i,v in enumerate([116,124,86,102,93,133,125,119,101,126])]},
 {'title':'Dragon Ball: кількість серій завершеного серіалу (без спецвипусків)','unit':'серій','order':'від найбільшої до найменшої','items':[['Dragon Ball',153],['Dragon Ball Z',291],['Dragon Ball GT',64],['Dragon Ball Super',131],['Dragon Ball DAIMA',20]]}
]})
for g in groups:
 if g['name']=='Природа':g['name']='Тварини'
 if g['name']=='Україна':
  for c in g['cats']:
   if 'Наявне населення' in c['title']:
    c['unit']='млн';c['items']=[[n,round(v/1000,6)] for n,v in c['items']]
lit=next(g for g in groups if g['name']=='Література');ua=[c for c in lit['cats'] if 'Українські твори' in c['title'] or 'українського письменника' in c['title']];lit['cats']=[c for c in lit['cats'] if c not in ua];groups.append({'name':'Українська література','cats':ua})
s=s.replace(raw,json.dumps(groups,ensure_ascii=False))
a=s.index('const CLUSTERS = [');b=s.index('\nGROUPS.forEach',a)
clusters=[['Світ',['Географія','Україна','Історія']],['Наука',['Космос','Хімія','Біологія','Технології']],['Природа',['Тварини','Їжа']],['Спорт',['Футбол','Баскетбол','Формула 1','Олімпіади']],['Розваги',['Фільми','Серіали','Музика',"Комп'ютерні ігри",'Аніме']],['Література',['Література','Українська література']]]
s=s[:a]+'const CLUSTERS = '+json.dumps(clusters,ensure_ascii=False)+';'+s[b:]
qstart=s.index('const QUIZ = ')+len('const QUIZ = ');quiz,end=json.JSONDecoder().raw_decode(s[qstart:])
quiz.append({'name':'Аніме','qs':[[f'У якому році відбулася японська прем’єра аніме «{n}»?',str(v)] for n,v in anime]+[['Скільки серій в оригінальному Dragon Ball без спецвипусків?','153'],['Скільки серій у Dragon Ball Z без спецвипусків?','291'],['Скільки серій у Dragon Ball GT без спецвипусків?','64'],['Скільки серій у Dragon Ball DAIMA?','20'],['Яка студія випустила «Віднесених привидами»?','Studio Ghibli']]})
s=s[:qstart]+json.dumps(quiz,ensure_ascii=False,indent=2)+s[qstart+end:]
s=s.replace('ICONS.blitz =', '''ICONS['Тварини']=ICONS['Природа'];
ICONS['Аніме']=svg('<path d="m3 12 3-8 6 3 6-3 3 8-3 8H6ZM8 12h.01M16 12h.01m-7 4h6"/>');
ICONS.blitz =''')
s=s.replace('"legal", "blitz"]','"legal", "blitz", "daily", "topic-picker"]')
s=s.replace('function startTopic(g) { menuMode === "guess" ? startGuess(g) : startGame(g); }', '''function startTopic(g) {
  if(['Фільми','Музика'].includes(g.name))return openTopicPicker(g,menuMode);
  menuMode === "guess" ? startGuess(g) : startGame(g);
}''')
s=s.replace('  const cats = allGroup.cats.length, cards =','  dailyClock();\n  const cats = allGroup.cats.length, cards =')
s=s.replace('text += "<br><b>Підсумок: " + G.score + " з " + G.max + " (" + p + "%)" +','''store.set('ranking_points',Number(store.get('ranking_points')||0)+G.score);
    text += "<br><b>Підсумок: " + p + "%</b><span class='rank-points'> · " + G.score + " із " + G.max + " очок</span><b>" +''')
s=s.replace('  item(ICONS.quiz, "Вікторина",','  item(ICONS["Географія"], "Поділи світ · Щодня", showDaily, cm === "daily");\n  item(ICONS.quiz, "Вікторина",')
s=s.replace('function currentMode() {','function currentMode() {\n  if (!$("daily").hidden) return "daily";')
s=s.replace('if (!$("game").hidden) return !!G && mode !== "menu";', 'if (!$("game").hidden) return !!G && mode !== "menu";')
s=s.replace('  try { Object.keys(localStorage).filter(k => /^(theme|sound$|best_|bestg_|bestb_|quiz_players|custom_quiz)/', '  try { Object.keys(localStorage).filter(k => /^(theme|sound$|best_|bestg_|bestb_|ranking_|topic_|quiz_players|custom_quiz)/')
p.write_text(s,encoding='utf-8')

# Daily content: each record defines exactly three named shares plus a remainder.
bank=[]
def add(id,family,title,note,labels,values,url,source):
 values=list(values);values.append(round(100-sum(values),6));assert min(values)>=0
 bank.append(dict(id=id,family=family,title=title,note=note,labels=labels+['Решта'],values=values,source=url,sourceName=source))
add('air','science','Чим ми дихаємо?','Склад сухого повітря за об’ємом, без водяної пари. Приблизні частки.',['Азот','Кисень','Аргон'],[78.084,20.946,.934],'https://www.noaa.gov/jetstream/atmosphere','NOAA')
add('mars','science','Атмосфера Марса','Об’ємні частки газів за довідником ESA.',['Вуглекислий газ','Азот','Аргон'],[95.32,2.7,1.6],'https://www.esa.int/Science_Exploration/Space_Science/Mars_Express/Facts_about_Mars','ESA')
add('water','nature','Де зберігається вода Землі?','Частки загального об’єму води. Оцінка USGS.',['Океани й моря','Льодовики та сніг','Підземні води'],[96.5,1.74,1.69],'https://www.usgs.gov/water-science-school/science/where-earths-water','USGS')
add('fresh','nature','А де прісна вода?','Частки об’єму лише прісної води, за оцінкою USGS.',['Льодовики та сніг','Підземні води','Озера'],[68.7,30.1,.26],'https://www.usgs.gov/water-science-school/science/where-earths-water','USGS')
add('nutella','food','Що в 100 г Nutella?','Частки маси за етикеткою Nutella UK. Сірим — вода, клітковина та інші складники. Не частки калорій.',['Білки','Жири','Вуглеводи'],[6.3,30.9,57.5],'https://www.nutella.com/uk/en/products/nutella','Nutella · етикетка UK')
add('fage','food','Що в 100 г грецького йогурту?','FAGE Total 5%, за етикеткою виробника. Частки маси; сірим — вода та інші складники.',['Білки','Жири','Вуглеводи'],[9,5,3],'https://home.fage/yogurts/fage-total-5','FAGE Total 5%')
add('ballon00','sport','Хто забирав «Золоті м’ячі»?','20 чоловічих нагород за 2000–2019 включно. Країна лауреата; рахуємо нагороди, не різних гравців.',['Аргентина','Португалія','Бразилія'],[30,30,15],'https://www.uefa.com/ballondor/news/0292-1c27056169a7-bc88d1fdba43-1000--ballon-d-or-laureates-who-has-won-football-s-most-prestig/','UEFA · список лауреатів')
add('ballon10','sport','Десять років «Золотого м’яча»','10 чоловічих нагород за 2010–2019. Країна лауреата, кількість нагород.',['Аргентина','Португалія','Хорватія'],[50,40,10],'https://www.uefa.com/ballondor/news/0292-1c27056169a7-bc88d1fdba43-1000--ballon-d-or-laureates-who-has-won-football-s-most-prestig/','UEFA · список лауреатів')
if Path('gdp-source.json').exists():
 d={v['countryiso3code']:v['value'] for v in json.loads(Path('gdp-source.json').read_text())[1]}
 for n,codes,names in [('gdp-a',['USA','CHN','DEU'],['США','Китай','Німеччина']),('gdp-b',['JPN','IND','GBR'],['Японія','Індія','Велика Британія']),('gdp-c',['FRA','ITA','BRA'],['Франція','Італія','Бразилія'])]:
  add(n,'economy','Частки світового ВВП · 2023','Номінальний ВВП у поточних доларах США; частки світового підсумку Світового банку.',[''+x for x in names],[round(d[x]/d['WLD']*100,4) for x in codes],'https://data.worldbank.org/indicator/NY.GDP.MKTP.CD','Світовий банк · 2023')
Path('daily-bank.json').write_text(json.dumps(bank,ensure_ascii=False,indent=2),encoding='utf-8')
