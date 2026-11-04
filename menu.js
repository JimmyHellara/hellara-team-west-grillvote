
/* Team West menu poll. Only the Supabase publishable key is present in this client; no private credentials. */
(() => {
'use strict';
const API='https://uffsutvjkwrqutygurey.supabase.co';
const KEY="sb_publishable_juTlArdu9e06aIQx3gNmkw_ONBSj_dC";
const storageKey='hellara-teamwest-meal-name-v1';
const menu=[
 {id:'hertenkalf',label:'Hertenkalf',category:'suggestie',desc:'Seizoenssuggestie · telefonisch gemeld · bereiding nog te bevestigen'},
 {id:'eendenborst',label:'Eendenborst',category:'suggestie',desc:'Seizoenssuggestie · telefonisch gemeld · bereiding nog te bevestigen'},
 {id:'kip_spit',label:'Halve kip aan ’t spit',category:'grill',desc:'Klassieker van d’Hoeve'},
 {id:'kip_pikant',label:'Halve kip · pikant',category:'grill',desc:'Pittige kip aan ’t spit'},
 {id:'kip_extra_pikant',label:'Halve kip · extra pikant',category:'grill',desc:'Voor wie het graag écht pittig heeft'},
 {id:'ribbetjes',label:'Gegrilde carré ribbetjes',category:'grill',desc:'Van de grill · klassieker'},
 {id:'kalkoenbrochette',label:'Kalkoenbrochette',category:'grill',desc:'Ongeveer 300 gram'},
 {id:'cote_500',label:'Côte-à-l’os',category:'grill',desc:'Ongeveer 500 gram'},
 {id:'cote_1300',label:'Côte-à-l’os voor twee',category:'grill',desc:'Ongeveer 1300 gram · voor 2 personen · overleg vooraf'},
 {id:'chateaubriand',label:'Chateaubriand',category:'grill',desc:'Ongeveer 300 gram'},
 {id:'scampi_maison',label:'Scampi Maison',category:'vis',desc:'Look en room'},
 {id:'scampi_chef',label:'Scampi van de chef',category:'vis',desc:'Volgens bereiding van de chef'},
 {id:'scampi_look',label:'Scampi met look',category:'vis',desc:'Met look'},
 {id:'scampi_room',label:'Scampi met room',category:'vis',desc:'Met room'},
 {id:'zalm_bearnaise',label:'Gegrilde zalm',category:'vis',desc:'Met béarnaisesaus'},
 {id:'vispannetje',label:'Vispannetje',category:'vis',desc:'Met frietjes of aardappel in de pel'},
 {id:'vol_au_vent',label:'Vol-au-vent',category:'klassiek',desc:'Met frietjes en koude groenten'},
 {id:'salade_zalm',label:'Salade gerookte zalm',category:'salade',desc:'Met brood of frietjes'},
 {id:'salade_garnalen',label:'Salade garnaalkroket',category:'salade',desc:'Met 3 garnaalkroketten'},
 {id:'salade_kaas',label:'Salade kaaskroket',category:'salade',desc:'Met 3 kaaskroketten'},
 {id:'salade_geitenkaas',label:'Salade geitenkaas',category:'salade',desc:'Met brood of frietjes'},
 {id:'salade_scampi',label:'Salade scampi',category:'salade',desc:'Met brood of frietjes'},
 {id:'salade_dhoeve',label:'Salade d’Hoeve',category:'salade',desc:'Met kip'}
];

const cat={suggestie:'SEIZOEN ✦',grill:'GRILLADES',vis:'VISGERECHTEN',klassiek:'KLASSIEK',salade:'SALADES'};
const byId=Object.fromEntries(menu.map(x=>[x.id,x]));
const $=id=>document.getElementById(id);
const state={
 name:localStorage.getItem(storageKey)||localStorage.getItem('hs-grillvote-name-v1')||'',
 ranked:[], category:'all', search:'', scores:[], total:0, adminVotes:[],
 winners:[], saved:false
};
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label=id=>byId[id]?.label||String(id||'');
const normalizeName=n=>String(n||'').trim().replace(/\s+/g,' ').slice(0,60);
const points=[3,2,1];
function feedback(msg,kind=''){
 $('meal-message').textContent=msg;
 $('meal-message').className=kind;
}
function adminFeedback(msg,kind=''){
 $('meal-admin-status').textContent=msg;
 $('meal-admin-status').className=kind;
}
async function rpc(method,params={}){
 const response=await fetch(API+'/rest/v1/rpc/'+method,{
  method:'POST',headers:{apikey:KEY,'Content-Type':'application/json','Accept':'application/json'},
  body:JSON.stringify(params),cache:'no-store',credentials:'omit'
 });
 let data={};
 try{data=await response.json()}catch{}
 if(!response.ok)throw new Error(data?.message||'Serverfout '+response.status);
 return data;
}
function cardTemplate(m){
 const rank=state.ranked.indexOf(m.id);
 return \`<button class="meal-item \${rank>=0?'selected':''} \${m.category==='suggestie'?'special':''}" type="button"
    data-dish="\${safe(m.id)}" aria-pressed="\${rank>=0}" aria-label="\${safe(m.label)}\${rank>=0?', keuze '+(rank+1):''}">
    <span class="meal-item-tag"><span>\${cat[m.category]}</span>
    <span class="meal-item-check">\${rank>=0?rank+1:'+'}</span></span>
    <strong>\${safe(m.label)}</strong>
    <small>\${rank>=0?(rank===0?'🥇 3 PUNTEN':rank===1?'🥈 2 PUNTEN':'🥉 1 PUNT'):safe(m.desc)}</small>
  </button>\`;
}
function renderCards(){
 const filtered=menu.filter(m=>(state.category==='all'||m.category===state.category)&&
  (m.label+' '+m.desc+' '+cat[m.category]).toLowerCase().includes(state.search.toLowerCase()));
 $('meal-cards').innerHTML=filtered.length?filtered.map(cardTemplate).join(''):
  '<p class="meal-empty">Geen gerechten gevonden. Probeer een andere zoekterm.</p>';
 $('meal-cards').querySelectorAll('[data-dish]').forEach(el=>el.addEventListener('click',()=>selectDish(el.dataset.dish)));
}
function selectDish(id){
 const rank=state.ranked.indexOf(id);
 if(rank>=0)state.ranked.splice(rank,1);
 else if(state.ranked.length<3)state.ranked.push(id);
 else{feedback('Je hebt al drie gerechten. Verwijder eerst één van je keuzes door erop te tikken.');return}
 state.saved=false;
 feedback('');
 renderSelection();renderCards();
}
function renderSelection(){
 const ranks=state.ranked;
 const list=$('meal-ranked-list');
 list.innerHTML=points.map((p,i)=>{
  const id=ranks[i];
  const food=id?label(id):i===0?'Kies je favoriet':i===1?'Kies je tweede gerecht':'Kies je derde gerecht';
  return \`<li class="meal-ranked-row \${id?'filled':''}">
   <span class="meal-rank-medal">\${i+1}</span><span class="meal-rank-food">\${safe(food)}<small>\${p} \${p===1?'PUNT':'PUNTEN'}</small></span>
   \${id?'<button type="button" data-remove="'+safe(id)+'" aria-label="Verwijder '+safe(food)+'">×</button>':''}
  </li>\`;
 }).join('');
 list.querySelectorAll('[data-remove]').forEach(el=>el.addEventListener('click',()=>selectDish(el.dataset.remove)));
 $('meal-rank-progress-text').textContent=ranks.length+' VAN 3 GEKOZEN';
 document.querySelectorAll('.meal-rank-track i').forEach((el,i)=>el.classList.toggle('filled',i<ranks.length));
 $('meal-save').disabled=ranks.length!==3;
 $('meal-selected-title').textContent=ranks.length===3?'TOP 3 COMPLEET!':ranks.length+' VAN 3 GEKOZEN';
 $('meal-selected-description').textContent=ranks.length===3?
  '1. '+label(ranks[0])+' · 2. '+label(ranks[1])+' · 3. '+label(ranks[2]):
  'Tik de hoofdgerechten aan in volgorde van voorkeur. Jouw nummer 1 krijgt 3 punten.';
 $('meal-save').innerHTML=state.saved?'TOP 3 OPNIEUW BEWAREN <span>→</span>':'BEVESTIG MIJN TOP 3 <span>→</span>';
}
async function loadSaved(){
 const name=normalizeName($('meal-name').value);
 if(name.length<2){feedback('Vul eerst je naam in.','error');return}
 try{
  const record=await rpc('teamwest_meal_rank_lookup',{p_name:name});
  state.name=name;
  const ranked=Array.isArray(record?.ranked_dishes)?record.ranked_dishes:[];
  if(ranked.length===3&&ranked.every(id=>byId[id])&&new Set(ranked).size===3){
   state.ranked=ranked;
   state.saved=true;
   feedback('Je eerdere top 3 is opgehaald. Je kunt hem nog aanpassen en opnieuw bewaren.','ok');
  }else {
   state.ranked=[];state.saved=false;
   feedback('Er is nog geen top 3 op deze naam. Kies drie gerechten en bevestig.','');
  }
  renderSelection();renderCards();
 }catch(e){feedback('Ophalen mislukt: '+e.message,'error')}
}
async function saveVote(){
 const name=normalizeName($('meal-name').value);
 if(name.length<2){feedback('Vul eerst je naam in.','error');$('meal-name').focus();return}
 if(state.ranked.length!==3||new Set(state.ranked).size!==3){
  feedback('Kies drie verschillende gerechten.','error');return;
 }
 $('meal-save').disabled=true;feedback('Jouw top 3 wordt bewaard…');
 try{
  await rpc('teamwest_meal_rank_save',{p_name:name,p_ranked_dishes:state.ranked});
  state.name=name;state.saved=true;localStorage.setItem(storageKey,name);
  feedback('✅ Opgeslagen! Je top 3 telt mee. Je kunt je voorkeur later nog wijzigen.','ok');
  await refreshScores();
 }catch(e){feedback('Niet opgeslagen: '+(String(e.message).includes('invalid_ranked_dishes')?'Kies drie verschillende gerechten.':e.message),'error')}
 finally{renderSelection()}
}
function getWinners(){
 return [...state.scores].slice(0,3).map(x=>x.dish_id);
}
function rankTie(){
 const a=state.scores[2],b=state.scores[3];
 return !!(a&&b&&Number(a.points)===Number(b.points)&&Number(a.first)===Number(b.first)&&Number(a.second)===Number(b.second));
}
function renderScores(){
 const sorted=state.scores;
 $('meal-total').textContent=state.total;
 const top=sorted.slice(0,3);
 $('meal-winners').innerHTML=top.length?top.map((x,i)=>
  \`<article class="meal-winner-card"><span class="meal-winner-heading">\${i+1}e PLAATS \${i===0?'✦':''}</span>
   <strong>\${safe(label(x.dish_id))}</strong>
   <div class="meal-winner-points">\${Number(x.points)} <span>PUNTEN</span></div>
   <small>\${Number(x.first)}× eerste · \${Number(x.second)}× tweede · \${Number(x.third)}× derde</small>
  </article>\`).join(''):
  '<p class="meal-empty">Nog geen keuzes. De eerste drie gerechten komen hier automatisch te staan.</p>';
 if(rankTie())$('meal-winners').insertAdjacentHTML('beforeend','<p class="meal-tie-note">⚠️ Gelijke stand op de grens van de top 3. De organisator moet beslissen.</p>');
 const max=Math.max(1,...sorted.map(x=>Number(x.points)||0));
 $('meal-stats').innerHTML=sorted.length?sorted.map((x,i)=>{
  const percent=Math.round(Number(x.points)/max*100);
  return \`<div class="meal-stat"><strong class="meal-stat-count">\${Number(x.points)} <small>PT</small></strong>
   <div style="flex:1"><div class="meal-stat-label">\${i<3?'✦ ':''}\${safe(label(x.dish_id))}</div>
   <div class="meal-stat-meta">\${Number(x.first)}× 1e · \${Number(x.second)}× 2e · \${Number(x.third)}× 3e</div>
   <div class="meal-stat-bar"><span style="width:\${percent}%"></span></div></div></div>\`;
 }).join(''):'<p>Er zijn nog geen stemmen. Jij kunt de eerste zijn! 🔥</p>';
}
async function refreshScores(){
 try{
  const data=await rpc('teamwest_meal_rank_summary');
  state.scores=Array.isArray(data?.counts)?data.counts:[];
  state.total=Number(data?.total)||0;
  state.winners=getWinners();
  renderScores();
 }catch(e){$('meal-stats').textContent='De live tussenstand is even niet beschikbaar. Vernieuw later de pagina.'}
}
function csvDownload(header,rows,filename){
 const quote=s=>'"'+String(s??'').replace(/"/g,'""').replace(/\r?\n/g,' ')+'"';
 const body=[header.map(quote).join(';'),...rows.map(r=>r.map(quote).join(';'))].join('\r\n');
 const url=URL.createObjectURL(new Blob(['\uFEFF'+body],{type:'text/csv;charset=utf-8;'}));
 const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function loadAdminTable(){
 const votes=state.adminVotes;
 const rows=votes.map(v=>{
  const ranked=Array.isArray(v.ranked_dishes)?v.ranked_dishes:[];
  return \`<tr><td>\${safe(v.name)}</td><td>\${safe(label(ranked[0]))}</td><td>\${safe(label(ranked[1]))}</td><td>\${safe(label(ranked[2]))}</td></tr>\`;
 }).join('');
 $('meal-admin-table-wrap').innerHTML=\`<table class="meal-admin-table"><thead><tr>
  <th>NAAM</th><th>1e KEUZE · 3 PT</th><th>2e · 2 PT</th><th>3e · 1 PT</th>
  </tr></thead><tbody>\${rows||'<tr><td colspan="4">Nog geen keuzes opgeslagen.</td></tr>'}</tbody></table>\`;
 const winners=getWinners();
 const needsAttention=votes.filter(v=>!v.ranked_dishes?.some(id=>winners.includes(id)));
 const notes=[];
 if(rankTie())notes.push('⚠️ Er is een gelijkspel op de grens van de top 3. Beslis eerst welke drie gerechten definitief worden.');
 if(needsAttention.length)notes.push('⚠️ '+needsAttention.length+' collega(’s) hebben geen van de drie winnende gerechten in hun top 3. Stem hun bestelling persoonlijk af.');
 if(!notes.length)notes.push('Voorlopig restaurantvoorstel: iedere collega krijgt het hoogst gerangschikte gerecht uit de winnende top 3. Controleer alles voordat je bestelt.');
 $('meal-admin-warning').textContent=notes.join(' ');
}
async function loadAdmin(){
 const code=$('meal-admin-code').value.trim();
 if(!code){adminFeedback('Vul eerst je beheercode in.','error');return}
 adminFeedback('De lijst wordt opgehaald…');$('meal-admin-results').hidden=true;
 try{
  const data=await rpc('teamwest_meal_rank_admin_results',{p_admin_code:code});
  const votes=Array.isArray(data.votes)?data.votes:[];
  state.adminVotes=votes;
  await refreshScores();
  $('meal-admin-count').textContent=votes.length+' top-3-stemmen';
  loadAdminTable();
  $('meal-admin-results').hidden=false;
  adminFeedback('✅ Top-3-overzicht geladen. De huidige top 3 heeft '+getWinners().length+' gerechten.','ok');
 }catch(e){
  adminFeedback(String(e.message).includes('invalid_admin_code')?'Onjuiste beheercode.':'Kon de bestellijst niet ophalen: '+e.message,'error');
 }
}
function downloadPreferences(){
 const rows=state.adminVotes.map(v=>[
  v.name,...[0,1,2].map(i=>label(v.ranked_dishes?.[i])),
  v.updated_at?new Date(v.updated_at).toLocaleString('nl-BE',{timeZone:'Europe/Brussels'}):''
 ]);
 csvDownload(['Naam','1e keuze (3 pt)','2e keuze (2 pt)','3e keuze (1 pt)','Laatst aangepast'],rows,'Team-West-Top3-voorkeuren.csv');
}
function downloadRestaurant(){
 const winnerIds=getWinners();
 const rows=state.adminVotes.map(v=>{
  const choices=Array.isArray(v.ranked_dishes)?v.ranked_dishes:[];
  const selected=choices.find(id=>winnerIds.includes(id));
  const proposed=selected?label(selected):'AFSTEMMEN: geen winnend gerecht in top 3';
  return [v.name,proposed,selected?choices.indexOf(selected)+1:'',
   ...choices.map(label)];
 });
 csvDownload(['Naam','Voorgesteld gerecht','Keuzeplaats','Top 1','Top 2','Top 3'],rows,'Team-West-restaurantvoorstel-eerst-controleren.csv');
}
function bind(){
 $('meal-name').value=state.name;
 $('meal-load').addEventListener('click',loadSaved);
 $('meal-name').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();loadSaved()}});
 $('meal-tabs').querySelectorAll('[data-category]').forEach(btn=>btn.addEventListener('click',()=>{
  state.category=btn.dataset.category;
  $('meal-tabs').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===btn));
  renderCards();
 }));
 $('meal-search').addEventListener('input',e=>{state.search=e.target.value;renderCards()});
 $('meal-reset').addEventListener('click',()=>{state.ranked=[];state.saved=false;feedback('');renderSelection();renderCards()});
 $('meal-save').addEventListener('click',saveVote);
 $('meal-admin-open').addEventListener('click',loadAdmin);
 $('meal-download').addEventListener('click',downloadPreferences);
 $('meal-restaurant-download').addEventListener('click',downloadRestaurant);
 renderSelection();renderCards();refreshScores();
 if(state.name)loadSaved();
 setInterval(()=>{if(!document.hidden)refreshScores()},20000);
}
bind();
})();
