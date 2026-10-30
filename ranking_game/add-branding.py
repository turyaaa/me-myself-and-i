from pathlib import Path
import struct

# A multi-resolution ICO with PNG frames, supported by modern browsers/Windows.
frames=[(size,Path(f'assets/favicon-{size}.png').read_bytes()) for size in (16,32,48)]
offset=6+16*len(frames);entries=[]
for size,data in frames:
 entries.append(struct.pack('<BBBBHHII',size,size,0,0,1,32,len(data),offset));offset+=len(data)
Path('favicon.ico').write_bytes(struct.pack('<HHH',0,1,len(frames))+b''.join(entries)+b''.join(data for _,data in frames))

p=Path('index.html');s=p.read_text(encoding='utf-8')
assert 'property="og:image"' not in s
metadata='''<meta name="description" content="Перевір знання: вгадай порядок і значення, грай у Бліц із друзями та проходь щоденний виклик «Поділи світ».">
<meta name="theme-color" content="#2a0f16">
<meta name="application-name" content="The Ranking Game">
<link rel="canonical" href="https://therankinggame.netlify.app/">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png?v=20261030">
<link rel="icon" type="image/png" sizes="16x16" href="/assets/favicon-16.png?v=20261030">
<link rel="icon" type="image/png" sizes="96x96" href="/assets/favicon-96.png?v=20261030">
<link rel="shortcut icon" href="/favicon.ico?v=20261030">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta property="og:type" content="website">
<meta property="og:locale" content="uk_UA">
<meta property="og:site_name" content="The Ranking Game">
<meta property="og:title" content="The Ranking Game — знання, інтуїція, азарт">
<meta property="og:description" content="Вгадай порядок і значення, виклич друга на Бліц-дуель або пройди щоденний виклик «Поділи світ».">
<meta property="og:url" content="https://therankinggame.netlify.app/">
<meta property="og:image" content="https://therankinggame.netlify.app/assets/social-preview.png?v=20261030">
<meta property="og:image:secure_url" content="https://therankinggame.netlify.app/assets/social-preview.png?v=20261030">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Логотип The Ranking Game на бордовому фоні. Знання. Інтуїція. Азарт.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="The Ranking Game — знання, інтуїція, азарт">
<meta name="twitter:description" content="Вгадай порядок і значення, грай із друзями та повертайся за щоденним викликом.">
<meta name="twitter:image" content="https://therankinggame.netlify.app/assets/social-preview.png?v=20261030">
<meta name="twitter:image:alt" content="The Ranking Game — Знання. Інтуїція. Азарт.">
'''
s=s.replace('<title>The Ranking Game</title>','<title>The Ranking Game</title>\n'+metadata);p.write_text(s,encoding='utf-8')
