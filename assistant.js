/**
 * Risk Assessment Buddy — Help Assistant
 * --------------------------------------
 * A scoped, screen-aware helper. It answers questions about THIS application only.
 *
 * This file deliberately contains NO product content. Everything the assistant
 * knows lives in assistant-kb.js (window.RAB_ASSISTANT_KB) so the knowledge can
 * grow without touching this code. If you want the bot to know something new,
 * edit the KB, not this file.
 */
(function () {
    'use strict';

    const KB = window.RAB_ASSISTANT_KB;
    if (!KB) {
        console.warn('[assistant] assistant-kb.js not loaded — help assistant disabled.');
        return;
    }

    const MAX_TURNS = 8;          // conversation turns kept for context
    let history = [];             // [{role:'user'|'assistant', text}]
    let busy = false;

    // ── Screen awareness ──────────────────────────────────────────────────────

    /** Which tab is on screen right now, mapped to a KB workflow id. */
    function currentWorkflowId() {
        const active = document.querySelector('.tab-content:not(.hidden)');
        if (!active || !active.id) return null;
        const tabName = active.id.replace(/^tab-content-/, '');
        return KB.screens[tabName] || null;
    }

    function currentWorkflow() {
        const id = currentWorkflowId();
        return id ? KB.workflows.find(w => w.id === id) || null : null;
    }

    /**
     * A short factual description of what the user is looking at. Deliberately
     * counts rather than copies: the assistant needs to know a table exists and
     * roughly how big it is, not the contents of anyone's assessment.
     */
    function screenContext() {
        const parts = [];
        const wf = currentWorkflow();
        parts.push(wf ? `Active workflow: ${wf.label} (status: ${wf.status}).`
                      : 'Active workflow: unknown.');

        const rows = document.querySelectorAll('#table-container tbody tr');
        if (rows.length) {
            let deleted = 0, withPicture = 0, flagged = 0;
            rows.forEach(tr => {
                if (tr.classList.contains('deleted-row') || tr.dataset.deleted === 'true') deleted++;
                if (tr.dataset.imageId) withPicture++;
                if (tr.querySelector('.scale-value-unverified, .hazard-invalid')) flagged++;
            });
            parts.push(`Risk table: ${rows.length} row(s), ${withPicture} with a picture, ` +
                       `${deleted} marked deleted, ${flagged} with a flagged/unverified value.`);
        } else {
            parts.push('Risk table: not generated yet.');
        }

        const gallery = document.querySelectorAll('.gallery-item img');
        parts.push(`Gallery: ${gallery.length} image(s).`);

        const openModal = ['tableImageModal', 'lightboxModal', 'goehsModal', 'excelImportModal',
                           'ra2025ColumnMapperModal', 'fullscreenVideoModal']
            .find(id => {
                const el = document.getElementById(id);
                return el && getComputedStyle(el).display !== 'none';
            });
        if (openModal) parts.push(`Currently open dialog: #${openModal}.`);

        return parts.join('\n');
    }

    // ── Prompt assembly ───────────────────────────────────────────────────────

    function buildSystemPrompt() {
        const wf = currentWorkflow();
        const L = [];

        L.push(`You are the built-in help assistant for ${KB.product.name}.`);
        L.push(KB.product.oneLiner);
        L.push('');
        L.push('SCOPE — you answer ONLY questions about this application.');
        L.push('You may help with:');
        KB.scope.allowed.forEach(a => L.push(`  - ${a}`));
        L.push('You must refuse:');
        KB.scope.refused.forEach(r => L.push(`  - ${r}`));
        L.push(KB.scope.refusalGuidance);
        L.push('');
        L.push('LANGUAGE: ' + KB.language.policy);
        L.push('');
        L.push('STYLE:');
        KB.style.forEach(s => L.push(`  - ${s}`));
        L.push('');

        if (wf && wf.status === 'beta') {
            L.push(`IMPORTANT: the user is in "${wf.label}", which is BETA. Begin your ` +
                   `answer with this caveat, in the user's language: "${KB.betaNotice}"`);
            L.push('');
        }

        L.push('PRIVACY FACTS you may state: ' + KB.product.privacy);
        L.push('');
        L.push('=== WHAT THE USER IS LOOKING AT ===');
        L.push(screenContext());
        L.push('');
        L.push('=== KNOWLEDGE BASE ===');

        L.push('\n-- Workflows --');
        KB.workflows.forEach(w => {
            L.push(`\n[${w.label}] (${w.status})`);
            L.push(w.summary);
            if (w.steps && w.steps.length) w.steps.forEach((s, i) => L.push(`  ${i + 1}. ${s}`));
            if (w.tips && w.tips.length) w.tips.forEach(t => L.push(`  tip: ${t}`));
        });

        L.push('\n-- Terms --');
        KB.glossary.forEach(g => {
            L.push(`\n${g.term}: ${g.definition}`);
            if (g.note) L.push(`  note: ${g.note}`);
            if (g.verify) L.push('  (uncertain — hedge, and suggest the user confirm this)');
        });

        L.push('\n-- Colours and badges --');
        KB.colorCoding.forEach(c => L.push(`${c.cue} → ${c.meaning}`));

        L.push('\n-- Troubleshooting --');
        KB.troubleshooting.forEach(t =>
            L.push(`Symptom: ${t.symptom}\n  Cause: ${t.cause}\n  Fix: ${t.fix}`));

        L.push('\n=== END KNOWLEDGE BASE ===');
        L.push('If the knowledge base does not cover something, say you are not sure ' +
               'rather than inventing an answer. Never describe a button or feature ' +
               'that does not appear above.');

        return L.join('\n');
    }

    function buildPrompt(question) {
        const convo = history.slice(-MAX_TURNS * 2)
            .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
            .join('\n');
        return buildSystemPrompt()
            + (convo ? `\n\n=== CONVERSATION SO FAR ===\n${convo}` : '')
            + `\n\nUser: ${question}\nAssistant:`;
    }

    // ── Transport ─────────────────────────────────────────────────────────────
    // Reuses the app's existing AI endpoint and payload shape.

    async function ask(question) {
        const url = window.AI_URL || window.API_ENDPOINT;
        if (!url) throw new Error('AI endpoint is not configured (window.AI_URL is undefined).');

        // Build ONCE. This used to call buildPrompt() twice - once for `prompt` and again
        // for `messages` - which sent the whole knowledge base down the wire twice and
        // roughly doubled an already large request.
        const prompt = buildPrompt(question);

        let res;
        try {
            res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: window.AI_MODEL || undefined,
                    prompt,
                    messages: [{ role: 'user', content: prompt }]
                })
            });
        } catch (netErr) {
            // fetch() only rejects on a genuine network/CORS failure - an HTTP error
            // status resolves normally, so keep the two cases distinguishable.
            throw new Error(`Network or CORS failure reaching ${url} — ${netErr.message}`);
        }

        if (!res.ok) {
            let detail = '';
            try { detail = (await res.text()).slice(0, 300); } catch (_) {}
            throw new Error(`AI HTTP ${res.status}${detail ? ` — ${detail}` : ''} ` +
                            `(prompt was ${prompt.length} chars)`);
        }

        const data = await res.json();
        const text = data.choices && data.choices[0] && data.choices[0].message
            && data.choices[0].message.content;
        if (!text) throw new Error('AI returned an empty response: ' +
                                   JSON.stringify(data).slice(0, 300));
        return text;
    }

    // ── UI ────────────────────────────────────────────────────────────────────

    function el(id) { return document.getElementById(id); }

    function addMessage(role, text) {
        const log = el('rabAssistantLog');
        if (!log) return;
        const wrap = document.createElement('div');
        wrap.className = role === 'user'
            ? 'flex justify-end'
            : 'flex justify-start';
        const bubble = document.createElement('div');
        bubble.className = role === 'user'
            ? 'max-w-[85%] px-3 py-2 rounded-2xl rounded-br-sm bg-indigo-600 text-white text-sm whitespace-pre-wrap'
            : 'max-w-[85%] px-3 py-2 rounded-2xl rounded-bl-sm bg-slate-100 text-slate-800 text-sm whitespace-pre-wrap';
        bubble.textContent = text;   // textContent, never innerHTML — model output is untrusted
        wrap.appendChild(bubble);
        log.appendChild(wrap);
        log.scrollTop = log.scrollHeight;
        return bubble;
    }

    async function submit() {
        const input = el('rabAssistantInput');
        if (!input || busy) return;
        const question = input.value.trim();
        if (!question) return;

        input.value = '';
        addMessage('user', question);
        history.push({ role: 'user', text: question });

        busy = true;
        const thinking = addMessage('assistant', '…');
        try {
            const answer = await ask(question);
            const text = answer || 'I could not get an answer just then. Please try again.';
            thinking.textContent = text;
            history.push({ role: 'assistant', text });
        } catch (err) {
            console.error('[assistant]', err);
            // Show the actual reason rather than a generic "check your connection". The
            // failure modes here (endpoint not configured / CORS / HTTP status / empty
            // reply) need different fixes, and hiding them behind one sentence makes the
            // problem undiagnosable for whoever has to look at it.
            thinking.textContent = 'Help service error — ' + (err && err.message ? err.message : String(err));
        } finally {
            busy = false;
        }
    }

    function toggle(force) {
        const panel = el('rabAssistantPanel');
        if (!panel) return;
        const open = force !== undefined ? force : panel.classList.contains('hidden');
        panel.classList.toggle('hidden', !open);
        if (open) {
            const wf = currentWorkflow();
            const log = el('rabAssistantLog');
            if (log && !log.childElementCount) {
                addMessage('assistant', wf
                    ? `Hi — I can help with ${wf.label}. Ask me anything about this app, ` +
                      `in any language.`
                    : 'Hi — ask me anything about this app, in any language.');
                if (wf && wf.status === 'beta') addMessage('assistant', KB.betaNotice);
            }
            const input = el('rabAssistantInput');
            if (input) input.focus();
        }
    }

    function init() {
        el('rabAssistantFab')?.addEventListener('click', () => toggle());
        el('rabAssistantClose')?.addEventListener('click', () => toggle(false));
        el('rabAssistantSend')?.addEventListener('click', submit);
        el('rabAssistantInput')?.addEventListener('keydown', (e) => {
            // Enter sends; Shift+Enter is a newline.
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.RABAssistant = { toggle, ask, buildSystemPrompt, currentWorkflow };
})();
