// Rezept als PDF (A4), ganz auf dem Gerät erzeugt: kein Server, keine Fremdbibliothek, offline nutzbar.
// Schrift: Helvetica (in jedem PDF-Programm vorhanden), Zeichenbreiten in PDF_BREITEN (Windows-1252, ab 32).
const PDF_BREITEN = {"F1":[278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,0,744,0,222,556,333,1000,556,556,333,1000,667,333,1000,0,611,0,0,222,222,333,333,350,556,1000,333,1000,500,333,944,0,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,0,737,333,400,549,333,333,333,576,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,549,611,556,556,556,556,500,556,500],"F2":[278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,0,744,0,278,556,500,1000,556,556,333,1000,667,333,1000,0,611,0,0,278,278,500,500,350,556,1000,333,1000,556,333,944,0,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,0,737,333,400,549,333,333,333,576,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,549,611,611,611,611,611,556,611,556]};
const PDF_1252 = (() => { const t = {}; '€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008dŽ\u008f\u0090‘’“”•–—˜™š›œ\u009džŸ'.split('').forEach((c, i) => t[c] = 128 + i); return t; })();
function pdfBytes(s){
  s = String(s).normalize('NFC').replace(/≈\s*/g, 'ca. ').replace(/(\d)⅓/g, '$1 1/3').replace(/(\d)⅔/g, '$1 2/3').replace(/⅓/g, '1/3').replace(/⅔/g, '2/3')
    .replace(/−/g, '–').replace(/→/g, '>').replace(/[   ]/g, ' ');
  const b = [];
  for(const c of s){
    const n = c.codePointAt(0);
    if((n >= 32 && n < 127) || (n >= 160 && n < 256)) b.push(n);
    else if(PDF_1252[c]) b.push(PDF_1252[c]);
    else if(n > 255){ const g = c.normalize('NFD').charCodeAt(0); if(g < 127) b.push(g); }
  }
  return b;
}
const pdfBreite = (s, font, gr) => pdfBytes(s).reduce((a, c) => a + (PDF_BREITEN[font][c - 32] || 0), 0) * gr / 1000;
function pdfUmbruch(text, font, gr, breite){
  const zeilen = [];
  for(const absatz of String(text).split('\n')){
    let z = '';
    for(let w of absatz.split(/\s+/)){
      const v = z ? z + ' ' + w : w;
      if(pdfBreite(v, font, gr) <= breite){ z = v; continue; }
      if(z) zeilen.push(z);
      while(pdfBreite(w, font, gr) > breite && w.length > 1){
        let n = w.length - 1; while(n > 1 && pdfBreite(w.slice(0, n), font, gr) > breite) n--;
        zeilen.push(w.slice(0, n)); w = w.slice(n);
      }
      z = w;
    }
    zeilen.push(z);
  }
  return zeilen;
}
// Foto auf das Querformat des PDF-Kopfes zuschneiden
async function pdfBild(url, breite, hoehe){
  try{
    const im = new Image(); im.src = url; await im.decode();
    const c = document.createElement('canvas'); c.width = 1200; c.height = Math.round(1200 * hoehe / breite);
    const k = Math.max(c.width / im.naturalWidth, c.height / im.naturalHeight), w = im.naturalWidth * k, h = im.naturalHeight * k;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(im, (c.width - w) / 2, (c.height - h) / 2, w, h);
    const b = await new Promise(ok => c.toBlob(ok, 'image/jpeg', .84));
    return b && {w:c.width, h:c.height, daten:new Uint8Array(await b.arrayBuffer())};
  }catch(e){ return null; }
}
async function rezeptPdf(r){
  const SB = 595.28, SH = 841.89, R = 48, IB = SB - 2 * R, UNTEN = SH - 62;
  const GRUEN = '0.122 0.416 0.290', TEXT = '0.094 0.129 0.114', LEISE = '0.337 0.380 0.361', LILA = '0.36 0.29 0.55';
  const seiten = [[]];
  const seite = n => { while(seiten.length <= n) seiten.push([]); return seiten[n]; };
  const hex = s => '<' + pdfBytes(s).map(b => b.toString(16).padStart(2, '0')).join('') + '>';
  const schreib = (n, s, x, y, font, gr, farbe) => seite(n).push(`BT /${font} ${gr} Tf ${farbe} rg ${x.toFixed(2)} ${(SH - y).toFixed(2)} Td ${hex(s)} Tj ET`);
  const strich = (n, x1, y, x2) => seite(n).push(`0.81 0.855 0.827 RG 0.7 w ${x1.toFixed(2)} ${(SH - y).toFixed(2)} m ${x2.toFixed(2)} ${(SH - y).toFixed(2)} l S`);
  // Cursor: n = Seite, y = Oberkante der nächsten Zeile
  const platz = (c, h) => { if(c.y + h > UNTEN){ c.n++; c.y = 56; } };
  const zeilen = (c, liste, x, font, gr, zh, farbe) => { for(const z of liste){ platz(c, zh); schreib(c.n, z, x, c.y + gr, font, gr, farbe); c.y += zh; } };

  // Kopf
  const c = {n:0, y:R};
  const BH = 200, bild = r.bild ? await pdfBild(r.bild, IB, BH) : null;
  if(bild){ seite(0).push(`q ${IB.toFixed(2)} 0 0 ${BH} ${R} ${(SH - R - BH).toFixed(2)} cm /Im1 Do Q`); c.y += BH + 18; }
  zeilen(c, pdfUmbruch(r.titel, 'F2', 24, IB), R, 'F2', 24, 29, TEXT);
  c.y += 4;
  if(r.kurz) zeilen(c, pdfUmbruch(r.kurz, 'F1', 11, IB), R, 'F1', 11, 15.5, LEISE);
  c.y += 5;
  const fakten = [`${r.portionen} Portion${r.portionen === 1 ? '' : 'en'}`, r.zeit, r.allergene.length ? 'Enthält ' + r.allergene.join(', ') : ''].filter(Boolean).join('  •  ');
  zeilen(c, pdfUmbruch(fakten, 'F2', 9.5, IB), R, 'F2', 9.5, 13.5, GRUEN);
  c.y += 8; strich(c.n, R, c.y, SB - R); c.y += 16;

  // Zwei Spalten: links Zutaten, rechts Zubereitung
  const LB = 168, RX = R + LB + 24, RB = SB - R - RX;
  const ueber = (k, s, x, farbe = GRUEN) => { platz(k, 60); schreib(k.n, s, x, k.y + 13, 'F2', 13, farbe); k.y += 24; };
  const l = {...c}, rs = {...c};
  ueber(l, 'Zutaten', R);
  let gruppe = '';
  for(const z of r.zutaten){
    if(z.gruppe !== gruppe){ gruppe = z.gruppe; if(gruppe){ l.y += 5; platz(l, 44); zeilen(l, pdfUmbruch(gruppe, 'F2', 9.5, LB), R, 'F2', 9.5, 14, LEISE); } }
    const MB = 58, m = z.m ? pdfUmbruch(z.m, 'F2', 9.5, MB - 4) : [], t = pdfUmbruch(z.n, 'F1', 9.5, LB - MB);
    platz(l, Math.max(m.length, t.length) * 12.5);
    const y0 = l.y;
    m.forEach((s, i) => schreib(l.n, s, R, y0 + 9.5 + i * 12.5, 'F2', 9.5, TEXT));
    t.forEach((s, i) => schreib(l.n, s, R + MB, y0 + 9.5 + i * 12.5, 'F1', 9.5, TEXT));
    l.y = y0 + Math.max(m.length, t.length) * 12.5 + 3;
  }
  if(r.geschaetzt){ l.y += 6; zeilen(l, pdfUmbruch('ca. = Menge geschätzt, in der Quelle nicht genau angegeben.', 'F1', 8, LB), R, 'F1', 8, 10.5, LEISE); }
  const schritte = (kopf, liste, farbe) => {
    if(!liste.length) return;
    ueber(rs, kopf, RX, farbe);
    liste.forEach((s, i) => {
      const t = pdfUmbruch(s, 'F1', 10.5, RB - 22);
      platz(rs, Math.min(t.length, 3) * 14.5);
      schreib(rs.n, String(i + 1), RX, rs.y + 10.5, 'F2', 10.5, farbe);
      zeilen(rs, t, RX + 22, 'F1', 10.5, 14.5, TEXT); rs.y += 6;
    });
    rs.y += 8;
  };
  schritte('Zubereitung', r.zubereitung, GRUEN);
  schritte('Mit dem Thermomix', r.thermomix, LILA);

  // Anmerkungen über die volle Breite, unter der längeren Spalte
  const e = l.n > rs.n || (l.n === rs.n && l.y > rs.y) ? {...l} : {...rs};
  if(r.anmerkungen){
    e.y += 10; platz(e, 80); strich(e.n, R, e.y, SB - R); e.y += 14;
    ueber(e, 'Anmerkungen', R);
    for(const a of r.anmerkungen.split(/\n\s*\n/)){ zeilen(e, pdfUmbruch(a, 'F1', 10, IB), R, 'F1', 10, 14, TEXT); e.y += 6; }
  }
  // Fuß
  seiten.forEach((_, n) => {
    strich(n, R, SH - 44, SB - R);
    const nr = seiten.length > 1 ? `Seite ${n + 1} von ${seiten.length}` : '', nb = pdfBreite(nr, 'F1', 8);
    const q = [r.quelle ? 'Quelle: ' + r.quelle : 'Kochbuch', bild ? 'Foto KI-erzeugt' : ''].filter(Boolean).join('  •  ');
    let fz = pdfUmbruch(q, 'F1', 8, IB - nb - 20); if(fz.length > 1) fz = [fz[0] + ' …'];
    schreib(n, fz[0], R, SH - 31, 'F1', 8, LEISE);
    if(nr) schreib(n, nr, SB - R - nb, SH - 31, 'F1', 8, LEISE);
  });

  // Datei zusammensetzen
  const enc = s => new TextEncoder().encode(s), teile = [], pos = [];
  let len = 0;
  const raus = u => { if(typeof u === 'string') u = enc(u); teile.push(u); len += u.length; };
  const obj = (nr, ...inhalt) => { pos[nr] = len; raus(`${nr} 0 obj\n`); inhalt.forEach(raus); raus('\nendobj\n'); };
  raus('%PDF-1.4\n%'); raus(new Uint8Array([0xe2, 0xe3, 0xcf, 0xd3, 10]));
  const S0 = 7, kids = seiten.map((_, i) => `${S0 + 2 * i} 0 R`).join(' ');
  obj(1, '<< /Type /Catalog /Pages 2 0 R /Lang (de-DE) >>');
  obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${seiten.length} >>`);
  obj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  obj(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  if(bild) obj(5, `<< /Type /XObject /Subtype /Image /Width ${bild.w} /Height ${bild.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bild.daten.length} >>\nstream\n`, bild.daten, '\nendstream');
  else obj(5, 'null');
  let th = 'feff'; for(let i = 0; i < r.titel.length; i++) th += r.titel.charCodeAt(i).toString(16).padStart(4, '0');
  obj(6, `<< /Title <${th}> >>`);
  seiten.forEach((s, i) => {
    const d = enc(s.join('\n'));
    obj(S0 + 2 * i, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${SB} ${SH}] /Contents ${S0 + 2 * i + 1} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${bild ? ' /XObject << /Im1 5 0 R >>' : ''} >> >>`);
    obj(S0 + 2 * i + 1, `<< /Length ${d.length} >>\nstream\n`, d, '\nendstream');
  });
  const xref = len, anz = pos.length;
  raus(`xref\n0 ${anz}\n0000000000 65535 f \n`);
  for(let i = 1; i < anz; i++) raus(String(pos[i]).padStart(10, '0') + ' 00000 n \n');
  raus(`trailer\n<< /Size ${anz} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(teile, {type:'application/pdf'});
}
