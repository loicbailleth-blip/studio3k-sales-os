/* Bibliothèque > Paramètres : thème clair/sombre, objectif d'appels du jour, remise à zéro
   des données locales. Un onglet parmi d'autres — plus un panneau flottant séparé. */
import { toggleTheme } from "../services/theme.js";
import { getState } from "../state.js";
import { remove, KEYS } from "../services/storage.js";
import { setDailyObjective } from "./mission.js";

function flash(msg, ms = 2500){
  const el = document.getElementById("notionConfigMsg");
  if(!el) return;
  el.textContent = msg;
  el.style.color = msg.includes("✓") ? "var(--vert)" : "var(--rouge)";
  setTimeout(() => { el.textContent = ""; }, ms);
}

function loadNotionConfig(){
  const token = localStorage.getItem("notion_token") || "";
  const dbId = localStorage.getItem("notion_db_id") || "";
  document.getElementById("notionToken").value = token;
  document.getElementById("notionDbId").value = dbId;
}

function saveNotionConfig(){
  const token = document.getElementById("notionToken").value.trim();
  const dbId = document.getElementById("notionDbId").value.trim();

  if(!token || !dbId){
    flash("Token et Database ID requis");
    return;
  }

  localStorage.setItem("notion_token", token);
  localStorage.setItem("notion_db_id", dbId);
  flash("Configuration Notion enregistrée ✓");
}

function clearNotionConfig(){
  if(!confirm("Supprimer la configuration Notion ?")) return;
  localStorage.removeItem("notion_token");
  localStorage.removeItem("notion_db_id");
  document.getElementById("notionToken").value = "";
  document.getElementById("notionDbId").value = "";
  flash("Configuration Notion supprimée");
}

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

  document.getElementById("saveNotionConfig")?.addEventListener("click", saveNotionConfig);
  document.getElementById("clearNotionConfig")?.addEventListener("click", clearNotionConfig);

  loadNotionConfig();

  window.saveNotionConfig = saveNotionConfig;
  window.clearNotionConfig = clearNotionConfig;
}
