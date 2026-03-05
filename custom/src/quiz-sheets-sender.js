import { LitElement, html, css } from "lit";

class QuizSheetsSender extends LitElement {
    static properties = {
        webAppUrl: { type: String, attribute: 'web-app-url' },
        listen: { type: Boolean, reflect: true },
        lastStatus: { type: String, state: true },
    };

    constructor() {
        super();
        this.webAppUrl = '';
        this.listen = true;
        this.lastStatus = '';
        this._onFinished = this._onFinished.bind(this);
        this._lastSentId = null;
    }

    connectedCallback() {
        super.connectedCallback();
        if (this.listen) {
            window.addEventListener('quiz-finished', this._onFinished);
        }
    }

    disconnectedCallback() {
        if (this.listen) {
            window.removeEventListener('quiz-finished', this._onFinished);
        }
        super.disconnectedCallback();
    }

    render() {
        return html`<span aria-hidden="true" style="display:none">${this.lastStatus}</span>`;
    }

    async _onFinished(e) {
        const detail = e.detail || {};
        const result = detail.result || {};
        const user = detail.user || {};

        // Prioritaskan webAppUrl di komponen ini; jika kosong, pakai yang dikirim dari confetti-quiz
        const endpoint = this.webAppUrl || detail.webAppUrl;
        if (!endpoint) {
            this.lastStatus = 'No webAppUrl provided; skipping send.';
            return;
        }
        try {
            const iddata = String(result.finished ? (result.score + '-' + (result.total || 0) + '-' + (user.name || '') + '-' + (user.phone || '') + '-' + (user.address || '') + '-' + (detail.slug || '') + '-' + Date.now()) : Date.now());
            if (this._lastSentId === iddata) {
                return;
            }
            this._lastSentId = iddata;
            const params = new URLSearchParams({
                action: 'tambah',
                iddata,
                namaorng: user.name || 'Anonymous',
                nilai: String(result.score || 0),
                kelas: user.kelas || '',
                absen: user.absen || '',
                nope: user.phone || '',

                alamatorng: user.address || '',
                keterangan: `Kuis: ${detail.slug || ''} - ${result.percentage || 0}% (${result.score || 0}/${result.total || 0})`
            });
            console.log('[quiz-sheets-sender] Sending:', endpoint, params.toString());
            await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params,
                mode: 'no-cors'
            });
            this.lastStatus = 'Sent to Google Sheets';
        } catch (err) {
            this.lastStatus = `Failed: ${String(err)}`;
            console.error('[quiz-sheets-sender] Error:', err);
        }
    }
}

customElements.define('quiz-sheets-sender', QuizSheetsSender);

// Otomatis buat satu instance global agar tidak perlu menambahkan tag di setiap halaman
if (typeof window !== 'undefined' && !window.__quizSheetsSenderSingleton) {
    const el = document.createElement('quiz-sheets-sender');
    el.listen = true;
    el.style.display = 'none';
    document.body.appendChild(el);
    window.__quizSheetsSenderSingleton = el;
}
