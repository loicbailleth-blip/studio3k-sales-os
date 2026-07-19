/* Mode 1 — Mission. Écran d'accueil : où j'en suis aujourd'hui, un seul bouton pour avancer.
   Aucune décision à prendre ici — juste le point de départ vers le Copilote d'appel. */
import { getJSON, KEYS } from "../services/storage.js";
import { getState, setState } from "../state.js";
import { showMode } from "../router.js";
import { startCall } from "./callMode.js";

const KPI_KEYS = ["appels", "decroches", "conversations", "rdv", "show", "signature"];

function readKpi(){
  const d = getJSON(KEYS.KPI, {});
  const out = {};
  KPI_KEYS.forEach(k => out[k] = d[k] || 0);
  return out;
}

function greeting(appels, objectif){
  if(appels === 0) return "Prêt à décrocher ton premier rendez-vous du jour.";
  if(appels < objectif) return "Continue, chaque appel te rapproche de l'objectif.";
  return "Objectif du jour atteint — encore un appel de plus ?";
}

export function renderMission(){
  const el = document.getElementById("mode-mission");
  if(!el) return;
  const kpi = readKpi();
  const objectif = getState().dailyObjective || 300;
  const pct = Math.min(100, Math.round((kpi.appels / objectif) * 100));

  document.getElementById("missionGreeting").textContent = greeting(kpi.appels, objectif);
  document.getElementById("missionStats").innerHTML = `
    <div class="mstat"><div class="mstat-n">${kpi.appels}</div><div class="mstat-l">Appels<span>/ ${objectif}</span></div></div>
    <div class="mstat mstat-accent"><div class="mstat-n">${kpi.rdv}</div><div class="mstat-l">RDV pris</div></div>`;
  document.getElementById("missionProgBar").style.width = pct + "%";
  document.getElementById("missionProgTxt").textContent = pct + "% de l'objectif du jour";
}

export function initMission(){
  document.getElementById("startCallBtn")?.addEventListener("click", () => startCall());
  document.getElementById("libBtn")?.addEventListener("click", () => showMode("bibliotheque"));
  document.getElementById("settingsBtn")?.addEventListener("click", () => {
    showMode("bibliotheque");
    document.dispatchEvent(new CustomEvent("s3k:selectLibTab", { detail: { tab: "parametres" } }));
  });

  document.addEventListener("s3k:modeChanged", (e) => {
    if(e.detail.mode === "mission") renderMission();
  });

  renderMission();
}

export function setDailyObjective(n){
  const v = Math.max(1, parseInt(n, 10) || 300);
  setState({ dailyObjective: v });
  renderMission();
}
