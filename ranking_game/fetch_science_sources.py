from pathlib import Path
import urllib.request,json,concurrent.futures
sources={
 'isotopes':'https://physics.nist.gov/cgi-bin/Compositions/stand_alone.pl?ele=&all=all&ascii=html&isotype=some',
 'zaf-agri':'https://api.worldbank.org/v2/country/ZAF/indicator/NV.AGR.TOTL.ZS?date=2022&format=json',
 'zaf-industry':'https://api.worldbank.org/v2/country/ZAF/indicator/NV.IND.TOTL.ZS?date=2022&format=json',
 'zaf-services':'https://api.worldbank.org/v2/country/ZAF/indicator/NV.SRV.TOTL.ZS?date=2022&format=json'}
def fetch(pair):
 key,url=pair
 try:return key,{'url':url,'text':urllib.request.urlopen(url,timeout=30).read().decode('utf-8','replace')}
 except Exception as e:return key,{'url':url,'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:data=dict(pool.map(fetch,sources.items()))
Path('daily-science-source.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
print({k:len(v.get('text','')) for k,v in data.items()})
