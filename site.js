/* CSG Sports Fest 2026: fixtures, teams, results and player search, all read from data.json.
   Shared winner and standings logic lives in core.js (window.Fest). */
const BASE = "https://shrikantfte-coder.github.io/csg-sports-fest-2026/";
const SPORTS = [
  {id:"table-tennis", key:"tt", list:"tt", name:"Table Tennis", c:"--tt"},
  {id:"carrom", key:"carrom", list:"carrom", name:"Carrom", c:"--carrom"},
  {id:"chess", key:"chess", list:"chess", name:"Chess", c:"--chess"},
  {id:"cricket", key:"cricket", list:"cricketFixtures", name:"Cricket", c:"--cricket"},
  {id:"volleyball", key:"volleyball", list:"volleyballFixtures", name:"Volleyball", c:"--volley"},
];
const OFFICE = "CSG Office premises";
const CRICKET_MAP = "https://maps.app.goo.gl/8DuRAhPuMddGuS2p8";
const VOLLEY_MAP = "https://maps.app.goo.gl/tTLeYtSKwnfJVtUPA";
const TT_EVENTS = {MS:"Men's Singles", WS:"Women's Singles", MD:"Men's Doubles", WD:"Women's Doubles"};
const CARROM_ROUNDS = {R1:"Round 1", R2:"Round 2", R3:"Round 3", RR:"Round Robin", FINAL:"Final"};
const TROPHY = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const pad = n => String(n).padStart(2,"0");
const todayISO = (()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`})();
const fmtDay = iso => { if(!iso) return "Date to be set"; const d=new Date(iso+"T12:00:00"); return isNaN(d) ? iso : d.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"}); };
const norm = Fest.norm, isTBD = Fest.isTBD;
const titleCase = s => String(s ?? "").replace(/(^|\s)([a-z])/g, (m,p,c)=>p+c.toUpperCase());
const sportBy = k => SPORTS.find(s=>s.key===k||s.id===k||s.list===k);
const pageURL = id => BASE + (id ? "#"+id : "");
const toMin = t => { const m=/(\d+):(\d+)\s*(AM|PM)?/i.exec(t||""); if(!m) return 0; let h=+m[1]%12; if(!m[3]||m[3].toUpperCase()==="PM") h+=12; return h*60+ +m[2]; };
const byTime = (x,y) => (x.date||"").localeCompare(y.date||"") || toMin(x.time)-toMin(y.time);
const slotStart = s => { const t = String(s||"").split(/[–-]/)[0].trim(); return /AM|PM/i.test(t) ? t : `${t} ${/AM/i.test(s||"")?"AM":"PM"}`; };
const decided = m => Fest.decided(m);
const fmtPts = v => Number.isInteger(v) ? String(v) : `${Math.floor(v)||""}½`;

let D = null, R = null, MATCHES = [], PEOPLE = [], filter = {};

/* ---------- Matches, with "Winner of" slots filled in ---------- */
function buildMatches(){
  R = Fest.resolve(D);
  const L = R.lists;
  MATCHES = [];
  const push = (r, o) => MATCHES.push({date:r.date, a:r.A, b:r.B, A:r.A, B:r.B, winner:r.winner, result:r.result, ...o});
  L.tt.forEach(r => { const stage = r.stage || "League"; push(r, {sport:"tt", time:r.start, end:r.end, id:r.id, tag:r.event, stage, ref:r.ref, label:(TT_EVENTS[r.event]||r.event)+(stage!=="League"?` · ${stage}`:"")}); });
  L.carrom.forEach(r => push(r, {sport:"carrom", time:r.time, id:r.id, tag:r.round, label:CARROM_ROUNDS[r.round]||r.round}));
  L.chess.forEach(r => push(r, {sport:"chess", time:slotStart(r.slot), slot:r.slot, id:r.no?`#${r.no}`:"", tag:r.group?`Grp ${r.group}`:(r.round||""), group:r.group, round:r.round, board:r.board,
    label: r.group ? `Group ${r.group} · ${r.round} · Board ${r.board}` : (r.b ? `${r.round||"Knock-out"}${r.board?` · Board ${r.board}`:""}` : "Tie-breaks")}));
  [["cricket","cricketFixtures"],["volleyball","volleyballFixtures"]].forEach(([k,f]) => L[f].forEach(r => push(r, {sport:k, time:r.time, id:r.id, tag:r.stage, stage:r.stage, label:r.stage})));
  MATCHES.sort(byTime);
}

