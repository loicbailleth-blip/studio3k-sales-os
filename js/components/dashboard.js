/* KPI du jour (section 11). Clé localStorage historique conservée : kpi3k. */
import { getJSON, setJSON, remove, KEYS } from "../services/storage.js";

const KEYS_KPI = ["appels", "decroches", "conversations", "rdv", "show", "signature"];

function golden(){
  const d = getJSON(KEYS.KPI, {});
  const pct = (a, b) => b > 0 ? Math.round(100 * a / b) + "%" : "0%";
  document.getElementById("g-connect").textContent = pct(d.decroches || 0, d.appels || 0);
  document.getElementById("g-set").textContent = pct(d.rdv || 0, d.conversations || 0);
  document.getElementById("g-show").textContent = pct(d.show || 0, d.rdv || 0);
}

export function loadKpi(){
  const d = getJSON(KEYS.KPI, {});
  KEYS_KPI.forEach(k => document.getElementById("k-" + k).textContent = d[k] || 0);
  golden();
}

export function kpi(k, delta){
  const d = getJSON(KEYS.KPI, {});
  d[k] = Math.max(0, (d[k] || 0) + delta);
  setJSON(KEYS.KPI, d);
  loadKpi();
}

function flash(msg, ms = 4000){
  const el = document.getElementById("kpiCopied");
  el.textContent = msg;
  setTimeout(() => { el.textContent = ""; }, ms);
}

export function copyKpi(){
  const d = getJSON(KEYS.KPI, {});
  const line = [new Date().toISOString().slice(0, 10), ...KEYS_KPI.map(k => d[k] || 0)].join(",");
  navigator.clipboard.writeText(line).then(() => flash("Copié ✓ Collez dans COLD-CALLING-KPI-LOG.csv"));
}

export function resetKpi(){
  if(confirm("Remettre les compteurs à zéro ? (copiez d'abord la ligne CSV)")){
    remove(KEYS.KPI);
    loadKpi();
  }
}

export function initDashboard(){
  window.kpi = kpi;
  window.copyKpi = copyKpi;
  window.resetKpi = resetKpi;
  loadKpi();
}
