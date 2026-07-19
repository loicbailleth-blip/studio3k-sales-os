/* Moteur de recherche global — nouveau : indexe le contenu statique et les données dynamiques
   pour retrouver instantanément une réplique, une objection ou une famille pendant un appel. */

let index = [];

function normalize(str){
  return (str || "")
    .toString()
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // enlève les accents
    .replace(/<[^>]+>/g, " ") // enlève les balises HTML éventuelles
    .replace(/[«»""]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {Array<{section:string,title:string,text:string,onSelect:Function}>} entries
 */
export function indexEntries(entries){
  entries.forEach(e => {
    index.push({
      ...e,
      text: e.text || "",
      norm: normalize(e.title + " " + (e.text || ""))
    });
  });
}

export function clearIndex(){ index = []; }

export function search(query, limit = 12){
  const q = normalize(query);
  if(q.length < 2) return [];
  const terms = q.split(" ").filter(Boolean);
  const results = [];
  for(const entry of index){
    let score = 0;
    let allMatch = true;
    for(const t of terms){
      const pos = entry.norm.indexOf(t);
      if(pos === -1){ allMatch = false; break; }
      score += (pos === 0 ? 3 : 1) + (entry.norm.startsWith(t) ? 1 : 0);
    }
    if(allMatch) results.push({ ...entry, score });
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

export function snippet(entry, query, maxLen = 90){
  const raw = entry.text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if(raw.length <= maxLen) return raw;
  const idx = normalize(raw).indexOf(normalize(query).split(" ")[0] || "");
  const start = Math.max(0, idx - 20);
  return (start > 0 ? "…" : "") + raw.slice(start, start + maxLen) + "…";
}
