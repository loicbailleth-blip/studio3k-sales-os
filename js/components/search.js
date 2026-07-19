/* Recherche globale de la Bibliothèque : retrouver une réplique, une objection ou une famille
   en un instant pendant la préparation (en appel réel, la barre d'objections du Copilote suffit). */
import { search, snippet } from "../services/searchEngine.js";
import { getState, setState } from "../state.js";

let debounceTimer = null;

function renderResults(query){
  const box = document.getElementById("searchResults");
  const results = search(query);
  if(!query.trim()){ box.classList.remove("visible"); box.innerHTML = ""; return; }
  if(!results.length){
    box.innerHTML = '<div class="none">Aucun résultat pour « ' + query + ' ».</div>';
    box.classList.add("visible");
    return;
  }
  box.innerHTML = results.map((r, idx) =>
    `<button type="button" data-idx="${idx}"><b>${r.title}</b>${snippet(r, query)}</button>`
  ).join("");
  box.classList.add("visible");
  box.querySelectorAll("button[data-idx]").forEach(b => {
    b.addEventListener("click", () => {
      const r = results[b.dataset.idx];
      if(r.libTab) document.dispatchEvent(new CustomEvent("s3k:selectLibTab", { detail: { tab: r.libTab } }));
      r.onSelect && r.onSelect();
      box.classList.remove("visible");
    });
  });
}

export function initSearch(){
  const input = document.getElementById("searchInput");
  const box = document.getElementById("searchResults");
  if(!input) return;

  input.value = getState().lastQuery || "";

  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    const q = input.value;
    debounceTimer = setTimeout(() => {
      setState({ lastQuery: q });
      renderResults(q);
    }, 120);
  });

  input.addEventListener("focus", () => { if(input.value.trim()) renderResults(input.value); });

  document.addEventListener("click", (e) => {
    if(!box.contains(e.target) && e.target !== input) box.classList.remove("visible");
  });

  input.addEventListener("keydown", (e) => {
    if(e.key === "Escape"){ input.blur(); box.classList.remove("visible"); }
  });
}
