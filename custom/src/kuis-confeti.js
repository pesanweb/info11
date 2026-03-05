import { LitElement, html, css } from "lit";

class ConfettiQuiz extends LitElement {
    static properties = {
        message: { type: String },
        isCorrect: { type: Boolean },
        isDisabled: { type: Boolean },
        isChecked: { type: Boolean },
        currentQuestionIndex: { type: Number },
        showSummary: { type: Boolean },
        showIntroForm: { type: Boolean },
        // Endpoint Google Apps Script (opsional, bisa juga dikonfig di quiz-sheets-sender)
        webAppUrl: { type: String, attribute: 'web-app-url' },
        // JSON string attribute to supply questions dynamically
        questionsAttr: { type: String, attribute: 'questions' },
        // Alias: allow <confetti-quiz kuis='[...]'> as well
        kuisAttr: { type: String, attribute: 'kuis' },
        autoloadResults: { type: Boolean, attribute: 'autoload-results', reflect: true },
        externalSummary: { type: Object },
        externalLoaded: { type: Boolean },
        // Identitas user (diisi via form awal)
        userName: { type: String, attribute: 'user-name' },
        userPhone: { type: String, attribute: 'user-phone' },
        userKelas: { type: String, attribute: 'user-kelas' },
        userAbsen: { type: String, attribute: 'user-absen' },
        userAddress: { type: String, attribute: 'user-address' },
    };

    constructor() {
        super();
        this.message = '';
        this.isCorrect = false;
        this.isDisabled = false;
        this.isChecked = false;
        this.currentQuestionIndex = 0;
        this.showSummary = false;
        this.showIntroForm = true;

        // default kosong; diisi via atribut web-app-url pada <confetti-quiz>
        this.webAppUrl = '';

        this.questionsAttr = '';
        this.kuisAttr = '';
        this.autoloadResults = true;
        this.questions = [];
        this.externalSummary = null;
        this.externalLoaded = false;

        this.userName = '';
        this.userKelas = '';
        this.userAddress = '';

        // Fallback pertanyaan
        this.defaultQuestions = [
            { question: "Siapakah presiden pertama Indonesia?", answer: "soekarno" },
        ];

        this.userAnswers = [];
        this.correctAnswers = [];
    }

    connectedCallback() {
        super.connectedCallback();
        const raw = this.getAttribute('questions') || this.getAttribute('kuis') || '';
        const parsed = this._parseQuestions(raw);
        if (parsed && parsed.length) {
            this.questions = parsed;
        }
        if (!this.questions || !this.questions.length) {
            this.questions = this.defaultQuestions.slice();
        }
        this._resetQuizState();
    }

    async firstUpdated() {
        if (this.autoloadResults) {
            const saved = this._loadResults();
            if (saved && Array.isArray(saved.userAnswers) && Array.isArray(saved.correctAnswers) && Array.isArray(saved.questions)) {
                this.questions = saved.questions;
                this.userAnswers = saved.userAnswers;
                this.correctAnswers = saved.correctAnswers;
                this.currentQuestionIndex = Math.min(saved.currentQuestionIndex || 0, Math.max(0, this.questions.length - 1));
                const finished = Array.isArray(this.userAnswers) && this.userAnswers.length >= this.questions.length && this.correctAnswers.length >= this.questions.length;
                this.showSummary = !!saved.showSummary || finished;
                if (this.showSummary) this.isDisabled = true;
            }
        }
        await this._loadFromSiteJson();
    }

    updated(changed) {
        if (changed.has('questionsAttr') || changed.has('kuisAttr')) {
            this._applyAttrQuestions();
        }
    }

    _applyAttrQuestions() {
        const parsedPrimary = this._parseQuestions(this.questionsAttr);
        const parsedAlias = this._parseQuestions(this.kuisAttr);
        const parsed = parsedPrimary && parsedPrimary.length ? parsedPrimary : (parsedAlias && parsedAlias.length ? parsedAlias : null);
        if (parsed && parsed.length) {
            this.questions = parsed;
        }
        if (!this.questions || !this.questions.length) {
            this.questions = this.defaultQuestions.slice();
        }
        this._resetQuizState();
    }

