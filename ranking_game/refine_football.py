from pathlib import Path
import json

replacements={
 'Ларс Уннершталь':'Гайко Геррліх',
 'Ротація воротаря':'Ривок у півфланг',
 'Штрафний удар проти арбітра':'Вільний удар команді, що втратила м’яч',
 'Золотий кутовий':'Звичайні два тайми по 15 хвилин',
 'Додаткова серія пенальті':'Перегравання після нічиєї',
 'Три перемоги':'Перемога й дві поразки',
 'М’яч залетить рівно на 30% у ворота':'Це 30% імовірності перемоги команди',
 'Нападник уже заробив 0,3 гола':'Це 30% реалізації всіх ударів цього форварда',
 'Персональна опіка воротаря':'Перекриття флангу в низькому блоці',
 'Два моменти оцінили по 0,40 xG. Чи гарантує сумарна 0,80 xG хоча б один гол?':'Два моменти по 0,40 xG, але матч закінчився 0:0. Який висновок коректний?',
 'Ні, xG не гарантує результат окремого матчу':'Такий результат можливий і не спростовує оцінку xG',
 'Так, бо 0,80 більше за 0,50':'Модель обов’язково помилилася щонайменше на 0,80',
 'Так, якщо обидва удари у площину':'Команда мусить забити наступним ударом',
 'Так, якщо б’є один нападник':'Воротар гарантовано запобіг рівно 0,80 гола',
 'Фінал ЧС-1930 зіграли двома різними моделями м’яча. Як їх використали?':'Чому у фіналі ЧС-1930 на кожен тайм брали іншу модель м’яча?',
 'По одному м’ячу кожної збірної на тайм':'Збірні не погодилися, чиїм м’ячем грати',
 'Окремий м’яч для кожної атаки':'Перший м’яч луснув після гола',
 'Один для штрафних, інший для решти гри':'Для сухого й мокрого поля вимагали різні м’ячі',
 'Замінили лише після проколу':'Суддя відхилив початковий м’яч через вагу',
 'Господарям належав бонус за нічию':'Вона виграла перший матч двоматчевого фіналу',
 'Уругвай мав штрафне очко':'Фінал враховував голи попередньої очної гри',
 'У Бразилії був кращий рейтинг перед фіналом':'Чемпіона визначали за голами в усьому турнірі',
 'https://www.uefa.com/uefaeuro/history/news/025e-0f9fdb15ba65-d27a2a1bb326-1000--classics-2016-final/':'https://www.uefa.com/uefaeuro/history/news/025e-0f9fdb15ba65-d27a2a1bb326-1000--classics-2016-final/',
 'https://www.fifa.com/en/tournaments/mens/worldcup/articles/uruguay-brazil-maracanazo-1950':'https://www.uefa.com/european-qualifiers/news/019c-0e6adb9fe2b7-4e8b8d3e65b7-1000--1950-sting-in-the-tail-for-brazil/'
}
# These exact strings occur only in the new football questions.
for file in ['index.html','football-quiz.json','add_football.py']:
 p=Path(file);s=p.read_text(encoding='utf-8')
 for old,new in replacements.items():s=s.replace(old,new)
 p.write_text(s,encoding='utf-8')
q=json.loads(Path('football-quiz.json').read_text(encoding='utf-8'))
q[0]['sources'] += [
 'https://www.fifatrainingcentre.com/en/game/tournaments/fcwc/2025/team-analyses/emerging-positioning-of-the-inverted-full-back.php',
 'https://www.fifatrainingcentre.com/en/fwc2022/technical-and-tactical-analysis/the-role-of-the-number-9--more-goals-yet-fewer-attempts.php',
 'https://learning.coachesvoice.com/cv/what-is-a-regista-explained-jorginho-andrea-pirlo/']
q[1]['sources'] += ['https://www.fifatrainingcentre.com/en/game/tournaments/olympic-football-tournament/moft/rest-defence.php','https://www.fifatrainingcentre.com/media/native/test/FIFA_Session_Plan_Clement.pdf']
q[7]['sources'].append('https://www.uefa.com/uefachampionsleague/news/0208-0e9f5fd014ae-4b6daa79e5aa-1000--bayern-s-4-0-triumph-joins-elite-company/')
Path('football-quiz.json').write_text(json.dumps(q,ensure_ascii=False,indent=2),encoding='utf-8')
p=Path('index.html');s=p.read_text(encoding='utf-8');a=s.index('const QUIZ = ')+len('const QUIZ = ');quiz,n=json.JSONDecoder().raw_decode(s[a:]);quiz=[c for c in quiz if c.get('topicFamily')!='Футбол']+q;s=s[:a]+json.dumps(quiz,ensure_ascii=False,indent=2)+s[a+n:];p.write_text(s,encoding='utf-8')
Path('blitz-distractors.json').write_text(json.dumps([{k:c[k] for k in ['name','topicFamily','topicId','distractors'] if k in c} for c in quiz if c.get('blitz')],ensure_ascii=False,indent=2),encoding='utf-8')
b=Path('daily-bank.json');bank=json.loads(b.read_text(encoding='utf-8'))
for task in bank:
 if task['id']=='crust-elements':task.update(source='https://catalogimages.wiley.com/images/db/pdf/0470000201.ch2.pdf',sourceName='Wiley · Earth Materials, table 2-1')
 if task.get('edition') and task['family']=='food':task['note']='Довідникові грами на 100 г їстівної частини, CoFID 2021. Вуглеводи — у моносахаридних еквівалентах; слідові кількості округлені до нуля. Сірим — арифметична решта до 100, а не окремо виміряна вода.'
 # Keep precisely 100 even when independent rounding sums to 100.000001.
 if abs(sum(task['values'][:3])-100)<.00001:
  task['values'][2]=round(100-task['values'][0]-task['values'][1],6);task['values'][3]=0
b.write_text(json.dumps(bank,ensure_ascii=False,indent=2),encoding='utf-8')
print('Refined plausible football options, source links and rounding notes.')
