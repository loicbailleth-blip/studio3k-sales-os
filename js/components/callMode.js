/* ===================== MODE 2 : COPILOTE D'APPEL =====================
   Waze pour la prospection : le commercial ne choisit jamais quoi dire. Il indique ce que
   le prospect vient de faire, l'application annonce la seule prochaine action. Jamais plus
   de 3 informations à traiter à l'écran (objectif, réplique, réactions) — le reste (chrono,
   objections, humeur) est une chrome permanente et discrète, jamais un choix à faire. */
import { getState } from "../state.js";
import { getPersonas, getCurrentPersonaKey } from "./personas.js";
import { getObjections } from "./objections.js";
import { getHooks } from "./hooks.js";
import { getDiagnosticsData } from "./diagnostics.js";
import { kpi } from "./dashboard.js";
import { resetFiche } from "./fiche.js";
import { showMode } from "../router.js";

let cmIdx = 1, cmTimer = null, cmSec = 0, cmRefus = 0, cmBranch = "bao", cmMood = "", cmAcc = "", cmObs = "";
const CM_TOTAL = 9;

/* Chaque étape technique appartient à une phase en langage simple : c'est l'unique
   information « objectif actuel » affichée — jamais le détail des 9 étapes internes. */
const GOALS = {
  1: "Créer de la curiosité", 2: "Créer de la curiosité",
  3: "Faire verbaliser",
  4: "Qualifier", 5: "Qualifier",
  6: "Créer de la valeur", 7: "Créer de la valeur",
  8: "Proposer un rendez-vous", 9: "Proposer un rendez-vous"
};

const MOODTIPS = {
  curieux: "🟢 Curieux : ne sur-vendez pas, allez vers le RDV, il se convainc tout seul.",
  mefiant: "🟡 Méfiant : ralentissez, plus de questions, zéro pitch, voix posée.",
  ferme: "🔴 Fermé : une dernière question de sortie, puis on passe."
};

function persona(){ return getPersonas()[getCurrentPersonaKey()]; }

/* ===================== RASSURANCE ===================== */
function flashMsg(text, ms = 5000){
  const fl = document.getElementById("cmFlash");
  if(!fl) return;
  fl.textContent = text;
  fl.classList.add("visible");
  clearTimeout(fl._t);
  fl._t = setTimeout(() => fl.classList.remove("visible"), ms);
}

/* ===================== PEINTURE DE L'ÉCRAN (helper commun) =====================
   Un seul point d'entrée pour dessiner ce que voit le commercial, quel que soit le contexte
   (étape normale, micro-réaction, objection, répondeur, arrêt) : garantit la même structure
   à 3 blocs partout dans le Copilote. */
function paint({ goal = "", caption = "", verbatim, tip = "", actionsLabel = "Que vient de dire le prospect ?", actions, tone = "" }){
  const goalEl = document.getElementById("cmGoalLabel");
  goalEl.textContent = goal ? "Objectif actuel · " + goal : caption;
  goalEl.classList.toggle("cm-goal-alert", tone === "alert");

  const verbEl = document.getElementById("cmVerbatim");
  verbEl.innerHTML = verbatim;
  verbEl.classList.toggle("cm-verbatim-alert", tone === "alert");

  const tipToggle = document.getElementById("cmTipToggle");
  const tipBox = document.getElementById("cmTipBox");
  tipBox.hidden = true;
  tipBox.innerHTML = tip;
  tipToggle.hidden = !tip;
  tipToggle.textContent = "Pourquoi cette réplique ?";
  tipToggle.onclick = () => { tipBox.hidden = !tipBox.hidden; };

  document.getElementById("cmActionsLabel").textContent = actionsLabel;
  const box = document.getElementById("cmActions");
  box.innerHTML = "";
  actions.forEach(r => {
    const b = document.createElement("button");
    b.className = "cm-r " + (r.c || "");
    b.innerHTML = r.l;
    b.onclick = r.f;
    box.appendChild(b);
  });

  const main = document.getElementById("cmMain");
  main.classList.remove("fx-enter");
  void main.offsetWidth;
  main.classList.add("fx-enter");
}

