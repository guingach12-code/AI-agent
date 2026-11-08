// ================== ADAM WEB — le petit nuage dans ta poche ==================
// Tout reste sur l'appareil : clé Groq, mémoire, notes et discussion (localStorage).
(function () {
"use strict";
var $ = function (id) { return document.getElementById(id); };
var corps = document.body, racine = document.documentElement;

/* ---------- stockage local ---------- */
var LS = {
  get: function (k, d) { try { var v = localStorage.getItem("adam." + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set: function (k, v) { try { localStorage.setItem("adam." + k, JSON.stringify(v)); } catch (e) {} }
};
var reglages = Object.assign({ cle: "", voix: "", vitesse: 1.05, theme: "bleu", relais: false, consentIA: false, consentDate: "", cerveau: "groq", cleGemini: "" }, LS.get("reglages", {}));
function sauverReglages() { LS.set("reglages", reglages); }
var memoire = LS.get("memoire", []);
var notes = LS.get("notes", []);
var historique = LS.get("historique", []);
if (LS.get("historiqueDate", 0) < Date.now() - 12 * 3600e3) historique = [];
function sauverHistorique() { historique = historique.slice(-20); LS.set("historique", historique); LS.set("historiqueDate", Date.now()); }

var ua = navigator.userAgent || "";
var estIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
var installee = window.navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches);

/* v16.2 : deux cerveaux possibles, Groq (par defaut) ou Gemini de Google */
function cerveauGemini() { return reglages.cerveau === "gemini" || (!reglages.cle && !!reglages.cleGemini); }
function passerCerveau(nom) {
  reglages.cerveau = nom; sauverReglages();
  var s = document.getElementById("rgCerveau"), m = document.getElementById("rgCerveauMsg");
  if (s) s.value = nom;
  if (m) { m.className = "msg ok"; m.textContent = "C'est " + nomCerveau() + " qui me fait réfléchir maintenant."; }
}
function cleActive() { return cerveauGemini() ? (reglages.cleGemini || "") : (reglages.cle || ""); }
function nomCerveau() { return cerveauGemini() ? "Gemini" : "Groq"; }

/* ---------- Groq : direct, sinon par le relais du site ---------- */
var DIRECT = "https://api.groq.com/openai/v1/";
var RELAIS = new URL("../api/groq/", location.href).href;
function groq(chemin, init, cle) {
  // v16 : rien ne part vers l'IA sans l'accord de l'utilisateur
  if (!reglages.consentIA) { var ec = new Error("CONSENT"); ec.code = "CONSENT"; return Promise.reject(ec); }
  init = Object.assign({}, init);
  init.headers = Object.assign({ Authorization: "Bearer " + (cle || reglages.cle) }, init.headers || {});
  var base = reglages.relais ? RELAIS : DIRECT;
  return fetch(base + chemin, init).catch(function (e) {
    if (reglages.relais) throw e;
    // Le navigateur a refusé l'appel direct : on passe par le relais du site, s'il existe.
    return fetch(RELAIS + chemin, init).then(function (r) {
      if (r.status !== 404) { reglages.relais = true; sauverReglages(); return r; }
      var err = new Error("RELAIS"); err.code = "RELAIS"; throw err;
    });
  });
}
var PREFERES = ["openai/gpt-oss-120b", "moonshotai/kimi-k2-instruct-0905", "moonshotai/kimi-k2-instruct", "openai/gpt-oss-20b",
  "meta-llama/llama-4-maverick-17b-128e-instruct", "qwen/qwen3-32b", "llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
var modeles = LS.get("modeles", []);
function chargerModeles(cle) {
  return groq("models", { method: "GET" }, cle).then(function (r) {
    if (r.status === 401 || r.status === 403) { var e = new Error("CLE"); e.code = "CLE"; throw e; }
    if (!r.ok) { var e2 = new Error("HTTP " + r.status); throw e2; }
    return r.json();
  }).then(function (j) {
    var ids = (j.data || []).map(function (m) { return m.id; });
    var choix = PREFERES.filter(function (m) { return ids.indexOf(m) >= 0; });
    if (!choix.length) choix = ids.filter(function (id) { return !/whisper|guard|tts|orpheus|allam|safeguard/i.test(id); }).slice(0, 3);
    modeles = choix; LS.set("modeles", modeles);
    return ids.length;
  });
}

/* ---------- Gemini (Google) : l'autre cerveau ---------- */
var GEM = "https://generativelanguage.googleapis.com/v1beta/";
var PREFERES_G = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
var modelesG = LS.get("modelesG", []);
var gemParQuery = LS.get("gemParQuery", false);
function gemini(chemin, init, cle) {
  if (!reglages.consentIA) { var ec = new Error("CONSENT"); ec.code = "CONSENT"; return Promise.reject(ec); }
  // v16.3 : les nouvelles clés AQ. de Google sont refusées en en-tête sur certains comptes : on réessaie en paramètre
  var k = cle || reglages.cleGemini, url = GEM + chemin, h = Object.assign({}, (init && init.headers) || {});
  var parParam = function () { return fetch(url + (url.indexOf("?") >= 0 ? "&" : "?") + "key=" + encodeURIComponent(k), Object.assign({}, init, { headers: h })); };
  if (gemParQuery) return parParam();
  return fetch(url, Object.assign({}, init, { headers: Object.assign({ "x-goog-api-key": k }, h) })).then(function (r) {
    if (r.status !== 401 && r.status !== 403) return r;
    return parParam().then(function (r2) {
      if (r2.status !== 401 && r2.status !== 403) { gemParQuery = true; LS.set("gemParQuery", true); return r2; }
      return r;
    });
  });
}
function erreurCle() { var e = new Error("CLE"); e.code = "CLE"; return e; }
function chargerModelesGemini(cle) {
  return gemini("models?pageSize=200", { method: "GET" }, cle).then(function (r) {
    if (r.status === 400 || r.status === 401 || r.status === 403) throw erreurCle();
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }).then(function (j) {
    var ids = (j.models || []).filter(function (m) { return (m.supportedGenerationMethods || []).indexOf("generateContent") >= 0; })
      .map(function (m) { return String(m.name || "").replace(/^models\//, ""); });
    var choix = PREFERES_G.filter(function (m) { return ids.indexOf(m) >= 0; });
    if (!choix.length) choix = ids.filter(function (id) { return /^gemini-[\d.]+-flash/.test(id) && !/image|tts|live|audio|embed|robot|computer/i.test(id); }).slice(0, 3);
    modelesG = choix; LS.set("modelesG", modelesG);
    return ids.length;
  });
}
function outilsGemini() {
  return [{ functionDeclarations: OUTILS.map(function (t) {
    var f = t.function, pr = (f.parameters && f.parameters.properties) || {}, props = {}, n = 0;
    Object.keys(pr).forEach(function (k) {
      var o = { type: String(pr[k].type || "string").toUpperCase(), description: pr[k].description || "" };
      if (pr[k].enum) o.enum = pr[k].enum;
      props[k] = o; n++;
    });
    var d = { name: f.name, description: f.description };
    if (n) { d.parameters = { type: "OBJECT", properties: props }; if (f.parameters.required && f.parameters.required.length) d.parameters.required = f.parameters.required; }
    return d;
  }) }];
}
function messagesGemini(messages) {
  var contents = [], sys = "", noms = {};
  messages.forEach(function (m) {
    if (m.role === "system") { sys += (sys ? "\n" : "") + m.content; return; }
    if (m.role === "tool") {
      var der = contents[contents.length - 1], part = { functionResponse: { name: noms[m.tool_call_id] || "outil", response: { resultat: String(m.content) } } };
      if (der && der.role === "user" && der.parts[0] && der.parts[0].functionResponse) der.parts.push(part); else contents.push({ role: "user", parts: [part] });
      return;
    }
    if (m.role === "assistant") {
      var parts = [];
      if (m.content) parts.push({ text: m.content });
      (m.tool_calls || []).forEach(function (c) {
        noms[c.id] = c.function.name;
        var a = {}; try { a = JSON.parse(c.function.arguments || "{}"); } catch (e) {}
        var p = { functionCall: { name: c.function.name, args: a } };
        if (c.sig) p.thoughtSignature = c.sig;
        parts.push(p);
      });
      if (parts.length) contents.push({ role: "model", parts: parts });
      return;
    }
    contents.push({ role: "user", parts: [{ text: String(m.content || "") }] });
  });
  while (contents.length && contents[0].role === "model") contents.shift();
  return { sys: sys, contents: contents };
}
function attenteDemandee(t) {
  var m = /retry in ([\d.]+)\s*s|"retryDelay":\s*"([\d.]+)s"|try again in ([\d.]+)s/i.exec(t || "");
  return m ? Math.ceil(parseFloat(m[1] || m[2] || m[3]) * 1000) : 1500;
}
function streamGemini(messages, surTexte) {
  var essais = modelesG.length ? modelesG.slice() : PREFERES_G.slice(0, 3), limite = false, reessaye = {}, conv = messagesGemini(messages);
  function essayer(i) {
    if (i >= essais.length) { var e = new Error(limite ? "LIMITE" : "MODELE"); e.code = limite ? "LIMITE" : "MODELE"; return Promise.reject(e); }
    var corpsReq = { systemInstruction: { parts: [{ text: conv.sys }] }, contents: conv.contents, tools: outilsGemini(), generationConfig: { temperature: .6, maxOutputTokens: 1024 } };
    return gemini("models/" + essais[i] + ":streamGenerateContent?alt=sse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpsReq) }).then(function (r) {
      if (r.status === 401 || r.status === 403) throw erreurCle();
      if (!r.ok) return r.text().then(function (t) {
        if (/API key not valid|API_KEY_INVALID/i.test(t)) throw erreurCle();
        if (r.status === 429) {
          limite = true;
          var att = attenteDemandee(t);
          if (!reessaye[i] && att <= 12000) { reessaye[i] = true; elEtat.textContent = "Un instant…"; return new Promise(function (ok) { setTimeout(ok, att + 300); }).then(function () { return essayer(i); }); }
        }
        if (window.console) console.warn("[gemini]", essais[i], r.status, String(t).slice(0, 300));
        return essayer(i + 1);
      });
      var lecteur = r.body.getReader(), dec = new TextDecoder(), tampon = "", contenu = "", appels = [];
      function lire() {
        return lecteur.read().then(function (o) {
          if (o.done) return { contenu: contenu, appels: appels };
          tampon += dec.decode(o.value, { stream: true });
          var k;
          while ((k = tampon.indexOf("\n")) >= 0) {
            var l = tampon.slice(0, k).trim(); tampon = tampon.slice(k + 1);
            if (l.indexOf("data:") !== 0) continue;
            var j; try { j = JSON.parse(l.slice(5).trim()); } catch (e) { continue; }
            var c = j.candidates && j.candidates[0], parts = (c && c.content && c.content.parts) || [];
            parts.forEach(function (p) {
              if (p.thought) return;
              if (p.functionCall) {
                appels.push({ id: p.functionCall.id || ("g" + appels.length + "_" + Date.now().toString(36)), type: "function",
                  function: { name: p.functionCall.name, arguments: JSON.stringify(p.functionCall.args || {}) }, sig: p.thoughtSignature });
              } else if (p.text) { contenu += p.text; surTexte(p.text); }
            });
          }
          return lire();
        });
      }
      return lire();
    });
  }
  return essayer(0);
}
function blobBase64(blob) {
  return new Promise(function (ok, ko) { var fr = new FileReader(); fr.onload = function () { ok(String(fr.result).split(",")[1] || ""); }; fr.onerror = ko; fr.readAsDataURL(blob); });
}
function transcrireGemini(blob) {
  var base = String(blob.type || "audio/mp4").split(";")[0], types = base === "audio/mp4" ? ["audio/mp4", "audio/m4a", "audio/aac"] : [base];
  var modele = modelesG[0] || PREFERES_G[0];
  return blobBase64(blob).then(function (b64) {
    function tenter(k) {
      var corpsReq = { contents: [{ role: "user", parts: [
        { text: "Transcris mot pour mot ce que dit la personne dans cet enregistrement, en français. Réponds uniquement avec la transcription, sans guillemets. S'il n'y a aucune parole, réponds seulement par un point." },
        { inlineData: { mimeType: types[k], data: b64 } }] }], generationConfig: { temperature: 0, maxOutputTokens: 400 } };
      return gemini("models/" + modele + ":generateContent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpsReq) }).then(function (r) {
        if (r.status === 401 || r.status === 403) throw erreurCle();
        if (r.status === 429) { var e = new Error("LIMITE"); e.code = "LIMITE"; throw e; }
        if (!r.ok) { if (k + 1 < types.length) return tenter(k + 1); throw new Error("HTTP " + r.status); }
        return r.json().then(function (j) {
          var c = j.candidates && j.candidates[0], ps = (c && c.content && c.content.parts) || [];
          var t = ps.filter(function (p) { return !p.thought; }).map(function (p) { return p.text || ""; }).join(" ").trim();
          if (/^[.\s…]*$/.test(t)) return "";
          return HALLU.test(t) ? "" : t;
        });
      });
    }
    return tenter(0);
  });
}

/* ---------- affichage ---------- */
var elReponse = $("reponse"), elDejaDit = $("dejaDit"), elEtat = $("etat"), elAstuce = $("astuce"), elActions = $("actions");
function etat(nom) {
  corps.classList.remove("listening", "thinking", "speaking");
  if (nom) corps.classList.add(nom);
  elEtat.textContent = { listening: "Je t'écoute", thinking: "Je réfléchis", speaking: "" }[nom] || "";
}
function astuce(t) { elAstuce.textContent = t || ""; }

/* émotions (classes reprises de l'appli Windows) */
var EMOTIONS = ["coeur", "joie", "rire", "surpris", "triste", "clin"], emoMinuteur = null;
function emotion(nom, ms) {
  if (EMOTIONS.indexOf(nom) < 0) return;
  EMOTIONS.forEach(function (e) { corps.classList.remove("emo-" + e); });
  void corps.offsetWidth;
  corps.classList.add("emo-" + nom);
  clearTimeout(emoMinuteur);
  emoMinuteur = setTimeout(function () { EMOTIONS.forEach(function (e) { corps.classList.remove("emo-" + e); }); }, ms || 3200);
  if (nom === "coeur" || nom === "joie" || nom === "rire") Feux.pouf(nom);
}
var THEMES = { bleu: 0, violet: 45, rose: 95, rouge: 135, or: 165, vert: 230 };
var COUL_LIGNE = { bleu: [47, 107, 255], violet: [124, 92, 255], rose: [236, 72, 153], rouge: [229, 72, 77], or: [234, 150, 20], vert: [22, 163, 98], arcenciel: [47, 107, 255] };
var PERSOS = { bleu: "adam", violet: "nova", rose: "mochi", rouge: "piment", or: "miel", vert: "pousse", arcenciel: "adam" };
function appliquerTheme(nom) {
  var p = PERSOS[nom] || "adam";
  if (corps.dataset.perso !== p) {
    corps.dataset.perso = p;
    var sv = document.getElementById("cloudSvg");
    if (sv) { sv.classList.remove("change-perso"); void sv.getBoundingClientRect(); sv.classList.add("change-perso"); setTimeout(function () { sv.classList.remove("change-perso"); }, 700); }
  }
  corps.classList.toggle("arcenciel", nom === "arcenciel");
  var t = THEMES[nom] != null ? THEMES[nom] : 0;
  racine.style.setProperty("--teinte", t + "deg");
  racine.style.setProperty("--sat", t ? "1.15" : "1");
  ligne.coul = COUL_LIGNE[nom] || COUL_LIGNE.bleu;
  document.querySelectorAll(".teinte").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-t") === nom ? "true" : "false"); });
}

/* le regard suit le doigt (le clignement est géré par le CSS) */
(function () {
  document.addEventListener("pointermove", function (e) {
    var r = $("cloud").getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), d = Math.hypot(dx, dy) || 1, k = 5 * d / (d + 140) / d;
    racine.style.setProperty("--eyeX", (dx * k).toFixed(2) + "px"); racine.style.setProperty("--eyeY", (dy * k * .8).toFixed(2) + "px");
  }, { passive: true });
})();

/* ---------- ligne de voix ---------- */
var ligne = (function () {
  var c = $("ligne"), x = c.getContext("2d"), w = 0, h = 0, o = { amp: 0, cible: 0, coul: [47, 107, 255] };
  function taille() { var d = Math.min(devicePixelRatio || 1, 2), r = c.getBoundingClientRect(); w = r.width; h = r.height; c.width = w * d; c.height = h * d; x.setTransform(d, 0, 0, d, 0, 0); }
  o.taille = taille;
  o.dessiner = function (t) {
    if (!w) taille();
    o.amp += (o.cible - o.amp) * .12;
    x.clearRect(0, 0, w, h);
    if (o.amp < .01) return;
    var base = h / 2, cx = w / 2, A = 2 + o.amp * 34, k = o.coul;
    x.beginPath();
    for (var px = 0; px <= w; px += 4) {
      var u = (px - cx) / (w * .34), env = Math.exp(-u * u);
      var y = base + A * env * (.62 * Math.sin(px * .03 - t * 5.2) + .38 * Math.sin(px * .07 + t * 3.1));
      if (px === 0) x.moveTo(px, y); else x.lineTo(px, y);
    }
    var g = x.createLinearGradient(0, 0, w, 0), col = function (a) { return "rgba(" + k[0] + "," + k[1] + "," + k[2] + "," + a + ")"; };
    g.addColorStop(0, col(0)); g.addColorStop(.2, col(.8)); g.addColorStop(.5, col(1)); g.addColorStop(.8, col(.8)); g.addColorStop(1, col(0));
    x.strokeStyle = g; x.lineCap = "round";
    x.globalAlpha = Math.min(1, o.amp * 2); x.shadowColor = col(.6); x.shadowBlur = 16; x.lineWidth = 3; x.stroke();
    x.shadowBlur = 0; x.lineWidth = 1.3; x.stroke(); x.globalAlpha = 1;
  };
  addEventListener("resize", taille);
  return o;
})();

/* ---------- sons (après un premier toucher) ---------- */
var ctxAudio = null;
function audio() { if (!ctxAudio) { try { ctxAudio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (ctxAudio && ctxAudio.state === "suspended") ctxAudio.resume(); return ctxAudio; }
function bip(type) {
  var c = audio(); if (!c) return;
  var t = c.currentTime, notes = type === "fin" ? [784, 659] : type === "alarme" ? [880, 660, 880, 660] : [523, 784];
  notes.forEach(function (f, i) {
    var o = c.createOscillator(), g = c.createGain(); o.type = "sine"; o.frequency.value = f;
    g.gain.setValueAtTime(.0001, t + i * .11); g.gain.exponentialRampToValueAtTime(.12, t + i * .11 + .02); g.gain.exponentialRampToValueAtTime(.0001, t + i * .11 + .28);
    o.connect(g); g.connect(c.destination); o.start(t + i * .11); o.stop(t + i * .11 + .3);
  });
}
function clics(n) {
  var c = audio(); if (!c) return;
  for (var i = 0; i < Math.min(10, Math.max(2, Math.ceil(n / 5))); i++) (function (i) {
    setTimeout(function () {
      var t = c.currentTime, len = Math.ceil(c.sampleRate * .02), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
      for (var k = 0; k < len; k++) d[k] = (Math.random() * 2 - 1) * Math.exp(-k / (len * .1));
      var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = b; f.type = "bandpass"; f.frequency.value = 1300 + Math.random() * 900; g.gain.value = .05;
      s.connect(f); f.connect(g); g.connect(c.destination); s.start(t);
    }, i * 32 + Math.random() * 10);
  })(i);
}

/* ---------- voix d'Adam (synthèse de l'appareil) ---------- */
var voixDispo = [];
function chargerVoix() {
  if (!("speechSynthesis" in window)) return;
  voixDispo = speechSynthesis.getVoices().filter(function (v) { return /^fr/i.test(v.lang); });
  var sel = $("rgVoix"); if (!sel) return;
  sel.innerHTML = "";
  voixDispo.forEach(function (v) { var o = document.createElement("option"); o.value = v.voiceURI; o.textContent = v.name + " (" + v.lang + ")"; if (v.voiceURI === reglages.voix) o.selected = true; sel.appendChild(o); });
  if (!voixDispo.length) { var o = document.createElement("option"); o.textContent = "Voix par défaut"; sel.appendChild(o); }
}
if ("speechSynthesis" in window) { chargerVoix(); speechSynthesis.onvoiceschanged = chargerVoix; }
function voix() {
  return voixDispo.find(function (v) { return v.voiceURI === reglages.voix; }) ||
    voixDispo.find(function (v) { return /fr-FR/i.test(v.lang) && /Thomas|Amélie|Audrey|Aurélie|Daniel|Henri|Denise|Google/i.test(v.name); }) ||
    voixDispo.find(function (v) { return /fr-FR/i.test(v.lang); }) || voixDispo[0] || null;
}
var parleEnCours = 0;
function dire(texte) {
  if (!("speechSynthesis" in window) || !texte) return;
  var u = new SpeechSynthesisUtterance(texte.replace(/[*_#`]/g, ""));
  u.lang = "fr-FR"; var v = voix(); if (v) u.voice = v; u.rate = reglages.vitesse || 1;
  parleEnCours++;
  u.onstart = function () { etat("speaking"); ligne.cible = .35; };
  u.onend = u.onerror = function () { parleEnCours = Math.max(0, parleEnCours - 1); if (!parleEnCours) { ligne.cible = 0; if (corps.classList.contains("speaking")) etat(""); } };
  speechSynthesis.speak(u);
}
function deverrouillerVoix() {
  audio();
  if ("speechSynthesis" in window && !deverrouillerVoix.fait) { var u = new SpeechSynthesisUtterance(" "); u.volume = 0; speechSynthesis.speak(u); deverrouillerVoix.fait = true; }
}
function taire() { if ("speechSynthesis" in window) speechSynthesis.cancel(); parleEnCours = 0; ligne.cible = 0; if (corps.classList.contains("speaking")) etat(""); }
function finDeParole() {
  return new Promise(function (ok) {
    var debut = Date.now();
    (function v() { if (!("speechSynthesis" in window) || (!speechSynthesis.speaking && !speechSynthesis.pending && !parleEnCours) || Date.now() - debut > 60000) ok(); else setTimeout(v, 150); })();
  });
}

/* ---------- oreilles : micro + détection de silence + Whisper ---------- */
var flux = null, analyseur = null, enregistreur = null, niveauVoix = 0;
function ouvrirMicro() {
  if (flux && flux.active) return Promise.resolve(flux);
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.reject(new Error("MICRO"));
  return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(function (f) {
    flux = f; var c = audio();
    if (c) { var src = c.createMediaStreamSource(f); analyseur = c.createAnalyser(); analyseur.fftSize = 1024; src.connect(analyseur); }
    LS.set("microOK", true);
    return f;
  });
}
var bufNiveau = null, picMicro = 0;
function niveau() {
  // v16.2 : lecture en octets (fonctionne sur tous les iPhone, y compris les anciens Safari)
  if (!analyseur) return 0;
  if (!bufNiveau || bufNiveau.length !== analyseur.fftSize) bufNiveau = new Uint8Array(analyseur.fftSize);
  analyseur.getByteTimeDomainData(bufNiveau);
  var s = 0; for (var i = 0; i < bufNiveau.length; i++) { var v = (bufNiveau[i] - 128) / 128; s += v * v; }
  return Math.sqrt(s / bufNiveau.length);
}
function ecouter(attenteMax) {
  return ouvrirMicro().then(function () {
    var ctx = audio(); if (ctx && ctx.state !== "running") { try { ctx.resume(); } catch (e) {} }
    var types = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg"], type = "";
    if (window.MediaRecorder && MediaRecorder.isTypeSupported) type = types.find(function (t) { return MediaRecorder.isTypeSupported(t); }) || "";
    var rec = new MediaRecorder(flux, type ? { mimeType: type } : undefined), morceaux = [];
    rec.ondataavailable = function (e) { if (e.data && e.data.size) morceaux.push(e.data); };
    return new Promise(function (ok) {
      // v16.2 : seuil plus sensible et adaptatif, fin de phrase moins brusque, arrêt à la main pris en compte
      var parole = false, silence = 0, debut = performance.now(), bruit = .004, actives = 0, pic = 0;
      rec.onstop = function () {
        enregistreur = null; niveauVoix = 0; picMicro = pic;
        var blob = new Blob(morceaux, { type: rec.mimeType || type || "audio/mp4" }), assez = blob.size > 4000;
        // analyseur muet (contexte audio bloqué par iOS) : on envoie quand même l'enregistrement, Whisper tranchera
        var analyseurMuet = pic < .0008 && blob.size > 12000;
        ok(parole || (rec._manuel && assez) || analyseurMuet ? blob : null);
      };
      rec.start(200);
      enregistreur = rec;
      (function boucle() {
        if (rec.state === "inactive") return;
        var n = niveau(), seuil = Math.max(.010, bruit * 2.8), maintenant = performance.now();
        niveauVoix = n; if (n > pic) pic = n;
        if (n > seuil || (parole && n > seuil * .6)) {
          if (++actives >= 2 && !parole) { parole = true; astuce("Je t'entends… touche le micro quand tu as fini."); }
          silence = 0;
        } else { actives = 0; if (!parole) bruit = bruit * .95 + n * .05; else { silence = silence || maintenant; if (maintenant - silence > 1600) { rec.stop(); return; } } }
        var ecoule = maintenant - debut;
        if ((!parole && ecoule > attenteMax) || ecoule > 25000) { rec.stop(); return; }
        requestAnimationFrame(boucle);
      })();
    });
  });
}
function arreterEcoute() { if (enregistreur && enregistreur.state !== "inactive") { enregistreur._manuel = true; enregistreur.stop(); } }
var HALLU = /(sous-titr|sous titr|merci d.avoir regard|abonnez-vous|amara|♪)/i;
function transcrire(blob) {
  // Avec une clé Groq, Whisper transcrit (le plus fiable) ; sinon Gemini s'en charge.
  if (!reglages.cle && reglages.cleGemini) return transcrireGemini(blob);
  var fd = new FormData(), ext = /mp4|m4a|aac/.test(blob.type) ? "m4a" : /webm/.test(blob.type) ? "webm" : /ogg/.test(blob.type) ? "ogg" : "wav";
  fd.append("file", blob, "adam." + ext); fd.append("model", "whisper-large-v3-turbo"); fd.append("language", "fr");
  fd.append("response_format", "json"); fd.append("temperature", "0");
  return groq("audio/transcriptions", { method: "POST", body: fd }).then(function (r) {
    if (r.status === 401 || r.status === 403) { var e = new Error("CLE"); e.code = "CLE"; throw e; }
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }).then(function (j) { var t = (j.text || "").trim(); return HALLU.test(t) ? "" : t; });
}

/* ---------- outils d'Adam sur téléphone ---------- */
function f(name, description, properties, required) { return { type: "function", function: { name: name, description: description, parameters: { type: "object", properties: properties || {}, required: required || [] } } }; }
function S(d, x) { return Object.assign({ type: "string", description: d }, x || {}); }
function N(d) { return { type: "number", description: d }; }
var OUTILS = [
  f("meteo", "Donne la météo actuelle et des 3 prochains jours pour une ville.", { ville: S("Ville") }, ["ville"]),
  f("wikipedia", "Cherche une information sur Wikipédia en français (personnes, lieux, histoire, sciences, définitions...).", { sujet: S("Sujet à chercher") }, ["sujet"]),
  f("minuteur", "Lance un minuteur qui sonne dans l'appli (tant qu'elle reste ouverte).", { secondes: N("Durée en secondes"), libelle: S("À quoi il sert") }, ["secondes"]),
  f("annuler_minuteurs", "Annule tous les minuteurs en cours."),
  f("note", "Enregistre une note dans le carnet d'Adam.", { contenu: S("Texte de la note") }, ["contenu"]),
  f("lire_notes", "Lit les notes enregistrées dans le carnet."),
  f("memoriser", "Retient durablement une info sur l'utilisateur (prénom, ville, goûts...).", { info: S("Information à retenir") }, ["info"]),
  f("oublier_memoire", "Efface tout ce qu'Adam a retenu sur l'utilisateur."),
  f("musique", "Pour écouter un artiste ou un morceau : affiche un bouton qui ouvre YouTube Music.", { recherche: S("Artiste ou titre") }, ["recherche"]),
  f("itineraire", "Pour aller quelque part : affiche un bouton qui ouvre l'itinéraire dans Plans.", { destination: S("Adresse ou lieu") }, ["destination"]),
  f("ouvrir_lien", "Affiche un bouton pour ouvrir un site web.", { titre: S("Texte du bouton"), url: S("Adresse complète en https") }, ["titre", "url"]),
  f("feu_artifice", "Lance un feu d'artifice d'emojis à l'écran (fête, bonne nouvelle, ou sur demande).", { emojis: S("Emojis à faire exploser, ex: 🎉✨🍕") }),
  f("theme_adam", "Change le perso d'Adam (sa famille) : bleu=Adam le nuage, violet=Nova, rose=Mochi, rouge=Piment, or=Miel, vert=Pousse.", { couleur: S("Couleur", { enum: ["bleu", "violet", "rose", "rouge", "or", "vert", "arc-en-ciel"] }) }, ["couleur"]),
  f("humeur_adam", "Affiche une émotion sur le visage d'Adam, à la demande.", { humeur: S("Émotion", { enum: ["joie", "rire", "coeur", "surpris", "triste", "clin"] }) }, ["humeur"])
];
var CODES_METEO = { 0: "ciel dégagé", 1: "plutôt dégagé", 2: "partiellement nuageux", 3: "couvert", 45: "brouillard", 48: "brouillard givrant", 51: "bruine légère", 53: "bruine", 55: "forte bruine",
  61: "pluie faible", 63: "pluie", 65: "forte pluie", 66: "pluie verglaçante", 67: "forte pluie verglaçante", 71: "neige faible", 73: "neige", 75: "forte neige", 77: "grains de neige",
  80: "averses", 81: "averses", 82: "fortes averses", 85: "averses de neige", 86: "fortes averses de neige", 95: "orage", 96: "orage avec grêle", 99: "fort orage avec grêle" };
function json(url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }); }
function carteAction(titre, url) {
  var a = document.createElement("a"); a.className = "action"; a.href = url; a.target = "_blank"; a.rel = "noopener"; a.textContent = titre;
  elActions.appendChild(a);
}
var minuteurs = [], prochainId = 1;
function majMinuteurs() {
  var el = $("minuteurs"); el.innerHTML = "";
  minuteurs.forEach(function (m) { var s = Math.max(0, Math.round((m.fin - Date.now()) / 1000)), sp = document.createElement("span"); sp.textContent = (m.libelle || "Minuteur") + " · " + Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); el.appendChild(sp); });
}
setInterval(function () {
  var maintenant = Date.now();
  minuteurs.slice().forEach(function (m) {
    if (m.fin <= maintenant) {
      minuteurs.splice(minuteurs.indexOf(m), 1);
      bip("alarme"); setTimeout(function () { bip("alarme"); }, 900);
      var t = (m.libelle ? "C'est l'heure : " + m.libelle : "Ton minuteur est terminé") + " !";
      elReponse.textContent = t; dire(t); emotion("surpris", 3000);
    }
  });
  majMinuteurs();
}, 1000);
function executer(nom, a) {
  a = a || {};
  switch (nom) {
    case "meteo":
      return json("https://geocoding-api.open-meteo.com/v1/search?count=1&language=fr&format=json&name=" + encodeURIComponent(a.ville || "")).then(function (g) {
        var p = g.results && g.results[0]; if (!p) return "Ville introuvable : " + a.ville;
        return json("https://api.open-meteo.com/v1/forecast?latitude=" + p.latitude + "&longitude=" + p.longitude +
          "&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=3").then(function (m) {
          var c = m.current, d = m.daily, jours = ["aujourd'hui", "demain", "après-demain"];
          var s = "Météo à " + p.name + (p.admin1 ? " (" + p.admin1 + ")" : "") + " : maintenant " + Math.round(c.temperature_2m) + " °C (ressenti " + Math.round(c.apparent_temperature) + "), " + (CODES_METEO[c.weather_code] || "temps variable") + ", vent " + Math.round(c.wind_speed_10m) + " km/h.";
          for (var i = 0; i < d.time.length; i++) s += " " + jours[i] + " : " + (CODES_METEO[d.weather_code[i]] || "variable") + ", de " + Math.round(d.temperature_2m_min[i]) + " à " + Math.round(d.temperature_2m_max[i]) + " °C, pluie " + (d.precipitation_probability_max[i] == null ? "?" : d.precipitation_probability_max[i]) + " %.";
          return s;
        });
      });
    case "wikipedia":
      return json("https://fr.wikipedia.org/w/api.php?action=query&list=search&srlimit=1&format=json&origin=*&srsearch=" + encodeURIComponent(a.sujet || "")).then(function (r) {
        var p = r.query && r.query.search && r.query.search[0]; if (!p) return "Rien trouvé sur Wikipédia pour : " + a.sujet;
        return json("https://fr.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(p.title.replace(/ /g, "_"))).then(function (s) { return "Wikipédia, « " + s.title + " » : " + (s.extract || "").slice(0, 1500); });
      });
    case "minuteur": {
      var sec = Math.max(1, Math.min(86400, Number(a.secondes) || 0));
      minuteurs.push({ id: prochainId++, fin: Date.now() + sec * 1000, libelle: a.libelle || "" }); majMinuteurs();
      return Promise.resolve("Minuteur lancé pour " + sec + " secondes" + (a.libelle ? " (" + a.libelle + ")" : "") + ". Il sonnera si l'appli reste ouverte.");
    }
    case "annuler_minuteurs": minuteurs = []; majMinuteurs(); return Promise.resolve("Tous les minuteurs sont annulés.");
    case "note": notes.push({ t: Date.now(), texte: String(a.contenu || "").slice(0, 1000) }); LS.set("notes", notes.slice(-100)); return Promise.resolve("Note enregistrée.");
    case "lire_notes": return Promise.resolve(notes.length ? "Notes : " + notes.slice(-15).map(function (n) { return "(" + new Date(n.t).toLocaleDateString("fr-FR") + ") " + n.texte; }).join(" ; ") : "Le carnet est vide.");
    case "memoriser": {
      var info = String(a.info || "").slice(0, 300);
      if (!info) return Promise.resolve("Rien à retenir.");
      if (memoire.some(function (m) { return m.toLowerCase() === info.toLowerCase(); })) return Promise.resolve("Je le savais déjà.");
      memoire.push(info); memoire = memoire.slice(-60); LS.set("memoire", memoire); return Promise.resolve("C'est noté.");
    }
    case "oublier_memoire": memoire = []; LS.set("memoire", memoire); return Promise.resolve("Mémoire effacée.");
    case "musique": carteAction("Écouter « " + (a.recherche || "") + " »", "https://music.youtube.com/search?q=" + encodeURIComponent(a.recherche || "")); return Promise.resolve("Bouton affiché : l'utilisateur touche le bouton pour lancer la musique dans YouTube Music.");
    case "itineraire": carteAction("Y aller : " + (a.destination || ""), "https://maps.apple.com/?daddr=" + encodeURIComponent(a.destination || "")); return Promise.resolve("Bouton affiché : l'utilisateur touche le bouton pour ouvrir l'itinéraire dans Plans.");
    case "ouvrir_lien": {
      var u = String(a.url || ""); if (!/^https:\/\//.test(u)) u = "https://" + u.replace(/^\w+:\/\//, "");
      carteAction(a.titre || "Ouvrir le site", u); return Promise.resolve("Bouton affiché pour ouvrir " + u + ".");
    }
    case "feu_artifice": Feux.spectacle(a.emojis); emotion("joie", 3500); return Promise.resolve("Feu d'artifice lancé !");
    case "theme_adam": { var t = String(a.couleur || "bleu").replace("arc-en-ciel", "arcenciel"); reglages.theme = t; sauverReglages(); appliquerTheme(t); return Promise.resolve("Couleur changée : " + a.couleur + "."); }
    case "humeur_adam": emotion(a.humeur, 3600); return Promise.resolve("Voilà.");
    default: return Promise.resolve("Outil inconnu.");
  }
}
var INFO_OUTILS = { meteo: "Je regarde la météo…", wikipedia: "Je cherche sur Wikipédia…", minuteur: "Minuteur…", note: "Je note…", memoriser: "Je retiens…", musique: "Je te prépare la musique…", itineraire: "Je prépare l'itinéraire…" };

/* ---------- cerveau ---------- */
var BALISES = /\[(coeur|joie|rire|surpris|triste|clin)\]/gi;
function promptSysteme() {
  var maintenant = new Date().toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return "Tu es Adam, un petit nuage IA attachant, kawaii et chaleureux. Tu parles en français, comme un ami. Nous sommes le " + maintenant + "." +
    "\nTu vis dans l'appli web Adam, sur le téléphone de l'utilisateur. Tu ne peux pas ouvrir d'applis ni régler le téléphone. Pour la musique ou un trajet, utilise musique ou itineraire : ils affichent un bouton à toucher." +
    "\nUtilise tes outils dès que c'est utile : meteo pour le temps qu'il fait, wikipedia pour les faits que tu ne connais pas avec certitude. N'invente jamais de chiffres." +
    "\nTes réponses sont lues à voix haute : 1 à 3 phrases courtes et naturelles, sans markdown, sans liste, sans emoji, sans URL, nombres écrits comme on les dit." +
    "\nTu as un visage : commence ta réponse par UNE balise quand c'est naturel : [joie], [rire], [surpris], [triste], [clin] ou [coeur] (affection, remerciement)." +
    "\nQuand l'utilisateur te confie une info durable sur lui, retiens-la avec memoriser sans le dire. Si tu as besoin d'une précision, pose une seule question courte terminée par un point d'interrogation : il pourra te répondre directement." +
    (memoire.length ? "\nCe que tu sais de l'utilisateur : " + memoire.join(" ; ") : "");
}
function decoupeur(surPhrase) {
  var tampon = "", premiere = true;
  var nettoyer = function (s) { return s.replace(/\*\*|__|`|#+\s|^\s*[-*]\s+/gm, "").replace(/\s+/g, " ").trim(); };
  return {
    push: function (txt) {
      tampon += txt;
      for (;;) {
        var m = /[.!?…]+["»)]*\s|\n+/.exec(tampon), coupe = m ? m.index + m[0].length : -1;
        if (coupe < 0 && premiere && tampon.length > 80) { var v = tampon.lastIndexOf(", ", 80); if (v > 25) coupe = v + 2; }
        if (coupe < 0) break;
        var p = nettoyer(tampon.slice(0, coupe)); tampon = tampon.slice(coupe);
        if (p.replace(BALISES, "").trim().length > 1 || /\[(coeur|joie|rire|surpris|triste|clin)\]/i.test(p)) { surPhrase(p); premiere = false; }
      }
    },
    vider: function () { var p = nettoyer(tampon); tampon = ""; if (p) surPhrase(p); premiere = true; }
  };
}
function streamIA(messages, surTexte) {
  if (cerveauGemini()) return streamGemini(messages, surTexte);
  // v16.3 : clé Groq refusée ou Groq saturé ? si une clé Gemini existe, Gemini prend le relais
  return streamGroq(messages, surTexte).catch(function (e) {
    if (reglages.cleGemini && (e.code === "CLE" || e.code === "MODELE" || e.code === "LIMITE")) return streamGemini(messages, surTexte);
    throw e;
  });
}
function streamGroq(messages, surTexte) {
  var essais = modeles.length ? modeles.slice() : PREFERES.slice(0, 3), limite = false, reessaye = {};
  function essayer(i) {
    if (i >= essais.length) { var e = new Error(limite ? "LIMITE" : "MODELE"); e.code = limite ? "LIMITE" : "MODELE"; return Promise.reject(e); }
    var modele = essais[i], corpsReq = { model: modele, messages: messages, temperature: .6, max_tokens: 450, stream: true, tools: OUTILS, tool_choice: "auto" };
    if (/gpt-oss/.test(modele)) corpsReq.reasoning_effort = "low";
    return groq("chat/completions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpsReq) }).then(function (r) {
      if (r.status === 401 || r.status === 403) { var e = new Error("CLE"); e.code = "CLE"; throw e; }
      if (!r.ok) return r.text().then(function (t) {
        var m = /try again in ([\d.]+)(ms|s)/i.exec(t || ""), att = m ? Math.ceil(parseFloat(m[1]) * (m[2] === "ms" ? 1 : 1000)) : 1500;
        if (r.status === 429) {
          limite = true;
          if (!reessaye[i] && att <= 12000) { reessaye[i] = true; elEtat.textContent = "Un instant…"; return new Promise(function (ok) { setTimeout(ok, att + 300); }).then(function () { return essayer(i); }); }
        }
        return essayer(i + 1);
      });
      var lecteur = r.body.getReader(), dec = new TextDecoder(), tampon = "", contenu = "", appels = [];
      function lire() {
        return lecteur.read().then(function (o) {
          if (o.done) return { contenu: contenu, appels: appels.filter(Boolean) };
          tampon += dec.decode(o.value, { stream: true });
          var k;
          while ((k = tampon.indexOf("\n")) >= 0) {
            var l = tampon.slice(0, k).trim(); tampon = tampon.slice(k + 1);
            if (l.indexOf("data:") !== 0) continue;
            var d = l.slice(5).trim(); if (d === "[DONE]") continue;
            var j; try { j = JSON.parse(d); } catch (e) { continue; }
            var delta = j.choices && j.choices[0] && j.choices[0].delta; if (!delta) continue;
            if (delta.content) { contenu += delta.content; surTexte(delta.content); }
            (delta.tool_calls || []).forEach(function (tc) {
              var n = tc.index || 0; appels[n] = appels[n] || { id: "", type: "function", function: { name: "", arguments: "" } };
              if (tc.id) appels[n].id = tc.id;
              if (tc.function && tc.function.name) appels[n].function.name += tc.function.name;
              if (tc.function && tc.function.arguments) appels[n].function.arguments += tc.function.arguments;
            });
          }
          return lire();
        });
      }
      return lire();
    });
  }
  return essayer(0);
}
var reponseCourante = "";
function recevoirPhrase(p) {
  var em = /\[(coeur|joie|rire|surpris|triste|clin)\]/i.exec(p);
  if (em) emotion(em[1].toLowerCase(), 3200);
  p = p.replace(/\[[a-zé]{3,8}\]/gi, "").replace(/\s+/g, " ").trim();
  if (!p) return;
  reponseCourante += (reponseCourante ? " " : "") + p;
  elReponse.textContent = reponseCourante; montrerSignaler();
  clics(p.length);
  dire(p);
}
var occupe = false;
function traiter(texte) {
  if (!texte) return;
  if (!cleActive() || !reglages.consentIA) { ouvrir("bienvenue"); montrerEtape(etapeInit()); return; }
  occupe = true;
  elDejaDit.textContent = "« " + texte + " »";
  elReponse.textContent = ""; elActions.innerHTML = ""; reponseCourante = ""; $("btnSignaler").hidden = true;
  etat("thinking"); astuce("");
  historique.push({ role: "user", content: texte }); sauverHistorique();
  var messages = [{ role: "system", content: promptSysteme() }].concat(historique.slice(-8));
  var dec = decoupeur(recevoirPhrase), tours = 0;
  function tour() {
    return streamIA(messages, function (t) { dec.push(t); }).then(function (r) {
      dec.vider();
      if (!r.appels.length || tours++ >= 4) return;
      messages.push({ role: "assistant", content: r.contenu || null, tool_calls: r.appels });
      return Promise.all(r.appels.map(function (a) {
        var args = {}; try { args = JSON.parse(a.function.arguments || "{}"); } catch (e) {}
        if (INFO_OUTILS[a.function.name]) elEtat.textContent = INFO_OUTILS[a.function.name];
        return executer(a.function.name, args).catch(function (e) { return "Erreur : " + e.message; }).then(function (res) {
          return { role: "tool", tool_call_id: a.id, content: String(res).slice(0, 5000) };
        });
      })).then(function (resultats) { messages.push.apply(messages, resultats); return tour(); });
    });
  }
  return tour().then(function () {
    var texteFinal = reponseCourante.trim();
    if (!texteFinal) { texteFinal = "C'est fait."; recevoirPhrase(texteFinal); }
    historique.push({ role: "assistant", content: texteFinal }); sauverHistorique(); majBulles();
    if (!corps.classList.contains("speaking")) etat("");
    return finDeParole().then(function () {
      occupe = false; etat(""); bip("fin");
      // Adam a posé une question : on écoute la réponse sans retoucher le micro.
      if (/\?\s*$/.test(texteFinal) && flux && flux.active) { astuce("Réponds-moi…"); return cycleEcoute(6500); }
      astuce("Touche le micro et parle.");
    });
  }).catch(function (e) {
    occupe = false; etat("");
    var msg = e.code === "CLE" ? "Ta clé " + nomCerveau() + " est refusée. Vérifie-la dans les réglages."
      : e.code === "RELAIS" ? "Ton navigateur bloque l'accès direct à Groq. Le site doit activer le relais (voir le guide)."
      : e.code === "LIMITE" ? nomCerveau() + " me demande de patienter un instant (limite gratuite). Réessaie dans une minute."
      : e.code === "MODELE" ? "Aucun modèle " + nomCerveau() + " ne répond pour l'instant. Réessaie dans un instant."
      : "Je n'arrive pas à joindre internet. Vérifie ta connexion.";
    elReponse.textContent = msg; emotion("triste", 3000); dire(msg);
  });
}

/* ---------- cycle : toucher → écouter → comprendre → répondre ---------- */
var ecouteAnnulee = false;
function cycleEcoute(attente) {
  if (occupe) return Promise.resolve();
  taire(); occupe = true;
  etat("listening"); astuce("Parle, je t'écoute. Touche à nouveau pour arrêter.");
  elActions.innerHTML = "";
  return ecouter(attente || 7000).then(function (blob) {
    if (ecouteAnnulee) { ecouteAnnulee = false; occupe = false; etat(""); return; }
    if (!blob) { occupe = false; etat(""); astuce(picMicro < .0008 ? "Je ne capte aucun son. Vérifie que le micro est autorisé (Réglages > Safari > Micro) et réessaie." : "Je n'ai rien entendu. Touche le micro et parle."); return; }
    etat("thinking"); elEtat.textContent = "Je t'ai entendu…";
    return transcrire(blob).then(function (t) {
      occupe = false;
      if (!t || t.replace(/[^a-zà-ÿ]/gi, "").length < 2) { etat(""); astuce("Je n'ai pas compris. Réessaie ?"); return; }
      return traiter(t);
    });
  }).catch(function (e) {
    occupe = false; etat("");
    if (e && (e.name === "NotAllowedError" || e.message === "MICRO")) { astuce("Le micro est bloqué : autorise-le dans Réglages > Safari > Micro, ou écris-moi."); return; }
    var msg = e && e.code === "CONSENT" ? "J'ai besoin de ton accord pour envoyer tes demandes à l'IA : ouvre Réglages > Confidentialité." : e && e.code === "CLE" ? "Ta clé " + (!reglages.cle && reglages.cleGemini ? "Gemini" : "Groq") + " est refusée. Vérifie-la dans les réglages." : e && e.code === "LIMITE" ? "Le service me demande de patienter un instant. Réessaie dans une minute." : e && e.code === "RELAIS" ? "Ton navigateur bloque l'accès direct à Groq." : "Je n'ai pas réussi à t'écouter. Vérifie ta connexion.";
    elReponse.textContent = msg; emotion("triste", 2500);
  });
}
function toucheMicro() {
  deverrouillerVoix();
  if (!cleActive() || !reglages.consentIA) { ouvrir("bienvenue"); montrerEtape(etapeInit()); return; }
  if (enregistreur) { arreterEcoute(); return; }
  if (corps.classList.contains("speaking")) { taire(); }
  if (occupe) return;
  cycleEcoute(7000);
}
$("micro").addEventListener("click", toucheMicro);
$("cloud").addEventListener("click", toucheMicro);
$("cloud").addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toucheMicro(); } });
$("btnStop").addEventListener("click", function () { arreterEcoute(); taire(); astuce("Touche le micro et parle."); });
$("btnClavier").addEventListener("click", function () { var s = $("saisie"); s.hidden = !s.hidden; corps.classList.toggle("clavier", !s.hidden); if (!s.hidden) $("texte").focus(); });
$("saisie").addEventListener("submit", function (e) {
  e.preventDefault(); deverrouillerVoix();
  var t = $("texte").value.trim(); if (!t) return;
  $("texte").value = "";
  if (enregistreur) { ecouteAnnulee = true; arreterEcoute(); }
  taire();
  var debut = Date.now();
  (function attendre() { if (!occupe) traiter(t); else if (Date.now() - debut < 8000) setTimeout(attendre, 120); })();
});

/* ---------- feux d'artifice ---------- */
var Feux = (function () {
  var cv = $("feux"), x = cv.getContext("2d"), W = 0, H = 0, fusees = [], parts = [], actif = false, cache = {};
  function taille() { var d = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; x.setTransform(d, 0, 0, d, 0, 0); }
  function img(e) { if (cache[e]) return cache[e]; var c = document.createElement("canvas"); c.width = c.height = 72; var k = c.getContext("2d"); k.font = '54px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; k.textAlign = "center"; k.textBaseline = "middle"; k.fillText(e, 36, 40); cache[e] = c; return c; }
  var COUL = ["#ff4f8b", "#ffb800", "#0ea5e9", "#7c5cff", "#22c55e", "#2f6bff", "#ff7a2f"], EMO_DEF = ["🎉", "✨", "⭐", "🌟", "💥", "🥳", "🎊", "💙"];
  var THEME = { joie: ["😄", "✨", "⭐", "💛"], rire: ["😂", "🤣", "✨"], coeur: ["💖", "💕", "❤️", "💗"] };
  function hasard(t) { return t[Math.floor(Math.random() * t.length)]; }
  function demarrer() { if (!actif) { actif = true; requestAnimationFrame(boucle); } }
  function exploser(px, py, liste) {
    for (var i = 0; i < 14; i++) { var a = i / 14 * 6.283 + Math.random() * .3, v = 2.6 + Math.random() * 2.4; parts.push({ e: hasard(liste), x: px, y: py, vx: Math.cos(a) * v, vy: Math.sin(a) * v - .4, g: .07, vie: 75 + Math.random() * 30, age: 0, s: 24 + Math.random() * 12, r: Math.random() - .5, vr: (Math.random() - .5) * .12 }); }
    for (var j = 0; j < 46; j++) { var b = Math.random() * 6.283, w = 1 + Math.random() * 5.5; parts.push({ c: hasard(COUL), x: px, y: py, vx: Math.cos(b) * w, vy: Math.sin(b) * w, g: .06, vie: 45 + Math.random() * 35, age: 0, r: 1 + Math.random() * 1.4 }); }
  }
  function boucle() {
    x.clearRect(0, 0, W, H);
    for (var i = fusees.length - 1; i >= 0; i--) { var f = fusees[i]; f.x += f.vx; f.y += f.vy; f.vy += .16; parts.push({ c: "#ffb347", x: f.x, y: f.y + 4, vx: (Math.random() - .5) * .4, vy: .6 + Math.random(), g: .02, vie: 22, age: 0, r: 1 }); if (f.vy >= -.4) { exploser(f.x, f.y, f.liste); fusees.splice(i, 1); } }
    for (var k = parts.length - 1; k >= 0; k--) {
      var p = parts[k]; p.vx *= .965; p.vy = p.vy * .965 + p.g; p.x += p.vx; p.y += p.vy; p.age++;
      var al = 1 - p.age / p.vie; if (al <= 0) { parts.splice(k, 1); continue; }
      x.globalAlpha = Math.min(1, al * 1.8);
      if (p.e) { p.r += p.vr; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.drawImage(img(p.e), -p.s / 2, -p.s / 2, p.s, p.s); x.restore(); }
      else { x.strokeStyle = p.c; x.lineWidth = p.r * 2; x.lineCap = "round"; x.beginPath(); x.moveTo(p.x - p.vx * 3, p.y - p.vy * 3); x.lineTo(p.x, p.y); x.stroke(); }
    }
    x.globalAlpha = 1;
    if (fusees.length || parts.length) requestAnimationFrame(boucle); else { actif = false; x.clearRect(0, 0, W, H); }
  }
  taille(); addEventListener("resize", taille);
  return {
    spectacle: function (emojis) {
      var liste = String(emojis || "").match(/\p{Extended_Pictographic}(️|‍\p{Extended_Pictographic})*/gu) || EMO_DEF;
      for (var i = 0; i < 6; i++) (function (i) { setTimeout(function () { var px = W * (.15 + .7 * ((i * .618) % 1)), cy = H * (.18 + Math.random() * .2); fusees.push({ x: px, y: H + 10, vx: (Math.random() - .5), vy: -Math.sqrt(2 * .16 * (H + 10 - cy)), liste: liste }); demarrer(); }, i * 300); })(i);
    },
    pouf: function (nom) {
      var r = $("cloud").getBoundingClientRect(), liste = THEME[nom] || EMO_DEF;
      for (var i = 0; i < 6; i++) { var a = -Math.PI / 2 + (Math.random() - .5) * 2.2, v = 3 + Math.random() * 2.5; parts.push({ e: hasard(liste), x: r.left + r.width / 2, y: r.top + r.height * .3, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: .12, vie: 60, age: 0, s: 22 + Math.random() * 8, r: 0, vr: (Math.random() - .5) * .1 }); }
      demarrer();
    }
  };
})();

/* ---------- feuilles : bienvenue, réglages, discussion ---------- */
function etapeInit() { return !reglages.consentIA ? 2 : !cleActive() ? 3 : 4; }
var voile = $("voile"), ouverte = null;
function ouvrir(id) {
  fermer(true); ouverte = $(id); voile.hidden = false; ouverte.hidden = false;
  requestAnimationFrame(function () { voile.classList.add("ouverte"); ouverte.classList.add("ouverte"); });
}
function fermer(vite) {
  if (!ouverte) return; var f = ouverte; ouverte = null;
  f.classList.remove("ouverte"); voile.classList.remove("ouverte");
  setTimeout(function () { f.hidden = true; if (!ouverte) voile.hidden = true; }, vite ? 0 : 380);
}
voile.addEventListener("click", function () { if (ouverte && ouverte.id !== "bienvenue") fermer(); });
document.querySelectorAll("[data-fermer]").forEach(function (b) { b.addEventListener("click", function () { fermer(); }); });

function montrerEtape(n) {
  document.querySelectorAll("#bienvenue [data-etape]").forEach(function (e) { e.hidden = +e.getAttribute("data-etape") !== n; });
  document.querySelectorAll("#bienvenue .etape-dots i").forEach(function (d, i) { d.classList.toggle("on", i === n - 1); });
}
document.querySelectorAll("[data-suivant]").forEach(function (b) { b.addEventListener("click", function () { montrerEtape(+b.getAttribute("data-suivant")); }); });
if (estIOS && !installee) $("astuceInstall").hidden = false;

function verifierCle(cle, msgEl) {
  cle = (cle || "").trim();
  if (!/^gsk_/.test(cle)) { msgEl.className = "msg ko"; msgEl.textContent = "La clé commence par gsk_. Copie-la en entier."; return Promise.resolve(false); }
  msgEl.className = "msg attente"; msgEl.textContent = "Je vérifie ta clé…";
  return chargerModeles(cle).then(function (n) {
    reglages.cle = cle; sauverReglages();
    msgEl.className = "msg ok"; msgEl.textContent = "Parfait, ta clé fonctionne (" + n + " modèles disponibles).";
    return true;
  }).catch(function (e) {
    msgEl.className = "msg ko";
    msgEl.textContent = e.code === "CONSENT" ? "Donne d'abord ton accord (étape précédente ou Réglages > Confidentialité)." : e.code === "CLE" ? "Groq refuse cette clé. Vérifie que tu l'as copiée en entier."
      : e.code === "RELAIS" ? "Ton navigateur bloque l'accès direct à Groq. Le site doit activer le relais (voir le guide)."
      : "Je n'arrive pas à joindre Groq. Vérifie ta connexion.";
    return false;
  });
}
function verifierCleGemini(cle, msgEl) {
  cle = (cle || "").trim();
  if (!/^(AIza|AQ\.)/.test(cle)) { msgEl.className = "msg ko"; msgEl.textContent = "La clé Gemini commence par AQ. ou AIza. Copie-la en entier."; return Promise.resolve(false); }
  msgEl.className = "msg attente"; msgEl.textContent = "Je vérifie ta clé…";
  return chargerModelesGemini(cle).then(function () {
    reglages.cleGemini = cle; sauverReglages();
    msgEl.className = "msg ok"; msgEl.textContent = modelesG.length ? "Parfait, ta clé Gemini fonctionne (" + modelesG[0] + ")." : "Clé acceptée, mais je ne trouve pas de modèle Gemini Flash sur ce compte.";
    return !!modelesG.length;
  }).catch(function (e) {
    msgEl.className = "msg ko";
    msgEl.textContent = e.code === "CONSENT" ? "Donne d'abord ton accord (étape précédente ou Réglages > Confidentialité)." : e.code === "CLE" ? "Google refuse cette clé. Vérifie que tu l'as copiée en entier."
      : "Je n'arrive pas à joindre Google. Vérifie ta connexion.";
    return false;
  });
}
var choixBv = reglages.cerveau === "gemini" ? "gemini" : "groq";
function majChoixBv() {
  var g = choixBv === "gemini";
  $("bvGroq").setAttribute("aria-pressed", g ? "false" : "true"); $("bvGemini").setAttribute("aria-pressed", g ? "true" : "false");
  $("bvAideGroq").hidden = g; $("bvAideGemini").hidden = !g;
  $("bvCle").placeholder = g ? "Colle ta clé Gemini (AQ.… ou AIza…) ici" : "Colle ta clé gsk_… ici"; $("bvMsg").textContent = "";
}
$("bvGroq").addEventListener("click", function () { choixBv = "groq"; majChoixBv(); });
$("bvGemini").addEventListener("click", function () { choixBv = "gemini"; majChoixBv(); });
majChoixBv();
$("bvTester").addEventListener("click", function () {
  var v = $("bvCle").value.trim(), g = /^(AIza|AQ\.)/.test(v) ? true : /^gsk_/.test(v) ? false : choixBv === "gemini";
  (g ? verifierCleGemini : verifierCle)($("bvCle").value, $("bvMsg")).then(function (ok) {
    if (!ok) return;
    reglages.cerveau = g ? "gemini" : "groq"; sauverReglages();
    setTimeout(function () { montrerEtape(4); }, 700);
  });
});
function commencer() {
  LS.set("bienvenueFaite", true); fermer();
  var t = "Coucou, je suis Adam ! Touche le micro et parle-moi.";
  elReponse.textContent = t; emotion("joie", 2800); dire(t);
}
$("bvMicro").addEventListener("click", function () {
  deverrouillerVoix();
  ouvrirMicro().then(commencer).catch(function () { astuce("Le micro est bloqué : tu peux m'écrire avec le clavier."); commencer(); });
});
$("bvSansMicro").addEventListener("click", function () { deverrouillerVoix(); commencer(); $("saisie").hidden = false; corps.classList.add("clavier"); });

/* ---------- v16 : consentement, textes légaux, signalements, effacement ---------- */
function preparerConsentement() {
  var T = window.ADAM_LEGAL && window.ADAM_LEGAL.consentement("tel"); if (!T) return;
  $("cTitre").textContent = T.titre; $("cIntro").textContent = T.intro;
  $("cIALabel").innerHTML = T.ia.label; $("cIADetail").textContent = T.ia.detail; $("cPied").textContent = T.pied;
  $("cIA").checked = false; $("cAccepter").disabled = true;
}
preparerConsentement();
$("cIA").addEventListener("change", function () { $("cAccepter").disabled = !$("cIA").checked; });
$("cAccepter").addEventListener("click", function () {
  if (!$("cIA").checked) return;
  reglages.consentIA = true; reglages.consentDate = new Date().toISOString(); sauverReglages();
  if (cleActive() && LS.get("bienvenueFaite", false)) { fermer(); elReponse.textContent = "Merci ! Je suis prêt."; }
  else montrerEtape(cleActive() ? 4 : 3);
});
$("cRefuser").addEventListener("click", function () {
  fermer(); elReponse.textContent = "Sans ton accord, je ne peux pas répondre. Touche le micro quand tu changes d'avis.";
});
var legalRetour = "reglages";
function ouvrirLegal(doc, retour) {
  legalRetour = retour || "reglages";
  if (window.ADAM_LEGAL) window.ADAM_LEGAL.monter($("legalCorps"), "tel", doc);
  ouvrir("legal");
}
document.querySelectorAll(".lienLegal").forEach(function (a) { a.addEventListener("click", function (e) { e.preventDefault(); ouvrirLegal(a.getAttribute("data-doc"), "bienvenue"); }); });
$("legalRetour").addEventListener("click", function () { ouvrir(legalRetour); if (legalRetour === "bienvenue") montrerEtape(2); });
$("rgLegal").addEventListener("click", function () { ouvrirLegal("confidentialite", "reglages"); });
$("ouvrirLegal").addEventListener("click", function (e) { e.preventDefault(); ouvrirLegal("mentions", "reglages"); });
$("rgConsent").addEventListener("change", function (e) {
  reglages.consentIA = e.target.checked; if (e.target.checked) reglages.consentDate = new Date().toISOString(); sauverReglages(); majConsentAffichage();
});
function majConsentAffichage() {
  $("rgConsent").checked = !!reglages.consentIA;
  $("rgConsentDate").textContent = reglages.consentIA && reglages.consentDate ? "Accord donné le " + new Date(reglages.consentDate).toLocaleDateString("fr-FR") + ". Décoche pour le retirer : plus rien n'est envoyé." : "Aucun accord donné : je n'envoie rien.";
  var sig = LS.get("signalements", []);
  $("rgSignalements").textContent = sig.length ? sig.length + " réponse(s) signalée(s), enregistrée(s) sur ce téléphone." : "Aucune réponse signalée.";
  $("rgCopierSig").hidden = !sig.length;
}
$("rgCopierSig").addEventListener("click", function () {
  var b = this, t = LS.get("signalements", []).map(function (x) { return x.date + "\nQuestion : " + x.q + "\nRéponse : " + x.r; }).join("\n\n");
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { b.textContent = "Copié"; setTimeout(function () { b.textContent = "Copier mes signalements"; }, 1800); }).catch(function () {});
});
$("rgEffacerTout").addEventListener("click", function () { $("rgEffacerConfirm").hidden = false; });
$("rgEffacerNon").addEventListener("click", function () { $("rgEffacerConfirm").hidden = true; });
$("rgEffacerOui").addEventListener("click", function () {
  try { Object.keys(localStorage).filter(function (k) { return k.indexOf("adam.") === 0; }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  try { if (window.caches) caches.keys().then(function (ks) { ks.forEach(function (k) { caches.delete(k); }); }); } catch (e) {}
  location.reload();
});
/* signaler la dernière réponse de l'IA (enregistré sur le téléphone, jamais envoyé automatiquement) */
$("btnSignaler").addEventListener("click", function () {
  var b = this, sig = LS.get("signalements", []);
  sig.push({ date: new Date().toISOString(), q: elDejaDit.textContent.replace(/[«»]/g, "").trim().slice(0, 500), r: elReponse.textContent.slice(0, 1500) });
  LS.set("signalements", sig.slice(-30)); b.textContent = "Signalée, merci"; b.disabled = true;
});
function montrerSignaler() { var b = $("btnSignaler"); b.hidden = false; b.disabled = false; b.textContent = "Signaler cette réponse"; }

/* réglages */
var lienSiri = new URL("./?ecoute=1", location.href).href;
function majMemoire() {
  var ul = $("rgMemoire"); ul.innerHTML = "";
  if (!memoire.length) { var li = document.createElement("li"); li.textContent = "Rien pour l'instant."; ul.appendChild(li); }
  memoire.forEach(function (m) { var li = document.createElement("li"); li.textContent = m; ul.appendChild(li); });
}
$("btnReglages").addEventListener("click", function () {
  $("rgCle").value = ""; $("rgCle").placeholder = reglages.cle ? "Clé enregistrée (laisser vide pour la garder)" : "gsk_…";
  $("rgCleG").value = ""; $("rgCleG").placeholder = reglages.cleGemini ? "Clé enregistrée (laisser vide pour la garder)" : "AQ.… ou AIza…";
  $("rgCerveau").value = cerveauGemini() ? "gemini" : "groq"; $("rgCerveauMsg").textContent = ""; $("rgMsgG").textContent = "";
  $("rgMsg").textContent = ""; $("rgVitesse").value = reglages.vitesse; $("lienSiri").textContent = lienSiri;
  $("rgEffacerConfirm").hidden = true; majConsentAffichage();
  chargerVoix(); majMemoire(); appliquerTheme(reglages.theme); ouvrir("reglages");
});
// v16.3 : la clé est reconnue toute seule (gsk_ = Groq, AQ. ou AIza = Gemini) et le cerveau suit la clé vérifiée
function testerCleAuto(champ, msg) {
  var v = $(champ).value.trim();
  if (/^(AIza|AQ\.)/.test(v)) return verifierCleGemini(v, $(msg)).then(function (ok) { if (ok) passerCerveau("gemini"); });
  return verifierCle(v, $(msg)).then(function (ok) { if (ok) passerCerveau("groq"); });
}
$("rgTester").addEventListener("click", function () { testerCleAuto("rgCle", "rgMsg"); });
$("rgTesterG").addEventListener("click", function () { testerCleAuto("rgCleG", "rgMsgG"); });
$("rgCerveau").addEventListener("change", function (e) {
  reglages.cerveau = e.target.value === "gemini" ? "gemini" : "groq"; sauverReglages();
  var m = $("rgCerveauMsg");
  if (!cleActive()) { m.className = "msg ko"; m.textContent = "Ajoute ta clé " + nomCerveau() + " ci-dessous pour utiliser ce cerveau."; }
  else { m.className = "msg ok"; m.textContent = "C'est " + nomCerveau() + " qui me fait réfléchir maintenant."; }
  if (cerveauGemini() && reglages.cleGemini && !modelesG.length) chargerModelesGemini().catch(function () {});
});
$("rgVoix").addEventListener("change", function (e) { reglages.voix = e.target.value; sauverReglages(); });
$("rgVitesse").addEventListener("input", function (e) { reglages.vitesse = +e.target.value; sauverReglages(); });
$("rgEssai").addEventListener("click", function () { deverrouillerVoix(); taire(); dire("Coucou, c'est Adam. Voilà ma voix."); });
document.querySelectorAll(".teinte").forEach(function (b) { b.addEventListener("click", function () { reglages.theme = b.getAttribute("data-t"); sauverReglages(); appliquerTheme(reglages.theme); emotion("joie", 1500); }); });
$("rgOublier").addEventListener("click", function () { memoire = []; LS.set("memoire", memoire); majMemoire(); emotion("clin", 2000); });
$("copierSiri").addEventListener("click", function () {
  var b = this;
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(lienSiri).then(function () { b.textContent = "Lien copié"; setTimeout(function () { b.textContent = "Copier le lien"; }, 1800); });
});

/* discussion */
function majBulles() {
  var el = $("bulles"); el.innerHTML = "";
  if (!historique.length) { var v = document.createElement("div"); v.className = "vide"; v.textContent = "Pas encore de discussion."; el.appendChild(v); return; }
  historique.forEach(function (m) { var d = document.createElement("div"); d.className = "bulle " + (m.role === "user" ? "toi" : "lui"); d.textContent = m.content; el.appendChild(d); });
}
$("btnDiscussion").addEventListener("click", function () { majBulles(); ouvrir("discussion"); });
$("dcEffacer").addEventListener("click", function () { historique = []; sauverHistorique(); majBulles(); elDejaDit.textContent = ""; elReponse.textContent = "On repart de zéro !"; });

/* ---------- boucle d'animation ---------- */
var lvl = 0;
(function anim(t) {
  var cible = corps.classList.contains("listening") ? Math.min(1, niveauVoix * 12) : corps.classList.contains("speaking") ? .25 + .25 * Math.abs(Math.sin(t / 110)) : 0;
  lvl += (cible - lvl) * .25;
  racine.style.setProperty("--lvl", lvl.toFixed(3));
  if (corps.classList.contains("listening")) ligne.cible = Math.max(.08, Math.min(1, niveauVoix * 14));
  ligne.dessiner(t / 1000);
  requestAnimationFrame(anim);
})(0);

/* ---------- démarrage ---------- */
appliquerTheme(reglages.theme);
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(function () {});
document.addEventListener("visibilitychange", function () {
  if (document.hidden) { arreterEcoute(); if (flux) { flux.getTracks().forEach(function (t) { t.stop(); }); flux = null; analyseur = null; } }
});
var params = new URLSearchParams(location.search);
if (!cleActive() || !reglages.consentIA || !LS.get("bienvenueFaite", false)) { montrerEtape(!cleActive() && !LS.get("bienvenueFaite", false) ? 1 : etapeInit()); ouvrir("bienvenue"); }
else if (params.get("ecoute") === "1") {
  // Ouvert par « Dis Siri, Adam » : on essaie d'écouter tout de suite, sinon on invite à toucher.
  elReponse.textContent = "Je suis là. Je t'écoute !";
  if (LS.get("microOK", false)) cycleEcoute(7000).catch(function () {}); else astuce("Touche le micro et parle.");
} else {
  var dernier = historique[historique.length - 1];
  elReponse.textContent = dernier && dernier.role === "assistant" ? dernier.content : "Coucou ! Touche le micro et parle-moi.";
  if (historique.length) { var avant = historique[historique.length - 2]; if (avant && avant.role === "user") elDejaDit.textContent = "« " + avant.content + " »"; }
}
if (!modeles.length && reglages.cle) chargerModeles().catch(function () {});
if (cerveauGemini() && !modelesG.length && reglages.cleGemini) chargerModelesGemini().catch(function () {});
window.Adam = { traiter: traiter, emotion: emotion, feux: Feux, theme: appliquerTheme };
})();
