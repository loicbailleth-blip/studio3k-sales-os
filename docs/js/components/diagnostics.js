/* GPS de diagnostic — étape optionnelle de l'écran « Avant d'appeler » du Copilote.
   Chaque diagnostic coché construit le chemin complet de l'appel à venir : Angle → Accroche →
   Question → Objection probable → Closing. Rien à cocher : l'appel part sur l'accroche par
   défaut (Famille 1, auto-diagnostic), exactement comme un GPS sans infos supplémentaires. */
import { getState, setState } from "../state.js";
import { indexEntries } from "../services/searchEngine.js";

let DATA = null;

export async function loadDiagnostics(){
  if(DATA) return DATA;
  const res = await fetch("js/data/diagnostics.json");
  DATA = await res.json();
  return DATA;
}

export function getDiagnosticsData(){ return DATA; }

function renderChecklist(){
  const wrap = document.getElementById("diagChecklist");
  if(!wrap) return;
  const checked = new Set(getState().diagChecked || []);
  wrap.innerHTML = DATA.checklist.map(d =>
    `<label><input type="checkbox" data-d="${d.key}" ${checked.has(d.key)?"checked":""}> ${d.label}</label>`
  ).join("");
}

function computeReco(){
  const checkedInputs = [...document.querySelectorAll(".diag input:checked")];
  const box = document.getElementById("recoBox");
  const checked = checkedInputs.map(c => c.dataset.d);
  setState({ diagChecked: checked });
  if(!checked.length){
    box.innerHTML = "Rien coché ? Pas grave : l'appel part sur l'accroche par défaut (auto-diagnostic).";
    return;
  }
  const top = DATA.priorite.find(p => checked.includes(p));
  const r = DATA.reco[top];
  const obsList = checkedInputs.map(c => "« " + c.parentElement.textContent.trim() + " »").slice(0, 4).join(" · ");
  box.innerHTML = `<b style="font-size:15px">Ton appel s'adapte déjà</b>
    <div style="margin-top:10px;line-height:2">
    <span class="tag or">Angle</span>${r.angle}<br>
    <span class="tag non">Objection probable</span>${r.objLabel}<br>
    <span class="tag oui">Closing recommandé</span>${r.clo}
    </div>
    <div class="note" style="margin-top:8px">Basé sur : ${obsList}</div>`;
}

export async function initDiagnostics(){
  await loadDiagnostics();
  renderChecklist();
  document.querySelectorAll(".diag input").forEach(c => c.addEventListener("change", computeReco));
  computeReco();

  indexEntries(Object.entries(DATA.reco).map(([key, r]) => ({
    section: "s2",
    title: "Diagnostic · " + (DATA.checklist.find(c => c.key === key)?.label || key),
    text: [r.angle, r.q, r.objLabel, r.clo].join(" "),
    onSelect(){}
  })));
}
