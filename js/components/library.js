/* Mode 3 — Bibliothèque. Tout ce qui n'est pas utilisé EN DIRECT pendant un appel : formation,
   détail des personas, familles d'accroches, questions, objections, historique, paramètres.
   Rien n'est décidé ici pour le commercial : c'est un lieu d'étude, pas un flux à suivre. */
import { getState, setState } from "../state.js";
import { getPersonas, getCurrentPersonaKey, renderMoteur } from "./personas.js";
import { getHooks } from "./hooks.js";
import { getObjections } from "./objections.js";
import { getQuestions } from "./questions.js";
import { loadKpi } from "./dashboard.js";
import { ficheCount } from "./fiche.js";

let FOCUS = null;
let PROSPECTS = null;

async function loadFocus(){
  if(FOCUS) return FOCUS;
  const res = await fetch("js/data/personaFocus.json");
  FOCUS = await res.json();
  return FOCUS;
}

async function loadProspects(){
  if(PROSPECTS) return PROSPECTS;
  const res = await fetch("js/data/prospects.json");
  PROSPECTS = await res.json();
  return PROSPECTS;
}

function renderProspects(segment){
  const prospects = PROSPECTS?.[segment] || [];
  const el = document.getElementById("prospectsContent");
  if(!el) return;

  if(prospects.length === 0){
    el.innerHTML = `<div class="card" style="padding:32px;text-align:center;">
      <p style="color:var(--gris);margin:0 0 16px 0;">Aucun prospect embarqué. Importe ta liste depuis le Fichier Clients.</p>
      <button class="btn btn-sm" onclick="window.showMode('clients')">Aller à l'import</button>
    </div>`;
    return;
  }

  el.innerHTML = prospects.map(p => `
    <div class="card prospect-card" data-segment="${segment}" data-prospect-id="${p.id}" onclick="window.loadProspectCardClick('${segment}', '${p.id}')">
      <div class="prospect-header">
        <h3 style="margin:0 0 4px 0">${p.nom}</h3>
        <span class="tag ${p.priorite === 1 ? 'or' : p.priorite === 2 ? 'ag' : 'gr'}">${p.ville}</span>
        ${p.site ? `<a href="${p.site}" target="_blank" class="prospect-link" onclick="event.stopPropagation()">site</a>` : ''}
      </div>
      <p class="note" style="margin:8px 0">${p.specialite}</p>
      <div class="prospect-angle">
        <b>Angle d'approche :</b>
        <p>${p.angle}</p>
      </div>
      <div class="prospect-strategie">
        <b>Stratégie :</b>
        <p>${p.strategie}</p>
      </div>
      <span class="tag ${p.priorite === 1 ? 'or' : p.priorite === 2 ? 'ag' : 'gr'}">Priorité ${p.priorite}</span>
    </div>
  `).join("");

  initProspectsCards();
}

function renderPersonaFocus(){
  const key = getCurrentPersonaKey();
  const p = getPersonas()?.[key];
  const f = FOCUS?.[key];
  const hooks = getHooks();
  const obj = getObjections();
  const questions = getQuestions();
  const el = document.getElementById("personaFocusBox");
  if(!el || !p || !f || !hooks || !obj || !questions) return;

  const familles = f.familles.map(n => hooks.familles[n - 1]);
  const objections = f.objections.map(cat => obj[cat]);
  const qcats = f.questions.map(n => questions[n - 1]);

  el.innerHTML = `
    <div class="card gold"><h3 style="margin-top:0">Douleur type</h3><p>${p.diag}</p></div>
    <h3>Ses accroches prioritaires</h3>
    ${familles.map(fam => `<div class="card"><b>${fam.t}</b><div class="verbatim">${fam.v.replace("{{CADRE}}", hooks.cadre)}</div></div>`).join("")}
    <h3>Ses objections fréquentes</h3>
    ${objections.map(o => `<div class="card"><b>${o.titre}</b>${o.items.slice(0, 1).map(i => `<div class="verbatim">${i[1]}</div>`).join("")}</div>`).join("")}
    <h3>Ses questions prioritaires</h3>
    ${qcats.map(q => `<div class="card"><b>${q.titre}</b><ul class="clean">${q.items.slice(0, 2).map(i => `<li>${i.q}</li>`).join("")}</ul></div>`).join("")}
  `;
}

