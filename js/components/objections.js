/* Bibliothèque > Objections : support de révision/jeu de rôle. En appel réel, la barre
   d'objections du Copilote (cm-objbar) appelle directement les mêmes réponses via goObj(). */
import { getState, setState } from "../state.js";
import { indexEntries } from "../services/searchEngine.js";

let OBJ = null;

export async function loadObjections(){
  if(OBJ) return OBJ;
  const res = await fetch("js/data/objections.json");
  OBJ = await res.json();
  return OBJ;
}

export function getObjections(){ return OBJ; }

export function renderObj(cat){
  const g = OBJ[cat];
  const el = document.getElementById("objContent");
  if(!g || !el) return;
  el.innerHTML =
    `<h3>${g.titre} · ${g.items.length} réponses</h3>` +
    g.items.map(i => `<div class="card"><b>${i[0]}</b><div class="verbatim">${i[1]}</div></div>`).join("");
}

function selectTab(cat){
  document.querySelectorAll("#objTabs button").forEach(b => b.classList.toggle("on", b.dataset.o === cat));
  renderObj(cat);
  setState({ objTab: cat });
}

export async function initObjections(){
  await loadObjections();

  document.querySelectorAll("#objTabs button").forEach(b => {
    b.addEventListener("click", () => selectTab(b.dataset.o));
  });

  document.addEventListener("s3k:selectObjection", (e) => selectTab(e.detail.cat));

  selectTab(getState().objTab || "temps");

  indexEntries(Object.entries(OBJ).flatMap(([cat, g]) =>
    g.items.map(i => ({
      section: "bibliotheque",
      libTab: "objections",
      title: g.titre.split("·")[0].trim() + " — " + i[0],
      text: i[1],
      onSelect(){ selectTab(cat); }
    }))
  ));
}
