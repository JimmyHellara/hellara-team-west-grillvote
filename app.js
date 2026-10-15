/*
 * HELLARA STUDIOS — Team West Grillvote
 * Concept, design & development: Jimmy Hellara
 * No tracking, no third-party analytics. 2026.
 */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const LS = { name:'hs-grillvote-name-v1', settings:'hs-grillvote-settings-v1', votes:'hs-grillvote-votes-v1' };
  const connection = window.HELLARA_CONFIG || {};
  const endpoint = String(connection.supabaseUrl || '').trim().replace(/\/+$/, '');
  const publicKey = String(connection.supabaseAnonKey || '').trim();
  const online = Boolean(endpoint && publicKey);
  const state = { server:null, choices:[], name:localStorage.getItem(LS.name)||'', mySavedVote:[], loading:false, connected:!online, pendingSubmission:false, polling:null };
  const monthNames = ['JAN','FEB','MRT','APR','MEI','JUN','JUL','AUG','SEP','OKT','NOV','DEC'];

  function safeJson(value, fallback) { try {return JSON.parse(value)} catch {return fallback} }
  function getNextThreeFridays() {
    const d=new Date();d.setHours(12,0,0,0);
    let diff=(5-d.getDay()+7)%7;
    // Keep at least a full week to organize: skip the immediate upcoming Friday.
    diff+=7;
    d.setDate(d.getDate()+diff);
    return [0,7,14].map(n=>{let x=new Date(d);x.setDate(x.getDate()+n);return [x.getFullYear(),String(x.getMonth()+1).padStart(2,'0'),String(x.getDate()).padStart(2,'0')].join('-')});
  }
  const defaults={dates:getNextThreeFridays(),roster:[],voting_open:true};
  const escapeHtml=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalizeName=(name)=>String(name||'').trim().replace(/\s+/g,' ').slice(0,60);
  const sameName=(a,b)=>normalizeName(a).toLocaleLowerCase('nl-BE')===normalizeName(b).toLocaleLowerCase('nl-BE');
  const dateObj=(s)=>new Date(`${s}T12:00:00`);
  const dateLabel=(s)=>dateObj(s).toLocaleDateString('nl-BE',{day:'numeric',month:'long',year:'numeric'});
  const monthLabel=(s)=>monthNames[Number(s.slice(5,7))-1]||'';
  const justDay=(s)=>String(Number(s.slice(8,10)));
  const dayWeek=(s)=>dateObj(s).toLocaleDateString('nl-BE',{weekday:'long'});
  const shortDate=(s)=>dateObj(s).toLocaleDateString('nl-BE',{day:'numeric',month:'long'});
  const allUnique=(arr)=>new Set(arr).size===arr.length;
  const validDate=(s)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(dateObj(s).getTime());
  const friday=(s)=>validDate(s)&&dateObj(s).getDay()===5;
  const readSettings=()=>{
    const val=safeJson(localStorage.getItem(LS.settings),null);
    return val && Array.isArray(val.dates)&&val.dates.length===3?val:defaults;
  };
  const readVotes=()=>{
    const votes=safeJson(localStorage.getItem(LS.votes),'[]');
    return Array.isArray(votes)?votes:[];
  };
  const writeVotes=(votes)=>localStorage.setItem(LS.votes,JSON.stringify(votes));

  function demoState(){
    const settings=readSettings();
    const ballots=readVotes();
    return {...settings,voted_names:ballots.map(b=>b.name).sort((a,b)=>a.localeCompare(b,'nl-BE')),total_votes:ballots.length,scoreboard:settings.dates.map(date=>{
      const first=ballots.filter(b=>b.ranked_dates?.[0]===date).length;
      const second=ballots.filter(b=>b.ranked_dates?.[1]===date).length;
      const third=ballots.filter(b=>b.ranked_dates?.[2]===date).length;
      return {date,points:first*3+second*2+third,first,second,third};
    })};
  }
  function errorMessage(e){
    const msg=String(e?.message||e||'Er is iets misgelopen.');
    if(msg.includes('invalid_admin_password'))return 'Het beheerwachtwoord is niet correct.';
    if(msg.includes('voting_closed'))return 'De stemming is intussen afgesloten.';
    if(msg.includes('reset_required'))return 'Bij gewijzigde datums moet je eerst stemmen resetten.';
    if(msg.includes('invalid_dates'))return 'Kies drie verschillende vrijdagen.';
    if(msg.includes('invalid_name'))return 'Vul je naam in (2 tot 60 tekens).';
    if(msg.includes('invalid_rank'))return 'Kies alle drie de vrijdagen, elk precies één keer.';
    if(msg.includes('Failed to fetch')||msg.includes('NetworkError'))return 'Geen verbinding met de stemserver. Probeer het straks opnieuw.';
    return msg.slice(0,190);
  }
  async function rpc(method,params={}){
    const res=await fetch(`${endpoint}/rest/v1/rpc/${method}`,{
      method:'POST',headers:{'apikey':publicKey,'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify(params),cache:'no-store'
    });
    let data=null;
    try{data=await res.json()}catch{}
    if(!res.ok)throw new Error(data?.message||`Serverfout ${res.status}`);
    return data;
  }
  const getModel=()=>state.server||demoState();
  const getScoreboard=()=>{
    const data=getModel();return [...(data.scoreboard||[])].sort((a,b)=>b.points-a.points||b.first-a.first||a.date.localeCompare(b.date));
  };
  function toast(msg){
    const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),3600);
  }
  function setStatus(id,msg,isSuccess=false){const el=$(id);el.textContent=msg;el.classList.toggle('success',isSuccess)}
  function setConnection(isConnected){
    state.connected=isConnected;
    document.body.classList.toggle('online',online&&isConnected);
    const label=online?(isConnected?'LIVE VERBONDEN':'VERBINDING VERBROKEN'):'LOKALE DEMO';
    $('connection-label').textContent=label;
    $('standings-mode').textContent=online?(isConnected?'LIVE STEMSTAND':'GEEN VERBINDING'):'LOKALE DEMO';
    $('admin-password-group').style.display=online?'block':'none';
    $('admin-caution').textContent=online?'Wijzig je de datums nadat er stemmen zijn uitgebracht, dan moeten bestaande stemmen worden gewist. Je bevestigt dat eerst.':'Dit is een demo: stemmen worden alleen op dit toestel opgeslagen. Koppel Supabase in config.js om stemmen van alle collega’s te delen.';
  }
  async function refresh(silent=false){
    if(!online){state.server=demoState();render();return}
    try{
      const data=await rpc('grillvote_state');
      if(!data||!Array.isArray(data.dates)||!Array.isArray(data.scoreboard))throw new Error('Stemserver antwoordde onverwacht.');
      state.server=data;setConnection(true);render();
    }catch(e){setConnection(false);render();if(!silent)toast(errorMessage(e))}
  }
  async function loadMyVote(){
    if(!state.name){state.choices=[];state.mySavedVote=[];renderVote();return}
    try{
      let saved=[];
      if(online){
        if(!state.connected)return;
        const data=await rpc('grillvote_my_vote',{p_name:state.name});
        saved=Array.isArray(data)?data:[];
      }else{
        saved=readVotes().find(b=>sameName(b.name,state.name))?.ranked_dates||[];
      }
      const dates=getModel().dates||[];
      saved=saved.filter(d=>dates.includes(d));
      state.mySavedVote=saved;
      state.choices=[...saved];
      renderVote();
    }catch(e){toast(errorMessage(e))}
  }
  function render(){renderVote();renderLeaderboard();renderAttendees()}
  function renderVote(){
    const model=getModel();
    const dates=model.dates||defaults.dates;
    state.choices=state.choices.filter(d=>dates.includes(d));
    $('header-profile-label').textContent=state.name||'Mijn naam';
    $('vote-name-badge').textContent=state.name?`VOOR ${state.name.toUpperCase()}`:'NOG NIET AANGEMELD';
    $('vote-title').textContent=state.name?`Jouw top 3, ${state.name.split(' ')[0]}?`:'Welke vrijdag past jou best?';
    $('vote-help').textContent=state.mySavedVote.length===3?'Je hebt al gestemd! Je kunt je keuze nog aanpassen en opnieuw bewaren.':'Tik op de datums in volgorde van jouw voorkeur. Eerste tik = jouw nummer 1.';
    const disabled=!model.voting_open||(online&&!state.connected)||state.loading;
    const rankEmoji=['','🥇','🥈','🥉'];
    $('date-options').innerHTML=dates.map(d=>{
      const rank=state.choices.indexOf(d)+1;
      return `<button class="date-option ${rank?'selected':''}" data-date="${escapeHtml(d)}" type="button" aria-pressed="${rank?'true':'false'}" ${disabled?'disabled':''}><span class="date-calendar"><span class="day">${justDay(d)}</span><span class="month">${monthLabel(d)}</span></span><span class="date-text"><b>Vrijdag ${shortDate(d)}</b><small>${rank?['','Mijn nummer 1 · 3 punten','Mijn nummer 2 · 2 punten','Mijn nummer 3 · 1 punt'][rank]:'Tik om deze vrijdag te kiezen'}</small></span><span class="date-rank" aria-label="${rank?`Keuze ${rank}`:'Nog niet gekozen'}">${rank||'+'}</span></button>`;
    }).join('');
    $('date-options').querySelectorAll('.date-option').forEach(el=>el.addEventListener('click',()=>selectDate(el.dataset.date)));
    $('vote-progress-text').textContent=model.voting_open?`${state.choices.length} van 3 gekozen`:'STEMMING AFGESLOTEN';
    document.querySelectorAll('.step').forEach((el,i)=>el.classList.toggle('active',i<state.choices.length));
    $('save-vote').disabled=disabled||state.choices.length!==3;
    $('save-vote').innerHTML=state.loading?'EVEN BEWAREN…':!model.voting_open?'STEMMING AFGESLOTEN':state.mySavedVote.length?'KEUZE BIJWERKEN <span>→</span>':'STEM BEVESTIGEN <span>→</span>';
    $('clear-choices').disabled=disabled;
  }
  function selectDate(date){
    const already=state.choices.indexOf(date);
    if(already>=0){state.choices=state.choices.filter(d=>d!==date)}
    else if(state.choices.length<3){state.choices.push(date)}
    else{toast('Alle drie gekozen? Tik een datum aan om die keuze weg te halen.');return}
    setStatus('vote-status','');renderVote();
  }
  function renderLeaderboard(){
    const model=getModel(),scores=getScoreboard(),total=Number(model.total_votes)||0;
    const first=scores[0],second=scores[1];
    const tie=total>0&&second&&first.points===second.points&&first.first===second.first;
    if(total===0){$('leader-content').innerHTML='<p class="muted">Nog geen stemmen. Wie legt de eerste vrijdag op de grill?</p>';
      $('leader-note').textContent='Elke stem kan het verschil maken.';
    }else if(tie){
      $('leader-content').innerHTML=`<span class="winning-small">SPANNEND!</span><div class="winning-day">GELIJKSPEL.</div><div class="winning-date">${escapeHtml(scores.filter(s=>s.points===first.points&&s.first===first.first).map(s=>shortDate(s.date)).join(' · '))}</div><div class="winning-score"><strong>${first.points}</strong> punten per datum</div>`;
      $('leader-note').textContent='Extra stemmen kunnen het verschil maken.';
    }else{
      $('leader-content').innerHTML=`<span class="winning-small">DE KOPLOPER</span><div class="winning-day">VRIJDAG ${justDay(first.date)}<br/>${monthLabel(first.date)}</div><div class="winning-date">${escapeHtml(dateLabel(first.date))}</div><div class="winning-score"><strong>${first.points}</strong> punten · ${first.first} eerste keuze${first.first===1?'':'s'}</div>`;
      $('leader-note').textContent=model.voting_open?'Nog niet definitief — stemmen kan nog!':'Stemming gesloten — check de definitieve stand.';
    }
    const max=Math.max(1,...scores.map(s=>s.points));
    $('leaderboard-list').innerHTML=scores.map((entry,i)=>`<div class="board-date"><div class="board-date-top"><span class="board-rank ${i===0&&total?'top':''}">${String(i+1).padStart(2,'0')}</span><span class="board-name">Vrijdag ${escapeHtml(shortDate(entry.date))}<small>${entry.first} × 1e keuze · ${entry.second} × 2e · ${entry.third} × 3e</small></span><span class="board-score">${entry.points} <small>PT.</small></span></div><div class="bar-track"><div class="bar-fill" style="width:${Math.round((entry.points/max)*100)}%"></div></div></div>`).join('');
  }
  function renderAttendees(){
    const model=getModel();
    const voted=Array.isArray(model.voted_names)?model.voted_names:[];
    const roster=Array.isArray(model.roster)?model.roster:[];
    const people=[...roster];
    voted.forEach(name=>{if(!people.some(x=>sameName(x,name)))people.push(name)});
    const sorted=people.sort((a,b)=>{
      const av=voted.some(n=>sameName(n,a)),bv=voted.some(n=>sameName(n,b));
      return Number(bv)-Number(av)||a.localeCompare(b,'nl-BE');
    });
    $('attendee-count').textContent=voted.length;
    $('roster-tally').textContent=roster.length?`${voted.length} GESTEMD · ${sorted.filter(n=>!voted.some(v=>sameName(v,n))).length} NOG TE GAAN`:voted.length?`${voted.length} COLLEGA’S HEBBEN GESTEMD`:'NOG GEEN STEMMEN';
    $('attendee-list').innerHTML=sorted.length?sorted.map(name=>{
      const yes=voted.some(x=>sameName(x,name));
      return `<span class="attendee ${yes?'':'pending'}"><span class="check">${yes?'✓':'◌'}</span>${escapeHtml(name)}${sameName(name,state.name)?' · jij':''}</span>`;
    }).join(''):`<p class="empty-attendees">Nog geen namen te zien. Zodra er iemand heeft gestemd, verschijnt die hier.${online?'':' Dit is voorlopig alleen zichtbaar op dit toestel.'}</p>`;
  }
  function openModal(id){$(id).classList.add('open');$(id).setAttribute('aria-hidden','false');document.body.style.overflow='hidden';const input=$(id).querySelector('input:not([type=checkbox])');if(input)setTimeout(()=>input.focus(),25)}
  function closeModal(id){$(id).classList.remove('open');$(id).setAttribute('aria-hidden','true');document.body.style.overflow='';}
  async function submitVote(){
    const model=getModel();
    if(!model.voting_open){toast('De stemming is afgesloten.');return}
    if(state.choices.length!==3){toast('Kies eerst jouw drie vrijdagen.');return}
    if(!state.name){state.pendingSubmission=true;openModal('login-modal');return}
    if(online&&!state.connected){toast('Geen verbinding met de stemserver.');return}
    state.loading=true;renderVote();setStatus('vote-status','');
    try{
      if(online){await rpc('grillvote_submit',{p_name:state.name,p_ranked_dates:state.choices})}
      else{
        const votes=readVotes().filter(v=>!sameName(v.name,state.name));
        votes.push({name:state.name,ranked_dates:[...state.choices]});writeVotes(votes);
      }
      state.mySavedVote=[...state.choices];
      await refresh(true);
      setStatus('vote-status',`Yes, ${state.name.split(' ')[0]}! Jouw top 3 is opgeslagen. 🔥`,true);
      toast('Jouw top 3 staat op de grill. 🔥');
    }catch(e){setStatus('vote-status',errorMessage(e),false)}
    finally{state.loading=false;renderVote()}
  }
  function localNameSubmit(name){
    const normalized=normalizeName(name);
    if(normalized.length<2){toast('Vul minstens twee tekens in.');return}
    state.name=normalized;localStorage.setItem(LS.name,normalized);
    closeModal('login-modal');render();
    const pending=state.pendingSubmission;
    const pendingChoices=[...state.choices];
    state.pendingSubmission=false;
    loadMyVote().then(()=>{
      if(pending){
        // Preserve the choices made before entering a name.
        state.choices=pendingChoices;renderVote();
        if(state.choices.length===3)submitVote();else toast('Welkom! Kies nu jouw drie vrijdagen.');
      }
    });
  }
  function openAdmin(){
    const model=getModel();
    [1,2,3].forEach((i)=>$(`admin-date-${i}`).value=model.dates?.[i-1]||defaults.dates[i-1]);
    $('team-roster').value=(model.roster||[]).join('\n');
    $('voting-open').checked=model.voting_open!==false;
    setStatus('admin-status','');openModal('admin-modal');
  }
  async function saveAdmin(e){
    e.preventDefault();
    const dates=[1,2,3].map(i=>$(`admin-date-${i}`).value);
    if(!dates.every(friday)||!allUnique(dates)){setStatus('admin-status','Kies drie verschillende datums die allemaal op vrijdag vallen.');return}
    const roster=[...new Map($('team-roster').value.split(/\r?\n/).map(normalizeName).filter(Boolean).map(x=>[x.toLocaleLowerCase('nl-BE'),x])).values()];
    if(roster.length>100){setStatus('admin-status','Maximaal 100 namen in de teamlijst.');return}
    const isOpen=$('voting-open').checked,model=getModel();
    const changed=dates.some((d,i)=>d!==model.dates[i]);
    let reset=false;
    if(changed&&model.total_votes>0){
      if(!window.confirm('LET OP: je verandert een of meer vrijdagen. Alle bestaande stemmen zullen onherroepelijk gewist worden. Doorgaan?'))return;
      reset=true;
    }
    $('admin-save').disabled=true;setStatus('admin-status','');
    try{
      if(online){
        if(!state.connected)throw new Error('Failed to fetch');
        const code=$('admin-password').value;
        if(!code)throw new Error('Vul het beheerwachtwoord in.');
        await rpc('grillvote_admin_save',{p_admin_password:code,p_dates:dates,p_roster:roster,p_voting_open:isOpen,p_reset_votes:reset});
      }else{
        localStorage.setItem(LS.settings,JSON.stringify({dates,roster,voting_open:isOpen}));
        if(changed)writeVotes([]);
      }
      if(changed){state.choices=[];state.mySavedVote=[]}
      await refresh(true);
      closeModal('admin-modal');toast('De instellingen zijn bewaard. ✦');
      if(changed)await loadMyVote();
    }catch(error){setStatus('admin-status',errorMessage(error))}
    finally{$('admin-save').disabled=false}
  }
  function exportCsv(){
    const model=getModel(),scores=getScoreboard();
    const roster=model.roster||[],voted=model.voted_names||[];
    const people=[...roster];voted.forEach(n=>{if(!people.some(x=>sameName(x,n)))people.push(n)});
    const quote=(s)=>'"'+String(s??'').replace(/"/g,'""')+'"';
    const lines=[['Naam','Status'].map(quote).join(';'),...people.map(n=>[quote(n),quote(voted.some(v=>sameName(v,n))?'Gestemd':'Nog niet gestemd')].join(';')),'',[quote('Datum'),quote('Punten'),quote('Eerste keuzes'),quote('Tweede keuzes'),quote('Derde keuzes')].join(';'),...scores.map(s=>[quote(dateLabel(s.date)),s.points,s.first,s.second,s.third].join(';'))];
    const data='\uFEFF'+lines.join('\r\n');const link=document.createElement('a');const url=URL.createObjectURL(new Blob([data],{type:'text/csv;charset=utf-8;'}));
    link.href=url;link.download='hellara-studios-team-west-stemmen.csv';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function bind(){
    $('header-profile').addEventListener('click',()=>{state.pendingSubmission=false;$('name-input').value=state.name;openModal('login-modal')});
    $('login-close').addEventListener('click',()=>{state.pendingSubmission=false;closeModal('login-modal')});
    $('login-form').addEventListener('submit',e=>{e.preventDefault();localNameSubmit($('name-input').value)});
    $('save-vote').addEventListener('click',submitVote);
    $('clear-choices').addEventListener('click',()=>{state.choices=[];setStatus('vote-status','');renderVote()});
    $('admin-launch').addEventListener('click',openAdmin);
    $('admin-close').addEventListener('click',()=>closeModal('admin-modal'));
    $('admin-form').addEventListener('submit',saveAdmin);
    $('export-csv').addEventListener('click',exportCsv);
    ['login-modal','admin-modal'].forEach(id=>$(id).addEventListener('click',e=>{if(e.target===$(id)){if(id==='login-modal')state.pendingSubmission=false;closeModal(id)}}));
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal('admin-modal');closeModal('login-modal');state.pendingSubmission=false}});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&online)refresh(true)});
  }
  async function start(){
    bind();setConnection(!online);
    if(!online){state.server=demoState();render();await loadMyVote();return}
    state.connected=false;render();
    await refresh(false);
    if(state.connected)await loadMyVote();
    state.polling=setInterval(()=>{if(!document.hidden)refresh(true)},10000);
  }
  start();
})();
