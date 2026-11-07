(() => {
const products = [
{image:'studymate-ums',name:'Studymate UMS',word:'STUDYMATE',domain:'studymateums.com',url:'/solutions/studymate-ums/',category:'FOR UNIVERSITIES & FACULTIES',tag:'UNIVERSITY MANAGEMENT',description:'Learning, results and administration. Connected.',color:'#194f47',alt:'Studymate UMS website and results dashboard'},
{image:'jadicoq',name:'JADICOQ ERP',word:'JADICOQ',domain:'jadicoq.com',url:'/solutions/jadicoq-erp/',category:'FOR YOUR BUSINESS',tag:'BUSINESS OPERATIONS',description:'Finance, people and operations. One platform.',color:'#203c79',alt:'JADICOQ ERP website and business dashboard'},
{image:'studymate-schools',name:'StudyMate Schools',word:'STUDYMATE',domain:'studymateschools.com',url:'/solutions/studymate-schools/',category:'FOR PRIMARY & SECONDARY SCHOOLS',tag:'SCHOOL MANAGEMENT',description:'Bring the school day together.',color:'#174e43',alt:'StudyMate Schools product website'},
{image:'learnbee',name:'LearnBee',word:'LEARNBEE',domain:'learnbee.co.uk',url:'/solutions/learnbee/',category:'FOR UK LEARNERS & FAMILIES',tag:'LEARNING & DISCOVERY',description:'Make room for a little more discovery.',color:'#6d4921',alt:'LearnBee product website with bee mascot'}
];
// Product links remain independent of the film's three illustrated panels.
const tabs=[...document.querySelectorAll('[data-product]')];
tabs.forEach((button,i)=>button.addEventListener('click',()=>{
 const p=products[i];
 for(const key of ['category','name','description']) document.getElementById('feature-'+key).textContent=p[key];
 document.getElementById('feature-link').href=p.url;
 tabs.forEach((b,j)=>{b.classList.toggle('active',j===i);b.setAttribute('aria-pressed',String(j===i))});
 document.getElementById('showcase-status').textContent='Showing '+p.name;
}));
const video=document.getElementById('hero-video'), toggle=document.getElementById('motion-toggle');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let requested=!reduced.matches&&!navigator.connection?.saveData, inView=true;
function updateButton(){toggle.innerHTML=video.paused?'▶ <span>Play</span>':'Ⅱ <span>Pause</span>';toggle.setAttribute('aria-label',video.paused?'Play product film':'Pause product film')}
async function playFilm(){
 if(!video.src){video.src=video.dataset.src;video.load()}
 video.muted=true;
 try{await video.play()}catch{updateButton()}
}
function syncPlayback(){if(requested&&inView&&!document.hidden)playFilm();else video.pause()}
toggle.addEventListener('click',()=>{requested=video.paused;if(requested)playFilm();else video.pause()});
document.getElementById('replay').addEventListener('click',()=>{video.currentTime=0;requested=true;playFilm()});
video.addEventListener('play',updateButton);video.addEventListener('pause',updateButton);
video.addEventListener('error',()=>{requested=false;video.removeAttribute('src');video.load();updateButton();document.getElementById('film-status').textContent='The film could not load. The still preview and product links are available.'});
reduced.addEventListener('change',()=>{requested=!reduced.matches&&!navigator.connection?.saveData;syncPlayback()});
document.addEventListener('visibilitychange',syncPlayback);
if('IntersectionObserver' in window)new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;syncPlayback()},{threshold:.1}).observe(video);
else syncPlayback();
updateButton();
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{const filter=button.dataset.filter;let count=0;document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',b===button?'true':'false')});document.querySelectorAll('[data-category]').forEach(card=>{card.hidden=filter!=='all'&&card.dataset.category!==filter;if(!card.hidden)count++});document.getElementById('filter-status').textContent='Showing '+count+' live '+(filter==='all'?'':filter+' ')+'products.'}));
// Native sliders work with touch, mouse and keyboard. Finished interfaces stay visible by default.
document.querySelectorAll('.reveal-control').forEach(control=>{
 const slider=control.querySelector('input'),stage=control.previousElementSibling,button=control.querySelector('button');let frame;
 const render=()=>stage.style.setProperty('--reveal',slider.value+'%');
 slider.addEventListener('input',()=>{cancelAnimationFrame(frame);button.disabled=false;render()});
 button.addEventListener('click',()=>{
  cancelAnimationFrame(frame);
  if(reduced.matches){slider.value=slider.value==='100'?'0':'100';render();return}
  button.disabled=true;const start=performance.now();slider.value=0;render();
  function draw(now){slider.value=Math.min(100,Math.round((now-start)/14));render();if(slider.value<100)frame=requestAnimationFrame(draw);else button.disabled=false}frame=requestAnimationFrame(draw);
 });
});
const rsuCopy={overview:'A dedicated welcome to open and distance learning at RSU.',programmes:'The programme entry point helps visitors begin exploring the available study options.',access:'The portal sign-in gives returning users a clear way into their learning environment.'};
document.querySelectorAll('[data-rsu]').forEach(button=>button.addEventListener('click',()=>{document.querySelector('.rsu-canvas').dataset.view=button.dataset.rsu;document.getElementById('rsu-caption').textContent=rsuCopy[button.dataset.rsu];document.querySelectorAll('[data-rsu]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)))}));
let base='Customer portal';const selectedModules=new Set(['Reporting']);
const purposes={'Customer portal':'Bring your customers closer.','Mobile app':'Put your idea in their hands.','Operations hub':'Give your team a clearer view.'};
function updateIdea(){
 document.getElementById('idea-title').textContent=base;document.getElementById('idea-purpose').textContent=purposes[base];
 const modules=document.getElementById('idea-modules');modules.replaceChildren();
 for(const name of selectedModules){const card=document.createElement('div');card.className='idea-module';const icon=document.createElement('span');icon.setAttribute('aria-hidden','true');icon.textContent={Payments:'↗','AI assistant':'✦',Reporting:'▥'}[name];card.append(icon,document.createTextNode(name));modules.append(card)}
 const description=base+(selectedModules.size?' with '+[...selectedModules].join(', '):' without extra modules');document.getElementById('idea-status').textContent=description+'.';
 document.getElementById('brief-link').href='mailto:info@xdosdev.com?subject='+encodeURIComponent('Custom project idea: '+base)+'&body='+encodeURIComponent('Hello XdosDev,\n\nI would like to discuss a '+description.toLowerCase()+'.\n\nMy goals and requirements:\n\n');
}
document.querySelectorAll('[data-base]').forEach(button=>button.addEventListener('click',()=>{base=button.dataset.base;document.querySelectorAll('[data-base]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));updateIdea()}));
document.querySelectorAll('[data-module]').forEach(button=>button.addEventListener('click',()=>{const name=button.dataset.module;if(selectedModules.has(name))selectedModules.delete(name);else selectedModules.add(name);button.setAttribute('aria-pressed',String(selectedModules.has(name)));button.textContent=(selectedModules.has(name)?'✓ ':'+ ')+name;updateIdea()}));updateIdea();
if('IntersectionObserver' in window&&!reduced.matches){const threadObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('tracing');threadObserver.unobserve(e.target)}}),{threshold:.5});document.querySelectorAll('.drawing-thread').forEach(el=>threadObserver.observe(el))}

})();
