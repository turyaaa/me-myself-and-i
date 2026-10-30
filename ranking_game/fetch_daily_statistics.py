from pathlib import Path
import urllib.request,urllib.parse,json,concurrent.futures
countries='USA;CHN;IND;JPN;DEU;FRA;ITA;GBR;BRA;CAN;AUS;UKR;POL;KOR;ESP'
indicators=['NV.AGR.TOTL.ZS','NV.IND.TOTL.ZS','NV.SRV.TOTL.ZS','AG.LND.ARBL.ZS','AG.LND.FRST.ZS','AG.LND.CROP.ZS','SP.POP.0014.TO.ZS','SP.POP.1564.TO.ZS','SP.POP.65UP.TO.ZS']
def fetch(indicator):
 url='https://api.worldbank.org/v2/country/'+countries+'/indicator/'+indicator+'?date=2022&format=json&per_page=100'
 data=json.load(urllib.request.urlopen(url,timeout=40))
 return indicator,dict(source=url,data=data)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:result=dict(pool.map(fetch,indicators))
Path('daily-statistics-source.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print('World Bank indicators downloaded:',len(result))
