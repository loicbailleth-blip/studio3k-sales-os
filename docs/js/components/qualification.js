/* Bibliothèque > Formation > Qualification guidée : la question pivot, puis le chemin
   correspondant à sa réponse. Référence pour comprendre ce que fait automatiquement le
   Copilote (cmChemin) à l'étape 4 d'un appel réel. */
import { getState, setState } from "../state.js";
import { indexEntries } from "../services/searchEngine.js";

let DATA = null;

export async function loadQualification(){
  if(DATA) return DATA;
  const res = await fetch("js/data/qualification.json");
  DATA = await res.json();
  return DATA;
}

function selectBranch(key){
  document.querySelectorAll("#qualTabs button").forEach(b => b.classList.toggle("on", b.dataset.q === key));
  document.querySelectorAll("#qualPanels .objGroup").forEach(g => g.classList.toggle("visible", g.id === key));
  setState({ qualTab: key });
}

export async function initQualification(){
  await loadQualification();
  const pivotEl = document.getElementById("qualPivot");
  const tabsEl = document.getElementById("qualTabs");
  const panelsEl = document.getElementById("qualPanels");
  if(!pivotEl || !tabsEl || !panelsEl) return;

  pivotEl.textContent = DATA.pivot;

  tabsEl.innerHTML = DATA.branches.map(b =>
    `<button data-q="${b.key}">${b.label}</button>`
  ).join("");

  panelsEl.innerHTML = DATA.branches.map(b => `
    <div id="${b.key}" class="objGroup card">
      <h3 style="margin-top:0">${b.titre}</h3>
      ${b.verbatims.map(v => `<div class="verbatim">${v}</div>`).join("")}
    </div>`).join("");

  tabsEl.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => selectBranch(btn.dataset.q));
  });

  const startKey = getState().qualTab || DATA.branches.find(b => b.default)?.key || DATA.branches[0].key;
  selectBranch(startKey);

  indexEntries(DATA.branches.map(b => ({
    section: "bibliotheque",
    libTab: "formation",
    title: b.titre,
    text: b.verbatims.join(" "),
    onSelect(){ selectBranch(b.key); }
  })));
}
