from pathlib import Path
import json,re
p=Path('index.html');s=p.read_text(encoding='utf-8')
def block(text,start,end,content):
 a=text.index(start);b=text.index(end,a)+len(end);return text[:a]+start+'\n'+content+'\n'+end+text[b:]
if '<!-- LIBRARY UI -->' not in s:s=s.replace('<div id="editor" hidden>','<!-- LIBRARY UI -->\n<!-- END LIBRARY UI -->\n<div id="editor" hidden>')
s=block(s,'<!-- LIBRARY UI -->','<!-- END LIBRARY UI -->',Path('library-ui.html').read_text(encoding='utf-8')+'\n'+Path('accounts-ui.html').read_text(encoding='utf-8'))
if '/* LIBRARY CSS */' not in s:s=s.replace('  .bdivider','/* LIBRARY CSS */\n/* END LIBRARY CSS */\n  .bdivider',1)
s=block(s,'/* LIBRARY CSS */','/* END LIBRARY CSS */',Path('library.css').read_text(encoding='utf-8')+'\n'+Path('accounts.css').read_text(encoding='utf-8'))
if '// LIBRARY CODE' not in s:s=s.replace('// ---------- РЕДАКТОР ВЛАСНИХ ПИТАНЬ + ІМПОРТ/ЕКСПОРТ ----------','// LIBRARY CODE\n// END LIBRARY CODE\n// ---------- РЕДАКТОР ВЛАСНИХ ПИТАНЬ + ІМПОРТ/ЕКСПОРТ ----------')
config=json.dumps(json.loads(Path('library-config.json').read_text()),ensure_ascii=False,separators=(',',':'))
s=block(s,'// LIBRARY CODE','// END LIBRARY CODE','const LIBRARY_CONFIG = '+config+';\n'+Path('library.js').read_text(encoding='utf-8')+'\n'+Path('accounts.js').read_text(encoding='utf-8')+'\n'+Path('quiz-picker.js').read_text(encoding='utf-8'))
if 'src="assets/supabase-2.118.0.js"' not in s:s=s.replace('<script>','<script src="assets/supabase-2.118.0.js"></script>\n<script>',1)
s=s.replace('"topic-picker"];','"topic-picker", "library"];',1)
s=s.replace('"topic-picker", "library"];','"topic-picker", "library", "account", "profile"];',1)
s=re.sub(r'document.body.classList.toggle\("wide",[^\n]+;', 'document.body.classList.toggle("wide", ["home","menu","library","profile"].includes(name));',s,count=1)
home_actions='  <div id="home-auth-actions" class="home-account-links"><button id="home-register" class="auth-action">Register</button><button id="home-login" class="auth-action alt">Sign in</button></div>'
s=re.sub(r'  <div (?:id="home-auth-actions" )?class="home-account-links">.*?</div>',lambda _:home_actions,s,count=1,flags=re.S)
if 'id="home-register"' not in s:s=s.replace('  <div class="modes">',home_actions+'\n  <div class="modes">',1)
if 'id="profile-toggle"' not in s:s=s.replace('<button id="theme" title="Змінити тему">☀</button>','<button id="theme" title="Змінити тему">☀</button>\n<button type="button" id="profile-toggle" aria-label="Увійти або створити профіль" title="Увійти або створити профіль"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg></button>',1)
s=s.replace('Створюй власні категорії для вікторини, імпортуй і експортуй у CSV чи JSON.','Вікторини від гравців для твоєї компанії. Створюй свої та публікуй у бібліотеці.',1)
s=s.replace('item(ICONS.edit, "Свої питання", showEditor, cm === "edit");','item(ICONS.edit, "Бібліотека вікторин", showLibrary, cm === "library");')
s=s.replace('b.onclick = () => startQuiz(pool); box.appendChild(b);','b.onclick = () => chooseQuizCategories(pool); box.appendChild(b);')
s=s.replace('" категорій, на гру береться п\'ять випадкових"','" категорій: обери п’ять або випадковий набір"')
a=s.index('function startQuiz(pool) {') if 'function startQuiz(pool) {' in s else -1
if a>=0:
 b=s.index('  PL.forEach',a)
 s=s[:a]+'''function startQuiz(pool,selected=null) {
  const src = selected || quizSource(pool);
  if(!src.length){toast('Додай категорії перед грою.');return;}
'''+s[b:]
 s=s.replace('Q.cats = shuffle(src).slice(0, 5).map','Q.categoryChoice = selected ? selected.slice() : null;\n  Q.cats = (selected || shuffle(src).slice(0, 5)).map',1)
s=s.replace('again.onclick = () => startQuiz(Q.pool);','again.onclick = () => chooseQuizCategories(Q.pool);')
if '\ninitLibrary();\n' not in s:s=s.replace('\nshowHome();\nif(typeof location','\nshowHome();\ninitLibrary();\nif(typeof location',1)
if '\ninitAccounts();\n' not in s:s=s.replace('\ninitLibrary();\n','\ninitLibrary();\ninitAccounts();\n',1)
s=re.sub(r'^  item\([^\n]*"Профіль", showProfile,[^\n]*\n','',s,flags=re.M)
s=s.replace('item(ICONS.home, "Головна", showHome, cm === "home");','item(ICONS.home, "Головна", showHome, cm === "home");\n  item(svg(\'<circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>\'), "Профіль", showProfile, cm === "profile");',1)
p.write_text(s,encoding='utf-8');print('Library, accounts and quiz category picker synchronized.')
