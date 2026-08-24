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

    // ── Chip translation: language + cache ──────────────────────────────────────
    // Chip LABELS need translating (the model's own answers already come out in the
    // user's language on their own). This is deliberately NOT a second AI call: the
    // translation is requested inside the one call we already make, then cached, so
    // each chip costs a few tokens once per language and is then free forever.

    const CHIP_CACHE_KEY = 'rab_chip_i18n_v1';
    const CHIP_CACHE_MAX_PER_LANG = 300; // just a sanity cap, not a tuning knob

    let chipLang = detectInitialLanguage();
    // True once the MODEL has actually told us (via a CHIPS[xx] reply) what language
    // it answered in - see the comment on chipsNeedingTranslation() below for why this
    // exists: without it, a wrong starting guess of 'en' could never correct itself.
    let chipLangConfirmed = false;
    let chipCache = loadChipCache();      // { [lang]: { [englishText]: translated } }

    /**
     * Best-guess starting language, before the model has said anything. Reads the
     * SAME localStorage key the app's own language selector writes
     * (see index.html ~line 7536) rather than reaching across script files for the
     * `currentLang` variable, which is a `let` inside another file's IIFE and not on
     * window — the exact trap that broke the lightbox-from-task-modal path earlier.
     * This is only a starting point: the model's actual reply language corrects it
     * from the first exchange onward (see extractChipTranslations below).
     */
    function detectInitialLanguage() {
        try {
            const saved = window.localStorage && window.localStorage.getItem('appLanguage');
            if (saved) return saved;
        } catch (_) { /* localStorage blocked (private mode, policy) - fall through */ }
        const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
        return nav || 'en';
    }

    function loadChipCache() {
        try {
            const raw = window.localStorage && window.localStorage.getItem(CHIP_CACHE_KEY);
            const parsed = raw ? JSON.parse(raw) : null;
            return (parsed && typeof parsed === 'object') ? parsed : {};
        } catch (_) {
            return {}; // corrupt JSON, storage disabled, or quota - just start fresh in memory
        }
    }

    function saveChipCache() {
        try {
            if (window.localStorage) window.localStorage.setItem(CHIP_CACHE_KEY, JSON.stringify(chipCache));
        } catch (_) { /* quota exceeded or storage disabled - cache stays in-memory only */ }
    }

    function getCachedChipLabel(lang, englishText) {
        return (chipCache[lang] && chipCache[lang][englishText]) || null;
    }

    function setCachedChipLabel(lang, englishText, translated) {
        if (!chipCache[lang]) chipCache[lang] = {};
        const bucket = chipCache[lang];
        const keys = Object.keys(bucket);
        if (!(englishText in bucket) && keys.length >= CHIP_CACHE_MAX_PER_LANG) {
            delete bucket[keys[0]]; // oldest-ish; this is a soft cap, not an LRU
        }
        bucket[englishText] = translated;
        saveChipCache();
    }

    // ── Screen awareness ──────────────────────────────────────────────────────

    // Modals that are their own "screen" even though the tab behind them has not
    // changed, checked before the tab lookup so the most specific context wins (the
    // RA 2025 mapper modal, not just "the excel tab" sitting behind it). GOEHS
    // Integration in particular has NO tab of its own at all (see KB.screens) - without
    // this check the assistant could never tell the user was looking at it, no matter
    // what they asked. Same visibility check screenContext() already uses for its own
    // "currently open dialog" line, so a modal being open is understood identically in
    // both places.
    const MODAL_WORKFLOW_IDS = [
        ['goehsModal', 'goehs'],
        ['batchProcessorModal', 'excel-batch'],
        ['ra2025ColumnMapperModal', 'excel-ra2025'],
        ['excelImportModal', 'excel-legacy']
    ];

    // Raw tab-content id -> the exact, plain label text used for that tab in
    // KB.buttons (the `nav: true` entries added so a tab name in prose is clickable).
    // Kept here, next to MODAL_WORKFLOW_IDS, because both exist to translate the
    // app's own element ids into names the KB already knows about.
    const TAB_LABELS = {
        'rich-media': 'Rich Media',
        'free-text': 'Free Text',
        'excel': 'Excel Sheet',
        'fire-ra': 'Fire Risk',
        'cost-benefit': 'Cost-Benefit'
    };

    function openWorkflowModalId() {
        for (const [elId, wfId] of MODAL_WORKFLOW_IDS) {
            const modalEl = document.getElementById(elId);
            if (modalEl && getComputedStyle(modalEl).display !== 'none') return wfId;
        }
        return null;
    }

    /** Which screen is on view right now - an open modal, else the active tab. */
    function currentWorkflowId() {
        const modalId = openWorkflowModalId();
        if (modalId) return modalId;
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
     * Labels of buttons genuinely rendered on screen right now, deduped. This is
     * deliberately NOT a substitute for the KB - it only ever reports what is really
     * there, so it can never invent a feature. What it buys is coverage for the long
     * tail: a button the KB hasn't documented yet can still be CONFIRMED to exist
     * (see gapGuidance in the KB, which is the only place allowed to use this for
     * anything beyond "yes, that button is there").
     *
     * offsetWidth/offsetHeight are both 0 when an element or any ancestor is
     * display:none - the exact mechanism this app's own tab switching (switchTab)
     * and modal open/close already use (Tailwind's `hidden` class, or inline
     * style.display). That means this naturally scopes itself to whatever tab or
     * modal is actually visible right now, with no need to know which container to
     * look in or keep that in sync with the app's own tab-switching code.
     */
    function visibleButtonLabels() {
        const labels = [];
        const seen = new Set();
        document.querySelectorAll('button, [role="button"]').forEach(btn => {
            if (labels.length >= 40) return; // keep the prompt bounded
            if (btn.disabled) return;         // not something the user can act on right now
            if (!btn.offsetWidth && !btn.offsetHeight) return; // not actually rendered
            const text = (btn.getAttribute('title') || btn.textContent || '')
                .trim().replace(/\s+/g, ' ');
            if (!text || text.length > 60 || seen.has(text)) return;
            seen.add(text);
            labels.push(text);
        });
        return labels;
    }

    /**
     * A short factual description of what the user is looking at. Deliberately
     * counts table/gallery contents rather than reading them: the assistant needs to
     * know a table exists and roughly how big it is, not the contents of anyone's
     * assessment. The one exception is button LABELS (via visibleButtonLabels()) -
     * those are static UI chrome, not user data, so listing them carries no such risk.
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
                           'ra2025ColumnMapperModal', 'batchProcessorModal', 'fullscreenVideoModal']
            .find(id => {
                const el = document.getElementById(id);
                return el && getComputedStyle(el).display !== 'none';
            });
        if (openModal) parts.push(`Currently open dialog: #${openModal}.`);

        const buttons = visibleButtonLabels();
        if (buttons.length) {
            parts.push(`Buttons currently visible on screen: ${buttons.join(' | ')}`);
        }

        return parts.join('\n');
    }

    // ── Prompt assembly ───────────────────────────────────────────────────────

    /** First sentence of a summary, for the always-present workflow index. */
    function firstSentence(text) {
        const s = String(text || '').trim();
        const m = s.match(/^[\s\S]*?[.!?](?=\s|$)/);
        return (m ? m[0] : s).trim();
    }

    // Words too common to identify a workflow. Kept deliberately tiny: these are
    // English function words, not product terms, so this stays behaviour-only.
    const MATCH_STOPWORDS = new Set([
        'the', 'and', 'for', 'with', 'from', 'into', 'tab', 'card', 'part', 'via',
        'this', 'that', 'your', 'you', 'how', 'what', 'does', 'off', 'out', 'via',
        'working', 'processing', 'template', 'single', 'file', 'files', 'export'
    ]);

    /** Identifying tokens for a workflow, taken from its own id and label. */
    function workflowTokens(w) {
        const raw = (w.id + ' ' + (w.label || '')).toLowerCase();
        return raw.split(/[^a-z0-9]+/)
            .filter(t => t.length >= 3 && !MATCH_STOPWORDS.has(t));
    }

    /**
     * Which workflows get FULL detail this turn. Always includes what is on screen and
     * its sub-workflows, plus anything the question names (betas included - they are
     * not special-cased). A missing/blank question means "include everything", so the
     * safe direction is the default.
     */
    function workflowsNeedingDetail(question) {
        const all = KB.workflows || [];
        const ids = new Set();
        if (question === undefined || question === null || !String(question).trim()) {
            all.forEach(w => ids.add(w.id));
            return ids;
        }

        const activeId = currentWorkflowId();
        if (activeId) ids.add(activeId);
        all.forEach(w => {
            // Sub-workflows of what is on screen: the umbrella entries (e.g. the Excel
            // chooser) carry no steps of their own, so the parent alone is not usable.
            if (w.parent && w.parent === activeId) ids.add(w.id);
        });
        // Betas used to get a free always-on pass here because they started out at a
        // couple of lines each (effectively free). Once fire-ra grew real content that
        // stopped being true - shipping it on every unrelated question would undo the
        // point of this filter - so betas now earn inclusion the same way everything
        // else does: being on screen, or the question naming them below. The beta
        // caveat banner is unaffected - it reads currentWorkflow() from the screen
        // directly, not this detail set.

        const q = ' ' + String(question).toLowerCase().replace(/[^a-z0-9]+/g, ' ') + ' ';
        all.forEach(w => {
            if (workflowTokens(w).some(t => q.indexOf(' ' + t + ' ') !== -1)) {
                ids.add(w.id);
                // Pull in siblings too: asking about "excel" should show every Excel
                // path, since choosing the wrong one is the mistake people actually make.
                if (w.parent) {
                    ids.add(w.parent);
                    all.forEach(s => { if (s.parent === w.parent) ids.add(s.id); });
                }
                all.forEach(s => { if (s.parent === w.id) ids.add(s.id); });
            }
        });

        if (ids.size === 0) all.forEach(w => ids.add(w.id));
        return ids;
    }

    function buildSystemPrompt(question) {
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
        L.push(KB.scope.gapGuidance);
        L.push(`When that happens, use this exact phrase (translated into the user's ` +
               `language) as the core of your reply: "${KB.scope.gapNotice}" - then, only ` +
               `if something in the knowledge base below is genuinely related, add one more ` +
               `sentence pointing to that. Do not soften, expand, or replace this phrase with ` +
               `your own wording - it is user-facing product language, not a paraphrase hint.`);
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

        // Index of EVERY workflow, always present. Full steps for only the relevant
        // ones follow. The index is what makes the trimming safe: the model can always
        // see the complete list, so a workflow without full steps here is visibly a
        // "not included in this message" case, never a "does not exist" one.
        const detailIds = workflowsNeedingDetail(question);

        L.push('\n-- Every workflow this app has --');
        KB.workflows.forEach(w =>
            L.push(`[${w.id}] ${w.label} (${w.status}): ${firstSentence(w.summary)}`));

        L.push('\n-- Full steps for the workflow(s) in play --');
        KB.workflows.filter(w => detailIds.has(w.id)).forEach(w => {
            L.push(`\n[${w.label}] (${w.status})`);
            L.push(w.summary);
            if (w.steps && w.steps.length) w.steps.forEach((s, i) => L.push(`  ${i + 1}. ${s}`));
            if (w.tips && w.tips.length) w.tips.forEach(t => L.push(`  tip: ${t}`));
        });

        if (detailIds.size < KB.workflows.length) {
            L.push('\nThe workflows listed in the index but not detailed above ARE fully ' +
                   'documented - their steps just are not loaded into this particular ' +
                   'message. If the user asks about one of them, do NOT say it is ' +
                   'undocumented and do NOT guess at its steps: name it back to them and ' +
                   'ask them to confirm that is the one they mean, and the full steps will ' +
                   'be available when they answer.');
        }

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

        // One line per button - the whole KB ships on every request, so this section
        // is deliberately terse. `|| []` keeps an older cached assistant-kb.js from
        // throwing here and taking the entire panel down with it.
        // Accepted formats per upload point. Sits before Buttons because "what can I
        // upload" is asked far more often than "what does this button do".
        L.push('\n-- What each upload accepts --');
        (KB.fileTypes || []).forEach(f =>
            L.push(`${f.where}\n  Accepts: ${f.accepts}\n  Notes: ${f.notes}`));

        L.push('\n-- Buttons (only these exist; do not invent others) --');
        // The app itself turns a button's exact name into a clickable "jump to it"
        // chip for a subset of these - no markup needed from you, and nothing to
        // remember: just spell the name exactly as listed, WITH its capitalization,
        // when you mention it in prose, the same way you already would.
        (KB.buttons || []).forEach(b => L.push(`"${b.label}" (${b.where}): ${b.does}`));

        // Literal strings, so a user pasting an error can be matched exactly.
        L.push('\n-- Error messages the app can show --');
        (KB.errorMessages || []).forEach(e =>
            L.push(`"${e.message}"\n  Means: ${e.means}\n  Fix: ${e.fix}`));

        L.push('\n=== END KNOWLEDGE BASE ===');
        L.push('If the knowledge base does not cover something, say you are not sure ' +
               'rather than inventing an answer. Never describe a button or feature ' +
               'that does not appear above. The button list above is the complete ' +
               'set of documented buttons - if a user asks about one that is not ' +
               'there, treat it as a documentation gap, not as licence to guess ' +
               'what it might do. If a user quotes an error message, match it ' +
               'against the error list and answer with that entry.');

        return L.join('\n');
    }

    /**
     * Which of `picks` still need a translation for the current chipLang. Shared by
     * the request builder and the response parser so they can never disagree on what
     * was actually asked for - two independent copies of this filter was exactly the
     * kind of drift that caused earlier bugs in this codebase.
     */
    function chipsNeedingTranslation(picks) {
        if (!picks.length) return [];
        // Only skip the request once the language is CONFIRMED English - not merely
        // guessed. detectInitialLanguage() is a best-effort guess from the app's
        // language selector or the browser locale, and either can be wrong (e.g. an
        // app/browser left on English while the user types in French). The ONLY
        // channel that ever corrects that guess is a CHIPS[xx] line in the model's
        // reply - so gating purely on "chipLang === 'en'" was a dead end: if the guess
        // started wrong, we would never again ask, so it could never self-correct.
        // The cost is one small extra request on the very first message for a
        // genuinely English session; every session after is unaffected either way.
        if (chipLangConfirmed && chipLang === 'en') return [];
        return picks.filter(f => !getCachedChipLabel(chipLang, f.q));
    }

    /**
     * Appends a translation request for `untranslated` (from chipsNeedingTranslation),
     * riding on the SAME request that answers the question rather than costing a
     * second AI call. Chip labels are handled separately from the answer itself
     * because the answer already comes out in the user's language on its own (see the
     * LANGUAGE line in buildSystemPrompt) - only the fixed KB strings behind the chips
     * need explicit translating.
     */
    function buildChipTranslationRequest(untranslated) {
        if (!untranslated.length) return '';

        const lines = [];
        lines.push('');
        lines.push('=== UI CHIP TRANSLATION REQUEST ===');
        lines.push('The lines below are short UI suggestion-button labels for this app, ' +
                   'not part of the user\'s question. After your answer, on a FINAL ' +
                   'separate line, output exactly this format (no other text on that line):');
        lines.push('CHIPS[<2-letter language code you answered in>]: <translation 1> | <translation 2> | ...');
        lines.push('Translate each into the SAME language as your answer above, in the ' +
                   'same order. Keep product names (e.g. GOEHS), workflow names, and any ' +
                   'text already in quotes unchanged. If you answered in English, repeat ' +
                   'the lines unchanged and use CHIPS[en].');
        lines.push('Lines to translate:');
        untranslated.forEach((f, i) => lines.push(`  ${i + 1}. ${f.q}`));
        return lines.join('\n');
    }

    /**
     * Pulls a trailing `CHIPS[xx]: a | b | c` line out of the model's raw response,
     * caches each translation against its English original, and returns the answer
     * text with that line removed. The CHIPS line must never reach the user - it is
     * an instruction artifact, not part of the answer.
     *
     * Deliberately strict: a malformed line (wrong count, no matching bracket) is
     * DROPPED rather than partially applied, so a parsing hiccup degrades to "chips
     * stay in whatever language they already were" rather than a mismatched set.
     */
    function extractChipTranslations(rawText, untranslatedPicks) {
        // Trim trailing whitespace FIRST. `.` does not match newlines in JS regex, so a
        // trailing blank line after "CHIPS[..]: ..." (very common in model output) would
        // otherwise stop `(.+)$` from reaching the true end of string and the whole
        // pattern would silently fail to match.
        const trimmed = rawText.replace(/\s+$/, '');
        const match = trimmed.match(/\n?CHIPS\[([a-zA-Z-]{2,8})\]:\s*(.+)$/);
        if (!match) return rawText;

        const cleanText = trimmed.slice(0, match.index).trimEnd();
        const lang = match[1].toLowerCase();
        const parts = match[2].split('|').map(s => s.trim()).filter(Boolean);

        if (parts.length === untranslatedPicks.length) {
            untranslatedPicks.forEach((f, i) => setCachedChipLabel(lang, f.q, parts[i]));
            // The model's actual reply language is the authoritative signal - correct our
            // starting guess from detectInitialLanguage() the moment we have real evidence,
            // so later messages request the right language from the first uncached chip.
            if (lang) chipLang = lang;
            // This is the ONLY place chipLangConfirmed becomes true - a well-formed reply
            // is real evidence about the language, even when it confirms our guess was
            // 'en' all along. Until this fires at least once, chipsNeedingTranslation()
            // keeps asking on every message rather than trusting an unconfirmed guess.
            chipLangConfirmed = true;
        }
        // Count mismatch: say nothing about it here, just don't cache - extraction still
        // strips the line either way, since it must never be shown regardless. We also
        // do NOT set chipLangConfirmed here, so the next message tries again rather than
        // getting permanently stuck on a parse hiccup.

        return cleanText;
    }

    function buildPrompt(question, chipsRequest) {
        const convo = history.slice(-MAX_TURNS * 2)
            .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
            .join('\n');
        return buildSystemPrompt(question)
            + (convo ? `\n\n=== CONVERSATION SO FAR ===\n${convo}` : '')
            + `\n\nUser: ${question}\nAssistant:`
            + (chipsRequest || '');
    }

    // ── Transport ─────────────────────────────────────────────────────────────
    // Reuses the app's existing AI endpoint and payload shape.

    async function ask(question, chipsRequest) {
        const url = window.AI_URL || window.API_ENDPOINT;
        if (!url) throw new Error('AI endpoint is not configured (window.AI_URL is undefined).');

        // Build ONCE. This used to call buildPrompt() twice - once for `prompt` and again
        // for `messages` - which sent the whole knowledge base down the wire twice and
        // roughly doubled an already large request.
        const prompt = buildPrompt(question, chipsRequest);

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

    /**
     * Scrolls the log to its current bottom. Pulled out on its own because the log
     * needs re-scrolling at THREE points, not just on append: when a message is first
     * added, when the "…" placeholder's text is later replaced by the real (usually
     * taller) answer, and when the chip row reappears below the log and shrinks its
     * available height (the log is flex-1 in a flex-col panel, so the chip bar
     * showing up steals space from it) - that last one is what was reading as "the
     * chip block is obscuring the message": the log stayed scrolled to a bottom
     * position that the chips had since covered, rather than the log's new bottom.
     */
    function scrollLogToBottom() {
        const log = el('rabAssistantLog');
        if (log) log.scrollTop = log.scrollHeight;
    }

    /** Turns literal HTML-significant characters into entities. Always the FIRST step
     *  on any model text before it is ever assigned to innerHTML - everything built on
     *  top of this only ever introduces tags we hardcoded ourselves. */
    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    /** Inline-only formatting: **bold**, *italic*, ***both***, `code`. Runs on
     *  already-escaped text, so the only tags it can ever introduce are the three
     *  hardcoded here. */
    function renderInlineMarkdown(line) {
        let html = escapeHtml(line);
        html = html.replace(/\*\*\*([^*\n]+?)\*\*\*/g, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>');
        html = html.replace(/`([^`\n]+?)`/g, '<code class="px-1 py-0.5 rounded bg-slate-200/80 text-[0.85em]">$1</code>');
        return html;
    }

    /**
     * Collects one run of list items starting at lines[i].
     *
     * It deliberately tolerates two things that used to terminate the list early -
     * and terminating early is what restarted the numbering, so every item rendered
     * as "1.":
     *   - a BLANK LINE between items, which models emit constantly. It only ends the
     *     run if the next non-blank line is not another item of the same kind.
     *   - a CONTINUATION line indented under an item, which now joins that item
     *     instead of becoming a paragraph wedged between two lists.
     * A line matching the OTHER list style still ends the run, so a bulleted sub-list
     * under a numbered step keeps rendering as its own <ul>, exactly as before.
     */
    function collectListItems(lines, i, re, otherRe) {
        const items = [];
        while (i < lines.length) {
            const m = lines[i].match(re);
            if (m) { items.push([renderInlineMarkdown(m[2])]); i++; continue; }

            if (lines[i].trim() === '') {
                let j = i;
                while (j < lines.length && lines[j].trim() === '') j++;
                if (j < lines.length && re.test(lines[j])) { i = j; continue; }
                break;
            }

            if (items.length && /^\s+\S/.test(lines[i]) && !otherRe.test(lines[i])) {
                items[items.length - 1].push(renderInlineMarkdown(lines[i].trim()));
                i++;
                continue;
            }
            break;
        }
        return { html: items.map(parts => '<li>' + parts.join('<br>') + '</li>').join(''), i: i };
    }

    /**
     * A deliberately tiny, whitelist-only markdown renderer for assistant answers -
     * NOT a general markdown library. The model is a plain-text chat participant, not
     * a page author: it gets **bold**, *italic*, ***both***, `code`, and numbered /
     * bulleted lists - nothing else (no links, images, headings, raw HTML).
     *
     * Numbered lists are the reason this exists as a block-level renderer rather than
     * the earlier inline-only version: a bare `\n` inside a `white-space: pre-wrap`
     * bubble only ever buys ONE line-height of gap, which reads as "bundled text" for
     * anything longer than a couple of short lines - reported directly against a
     * 7-step numbered answer. Consecutive list-marker lines are grouped into a real
     * <ol>/<ul> with actual margin between items, which pre-wrap text alone cannot
     * give no matter how many newlines are in the source.
     *
     * Still escape-first per line, so - same guarantee as the inline renderer - the
     * only tags that can ever appear are the ones hardcoded in it and in its helper.
     */
    function renderMarkdownLite(text) {
        const lines = String(text).split('\n');
        const orderedRe = /^\s*(\d{1,3})[.)]\s+(.*)$/;
        const bulletRe = /^\s*([-*•])\s+(.*)$/;
        const blocks = [];
        let i = 0;

        while (i < lines.length) {
            if (orderedRe.test(lines[i])) {
                // Start from the model's own number. When prose genuinely does split a
                // list, the second half has to resume at 4 rather than drop back to 1.
                const first = parseInt(lines[i].match(orderedRe)[1], 10);
                const run = collectListItems(lines, i, orderedRe, bulletRe);
                i = run.i;
                blocks.push('<ol class="list-decimal ml-4 space-y-1 my-1.5"'
                    + (first === 1 ? '' : ' start="' + first + '"') + '>' + run.html + '</ol>');
                continue;
            }
            if (bulletRe.test(lines[i])) {
                const run = collectListItems(lines, i, bulletRe, orderedRe);
                i = run.i;
                blocks.push('<ul class="list-disc ml-4 space-y-1 my-1.5">' + run.html + '</ul>');
                continue;
            }
            if (lines[i].trim() === '') { i++; continue; } // blank line: blocks carry their own margin

            // Consecutive plain lines become one paragraph, joined by <br> - a run of
            // hard newlines from the model is treated as hard breaks (matching the old
            // pre-wrap behaviour exactly), just laid out with real margin now instead
            // of only ever a single line-height gap.
            const paraLines = [];
            while (i < lines.length && lines[i].trim() !== '' && !orderedRe.test(lines[i]) && !bulletRe.test(lines[i])) {
                paraLines.push(renderInlineMarkdown(lines[i]));
                i++;
            }
            blocks.push('<p class="my-1.5 first:mt-0 last:mb-0">' + paraLines.join('<br>') + '</p>');
        }

        return blocks.join('');
    }

    // ── Clickable button references ─────────────────────────────────────────────
    // When the model names a real button in its answer, that name is turned into a
    // clickable chip that scrolls to and pulses the actual button in the app. The
    // MODEL never writes the link markup itself - only KB.buttons entries that carry
    // a `dom` id (added deliberately, per button, after confirming against the
    // shipped index.html which element that id really points at) are ever linked.
    // Matching the model's own wording instead of trusting emitted syntax means a
    // hallucinated button name simply stays plain text; it can never produce a
    // broken or misleading link.
    const JUMP_OPEN = 'J', JUMP_MID = '', JUMP_CLOSE = '/J';

    /** Strips a KB label down to the plain words the model would actually say -
     *  leading emoji/icon glyphs and a trailing "▾" dropdown caret. */
    function stripLabelDecoration(label) {
        return String(label).replace(/^[^\w]+/, '').replace(/\s*▾$/, '').trim();
    }

    /** Wraps every occurrence of a jump-able button's name in the RAW answer text
     *  (before any HTML exists) with an invisible marker pair carrying its index into
     *  KB.buttons. Runs before renderMarkdownLite() precisely because it works on
     *  plain text - the markers contain no '<', '>' or '&', so escapeHtml() leaves
     *  them untouched and they survive being carried into a <li>, <p>, bold span, etc.
     *  exactly like any other character. */
    // Linking principle: a single common English word is never eligible on its own,
    // even if some future KB edit gives it a `dom` id. "📁 Project ▾" and "🌐
    // Language ▾" both learned this the hard way - stripped to their core they are
    // just "Project" / "Language", words that also show up constantly in unrelated
    // prose (Project ID, Project name, target Language, hazard dropdown Language...)
    // with zero connection to that specific menu, so linking them false-positived on
    // ordinary sentences instead of real button mentions. Multi-word labels ("Save
    // Project", "GOEHS Integration") are naturally specific enough that this hasn't
    // been a problem; it is exactly the bare-single-common-noun case that keeps
    // being the risk. This filter is a second, code-level guard against the same
    // mistake recurring - the KB fix (dropping `dom` from those two entries) is the
    // first, and either alone would have been enough here, but only the code-level
    // one protects against a FUTURE entry making the same mistake.
    const GENERIC_SINGLE_WORDS = new Set([
        'project', 'language', 'file', 'files', 'table', 'image', 'images',
        'report', 'settings', 'name', 'menu', 'download', 'upload', 'export', 'import'
    ]);

    function linkifyButtons(text) {
        const candidates = (KB.buttons || [])
            .map((b, idx) => ({ idx, core: stripLabelDecoration(b.label) }))
            .filter(c => c.core.length >= 3 && KB.buttons[c.idx].dom
                && !(!/\s/.test(c.core) && GENERIC_SINGLE_WORDS.has(c.core.toLowerCase())));
        if (!candidates.length) return text;
        // Longest label first, so e.g. "Download Project ZIP" wins over a shorter
        // candidate that could otherwise match a prefix of it at the same position.
        candidates.sort((a, b) => b.core.length - a.core.length);
        const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Case-SENSITIVE on purpose: "Free Text" (the tab) must not catch the generic
        // lowercase phrase "free text" the glossary uses elsewhere for a plain-text
        // field. A model naming a real button already tends to keep its capitalization
        // (it's quoting a UI label, not writing a common noun), so this loses little
        // while removing that collision entirely.
        const re = new RegExp('\\b(' + candidates.map(c => esc(c.core)).join('|') + ')\\b', 'g');
        const byCore = new Map(candidates.map(c => [c.core, c.idx]));
        return text.replace(re, (m) => {
            const idx = byCore.get(m);
            return idx === undefined ? m : (JUMP_OPEN + idx + JUMP_MID + m + JUMP_CLOSE);
        });
    }

    /** Converts the marker pairs left by linkifyButtons() into real, clickable
     *  buttons. Runs LAST, on the fully-built HTML string, so it does not matter
     *  whether bold/italic wrapped around a marker pair in the meantime - the
     *  markers are still adjacent to exactly the label text they wrapped. */
    function resolveJumpMarkers(html) {
        return html.replace(/J(\d+)([\s\S]*?)\/J/g,
            (_, idx, label) => '<button type="button" class="rab-jump-link" data-rab-jump="' + idx + '">' + label + '</button>');
    }

    /**
     * Sets an assistant bubble's content, rendering the safe markdown subset above.
     * DOMPurify.sanitize() is a second, independent guard on top of the escape-first
     * design of renderMarkdownLite() - the same "generate safe HTML, then sanitize
     * before innerHTML" pattern already used elsewhere in this app (e.g.
     * DOMPurify.sanitize(rowData['Hazard Source']) in loadModalTaskDetails).
     * User messages deliberately do NOT go through this - they are shown as plain
     * text as typed, with no reason to interpret markdown in your own message.
     */
    function setBubbleAnswerText(bubble, text) {
        let html = renderMarkdownLite(linkifyButtons(text));
        html = resolveJumpMarkers(html);
        bubble.innerHTML = (typeof DOMPurify !== 'undefined')
            ? DOMPurify.sanitize(html, {
                ALLOWED_TAGS: ['strong', 'em', 'code', 'ol', 'ul', 'li', 'p', 'br', 'button'],
                ALLOWED_ATTR: ['class', 'start', 'type', 'data-rab-jump']   // start=list resume; the rest=jump links
              })
            : escapeHtml(text); // DOMPurify failed to load - fall back to plain escaped text, never raw HTML
    }

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
        if (role === 'user') {
            bubble.textContent = text; // plain text, not interpreted as markdown
        } else {
            setBubbleAnswerText(bubble, text);
        }
        wrap.appendChild(bubble);
        log.appendChild(wrap);
        scrollLogToBottom();
        return bubble;
    }

    /**
     * A bouncing-dots "thinking" indicator, replacing the old static "…". This bubble
     * is never given model text - its HTML is a fixed string we authored, so unlike
     * addMessage()/setBubbleAnswerText() it is safe to assign directly. Returns the
     * bubble so submit() can later swap in the real answer via setBubbleAnswerText().
     */
    function addThinkingBubble() {
        const log = el('rabAssistantLog');
        if (!log) return null;
        const wrap = document.createElement('div');
        wrap.className = 'flex justify-start';
        const bubble = document.createElement('div');
        bubble.className = 'max-w-[85%] px-3 py-2.5 rounded-2xl rounded-bl-sm bg-slate-100';
        bubble.setAttribute('aria-label', 'Thinking…');
        bubble.innerHTML =
            '<span class="rab-typing"><span class="rab-typing-dot"></span>' +
            '<span class="rab-typing-dot"></span><span class="rab-typing-dot"></span></span>';
        wrap.appendChild(bubble);
        log.appendChild(wrap);
        scrollLogToBottom();
        return bubble;
    }

    // ── Suggested follow-up chips ─────────────────────────────────────────────
    // Picked here in code, never by the model: a suggestion must always be something
    // the assistant can actually answer, and this costs no extra AI call.

    const asked = new Set();   // don't re-offer something already used this session
    const MAX_CHIPS = 3;

    /** Screen preconditions a follow-up can declare via `needs`. */
    function precondition(needs) {
        if (!needs) return true;
        const hasTable = document.querySelectorAll('#table-container tbody tr').length > 0;
        const hasGallery = document.querySelectorAll('.gallery-item img').length > 0;
        if (needs === 'table') return hasTable;
        if (needs === 'no-table') return !hasTable;
        if (needs === 'gallery') return hasGallery;
        return true;
    }

    function eligibleFollowUps() {
        const list = KB.followUps || [];
        const wfId = currentWorkflowId();
        return list.filter(f => {
            if (asked.has(f.q)) return false;
            if (!precondition(f.needs)) return false;
            const when = f.when || ['*'];
            return when.includes('*') || (wfId && when.includes(wfId));
        });
    }

    /**
     * The chosen KB entries, in display order. Pulled out on its own because both the
     * chip translation request (built BEFORE the AI call, from what we are about to
     * show) and the chip rendering (AFTER, once any new translations are cached) need
     * the identical selection - computing it twice could pick a different set if the
     * screen changed in between.
     */
    function pickFollowUps() {
        const wfId = currentWorkflowId();
        const pool = eligibleFollowUps();
        // Workflow-specific suggestions come first, then the generic ones, so the most
        // relevant chip is always leftmost rather than buried behind "What can you help with".
        const specific = pool.filter(f => (f.when || []).includes(wfId));
        const generic = pool.filter(f => !(f.when || []).includes(wfId));
        return specific.concat(generic).slice(0, MAX_CHIPS);
    }

    /** Renders whatever pickFollowUps() currently returns, using cached translations. */
    function renderFollowUps() {
        const bar = el('rabAssistantChips');
        if (!bar) return;
        bar.innerHTML = '';

        const picks = pickFollowUps();
        picks.forEach(f => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'text-left text-[11px] leading-snug px-2.5 py-1.5 rounded-full '
                + 'border border-indigo-200 bg-indigo-50 text-indigo-800 '
                + 'hover:bg-indigo-100 hover:border-indigo-300 transition';
            // Cached translation for the current display language, or the English
            // original as a safe fallback if it has not been translated (yet, or ever -
            // English never needs it).
            chip.textContent = getCachedChipLabel(chipLang, f.q) || f.q;
            chip.title = f.q !== chip.textContent ? f.q : ''; // hover shows the English original
            chip.addEventListener('click', () => {
                if (busy) return;
                asked.add(f.q);
                const input = el('rabAssistantInput');
                // The submitted text is always the canonical English question, regardless
                // of the chip's displayed language - the model answers a real question
                // either way, and this keeps KB matching / the `asked` dedupe simple.
                if (input) input.value = f.q;
                submit();
            });
            bar.appendChild(chip);
        });

        bar.classList.toggle('hidden', picks.length === 0);
    }

    // ── Live screen-awareness while the panel is open ───────────────────────────
    //
    // currentWorkflowId() is only ever asked once, at the moment renderFollowUps()
    // runs. If the user leaves the panel open and switches tabs, or opens/closes a
    // tracked modal (GOEHS Integration, the Excel mappers), the chips would keep
    // showing the PREVIOUS screen's suggestions until the next message. Rather than
    // hook every place a tab or modal can be opened - switchTab has one funnel, but
    // e.g. the Legacy Excel mapper is opened from several different inline onclick
    // handlers with no single function to wrap - poll the same currentWorkflowId()
    // the prompt itself uses, and re-render only when it actually changes. This is
    // read-only and cheap (one DOM lookup), and only runs while the panel is visible.
    let screenWatchTimer = null;
    let lastWatchedWorkflowId = null;

    function checkScreenChanged() {
        const id = currentWorkflowId();
        if (id !== lastWatchedWorkflowId) {
            lastWatchedWorkflowId = id;
            renderFollowUps();
            scrollLogToBottom();
        }
    }

    function startScreenWatch() {
        lastWatchedWorkflowId = currentWorkflowId();
        stopScreenWatch();
        screenWatchTimer = setInterval(checkScreenChanged, 1000);
    }

    function stopScreenWatch() {
        if (screenWatchTimer) { clearInterval(screenWatchTimer); screenWatchTimer = null; }
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
        el('rabAssistantChips')?.classList.add('hidden');
        const thinking = addThinkingBubble();
        try {
            // Picked BEFORE the call: the translation request has to name the exact
            // chips it is translating, and this is the one place both the request and
            // the later render agree on what "the current chips" means.
            const picks = pickFollowUps();
            const untranslated = chipsNeedingTranslation(picks);
            const chipsRequest = buildChipTranslationRequest(untranslated);

            const raw = await ask(question, chipsRequest);
            const answer = untranslated.length ? extractChipTranslations(raw, untranslated) : raw;
            const text = answer || 'I could not get an answer just then. Please try again.';
            setBubbleAnswerText(thinking, text);
            history.push({ role: 'assistant', text });
            // The placeholder was scrolled into view while it was still just "…" - the
            // real answer is usually taller, so the bottom of it can now sit below what
            // is visible until we scroll again.
            scrollLogToBottom();
        } catch (err) {
            console.error('[assistant]', err);
            // Show the actual reason rather than a generic "check your connection". The
            // failure modes here (endpoint not configured / CORS / HTTP status / empty
            // reply) need different fixes, and hiding them behind one sentence makes the
            // problem undiagnosable for whoever has to look at it.
            // Routed through setBubbleAnswerText, not raw textContent, purely for
            // consistency of the one rendering path - the error string is ours, not
            // model output, but `detail` inside it can carry response body text from
            // the AI proxy, so treat it the same as any other untrusted text.
            setBubbleAnswerText(thinking, 'Help service error — ' + (err && err.message ? err.message : String(err)));
            scrollLogToBottom();
        } finally {
            busy = false;
            renderFollowUps();
            // Chips just went from hidden to visible (or changed count), which shrinks
            // the log's available height since it is flex-1 above the chip row - without
            // this the log stays scrolled to its OLD bottom, which the chip bar has since
            // covered, cutting off the message that was just fully visible a moment ago.
            scrollLogToBottom();
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
                // Name the OTHER tabs too, not just the active one - otherwise a
                // first-time user on Rich Media has no idea Free Text/Excel/Fire
                // Risk/Cost-Benefit exist. Uses the exact `nav: true` labels from
                // KB.buttons, so each name renders as a real, clickable tab-switch
                // chip through the same pipeline as any other jump link - nothing
                // extra to wire up here.
                const activeContent = document.querySelector('.tab-content:not(.hidden)');
                const activeTabId = activeContent ? activeContent.id.replace(/^tab-content-/, '') : null;
                const otherTabs = Object.entries(TAB_LABELS)
                    .filter(([id]) => id !== activeTabId)
                    .map(([, label]) => label);
                const otherLine = otherTabs.length
                    ? ' I can also help with ' + otherTabs.slice(0, -1).join(', ')
                        + (otherTabs.length > 1 ? ', or ' : '') + otherTabs[otherTabs.length - 1] + '.'
                    : '';
                addMessage('assistant', wf
                    ? `Hi — I can help with ${wf.label}.${otherLine} Ask me anything about this app, ` +
                      `in any language.`
                    : `Hi — ask me anything about this app, in any language.${otherLine}`);
                if (wf && wf.status === 'beta') addMessage('assistant', KB.betaNotice);
            }
            renderFollowUps();
            // Same reason as in submit(): the greeting was scrolled into view before the
            // chip row existed, which then shrinks the log's height.
            scrollLogToBottom();
            const input = el('rabAssistantInput');
            if (input) input.focus();
            startScreenWatch();
        } else {
            stopScreenWatch();
        }
    }

    /**
     * Handles a click on a `[data-rab-jump]` chip produced by resolveJumpMarkers().
     * `entry.reveal` (if present) is an ordered list of OTHER elements' ids to click
     * first - tab buttons and dropdown/menu toggles only, never the target itself and
     * never anything that mutates data or pops an OS file dialog - so the button the
     * user asked about becomes visible without the assistant performing that button's
     * own action for them.
     *
     * `entry.nav` is the one deliberate exception: it marks a target as pure
     * navigation (currently just the 5 tab buttons) with no data effect at all, so
     * clicking its chip actually performs the switch instead of only pointing at it -
     * the same trust level as a normal in-app link, not an action like "Generate" or
     * "Download" that the user needs to consciously choose to run.
     *
     * If the target is still not visible afterwards (e.g. the table has not been
     * generated yet, so this build's action bar is legitimately hidden), the KB's own
     * `where` text is surfaced as a toast instead of a silent no-op.
     */
    let spotlightTimer = null;

    /**
     * Dims and blurs the rest of the page behind a single fixed overlay for about a
     * second, while the target itself sits above it (see .rab-jump-highlight's
     * z-index in index.html) and so stays fully sharp. Purely a visual cue - the
     * overlay is `pointer-events: none`, so nothing underneath is ever unclickable
     * because of it. One overlay element is created once and reused, since jump
     * clicks are a rapid, repeatable interaction - re-triggering it mid-fade just
     * restarts the timer rather than stacking overlays.
     */
    function spotlightElement() {
        let overlay = document.getElementById('rabJumpOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'rabJumpOverlay';
            overlay.className = 'rab-jump-overlay';
            document.body.appendChild(overlay);
        }
        if (spotlightTimer) clearTimeout(spotlightTimer);
        // Drop then re-add the show class so a click that lands mid-fade restarts the
        // transition from 0, instead of the browser skipping it because opacity is
        // already at (or animating toward) 1.
        overlay.classList.remove('rab-jump-overlay-show');
        void overlay.offsetWidth; // force a reflow between the remove and the re-add
        overlay.classList.add('rab-jump-overlay-show');
        spotlightTimer = setTimeout(() => overlay.classList.remove('rab-jump-overlay-show'), 1000);
    }

    function jumpToButton(idx) {
        const entry = (KB.buttons || [])[idx];
        if (!entry || !entry.dom) return;
        (entry.reveal || []).forEach(id => {
            const revealEl = document.getElementById(id);
            if (revealEl) revealEl.click();
        });
        const target = document.getElementById(entry.dom);
        if (entry.nav && target) target.click();
        const visible = !!target && !!(target.offsetWidth || target.offsetHeight || target.getClientRects().length);
        if (visible) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.classList.add('rab-jump-highlight');
            setTimeout(() => target.classList.remove('rab-jump-highlight'), 1600);
            spotlightElement();
        } else if (typeof window.showCustomAlert === 'function') {
            window.showCustomAlert('You’ll find "' + stripLabelDecoration(entry.label) + '" ' + entry.where + '.', 'info');
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
        el('rabAssistantLog')?.addEventListener('click', (e) => {
            const chip = e.target.closest('[data-rab-jump]');
            if (chip) jumpToButton(Number(chip.getAttribute('data-rab-jump')));
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.RABAssistant = { toggle, ask, buildSystemPrompt, currentWorkflow };
})();