/* ===================== CHEMINS DE QUALIFICATION ===================== */
function cmChemin(){
  const p = persona();
  if(cmBranch === "google") return { v: "« Donc les gens vous comparent. Quand quelqu'un tape votre métier dans votre ville, il ouvre trois onglets : vous et deux concurrents. Qu'est-ce qui fait qu'il vous choisit VOUS, à part le prix ? »", tip: "⏸ Puis : « Sans crédibilité installée, vous êtes un onglet parmi trois. La référence, elle, gagne l'affaire avant même le premier contact. »" };
  if(cmBranch === "insta") return { v: "« Donc vous avez déjà compris que l'exposition amène des clients. Question : ces clients-là, ce sont vos meilleurs clients, ou plutôt les petits dossiers qui négocient ? »", tip: "⏸ Puis : « De l'exposition sans image d'expert, ça attire du volume, pas de la valeur. La référence, elle, est choisie à son prix. »" };
  if(cmBranch === "linkedin") return { v: "« Bien. Et sur LinkedIn, on vous identifie comme LA référence de votre domaine, ou c'est surtout votre réseau existant qui vous fait travailler ? »", tip: "⏸ Puis : « Le réseau, c'est le bouche-à-oreille en ligne : même plafond. Ceux qui passent devant vous ne sont pas les meilleurs, ce sont ceux qu'on voit. »" };
  if(cmBranch === "pub") return { v: "« Donc vous achetez de l'attention. Question franche : quand vous coupez le budget, il reste quoi ? »", tip: "⏸ Puis : « La publicité loue de l'attention. Une image de référence, elle, vous appartient : elle continue de travailler quand vous dormez. Les deux se combinent très bien d'ailleurs. » Profil souvent mature." };
  return { v: "« " + p.cons + " »<br><br>« " + p.consQ + " »", tip: "⏸ Silence total après la question. Le premier qui parle a perdu. Relance : « Et le jour où ça ralentit, vous avez un plan B, ou c'est la loterie ? »" };
}

function cmStepDef(i){
  const p = persona();
  const prospect = getState().currentProspect;
  switch(i){
    case 1: {
      let opening = "« Bonjour [Prénom / Maître / Docteur]. [Votre prénom] à l'appareil, je vous appelle de la part de Loïc. Il accompagne des " + p.nom.toLowerCase() + "s à devenir les références de leur secteur grâce à des interviews premium. J'avais une question. »";
      if(prospect) {
        opening = "« Bonjour " + prospect.nom + ". [Votre prénom] à l'appareil, je vous appelle de la part de Loïc. J'avais une question à propos de votre positionnement en tant que " + prospect.specialite.toLowerCase() + ". »";
      }
      return { v: opening, tip: "Ton posé, descendant, on parle lentement. Pas de permission, pas d'excuse : « J'avais une question » ouvre une boucle que son cerveau doit fermer. Vous ne vendez rien, vous êtes mandaté." };
    }
    case 2: {
      let q2 = cmAcc || (cmObs || "« Sur l'image d'expert que vous renvoyez aujourd'hui, spontanément, vous vous mettriez combien sur 10 ? »");
      if(prospect && !cmAcc && !cmObs) {
        q2 = "« " + prospect.angle + " »";
      }
      return { v: q2, tip: "SILENCE ABSOLU. Personne ne répond 10 : il se diagnostique lui-même. Notez son chiffre, c'est de l'or pour la suite." };
    }
    case 3: return { v: "« Un [son chiffre]... Qu'est-ce qui manque pour que ce soit un 9 ? »", tip: "Il liste lui-même ce qui lui manque. Relances : « C'est-à-dire ? » « Et à part ça ? » Ne commentez rien, encaissez. « " + p.diag + " » peut servir de relance si ça sèche." };
    case 4: return { v: "« Aujourd'hui, la majorité de vos clients viennent d'où ? »", tip: "Écoutez sa réponse, puis cliquez-la ci-dessous : toute la suite se recalcule." };
    case 5: { const ch = cmChemin(); return { v: ch.v, tip: ch.tip }; }
    case 6: {
      let value6 = "« C'est exactement pour ça que Loïc m'a demandé de vous appeler. Son constat, c'est que les meilleurs sont rarement ceux qu'on voit. Et il pense que vous êtes typiquement ce profil-là : quelqu'un qui vaut clairement plus que ce que l'on voit de vous aujourd'hui. »";
      if(prospect) {
        value6 = "« " + prospect.strategie + " »";
      }
      return { v: value6, tip: "Résultat évoqué : " + p.resultat + ". Jamais le studio, jamais le moyen. Son cerveau doit visualiser une interview haut de gamme, pas une prestation." };
    }
    case 7: return { v: "« Je ne vous propose rien, ce n'est pas mon rôle. Loïc prend 15-20 minutes avec certains profils : il analyse votre positionnement, votre crédibilité actuelle, votre potentiel, et il vous dit honnêtement si une stratégie de référence a du sens pour vous, ou pas. Il ne le fait pas avec tout le monde. »<br><br>« Vous seriez plutôt début ou fin de semaine ? » ⏸ « Matin ou après-midi ? »", tip: "Une " + p.audit + ", jamais une vente. « Il ne le fait pas avec tout le monde » : c'est LUI qui doit se qualifier. Toujours l'alternative, jamais « êtes-vous d'accord pour qu'on se rencontre ? »" };
    case 8: return { v: "« Avant que je bloque le créneau : Loïc est exigeant sur les profils. Il travaille depuis son plateau à Roubaix, avec des activités qui tournent déjà. Vous êtes à quelle distance, et vous êtes combien aujourd'hui ? »", tip: "Dans la cible : « Parfait, vous êtes exactement le type de profil qu'il analyse. »" };
    case 9: return { v: "« C'est noté pour [jour, heure]. Je vous envoie l'invitation là tout de suite : acceptez-la, comme ça je confirme à Loïc que le créneau est pris. Il prépare toujours un peu le profil avant l'échange. »", tip: "« Il prépare le profil » : l'engagement devient réciproque, annuler devient coûteux. La veille : mail goodwill écrit main avec un détail perso repéré sur lui." };
  }
}

