from pathlib import Path
from collections import Counter
from itertools import combinations
from datetime import date,timedelta
import json,random,math
bank=json.loads(Path('daily-bank.json').read_text(encoding='utf-8'));assert len(bank)==11
new=[]
def add(id,family,title,note,labels,values,source,sourceName,entity=None,raw=None):
 values=[round(float(x),6) for x in values];rest=round(100-sum(values),6)
 assert rest>=-.00001,(id,values,rest)
 values.append(max(0,rest));assert len(labels)==3
 new.append(dict(id=id,family=family,title=title,note=note,labels=labels+['Решта'],values=values,source=source,sourceName=sourceName,edition='daily-2026-10',entity=entity or id,**({'rawCounts':raw} if raw else {})))
stats=json.loads(Path('daily-statistics-source.json').read_text())
data={k:{r['countryiso3code']:r['value'] for r in v['data'][1]} for k,v in stats.items()}
extra=json.loads(Path('daily-science-source.json').read_text())
for key,indicator in [('zaf-agri','NV.AGR.TOTL.ZS'),('zaf-industry','NV.IND.TOTL.ZS'),('zaf-services','NV.SRV.TOTL.ZS')]:data[indicator]['ZAF']=json.loads(extra[key]['text'])[1][0]['value']
names={'USA':'США','CHN':'Китай','IND':'Індія','JPN':'Японія','DEU':'Німеччина','FRA':'Франція','ITA':'Італія','GBR':'Велика Британія','BRA':'Бразилія','CAN':'Канада','AUS':'Австралія','UKR':'Україна','POL':'Польща','KOR':'Південна Корея','ESP':'Іспанія','ZAF':'Південна Африка'}
for country in list(names)[:15]:
 add('land-'+country,'nature','Ліси й поля · '+names[country],'Частки площі суходолу за World Bank WDI, 2022. Рілля, ліси та багаторічні насадження — окремі категорії. Решта включає пасовища, забудову й інші землі.',['Ліси','Рілля','Багаторічні насадження'],[data[k][country] for k in ['AG.LND.FRST.ZS','AG.LND.ARBL.ZS','AG.LND.CROP.ZS']],'https://data.worldbank.org/indicator/AG.LND.FRST.ZS','World Bank WDI · 2022',country)
 add('ages-'+country,'society','Вік населення · '+names[country],'Частки населення за віковими групами, World Bank WDI, 2022. Усі три групи разом охоплюють населення; дрібні розбіжності округлення нормовано до 100%.',['0–14 років','15–64 роки','65 років і старше'],[data[k][country]/sum(data[x][country] for x in ['SP.POP.0014.TO.ZS','SP.POP.1564.TO.ZS','SP.POP.65UP.TO.ZS'])*100 for k in ['SP.POP.0014.TO.ZS','SP.POP.1564.TO.ZS','SP.POP.65UP.TO.ZS']],'https://data.worldbank.org/indicator/SP.POP.0014.TO.ZS','World Bank WDI · 2022',country)
for country in [x for x in names if x!='USA']:
 add('sectors-'+country,'economy','З чого складається ВВП · '+names[country],'Частки доданої вартості у ВВП, World Bank WDI, 2022. Промисловість включає будівництво; агросектор — лісове господарство й рибальство. Решта — різниця до ВВП, зокрема чисті податки на продукти.',['Агросектор','Промисловість і будівництво','Послуги'],[data[k][country] for k in ['NV.AGR.TOTL.ZS','NV.IND.TOTL.ZS','NV.SRV.TOTL.ZS']],'https://data.worldbank.org/indicator/NV.IND.TOTL.ZS','World Bank WDI · 2022',country)
