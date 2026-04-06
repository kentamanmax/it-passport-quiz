// ===== localStorage Manager =====
const Storage = {
  KEY_SCORES: 'ipass_scores',
  KEY_WEAK: 'ipass_weak',

  // --- Score History ---
  getScores() {
    try { return JSON.parse(localStorage.getItem(this.KEY_SCORES)) || []; }
    catch { return []; }
  },

  saveScore(entry) {
    // entry: { date, chapter, format, total, correct, rate }
    const scores = this.getScores();
    scores.push({ ...entry, date: new Date().toISOString() });
    // keep last 500
    if (scores.length > 500) scores.splice(0, scores.length - 500);
    localStorage.setItem(this.KEY_SCORES, JSON.stringify(scores));
  },

  // Get stats per chapter per format
  getStats() {
    const scores = this.getScores();
    const stats = {};
    scores.forEach(s => {
      const key = `${s.chapter}_${s.format}`;
      if (!stats[key]) stats[key] = { total: 0, correct: 0, attempts: 0 };
      stats[key].total += s.total;
      stats[key].correct += s.correct;
      stats[key].attempts++;
    });
    return stats;
  },

  // --- Weak List ---
  getWeakList() {
    try { return JSON.parse(localStorage.getItem(this.KEY_WEAK)) || []; }
    catch { return []; }
  },

  addWeak(item) {
    // item: { chapter, format, questionId (index), questionText }
    const list = this.getWeakList();
    const exists = list.find(w => w.chapter === item.chapter && w.format === item.format && w.questionId === item.questionId);
    if (!exists) {
      list.push(item);
      localStorage.setItem(this.KEY_WEAK, JSON.stringify(list));
    }
  },

  removeWeak(chapter, format, questionId) {
    let list = this.getWeakList();
    list = list.filter(w => !(w.chapter === chapter && w.format === format && w.questionId === questionId));
    localStorage.setItem(this.KEY_WEAK, JSON.stringify(list));
  },

  clearWeak() {
    localStorage.setItem(this.KEY_WEAK, JSON.stringify([]));
  },

  clearAll() {
    localStorage.removeItem(this.KEY_SCORES);
    localStorage.removeItem(this.KEY_WEAK);
  }
};