function cmResp(i){
  const go = n => () => { cmIdx = n; cmRender(); };
  switch(i){
    case 1: return [
      { l: "🟢 Je vous écoute", c: "r-g", f: go(2) },
      { l: "🟡 Qui est Loïc ?", c: "r-y", f: () => cmMini("« Justement, c'est ma question. »", "Enchaînez directement la question d'ouverture. Sa curiosité travaille pour vous.", 2) },
      { l: "🔴 Pas le temps", c: "r-r", f: () => cmRed("temps") },
      { l: "☎ Répondeur", c: "r-y", f: cmRepondeur },
      { l: "✗ Raccroché direct", c: "r-r", f: cmShowEnd }];
    case 2: return [
      { l: "🟢 Il répond / donne un chiffre", c: "r-g", f: go(3) },
      { l: "🟡 Pourquoi cette question ?", c: "r-y", f: () => cmMini("« Parce que Loïc ne propose l'échange qu'à certains profils, et je préfère vérifier avant de vous faire perdre du temps. Alors, spontanément ? »", "La sélectivité inverse les rôles : c'est lui qui doit se qualifier.", 3) },
      { l: "🔴 Pas intéressé", c: "r-r", f: () => cmRed("confiance") }];
    case 3: return [
      { l: "🟢 Il verbalise ce qui manque", c: "r-g", f: go(4) },
      { l: "🟡 « Rien, tout va bien » (9-10)", c: "r-y", f: () => cmMini("« Excellent, c'est rare. Simple vérification alors : si je tape votre métier et votre ville sur Google, je tombe sur vous ? »", "Soit il assume (peut-être un vrai 9 : sortie polie), soit il se corrige tout seul.", 4) },
      { l: "🔴 Fermé / agacé", c: "r-r", f: () => cmRed("confiance") }];
    case 4: return [
      { l: "○ Bouche-à-oreille", c: "r-g", f: () => { cmBranch = "bao"; cmIdx = 5; cmRender(); } },
      { l: "○ Google / le site", c: "r-g", f: () => { cmBranch = "google"; cmIdx = 5; cmRender(); } },
      { l: "○ Instagram / réseaux", c: "r-g", f: () => { cmBranch = "insta"; cmIdx = 5; cmRender(); } },
      { l: "○ LinkedIn", c: "r-g", f: () => { cmBranch = "linkedin"; cmIdx = 5; cmRender(); } },
      { l: "○ Publicité", c: "r-g", f: () => { cmBranch = "pub"; cmIdx = 5; cmRender(); } },
      { l: "🔴 Refuse de répondre", c: "r-r", f: () => cmRed("confiance") }];
    case 5: return [
      { l: "🟢 Il reconnaît le problème", c: "r-g", f: go(6) },
      { l: "🟡 Il minimise", c: "r-y", f: () => cmMini("« Ça vous coûte quoi, concrètement, de ne pas être le premier choix ? Une affaire par mois ? Par trimestre ? »", "Laissez-le chiffrer lui-même. Un chiffre dit par lui vaut dix arguments.", 6) },
      { l: "🔴 On fait déjà / on a déjà quelqu'un", c: "r-r", f: () => cmRed("concurrent") }];
    case 6: return [
      { l: "🟢 Il suit, il écoute", c: "r-g", f: go(7) },
      { l: "🟡 C'est quoi ces interviews ?", c: "r-y", f: () => cmObj("divers") },
      { l: "🔴 Pas intéressé", c: "r-r", f: () => cmRed("confiance") }];
    case 7: return [
      { l: "🟢 Ça m'intéresse", c: "r-g", f: go(8) },
      { l: "🟡 Envoyez un mail", c: "r-y", f: () => cmObj("mail") },
      { l: "🟡 Combien ça coûte ?", c: "r-y", f: () => cmObj("prix") },
      { l: "🔴 Non", c: "r-r", f: () => { cmRefus++; if(cmRefus >= 3){ cmStop("ferme"); } else { cmMini("« Aucun souci. Dernière chose : si Loïc regarde votre profil et voit un vrai potentiel, ce serait une mauvaise idée qu'il vous appelle lui-même, 15 minutes, mardi ou jeudi ? »", "Le refus d'un échange offert et sélectif est rare. S'il refuse encore, on n'insiste pas : le 3e refus déclenche la sortie.", 7); } } }];
    case 8: return [
      { l: "🟢 Dans la cible (< 2h, activité qui tourne)", c: "r-g", f: go(9) },
      { l: "❌ Hors cible", c: "r-r", f: () => cmStop("horscible") }];
    case 9: return [
      { l: "📅 RDV verrouillé → clôturer l'appel", c: "r-g", f: () => finishCall("rdv") }];
  }
}

