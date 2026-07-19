/* Bibliothèque > Familles d'accroches. Contenu déclaratif, rendu depuis hooks.json. */
import { indexEntries } from "../services/searchEngine.js";

let HOOKS = null;

export async function loadHooks(){
  if(HOOKS) return HOOKS;
  const res = await fetch("js/data/hooks.json");
  HOOKS = await res.json();
  return HOOKS;
}

export function getHooks(){ return HOOKS; }

function fill(v){ return v.replace("{{CADRE}}", HOOKS.cadre); }

export async function initHooks(){
  await loadHooks();
  const box = document.getElementById("accList");
  if(!box) return;
  box.innerHTML = HOOKS.familles.map(a => `
   <div class="card ${a.s===5?'gold':''}">
     <div style="display:flex;justify-content:space-between;align-items:baseline"><b>${a.t}</b><span class="stars" title="Niveau de performance">${"★".repeat(a.s)}${"☆".repeat(5-a.s)}</span></div>
     <div class="verbatim">${fill(a.v)}</div>
     <p style="margin-top:8px"><span class="tag or">Objectif psychologique</span>${a.psy}</p>
     <p style="margin-top:5px"><span class="tag oui">Quand l'utiliser</span>${a.oui}</p>
     <p style="margin-top:5px"><span class="tag non">Quand ne pas l'utiliser</span>${a.non}</p>
     <p style="margin-top:5px"><span class="tag or">Personas concernés</span>${a.pers}</p>
     <p style="margin-top:5px"><span class="tag non">Erreurs fréquentes</span>${a.err}</p>
   </div>`).join("");

  indexEntries(HOOKS.familles.map(a => ({
    section: "bibliotheque",
    libTab: "accroches",
    title: a.t,
    text: [fill(a.v), a.psy, a.oui, a.non, a.err].join(" "),
    onSelect(){}
  })));
}
