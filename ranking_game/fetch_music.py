import urllib.request,urllib.parse,json,time
from pathlib import Path
artists={
 'rap':['Eminem','Kendrick Lamar','Drake','JAY-Z','Nas','2Pac','The Notorious B.I.G.','Snoop Dogg','Dr. Dre','Kanye West','J. Cole','Travis Scott','50 Cent','Tyler, The Creator','Nicki Minaj','Missy Elliott','OutKast','Wu-Tang Clan'],
 'rock':['Queen','The Beatles','Pink Floyd','Led Zeppelin','Metallica','Nirvana','AC/DC','Radiohead','Linkin Park','Red Hot Chili Peppers','Green Day','Foo Fighters','The Rolling Stones','Black Sabbath','System of a Down','Muse','Arctic Monkeys','Oasis'],
 'pop':['Michael Jackson','Madonna','Taylor Swift','Adele','Beyoncé','Lady Gaga','Billie Eilish','Dua Lipa','ABBA','Britney Spears']}
path=Path('music-source.json');records=json.loads(path.read_text(encoding='utf-8')) if path.exists() else []
done={r['artist'] for r in records}
for genre,names in artists.items():
 for name in names:
  if name in done:continue
  url='https://musicbrainz.org/ws/2/release-group/?'+urllib.parse.urlencode({'query':'artist:"'+name+'" AND primarytype:album','fmt':'json','limit':100})
  try:
   req=urllib.request.Request(url,headers={'User-Agent':'TheRankingGameContentResearch/1.0','Accept':'application/json'})
   data=json.load(urllib.request.urlopen(req,timeout=15));albums=[];seen=set()
   for rg in data.get('release-groups',[]):
    credit=rg.get('artist-credit',[])
    namesFound=[a.get('artist',{}).get('name','') for a in credit if isinstance(a,dict)]
    if not any(x.casefold()==name.casefold() for x in namesFound) or len(namesFound)!=1 or rg.get('secondary-types'):continue
    title=rg['title'];date=rg.get('first-release-date','')
    if len(date)<4 or not date[:4].isdigit() or not 1950<=int(date[:4])<=2024:continue
    if any(x in title.lower() for x in ['deluxe','anniversary','remaster','expanded','instrumental','karaoke','tribute']):continue
    if title.casefold() in seen:continue
    seen.add(title.casefold());albums.append({'title':title,'year':int(date[:4]),'id':rg['id']})
   albums.sort(key=lambda a:(a['year'],a['title']))
   records.append({'artist':name,'genre':genre,'source':url,'albums':albums[:6]});path.write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
   print(name+': '+str(len(albums[:6])),flush=True)
  except Exception as e:print(name+': '+type(e).__name__,flush=True)
  time.sleep(1.1)
