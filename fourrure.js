// ================== v16 : VRAIS POILS SUR TOUTE LA FAMILLE ==================
// On calcule la silhouette de chaque perso (carte de distance au bord), puis on pose des centaines
// de brins : de longs poils qui depassent du contour (le "halo" duveteux) et de petits poils qui
// couchent sur le corps (le grain de la peluche). Meme graine = memes poils a chaque lancement.
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var W = 260, H = 190, ECH = 2;                 // echelle de la carte (1 pixel = 2 unites)
  var GW = W / ECH, GH = H / ECH;

  // couleurs [clair, moyen, profond] de chaque perso (identiques aux degrades du corps)
  var PAL = {
    adam:   ['#d9f1ff', '#5cb4ff', '#1d5fe0'],
    nova:   ['#eee3ff', '#a27bff', '#5226cf'],
    mochi:  ['#ffe6f2', '#ff7dba', '#d42a78'],
    piment: ['#ffe2d8', '#ff7656', '#cf2f1d'],
    miel:   ['#fff6cf', '#ffc640', '#e07f06'],
    pousse: ['#e9ffd9', '#74da5e', '#258f35']
  };
  // intensite des poils : plus c'est grand, plus la peluche est fournie
  var DENSITE = { adam: 1, nova: 1, mochi: 1, piment: 1, miel: 1, pousse: 1 };

  function graine(s) {                            // petit generateur pseudo-aleatoire stable
    var a = s >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hex(c) { return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)]; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function css(c, k) {
    k = k || 1;
    return 'rgb(' + Math.max(0, Math.min(255, Math.round(c[0] * k))) + ',' + Math.max(0, Math.min(255, Math.round(c[1] * k))) + ',' + Math.max(0, Math.min(255, Math.round(c[2] * k))) + ')';
  }
  // couleur du corps en (x,y) : meme formule que le degrade radial (36% 24%, rayon 85%)
  function couleurCorps(p, x, y) {
    var t = Math.sqrt(Math.pow((x - .36 * W) / (.85 * W), 2) + Math.pow((y - .24 * H) / (.85 * H), 2));
    var c = PAL[p], A = hex(c[0]), B = hex(c[1]), C = hex(c[2]);
    return t < .45 ? mix(A, B, t / .45) : mix(B, C, Math.min(1, (t - .45) / .55));
  }

  // dessine la silhouette (formes du clipPath) dans un canvas, renvoie un masque 0/1
  function masque(clip) {
    var cv = document.createElement('canvas'); cv.width = GW; cv.height = GH;
    var cx = cv.getContext('2d'); cx.scale(1 / ECH, 1 / ECH); cx.fillStyle = '#000';
    var kids = clip.children;
    for (var i = 0; i < kids.length; i++) {
      var e = kids[i], n = e.tagName.toLowerCase();
      if (n === 'ellipse') {
        cx.beginPath();
        cx.ellipse(+e.getAttribute('cx'), +e.getAttribute('cy'), +e.getAttribute('rx'), +e.getAttribute('ry'), 0, 0, Math.PI * 2);
        cx.fill();
      } else if (n === 'path') {
        try { cx.fill(new Path2D(e.getAttribute('d'))); } catch (err) { /* navigateur sans Path2D */ }
      }
    }
    var d = cx.getImageData(0, 0, GW, GH).data, m = new Uint8Array(GW * GH);
    for (var k = 0; k < m.length; k++) m[k] = d[k * 4 + 3] > 127 ? 1 : 0;
    return m;
  }
  // distance (en pixels de la carte) jusqu'au bord, en 2 passes
  function distance(m) {
    var INF = 9999, D = new Float32Array(GW * GH), x, y, i;
    for (i = 0; i < D.length; i++) D[i] = m[i] ? INF : 0;
    for (y = 0; y < GH; y++) for (x = 0; x < GW; x++) {
      i = y * GW + x; if (!m[i]) continue;
      if (x === 0 || y === 0 || x === GW - 1) { D[i] = 1; continue; }
      D[i] = Math.min(D[i], D[i - 1] + 1, D[i - GW] + 1, D[i - GW - 1] + 1.414, D[i - GW + 1] + 1.414);
    }
    for (y = GH - 1; y >= 0; y--) for (x = GW - 1; x >= 0; x--) {
      i = y * GW + x; if (!m[i]) continue;
      if (x === GW - 1 || y === GH - 1 || x === 0) { D[i] = 1; continue; }
      D[i] = Math.min(D[i], D[i + 1] + 1, D[i + GW] + 1, D[i + GW + 1] + 1.414, D[i + GW - 1] + 1.414);
    }
    return D;
  }
  function d(D, x, y) { x = Math.max(0, Math.min(GW - 1, x | 0)); y = Math.max(0, Math.min(GH - 1, y | 0)); return D[y * GW + x]; }

  function fabriquer(p, clip) {
    var m = masque(clip), D = distance(m), rnd = graine(p.charCodeAt(0) * 977 + p.length * 131);
    var dens = DENSITE[p] || 1, pts = [], x, y;
    // 1) liste des pixels du bord (distance <= 2) : la, on plante les longs poils
    var bord = [], interieur = [];
    for (y = 1; y < GH - 1; y++) for (x = 1; x < GW - 1; x++) {
      var i = y * GW + x; if (!m[i]) continue;
      if (D[i] <= 2.2) bord.push(i); else if (D[i] > 4) interieur.push(i);
    }
    var groupes = {
      fond: [], mi: [], pointe: [], peluche: [], ombre: []
    };
    function normale(px, py) {                     // sens "vers l'exterieur" = montee de la distance inversee
      var gx = d(D, px + 1, py) - d(D, px - 1, py), gy = d(D, px, py + 1) - d(D, px, py - 1);
      var l = Math.sqrt(gx * gx + gy * gy) || 1; return [-gx / l, -gy / l];
    }
    function brin(bx, by, ang, len, courbe) {
      var ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len;
      var cxp = bx + Math.cos(ang + courbe) * len * .55, cyp = by + Math.sin(ang + courbe) * len * .55;
      return 'M' + bx.toFixed(1) + ' ' + by.toFixed(1) + 'Q' + cxp.toFixed(1) + ' ' + cyp.toFixed(1) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1);
    }
    // 2) longs poils du contour : trois couches (profonde, moyenne, pointes claires)
    var nb = Math.round(bord.length * 3.1 * dens);
    for (var n = 0; n < nb; n++) {
      var pi = bord[(rnd() * bord.length) | 0];
      var bx = ((pi % GW) + rnd()) * ECH, by = (((pi / GW) | 0) + rnd()) * ECH;
      var nm = normale(bx / ECH, by / ECH);
      var a0 = Math.atan2(nm[1], nm[0]) + (rnd() - .5) * 1.25;
      // la gravite couche un peu les poils vers le bas
      var vx = Math.cos(a0), vy = Math.sin(a0) + .22; a0 = Math.atan2(vy, vx);
      var len = 5 + rnd() * 7.5, c = (rnd() - .5) * .9;
      var t = rnd();
      var chemin = brin(bx - nm[0] * 2, by - nm[1] * 2, a0, len, c);
      var col = couleurCorps(p, bx, by);
      (t < .45 ? groupes.fond : t < .8 ? groupes.mi : groupes.pointe).push([chemin, col]);
    }
    // 3) petits poils couches sur le corps (grain de peluche), sens : du centre-haut vers le bas/le bord
    var nbi = Math.round(interieur.length * 1.05 * dens);
    for (var q = 0; q < nbi; q++) {
      var pj = interieur[(rnd() * interieur.length) | 0];
      var ix = ((pj % GW) + rnd()) * ECH, iy = (((pj / GW) | 0) + rnd()) * ECH;
      var nn = normale(ix / ECH, iy / ECH);
      var cdx = ix - W / 2, cdy = iy - 100, cl = Math.sqrt(cdx * cdx + cdy * cdy) || 1;
      var ang = Math.atan2(cdy / cl * .6 + nn[1] * .4 + .35, cdx / cl * .6 + nn[0] * .4) + (rnd() - .5) * .9;
      var ln = 3.5 + rnd() * 4.5;
      (rnd() < .5 ? groupes.peluche : groupes.ombre).push([brin(ix, iy, ang, ln, (rnd() - .5) * .8), couleurCorps(p, ix, iy)]);
    }

    var g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'poils'); g.setAttribute('fill', 'none'); g.setAttribute('stroke-linecap', 'round');
    function ajouter(liste, k, largeur, opacite, eclaircir) {
      // on regroupe par teinte (8 paliers) pour garder peu d'elements SVG
      var seaux = {};
      liste.forEach(function (e) {
        var c = e[1], cle = Math.round(((c[0] + c[1] + c[2]) / 3) / 24);
        (seaux[cle] = seaux[cle] || { c: c, d: [] }).d.push(e[0]);
      });
      Object.keys(seaux).forEach(function (cle) {
        var s = seaux[cle], pa = document.createElementNS(NS, 'path');
        var col = eclaircir ? mix(s.c, [255, 255, 255], eclaircir) : mix(s.c, [20, 10, 50], 1 - k);
        pa.setAttribute('d', s.d.join('')); pa.setAttribute('stroke', css(col)); pa.setAttribute('stroke-width', largeur);
        pa.setAttribute('stroke-opacity', opacite); g.appendChild(pa);
      });
    }
    ajouter(groupes.fond, .62, 1.9, .95, 0);       // dessous : poils fonces et epais (donne de la profondeur)
    ajouter(groupes.mi, .86, 1.5, .95, 0);         // couche principale a la couleur du corps
    ajouter(groupes.ombre, .8, 1.0, .5, 0);        // grain fonce sur le corps
    ajouter(groupes.peluche, 1, 1.0, .55, .42);    // grain clair sur le corps
    ajouter(groupes.pointe, 1, 1.15, .9, .5);      // pointes claires qui accrochent la lumiere
    return g;
  }

  function init() {
    var svg = document.getElementById('cloudSvg'); if (!svg) return;
    var corps = svg.querySelectorAll('.corps[data-p]');
    corps.forEach(function (cg) {
      var p = cg.getAttribute('data-p'), clip = svg.querySelector('#c-' + p); if (!clip) return;
      var gc = cg.querySelector(':scope > g[clip-path]'); if (!gc) return;
      try {
        var g = fabriquer(p, clip);
        // les poils passent DERRIERE le corps (ceux du contour depassent) puis on re-dessine un
        // second jeu par-dessus pour le grain : on clone, le clone est rogne au corps
        var derriere = g.cloneNode(true); derriere.setAttribute('class', 'poils poilsDehors');
        cg.insertBefore(derriere, gc);
        var dessus = g; dessus.setAttribute('class', 'poils poilsDessus');
        dessus.setAttribute('clip-path', 'url(#c-' + p + ')');
        gc.parentNode.insertBefore(dessus, gc.nextSibling);
      } catch (e) { if (window.console) console.warn('[fourrure]', p, e); }
    });
    document.documentElement.classList.add('a-des-poils');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