foods=[('14-896','Мигдаль, ядра'),('14-879','Волоські горіхи, ядра'),('14-892','Арахісова паста, однорідна'),('14-386','Авокадо Hass, м’якоть'),('14-318','Банан, м’якоть'),('12-346','Англійський чедер'),('13-662','Нут, відварений без солі'),('13-661','Зелена й коричнева сочевиця, відварена'),('12-940','Куряче яйце, варене'),('11-858','Рис басматі, відварений без солі'),('11-006','Гречана крупа, суха'),('17-648','Молочний шоколад'),('11-980','Білий нарізний хліб'),('18-323','Куряча грудка на грилі, без шкіри'),('16-359','Фермерський лосось, запечений')]
rows={r.get('A'):r for r in json.loads(Path('cofid-proximates.json').read_text())};selected=[]
for code,name in foods:
 r=rows[code];values=[0 if r[k]=='Tr' else float(r[k]) for k in ['J','K','L']];selected.append({**r,'ukName':name})
 add('food-'+code,'food','Що в 100 г: '+name,'Довідникові грами на 100 г їстівної частини, CoFID 2021. Вуглеводи за методикою CoFID; слідові кількості округлені до нуля. Сірим — вода, клітковина й інші складники.',['Білки','Жири','Вуглеводи'],values,'https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid','Public Health England · CoFID 2021',code)
Path('daily-food-source.json').write_text(json.dumps(selected,ensure_ascii=False,indent=2),encoding='utf-8')
medals=[('США',40,44,42),('Китай',40,27,24),('Японія',20,12,13),('Австралія',18,19,16),('Франція',16,26,22),('Нідерланди',15,7,12),('Велика Британія',14,22,29),('Південна Корея',13,9,10),('Італія',12,13,15),('Німеччина',12,13,8),('Нова Зеландія',10,7,3),('Канада',9,7,11),('Узбекистан',8,2,3),('Іспанія',5,4,9),('Україна',3,5,4)]
for i,(country,g,s,b) in enumerate(medals):
 values=[100*x/(g+s+b) for x in [g,s,b]]
 add('paris-'+str(i),'sport','Колір медалей · '+country,'Частки золотих, срібних і бронзових нагород цієї збірної на Олімпіаді Париж-2024. Командна нагорода рахується один раз, як у медальному заліку.',['Золоті','Срібні','Бронзові'],values,'https://www.olympedia.org/editions/63','Olympedia · Париж-2024',country,[g,s,b])
isotopes=[('Ne','Неон',['Ne-20','Ne-21','Ne-22'],[90.48,.27,9.25]),('Mg','Магній',['Mg-24','Mg-25','Mg-26'],[78.99,10,11.01]),('Si','Кремній',['Si-28','Si-29','Si-30'],[92.223,4.685,3.092]),('S','Сірка',['S-32','S-33','S-34'],[94.99,.75,4.25]),('Ar','Аргон',['Ar-36','Ar-38','Ar-40'],[.3336,.0629,99.6035]),('K','Калій',['K-39','K-40','K-41'],[93.2581,.0117,6.7302]),('Kr','Криптон',['Kr-84','Kr-86','Kr-82'],[56.987,17.279,11.593]),('Xe','Ксенон',['Xe-132','Xe-129','Xe-131'],[26.9086,26.4006,21.2324])]
for symbol,name,labels,values in isotopes:
 add('isotopes-'+symbol,'science','Природні ізотопи · '+name,'Орієнтовні частки атомів за репрезентативним ізотопним складом NIST. Природні зразки можуть відрізнятися; показано саме довідникове співвідношення, не масові частки.',labels,values,'https://physics.nist.gov/cgi-bin/Compositions/stand_alone.pl?ascii=ascii&ele='+symbol,'NIST · ізотопний склад')
