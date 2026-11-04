// Reguli fixe, fără AI: din rândurile citite pe ecran scot contacte curate. Aceleași rânduri dau mereu același rezultat.
(function (radacina) {
  const RE_TEL = /(?:\+|00)\s?\d[\d\s().\-\/]{6,18}\d|\b0[237]\d[\d\s.\-]{6,12}\d/g;
  const RE_MAIL = /[\p{L}\p{N}._%+\-]+@[\p{L}\p{N}\-]+(?:\.[\p{L}\p{N}\-]+)*\.\p{L}{2,}/gu;
  const RE_URL = /(?:https?:\/\/)?(?:www\.)?[\p{L}\p{N}\-]+(?:\.[\p{L}\p{N}\-]+)*\.(?:ro|com|eu|net|org|md|io|shop|online|info|biz)\b(?:\/\S*)?/iu;
  const RE_UI = /^(caută|cauta|search|vezi (schimb|modific|tot)|schimbări în lista|schimbari in lista|schimbările numelui|ieșit ori|află mai multe|afla mai multe|adaug[ăa] o etichet|membri?\b|\d+ membri|info grup|media, link|mesaje|apel|contacte?$|favorite$|recente$)/i;
  const STARI = /^(available|disponibil|busy|ocupat|at work|la serviciu|at school|la școală|urgent calls only|sleeping|battery about to die|in a meeting|la o ședință|hey there.*|salut! folosesc whatsapp\.?)$/i;
  const CUV_FIRMA = /\b(srl|s\.r\.l|sa|pfa|imobiliare|design|service|services|auto|logistica|grafica|instalații|instalatii|comercial|interiors|studio|consulting|construct|construcții|constructii|glass|cars|cart|spa|shop|market|agency|solutions|group)\b/i;
  const TITLURI = /^(avocat|notar|dr|ing|arh|ec|prof)\.?$/i;

  function normTel(c) {
    let p = c.replace(/[^\d+]/g, '');
    if (p.startsWith('00')) p = '+' + p.slice(2);
    if (/^\+40\d{9}$/.test(p)) return /^\+40[237]/.test(p) ? p : null;
    if (/^40[237]\d{8}$/.test(p)) return '+' + p;
    if (/^0[237]\d{8}$/.test(p)) return '+40' + p.slice(1);
    if (/^\+[1-9]\d{7,14}$/.test(p)) return p;
    return null;
  }
  const areLitere = t => /\p{L}/u.test(t);
  const mare = t => /^\p{Lu}/u.test(t);
  // În nume, „l” mic la început de cuvânt este un „I” citit greșit (lulian, losif, lonut).
  const corectezCuvant = t => /^l\p{Ll}/u.test(t) ? 'I' + t.slice(1) : t;

  // Taie ce a citit motorul din poza de contact și păstrează ce urmează după semnul „~” al WhatsApp.
  function curataInceput(linie) {
    let t = linie.replace(/\s+/g, ' ').trim();
    const m = /^(.{0,12}?)(?:~|(?:^|\s)[—–-](?=\s?\p{L}))\s*/u.exec(t);
    if (m && !/\p{L}{4}/u.test(m[1])) return { text: t.slice(m[0].length), marcat: true };
    const c = t.split(' ');
    while (c.length && (c[0].length <= 2 || !areLitere(c[0]) || !/^[\p{L}(]/u.test(c[0]) || (/\d/.test(c[0]) && c[0].length <= 4))) {
      if (/^\+|^\d{2,}/.test(c[0]) || (c[0].length === 2 && /^(Dr|Ed|Al|Ad|Bo|Di|Ion|Pr)$/.test(c[0]) && c.length > 2)) break;
      c.shift();
    }
    return { text: c.join(' '), marcat: false };
  }
  const curataSfarsit = t => t.replace(/[\s,;:|_=+*•·“”"'`~\-—–]+$/u, '').trim();
  function parteNume(t) {
    let s = curataSfarsit(t), scurtat = false;
    if (/(\.{2,}|…)$/.test(s)) { s = s.replace(/[.…\s]+$/u, ''); scurtat = true }
    s = s.replace(/^[^\p{L}(]+/u, '').split(' ').map(corectezCuvant).join(' ');
    return { s: curataSfarsit(s), scurtat };
  }
  function eStareSauText(t, marcat) {
    const s = t.trim();
    if (STARI.test(s)) return true;
    if (marcat) return false;
    const c = s.split(' ');
    if (c.length >= 2 && !mare(c[1]) && /^\p{L}/u.test(c[1])) return true;
    if (!mare(s)) return c.length >= 2;
    if (/[!?,:]/.test(s) || (c.length >= 3 && /[^.]\.$/.test(s))) return true;
    if (/\p{Ll}\.{2,}$|…$/u.test(s) && c.length >= 2 && !mare(c[c.length - 1])) return true;
    return c.length > 6;
  }
  function eNume(t, marcat) {
    if (t.length < 2 || t.length > 60 || /\d{3}/.test(t)) return false;
    const c = t.split(' ').filter(Boolean);
    if (marcat) return /\p{L}|\d/u.test(t);
    if (c.length < 2) return false;
    return mare(c[0]) && c[0].replace(/[^\p{L}]/gu, '').length >= 2 && mare(c[1]) && c[1].replace(/[^\p{L}]/gu, '').length >= 2;
  }
  // Împarte numele de pe ecran în persoană și firmă sau organizație.
  function imparteNume(text, marcat) {
    const { s, scurtat } = parteNume(text);
    const r = { nume: s, firma: '', obs: scurtat ? 'nume scurtat pe ecran' : '' };
    const url = RE_URL.exec(s);
    if (url && !s.includes('@')) { r.firma = url[0]; r.nume = curataSfarsit(s.replace(url[0], ' ')).replace(/\s+/g, ' ') }
    const sep = /^(.+?)\s[-—–]\s(.+)$/.exec(r.nume);
    if (sep) {
      const stangaFirma = CUV_FIRMA.test(sep[1]), dreaptaFirma = CUV_FIRMA.test(sep[2]);
      if (dreaptaFirma && !stangaFirma) { r.firma = r.firma || r.nume; r.nume = sep[1] }
      else { r.firma = r.firma || sep[1]; r.nume = sep[2] }
      return r;
    }
    const c = r.nume.split(' ').filter(Boolean);
    if (c.length > 1 && TITLURI.test(c[0])) { r.firma = r.firma || c[0].replace(/\.$/, ''); r.nume = c.slice(1).join(' '); return r }
    if (CUV_FIRMA.test(r.nume)) {
      r.firma = r.firma || r.nume;
      const i = c.findIndex(x => CUV_FIRMA.test(x));
      if (!marcat && c.length > 2) { r.nume = c.slice(0, 2).join(' '); r.firma = c.slice(2).join(' ') }
      else if (i > 0) r.nume = c.slice(0, i).join(' ');
      return r;
    }
    if (!marcat && c.length > 2) { r.nume = c.slice(0, 2).join(' '); r.firma = r.firma || c.slice(2).join(' ') }
    return r;
  }
  const RE_PLECAT = /^(.*?)\s+(a părăsit|a parasit|a fost exclus[ăa]?|left|was removed)(?:\s+grupul)?\b(.*)$/iu;
  const RE_DATA = /\bpe\s+(\d{2}\.\d{2}\.\d{4})(?:\s+la\s+(\d{1,2}:\d{2}))?/i;

  // linii: [{t, y0?, y1?}] în ordinea de pe ecran. geo: {inaltime, pas} când se cunosc pozițiile.
  function parseaza(linii, geo) {
    const out = [];
    let cur = null, ultimY = null;
    const nou = o => { cur = { nume: '', tel: '', mail: '', text: '', obs: '', firma: '', y0: undefined, y1: undefined, ...o }; out.push(cur); return cur };
    const nota = (c, t) => { if (t && !c.obs.includes(t)) c.obs = c.obs ? c.obs + '; ' + t : t };
    const adaugaText = (c, t) => { if (t && !c.text.includes(t)) c.text = c.text ? c.text + ' ' + t : t };
    for (let i = 0; i < linii.length; i++) {
      const l = linii[i], brut = String(l.t || '').replace(/\s+/g, ' ').trim();
      if (!brut) continue;
      if (geo && geo.inaltime && (l.y1 < geo.inaltime * .055 || l.y0 > geo.inaltime * .935)) continue;
      if (/^\d{1,2}:\d{2}\b/.test(brut) && !RE_TEL.test(brut)) { RE_TEL.lastIndex = 0; continue }
      RE_TEL.lastIndex = 0;
      const { text, marcat } = curataInceput(brut);
      if (!text || RE_UI.test(text)) continue;
      const lipit = cur && geo && geo.pas && l.y0 != null && cur.y1 != null && (l.y0 - cur.y1) < geo.pas * .28;

      const pl = RE_PLECAT.exec(text);
      if (pl) {
        const p = imparteNume(pl[1], false);
        const c = nou({ nume: p.nume, firma: p.firma, y0: l.y0, y1: l.y1 });
        let urm = pl[3] || '';
        for (let k = i + 1; k <= i + 2 && k < linii.length; k++) {
          const n = String(linii[k].t || '');
          if (/grupul\s*$/i.test(n) && n.length < 14) { i = k; continue }
          if (RE_DATA.test(n)) { urm = n; i = k; break }
          break;
        }
        const d = RE_DATA.exec(urm);
        c.obs = 'a părăsit grupul' + (d ? ' pe ' + d[1] + (d[2] ? ' la ' + d[2] : '') : '');
        c.plecat = true;
        continue;
      }
      if (RE_DATA.test(text) && text.length < 30) continue;

      let rest = text, admin = false;
      if (/\badmin(?:istrator)? al grupului\b|\bgroup admin\b/i.test(rest)) { admin = true; rest = rest.replace(/\badmin(?:istrator)? al grupului\b|\bgroup admin\b/ig, ' ') }
      const mailuri = (rest.match(RE_MAIL) || []).map(m => m.toLowerCase());
      rest = rest.replace(RE_MAIL, ' ');
      const tels = [];
      for (const m of rest.matchAll(RE_TEL)) { const t = normTel(m[0]); if (t) { tels.push(t); rest = rest.replace(m[0], ' ') } }
      rest = rest.replace(/\s+/g, ' ').trim();
      rest = corectezCuvant(rest);

      if (tels.length) {
        const p = imparteNume(rest, marcat);
        const areNume = rest && (marcat || eNume(p.nume, false));
        const c = nou({ tel: tels[0], nume: areNume ? p.nume : '', firma: areNume ? p.firma : '', y0: l.y0, y1: l.y1 });
        if (areNume) nota(c, p.obs);
        if (mailuri[0]) c.mail = mailuri[0];
        if (admin) nota(c, 'admin al grupului');
        continue;
      }
      if (mailuri.length) {
        if (cur && !cur.mail && (lipit || !rest)) { cur.mail = mailuri[0]; cur.y1 = l.y1 ?? cur.y1; continue }
        const p = imparteNume(rest, marcat);
        nou({ mail: mailuri[0], nume: p.nume, firma: p.firma, y0: l.y0, y1: l.y1 });
        continue;
      }
      // Linia de sub nume: slogan, stare sau site.
      if (cur && !marcat) {
        const u = RE_URL.exec(rest);
        if (u && rest.replace(u[0], '').replace(/[^\p{L}]/gu, '').length <= 3) { if (!cur.firma) cur.firma = u[0]; cur.y1 = l.y1 ?? cur.y1; continue }
        const text2 = eStareSauText(rest, false);
        if (lipit || text2) {
          const t = curataSfarsit(rest.replace(/^[^\p{L}\p{N}]+/u, ''));
          if (t.length >= 3 && (text2 || lipit)) { adaugaText(cur, t); cur.y1 = l.y1 ?? cur.y1; if (u && !cur.firma) cur.firma = u[0] }
          continue;
        }
      }
      if (eNume(rest, marcat) && !eStareSauText(rest, marcat)) {
        const p = imparteNume(rest, marcat);
        const c = nou({ nume: p.nume, firma: p.firma, y0: l.y0, y1: l.y1 });
        nota(c, p.obs);
        if (admin) nota(c, 'admin al grupului');
      }
    }
    return out.filter(c => c.nume || c.tel || c.mail);
  }

  const cheieNume = s => s.toLowerCase().normalize('NFD').replace(/[^\p{L}\p{N}]/gu, '');
  function asemanare(a, b) {
    if (a === b) return 1; if (a.length < 3 || b.length < 3) return 0;
    const f = s => { const m = new Map(); for (let i = 0; i < s.length - 1; i++) { const x = s.slice(i, i + 2); m.set(x, (m.get(x) || 0) + 1) } return m };
    const x = f(a), y = f(b); let c = 0; for (const [k, v] of x) c += Math.min(v, y.get(k) || 0);
    return 2 * c / (a.length + b.length - 2);
  }
  // Același om citit în mai multe cadre: după telefon, e-mail sau nume foarte apropiat.
  function acelasi(a, b) {
    if (a.tel && b.tel) {
      if (a.tel === b.tel) return true;
      if (a.tel.length !== b.tel.length) return false;
      let d = 0; for (let i = 0; i < a.tel.length; i++) if (a.tel[i] !== b.tel[i]) d++;
      return d === 1 && a.nume && b.nume && asemanare(cheieNume(a.nume), cheieNume(b.nume)) >= .8;
    }
    if (a.mail && b.mail && a.mail === b.mail) return true;
    if (a.nume && b.nume && (!a.tel || !b.tel)) return asemanare(cheieNume(a.nume), cheieNume(b.nume)) >= .85;
    return false;
  }

  const faraFormula = v => { const t = String(v ?? '').replace(/[\t\r\n]+/g, ' ').trim(); return /^[=+\-@]/.test(t) ? "'" + t : t };
  const celulaTel = v => String(v ?? '').replace(/[\t\r\n]+/g, ' ').trim();
  const COLOANE = ['Nume', 'Telefon', 'Text lângă nume', 'Observații', 'Relație', 'E-mail', 'Firmă sau organizație'];
  function tabelText(l) {
    return [COLOANE.join('\t'), ...l.map(c => [faraFormula(c.nume), celulaTel(c.tel), faraFormula(c.text), faraFormula(c.obs), faraFormula(c.relatie), faraFormula(c.mail), faraFormula(c.firma)].join('\t'))].join('\n');
  }
  function vcard(l) {
    const e = v => String(v ?? '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');
    const pliaza = s => { const o = []; for (let i = 0; i < s.length; i += 74) o.push((i ? ' ' : '') + s.slice(i, i + 74)); return o.join('\r\n') };
    return l.map(c => {
      const nume = c.nume || c.firma || c.tel || c.mail, r = ['BEGIN:VCARD', 'VERSION:3.0', 'FN:' + e(nume), 'N:' + e(nume) + ';;;;'];
      if (c.tel) r.push('TEL;TYPE=CELL:' + e(c.tel));
      if (c.mail) r.push('EMAIL:' + e(c.mail));
      if (c.firma) r.push('ORG:' + e(c.firma));
      if (c.relatie) r.push('CATEGORIES:' + e(c.relatie));
      const n = [c.text, c.obs].filter(Boolean).join(' | ');
      if (n) r.push('NOTE:' + e(n));
      if (c.poza) r.push(pliaza('PHOTO;ENCODING=b;TYPE=JPEG:' + c.poza.split(',')[1]));
      r.push('END:VCARD');
      return r.join('\r\n');
    }).join('\r\n') + '\r\n';
  }
  const api = { parseaza, acelasi, tabelText, vcard, normTel };
  if (typeof module !== 'undefined') module.exports = api; else radacina.Reguli = api;
})(this);
