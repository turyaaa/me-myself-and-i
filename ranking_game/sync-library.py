from pathlib import Path
import json,re
p=Path('index.html');s=p.read_text(encoding='utf-8')
def block(text,start,end,content):
 a=text.index(start);b=text.index(end,a)+len(end);return text[:a]+start+'\n'+content+'\n'+end+text[b:]
if '<!-- LIBRARY UI -->' not in s:s=s.replace('<div id="editor" hidden>','<!-- LIBRARY UI -->\n<!-- END LIBRARY UI -->\n<div id="editor" hidden>')
s=block(s,'<!-- LIBRARY UI -->','<!-- END LIBRARY UI -->',Path('library-ui.html').read_text(encoding='utf-8'))
if '/* LIBRARY CSS */' not in s:s=s.replace('  .bdivider','/* LIBRARY CSS */\n/* END LIBRARY CSS */\n  .bdivider',1)
s=block(s,'/* LIBRARY CSS */','/* END LIBRARY CSS */',Path('library.css').read_text(encoding='utf-8'))
if '// LIBRARY CODE' not in s:s=s.replace('// ---------- РЕДАКТОР ВЛАСНИХ ПИТАНЬ + ІМПОРТ/ЕКСПОРТ ----------','// LIBRARY CODE\n// END LIBRARY CODE\n// ---------- РЕДАКТОР ВЛАСНИХ ПИТАНЬ + ІМПОРТ/ЕКСПОРТ ----------')
config=json.dumps(json.loads(Path('library-config.json').read_text()),ensure_ascii=False,separators=(',',':'))
s=block(s,'// LIBRARY CODE','// END LIBRARY CODE','const LIBRARY_CONFIG = '+config+';\n'+Path('library.js').read_text(encoding='utf-8')+'\n'+Path('quiz-picker.js').read_text(encoding='utf-8'))
if 'src="assets/supabase-2.118.0.js"' not in s:s=s.replace('<script>','<script src="assets/supabase-2.118.0.js"></script>\n<script>',1)
s=s.replace('"topic-picker"];','"topic-picker", "library"];',1)
s=s.replace('name === "home" || name === "menu"','name === "home" || name === "menu" || name === "library"')
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
p.write_text(s,encoding='utf-8');print('Library, accounts and quiz category picker synchronized.')