    _parseQuestions(str) {
        if (!str || typeof str !== 'string') return null;
        try {
            const data = JSON.parse(str);
            if (Array.isArray(data)) {
                return data
                    .map(x => ({
                        question: String(x.question || '').trim(),
                        answer: String(x.answer || '').trim().toLowerCase(),
                    }))
                    .filter(x => x.question && x.answer);
            }
        } catch (e) {}
        return null;
    }

    get currentQuestion() { return this.questions[this.currentQuestionIndex]; }
    get totalQuestions() { return this.questions.length; }

    static styles = css`
        :host {
            display: block;
            color: #1f2937;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        .card {
            background-color: white;
            border-radius: 1rem;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            max-width: 600px;
            width: 100%;
            padding: 2rem;
            box-sizing: border-box;
            color: #1f2937;
        }
        .card h1 {
            color: #1e40af;
            font-size: 1.875rem;
            font-weight: 700;
            text-align: center;
            margin: 0 0 1.5rem 0;
        }
        .progress-bar {
            width: 100%;
            height: 8px;
            background-color: #e5e7eb;
            border-radius: 4px;
            margin-bottom: 1.5rem;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            background-color: #3b82f6;
            transition: width 0.3s ease;
        }
        .question-number {
            color: #6b7280;
            font-size: 0.875rem;
            margin-bottom: 0.5rem;
        }
        .card p {
            color: #1f2937;
            font-size: 1.125rem;
            font-weight: 500;
            margin-bottom: 0.75rem;
            line-height: 1.6;
        }
        .correct-answer {
            background-color: #d1fae5;
            color: #065f46;
            padding: 0.5rem;
            border-radius: 0.5rem;
            font-weight: 600;
        }
        .wrong-answer {
            background-color: #fee2e2;
            color: #991b1b;
            padding: 0.5rem;
            border-radius: 0.5rem;
            font-weight: 600;
        }
        .check-button, .nav-button {
            transition: all 0.15s;
        }
        .check-button:not([disabled]):hover, .nav-button:not([disabled]):hover {
            background-color: #1d4ed8;
            transform: scale(1.01);
        }
        .check-button[disabled], .nav-button[disabled] {
            background-color: #9ca3af;
            cursor: not-allowed;
        }
        .nav-buttons {
            display: flex;
            gap: 0.5rem;
            margin-top: 1rem;
        }
        .nav-button {
            flex: 1;
            padding: 0.75rem;
            font-weight: 600;
            border-radius: 0.5rem;
            border: none;
            cursor: pointer;
            background-color: #6b7280;
            color: white;
            font-size: 0.875rem;
        }
        .nav-button.primary {
            background-color: #3b82f6;
            color: white;
        }
        .nav-button:disabled {
            color: white;
            opacity: 0.7;
        }
        #answer-input {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #d1d5db;
            border-radius: 0.5rem;
            font-size: 1rem;
            color: #1f2937;
            background-color: white;
            box-sizing: border-box;
        }
        #answer-input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        #answer-input:disabled {
            background-color: #f3f4f6;
            color: #6b7280;
            cursor: not-allowed;
        }
        #check-button {
            width: 100%;
            margin-top: 1rem;
            padding: 0.75rem;
            font-weight: 600;
            border-radius: 0.5rem;
            border: none;
            font-size: 1rem;
        }
        .summary {
            text-align: center;
        }
        .summary-score {
            font-size: 3rem;
            font-weight: bold;
            color: #3b82f6;
            margin: 1rem 0;
        }
        .summary-item {
            padding: 0.75rem;
            margin: 0.5rem 0;
            border-radius: 0.5rem;
            text-align: left;
        }
        .summary-item.correct {
            background-color: #d1fae5;
            border-left: 4px solid #10b981;
        }
        .summary-item.incorrect {
            background-color: #fee2e2;
            border-left: 4px solid #ef4444;
            color: #991b1b;
        }
        .summary-item.correct {
            color: #065f46;
        }
        .summary h1 {
            color: #1e40af;
            font-size: 1.875rem;
            font-weight: 700;
            text-align: center;
            margin-bottom: 1rem;
        }
        .summary h2 {
            color: #1f2937;
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 1rem;
        }

        /* Intro form */
        .intro {
            display: grid;
            gap: 0.75rem;
        }
        .intro input, .intro textarea {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #d1d5db;
            border-radius: 0.5rem;
            font-size: 1rem;
            color: #1f2937;
            box-sizing: border-box;
        }
        .intro button {
            padding: 0.75rem;
            border-radius: 0.5rem;
            border: none;
            background-color: #2563eb;
            color: white;
            font-weight: 600;
            cursor: pointer;
        }
        .intro button:hover {
            background-color: #1d4ed8;
        }
    `;

