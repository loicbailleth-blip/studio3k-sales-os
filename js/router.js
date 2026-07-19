/* Routeur à 3 modes plein écran : Mission, Copilote d'appel, Bibliothèque.
   Pas de menu à 15 sections : un mode = un écran = une seule question à la fois. */
import { getState, setState } from "./state.js";

const MODES = ["mission", "copilote", "bibliotheque", "clients"];

export function showMode(mode, { skipHistory = false } = {}){
  if(!MODES.includes(mode)) return;
  document.querySelectorAll(".mode-screen").forEach(s => s.classList.remove("visible"));
  document.getElementById("mode-" + mode)?.classList.add("visible");
  document.querySelectorAll("#tabBar button[data-mode]").forEach(b => b.classList.toggle("on", b.dataset.mode === mode));
  document.getElementById("tabBar")?.classList.toggle("hidden", mode === "copilote");
  window.scrollTo(0, 0);
  setState({ currentMode: mode });
  if(!skipHistory && location.hash !== "#" + mode) history.pushState(null, "", "#" + mode);
  document.dispatchEvent(new CustomEvent("s3k:modeChanged", { detail: { mode } }));
}

/** Bascule vers la Bibliothèque, onglet Objections, catégorie donnée.
 *  Découplé du composant library.js via un évènement custom (évite les imports circulaires). */
export function goObj(cat){
  showMode("bibliotheque");
  document.dispatchEvent(new CustomEvent("s3k:selectLibTab", { detail: { tab: "objections" } }));
  document.dispatchEvent(new CustomEvent("s3k:selectObjection", { detail: { cat } }));
}

export function initRouter(){
  console.log("initRouter called");
  const buttons = document.querySelectorAll("#tabBar button[data-mode]");
  console.log("Found", buttons.length, "tabBar buttons");

  buttons.forEach(b => {
    console.log("Attaching listener to", b.dataset.mode);
    b.addEventListener("click", () => showMode(b.dataset.mode));
  });

  document.getElementById("libBtn")?.addEventListener("click", () => showMode("bibliotheque"));
  document.getElementById("settingsBtn")?.addEventListener("click", () => {
    showMode("bibliotheque");
    document.dispatchEvent(new CustomEvent("s3k:selectLibTab", { detail: { tab: "parametres" } }));
  });

  window.addEventListener("popstate", () => {
    const m = (location.hash || "").replace("#", "");
    if(MODES.includes(m)) showMode(m, { skipHistory: true });
  });

  const fromHash = (location.hash || "").replace("#", "");
  const initial = MODES.includes(fromHash) ? fromHash : (getState().currentMode || "mission");
  showMode(initial, { skipHistory: !fromHash });
}

window.goObj = goObj;
window.showMode = showMode;
