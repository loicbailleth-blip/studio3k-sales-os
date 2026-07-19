/* Fiche qualification + Score /100 (section 8). Clé localStorage historique conservée : fiches3k. */
import { getJSON, setJSON, remove, KEYS } from "../services/storage.js";

function val(id){ return document.getElementById(id).value; }

export function calcScore(){
  let t = 0;
  document.querySelectorAll(".sc").forEach(s => t += parseInt(s.value, 10));
  document.getElementById("scoreTotal").textContent = t;
  const v = document.getElementById("verdict");
  const horsZone = document.getElementById("f-geo").value.startsWith("Plus de 2h");
  if(horsZone){ v.className = "v-out"; v.textContent = "HORS ZONE : sortie, quel que soit le score"; return; }
  if(t >= 85){ v.className = "v-hot"; v.textContent = "85+ · PRIORITÉ ABSOLUE : RDV cette semaine, préparez le goodwill"; }
  else if(t >= 60){ v.className = "v-mid"; v.textContent = "60-84 · RELANCE : séquence J+1 / J+7 / J+30"; }
  else { v.className = "v-out"; v.textContent = "Moins de 60 · SORTIE CRM : on ne relance pas, on passe"; }
}

function ficheLine(){
  const g = id => val(id).replace(/;/g, ",");
  const t = document.getElementById("scoreTotal").textContent;
  return [
    new Date().toISOString().slice(0, 10),
    g("f-nom"), g("f-ent"), g("f-persona"), g("f-ca"), g("f-equipe"), g("f-geo"), g("f-mkt"), g("f-obj"),
    t, document.getElementById("verdict").textContent,
    g("f-notes").replace(/\n/g, " ").replace(/;/g, ",")
  ].join(";");
}

function flash(msg, ms = 2500){
  const el = document.getElementById("ficheCopied");
  el.textContent = msg;
  setTimeout(() => { el.textContent = ""; }, ms);
}

export function copyFiche(){
  navigator.clipboard.writeText(ficheLine()).then(() => flash("Copié ✓"));
}

export function ficheCount(){
  const n = getJSON(KEYS.FICHES, []).length;
  const txt = n + " fiche" + (n > 1 ? "s" : "") + " enregistrée" + (n > 1 ? "s" : "") + " aujourd'hui.";
  document.querySelectorAll(".fiche-count-display").forEach(el => el.textContent = txt);
}

export function resetFiche(){
  ["f-nom", "f-ent", "f-ca", "f-equipe", "f-mkt", "f-obj", "f-notes"].forEach(id => document.getElementById(id).value = "");
  document.querySelectorAll(".sc").forEach(s => s.selectedIndex = 0);
  document.getElementById("f-geo").selectedIndex = 2;
  calcScore();
}

export function saveFiche(){
  if(!val("f-nom") && !val("f-ent")){ flash("Nom ou entreprise requis"); return; }
  const arr = getJSON(KEYS.FICHES, []);
  arr.push(ficheLine());
  setJSON(KEYS.FICHES, arr);
  resetFiche();
  ficheCount();
  flash("Fiche enregistrée ✓ Champs prêts pour l'appel suivant.", 3000);
}

export function exportFiches(){
  const arr = getJSON(KEYS.FICHES, []);
  if(!arr.length){ flash("Aucune fiche à exporter"); return; }
  const header = "date;nom;entreprise;persona;ca_estime;equipe;distance_roubaix;marketing_actuel;objectif;score;verdict;notes";
  const blob = new Blob(["﻿" + header + "\n" + arr.join("\n") + "\n"], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "Fiches_Appels_" + new Date().toISOString().slice(0, 10) + ".csv";
  a.click();
  if(confirm("Export téléchargé. Glissez-le dans le dossier Fiches_Appels_Realises.\n\nVider les fiches enregistrées pour demain ?")){
    remove(KEYS.FICHES);
    ficheCount();
  }
}

export function initFiche(){
  document.querySelectorAll(".sc").forEach(s => s.addEventListener("change", calcScore));
  document.getElementById("f-geo").addEventListener("change", calcScore);
  window.saveFiche = saveFiche;
  window.exportFiches = exportFiches;
  window.copyFiche = copyFiche;
  calcScore();
  ficheCount();
}
