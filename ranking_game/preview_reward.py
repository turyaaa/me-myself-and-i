from pathlib import Path
import ast,math,wave,struct,re,json,xml.etree.ElementTree as ET
s=Path('index.html').read_text(encoding='utf-8')
notes=ast.literal_eval('['+s.split('  perfect:[',1)[1].split('\n  ],',1)[0]+']')
rate=44100;duration=max(d+t+.01 for f,d,t,l in notes)+.15
pcm=bytearray()
for i in range(math.ceil(rate*duration)):
 t=i/rate;value=0
 for frequency,delay,length,level in notes:
  local=t-delay
  if not 0<=local<length+.01:continue
  amplitude=level*local/.015 if local<.015 else 0
  if local>=.015: amplitude=level*math.exp(math.log(.001/level)*(min(local,length)-.015)/(length-.015))
  phase=2*math.pi*frequency*local
  oscillator=math.sin(phase) if frequency<500 else 2/math.pi*math.asin(math.sin(phase))
  value+=oscillator*amplitude*.18
 pcm.extend(struct.pack('<h',round(max(-1,min(1,value))*32767)))
with wave.open('perfect-reward.wav','wb') as out:
 out.setparams((1,2,rate,0,'NONE','not compressed'));out.writeframes(pcm)
icons=json.loads(s.split('const ICON_PATHS = ',1)[1].split(';\nconst ICONS',1)[0])
for body in icons.values():ET.fromstring('<svg>'+body+'</svg>')
original=Path('index.original.html').read_text(encoding='utf-8')
logo=re.search(r'const LOGO = "([^"]+)";',original).group(1)
assert s.count('src="'+logo+'"')==2
assert 'playSound("move")' not in s
assert '$("gslider").addEventListener("change"' not in s
print('Original logo restored twice; all icons valid; movement sounds removed; reward preview created.')
