from pathlib import Path
import re,json,xml.etree.ElementTree as ET
s=Path('index.html').read_text(encoding='utf-8')
icons=json.loads(s.split('const ICON_PATHS = ',1)[1].split(';\nconst ICONS',1)[0])
for name,body in icons.items():
 ET.fromstring('<svg>'+body+'</svg>')
logos=re.findall(r'<svg class="logo[\s\S]*?</svg>',s)
for svg in logos: ET.fromstring(svg)
assert len(logos)==2
assert 'const LOGO' not in s
print(f'Validated {len(icons)} vector icons and {len(logos)} wordmarks.')
