
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
const state={name:localStorage.getItem(storageKey)||localStorage.getItem('hs-grillvote-name-v1')||'',dish:'',alternate:'',side:'',category:'all',search:'',counts:[],adminVotes:[]};
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function normalizeName(n){return String(n||'').trim().replace(/\s+/g,' ').slice(0,60)}
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
  method:'POST',
  headers:{'apikey':KEY,'Content-Type':'application/json','Accept':'application/json'},
  body:JSON.stringify(params),
  cache:'no-store',
  credentials:'omit'
 });
 let data={};
 try {data=await response.json()} catch {}
 if(!response.ok) throw new Error(data?.message||'Serverfout '+response.status);
 return data;
}
function cardTemplate(m) {
 const selected=m.id===state.dish;
 return `<button class="meal-item ${selected?'selected':''} ${m.category==='suggestie'?'special':''}" type="button" data-dish="${safe(m.id)}" role="radio" aria-checked="${selected}" aria-label="${safe(m.label)}">
 <span class="meal-item-tag"><span>${cat[m.category]}</span><span class="meal-item-check">${selected?'✓':'+'}</span></span>
 <strong>${safe(m.label)}</strong><small>${safe(m.desc)}</small></button>`;
}
function renderCards(){
 const filtered=menu.filter(m=>(state.category==='all'||m.category===state.category)&&
 (m.label+' '+m.desc+' '+cat[m.category]).toLowerCase().includes(state.search.toLowerCase()));
 $('meal-cards').innerHTML=filtered.length?filtered.map(cardTemplate).join(''):'<p class="meal-empty">Geen gerechten gevonden. Probeer een andere zoekterm.</p>';
 $('meal-cards').querySelectorAll('[data-dish]').forEach(el=>el.addEventListener('click',()=>{
  state.dish=el.dataset.dish;
  if(state.alternate===state.dish)state.alternate='';
  updateSelection();
  renderCards();
 }));
}
function renderAlternative(){
 const sel=$('meal-alternative');
 const previous=state.alternate;
 sel.innerHTML='<option value="">Geen alternatief gekozen</option>';
 for (const m of menu.filter(m=>m.id!==state.dish)){
  const opt=document.createElement('option');
  opt.value=m.id;opt.textContent=m.label;sel.appendChild(opt);
 }
 if(menu.some(m=>m.id===previous&&m.id!==state.dish))sel.value=previous;
 else{state.alternate='';sel.value=''}
}
function updateSelection(){
 const chosen=byId[state.dish];
 $('meal-selected-title').textContent=chosen?chosen.label.toUpperCase():'NOG GEEN GERECHT';
 $('meal-selected-description').textContent=chosen?chosen.desc:'Kies hierboven eerst wat je graag zou eten.';
 $('meal-save').disabled=!chosen;
 renderAlternative();
}
function updateSummary(){
 const counts=state.counts||[];
 const total=counts.reduce((sum,r)=>sum+Number(r.count||0),0);
 $('meal-total').textContent=total;
 const countMap=new Map(counts.map(x=>[x.dish_id,Number(x.count||0)]));
 const sorted=[...menu].filter(m=>countMap.has(m.id)).sort((a,b)=>(countMap.get(b.id)||0)-(countMap.get(a.id)||0));
 $('meal-stats').innerHTML=sorted.length?sorted.map(m=>{
  const qty=countMap.get(m.id);
  const percent=total?Math.round(qty/total*100):0;
  return `<div class="meal-stat"><strong class="meal-stat-count">${qty}×</strong><div style="flex:1"><div class="meal-stat-label">${safe(m.label)}</div><div class="meal-stat-bar"><span style="width:${percent}%"></span></div></div></div>`
 }).join(''):'<p>Nog geen bestellingen. Jij kunt de eerste zijn! 🔥</p>';
}
async function refreshCounts(){
 try{
 const data=await rpc('teamwest_meal_summary');
 state.counts=Array.isArray(data.counts)?data.counts:[];
 updateSummary();
 }catch(e){
 $('meal-stats').textContent='De live telling kon niet geladen worden. Probeer het straks opnieuw.';
 }
}
async function loadSaved(){
 const name=normalizeName($('meal-name').value);
 if(name.length<2){feedback('Vul eerst je volledige naam in.','error');return}
 state.name=name;
 try{
 const record=await rpc('teamwest_meal_lookup',{p_name:name});
 if(record&&byId[record.dish_id]){
  state.dish=record.dish_id;
  state.alternate=byId[record.alternate_id]&&record.alternate_id!==state.dish?record.alternate_id:'';
  state.side=record.side_id||'';
  $('meal-side').value=state.side;
  updateSelection();renderCards();
  feedback('Je eerdere keuze werd opgehaald. Je kunt ze nu aanpassen.','ok');
 }else{
  feedback('Er staat nog geen keuze op deze naam. Kies jouw hoofdgerecht en bevestig.','');
 }
 }catch(e){feedback('Niet gelukt om je keuze op te halen: '+e.message,'error')}
}
async function save(){
 const name=normalizeName($('meal-name').value);
 if(name.length<2){feedback('Vul je naam in voor je bevestigt.','error');$('meal-name').focus();return}
 if(!byId[state.dish]){feedback('Kies eerst een hoofdgerecht.','error');return}
 state.alternate=$('meal-alternative').value||'';
 state.side=$('meal-side').value||'';
 $('meal-save').disabled=true;
 feedback('Bezig met bewaren…');
 try{
 await rpc('teamwest_meal_save',{p_name:name,p_dish_id:state.dish,p_alternate_id:state.alternate||null,p_side_id:state.side||null});
 state.name=name;localStorage.setItem(storageKey,name);
 feedback('✅ Bewaard! Je gerecht staat op de lijst. Nog wijzigen? Dat kan met dezelfde naam.','ok');
 await refreshCounts();
 }catch(e){feedback('Niet opgeslagen: '+e.message+'. Probeer opnieuw.','error')}
 finally{$('meal-save').disabled=false}
}
function csv(rows){
 const quote=s=>'"'+String(s??'').replace(/"/g,'""').replace(/\r?\n/g,' ')+'"';
 const header=['Naam','Hoofdgerecht','Alternatief','Begeleiding','Laatst aangepast'];
 const sideLabels={frietjes:'Frietjes',aardappel:'Aardappel in de pel',brood:'Brood',geen_voorkeur:'Geen voorkeur'};
 const lines=[header.map(quote).join(';')];
 for(const v of rows){
  const d=byId[v.dish_id]?.label||v.dish_id;
  const a=byId[v.alternate_id]?.label||'';
  const side=sideLabels[v.side_id]||'';
  const dt=v.updated_at?new Date(v.updated_at).toLocaleString('nl-BE',{timeZone:'Europe/Brussels'}):'';
  lines.push([v.name,d,a,side,dt].map(quote).join(';'));
 }
 const file='\uFEFF'+lines.join('\r\n');
 const blob=new Blob([file],{type:'text/csv;charset=utf-8;'});
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');
 a.href=url;a.download='Team-West-dHoeve-bestellingen-06-11-2026.csv';
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function loadAdmin(){
 const code=$('meal-admin-code').value.trim();
 if(!code){adminFeedback('Vul eerst de beheercode in.','error');return}
 adminFeedback('Bestellijst ophalen…');
 $('meal-admin-results').hidden=true;
 try{
 const data=await rpc('teamwest_meal_admin_results',{p_admin_code:code});
 const votes=Array.isArray(data.votes)?data.votes:[];
 state.adminVotes=votes;
 $('meal-admin-count').textContent=votes.length+' bestellingen';
 const sideLabels={frietjes:'Frietjes',aardappel:'Aardappel in de pel',brood:'Brood',geen_voorkeur:'Geen voorkeur'};
 const rows=votes.map(v=>`<tr><td>${safe(v.name)}</td><td>${safe(byId[v.dish_id]?.label||v.dish_id)}</td><td>${safe(byId[v.alternate_id]?.label||'—')}</td><td>${safe(sideLabels[v.side_id]||'—')}</td></tr>`).join('');
 $('meal-admin-table-wrap').innerHTML=`<table class="meal-admin-table"><thead><tr><th>NAAM</th><th>HOOFDGERECHT</th><th>ALTERNATIEF</th><th>BIJGEReCHT</th></tr></thead><tbody>${rows||'<tr><td colspan="4">Nog geen bestellingen.</td></tr>'}</tbody></table>`;
 $('meal-admin-results').hidden=false;
 const diff=new Set(votes.map(v=>v.dish_id)).size;
 adminFeedback('✅ '+votes.length+' keuzes. '+diff+' verschillende hoofdgerechten. Let op: maximaal 3 verschillende gerechten per tafel plannen.','ok');
 }catch(e){adminFeedback(e.message.includes('invalid_admin_code')?'Onjuiste beheercode.':'Bestellijst ophalen is mislukt: '+e.message,'error')}
}
function bind(){
 $('meal-name').value=state.name;
 $('meal-load').addEventListener('click',loadSaved);
 $('meal-name').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();loadSaved()}});
 $('meal-tabs').querySelectorAll('[data-category]').forEach(btn=>btn.addEventListener('click',()=>{
  state.category=btn.dataset.category;
  $('meal-tabs').querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===btn));
  renderCards();
 }));
 $('meal-search').addEventListener('input',e=>{state.search=e.target.value;renderCards()});
 $('meal-alternative').addEventListener('change',e=>{state.alternate=e.target.value});
 $('meal-side').addEventListener('change',e=>{state.side=e.target.value});
 $('meal-save').addEventListener('click',save);
 $('meal-admin-open').addEventListener('click',loadAdmin);
 $('meal-download').addEventListener('click',()=>csv(state.adminVotes));
 updateSelection();renderCards();refreshCounts();
 if(state.name)loadSaved();
 setInterval(()=>{if(!document.hidden)refreshCounts()},20000);
}
bind();
})();
