from pathlib import Path
import zipfile,re
from html.parser import HTMLParser
root=Path.cwd()
files=['favicon.ico','site.webmanifest','actor-sources.json','blitz-distractors.json','music-curated.json','music-source.json','story-additions.json','daily.js','daily.css','daily-ui.html','daily-bank.json','topics.js','sync-features.py','gdp-source.json','index.html','package.json','netlify.toml','build.mjs','.gitignore','README.md','verify-game.cjs','test-duel.cjs','test-results.json','duel-test-results.json','fact-check.md','blitz.js','blitz.css','blitz-ui.html','netlify/lib/duel-core.mjs','netlify/functions/duel.mjs','netlify/functions/cleanup-duels.mjs']
files += ['daily-schedule.json','daily-food-source.json','daily-statistics-source.json','daily-science-source.json','make_daily_schedule.py','football-quiz.json','football-legacy.json','season-sources.md']
files += ['library-config.json','library-ui.html','library.css','library.js','quiz-picker.js','sync-library.py','supabase-library.sql','LIBRARY-SETUP.md','test-library-db.mjs','library-db-test-results.json']
files += ['test-library-client.cjs','library-client-test-results.json']
files += ['accounts.js','accounts-ui.html','accounts.css','supabase-accounts.sql','grant-owner-admin.sql','test-accounts-db.mjs','accounts-db-test-results.json']
files += [str(p.relative_to(root)).replace('\\','/') for p in sorted((root/'assets').glob('*')) if p.is_file()]
class IDs(HTMLParser):
 def __init__(self):super().__init__();self.ids=[]
 def handle_starttag(self,tag,attrs):
  self.ids.extend(v for k,v in attrs if k=='id')
s=(root/'index.html').read_text(encoding='utf-8');parser=IDs();parser.feed(s)
assert len(parser.ids)==len(set(parser.ids)), 'Duplicate element IDs'
assert 'body.wide.home-view' not in s
assert s.count('id="mode-blitz"')==1 and s.count('id="blitz"')==1
assert (root/'dist/index.html').read_text(encoding='utf-8')==s
accounts_sql=(root/'supabase-accounts.sql').read_text(encoding='utf-8')
assert all(marker in accounts_sql for marker in ['create table if not exists public.profiles','create table if not exists public.app_admins','function public.moderate_game_quiz']), 'Accounts migration is incomplete'
with zipfile.ZipFile(root/'ranking-game-netlify.zip','w',zipfile.ZIP_DEFLATED) as out:
 for name in files:
  out.write(root/name,name)
print(f'GitHub-ready archive: {len(files)} files; HTML IDs unique; standalone and deployment HTML match.')
