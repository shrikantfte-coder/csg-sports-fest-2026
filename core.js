/* Shared logic for the CSG Sports Fest site and the admin page.
   - Fills "Winner of M01" style slots from the winners already entered.
   - Fills "1st / 2nd in Round Robin" once the carrom round robin is complete.
   - Builds standings tables and finds champions from match winners.
   A match stores its winner as "a" (team/player 1), "b" (team/player 2) or "draw". */
window.Fest = (() => {
  const norm = s => String(s ?? "").toLowerCase().replace(/[^\p{L}\p{N}\p{M}]/gu, "").replace(/h/g, "");
  const isTBD = s => /^(winner of|loser of|1st in|2nd in|3rd in)\b/i.test(String(s ?? "").trim());
  const LISTS = ["tt", "carrom", "chess", "cricketFixtures", "volleyballFixtures"];
  const POINTS = {
    tt: { w: 1, d: 0, l: 0 },
    carrom: { w: 2, d: 1, l: 0 },
    chess: { w: 1, d: 0.5, l: 0 },
    cricketFixtures: { w: 2, d: 1, l: 0 },
    volleyballFixtures: { w: 1, d: 0, l: 0 },
  };
  const idOf = (key, r) => key === "chess" ? String(r.no ?? "") : String(r.id ?? "");
  const stageOf = (key, r) => String((key === "tt" ? (r.stage || "League") : key === "carrom" || key === "chess" ? r.round : r.stage) || "").trim();
  const isFinal = (key, r) => /^final$/i.test(stageOf(key, r));
  const isKnockout = (key, r) => /final|semi|quarter|knock|^r\d$|^sf$|^qf$/i.test(stageOf(key, r)) && !/^rr$|round robin/i.test(stageOf(key, r));
  const isRR = (key, r) => key === "carrom" && /^(rr|round robin)$/i.test(stageOf(key, r));
  const hasWinner = r => r.winner === "a" || r.winner === "b" || r.winner === "draw";

  // A match counts only when both sides are real names and a winner is set.
  const decided = m => hasWinner(m) && !!m.A && !!m.B && !isTBD(m.A) && !isTBD(m.B);

  function table(matches, participants = [], pts = { w: 1, d: 0.5, l: 0 }) {
    const rows = new Map();
    const row = n => {
      const k = norm(n);
      if (!rows.has(k)) rows.set(k, { name: n, p: 0, w: 0, d: 0, l: 0, pts: 0 });
      return rows.get(k);
    };
    participants.forEach(row);
    matches.forEach(m => {
      if (!m.A || !m.B || isTBD(m.A) || isTBD(m.B)) return;
      const a = row(m.A), b = row(m.B);
      if (!decided(m)) return;
      if (m.winner === "draw") { a.p++; b.p++; a.d++; b.d++; a.pts += pts.d; b.pts += pts.d; return; }
      const W = m.winner === "a" ? a : b, L = m.winner === "a" ? b : a;
      W.p++; L.p++; W.w++; L.l++; W.pts += pts.w; L.pts += pts.l;
    });
    return [...rows.values()].sort((x, y) => y.pts - x.pts || y.w - x.w || x.l - y.l || x.name.localeCompare(y.name));
  }

  function resolve(D) {
    const lists = {};
    let rr = null;
    LISTS.forEach(key => {
      const raw = D[key] || [];
      const byId = new Map(raw.map(r => [norm(idOf(key, r)), r]));
      let rrState = null, rrBusy = false;
      const rrTable = () => {
        if (rrState || rrBusy) return rrState;
        rrBusy = true;
        const ms = raw.filter(r => isRR(key, r)).map(r => ({ ...r, A: name(r.a), B: name(r.b) }));
        const known = ms.filter(m => !isTBD(m.A) && !isTBD(m.B));
        const rows = table(ms, [], POINTS[key]);
        const complete = ms.length > 0 && ms.every(decided);
        // 1st and 2nd are only filled in when nobody is level on points with 2nd place.
        const settled = complete && (rows.length < 3 || rows[1].pts > rows[2].pts);
        rrState = { rows, complete, settled, any: known.length > 0, matches: ms };
        rrBusy = false;
        return rrState;
      };
      function name(s, depth = 0) {
        s = String(s ?? "").trim();
        if (depth > 30) return s;
        let m = /^winner of\s+(.+)$/i.exec(s);
        if (m) {
          const r = byId.get(norm(m[1]));
          if (!r || (r.winner !== "a" && r.winner !== "b")) return s;
          const next = name(r[r.winner], depth + 1);
          const other = name(r[r.winner === "a" ? "b" : "a"], depth + 1);
          return isTBD(next) || isTBD(other) ? s : next;
        }
        m = /^(1st|2nd)\s+in\s+round\s*robin$/i.exec(s);
        if (m) {
          const t = rrTable();
          if (!t || !t.settled) return s;
          const row = t.rows[m[1].toLowerCase() === "1st" ? 0 : 1];
          return row ? row.name : s;
        }
        return s;
      }
      lists[key] = raw.map((r, i) => ({ ...r, idx: i, A: name(r.a), B: name(r.b) }));
      if (key === "carrom") rr = rrTable();
    });
    const champions = [];
    LISTS.forEach(key => lists[key].forEach(r => {
      if (isFinal(key, r) && decided(r) && r.winner !== "draw") {
        champions.push({ key, event: key === "tt" ? r.event : "", name: r.winner === "a" ? r.A : r.B });
      }
    }));
    return { lists, rr, champions };
  }

  // Players who only ever meet each other form one pool (used for table tennis league groups).
  function pools(matches) {
    const parent = new Map();
    const find = x => { while (parent.get(x) !== x) x = parent.get(x); return x; };
    const order = [];
    matches.forEach(m => {
      if (!m.A || !m.B || isTBD(m.A) || isTBD(m.B)) return;
      const a = norm(m.A), b = norm(m.B);
      [a, b].forEach(k => { if (!parent.has(k)) { parent.set(k, k); order.push(k); } });
      const ra = find(a), rb = find(b);
      if (ra !== rb) parent.set(rb, ra);
    });
    const groups = new Map();
    order.forEach(k => { const r = find(k); if (!groups.has(r)) groups.set(r, new Set()); groups.get(r).add(k); });
    return [...groups.values()].map(set => matches.filter(m => set.has(norm(m.A)) || set.has(norm(m.B))));
  }

  return { norm, isTBD, decided, hasWinner, resolve, table, pools, POINTS, LISTS, isFinal, isKnockout, stageOf, idOf };
})();