add('universe-planck','science','З чого складається Всесвіт?','Модельні частки густини енергії за результатами Planck 2013. Це історичний набір оцінок, а не облік лише видимої матерії.',['Темна енергія','Темна матерія','Звичайна матерія'],[68.3,26.8,4.9],'https://www.esa.int/Science_Exploration/Space_Science/Planck/Planck_science_highlights','ESA · Planck 2013')
add('crust-elements','science','Елементи земної кори','Типові довідникові масові частки основних елементів кори; не склад усієї Землі. Оцінки округлені.',['Оксиген','Силіцій','Алюміній'],[46.6,27.7,8.1],'https://openstax.org/books/chemistry-2e/pages/18-1-periodicity','OpenStax · Chemistry 2e')
add('body-elements','science','Елементи людського тіла','Типові приблизні масові частки елементів тіла за навчальним довідником. Не співвідношення газів, якими ми дихаємо.',['Оксиген','Карбон','Гідроген'],[65,18.5,9.5],'https://openstax.org/books/anatomy-and-physiology-2e/pages/2-1-elements-and-atoms-the-building-blocks-of-matter','OpenStax · Anatomy & Physiology')
add('sun-elements','science','Склад сонячної фотосфери','Масові частки за довідниковою таблицею NASA, наведеною Stanford Solar Center. Не об’ємні частки газу.',['Гідроген','Гелій','Оксиген'],[73.46,24.85,.77],'https://solar-center.stanford.edu/vitalstats','Stanford Solar Center · дані NASA')
add('sea-salt','science','Що входить до морської солі?','Масові частки іонів серед розчинених солей морської води. Саму воду до цього кола не включено.',['Хлорид','Натрій','Сульфат'],[55.04,30.61,7.68],'https://salinity.oceansciences.org/science-salinity.htm','NASA Salinity')
add('saturn-air','science','Гази атмосфери Сатурна','Орієнтовні об’ємні частки з довідника NASA. Слідові домішки знехтувані в округленому розподілі.',['Водень','Гелій','Метан'],[96.3,3.25,.45],'https://nssdc.gsfc.nasa.gov/planetary/factsheet/saturnfact.html','NASA · Saturn Fact Sheet')
masses={'Юпітер':1898,'Сатурн':568,'Нептун':102,'Уран':86.8,'Земля':5.97,'Венера':4.87,'Марс':.642,'Меркурій':.33};total=sum(masses.values())
add('planet-masses','science','Хто важить більше серед планет?','Частки сумарної маси восьми планет Сонячної системи. Сонце й супутники не враховані; решта — п’ять неназваних планет. Округлені маси NASA.',['Юпітер','Сатурн','Нептун'],[masses[n]/total*100 for n in ['Юпітер','Сатурн','Нептун']],'https://nssdc.gsfc.nasa.gov/planetary/factsheet/','NASA · Planetary Fact Sheet')
assert len(new)==90,len(new)
assert Counter(q['family'] for q in new)==Counter({f:15 for f in ['nature','society','economy','food','sport','science']})
assert len({q['id'] for q in bank+new})==101
Path('daily-bank.json').write_text(json.dumps(bank+new,ensure_ascii=False,indent=2),encoding='utf-8')
rng=random.Random(20261031);families=['nature','society','economy','food','sport','science'];triples=list(combinations(families,3))
for triple in list(combinations(families,3))[:5]:triples += [triple,tuple(f for f in families if f not in triple)]
rng.shuffle(triples)
for i in range(1,len(triples)):
 if set(triples[i])==set(triples[i-1]):
  j=next(j for j in range(i+1,len(triples)) if set(triples[j])!=set(triples[i-1]));triples[i],triples[j]=triples[j],triples[i]
queues={f:[q for q in new if q['family']==f] for f in families}
for queue in queues.values():rng.shuffle(queue)
days={};start=date(2026,10,31)
for day,triple in enumerate(triples):
 chosen=[]
 for family in triple:
  queue=queues[family];index=next((i for i,q in enumerate(queue) if q['entity'] not in [x['entity'] for x in chosen]),0);chosen.append(queue.pop(index))
 days[str(start+timedelta(days=day))]=[q['id'] for q in chosen]
assert len(days)==30 and len({id for ids in days.values() for id in ids})==90
schedule=dict(version=1,start=str(start),end=str(start+timedelta(days=29)),days=days)
Path('daily-schedule.json').write_text(json.dumps(schedule,ensure_ascii=False,indent=2),encoding='utf-8')
print('Added 90 tasks; total 101. Thirty scheduled days:',schedule['start'],'to',schedule['end'])
