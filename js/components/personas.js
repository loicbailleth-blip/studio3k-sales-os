/* Persona actif (choisi sur l'écran « Avant d'appeler » du Copilote) + moteur d'appel de
   référence (Bibliothèque > Personas). Le moteur change de contenu selon le persona. */
import { getState, setState } from "../state.js";
import { indexEntries } from "../services/searchEngine.js";

let PERSONAS = null;

export async function loadPersonas(){
  if(PERSONAS) return PERSONAS;
  const res = await fetch("js/data/personas.json");
  PERSONAS = await res.json();
  return PERSONAS;
}

export function getPersonas(){ return PERSONAS; }
export function getCurrentPersonaKey(){ return getState().persona || "pme"; }
export function getCurrentPersona(){ return PERSONAS[getCurrentPersonaKey()]; }

export function renderMoteur(){
  const p = getCurrentPersona();
  const el = document.getElementById("moteur");
  if(!el || !p) return;
  el.innerHTML = `
  <div class="card"><b>1 · Ouverture « de la part de Loïc »</b> <span class="tag or">autorité empruntée : vous ne vendez rien, vous êtes mandaté</span>
    <div class="verbatim">« Bonjour [Prénom / Maître / Docteur]. [Prénom du commercial] à l'appareil, je vous appelle de la part de Loïc. Il accompagne des ${p.nom.toLowerCase()}s à devenir les références de leur secteur grâce à des interviews premium. J'avais une question. »<em>⏸ Ton posé, descendant. Pas de permission, pas d'excuse : la curiosité remplace la permission. « J'avais une question » ouvre une boucle que son cerveau doit fermer.</em></div></div>
  <div class="card"><b>2 · La question d'ouverture</b> <span class="tag or">selon la famille choisie (voir section Familles). Défaut : auto-diagnostic</span>
    <div class="verbatim">« Sur l'image d'expert que vous renvoyez aujourd'hui, spontanément, vous vous mettriez combien sur 10 ? »<em>⏸ SILENCE ABSOLU. Il se diagnostique lui-même : personne ne répond 10. Notez son chiffre, c'est de l'or pour la suite.</em></div></div>
  <div class="card"><b>3 · Creuser le chiffre</b> <span class="tag or">faire verbaliser : c'est lui qui décrit le problème</span>
    <div class="verbatim">« Un ${"[son chiffre]"}. Qu'est-ce qui manque pour que ce soit un 9 ? »<em>⏸ Il liste lui-même ce qui lui manque. Relances : « C'est-à-dire ? » « Et à part ça ? » Ne commentez RIEN, encaissez.</em></div></div>
  <div class="card"><b>4 · La question pivot</b> <span class="tag or">l'embranchement : sa réponse choisit le chemin</span>
    <div class="verbatim">« Aujourd'hui, la majorité de vos clients viennent d'où ? »<em>⏸ Sa réponse oriente tout (voir Qualification guidée) : bouche-à-oreille, Google, réseaux, LinkedIn, publicité.</em></div></div>
  <div class="card"><b>5 · La conséquence</b> <span class="tag or">le coût caché, dit avec ses mots</span>
    <div class="verbatim">« ${p.cons} »<br>« ${p.consQ} »<em>⏸ Silence. Il parle. Le problème est maintenant à lui, pas à vous.</em></div></div>
  <div class="card"><b>6 · Le décalage</b> <span class="tag or">la raison de l'appel : Loïc l'a repéré, lui</span>
    <div class="verbatim">« C'est exactement pour ça que Loïc m'a demandé de vous appeler. Son constat, c'est que les meilleurs sont rarement ceux qu'on voit. Et il pense que vous êtes typiquement ce profil-là : quelqu'un qui vaut clairement plus que ce que l'on voit de vous aujourd'hui. »<em>Résultat évoqué : ${p.resultat}. Jamais le studio, jamais le moyen. Son cerveau doit visualiser une interview haut de gamme, pas une prestation.</em></div></div>
  <div class="card"><b>7 · L'échange avec Loïc</b> <span class="tag or">on ne vend rien : on vérifie si le profil mérite l'échange</span>
    <div class="verbatim">« Je ne vous propose rien, ce n'est pas mon rôle. Loïc prend 15-20 minutes avec certains profils : il analyse votre positionnement, votre crédibilité actuelle, votre potentiel, et il vous dit honnêtement si une stratégie de référence a du sens pour vous, ou pas. Il ne le fait pas avec tout le monde. »<br>« Vous seriez plutôt début ou fin de semaine ? » ⏸ « Matin ou après-midi ? » ⏸ « Parfait, mardi 11h, je vous envoie l'invitation tout de suite. »<em>Une <b>${p.audit}</b>, jamais une vente. Le « il ne le fait pas avec tout le monde » retourne la sélection : c'est lui qui doit se qualifier.</em></div></div>
  <div class="card"><b>8 · Le filtre</b> <span class="tag non">juste après le oui, jamais sauté</span>
    <div class="verbatim">« Avant que je bloque le créneau : Loïc est exigeant sur les profils. Il travaille depuis son plateau à Roubaix, avec des activités qui tournent déjà. Vous êtes à quelle distance, et vous êtes combien aujourd'hui ? »<em>Hors zone / trop tôt : « Je vais être franc avec vous, je ne suis pas sûr que Loïc retienne le profil pour l'instant. Je préfère vous le dire que de vous faire perdre 20 minutes. » Dans la cible : « Parfait, vous êtes exactement le type de profil qu'il analyse. »</em></div></div>
  <div class="card"><b>9 · Verrouillage</b>
    <div class="verbatim">« C'est noté pour [jour, heure]. Je vous envoie l'invitation là tout de suite : acceptez-la, comme ça je confirme à Loïc que le créneau est pris. Il prépare toujours un peu le profil avant l'échange. »<em>« Il prépare le profil » : l'engagement est réciproque, annuler devient coûteux. La veille : mail goodwill écrit main avec un détail personnel repéré. Jamais de rappel automatique.</em></div></div>`;
}

export function choosePersona(key){
  setState({ persona: key });
  document.querySelectorAll("[data-persona-bar] button").forEach(x => x.classList.toggle("on", x.dataset.p === key));
  renderMoteur();
  document.dispatchEvent(new CustomEvent("s3k:personaChanged", { detail: { persona: key } }));
}

export async function initPersonas(){
  await loadPersonas();
  const current = getCurrentPersonaKey();
  document.querySelectorAll("[data-persona-bar] button").forEach(b => {
    b.classList.toggle("on", b.dataset.p === current);
    b.addEventListener("click", () => choosePersona(b.dataset.p));
  });
  renderMoteur();

  indexEntries(Object.entries(PERSONAS).map(([key, p]) => ({
    section: "bibliotheque",
    libTab: "personas",
    title: "Moteur d'appel · " + p.nom,
    text: [p.obs, p.diag, p.preempt, p.cons, p.consQ, p.resultat, p.audit].join(" "),
    onSelect(){ choosePersona(key); }
  })));
}
