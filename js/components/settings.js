/* Bibliothèque > Paramètres : thème clair/sombre, objectif d'appels du jour, remise à zéro
   des données locales. Un onglet parmi d'autres — plus un panneau flottant séparé. */
import { toggleTheme } from "../services/theme.js";
import { getState } from "../state.js";
import { remove, KEYS } from "../services/storage.js";
import { setDailyObjective } from "./mission.js";


export function initSettings(){
  const themeInput = document.getElementById("themeSwitch");
  const objectiveInput = document.getElementById("dailyObjectiveInput");
  if(!themeInput) return;

  themeInput.checked = getState().theme === "light";
  if(objectiveInput) objectiveInput.value = getState().dailyObjective || 300;

  themeInput.addEventListener("change", () => {
    const t = toggleTheme();
    themeInput.checked = t === "light";
  });

  objectiveInput?.addEventListener("change", () => setDailyObjective(objectiveInput.value));

  document.getElementById("resetAllData")?.addEventListener("click", () => {
    if(confirm("Effacer les fiches enregistrées, les KPI du jour et les préférences ? Cette action est irréversible.")){
      remove(KEYS.FICHES);
      remove(KEYS.KPI);
      remove(KEYS.STATE);
      location.reload();
    }
  });
}
