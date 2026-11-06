// ================== v16 : TOUS LES TEXTES LEGAUX D'ADAM ==================
// Un seul fichier, partage par l'app PC, l'app telephone et le site.
// A REMPLIR AVANT PUBLICATION : EDITEUR et CONTACT (voir PUBLICATION-CHECKLIST.md).
(function (global) {
  'use strict';
  var L = {
    version: '1.1',
    date: '31 octobre 2026',
    editeur: '',   // ex. 'Prénom Nom, adresse postale' (obligatoire pour publier : LCEN art. 6)
    contact: '',   // ex. 'contact@tondomaine.fr' (obligatoire : confidentialité + signalements)
    ageMin: 15,
    numeros: 'En cas d’urgence : 112 (Europe), 15 (SAMU). Si tu as des idées noires, appelle le 3114 (prévention du suicide, France, 24 h/24, gratuit).'
  };

  function p() { return Array.prototype.slice.call(arguments).map(function (t) { return '<p>' + t + '</p>'; }).join(''); }
  function ul(items) { return '<ul>' + items.filter(Boolean).map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>'; }
  function h(t) { return '<h4>' + t + '</h4>'; }
  function contactLigne() {
    return L.contact ? 'Contact : <b>' + L.contact + '</b>.' : 'Contact : via la fiche de l’application sur le magasin où tu l’as téléchargée.';
  }

  L.docs = function (plat) {
    var pc = plat !== 'tel';
    var appareil = pc ? 'ton ordinateur' : 'ton téléphone';
    var stock = pc ? 'dans le dossier de données d’Adam sur ton ordinateur' : 'dans la mémoire du navigateur de ton téléphone (stockage local)';

    var mentions =
      h('Éditeur') +
      p(L.editeur ? '<b>' + L.editeur + '</b>.' : 'Adam est édité par une personne physique à titre non professionnel. Ses coordonnées figurent sur la fiche de l’application.', contactLigne()) +
      h('Version') +
      p('Adam ' + (pc ? 'pour Windows' : 'Web / téléphone') + ' — textes légaux version ' + L.version + ', mis à jour le ' + L.date + '.') +
      h('Gratuité') +
      p('Adam est gratuit. Il n’y a ni abonnement, ni achat intégré, ni publicité, ni compte à créer chez l’éditeur.') +
      h('Marques citées') +
      p('Netflix, Spotify, YouTube, WhatsApp, Steam et les autres services nommés dans l’application appartiennent à leurs propriétaires. Adam n’est affilié à aucun d’eux et ne fait que t’ouvrir leur site ou leur application.');

    var confidentialite =
      p('Adam est conçu pour que tes données restent chez toi. Voici précisément ce qui reste sur ' + appareil + ' et ce qui part vers des services tiers, uniquement quand tu l’utilises.') +
      h('Ce qui reste sur ' + appareil) +
      ul([
        'Ta clé Groq, tes réglages, tes notes, ce qu’Adam retient de toi (prénom, goûts) et le fil de ta discussion récente (gardé 12 heures) : ' + stock + '.',
        'Rien de tout cela n’est envoyé à l’éditeur. Il n’existe aucun serveur ni aucun compte chez l’éditeur.',
        pc ? 'Un journal technique (adam-log.txt) aide au dépannage. Ta clé y est toujours masquée.' : 'Aucun suivi, aucune statistique, aucun cookie publicitaire.'
      ]) +
      h('Ce qui est envoyé à des services tiers, avec ton accord') +
      ul([
        '<b>Groq</b> (États-Unis) : le texte de tes demandes' + (pc ? ', l’enregistrement de ta voix pour le transcrire, et, seulement si tu demandes à Adam de regarder ton écran, une capture de ton écran' : ' et l’enregistrement de ta voix pour le transcrire') + '. But : produire la réponse de l’IA. Politique de Groq : groq.com/privacy-policy.',
        pc ? null : '<b>Google Gemini</b> (États-Unis), seulement si tu choisis ce cerveau dans Réglages : le texte de tes demandes et, si tu n’as pas de clé Groq, l’enregistrement de ta voix pour le transcrire. But : produire la réponse de l’IA. Avec l’offre gratuite de l’API Gemini, Google peut utiliser ces données pour améliorer ses services ; utilise une clé liée à un projet payant si tu veux l’éviter. Politique de Google : policies.google.com/privacy.',
        pc ? '<b>Microsoft</b> (service de lecture à voix haute de Microsoft Edge) : le texte des réponses d’Adam, pour le lire avec une voix naturelle. Tu peux refuser ; Adam utilise alors les voix de Windows.' : '<b>La voix de ton téléphone</b> lit les réponses. Selon ton appareil, le système peut utiliser un service en ligne (Apple ou Google). Adam n’y envoie rien lui-même.',
        '<b>Open-Meteo</b> : la ville demandée (ou ta position approximative' + (pc ? ' ; sans ville précisée, ton adresse IP est envoyée à GeoJS pour la déduire' : '') + ') pour la météo.',
        pc ? '<b>DuckDuckGo, Google, YouTube et autres sites</b> : quand tu demandes une recherche ou une musique, ta requête est envoyée au site concerné.' : '<b>Wikipédia</b> : le sujet cherché, pour résumer un article.'
      ]) +
      p('Chacun de ces services applique sa propre politique de confidentialité. L’éditeur d’Adam n’a accès à aucune de ces données.') +
      (pc ? '' : h('Le relais du site') + p('Si ton navigateur refuse de joindre Groq directement, Adam passe par un petit relais hébergé sur son site. Il transmet ta demande à Groq sans rien conserver ni journaliser.')) +
      h('Ton consentement') +
      p('Au premier lancement, Adam te demande ton accord avant tout envoi vers l’IA. Tu peux le retirer à tout moment dans <b>Réglages</b> : Adam cesse immédiatement d’envoyer quoi que ce soit.') +
      h('Le micro') +
      (pc ?
        p('Par défaut, Adam n\u2019écoute <b>que lorsque tu l\u2019actives</b> : raccourci clavier, clic sur le nuage ou bouton du panneau. Le son enregistré est envoyé à Groq pour être transcrit en texte, puis Adam ne le conserve pas.') +
        p('<b>Écoute permanente (facultative, désactivée par défaut).</b> Si tu l\u2019actives pour pouvoir dire « Adam » sans toucher l\u2019ordinateur, le micro reste ouvert tant qu\u2019Adam tourne. Chaque passage de voix détecté est alors envoyé à Groq pour être transcrit, afin de repérer ton mot d\u2019activation, même si tu ne t\u2019adresses pas à Adam. Cela peut inclure des conversations autour de toi. Adam ne conserve pas ces enregistrements ; Groq applique sa propre politique. Tu peux désactiver cette option à tout moment dans Réglages.')
      : p('Adam n\u2019écoute que lorsque tu touches le bouton micro (ou que tu ouvres Adam avec ton raccourci Siri). Le son est envoyé à Groq pour être transcrit en texte, puis n\u2019est pas conservé par Adam.')) +
      h('Effacer tes données') +
      p('Dans <b>Réglages › Effacer toutes mes données</b>, ou en disant « Adam, oublie tout » pour la mémoire seule. ' + (pc ? 'Désinstaller Adam retire aussi les données locales.' : 'Vider les données du site dans ton navigateur les efface aussi.')) +
      h('Enfants') +
      p('Adam s’adresse aux personnes de ' + L.ageMin + ' ans et plus. En dessous, demande l’accord d’un parent avant de l’utiliser. Adam ne cherche jamais à connaître ton âge.') +
      p(contactLigne());

    var droits =
      p('Même si l’éditeur ne détient aucune de tes données, tu disposes des droits prévus par le RGPD (UE) : accès, rectification, effacement, limitation, opposition et portabilité.') +
      ul([
        'Tout ce qu’Adam sait de toi est sur ' + appareil + ' : tu peux le consulter et l’effacer toi-même (Réglages).',
        'Pour les données reçues par Groq, Microsoft ou d’autres services, adresse-toi directement à eux.',
        'Tu peux porter plainte auprès de la CNIL (cnil.fr) ou de l’autorité de protection des données de ton pays.'
      ]) +
      p(contactLigne());

    var cgu =
      h('1. Ce que fait Adam') +
      p('Adam est un assistant IA qui te répond, cherche des informations, lance des minuteurs, prend des notes' + (pc ? ' et peut agir sur ton ordinateur (ouvrir des applications, régler le volume, lire ton écran à ta demande)' : '') + '.') +
      h('2. Licence') +
      p('L’éditeur te concède, gratuitement et sans limite de durée, une licence personnelle, non exclusive et non transférable d’utilisation d’Adam. Tu ne peux ni le vendre, ni le louer, ni le redistribuer modifié, ni retirer les mentions de propriété.') +
      h(pc ? '3. Ta clé Groq' : '3. Ta clé Groq ou Gemini') +
      p('Adam fonctionne avec une clé API ' + (pc ? 'Groq' : 'Groq ou Gemini (Google)') + ' que <b>tu</b> crées et qui t’appartient. Elle relève de ton compte et des conditions du service concerné. Tu es responsable de son usage et des coûts éventuels. Ne la partage avec personne.') +
      (pc ? h('4. Contrôle de ton ordinateur') + p('Adam n’agit sur ton ordinateur qu’à ta demande. Toute commande système libre te demande une confirmation avant d’être exécutée. Tu restes responsable des actions que tu demandes. Lis la commande affichée avant de dire oui.') : h('4. Ton téléphone') + p('Adam Web ne modifie rien sur ton téléphone. Il n’ouvre un autre service que lorsque tu le demandes.')) +
      h('5. Usages interdits') +
      p('Tu t’engages à ne pas utiliser Adam pour : harceler ou menacer quelqu’un, produire du contenu illégal ou haineux, tromper des personnes (arnaques, usurpation), écrire du code malveillant, ou obtenir de l’aide pour te faire du mal ou en faire à autrui.') +
      h('6. Limites de l’IA') +
      p('Les réponses sont générées par une intelligence artificielle. Elles peuvent être fausses, incomplètes ou dépassées. Adam ne remplace ni un médecin, ni un avocat, ni un conseiller financier. Vérifie toute information importante.') +
      h('7. Absence de garantie et responsabilité') +
      p('Adam est fourni « en l’état », sans garantie. Dans la mesure permise par la loi, l’éditeur n’est pas responsable des dommages résultant de l’utilisation ou de l’impossibilité d’utiliser Adam. Cette clause ne limite pas les droits que la loi t’accorde en tant que consommateur.') +
      h('8. Fin de la licence') +
      p('La licence prend fin si tu ne respectes pas ces conditions. Tu peux arrêter à tout moment en désinstallant Adam.') +
      h('9. Droit applicable') +
      p('Ces conditions sont régies par le droit français, sans préjudice des règles impératives de protection des consommateurs de ton pays de résidence.');

    var ia =
      p('Adam est une intelligence artificielle. Tu parles à une machine, pas à une personne.') +
      h('Comment ça marche') +
      p('Tes demandes sont traitées par des modèles de langage ouverts hébergés par Groq (selon la disponibilité : Llama de Meta, gpt-oss d\u2019OpenAI, Kimi de Moonshot AI, Qwen d\u2019Alibaba) et par Whisper pour la voix. Adam leur ajoute des outils (météo, minuteurs, notes' + (pc ? ', pilotage du PC' : '') + ').') +
      h('Ses limites') +
      ul([
        'Il peut se tromper, inventer un détail ou mal comprendre.',
        'Il ne donne pas de conseil médical, juridique ou financier fiable.',
        'Il refuse les demandes dangereuses ou illégales, mais aucun filtre n’est parfait.'
      ]) +
      h('Signaler une réponse') +
      p('Une réponse t’a choqué ou paraît dangereuse ? Appuie sur <b>Signaler</b> sous la réponse. Le signalement est enregistré' + (pc ? ' sur ton ordinateur' : ' sur ton téléphone') + ' et tu peux l’envoyer à l’éditeur pour qu’il améliore les consignes d’Adam.') +
      h('Si ça ne va pas') +
      p(L.numeros);

    var licences =
      p('Adam est construit avec des logiciels libres et des services tiers. Merci à eux.') +
      ul([
        '<b>Built with Llama.</b> Les réponses peuvent utiliser des modèles Llama de Meta (Llama 3.3 Community License), servis par Groq. Adam utilise aussi, selon la disponibilité, gpt-oss (OpenAI, Apache 2.0), Kimi (Moonshot AI) et Qwen (Alibaba, Apache 2.0).',
        '<b>Whisper</b> (OpenAI, licence MIT) pour la transcription de la voix, servi par Groq.',
        '<b>Open-Meteo.com</b> pour la météo (données sous licence CC BY 4.0).',
        pc ? '<b>Electron</b> et <b>Chromium</b> (licence MIT / BSD), <b>Node.js</b> (MIT), <b>ws</b> et <b>serialport</b> (MIT).' : '<b>Wikipédia</b> (texte sous licence CC BY-SA 4.0, auteurs listés sur chaque article).',
        'Polices : Unbounded et Hanken Grotesk (SIL Open Font License).',
        'Les noms et logos des services cités appartiennent à leurs propriétaires.'
      ]) +
      p('Le texte complet de ces licences est consultable sur les sites des projets.');

    return [
      { id: 'confidentialite', titre: 'Confidentialité', html: confidentialite },
      { id: 'conditions', titre: 'Conditions d’utilisation', html: cgu },
      { id: 'ia', titre: 'Intelligence artificielle', html: ia },
      { id: 'droits', titre: 'Tes droits', html: droits },
      { id: 'licences', titre: 'Licences et crédits', html: licences },
      { id: 'mentions', titre: 'Mentions légales', html: mentions }
    ];
  };

  // Texte du consentement affiche avant tout envoi (onboarding + reglages)
  L.consentement = function (plat) {
    var pc = plat !== 'tel';
    return {
      titre: 'Avant de commencer : ce qui part de ' + (pc ? 'ton ordinateur' : 'ton téléphone'),
      intro: 'Adam réfléchit grâce à une intelligence artificielle hébergée par un service tiers. Pour te répondre, il doit lui envoyer certaines données. Rien n’est envoyé tant que tu n’as pas donné ton accord.',
      ia: {
        label: 'J’accepte qu’Adam envoie à <b>Groq</b> (IA, États-Unis)' + (pc ? '' : ' ou, si je choisis ce cerveau, à <b>Google Gemini</b> (IA, États-Unis)') + ' le texte de mes demandes, l’enregistrement de ma voix' + (pc ? ' et, seulement quand je lui demande de regarder mon écran, une capture de mon écran' : '') + ', pour obtenir ses réponses.',
        detail: (pc ? 'Groq' : 'Le service que tu choisis') + ' reçoit ces données uniquement pendant que tu utilises Adam. L’éditeur d’Adam n’y a jamais accès.'
      },
      voix: pc ? {
        label: 'J’accepte qu’Adam envoie le texte de ses réponses à <b>Microsoft</b> pour les lire avec une voix naturelle (facultatif).',
        detail: 'Sans cet accord, Adam utilise les voix installées dans Windows.'
      } : null,
      continu: pc ? {
        label: '<b>Écoute permanente</b> (facultatif) : Adam garde le micro ouvert pour repérer son nom quand je dis « Adam ». Toute voix détectée est alors envoyée à <b>Groq</b> pour être transcrite.',
        detail: 'Cela peut inclure des conversations autour de toi. Sans cette option, tu actives Adam avec le raccourci clavier ou en cliquant sur le nuage, et le micro reste inactif le reste du temps.'
      } : null,
      pied: 'Tu peux retirer ton accord à tout moment dans Réglages. Adam cesse alors tout envoi.'
    };
  };

  // Monte les onglets + le texte dans un conteneur (style neutre, herite des couleurs de l'app)
  L.monter = function (conteneur, plat, idDepart) {
    var docs = L.docs(plat), cur = idDepart || docs[0].id;
    conteneur.innerHTML = '';
    conteneur.classList.add('adamLegal');
    var nav = document.createElement('div'); nav.className = 'alNav'; nav.setAttribute('role', 'tablist');
    var corps = document.createElement('div'); corps.className = 'alCorps'; corps.tabIndex = 0;
    docs.forEach(function (d) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = d.titre; b.setAttribute('role', 'tab'); b.dataset.id = d.id;
      b.addEventListener('click', function () { aff(d.id); });
      nav.appendChild(b);
    });
    function aff(id) {
      cur = id;
      var d = docs.filter(function (x) { return x.id === id; })[0] || docs[0];
      corps.innerHTML = '<h3>' + d.titre + '</h3>' + d.html + '<p class="alMaj">Textes légaux version ' + L.version + ' · ' + L.date + '</p>';
      corps.scrollTop = 0;
      Array.prototype.forEach.call(nav.children, function (b) { b.setAttribute('aria-selected', b.dataset.id === d.id ? 'true' : 'false'); });
    }
    conteneur.appendChild(nav); conteneur.appendChild(corps); aff(cur);
  };

  var css = document.createElement('style');
  css.textContent =
    '.adamLegal{display:flex;flex-direction:column;gap:10px;min-height:0;color:inherit;font:inherit}' +
    '.adamLegal .alNav{display:flex;gap:6px;flex-wrap:wrap}' +
    '.adamLegal .alNav button{font:600 12px/1 system-ui,"Segoe UI",sans-serif;padding:8px 11px;border-radius:999px;border:1px solid rgba(128,128,128,.35);background:transparent;color:inherit;cursor:pointer}' +
    '.adamLegal .alNav button[aria-selected="true"]{background:rgba(120,140,255,.28);border-color:rgba(120,140,255,.7)}' +
    '.adamLegal .alCorps{overflow:auto;max-height:46vh;padding:2px 4px 2px 0;font-size:13.5px;line-height:1.55;user-select:text;-webkit-user-select:text}' +
    '.adamLegal h3{margin:0 0 6px;font-size:16px}' +
    '.adamLegal h4{margin:14px 0 4px;font-size:13.5px}' +
    '.adamLegal p{margin:0 0 8px}' +
    '.adamLegal ul{margin:0 0 8px;padding-left:18px}.adamLegal li{margin:0 0 5px}' +
    '.adamLegal .alMaj{opacity:.6;font-size:12px;margin-top:14px}';
  (document.head || document.documentElement).appendChild(css);

  global.ADAM_LEGAL = L;
})(window);
