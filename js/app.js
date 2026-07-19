/* Bootstrap de l'application. Initialise l'état, les services, tous les composants,
   puis affiche l'app (transition douce plutôt qu'un flash de contenu vide). */
import { initTheme } from "./services/theme.js";
import { initRouter } from "./router.js";
import { clearIndex } from "./services/searchEngine.js";

import { initPersonas } from "./components/personas.js";
import { initHooks } from "./components/hooks.js";
import { initObjections } from "./components/objections.js";
import { initDiagnostics } from "./components/diagnostics.js";
import { initQualification } from "./components/qualification.js";
import { initQuestions } from "./components/questions.js";
import { initFiche } from "./components/fiche.js";
import { initDashboard } from "./components/dashboard.js";
import { initCallMode } from "./components/callMode.js";
import { initMission } from "./components/mission.js";
import { initLibrary } from "./components/library.js";
import { initSearch } from "./components/search.js";
import { initSettings } from "./components/settings.js";
import { initClients, loadClients } from "./components/clients.js";
import { loadWorkstationClients, initWorkstation } from "./components/clientsWorkstation.js";

async function boot(){
  initTheme();

  clearIndex();
  await Promise.all([
    initPersonas(),
    initHooks(),
    initObjections(),
    initDiagnostics(),
    initQualification(),
    initQuestions(),
    loadClients(),
    loadWorkstationClients()
  ]);
  initFiche();
  initDashboard();
  initCallMode();
  initSearch();
  initSettings();
  initMission();
  initClients();
  initWorkstation();
  await initLibrary();
  initRouter();

  document.getElementById("app").classList.add("ready");
}

boot();

/* ===================== PWA : installation & offline ===================== */
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const banner = document.getElementById("installBanner");
  if(banner && !window.matchMedia("(display-mode: standalone)").matches) banner.classList.add("visible");
});

document.getElementById("installAction")?.addEventListener("click", async () => {
  const banner = document.getElementById("installBanner");
  if(deferredPrompt){
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  }
  banner?.classList.remove("visible");
});
document.getElementById("installDismiss")?.addEventListener("click", () => {
  document.getElementById("installBanner")?.classList.remove("visible");
});

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
if(isIOS && !isStandalone){
  const banner = document.getElementById("installBanner");
  const txt = document.getElementById("installText");
  if(banner && txt){
    txt.innerHTML = "<b>Installer 3KOS SalesOS</b>Sur iPhone/iPad : appuyez sur Partager, puis « Sur l'écran d'accueil ».";
    document.getElementById("installAction")?.remove();
    banner.classList.add("visible");
  }
}

function updateOnlinePill(){
  const pill = document.getElementById("offlinePill");
  if(!pill) return;
  pill.classList.toggle("visible", !navigator.onLine);
}
window.addEventListener("online", updateOnlinePill);
window.addEventListener("offline", updateOnlinePill);
updateOnlinePill();

/* Service worker : fonctionnement hors ligne */
if("serviceWorker" in navigator){
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(err => console.warn("SW non enregistré :", err));
  });
}