    _resetQuizState() {
        this.currentQuestionIndex = 0;
        this.showSummary = false;
        this.message = '';
        this.isCorrect = false;
        this.isDisabled = false;
        this.isChecked = false;
        this.userAnswers = [];
        this.correctAnswers = [];
    }

    launchConfetti() {
        // Use the confetti overlay with id="confetti" if present
        const overlay = document.getElementById('confetti') || document.querySelector('kuis-confeti');
        if (overlay && typeof overlay.fire === 'function') {
            overlay.fire({ duration: 2000, particleCount: 220 });
            return;
        }
        if (window.confetti) {
            window.confetti({
                particleCount: 200,
                spread: 150, 
                angle: 90,
                startVelocity: 60,
                origin: { x: 0.5, y: 0.7 },
                colors: ['#4ade80', '#22c55e', '#10b981', '#1a73e8', '#f97316']
            });
        }
    }

    _storageKey() {
        try { return `confetti-quiz:${location.pathname}`; } catch (e) { return 'confetti-quiz'; }
    }
    _saveResults() {
        try {
            const payload = {
                questions: this.questions,
                userAnswers: this.userAnswers,
                correctAnswers: this.correctAnswers,
                currentQuestionIndex: this.currentQuestionIndex,
                showSummary: this.showSummary,
                score: this.getScore(),
                percentage: this.getPercentage(),
                savedAt: Date.now(),
                userName: this.userName,
                userPhone: this.userPhone,
                userKelas: this.userKelas,
                userAbsen: this.userAbsen,
                userAddress: this.userAddress,
            };
            localStorage.setItem(this._storageKey(), JSON.stringify(payload));
        } catch (e) {}
    }
    _loadResults() {
        try {
            const raw = localStorage.getItem(this._storageKey());
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) { return null; }
    }
    clearResults() {
        try { localStorage.removeItem(this._storageKey()); } catch (e) {}
        this.externalSummary = null;
        this.externalLoaded = false;
    }

    _currentSlug() {
        try {
            const p = location.pathname.replace(/\/+$/, '');
            const seg = decodeURIComponent(p.split('/').filter(Boolean).pop() || 'welcome');
            return seg;
        } catch(e) { return 'welcome'; }
    }