function selectLibTab(tab){
  document.querySelectorAll("#libTabs button").forEach(b => b.classList.toggle("on", b.dataset.lib === tab));
  document.querySelectorAll(".libPanel").forEach(p => p.classList.toggle("visible", p.dataset.libtab === tab));
  setState({ libTab: tab });
  if(tab === "personas"){ renderMoteur(); renderPersonaFocus(); }
  if(tab === "prospects"){
    const segment = getState().prospectSegment || "avocats";
    renderProspects(segment);
    setTimeout(() => initProspectsTabs(), 50);
  }
  if(tab === "historique"){ loadKpi(); ficheCount(); }
}

function selectProspectSegment(segment){
  document.querySelectorAll("#prospectsTabs button").forEach(b => b.classList.toggle("on", b.dataset.segment === segment));
  setState({ prospectSegment: segment });
  renderProspects(segment);
}

function initProspectsTabs(){
  document.querySelectorAll("#prospectsTabs button[data-segment]").forEach(btn => {
    btn.addEventListener("click", () => selectProspectSegment(btn.dataset.segment));
  });
}

function initProspectsCards(){
  document.querySelectorAll(".prospect-card").forEach(card => {
    card.addEventListener("click", (e) => {
      if(e.target.classList.contains("prospect-link")) return;
      const segment = card.dataset.segment;
      const prospectId = card.dataset.prospectId;
      const prospect = PROSPECTS?.[segment]?.find(p => p.id === prospectId);
      if(prospect) {
        console.log("Prospect cliqué:", prospect.nom);
        displayProspectInCall(prospect);
      }
    });
  });
}

window.loadProspectCardClick = (segment, prospectId) => {
  const prospect = PROSPECTS?.[segment]?.find(p => p.id === prospectId);
  if(prospect) displayProspectInCall(prospect);
};

function displayProspectInCall(prospect){
  setState({ currentProspect: prospect });

  const box = document.getElementById("cmProspectInfo");
  if(box){
    box.innerHTML = `
      <div class="card" style="border-left: 4px solid var(--or-clair);">
        <h4 style="margin-top:0">${prospect.nom}</h4>
        <p class="note">${prospect.specialite} • ${prospect.ville}</p>
        <div style="margin-top:12px;">
          <b style="color:var(--laiton-clair)">📌 Angle d'approche :</b>
          <p style="font-size:0.95em; line-height:1.4;">${prospect.angle}</p>
        </div>
        <div style="margin-top:12px;">
          <b style="color:var(--laiton-clair)">💡 Stratégie :</b>
          <p style="font-size:0.95em; line-height:1.4;">${prospect.strategie}</p>
        </div>
      </div>
    `;
  }

  const nomInput = document.getElementById("cmProspect");
  if(nomInput) nomInput.value = prospect.nom;

  setTimeout(() => window.startCall(), 100);
}

export async function initLibrary(){
  await loadFocus();
  await loadProspects();

  document.querySelectorAll("#libTabs button").forEach(b => {
    b.addEventListener("click", () => selectLibTab(b.dataset.lib));
  });

  document.addEventListener("s3k:selectLibTab", (e) => selectLibTab(e.detail.tab));
  document.addEventListener("s3k:personaChanged", () => {
    if(getState().libTab === "personas") renderPersonaFocus();
  });
  document.addEventListener("s3k:modeChanged", (e) => {
    if(e.detail.mode === "bibliotheque" && getState().libTab === "historique"){ loadKpi(); ficheCount(); }
  });

  selectLibTab(getState().libTab || "formation");

  // Affiche Avocats au démarrage
  setState({ prospectSegment: "avocats" });
  renderProspects("avocats");
  initProspectsTabs();
}

