from pathlib import Path
import re,json
p=Path('index.html');s=p.read_text(encoding='utf-8')
icons={
'home':'<path d="m4 10 8-6 8 6v10H4Z"/><path d="M9 20v-7h6v7"/>',
'rank':'<rect x="4" y="5" width="16" height="3" rx="1.5"/><rect x="4" y="11" width="12" height="3" rx="1.5"/><rect x="4" y="17" width="8" height="3" rx="1.5"/>',
'guess':'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="var(--card)"/><circle cx="16" cy="17" r="3" fill="var(--card)"/>',
'quiz':'<path d="M5 4h14v16l-4-3H5Z"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4"/><path d="M12 15h.01"/>',
'edit':'<path d="M13 5H5v15h15v-8M10 14l1-4 7-7 3 3-7 7Z"/>',
'random':'<path d="M4 6h3c5 0 5 12 10 12h3M4 18h3c2 0 3-2 4-4M14 8c1-1 2-2 3-2h3m-3-3 3 3-3 3m0 6 3 3-3 3"/>',
'Всі':'<rect x="4" y="4" width="6" height="6" rx="2"/><rect x="14" y="4" width="6" height="6" rx="2"/><rect x="4" y="14" width="6" height="6" rx="2"/><rect x="14" y="14" width="6" height="6" rx="2"/>',
'Україна':'<path d="M5 21V4c5-4 9 4 14 0v11c-5 4-9-4-14 0"/><path d="M5 9c5-4 9 4 14 0"/>',
'Географія':'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
'Історія':'<path d="M6 3h12M6 21h12M7 3c0 6 10 12 10 18M17 3c0 6-10 12-10 18M9 6h6M9 18h6"/>',
'Космос':'<circle cx="12" cy="12" r="6"/><ellipse cx="12" cy="12" rx="11" ry="3.5" transform="rotate(-30 12 12)"/>',
'Біологія':'<path d="M7 3c0 6 10 12 10 18M17 3C17 9 7 15 7 21M8 6h8M8 18h8M9 10h6M9 14h6"/>',
'Природа':'<path d="M4 20C3 9 10 4 20 4c0 10-5 17-16 16Zm0 0L15 9M9 15v-4M9 15h4"/>',
'Технології':'<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M10 3v4m4-4v4m-4 10v4m4-4v4M3 10h4m-4 4h4m10-4h4m-4 4h4"/>',
'Їжа':'<path d="M5 3v6c0 4 6 4 6 0V3M8 3v18M19 3c-5 3-5 10 0 10V3Zm0 10v8"/>',
'Хімія':'<path d="M9 3h6m-5 0v7l-6 9a1.5 1.5 0 0 0 1 2h14a1.5 1.5 0 0 0 1-2l-6-9V3M7 15h10"/><path d="M10 18h.01M14 12h.01"/>',
'Футбол':'<circle cx="12" cy="12" r="9"/><path d="m12 7 4 3-1.5 5h-5L8 10Zm0 0V3m4 7 4-1m-5.5 6 3 4m-8-4-3 4M8 10 4 9"/>',
'Баскетбол':'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18M6 5c5 4 5 10 0 14M18 5c-5 4-5 10 0 14"/>',
'Формула 1':'<path d="m3 17 6-10h12l-6 10M8 17l4-7h4M3 12h3M2 16h2"/>',
'Олімпіади':'<path d="M8 3h8v5c0 7-8 7-8 0ZM8 5H4v3c0 3 3 4 5 4m7-7h4v3c0 3-3 4-5 4M12 14v5M8 21h8"/>',
"Комп'ютерні ігри":'<path d="M8 7h8c5 0 8 14 3 12l-4-3H9l-4 3C0 21 3 7 8 7Z"/><path d="M8 10v4m-2-2h4m5-1h.01m3 2h.01"/>',
'Фільми':'<path d="M4 9h16v11H4Zm0 0L3 4l16-2 1 5M7 3l3 5m4-6 3 5"/>',
'Серіали':'<rect x="3" y="6" width="18" height="13" rx="3"/><path d="m8 2 4 4 4-4M9 22h6"/>',
'Музика':'<path d="M9 18V6l11-3v12M9 10l11-3"/><ellipse cx="6" cy="18" rx="3" ry="2.5"/><ellipse cx="17" cy="15" rx="3" ry="2.5"/>',
'Література':'<path d="M12 6C9 3 5 3 3 4v15c3-1 6 0 9 2 3-2 6-3 9-2V4c-2-1-6-1-9 2Zm0 0v15M6 8l3 1M6 12l3 1M15 9l3-1M15 13l3-1"/>',
}
start=s.index('const svg = body =>');end=s.index('// ---------- ЕКРАНИ',start)
s=s[:start]+'''const svg = body => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+body+'</svg>';
const ICON_PATHS = '''+json.dumps(icons,ensure_ascii=False,indent=2)+''';
const ICONS = Object.fromEntries(Object.entries(ICON_PATHS).map(([name,path])=>[name,svg(path)]));
ICONS["Українська література"] = ICONS["Література"];

'''+s[end:]
brand='''<svg class="CLASS" viewBox="0 0 360 116" role="img" aria-label="The Ranking Game" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="currentColor" stroke-width="1.7"><rect x="8" y="27" width="60" height="60" rx="18"/><path d="M23 69V54h8v15m7 0V43h8v26m7 0V36"/></g><g fill="currentColor"><text x="91" y="28" font-family="Georgia,serif" font-size="12" letter-spacing="5">THE</text><text x="88" y="70" font-family="Georgia,serif" font-size="43" letter-spacing="-1.5">RANKING</text><text x="92" y="95" font-family="system-ui,sans-serif" font-size="12" letter-spacing="9">GAME</text></g></svg>'''
s=s.replace('<img class="logo logo-main" alt="The Ranking Game">',brand.replace('CLASS','logo logo-main'))
s=s.replace('<img class="logo" alt="The Ranking Game">',brand.replace('CLASS','logo logo-footer'))
s=re.sub(r'const LOGO = "data:image/png;base64,[^"\n]+";\n','',s)
s=s.replace('document.querySelectorAll("img.logo").forEach(i => i.src = LOGO);','')
s=s.replace('  .footer img {','  .footer .logo {').replace('width:88px; height:auto; margin:0 auto 14px;', 'width:128px; height:auto; margin:0 auto 14px;')
s=s.replace('  .logo-main { display:block;', '  .logo { color:var(--ink); }\n  .logo-main { display:block;')
p.write_text(s,encoding='utf-8')
