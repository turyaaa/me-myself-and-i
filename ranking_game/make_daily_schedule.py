"""Build the pinned 30-day season. Do not regenerate a published season."""
from pathlib import Path
from itertools import combinations
from datetime import date,timedelta
import json,random

bank=json.loads(Path('daily-bank.json').read_text(encoding='utf-8'))
new=[q for q in bank if q.get('edition')=='daily-2026-10']
families=['nature','society','economy','food','sport','science']
rng=random.Random(20261031)
# Each two-day block visits all six themes. Neighbouring days share at most
# one theme; no theme can run for more than two consecutive days.
partitions=[(triple,tuple(f for f in families if f not in triple)) for triple in combinations(families,3) if families[0] in triple]
pairs=partitions+partitions[:5]
rng.shuffle(pairs)
queues={f:[q for q in new if q['family']==f] for f in families}
for queue in queues.values():rng.shuffle(queue)
days={};start=date(2026,10,31);previous=set()
for pair in pairs:
 if len(previous.intersection(pair[1]))<len(previous.intersection(pair[0])):pair=pair[::-1]
 for triple in pair:
  chosen=[]
  for family in triple:
   queue=queues[family]
   index=next((i for i,q in enumerate(queue) if q['entity'] not in [x['entity'] for x in chosen]),0)
   chosen.append(queue.pop(index))
  rng.shuffle(chosen)
  days[str(start+timedelta(days=len(days)))]=[q['id'] for q in chosen]
  previous=set(triple)
assert len(days)==30 and len({id for ids in days.values() for id in ids})==90
schedule=dict(version=1,start=str(start),end=str(start+timedelta(days=29)),days=days)
Path('daily-schedule.json').write_text(json.dumps(schedule,ensure_ascii=False,indent=2),encoding='utf-8')
print('Pinned 90 unique tasks in 30 days; all six themes in each two-day block.')
