from pathlib import Path
import json
# A curated allowlist: catalogue search also returns bootlegs and namesakes.
# Only original, widely documented album releases are admitted here.
data={
'rap':{
'Kendrick Lamar':'Section.80|2011;good kid, m.A.A.d city|2012;To Pimp a Butterfly|2015;DAMN.|2017;Mr. Morale & the Big Steppers|2022',
'Drake':'Thank Me Later|2010;Take Care|2011;Nothing Was the Same|2013;Views|2016;Scorpion|2018',
'Jay-Z':'Reasonable Doubt|1996;The Blueprint|2001;The Black Album|2003;4:44|2017',
'Nas':'Illmatic|1994;It Was Written|1996;Stillmatic|2001;God’s Son|2002',
'2Pac':'2Pacalypse Now|1991;Strictly 4 My N.I.G.G.A.Z…|1993;Me Against the World|1995;All Eyez on Me|1996',
'The Notorious B.I.G.':'Ready to Die|1994;Life After Death|1997',
'Snoop Dogg':'Doggystyle|1993;Tha Doggfather|1996;No Limit Top Dogg|1999;Tha Last Meal|2000',
'Dr. Dre':'The Chronic|1992;2001|1999;Compton|2015',
'Kanye West':'The College Dropout|2004;Late Registration|2005;Graduation|2007;808s & Heartbreak|2008;My Beautiful Dark Twisted Fantasy|2010;Yeezus|2013',
'J. Cole':'Cole World: The Sideline Story|2011;Born Sinner|2013;2014 Forest Hills Drive|2014;4 Your Eyez Only|2016;KOD|2018',
'Travis Scott':'Rodeo|2015;Birds in the Trap Sing McKnight|2016;ASTROWORLD|2018;UTOPIA|2023',
'50 Cent':'Get Rich or Die Tryin’|2003;The Massacre|2005;Curtis|2007;Before I Self Destruct|2009',
'Tyler, The Creator':'Goblin|2011;Wolf|2013;Cherry Bomb|2015;Flower Boy|2017;IGOR|2019',
'Nicki Minaj':'Pink Friday|2010;Pink Friday: Roman Reloaded|2012;The Pinkprint|2014;Queen|2018;Pink Friday 2|2023',
'Missy Elliott':'Supa Dupa Fly|1997;Miss E… So Addictive|2001;Under Construction|2002;The Cookbook|2005',
'OutKast':'Southernplayalisticadillacmuzik|1994;ATLiens|1996;Aquemini|1998;Stankonia|2000;Speakerboxxx / The Love Below|2003',
'Wu-Tang Clan':'Enter the Wu-Tang (36 Chambers)|1993;Wu-Tang Forever|1997;The W|2000;Iron Flag|2001',
'Eminem':'The Marshall Mathers LP 2|2013;Revival|2017;Kamikaze|2018;Music to Be Murdered By|2020'},
'rock':{
'Queen':'Queen|1973;Queen II|1974;A Night at the Opera|1975;News of the World|1977;The Game|1980',
'The Beatles':'Please Please Me|1963;Rubber Soul|1965;Revolver|1966;Sgt. Pepper’s Lonely Hearts Club Band|1967;Abbey Road|1969',
'Pink Floyd':'The Piper at the Gates of Dawn|1967;The Dark Side of the Moon|1973;Wish You Were Here|1975;Animals|1977;The Wall|1979',
'Led Zeppelin':'Led Zeppelin|1969;Led Zeppelin III|1970;Led Zeppelin IV|1971;Houses of the Holy|1973;Physical Graffiti|1975',
'Metallica':'Kill ’Em All|1983;Ride the Lightning|1984;Master of Puppets|1986;…And Justice for All|1988;Metallica|1991',
'Nirvana':'Bleach|1989;Nevermind|1991;In Utero|1993',
'AC/DC':'Highway to Hell|1979;Back in Black|1980;The Razors Edge|1990;Ballbreaker|1995',
'Radiohead':'Pablo Honey|1993;The Bends|1995;OK Computer|1997;Kid A|2000;In Rainbows|2007',
'Linkin Park':'Hybrid Theory|2000;Meteora|2003;Minutes to Midnight|2007;A Thousand Suns|2010;Living Things|2012',
'Red Hot Chili Peppers':'Blood Sugar Sex Magik|1991;Californication|1999;By the Way|2002;Stadium Arcadium|2006',
'Green Day':'39/Smooth|1990;Kerplunk!|1991;Dookie|1994;Insomniac|1995;American Idiot|2004',
'Foo Fighters':'Foo Fighters|1995;The Colour and the Shape|1997;There Is Nothing Left to Lose|1999;One by One|2002',
'The Rolling Stones':'Beggars Banquet|1968;Let It Bleed|1969;Sticky Fingers|1971;Exile on Main St.|1972',
'Black Sabbath':'Black Sabbath|1970;Paranoid|1970;Master of Reality|1971;Vol. 4|1972;Sabbath Bloody Sabbath|1973',
'System of a Down':'System of a Down|1998;Toxicity|2001;Steal This Album!|2002;Mezmerize|2005;Hypnotize|2005',
'Muse':'Showbiz|1999;Origin of Symmetry|2001;Absolution|2003;Black Holes and Revelations|2006',
'Arctic Monkeys':'Whatever People Say I Am, That’s What I’m Not|2006;Favourite Worst Nightmare|2007;Humbug|2009;AM|2013',
'Oasis':'Definitely Maybe|1994;(What’s the Story) Morning Glory?|1995;Be Here Now|1997;Standing on the Shoulder of Giants|2000'},
'pop':{
'Taylor Swift':'Taylor Swift|2006;Fearless|2008;Speak Now|2010;Red|2012;1989|2014;reputation|2017',
'Adele':'19|2008;21|2011;25|2015;30|2021',
'Beyoncé':'Dangerously in Love|2003;B’Day|2006;I Am… Sasha Fierce|2008;4|2011;Lemonade|2016',
'Lady Gaga':'The Fame|2008;Born This Way|2011;ARTPOP|2013;Joanne|2016;Chromatica|2020',
'Britney Spears':'…Baby One More Time|1999;Oops!… I Did It Again|2000;Britney|2001;In the Zone|2003;Blackout|2007',
'ABBA':'Arrival|1976;The Album|1977;Voulez-Vous|1979;Super Trouper|1980;Voyage|2021'}}
p=Path('index.html');s=p.read_text(encoding='utf-8');raw=s.split('const GROUPS = ',1)[1].split(';\n// Порядок тем',1)[0];groups=json.loads(raw);music=next(g for g in groups if g['name']=='Музика');existing={(i[0].casefold(),i[1]) for c in music['cats'] for i in c['items']}
a=s.index('const QUIZ = ')+len('const QUIZ = ');quiz,end=json.JSONDecoder().raw_decode(s[a:]);newcats=[];newquiz=[]
for genre,artists in data.items():
 items=[];artistQs=[];yearQs=[]
 for artist,albums in artists.items():
  for entry in albums.split(';'):
   title,year=entry.rsplit('|',1);year=int(year);label=artist+' — '+title
   if (label.casefold(),year) not in existing:items.append([label,year,[genre]])
   artistQs.append([f'Хто випустив альбом «{title}» ({year})?',artist]);yearQs.append([f'У якому році вийшов альбом {artist} «{title}»?',str(year)])
 title={'rap':'Реп і хіп-хоп','rock':'Рок і метал','pop':'Попмузика'}[genre]
 cat=dict(title=title+': рік оригінального виходу альбому',unit='р.',order='від найпізнішого до найранішого',minDiff=1,topicFamily='Музика',items=items);music['cats'].append(cat);newcats.append(cat)
 # A five-question quiz board can use any subset; retain all entries and pad by
 # moving the final few into a shared collection instead of inventing facts.
 for suffix,qs,blitz in [('виконавці',artistQs,True),('альбоми',yearQs,False)]:
  n=len(qs)//5*5;newquiz.append(dict(name=title+' · '+suffix,topicFamily='Музика',topicId=genre,blitz=blitz,qs=qs[:n]))
s=s.replace(raw,json.dumps(groups,ensure_ascii=False));a=s.index('const QUIZ = ')+len('const QUIZ = ');_,end=json.JSONDecoder().raw_decode(s[a:]);s=s[:a]+json.dumps(quiz+newquiz,ensure_ascii=False,indent=2)+s[a+end:];p.write_text(s,encoding='utf-8')
Path('music-curated.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
print('Added',sum(len(c['items']) for c in newcats),'music cards and',sum(len(c['qs']) for c in newquiz),'music questions across',sum(len(a) for a in data.values()),'artists/bands.')
