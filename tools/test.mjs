import {homedir} from 'node:os';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {Browser,sleep}=await import(pathToFileURL(resolve(homedir(),'.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs')).href);
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {content} from '../src/content.js';
process.env.PORT='5174';
const {server}=await import('./server.mjs');
const report={at:new Date().toISOString(),checks:[],layouts:[],errors:[],networkErrors:[]};
const out='docs/browser-tests';mkdirSync(out,{recursive:true});
const browser=await Browser.launch();
const page=await browser.newPage({width:1440,height:1000});
browser.on(page.sessionId,'Network.responseReceived',p=>{if(p.response.status>=400)report.networkErrors.push({url:p.response.url,status:p.response.status});});
await page.send('Network.enable');
const check=(name,ok,detail)=>{report.checks.push({name,pass:!!ok,...detail&&{detail}});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const go=async route=>{await page.eval(r=>{location.hash='#/'+r;},route);await sleep(220);};
const click=async selector=>{await page.eval(s=>document.querySelector(s).scrollIntoView({block:'center',behavior:'instant'}),selector);const r=await page.eval(s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};},selector);await page.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...r});await page.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...r});await sleep(100);};
const key=async key=>{await page.send('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,windowsVirtualKeyCode:key==='Escape'?27:key==='Tab'?9:key==='Enter'?13:0});await page.send('Input.dispatchKeyEvent',{type:'keyUp',key,code:key});await sleep(60);};
try{
 await page.goto('http://127.0.0.1:5174',{settleMs:100});
 check('First visit shows an accessible entrance',await page.eval(()=>document.querySelector('#entrance').open));
 await click('#skip-intro');await sleep(700);
 check('Skip dismisses entrance and stores session',await page.eval(()=>!document.querySelector('#entrance').open&&sessionStorage.getItem('bonaparte-entered')==='1'));
 await page.goto('http://127.0.0.1:5174',{settleMs:300});
 check('Entrance does not repeat on reload',await page.eval(()=>!document.querySelector('#entrance').open));
 await page.eval(()=>document.fonts.ready);
 check('Both locally hosted fonts are loaded',await page.eval(()=>document.fonts.check('16px Fraunces')&&document.fonts.check('16px "Public Sans"')));
 await click('[data-action="year"][data-index="0"]');check('History timeline changes content',await page.eval(()=>document.querySelector('#history-detail').textContent.includes('Les origines')));
 await click('[data-action="cycle"][data-index="3"]');check('Academic cycle tabs change content',await page.eval(()=>document.querySelector('#cycle-content').textContent.includes('15 – 18')));
 await click('[data-action="orientation"][data-index="2"]');check('Orientation tabs change content',await page.eval(()=>document.querySelector('#orientation-copy').textContent.includes('accompagnement personnalisé')));
 await click('[data-action="gallery-next"]');check('Campus gallery advances',await page.eval(()=>document.querySelector('.campus-photo figcaption').textContent.includes('auditorium')));
 await click('.faq-section details summary');check('FAQ disclosure opens',await page.eval(()=>document.querySelector('.faq-section details').open));
 check('Pronote opens genuine portal safely',await page.eval(()=>{const a=document.querySelector('.portal');return a.href==='https://e974003c.index-education.net/pronote/'&&a.target==='_blank'&&a.rel.includes('noopener');}));
 await go('academie');await click('[data-action="trophy"]');check('Trophy opens authentic photo detail',await page.eval(()=>document.querySelector('#detail').open&&document.querySelector('#detail img').naturalWidth>0));
 await key('Tab');check('Dialog traps keyboard focus',await page.eval(()=>document.querySelector('#detail').contains(document.activeElement)));
 await key('Escape');check('Escape closes dialog and restores trigger focus',await page.eval(()=>!document.querySelector('#detail').open&&document.activeElement.dataset.action==='trophy'));
 await click('[data-action="competition"][data-index="3"]');check('Competition panel describes missing documentation honestly',await page.eval(()=>document.querySelector('#detail').textContent.includes('résultats à fournir')));await key('Escape');
 await go('voyages');await click('[data-action="trip-next"]');check('Album next changes destination',await page.eval(()=>document.querySelector('.album h2').textContent==='Classe de neige'));await click('[data-action="trip"][data-index="6"]');check('Last album disables next',await page.eval(()=>document.querySelector('[data-action="trip-next"]').disabled));await click('[data-action="trip-photos"]');check('Photo collection opens a labeled placeholder',await page.eval(()=>document.querySelector('#detail').open&&document.querySelector('#detail').textContent.includes('Photographie à venir')));await key('Escape');
 await go('media');await click('[data-action="cd"]');check('CD case opens',await page.eval(()=>document.querySelector('.cd-case').classList.contains('is-open')));await click('[data-action="spin"]');check('Disc rotation is user controlled',await page.eval(()=>getComputedStyle(document.querySelector('.disc')).animationPlayState==='running'));await click('[data-action="spin"]');check('Disc rotation pauses',await page.eval(()=>getComputedStyle(document.querySelector('.disc')).animationPlayState==='paused'));check('No invented Spotify link or autoplay audio',await page.eval(()=>!document.querySelector('audio')&&!document.querySelector('a[href*="spotify"]')&&document.querySelector('.pending-status')));
 await go('clubs');check('All eleven original clubs preserved',await page.eval(()=>document.querySelectorAll('.club-row').length===11));await page.eval(()=>{const i=document.querySelector('#club-search');i.value='cinema';i.dispatchEvent(new Event('input',{bubbles:true}));});check('Club search is accent insensitive',await page.eval(()=>document.querySelectorAll('.club-row').length===1&&document.querySelector('.club-row').textContent.includes('cinéma')));await page.eval(()=>{const i=document.querySelector('#club-search');i.value='zzzz';i.dispatchEvent(new Event('input',{bubbles:true}));});check('Club search has honest empty state',await page.eval(()=>!!document.querySelector('.empty-state')));
 await go('vie');await click('[data-action="facility"][data-filter="SPORT"]');check('Facility filter works',await page.eval(()=>document.querySelectorAll('.facilities-list article').length===5));
 await go('contact');check('Contact uses real email links without fake form',await page.eval(()=>document.querySelectorAll('main a[href^="mailto:"]').length===3&&!document.querySelector('form')));
 const routes=['accueil','vie','academie','voyages','media','clubs','inscriptions','recrutement','contact','personnel','sources',...['mun','maquette','finance','cinema','maths','games','manga','solidarite','elles-bougent','chorale'].map(s=>'club/'+s)];
 for(const width of [1440,768,390,320]){
  await page.setViewport({width,height:width<600?844:1000,mobile:width<600});
  for(const r of routes){await go(r);const layout=await page.eval(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,h1:document.querySelectorAll('h1').length,brokenImages:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.src)}));report.layouts.push({width,route:r,...layout});
   if(['accueil','academie','voyages','media','clubs','contact','club/cinema'].includes(r)&&(width===1440||width===390)){await sleep(400);await page.screenshot({path:`${out}/${r.replace('/','-')}-${width}.jpg`,quality:85});}
  }
  await go('accueil');await page.screenshot({path:`${out}/home-${width}.jpg`,quality:90});
  if(width===390){await click('[data-action="menu"]');check('Mobile menu opens',await page.eval(()=>getComputedStyle(document.querySelector('#navigation')).display==='flex'));await key('Escape');check('Mobile menu closes on Escape',await page.eval(()=>document.querySelector('.menu-toggle').getAttribute('aria-expanded')==='false'));}
 }
 check('All routes have one h1 and no horizontal overflow at four widths',report.layouts.every(x=>!x.overflow&&x.h1===1));
 check('All loaded images resolve on all tested routes',report.layouts.every(x=>x.brokenImages.length===0));
 await page.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await page.eval(()=>sessionStorage.clear());await page.goto('http://127.0.0.1:5174',{settleMs:300});check('Reduced motion bypasses first-visit intro',await page.eval(()=>!document.querySelector('#entrance').open));await go('media');await click('[data-action="spin"]');check('Reduced motion stops disc animation',await page.eval(()=>getComputedStyle(document.querySelector('.disc')).animationName==='none'));await click('[data-action="cd"]');check('Reduced motion still opens CD contents',await page.eval(()=>getComputedStyle(document.querySelector('.cd-cover')).opacity==='0'));
 await go('clubs');await go('contact');await page.eval(()=>history.back());await sleep(250);check('Browser Back restores previous route',await page.eval(()=>location.hash==='#/clubs'));await page.eval(()=>history.forward());await sleep(250);check('Browser Forward restores next route',await page.eval(()=>location.hash==='#/contact'));
 check('Original HTML backup matches original checksum',createHash('sha256').update(readFileSync('Main.dc.html')).digest('hex')===createHash('sha256').update(readFileSync('original/Main.dc.html')).digest('hex'));
 check('All source content groups retained',content.clubs.length===11&&content.trips.length===7&&content.competitions.length===9&&content.facilities.length===15);
 report.errors=page.consoleErrors;check('No JavaScript runtime exceptions',!report.errors.length);check('No HTTP resource errors',!report.networkErrors.length);
}catch(error){report.errors.push(error.stack);console.error(error);process.exitCode=1;}finally{writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();server.close();}
if(report.checks.some(c=>!c.pass)||report.errors.length)process.exitCode=1;
