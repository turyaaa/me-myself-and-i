// Explicit category selection shares the same local multiplayer board.
let quizCategoryChoice=null,libraryQuizSource=null;
function quizSource(pool){
 const base=topicQuiz(quizSelection).map(c=>({name:c.name,qs:c.qs.map(x=>[x[0],x[1]])}));
 const mine=CUSTOM.filter(filled);
 return pool==='library'?(libraryQuizSource?.categories||[]):pool==='mine'?mine:pool==='all'?[...base,...mine]:base;
}
function chooseQuizCategories(pool){
 Q.open=null;$('qsetup').hidden=false;for(const id of ['board','qview','qend','qturn'])$(id).hidden=true;
 const source=quizSource(pool);quizCategoryChoice={pool,source,selected:[]};
 const box=$('qsetup');box.replaceChildren();
 const title=document.createElement('h2');title.className='title';title.textContent=pool==='library'?libraryQuizSource.title:'Обери категорії';
 const note=document.createElement('p');note.className='sub';note.textContent='Вибери свої п’ять категорій або довірся випадковому набору.';
 const count=document.createElement('p');count.className='quiz-selection-count';count.id='quiz-choice-count';
 const grid=document.createElement('div');grid.className='quiz-category-grid';
 const manual=document.createElement('button');manual.className='wbtn';manual.textContent='Грати з обраними';
 const update=()=>{const selected=quizCategoryChoice.selected;count.textContent='Обрано '+selected.length+' із 5';manual.disabled=selected.length!==5;[...grid.children].forEach((b,i)=>{b.setAttribute('aria-pressed',String(selected.includes(i)));b.disabled=selected.length===5&&!selected.includes(i);});};
 source.forEach((cat,i)=>{const b=document.createElement('button');b.textContent=cat.name;b.onclick=()=>{const selected=quizCategoryChoice.selected;quizCategoryChoice.selected=selected.includes(i)?selected.filter(n=>n!==i):selected.length<5?[...selected,i]:selected;update();};grid.append(b);});
 const actions=document.createElement('div');actions.className='quiz-picker-actions';
 manual.onclick=()=>startQuiz(pool,quizCategoryChoice.selected.map(i=>source[i]));
 const random=document.createElement('button');random.className='wbtn alt';random.textContent=source.length>=5?'П’ять випадкових категорій':'Грати з усіма '+source.length+' категоріями';random.disabled=!source.length;random.onclick=()=>startQuiz(pool);
 const back=document.createElement('button');back.className='wbtn alt';back.textContent='Назад';back.onclick=()=>pool==='library'?showLibrary():showSetup();
 actions.append(manual,random,back);box.append(title,note,count,grid,actions);update();renderPlayers();
}
function playLibraryQuiz(row){
 const categories=row.categories.filter(filled);if(!categories.length){libMessage('Додай хоча б одне питання з відповіддю перед грою.',true);return;}
 libraryQuizSource={id:row.id||null,title:row.title,categories:JSON.parse(JSON.stringify(categories))};
 openQuiz();chooseQuizCategories('library');
}
