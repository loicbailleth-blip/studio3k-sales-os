/* Bibliothèque > Banque de questions. Contenu statique rendu depuis questions.json. */
import { indexEntries } from "../services/searchEngine.js";

let QUESTIONS = null;

export function getQuestions(){ return QUESTIONS; }

export async function initQuestions(){
  const res = await fetch("js/data/questions.json");
  QUESTIONS = await res.json();
  const box = document.getElementById("questionsList");
  if(!box) return;

  box.innerHTML = QUESTIONS.map(cat => `
    <div class="card ${cat.gold?'gold':''}"><h3 style="margin-top:0">${cat.titre}</h3>
      <ul class="clean">
        ${cat.items.map(i => `<li>${i.q} <span class="note">objectif : ${i.objectif} · émotion : ${i.emotion} · moment : ${i.moment}</span></li>`).join("")}
      </ul>
    </div>`).join("");

  indexEntries(QUESTIONS.flatMap(cat => cat.items.map(i => ({
    section: "bibliotheque",
    libTab: "questions",
    title: cat.titre + " — " + i.q,
    text: [i.q, i.objectif, i.emotion, i.moment].join(" "),
    onSelect(){}
  }))));
}