/* ===================== ÉCRAN « AVANT D'APPELER » ===================== */
export function startCall(){
  cmIdx = 1; cmSec = 0; cmRefus = 0; cmBranch = "bao"; cmMood = ""; cmAcc = ""; cmObs = "";
  showMode("copilote");
  document.getElementById("cmPreCall").hidden = false;
  document.getElementById("cmLive").hidden = true;
  document.getElementById("cmEnd").hidden = true;
  document.getElementById("cmPostCall").hidden = true;
  document.querySelectorAll("#cmMoodBar button").forEach(b => b.classList.remove("on"));
}

function beginCall(){
  const checked = [...document.querySelectorAll(".diag input:checked")];
  const prospect = getState().currentProspect;
  if(checked.length){
    const diagData = getDiagnosticsData();
    const hooks = getHooks();
    const keys = checked.map(c => c.dataset.d);
    const top = diagData.priorite.find(x => keys.includes(x));
    const num = parseInt((diagData.reco[top].a.match(/n°(\d+)/) || [])[1]);
    if(num) cmAcc = hooks.familles[num - 1].q0;
    const mun = checked.slice(0, 2).map(c => c.parentElement.textContent.trim().toLowerCase());
    cmObs = "« J'ai jeté un œil avant de vous appeler, et il y a un truc qui m'a fait tiquer : " + mun.join(", et ") + ". »<br><br>« Je peux vous dire ce que ça change, vu de l'extérieur ? »";
  }
  const prospectInput = document.getElementById("cmProspect");
  prospectInput.value = prospect ? prospect.nom : "";
  document.getElementById("cmPreCall").hidden = true;
  document.getElementById("cmLive").hidden = false;
  clearInterval(cmTimer);
  cmTimer = setInterval(() => {
    cmSec++;
    const m = String(Math.floor(cmSec / 60)).padStart(2, "0"), s = String(cmSec % 60).padStart(2, "0");
    document.getElementById("cmChrono").textContent = m + ":" + s;
    if(cmSec % 120 === 0) flashMsg("⚠ Fais-le parler : une question, puis silence.", 6000);
  }, 1000);
  document.getElementById("cmChrono").textContent = "00:00";
  flashMsg("Tu es prêt. Suis l'écran, une question à la fois.", 4000);
  cmRender();
}

