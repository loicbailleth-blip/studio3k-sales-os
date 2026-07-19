/* Historique d'appels et événements pour chaque prospect */
import { getJSON, setJSON } from "./storage.js";

const HISTORY_KEY = "s3k_prospect_history";

export function initHistory(prospectId) {
  const key = `${HISTORY_KEY}:${prospectId}`;
  if (!getJSON(key, null)) {
    setJSON(key, []);
  }
}

export function getHistory(prospectId) {
  const key = `${HISTORY_KEY}:${prospectId}`;
  return getJSON(key, []);
}

export function addEvent(prospectId, event) {
  initHistory(prospectId);
  const key = `${HISTORY_KEY}:${prospectId}`;
  const history = getHistory(prospectId);
  const entry = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString()
  };
  history.push(entry);
  setJSON(key, history);
  return entry;
}

export function addCall(prospectId, result, notes = "") {
  return addEvent(prospectId, {
    type: "call",
    result,
    notes,
    duration: 0
  });
}

export function addStatus(prospectId, oldStatus, newStatus, reason = "") {
  return addEvent(prospectId, {
    type: "status_change",
    from: oldStatus,
    to: newStatus,
    reason
  });
}

export function addNote(prospectId, note, category = "general") {
  return addEvent(prospectId, {
    type: "note",
    note,
    category
  });
}

export function scheduleFollowUp(prospectId, date, reason = "") {
  return addEvent(prospectId, {
    type: "followup_scheduled",
    followupDate: date,
    reason
  });
}

export function getNextFollowUp(prospectId) {
  const history = getHistory(prospectId);
  const scheduled = history
    .filter(e => e.type === "followup_scheduled" && new Date(e.followupDate) > new Date())
    .sort((a, b) => new Date(a.followupDate) - new Date(b.followupDate));
  return scheduled.length > 0 ? scheduled[0] : null;
}

export function getLastCall(prospectId) {
  const history = getHistory(prospectId);
  return history.find(e => e.type === "call") || null;
}
