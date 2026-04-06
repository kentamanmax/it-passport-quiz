// ===== Main App =====
const App = {
  // State
  currentScreen: 'home',
  selectedFormat: null,
  selectedChapters: [],
  selectedMode: null,
  questions: [],
  currentIndex: 0,
  results: [],  // { correct: bool, question }
  matchState: { selectedLeft: null, matchedCount: 0, totalPairs: 0 },

  // All chapter data
  chapters: [],

  init() {
    this.chapters = [CH1_DATA, CH2_DATA, CH3_DATA, CH4_DATA, CH5_DATA, CH6_DATA];
    QuizEngine.init(this.chapters);
    this.bindEvents();
    this.showScreen('home');
  },

  // ===== Screen Management =====
  showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('screen-' + name);
    if (el) el.classList.add('active');
    this.currentScreen = name;
    window.scrollTo(0, 0);
  },

  // ===== Event Binding =====
  bindEvents() {
    // Format selection
    document.querySelectorAll('[data-format]').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('[data-format]').forEach(e => e.classList.remove('selected'));
        el.classList.add('selected');
        this.selectedFormat = el.dataset.format;
      });
    });

    // Chapter selection
    document.querySelectorAll('[data-chapter]').forEach(el => {
      el.addEventListener('click', () => {
        const ch = el.dataset.chapter;
        if (ch === 'all') {
          // Toggle all
          const allSelected = el.classList.contains('selected');
          document.querySelectorAll('[data-chapter]').forEach(e => {
            if (allSelected) e.classList.remove('selected');
            else e.classList.add('selected');
          });
          this.selectedChapters = allSelected ? [] : ['all'];
        } else {
          el.classList.toggle('selected');
          // remove 'all' selection if individual toggled
          document.querySelector('[data-chapter="all"]').classList.remove('selected');
          const selected = [...document.querySelectorAll('[data-chapter].selected:not([data-chapter="all"])')];
          this.selectedChapters = selected.map(e => e.dataset.chapter);
          // If all 6 selected, also highlight 'all'
          if (this.selectedChapters.length === 6) {
            document.querySelector('[data-chapter="all"]').classList.add('selected');
            this.selectedChapters = ['all'];
          }
        }
      });
    });

    // Mode selection
    document.querySelectorAll('[data-mode]').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('[data-mode]').forEach(e => e.classList.remove('selected'));
        el.classList.add('selected');
        this.selectedMode = el.dataset.mode;
      });
    });

    // Start button
    document.getElementById('btn-start').addEventListener('click', () => this.startQuiz());

    // Dashboard button
    document.getElementById('btn-dashboard').addEventListener('click', () => this.showDashboard());

    // Weak review button
    document.getElementById('btn-weak-review').addEventListener('click', () => this.startWeakReview());

    // Back buttons
    document.querySelectorAll('.back-btn').forEach(btn => {
      btn.addEventListener('click', () => this.showScreen('home'));
    });

    // Result screen buttons
    document.getElementById('btn-retry').addEventListener('click', () => this.startQuiz());
    document.getElementById('btn-home').addEventListener('click', () => this.showScreen('home'));
  },

  // ===== Start Quiz =====
  startQuiz() {
    if (!this.selectedFormat) { alert('形式を選んでください'); return; }
    if (this.selectedChapters.length === 0) { alert('チャプターを選んでください'); return; }
    if (!this.selectedMode) { alert('モードを選んでください'); return; }

    const chapIds = this.selectedChapters.includes('all') ? 'all' : this.selectedChapters;

    if (this.selectedFormat === 'matching') {
      this.questions = QuizEngine.buildQuestions(chapIds, 'matching', this.selectedMode);
    } else {
      this.questions = QuizEngine.buildQuestions(chapIds, this.selectedFormat, this.selectedMode);
    }

    if (this.questions.length === 0) { alert('該当する問題がありません'); return; }

    this.currentIndex = 0;
    this.results = [];
    this.showScreen('quiz');
    this.renderQuestion();
  },

  // ===== Weak Review =====
  startWeakReview() {
    const weakList = Storage.getWeakList();
    if (weakList.length === 0) { alert('苦手リストに問題がありません'); return; }
    this.questions = QuizEngine.buildWeakQuestions(weakList);
    if (this.questions.length === 0) { alert('苦手リストの問題を読み込めませんでした'); return; }
    this.currentIndex = 0;
    this.results = [];
    this.selectedFormat = 'weak';
    this.showScreen('quiz');
    this.renderQuestion();
  },

  // ===== Render Question =====
  renderQuestion() {
    const q = this.questions[this.currentIndex];
    const container = document.getElementById('quiz-content');
    const total = this.questions.length;
    const current = this.currentIndex + 1;

    // Progress
    document.getElementById('progress-text').textContent = `${current} / ${total} 問`;
    document.getElementById('progress-bar').style.width = `${(current / total) * 100}%`;

    // Chapter tag
    document.getElementById('quiz-chapter-tag').textContent = q._chapterTitle;

    const fmt = q._format;
    if (fmt === 'quiz4') this.renderQuiz4(q, container);
    else if (fmt === 'fillBlank') this.renderFillBlank(q, container);
    else if (fmt === 'matching') this.renderMatching(q, container);
  },

  // --- 4-Choice ---
  renderQuiz4(q, container) {
    const shuffledIndices = QuizEngine.shuffle([0, 1, 2, 3]);
    const labels = ['A', 'B', 'C', 'D'];
    container.innerHTML = `
      <div class="quiz-question">${q.q}</div>
      <div class="choices">
        ${shuffledIndices.map((i, pos) => `<button class="choice-btn" data-idx="${i}"><span class="choice-label">${labels[pos]}</span>${q.choices[i]}</button>`).join('')}
      </div>
      <div id="explanation-area"></div>
    `;
    container.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', () => this.handleQuiz4Answer(q, parseInt(btn.dataset.idx), container));
    });
  },

  handleQuiz4Answer(q, chosenIdx, container) {
    const isCorrect = chosenIdx === q.answer;
    const buttons = container.querySelectorAll('.choice-btn');
    buttons.forEach(btn => {
      btn.classList.add('disabled');
      const idx = parseInt(btn.dataset.idx);
      if (idx === q.answer) btn.classList.add('correct');
      if (idx === chosenIdx && !isCorrect) btn.classList.add('wrong');
    });
    this.showExplanation(q, isCorrect, container);
    this.recordResult(q, isCorrect);
  },

  // --- Fill Blank ---
  renderFillBlank(q, container) {
    container.innerHTML = `
      <div class="quiz-question">${q.q}</div>
      <div class="fill-input-wrap">
        <input type="text" class="fill-input" id="fill-answer" placeholder="答えを入力..." autocomplete="off">
        <button class="btn btn-primary" id="fill-submit">回答</button>
      </div>
      <div id="explanation-area"></div>
    `;
    const input = document.getElementById('fill-answer');
    const submitBtn = document.getElementById('fill-submit');

    const handleSubmit = () => {
      const val = input.value.trim();
      if (!val) return;
      const isCorrect = QuizEngine.checkFillBlank(val, q.answer);
      input.classList.add(isCorrect ? 'correct' : 'wrong');
      input.disabled = true;
      submitBtn.disabled = true;
      if (!isCorrect) {
        const correctText = document.createElement('div');
        correctText.style.cssText = 'margin-top:8px;color:#276749;font-weight:600;';
        correctText.textContent = `正解: ${q.answer[0]}`;
        input.parentNode.after(correctText);
      }
      this.showExplanation(q, isCorrect, container);
      this.recordResult(q, isCorrect);
    };

    submitBtn.addEventListener('click', handleSubmit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSubmit(); });
    input.focus();
  },

  // --- Matching ---
  renderMatching(q, container) {
    const leftItems = q.pairs.map((p, i) => ({ text: p.left, idx: i }));
    const rightItems = QuizEngine.shuffle(q.pairs.map((p, i) => ({ text: p.right, idx: i })));

    this.matchState = { selectedLeft: null, matchedCount: 0, totalPairs: q.pairs.length };

    container.innerHTML = `
      <div class="quiz-question">${q.question}</div>
      <div class="matching-area">
        <div class="matching-col" id="match-left">
          <h4>左の項目</h4>
          ${leftItems.map(item => `<div class="match-item match-left-item" data-idx="${item.idx}">${item.text}</div>`).join('')}
        </div>
        <div class="matching-col" id="match-right">
          <h4>右の項目</h4>
          ${rightItems.map(item => `<div class="match-item match-right-item" data-idx="${item.idx}">${item.text}</div>`).join('')}
        </div>
      </div>
      <div id="explanation-area"></div>
    `;

    container.querySelectorAll('.match-left-item').forEach(el => {
      el.addEventListener('click', () => this.handleMatchLeftClick(el));
    });
    container.querySelectorAll('.match-right-item').forEach(el => {
      el.addEventListener('click', () => this.handleMatchRightClick(q, el, container));
    });
  },

  handleMatchLeftClick(el) {
    if (el.classList.contains('matched')) return;
    document.querySelectorAll('.match-left-item').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
    this.matchState.selectedLeft = parseInt(el.dataset.idx);
  },

  handleMatchRightClick(q, el, container) {
    if (el.classList.contains('matched') || this.matchState.selectedLeft === null) return;
    const rightIdx = parseInt(el.dataset.idx);
    const leftIdx = this.matchState.selectedLeft;

    if (leftIdx === rightIdx) {
      // Correct match
      el.classList.add('matched');
      const leftEl = container.querySelector(`.match-left-item[data-idx="${leftIdx}"]`);
      leftEl.classList.add('matched');
      leftEl.classList.remove('selected');
      this.matchState.matchedCount++;
      this.matchState.selectedLeft = null;

      if (this.matchState.matchedCount === this.matchState.totalPairs) {
        // All matched
        this.showExplanation(q, true, container, `全${this.matchState.totalPairs}ペアを正しく組み合わせました。`);
        this.recordResult(q, true);
      }
    } else {
      // Wrong match
      el.classList.add('wrong-flash');
      setTimeout(() => el.classList.remove('wrong-flash'), 600);
    }
  },

  // ===== Show Explanation =====
  showExplanation(q, isCorrect, container, customMsg) {
    const area = container.querySelector('#explanation-area') || document.getElementById('explanation-area');
    const msg = customMsg || q.explanation || '';
    area.innerHTML = `
      <div class="explanation ${isCorrect ? 'correct-exp' : 'wrong-exp'}">
        <div class="exp-label">${isCorrect ? '正解!' : '不正解...'}</div>
        <div>${msg}</div>
      </div>
      <div style="text-align:center;margin-top:16px;">
        <button class="btn btn-primary" id="btn-next">${this.currentIndex < this.questions.length - 1 ? '次の問題' : '結果を見る'}</button>
      </div>
    `;
    document.getElementById('btn-next').addEventListener('click', () => this.nextQuestion());
  },

  // ===== Record Result =====
  recordResult(q, isCorrect) {
    this.results.push({ correct: isCorrect, question: q });
    if (!isCorrect) {
      Storage.addWeak({
        chapter: q._chapter,
        format: q._format,
        questionId: q._idx,
        questionText: q.q || q.question || ''
      });
    } else {
      // Remove from weak list if answered correctly
      Storage.removeWeak(q._chapter, q._format, q._idx);
    }
  },

  // ===== Next Question =====
  nextQuestion() {
    this.currentIndex++;
    if (this.currentIndex >= this.questions.length) {
      this.showResults();
    } else {
      this.renderQuestion();
    }
  },

  // ===== Show Results =====
  showResults() {
    const total = this.results.length;
    const correct = this.results.filter(r => r.correct).length;
    const rate = total > 0 ? Math.round((correct / total) * 100) : 0;

    // Save score
    const fmt = this.selectedFormat === 'weak' ? 'weak' : this.selectedFormat;
    const chapLabel = this.selectedChapters.includes('all') ? 'all' : this.selectedChapters.join(',');
    Storage.saveScore({ chapter: chapLabel, format: fmt, total, correct, rate });

    // Render
    document.getElementById('result-rate').textContent = `${rate}%`;
    document.getElementById('result-correct').textContent = correct;
    document.getElementById('result-total').textContent = total;
    document.getElementById('result-wrong-count').textContent = total - correct;

    // Wrong list
    const wrongContainer = document.getElementById('result-wrong-list');
    const wrongResults = this.results.filter(r => !r.correct);
    if (wrongResults.length === 0) {
      wrongContainer.innerHTML = '<p style="text-align:center;color:#48bb78;font-weight:600;padding:16px;">全問正解です!</p>';
    } else {
      wrongContainer.innerHTML = wrongResults.map(r => {
        const q = r.question;
        const qText = q.q || q.question || '';
        let aText = '';
        if (q._format === 'quiz4' && q.choices) aText = q.choices[q.answer];
        else if (q._format === 'fillBlank' && q.answer) aText = q.answer[0];
        else aText = q.explanation || '';
        return `<div class="wrong-item">
          <div class="wrong-q">${qText}</div>
          <div class="wrong-a">正解: ${aText}</div>
        </div>`;
      }).join('');
    }

    this.showScreen('result');
  },

  // ===== Dashboard =====
  showDashboard() {
    const stats = Storage.getStats();
    const tbody = document.getElementById('dash-tbody');
    const formats = ['quiz4', 'matching', 'fillBlank'];
    const formatLabels = { quiz4: '4択', matching: 'マッチング', fillBlank: '穴埋め' };

    let rows = '';
    this.chapters.forEach(ch => {
      let cells = `<td>${ch.title}</td>`;
      formats.forEach(f => {
        const key = `${ch.id}_${f}`;
        const s = stats[key];
        if (s && s.total > 0) {
          const rate = Math.round((s.correct / s.total) * 100);
          const cls = rate >= 80 ? 'rate-good' : rate >= 50 ? 'rate-mid' : 'rate-bad';
          cells += `<td><span class="${cls}">${rate}%</span><br><small style="color:#a0aec0">${s.correct}/${s.total}</small></td>`;
        } else {
          cells += `<td><span style="color:#cbd5e0">---</span></td>`;
        }
      });
      rows += `<tr>${cells}</tr>`;
    });
    tbody.innerHTML = rows;

    // Weak list
    const weakList = Storage.getWeakList();
    const weakContainer = document.getElementById('dash-weak-list');
    document.getElementById('dash-weak-count').textContent = `${weakList.length} 問`;

    if (weakList.length === 0) {
      weakContainer.innerHTML = '<p style="text-align:center;color:#a0aec0;padding:8px;">苦手リストは空です</p>';
    } else {
      weakContainer.innerHTML = weakList.slice(0, 50).map(w => {
        const ch = this.chapters.find(c => c.id === w.chapter);
        const chTitle = ch ? ch.title : w.chapter;
        return `<div class="weak-item">
          <span class="weak-q">${w.questionText || '(問題テキストなし)'}</span>
          <span class="weak-ch">${chTitle}</span>
        </div>`;
      }).join('');
    }

    this.showScreen('dashboard');
  },
};

// ===== Boot =====
document.addEventListener('DOMContentLoaded', () => App.init());