/* ---------- Rendering helpers ---------- */
function hl(text, q){
  if(!q) return esc(text);
  return String(text).split(/(\s+)/).map(w => { const n = norm(w); return (w.trim() && n && (n.includes(q) || (q.includes(n) && n.length>2))) ? `<mark>${esc(w)}</mark>` : esc(w); }).join("");
}
function sideHTML(m, s, q){
  const n = m[s];
  if(isTBD(n)) return `<span class="tbd">${esc(n)}</span>`;
  const d = decided(m), won = d && m.winner===s, lost = d && m.winner!=="draw" && m.winner!==s;
  return `<span class="${won?"won":lost?"lost":""}">${hl(n,q)}${won?' <b class="wtag">Won</b>':""}</span>`;
}
function sideOf(p, m){
  for(const s of ["a","b"]){ const k = norm(m[s]); if(k && (p.key===k || p.teams.has(`${m.sport}:${k}`))) return s; }
  return null;
}
function matchRow(m, q, opts={}){
  const sp = sportBy(m.sport);
  const when = opts.withDate ? `${esc(m.time)}<small>${fmtDay(m.date)}</small>` : `${esc(m.time)}${m.end?`<small>to ${esc(m.end)}</small>`:""}`;
  const vs = m.b ? `${sideHTML(m,"a",q)}<i>vs</i>${sideHTML(m,"b",q)}${decided(m)&&m.winner==="draw"?' <b class="dtag">Draw</b>':""}` : `<span class="tbd">${esc(m.a)}</span>`;
  const tag = opts.withSport ? sp.name : m.tag;
  const stage = m.sport==="tt" && m.stage && m.stage!=="League" ? ` · ${esc(m.stage)}` : "";
  const sub = opts.withSport ? `${esc(m.label||"")}${m.id?" · "+esc(m.id):""}` : `${esc(m.id)}${stage}${m.board?(/^\d/.test(m.board)?` · Board ${esc(m.board)}`:` · ${esc(m.board)}`):""}`;
  let out = "";
  if(opts.person && !opts.asRef && decided(m)){
    const s = sideOf(opts.person, m);
    if(s) out = m.winner==="draw" ? "draw" : m.winner===s ? "won" : "lost";
  }
  const outTag = out ? `<span class="out ${out}">${out==="won"?"Won":out==="lost"?"Lost":"Draw"}</span><br>` : "";
  const extra = (m.ref ? `<div class="ref">Referee: ${hl(m.ref,q)}</div>` : "") + (m.result ? `<div class="ref res-line">Result: <b>${esc(m.result)}</b></div>` : "");
  return `<div class="m" style="--accent:var(${sp.c})"><div class="t">${when}</div><div class="vs">${opts.asRef?"<i>Referee:</i> ":""}${vs}</div><div class="meta">${outTag}${tag?`<span class="tag">${esc(tag)}</span><br>`:""}${sub}</div>${extra}</div>`;
}
function dayBlocks(list, {slots=false}={}){
  const days = {};
  list.forEach(m => (days[m.date||""] ||= []).push(m));
  return Object.keys(days).sort().map(d => {
    const ms = days[d], today = d===todayISO, past = d && d<todayISO, played = ms.filter(decided).length;
    let body = "", last = null;
    ms.forEach(m => { if(slots && m.slot!==last){ body += `<div class="slot">${esc(m.slot)}</div>`; last = m.slot; } body += matchRow(m); });
    const status = today ? '<span class="badge">Today</span>' : past ? '<span class="done">Played</span>' : "";
    return `<section class="day${today?" is-today":""}"><div class="day-h"><span class="d">${fmtDay(d)}</span>${status}<span class="n">${ms.length} ${ms.length===1?"match":"matches"}${played?` · ${played} ${played===1?"result":"results"}`:""}</span></div>${body}</section>`;
  }).join("");
}
function standings(rows, {cols=["p","w","l"], top=0, label="Player", heads={}, show=titleCase}={}){
  const H = {p:"P", w:"W", d:"D", l:"L", pts:"Pts", ...heads};
  return `<div class="tblwrap"><table class="st"><thead><tr><th class="pos">#</th><th class="nm">${label}</th>${cols.map(c=>`<th>${H[c]}</th>`).join("")}</tr></thead><tbody>${rows.map((r,i)=>`<tr${i<top?' class="q"':""}><td class="pos">${i+1}</td><td class="nm">${esc(show(r.name))}</td>${cols.map(c=>`<td>${fmtPts(r[c])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}
function champs(list){
  return R.champions.filter(c=>c.key===list).map(c=>`<div class="champ">${TROPHY}<div><span>Champion${c.event?` · ${esc(TT_EVENTS[c.event]||c.event)}`:""}</span><b>${esc(titleCase(c.name))}</b></div></div>`).join("");
}
function fact(label, html){ return `<div class="fact"><b>${label}</b>${html}</div>`; }
function mapLink(url, text="Open in Google Maps"){ return `<a href="${url}" target="_blank" rel="noopener">${text} ↗</a>`; }
function qrBlock(id, name){
  const url = pageURL(id);
  return `<section class="mine"><div class="code"><img src="qr/qr-${id||"all"}.png" alt="QR code for the ${esc(name)} page" width="130" height="130"></div><div><h3>Share this page</h3><p>${esc(url)}</p><button class="copy" type="button" data-copy="${esc(url)}">Copy link</button></div></section>`;
}
function dateRange(sport){
  const ds = MATCHES.filter(m=>m.sport===sport && m.date).map(m=>m.date).sort();
  if(!ds.length) return "To be announced";
  return ds[0]===ds[ds.length-1] ? fmtDay(ds[0]) : `${fmtDay(ds[0])} – ${fmtDay(ds[ds.length-1])}`;
}

/* ---------- Sport views ---------- */
function viewTT(){
  const ev = filter.tt || "all";
  const all = MATCHES.filter(m=>m.sport==="tt");
  const list = all.filter(m=>ev==="all"||m.tag===ev);
  const chips = ["all","MS","WS","MD","WD"].map(k=>`<button class="chip" data-f="tt" data-v="${k}" aria-pressed="${ev===k}">${k==="all"?"All events":TT_EVENTS[k]}</button>`).join("");
  const players = {};
  D.tt.forEach(r => [r.a,r.b].forEach(p => { if(p && !isTBD(p)) (players[r.event] ||= new Set()).add(p); }));
  const teams = ["MS","WS","MD","WD"].filter(k=>players[k]).map(k=>`<div class="team"><h4>${TT_EVENTS[k]}<small>${players[k].size} ${k.endsWith("D")?"pairs":"players"}</small></h4><ul>${[...players[k]].sort((a,b)=>a.localeCompare(b)).map(p=>`<li>${esc(p)}</li>`).join("")}</ul></div>`).join("");
  let table = "";
  if(all.some(decided)){
    table = ["MS","WS","MD","WD"].map(k => {
      const league = all.filter(m=>m.tag===k && m.stage==="League");
      if(!league.some(decided)) return "";
      const ps = Fest.pools(league);
      return ps.map((pm,i)=>`<div class="team"><h4>${TT_EVENTS[k]}${ps.length>1?`<small>Pool ${i+1}</small>`:""}</h4>${standings(Fest.table(pm,[],Fest.POINTS.tt),{label:k.endsWith("D")?"Pair":"Player", show:s=>s})}</div>`).join("");
    }).join("");
  }
  return `
  <div class="hero"><div class="eyebrow">League stage · ${all.length} matches</div><h2>Table Tennis</h2>${champs("tt")}
    <div class="facts">${fact("Venue",OFFICE)}${fact("Dates",dateRange("tt"))}${fact("Time","From 5:30 PM, 5 to 15 min matches")}${fact("Events","Men's &amp; Women's Singles and Doubles")}</div></div>
  <section class="sec"><div class="sec-h"><h3>Fixtures</h3><span>Knock-out fixtures will be added after the league</span></div><div class="chips">${chips}</div>${dayBlocks(list)}</section>
  ${table?`<section class="sec"><div class="sec-h"><h3>League standings</h3><span>Wins so far. Players who meet each other are shown as one pool.</span></div><div class="grid">${table}</div></section>`:""}
  <section class="sec"><div class="sec-h"><h3>Players &amp; pairs</h3></div><div class="grid">${teams}</div></section>
  ${qrBlock("table-tennis","Table Tennis")}`;
}
function viewCarrom(){
  const rd = filter.carrom || "all";
  const all = MATCHES.filter(m=>m.sport==="carrom");
  const list = all.filter(m=>rd==="all"||m.tag===rd);
  const chips = ["all","R1","R2","R3","RR","FINAL"].map(k=>`<button class="chip" data-f="carrom" data-v="${k}" aria-pressed="${rd===k}">${k==="all"?"All rounds":CARROM_ROUNDS[k]}</button>`).join("");
  const teams = D.carromTeams.map(t=>`<div><b>${pad(t.no)}</b><span>${esc(t.name)}</span><em>${esc(t.r1)}</em></div>`).join("");
  const rr = R.rr && R.rr.any ? `<section class="sec"><div class="sec-h"><h3>Round robin table</h3><span>Win = 2 points. The top 2 play the final.</span></div><div class="team">${standings(R.rr.rows,{cols:["p","w","l","pts"], top:R.rr.settled?2:0, label:"Team", show:s=>s})}</div></section>` : "";
  return `
  <div class="hero"><div class="eyebrow">${D.carromTeams.length} doubles teams · ${all.length} matches</div><h2>Carrom</h2>${champs("carrom")}
    <div class="facts">${fact("Venue",OFFICE+", 2 boards")}${fact("Dates",dateRange("carrom")+", Mon to Fri")}${fact("Time","5:00 – 7:00 PM, 30 min matches")}${fact("Final","Wed 9 Dec, 5:00 PM")}</div>
    <div class="note">Round 1 (40 → 20), Round 2 (20 → 10), Round 3 (10 → 5), then the 5 winners play a round robin (win = 2 points). The top 2 play the final. A team wins when all its coins are pocketed.</div></div>
  <section class="sec"><div class="sec-h"><h3>Fixtures</h3><span>“Winner of Mxx” changes to the team name once the result is in</span></div><div class="chips">${chips}</div>${dayBlocks(list)}</section>
  ${rr}
  <section class="sec"><div class="sec-h"><h3>Teams</h3><span>Team number · name · Round 1 match</span></div><div class="ct">${teams}</div></section>
  ${qrBlock("carrom","Carrom")}`;
}
function viewChess(){
  const g = filter.chess || "all";
  const all = MATCHES.filter(m=>m.sport==="chess");
  const list = all.filter(m=>g==="all"||m.group===g||!m.group);
  const chips = ["all",...Object.keys(D.chessGroups)].map(k=>`<button class="chip" data-f="chess" data-v="${k}" aria-pressed="${g===k}">${k==="all"?"All groups":"Group "+k}</button>`).join("");
  const groups = Object.entries(D.chessGroups).map(([k,ps])=>{
    const gm = all.filter(m=>m.group===k && m.b);
    const complete = gm.length>0 && gm.every(decided);
    return `<div class="team"><h4>Group ${k}<small>${ps.length} players</small></h4>${standings(Fest.table(gm,ps,Fest.POINTS.chess),{cols:["p","w","d","l","pts"], top:complete?2:0})}<div class="plays">Plays ${esc(D.chessPlays[k]||"")}${complete?" · Highlighted players qualify":""}</div></div>`;
  }).join("");
  const players = Object.values(D.chessGroups).reduce((n,ps)=>n+ps.length,0);
  return `
  <div class="hero"><div class="eyebrow">League stage · ${players} players · ${Object.keys(D.chessGroups).length} groups</div><h2>Chess</h2>${champs("chess")}
    <div class="facts">${fact("Venue",OFFICE+", 4 boards")}${fact("Dates",dateRange("chess"))}${fact("Time","4:00 – 6:30 PM")}${fact("Time control","15 min per player")}</div>
    <div class="note">One game per player per day. Win 1, draw ½, loss 0. Top 2 from each group (16 players) go to the knock-out, which will be shared after the league. Ties: head-to-head, then wins, then a 5 min blitz playoff on Thu 26 Nov at 6:00 PM. Both players sign the result sheet and post the result in the WhatsApp group.</div></div>
  <section class="sec"><div class="sec-h"><h3>Fixtures</h3><span>Games start at 4:00, 4:40, 5:20 and 6:00 PM</span></div><div class="chips">${chips}</div>${dayBlocks(list,{slots:true})}</section>
  <section class="sec"><div class="sec-h"><h3>Groups &amp; standings</h3><span>Points: win 1, draw ½. Top 2 in each group qualify.</span></div><div class="grid">${groups}</div></section>
  ${qrBlock("chess","Chess")}`;
}
function teamSportBody(sport, list, teamsHTML, teamNames){
  const all = MATCHES.filter(m=>m.sport===sport);
  if(!all.length) return `<div class="soon"><h3>Fixtures coming soon</h3><p>Match dates and times will be posted here once they are ready.</p></div>${teamsHTML}`;
  const league = all.filter(m=>!Fest.isKnockout(list,{stage:m.stage}));
  const table = league.some(decided) ? `<section class="sec"><div class="sec-h"><h3>Points table</h3><span>${sport==="cricket"?"Win 2, tie 1":"Wins so far"}</span></div><div class="team">${standings(Fest.table(league,teamNames,Fest.POINTS[list]),{cols:sport==="cricket"?["p","w","d","l","pts"]:["p","w","l"], heads:{d:"T"}, label:"Team", show:s=>s})}</div></section>` : "";
  return `<section class="sec"><div class="sec-h"><h3>Fixtures</h3><span>${all.length} matches</span></div>${dayBlocks(all)}</section>${table}${teamsHTML}`;
}
function viewCricket(){
  const teams = `<section class="sec"><div class="sec-h"><h3>Teams</h3><span>From the player auction</span></div><div class="grid">${D.cricket.map(t=>`<div class="team"><h4>${esc(t.name)}<small>${t.players.length} players</small></h4><ol>${t.players.map(p=>`<li>${esc(p)}</li>`).join("")}</ol></div>`).join("")}</div></section>`;
  return `
  <div class="hero"><div class="eyebrow">${D.cricket.length} teams</div><h2>Cricket</h2>${champs("cricketFixtures")}
    <div class="facts">${fact("Venue",`Invictus Sports Arena<br><span style="color:var(--muted);font-size:.9rem">#118 Chikkabanavara, North, Hesarghatta Rd, Chikkabanavara, Karnataka 560090</span><br>${mapLink(CRICKET_MAP)}`)}${fact("Dates",dateRange("cricket"))}</div></div>
  ${teamSportBody("cricket","cricketFixtures",teams,D.cricket.map(t=>t.name))}
  ${qrBlock("cricket","Cricket")}`;
}
function viewVolley(){
  const teams = `<section class="sec"><div class="sec-h"><h3>Teams</h3><span>Playing position shown where the player listed one</span></div><div class="grid">${D.volleyball.map(t=>`<div class="team"><h4>${esc(t.name)}<small>${t.players.length} players</small></h4><ol>${t.players.map(([p,r])=>`<li>${esc(p)}${r?` <span>· ${esc(r)}</span>`:""}</li>`).join("")}</ol></div>`).join("")}</div></section>`;
  return `
  <div class="hero"><div class="eyebrow">CSG Volleyball League · ${D.volleyball.length} teams</div><h2>Volleyball</h2>${champs("volleyballFixtures")}
    <div class="facts">${fact("Venue",`Volleyball ground<br>${mapLink(VOLLEY_MAP)}`)}${fact("Dates",dateRange("volleyball"))}</div></div>
  ${teamSportBody("volleyball","volleyballFixtures",teams,D.volleyball.map(t=>t.name))}
  ${qrBlock("volleyball","Volleyball")}`;
}
function viewAll(){
  const upcoming = MATCHES.filter(m=>m.date && m.date>=todayISO);
  const nextDay = upcoming.length ? upcoming[0].date : null;
  const dayList = nextDay ? upcoming.filter(m=>m.date===nextDay) : [];
  const recent = MATCHES.filter(decided).sort((x,y)=>byTime(y,x)).slice(0,8);
  const timing = {tt:"from 5:30 PM", carrom:"5:00 – 7:00 PM", chess:"4:00 – 6:30 PM"};
  const venue = {tt:OFFICE, carrom:OFFICE, chess:OFFICE, cricket:"Invictus Sports Arena, Hesarghatta Rd", volleyball:"Volleyball ground"};
  const cards = SPORTS.map(s=>{
    const ms = MATCHES.filter(m=>m.sport===s.key), done = ms.filter(decided).length;
    const champ = R.champions.filter(c=>c.key===s.list).map(c=>`<span class="champ-line">${TROPHY}${c.event?esc(c.event)+": ":""}${esc(titleCase(c.name))}</span>`).join("");
    const count = s.key==="chess" ? `${Object.values(D.chessGroups).reduce((n,p)=>n+p.length,0)} players` : s.key==="carrom" ? `${D.carromTeams.length} teams` : s.key==="cricket" ? `${D.cricket.length} teams` : s.key==="volleyball" ? `${D.volleyball.length} teams` : "";
    const st = !ms.length ? "Fixtures coming soon" : done===ms.length ? "Completed" : done ? `${done} of ${ms.length} results in` : "Fixtures out";
    const when = ms.length ? `${dateRange(s.key)}${timing[s.key]?" · "+timing[s.key]:""}` : "Dates to be announced";
    return `<a class="card" href="#${s.id}" style="--c:var(${s.c})"><span class="st">${st}</span><h3>${s.name}</h3>${champ}<p>${when}<br>${venue[s.key]}<br>${[count, ms.length?`${ms.length} matches`:""].filter(Boolean).join(" · ")}</p><span class="go">View ${ms.length?"fixtures":"teams & venue"} →</span></a>`;
  }).join("");
  const qrs = [{id:"",name:"All sports",c:"--all"},...SPORTS].map(s=>`<div class="qr" style="--c:var(${s.c})"><div class="code"><img src="qr/qr-${s.id||"all"}.png" alt="QR code for ${esc(s.name)}" width="150" height="150"></div><b>${s.name}</b><button class="copy" type="button" data-copy="${esc(pageURL(s.id))}">Copy link</button></div>`).join("");
  const nextTitle = nextDay===todayISO ? "Today's matches" : nextDay ? `Next match day · ${fmtDay(nextDay)}` : "All matches played";
  const nextBody = dayList.length ? `<section class="day${nextDay===todayISO?" is-today":""}">${dayList.map(m=>matchRow(m,"",{withSport:true})).join("")}</section>` : `<div class="note">No more scheduled matches. Check each sport for results.</div>`;
  return `
  <div class="intro"><h2>Sports Fest 2026</h2><p>Fixtures, results, teams and venues for every sport. Type your name in the search box above to see all your games and timings.</p></div>
  <div class="sports">${cards}</div>
  <section class="sec" style="--accent:var(--today)"><div class="sec-h"><h3>${nextTitle}</h3><span>${dayList.length} matches across sports</span></div>${nextBody}</section>
  ${recent.length?`<section class="sec"><div class="sec-h"><h3>Latest results</h3><span>Most recent first</span></div><section class="day">${recent.map(m=>matchRow(m,"",{withSport:true,withDate:true})).join("")}</section></section>`:""}
  <section class="sec"><div class="sec-h"><h3>Scan to open</h3><span>QR codes for each sport page</span></div><div class="qrs">${qrs}</div></section>`;
}

/* ---------- Search ---------- */
function buildPeople(){
  const own = new Map(), team = new Map();
  const add = (name, role) => {
    const k = norm(name); if(!k || isTBD(name)) return null;
    if(!own.has(k)) own.set(k,{name:titleCase(name), key:k, roles:[], matches:[], teams:new Set()});
    const p = own.get(k); if(!p.roles.some(r=>r.text===role.text&&r.sport===role.sport)) p.roles.push(role);
    return p;
  };
  const member = (p, sport, teamName) => { if(!p) return; const tk = `${sport}:${norm(teamName)}`; p.teams.add(tk); if(!team.has(tk)) team.set(tk,[]); team.get(tk).push(p); };
  D.tt.forEach(r=>{
    const ev = TT_EVENTS[r.event]||r.event, dbl = String(r.event).endsWith("D");
    [r.a,r.b].forEach(n=>add(n,{sport:"tt",text:`Table Tennis · ${ev}${dbl?" (team)":""}`}));
    if(r.ref) add(r.ref,{sport:"tt",text:"Table Tennis · Referee"});
  });
  D.carromTeams.forEach(t=>add(t.name,{sport:"carrom",text:`Carrom · Team ${pad(t.no)}`}));
  Object.entries(D.chessGroups).forEach(([g,ps])=>ps.forEach(n=>add(n,{sport:"chess",text:`Chess · Group ${g}`})));
  D.cricket.forEach(t=>{ add(t.name,{sport:"cricket",text:"Cricket · Team"}); t.players.forEach(n=>member(add(n,{sport:"cricket",text:`Cricket · ${t.name}`}),"cricket",t.name)); });
  D.volleyball.forEach(t=>{ add(t.name,{sport:"volleyball",text:"Volleyball · Team"}); t.players.forEach(([n,r])=>member(add(n,{sport:"volleyball",text:`Volleyball · ${t.name}${r?" · "+r:""}`}),"volleyball",t.name)); });
  MATCHES.forEach(m=>{
    const found = new Set();
    if(m.b) [m.a,m.b].forEach(n=>{ if(!n || isTBD(n)) return; const k = norm(n); if(own.has(k)) found.add(own.get(k)); (team.get(`${m.sport}:${k}`)||[]).forEach(p=>found.add(p)); });
    found.forEach(p=>p.matches.push({m}));
    if(m.ref){ const p = own.get(norm(m.ref)); if(p && !found.has(p)) p.matches.push({m, asRef:true}); }
  });
  PEOPLE = [...own.values()];
}
function viewSearch(raw){
  const q = norm(raw);
  if(q.length<2) return `<div class="empty">Type at least 2 letters of a name or team.</div>`;
  const hits = PEOPLE.filter(p=>norm(p.name).includes(q)).sort((a,b)=>a.name.localeCompare(b.name));
  if(!hits.length) return `<div class="empty">No player or team matches “${esc(raw)}”.<br>Try part of the name, for example the first name only.</div>`;
  const cards = hits.slice(0,40).map(p=>{
    const roles = p.roles.map(r=>`<span class="role" style="--c:var(${sportBy(r.sport).c})">${esc(r.text)}</span>`).join("");
    const ms = p.matches.slice().sort((x,y)=>byTime(x.m,y.m));
    const soon = p.roles.some(r=>r.sport==="cricket"||r.sport==="volleyball") ? "Cricket and volleyball fixtures coming soon" : "No fixed match yet";
    const rows = ms.length ? ms.map(({m,asRef})=>matchRow(m,q,{withDate:true,withSport:true,person:p,asRef})).join("") : `<div class="m"><div class="t">—</div><div class="vs"><span class="tbd">${soon}</span></div></div>`;
    const w = ms.filter(({m,asRef})=>!asRef && decided(m) && m.winner!=="draw" && m.winner===sideOf(p,m)).length;
    return `<article class="person"><h4>${hl(p.name,q)}</h4><div class="roles">${roles}${w?`<span class="role" style="--c:var(--win)">${w} ${w===1?"win":"wins"}</span>`:""}</div>${rows}</article>`;
  }).join("");
  return `<div class="sec-h"><h3>Search results</h3><span>${hits.length} ${hits.length===1?"match":"matches"} for “${esc(raw)}”</span></div><div class="res">${cards}</div>`;
}

/* ---------- Router ---------- */
const VIEWS = {"":viewAll,"table-tennis":viewTT,carrom:viewCarrom,chess:viewChess,cricket:viewCricket,volleyball:viewVolley};
function current(){ const h = location.hash.replace("#",""); return h in VIEWS ? h : ""; }
function render(){
  if(!D) return;
  const id = current(), q = $("#q").value.trim(), sp = sportBy(id);
  document.documentElement.style.setProperty("--accent", `var(${sp?sp.c:"--all"})`);
  $("#tabs").innerHTML = [{id:"",name:"All sports",c:"--all"},...SPORTS].map(s=>`<a class="tab" href="#${s.id}" style="--c:var(${s.c})" ${s.id===id?'aria-current="page"':""}>${s.name}</a>`).join("");
  $("#clear").hidden = !q;
  $("#app").innerHTML = q ? viewSearch(q) : VIEWS[id]();
}
window.addEventListener("hashchange",()=>{ $("#q").value=""; render(); window.scrollTo(0,0); });
$("#q").addEventListener("input",render);
$("#clear").addEventListener("click",()=>{ $("#q").value=""; render(); $("#q").focus(); });
document.addEventListener("click",e=>{
  const c = e.target.closest("[data-f]");
  if(c){ filter[c.dataset.f]=c.dataset.v; render(); return; }
  const b = e.target.closest("[data-copy]");
  if(b){
    const done = ()=>{ b.textContent="Copied"; setTimeout(()=>b.textContent="Copy link",1500); };
    const fail = ()=>{ b.textContent="Copy failed, use the link above"; };
    try{ navigator.clipboard.writeText(b.dataset.copy).then(done,fail); }catch(_){ fail(); }
  }
  const a = e.target.closest("a.tab, a.card, .brand a");
  if(a && $("#q").value){ $("#q").value=""; setTimeout(render,0); }
});

/* ---------- Data loading (re-checked every 2 minutes so results appear without a refresh) ---------- */
let lastStamp = null;
async function load(){
  const r = await fetch("data.json?v="+Date.now(), {cache:"no-store"});
  if(!r.ok) throw new Error(r.status);
  return r.json();
}
function apply(data){
  D = data; lastStamp = data.updated || null;
  if(D.festDates) $("#festDates").textContent = D.festDates.replace(/\s*20\d\d$/,"");
  buildMatches(); buildPeople(); render();
  $("#updated").textContent = D.updated ? "Last updated " + new Date(D.updated).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"}) + " · " : "";
}
async function boot(){
  $("#app").innerHTML = `<div class="empty">Loading fixtures…</div>`;
  try{ apply(await load()); }
  catch(e){ $("#app").innerHTML = `<div class="empty">Could not load the fixtures. Check your connection and refresh the page.</div>`; return; }
  setInterval(async ()=>{
    if(document.hidden) return;
    try{ const d = await load(); if((d.updated||null)!==lastStamp) apply(d); }catch(_){}
  }, 120000);
}
boot();