/* ===================== RENDU DES ÉCRANS ===================== */
function cmRender(){
  const st = cmStepDef(cmIdx);
  document.getElementById("cmProgBar").style.width = Math.round(cmIdx / CM_TOTAL * 100) + "%";
  const actions = cmResp(cmIdx);
  if(cmIdx > 1) actions.push({ l: "↩ Étape précédente", c: "r-ghost", f: () => { cmIdx--; cmRender(); } });
  paint({ goal: GOALS[cmIdx], verbatim: st.v, tip: st.tip, actions });
}

function cmMini(verbatim, tip, next){
  paint({
    goal: GOALS[cmIdx], verbatim, tip,
    actions: [
      { l: "✓ Dit → je continue", c: "r-g", f: () => { cmIdx = next; cmRender(); } },
      { l: "🔴 Toujours fermé", c: "r-r", f: () => { cmRefus++; if(cmRefus >= 3) cmStop("ferme"); else cmRender(); } }
    ]
  });
}

function cmRed(cat){ cmRefus++; if(cmRefus >= 3){ cmStop("ferme"); return; } cmObj(cat); }

function cmObj(cat){
  const g = getObjections()[cat];
  const verbatim = g.items.map(i => '<div class="cm-verbatim-sm"><b>' + i[0] + '</b><div>' + i[1] + '</div></div>').join("");
  paint({
    caption: g.titre + " · refus " + cmRefus + "/3",
    verbatim,
    actionsLabel: "Et maintenant ?",
    actions: [
      { l: "✓ Objection traitée, il réécoute → retour au script", c: "r-g", f: () => { flashMsg("Bien géré. Tu reprends le fil.", 3000); cmRender(); } },
      { l: "🔴 Toujours fermé", c: "r-r", f: () => { cmRefus++; if(cmRefus >= 3) cmStop("ferme"); else cmRender(); } }
    ]
  });
}

function cmRepondeur(){
  const p = persona();
  const verbatim =
    '<div class="cm-verbatim-sm"><b>1er vocal (15 sec)</b><div>« Bonjour [Prénom], [Prénom], je vous appelle de la part de Loïc. Rien d\'urgent, pas besoin de me rappeler : je vous envoie un mail là tout de suite, dites-moi juste si c\'est pertinent. À bientôt. »</div></div>' +
    '<div class="cm-verbatim-sm"><b>2e vocal (30 sec, dernière fois)</b><div>« Rebonjour [Prénom]. Loïc accompagne des ' + p.nom.toLowerCase() + 's à devenir les références de leur secteur, et votre profil est ressorti. Vous êtes sûrement déjà bien installé là-dessus, mais je vous renvoie un mail : répondez-moi juste oui ou non. Merci. »</div></div>';
  paint({
    caption: "Répondeur · Double Tap, zéro pitch",
    verbatim,
    tip: "Maximum 2 vocaux par prospect. Tout l'argumentaire va dans le mail, jamais dans le vocal.",
    actionsLabel: "Et maintenant ?",
    actions: [
      { l: "☎ Vocal laissé → appel suivant", c: "r-g", f: () => finishCall("rep") },
      { l: "↩ Il a finalement décroché", c: "r-ghost", f: cmRender }
    ]
  });
}