    async _loadFromSiteJson() {
        // Cek apakah fetch site.json diperlukan
        // Jika tidak ingin fetch, bisa langsung return
        // return;

        try {
            // Cek apakah sedang di localhost dan file tidak ada, skip fetch
            if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
                // Jika tidak ada server, skip
                return;
            }
            const res = await fetch('../site.json', { credentials: 'same-origin' });
            if (!res.ok) return;
            const site = await res.json();
            const slug = this._currentSlug();
            const items = Array.isArray(site.items) ? site.items : [];
            const it = items.find(x => (x.slug || '') === slug);
            const meta = (it && it.metadata) ? it.metadata : null;
            const q = meta && (meta.quiz || meta.quizResult);
            if (q && (q.finished || typeof q.score === 'number')) {
                const total = Array.isArray(this.questions) && this.questions.length ? this.questions.length : (q.total || 0);
                this.externalSummary = { score: q.score || 0, percentage: q.percentage || 0, total };
                this.externalLoaded = true;
                this.showSummary = true;
                this.isDisabled = true;
                this.showIntroForm = false; // bila sudah ada hasil
            }
        } catch (e) {
            // Optional: log error jika perlu
            // console.warn('Gagal fetch site.json:', e);
        }
    }

    // FORM AWAL
    _handleIntroSubmit(e) {
        e.preventDefault();
        const form = this.renderRoot.querySelector('#intro-form');
        if (!form) return;
        const name = form.querySelector('#user-name')?.value?.trim() || '';
        const phone = form.querySelector('#user-phone')?.value?.trim() || '';
        const kelas = form.querySelector('#user-kelas')?.value?.trim() || '';
        const absen = form.querySelector('#user-absen')?.value?.trim() || '';
        const address = form.querySelector('#user-address')?.value?.trim() || '';
        this.userName = name;
        this.userPhone = phone;
        this.userKelas = kelas;
        this.userAbsen = absen;
        this.userAddress = address;
        this.showIntroForm = false;
        this._resetQuizState();
        this._saveResults();
    }

    _emitFinished(result) {
        try {
            const detail = {
                slug: this._currentSlug(),
                result,
                user: {
                    name: this.userName,
                    phone: this.userPhone,
                    kelas: this.userKelas,
                    absen: this.userAbsen,
                    address: this.userAddress,
                },
                // teruskan juga endpoint ke pendengar (quiz-sheets-sender)
                webAppUrl: this.webAppUrl || this.getAttribute('web-app-url') || ''
            };
            this.dispatchEvent(new CustomEvent('quiz-finished', { detail, bubbles: true, composed: true }));
        } catch (e) {}
    }

    checkAnswer() {
        const inputElement = this.shadowRoot.getElementById('answer-input');
        const userAnswer = inputElement.value.trim().toLowerCase();
        const correctAnswer = this.currentQuestion.answer.toLowerCase();

        this.message = '';
        this.userAnswers[this.currentQuestionIndex] = userAnswer;
        this.isChecked = true;

        if (userAnswer === correctAnswer) {
            this.isCorrect = true;
            this.correctAnswers[this.currentQuestionIndex] = true;
            this.message = '🎉 Benar! Jawaban Anda tepat. Selamat!';
            this.isDisabled = true;
            this.launchConfetti();
        } else {
            this.isCorrect = false;
            this.correctAnswers[this.currentQuestionIndex] = false;
            this.message = `❌ Salah. Jawaban yang benar adalah: "${this.currentQuestion.answer}"`;
        }
        this._saveResults();
        const result = { score: this.getScore(), percentage: this.getPercentage(), finished: false };
        this.dispatchEvent(new CustomEvent('quiz-result', { detail: { slug: this._currentSlug(), result }, bubbles: true, composed: true }));
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.totalQuestions - 1) {
            this.currentQuestionIndex++;
            this.message = '';
            this.isCorrect = false;
            this.isDisabled = false;
            this.isChecked = this.userAnswers[this.currentQuestionIndex] !== undefined;
            const inputElement = this.shadowRoot.getElementById('answer-input');
            if (inputElement) inputElement.value = this.userAnswers[this.currentQuestionIndex] || '';
        } else {
            this.showSummary = true;
            this._saveResults();
            const result = { score: this.getScore(), percentage: this.getPercentage(), finished: true, total: this.totalQuestions };
            this._emitFinished(result);
        }
    }

    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.message = '';
            this.isCorrect = this.correctAnswers[this.currentQuestionIndex] || false;
            this.isDisabled = !!this.correctAnswers[this.currentQuestionIndex];
            this.isChecked = this.userAnswers[this.currentQuestionIndex] !== undefined;
            const inputElement = this.shadowRoot.getElementById('answer-input');
            if (inputElement) inputElement.value = this.userAnswers[this.currentQuestionIndex] || '';
            if (this.userAnswers[this.currentQuestionIndex]) {
                if (this.isCorrect) this.message = '✅ Jawaban Anda benar!';
                else this.message = `❌ Jawaban yang benar: "${this.questions[this.currentQuestionIndex].answer}"`;
            }
        }
    }

    restartQuiz() {
        this.clearResults();
        this.showIntroForm = true;
        this._resetQuizState();
    }

    getScore() { return this.correctAnswers.filter(c => c === true).length; }
    getPercentage() { return Math.round((this.getScore() / this.totalQuestions) * 100); }

    handleKeyPress(e) {
        if (e.key === 'Enter' && !this.isDisabled) {
            this.checkAnswer();
        }
    }

    renderIntroForm() {
        return html`
            <div class="card">
                <h1>Mulai Kuis</h1>
                <form id="intro-form" class="intro" @submit=${this._handleIntroSubmit}>
                    <div>
                        <label for="user-name">Nama</label>
                        <input id="user-name" type="text" placeholder="Nama Anda" required .value=${this.userName || ''}>
                    </div>
                    <div>
                        <label for="user-phone">No. HP</label>
                        <input id="user-phone" type="tel" placeholder="08xxxxxxxxxx" .value=${this.userPhone || ''}>
                    </div>
                    <div>
                        <label for="user-kelas">Kelas Kamu</label>
                        <input id="user-kelas" type="tel" placeholder="X-XI-XII" .value=${this.userKelas || ''}>
                    </div>
                    <div>
                        <label for="user-absen">No. Absen</label>
                        <input id="user-absen" type="tel" placeholder="08xxxxxxxxxx" .value=${this.userAbsen || ''}>
                    </div>
                    <div>
                        <label for="user-address">Alamat</label>
                        <textarea id="user-address" rows="3" placeholder="Alamat Anda (optional)">${this.userAddress || ''}</textarea>
                    </div>
                    <button type="submit">Mulai Kuis</button>
                </form>
            </div>
        `;
    }

    render() {
        if (!this.questions || !this.questions.length) {
            return html`<div class="card"><h1>Kuis</h1><p>Tidak ada soal.</p></div>`;
        }
        if (this.showIntroForm) {
            return this.renderIntroForm();
        }
        if (this.showSummary) {
            return this.renderSummary();
        }

        const messageClass = this.isCorrect ? 'correct-answer' : 'wrong-answer';
        const progress = ((this.currentQuestionIndex + 1) / this.totalQuestions) * 100;
        const scoreNow = this.getScore();
        const percentageNow = this.getPercentage();
        const isLastQuestion = this.currentQuestionIndex === this.totalQuestions - 1;
        const hasAnswered = this.userAnswers[this.currentQuestionIndex] !== undefined;

        return html`
            <div class="card">
                <h1>Kuis Pengetahuan Umum</h1>
                <div style="text-align:center;color:#6b7280;margin-top:.25rem;margin-bottom:.5rem">
                    Nilai: ${scoreNow} / ${this.totalQuestions} (${percentageNow}%)
                </div>

                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>

                <div id="quiz-area">
                    <div class="question-number">Soal ${this.currentQuestionIndex + 1} dari ${this.totalQuestions}</div>

                    <p>${this.currentQuestionIndex + 1}. ${this.currentQuestion.question}</p>

                    <input
                        type="text"
                        id="answer-input"
                        placeholder="Tulis jawaban Anda di sini..."
                        ?disabled=${this.isDisabled}
                        @keypress=${this.handleKeyPress}
                        .value=${this.userAnswers[this.currentQuestionIndex] || ''}
                    />

                    <button
                        id="check-button"
                        @click=${this.checkAnswer}
                        ?disabled=${this.isDisabled}
                        style="background-color: ${this.isDisabled ? '#9ca3af' : '#2563eb'}; color: white; cursor: ${this.isDisabled ? 'not-allowed' : 'pointer'};"
                    >
                        Cek Jawaban
                    </button>

                    <div id="message-box" style="margin-top: 1rem; text-align: center; min-height: 40px;">
                        ${this.message ? html`<div class=${messageClass}>${this.message}</div>` : ''}
                    </div>

                    <div class="nav-buttons">
                        <button
                            class="nav-button"
                            @click=${this.previousQuestion}
                            ?disabled=${this.currentQuestionIndex === 0}
                            style="background-color: ${this.currentQuestionIndex === 0 ? '#9ca3af' : '#6b7280'}; color: white;"
                        >
                            ← Sebelumnya
                        </button>
                        <button
                            class="nav-button primary"
                            @click=${this.nextQuestion}
                            ?disabled=${!this.isChecked}
                            aria-disabled=${!this.isChecked}
                            style="background-color: ${this.isChecked ? '#2563eb' : '#9ca3af'}; color: white;"
                        >
                            ${isLastQuestion ? 'Lihat Hasil' : 'Selanjutnya →'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderSummary() {
        const ext = this.externalSummary;
        const score = ext ? ext.score : this.getScore();
        const percentage = ext ? ext.percentage : this.getPercentage();
        const total = ext ? (ext.total || this.totalQuestions) : this.totalQuestions;
        const isPerfect = score === total;

        return html`
            <div class="card">
                <div class="summary">
                    <h1>Hasil Kuis</h1>

                    <div class="summary-score">${score} / ${total}</div>

                    <div style="font-size: 1.5rem; color: #6b7280; margin-bottom: 2rem;">
                        ${percentage}% Benar
                    </div>

                    ${isPerfect ? html`
                        <div style="color: #10b981; font-size: 1.25rem; margin-bottom: 1rem;">
                            🎉 Sempurna! Semua jawaban benar!
                        </div>
                    ` : ''}

                    <button
                        class="nav-button primary"
                        @click=${this.restartQuiz}
                        style="margin-top: 2rem; width: 100%; padding: 1rem; font-size: 1.125rem; color: white;"
                    >
                        Ulangi Kuis
                    </button>
                </div>
            </div>
        `;
    }
}

customElements.define('confetti-quiz', ConfettiQuiz);

/* Tetap pertahankan overlay confetti DDD */
export class KuisConfeti extends LitElement {
    static properties = { running: { type: Boolean, reflect: true }, duration: { type: Number }, particleCount: { type: Number } };
    static styles = css`
        :host { position: fixed; inset: 0; pointer-events: none; display: block; z-index: 9999; }
        canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
    `;
    constructor() {
        super();
        this.running = false;
        this.duration = 1500;
        this.particleCount = 180;
        this._particles = [];
        this._endAt = 0;
    }
    render() { return html`<canvas part="canvas" aria-hidden="true"></canvas>`; }
    firstUpdated() {
        this._canvas = this.renderRoot.querySelector('canvas');
        this._ctx = this._canvas.getContext('2d');
        const resize = () => {
            const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
            this._canvas.width = Math.floor(this.clientWidth * dpr);
            this._canvas.height = Math.floor(this.clientHeight * dpr);
            this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        this._resize = resize;
        resize();
        window.addEventListener('resize', resize, { passive: true });
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('resize', this._resize);
        cancelAnimationFrame(this._raf);
    }
    fire(opts = {}) {
        const cs = getComputedStyle(document.documentElement);
        const colors = [
            cs.getPropertyValue('--ddd-theme-default-skyBlue')?.trim() || '#3da9fc',
            cs.getPropertyValue('--ddd-theme-default-accent')?.trim() || '#ef4565',
            cs.getPropertyValue('--ddd-theme-default-link')?.trim() || '#6246ea',
            cs.getPropertyValue('--ddd-theme-default-lime')?.trim() || '#84cc16',
            cs.getPropertyValue('--ddd-theme-default-warning')?.trim() || '#f59e0b',
        ];
        const width = this.clientWidth || window.innerWidth;
        const height = this.clientHeight || window.innerHeight;
        const count = opts.particleCount ?? this.particleCount;
        const spread = Math.PI / 2; // 90deg
        const angle = -Math.PI / 2; // up
        const speed = 6;
        this._particles = new Array(count).fill(0).map(() => {
            const theta = angle + (Math.random() - 0.5) * spread;
            const vx = Math.cos(theta) * (speed * (0.6 + Math.random() * 0.8));
            const vy = Math.sin(theta) * (speed * (0.6 + Math.random() * 0.8));
            return { x: width / 2, y: height * 0.85, vx, vy, g: 0.18 + Math.random() * 0.22, w: 6 + Math.random() * 6, h: 8 + Math.random() * 6, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3, color: colors[Math.floor(Math.random() * colors.length)], alpha: 1 };
        });
        this._endAt = performance.now() + (opts.duration ?? this.duration);
        if (!this.running) { this.running = true; this._tick(); }
    }
    _tick = () => {
        this._raf = requestAnimationFrame(this._tick);
        const now = performance.now();
        if (now >= this._endAt && this._particles.length === 0) { this.running = false; cancelAnimationFrame(this._raf); return; }
        const ctx = this._ctx; if (!ctx) return;
        const w = this._canvas.width; const h = this._canvas.height;
        ctx.clearRect(0, 0, w, h);
        const still = [];
        for (const p of this._particles) {
            p.vy += p.g; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.alpha -= 0.008;
            if (p.alpha <= 0 || p.y > h + 20) continue;
            still.push(p);
            ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha)); ctx.translate(p.x, p.y); ctx.rotate(p.r);
            ctx.fillStyle = p.color; ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h); ctx.restore();
        }
        this._particles = still;
    }
}
customElements.define('kuis-confeti', KuisConfeti);