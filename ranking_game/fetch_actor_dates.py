import urllib.request,urllib.parse,json,concurrent.futures
from pathlib import Path
names=['Bryan Cranston','Aaron Paul','Anna Gunn','Dean Norris','Bob Odenkirk','Giancarlo Esposito','Jonathan Banks','Betsy Brandt','RJ Mitte','Sean Bean','Kit Harington','Emilia Clarke','Peter Dinklage','Lena Headey','Sophie Turner','Maisie Williams','Nikolaj Coster-Waldau','Gwendoline Christie','Iain Glen','Jennifer Aniston','Courteney Cox','Lisa Kudrow','Matt LeBlanc','Matthew Perry','David Schwimmer','Millie Bobby Brown','Finn Wolfhard','Gaten Matarazzo','Caleb McLaughlin','Noah Schnapp','Sadie Sink','Winona Ryder','David Harbour','Joe Keery','Natalia Dyer','Rhea Seehorn','Michael McKean','Patrick Fabian','Michael Mando','Tony Dalton','Steve Carell','Rainn Wilson','John Krasinski','Jenna Fischer','Angela Kinsey','Brian Baumgartner','Ellie Kemper']
def fetch(name):
 try:
  url='https://api.tvmaze.com/search/people?'+urllib.parse.urlencode({'q':name});data=json.load(urllib.request.urlopen(url,timeout=15))
  found=next((x['person'] for x in data if x['person']['name'].casefold()==name.casefold()),None)
  return name,{'birthday':found['birthday'],'source':found['url'],'id':found['id']} if found and found.get('birthday') else None
 except Exception as e:return name,{'error':type(e).__name__}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:result=dict(pool.map(fetch,names))
Path('actor-sources.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print('Actor records:',sum(bool(v and v.get('birthday')) for v in result.values()),'of',len(names))
