// ===== Quiz Engine =====
const QuizEngine = {
  allChapters: [], // set after data loads

  init(chapters) {
    this.allChapters = chapters;
  },

  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  // Build question set based on selections
  buildQuestions(chapterIds, format, mode) {
    let questions = [];

    const chapters = chapterIds === 'all'
      ? this.allChapters
      : this.allChapters.filter(c => chapterIds.includes(c.id));

    chapters.forEach(ch => {
      let pool = [];
      if (format === 'quiz4') {
        pool = (ch.quiz4 || []).map((q, i) => ({ ...q, _chapter: ch.id, _chapterTitle: ch.title, _format: 'quiz4', _idx: i }));
      } else if (format === 'matching') {
        pool = (ch.matching || []).map((q, i) => ({ ...q, _chapter: ch.id, _chapterTitle: ch.title, _format: 'matching', _idx: i }));
      } else if (format === 'fillBlank') {
        pool = (ch.fillBlank || []).map((q, i) => ({ ...q, _chapter: ch.id, _chapterTitle: ch.title, _format: 'fillBlank', _idx: i }));
      } else if (format === 'mock') {
        // Mock exam: all formats mixed
        const q4 = (ch.quiz4 || []).map((q, i) => ({ ...q, _chapter: ch.id, _chapterTitle: ch.title, _format: 'quiz4', _idx: i }));
        const fb = (ch.fillBlank || []).map((q, i) => ({ ...q, _chapter: ch.id, _chapterTitle: ch.title, _format: 'fillBlank', _idx: i }));
        pool = [...q4, ...fb];
      }
      questions = questions.concat(pool);
    });

    questions = this.shuffle(questions);

    if (mode === 'quick10') {
      questions = questions.slice(0, 10);
    }

    return questions;
  },

  // Build weak-review questions
  buildWeakQuestions(weakList) {
    const questions = [];
    weakList.forEach(w => {
      const ch = this.allChapters.find(c => c.id === w.chapter);
      if (!ch) return;
      let pool;
      if (w.format === 'quiz4') pool = ch.quiz4;
      else if (w.format === 'fillBlank') pool = ch.fillBlank;
      else if (w.format === 'matching') pool = ch.matching;
      else return;

      if (pool && pool[w.questionId]) {
        questions.push({
          ...pool[w.questionId],
          _chapter: ch.id, _chapterTitle: ch.title,
          _format: w.format, _idx: w.questionId
        });
      }
    });
    return this.shuffle(questions);
  },

  // Check fill-blank answer
  checkFillBlank(userAnswer, acceptedAnswers) {
    const normalized = userAnswer.trim().toLowerCase().replace(/\s+/g, '');
    return acceptedAnswers.some(a => a.toLowerCase().replace(/\s+/g, '') === normalized);
  }
};