function cmStop(type){
  let v, tip, caption;
  if(type === "horscible"){
    caption = "🛑 Hors cible : c'est toi qui annules";
    v = "« Je vais être franc, je ne suis pas sûr que ce soit le bon moment pour vous. Je préfère vous le dire plutôt que de vous faire venir pour rien. Le jour où [l'activité tourne / vous êtes dans la zone], rappelez-moi. »";
    tip = "Poli, ferme, définitif. Score géo ou maturité insuffisant : sortie CRM, on ne relance pas.";
  } else {
    caption = "🛑 Trois signaux fermés : on arrête";
    v = "« Écoutez, je ne vais pas insister. Merci pour votre franchise, bonne journée. »";
    tip = "Un excellent commercial sait abandonner. Ce n'est ni un échec ni un débat à gagner : on passe au suivant, le volume fait le reste.";
  }
  paint({
    caption, verbatim: v, tip, tone: "alert",
    actionsLabel: "Et maintenant ?",
    actions: [{ l: "Clôturer l'appel → suivant", c: "r-r", f: cmShowEnd }]
  });
}

function cmShowEnd(){
  document.getElementById("cmEnd").hidden = false;
  document.getElementById("cmLive").hidden = true;
}
function cmHideEnd(){
  document.getElementById("cmEnd").hidden = true;
  document.getElementById("cmLive").hidden = false;
  cmRender();
}

/* ===================== FIN D'APPEL ===================== */
function finishCall(o){
  clearInterval(cmTimer);
  kpi("appels", 1);
  if(o === "dec" || o === "conv" || o === "rdv") kpi("decroches", 1);
  if(o === "conv" || o === "rdv") kpi("conversations", 1);
  if(o === "rdv") kpi("rdv", 1);
  document.getElementById("cmEnd").hidden = true;
  document.getElementById("cmLive").hidden = true;

  if(o === "rdv" || o === "conv"){
    resetFiche();
    const n = document.getElementById("cmProspect").value;
    if(n) document.getElementById("f-nom").value = n;
    document.getElementById("cmPostCall").hidden = false;
    document.getElementById("postCallFlash").textContent = o === "rdv"
      ? "RDV décroché. Un de plus vers l'objectif du jour. Remplis le score puis enregistre la fiche."
      : "Bonne conversation. Remplis le score : il te dira comment relancer.";
  } else {
    showMode("mission");
  }
}

document.addEventListener("s3k:endCall", () => showMode("mission"));

/* Launch call with prospect pre-filled */
export function launchCallWithProspect(prospect) {
  // Fill prospect name
  const prospectInput = document.getElementById("cmProspect");
  if (prospectInput && prospect.nom) {
    prospectInput.value = prospect.nom;
  }

  // Pre-select persona if available
  if (prospect.persona) {
    const personas = getPersonas();
    const personaKey = Object.keys(personas).find(
      k => personas[k]?.nom === prospect.persona
    );
    if (personaKey) {
      document.querySelectorAll(".startPersonaBtn").forEach(btn => {
        btn.classList.toggle("selected", btn.dataset.persona === personaKey);
      });
    }
  }

  // Switch to call mode
  showMode("copilote");
}

export function initCallMode(){
  window.launchCallWithProspect = launchCallWithProspect;
  window.startCall = startCall;
  window.cmShowEnd = cmShowEnd;
  window.cmHideEnd = cmHideEnd;
  window.cmObj = cmObj;
  window.cmRepondeur = cmRepondeur;
  window.finishCall = finishCall;

  document.getElementById("cmBeginBtn")?.addEventListener("click", beginCall);
  document.getElementById("cmBackToMission")?.addEventListener("click", () => showMode("mission"));

  document.querySelectorAll("#cmMoodBar button").forEach(b => {
    b.addEventListener("click", () => {
      cmMood = (cmMood === b.dataset.m) ? "" : b.dataset.m;
      document.querySelectorAll("#cmMoodBar button").forEach(x => x.classList.toggle("on", x.dataset.m === cmMood));
      const tipEl = document.getElementById("cmMoodTip");
      if(tipEl) tipEl.textContent = cmMood ? MOODTIPS[cmMood] : "";
    });
  });
}
