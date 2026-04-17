/* ============================================================
   best-practices.js  —  Field Accelerator "Best Practices" modal
   Standalone file: builds its own DOM, SVG, animations.
   Full EN / FR / DE translations.
   Opens via:  window.showBestPractices()
   ============================================================ */

(function () {
    'use strict';

    /* ── Helpers ─────────────────────────────────────────────── */
    function getLang() {
        const sel = document.getElementById('langSelect');
        const v = sel ? sel.value : 'en';
        return ['en', 'fr', 'de'].includes(v) ? v : 'en';
    }

    /* ── Translated content ──────────────────────────────────── */
    const T = {
        en: {
            supra:     'Risk Assessment Buddy',
            title:     'Field Accelerator',
            tagline:   'Remove the admin burden.<br>You lead — AI co-pilots.',
            pills:     ['⚡ Accelerate', '🤝 Team-Led', '🎯 Actionable'],
            tenet:     '<strong>AI handles the paperwork. Your team handles the knowledge.</strong> Together you produce risk assessments that are faster, smarter, and actually owned by the people on the ground.',
            steps: [
                { icon: '📸', heading: 'Capture the Process',     body: 'Photos, video, or plain text — document the work from start to finish before the conversation begins.' },
                { icon: '👥', heading: 'Engage the Team',         body: 'Walk through each step with the people who do the work. Their knowledge and past incidents are the most valuable input.' },
                { icon: '🤖', heading: 'Generate AI Baseline',    body: 'Let AI structure the risk table in seconds — hazard groups, risk scores, categories. Hours of admin work, done.' },
                { icon: '🔍', heading: 'Review & Re-evaluate',   body: 'Open any task step to re-score with your team. Ops and EHS propose actions together — record them in the Actions panel.' },
                { icon: '📊', heading: 'See Risk Evolution',      body: 'Each proposed action produces a live projected risk score. Discussions become data — and the team can see the impact of their own decisions.' },
                { icon: '📥', heading: 'Export & Track',          body: 'Download the ZIP — actions become a ready-to-import CSV. The loop closes from field conversation to tracking system with no manual transcription.' }
            ],
            mantraMain: 'You are the driver.',
            mantraSub:  'AI is your co-pilot, not the captain. Genuine buy-in comes from the team — not the algorithm.',
            explore:    'Explore detailed workflows',
            gotIt:      'Got it!',
            wfRich:     '📸 Rich Media',
            wfText:     '✍️ Free Text',
            wfExcel:    '📊 Excel Import',
            wfFire:     '🔥 Fire Risk',
            wfTips:     '💡 Key Tips'
        },
        fr: {
            supra:     'Risk Assessment Buddy',
            title:     'Accélérateur de Terrain',
            tagline:   'Éliminez la charge administrative.<br>Vous dirigez — l\'IA co-pilote.',
            pills:     ['⚡ Accélérer', '🤝 Équipe', '🎯 Actionnable'],
            tenet:     '<strong>L\'IA s\'occupe de la paperasse. Votre équipe apporte le savoir.</strong> Ensemble, vous produisez des évaluations des risques plus rapides, plus intelligentes et réellement appropriées par les gens sur le terrain.',
            steps: [
                { icon: '📸', heading: 'Capturer le Processus',          body: 'Photos, vidéo ou texte libre — documentez le travail du début à la fin avant que la conversation ne commence.' },
                { icon: '👥', heading: 'Impliquer l\'Équipe',            body: 'Parcourez chaque étape avec les personnes qui font le travail. Leur savoir et leurs incidents passés sont les données les plus précieuses.' },
                { icon: '🤖', heading: 'Générer une Base IA',            body: 'Laissez l\'IA structurer le tableau des risques en quelques secondes — groupes de dangers, scores de risque, catégories. Des heures d\'administration, terminées.' },
                { icon: '🔍', heading: 'Réviser & Réévaluer',           body: 'Ouvrez n\'importe quelle étape pour réévaluer avec votre équipe. Opérations et EHS proposent des actions ensemble — enregistrez-les dans le panneau Actions.' },
                { icon: '📊', heading: 'Voir l\'Évolution du Risque',    body: 'Chaque action proposée produit un score de risque projeté en temps réel. Les discussions deviennent des données — et l\'équipe voit l\'impact de ses propres décisions.' },
                { icon: '📥', heading: 'Exporter & Suivre',             body: 'Téléchargez le ZIP — les actions deviennent un CSV prêt à importer. La boucle se ferme de la conversation terrain au système de suivi sans transcription manuelle.' }
            ],
            mantraMain: 'Vous êtes le pilote.',
            mantraSub:  'L\'IA est votre co-pilote, pas le capitaine. L\'adhésion vient de l\'équipe — pas de l\'algorithme.',
            explore:    'Explorer les flux détaillés',
            gotIt:      'Compris !',
            wfRich:     '📸 Médias Riches',
            wfText:     '✍️ Texte Libre',
            wfExcel:    '📊 Import Excel',
            wfFire:     '🔥 Risque Incendie',
            wfTips:     '💡 Conseils Clés'
        },
        de: {
            supra:     'Risk Assessment Buddy',
            title:     'Feldbeschleuniger',
            tagline:   'Verwaltungsaufwand beseitigen.<br>Sie führen — KI unterstützt.',
            pills:     ['⚡ Beschleunigen', '🤝 Teamgeführt', '🎯 Umsetzbar'],
            tenet:     '<strong>KI erledigt den Papierkram. Ihr Team liefert das Wissen.</strong> Gemeinsam erstellen Sie Risikobewertungen, die schneller, klüger und wirklich von den Menschen vor Ort getragen werden.',
            steps: [
                { icon: '📸', heading: 'Prozess erfassen',               body: 'Fotos, Video oder Freitext — dokumentieren Sie die Arbeit von Anfang bis Ende, bevor das Gespräch beginnt.' },
                { icon: '👥', heading: 'Team einbeziehen',               body: 'Gehen Sie jeden Schritt mit den Personen durch, die die Arbeit ausführen. Ihr Wissen und frühere Vorfälle sind die wertvollsten Eingaben.' },
                { icon: '🤖', heading: 'KI-Basislinie erstellen',        body: 'Lassen Sie die KI die Risikotabelle in Sekunden strukturieren — Gefahrengruppen, Risikoscores, Kategorien. Stunden an Administration, erledigt.' },
                { icon: '🔍', heading: 'Prüfen & Neu bewerten',         body: 'Öffnen Sie einen beliebigen Arbeitsschritt, um ihn mit Ihrem Team neu zu bewerten. Betrieb und EHS schlagen gemeinsam Maßnahmen vor — erfassen Sie diese im Aktionspanel.' },
                { icon: '📊', heading: 'Risikoentwicklung sehen',        body: 'Jede vorgeschlagene Maßnahme erzeugt einen projizierten Risikoscore in Echtzeit. Diskussionen werden zu Daten — und das Team sieht die Auswirkung seiner eigenen Entscheidungen.' },
                { icon: '📥', heading: 'Exportieren & Verfolgen',        body: 'ZIP herunterladen — Maßnahmen werden zu einer importfertigen CSV. Der Kreislauf schließt sich vom Feldgespräch bis zum Tracking-System ohne manuelle Übertragung.' }
            ],
            mantraMain: 'Sie sind der Fahrer.',
            mantraSub:  'KI ist Ihr Co-Pilot, nicht der Kapitän. Echte Zustimmung kommt vom Team — nicht vom Algorithmus.',
            explore:    'Detaillierte Workflows erkunden',
            gotIt:      'Verstanden!',
            wfRich:     '📸 Rich Media',
            wfText:     '✍️ Freitext',
            wfExcel:    '📊 Excel-Import',
            wfFire:     '🔥 Brandrisiko',
            wfTips:     '💡 Wichtige Tipps'
        }
    };

    /* ── Step card colors ────────────────────────────────────── */
    const STEP_COLORS = [
        { bg: 'bg-emerald-50', border: 'border-emerald-200', num: 'bg-emerald-500', title: 'text-emerald-900', body: 'text-emerald-700' },
        { bg: 'bg-amber-50',   border: 'border-amber-200',   num: 'bg-amber-500',   title: 'text-amber-900',   body: 'text-amber-700' },
        { bg: 'bg-blue-50',    border: 'border-blue-200',    num: 'bg-blue-600',    title: 'text-blue-900',    body: 'text-blue-700' },
        { bg: 'bg-violet-50',  border: 'border-violet-200',  num: 'bg-violet-600',  title: 'text-violet-900',  body: 'text-violet-700' },
        { bg: 'bg-teal-50',    border: 'border-teal-200',    num: 'bg-teal-600',    title: 'text-teal-900',    body: 'text-teal-700' },
        { bg: 'bg-rose-50',    border: 'border-rose-200',    num: 'bg-rose-600',    title: 'text-rose-900',    body: 'text-rose-700' }
    ];

    /* ── Workflow nav buttons ────────────────────────────────── */
    const WF_BUTTONS = [
        { key: 'wfRich',  tab: 'rich-media', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100' },
        { key: 'wfText',  tab: 'free-text',  cls: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100' },
        { key: 'wfExcel', tab: 'excel',       cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
        { key: 'wfFire',  tab: 'fire-risk',   cls: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' },
        { key: 'wfTips',  tab: 'tips',         cls: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100' }
    ];

    /* ── CSS injection ───────────────────────────────────────── */
    function injectStyles() {
        if (document.getElementById('bp-modal-styles')) return;
        const s = document.createElement('style');
        s.id = 'bp-modal-styles';
        s.textContent = `
            @keyframes bpFloat {
                0%, 100% { transform: translateY(0px); }
                50%       { transform: translateY(-7px); }
            }
            @keyframes bpOrbitSpin {
                from { transform: rotate(0deg); }
                to   { transform: rotate(360deg); }
            }
            @keyframes bpPulseRing {
                0%, 100% { transform: scale(1);   opacity: 0.18; }
                50%       { transform: scale(1.5); opacity: 0.04; }
            }
            @keyframes bpArcFlow {
                from { stroke-dashoffset: 0; }
                to   { stroke-dashoffset: -24; }
            }
            @keyframes bpFadeUp {
                from { opacity: 0; transform: translateY(12px); }
                to   { opacity: 1; transform: translateY(0); }
            }
            .bp-step { animation: bpFadeUp 0.38s ease both; }
            .bp-step:nth-child(1) { animation-delay: 0.04s; }
            .bp-step:nth-child(2) { animation-delay: 0.10s; }
            .bp-step:nth-child(3) { animation-delay: 0.16s; }
            .bp-step:nth-child(4) { animation-delay: 0.22s; }
            .bp-step:nth-child(5) { animation-delay: 0.28s; }
            .bp-step:nth-child(6) { animation-delay: 0.34s; }

            #bpModal {
                position: fixed; inset: 0; z-index: 10000;
                display: flex; align-items: center; justify-content: center;
                background: rgba(15,23,42,0.6);
                backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
                padding: 12px;
                opacity: 0; transition: opacity .3s ease;
            }
            #bpModal.bp-open { opacity: 1; }

            .bp-card {
                background: #fff; border-radius: 20px;
                width: 96vw; max-width: 680px;
                max-height: 92vh;
                display: flex; flex-direction: column;
                box-shadow: 0 32px 80px rgba(15,23,42,0.3);
                transform: translateY(28px) scale(0.97);
                transition: transform .4s cubic-bezier(.22,1,.36,1);
                overflow: hidden;
            }
            #bpModal.bp-open .bp-card { transform: translateY(0) scale(1); }
        `;
        document.head.appendChild(s);
    }

    /* ── Build SVG (same animation, rendered once) ───────────── */
    function buildSVG() {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="190" height="120" viewBox="0 0 280 140" aria-hidden="true">
            <defs>
                <radialGradient id="bpBgGrad" cx="50%" cy="50%" r="55%">
                    <stop offset="0%" stop-color="#6366f1" stop-opacity="0.22"/>
                    <stop offset="100%" stop-color="#0f172a" stop-opacity="0"/>
                </radialGradient>
                <radialGradient id="bpAIGrad" cx="38%" cy="32%" r="62%">
                    <stop offset="0%" stop-color="#a5b4fc"/>
                    <stop offset="100%" stop-color="#3730a3"/>
                </radialGradient>
                <filter id="bpGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="4" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
            </defs>
            <ellipse cx="140" cy="70" rx="128" ry="64" fill="url(#bpBgGrad)"/>
            <ellipse cx="90" cy="68" rx="46" ry="40" fill="none" stroke="#818cf8" stroke-width="1.2" stroke-dasharray="3 6" opacity="0.4"/>
            <!-- Orbiting node 1 green -->
            <g style="transform-origin:90px 68px; animation:bpOrbitSpin 7s linear infinite">
                <circle cx="90" cy="28" r="8" fill="#059669" opacity="0.9"/>
                <rect x="85.5" y="24.5" width="9" height="7" rx="1.5" fill="white" opacity="0.85"/>
                <circle cx="90" cy="28" r="2.5" fill="#059669" opacity="0.7"/>
                <polygon points="90,21 92,24.5 88,24.5" fill="white" opacity="0.85"/>
            </g>
            <!-- Orbiting node 2 amber -->
            <g style="transform-origin:90px 68px; animation:bpOrbitSpin 7s -2.33s linear infinite">
                <circle cx="90" cy="28" r="8" fill="#d97706" opacity="0.9"/>
                <polygon points="90,23 95,32 85,32" fill="none" stroke="white" stroke-width="1.5" opacity="0.9"/>
                <line x1="90" y1="25.5" x2="90" y2="29.5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                <circle cx="90" cy="31" r="0.9" fill="white"/>
            </g>
            <!-- Orbiting node 3 violet -->
            <g style="transform-origin:90px 68px; animation:bpOrbitSpin 7s -4.67s linear infinite">
                <circle cx="90" cy="28" r="8" fill="#7c3aed" opacity="0.9"/>
                <rect x="84.5" y="30" width="3" height="5" rx="0.8" fill="white" opacity="0.85"/>
                <rect x="88.5" y="27" width="3" height="8" rx="0.8" fill="white" opacity="0.85"/>
                <rect x="92.5" y="24.5" width="3" height="10.5" rx="0.8" fill="white" opacity="0.85"/>
            </g>
            <!-- Worker floating -->
            <g style="transform-origin:90px 70px; animation:bpFloat 3.5s ease-in-out infinite">
                <rect x="82" y="90" width="9" height="20" rx="4" fill="#1e293b"/>
                <rect x="94" y="90" width="9" height="20" rx="4" fill="#1e293b"/>
                <rect x="78" y="62" width="24" height="30" rx="5" fill="#1d4ed8"/>
                <rect x="78" y="67" width="24" height="5" rx="1.5" fill="#fbbf24" opacity="0.9"/>
                <rect x="78" y="79" width="24" height="5" rx="1.5" fill="#fbbf24" opacity="0.9"/>
                <rect x="65" y="62" width="11" height="19" rx="5" fill="#1d4ed8"/>
                <rect x="104" y="62" width="11" height="19" rx="5" fill="#1d4ed8"/>
                <circle cx="70" cy="83" r="6" fill="#fbbf24"/>
                <circle cx="110" cy="83" r="6" fill="#fbbf24"/>
                <rect x="85" y="55" width="10" height="9" rx="3" fill="#fbbf24"/>
                <circle cx="90" cy="46" r="13" fill="#fbbf24"/>
                <path d="M75 46 Q90 28 105 46 Z" fill="#f59e0b"/>
                <rect x="73" y="44.5" width="34" height="5" rx="2.5" fill="#f59e0b"/>
            </g>
            <!-- Arc -->
            <path d="M 130 72 Q 172 48 195 72" fill="none" stroke="#818cf8" stroke-width="2.5" stroke-dasharray="7 5" opacity="0.7" style="animation: bpArcFlow 1.8s linear infinite"/>
            <!-- AI orb -->
            <circle cx="215" cy="72" r="26" fill="#4f46e5" opacity="0.18" style="transform-origin:215px 72px; animation:bpPulseRing 2.8s ease-in-out infinite"/>
            <circle cx="215" cy="72" r="20" fill="#4f46e5" opacity="0.25" filter="url(#bpGlow)"/>
            <circle cx="215" cy="72" r="18" fill="url(#bpAIGrad)"/>
            <line x1="204" y1="72" x2="226" y2="72" stroke="white" stroke-width="0.9" opacity="0.35"/>
            <line x1="215" y1="61" x2="215" y2="83" stroke="white" stroke-width="0.9" opacity="0.35"/>
            <circle cx="208" cy="66" r="2.2" fill="white" opacity="0.55"/>
            <circle cx="222" cy="78" r="2.2" fill="white" opacity="0.55"/>
            <circle cx="208" cy="78" r="1.6" fill="white" opacity="0.4"/>
            <circle cx="222" cy="66" r="1.6" fill="white" opacity="0.4"/>
            <text x="215" y="76.5" text-anchor="middle" font-size="11" font-weight="800" fill="white" font-family="system-ui,sans-serif">AI</text>
            <text x="90"  y="118" text-anchor="middle" font-size="8.5" fill="#94a3b8" font-family="system-ui,sans-serif" font-weight="700" letter-spacing="1">YOU</text>
            <text x="215" y="102" text-anchor="middle" font-size="7.5" fill="#818cf8" font-family="system-ui,sans-serif" font-weight="700" letter-spacing="0.5">CO-PILOT</text>
        </svg>`;
    }

    /* ── Build modal DOM ─────────────────────────────────────── */
    let modalEl = null;

    function buildModal(lang) {
        const t = T[lang] || T.en;

        const stepsHTML = t.steps.map((step, i) => {
            const c = STEP_COLORS[i];
            return `<div class="bp-step flex gap-3 p-3.5 ${c.bg} border ${c.border} rounded-xl">
                <div class="w-8 h-8 rounded-full ${c.num} text-white flex items-center justify-center text-sm font-bold flex-shrink-0">${i + 1}</div>
                <div>
                    <p class="text-xs font-bold ${c.title} mb-0.5">${step.icon} ${step.heading}</p>
                    <p class="text-xs ${c.body} leading-snug">${step.body}</p>
                </div>
            </div>`;
        }).join('');

        const wfBtnsHTML = WF_BUTTONS.map(b => {
            return `<button class="bp-wf-btn inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border ${b.cls} transition" data-tab="${b.tab}">${t[b.key]}</button>`;
        }).join('');

        const pillsHTML = t.pills.map(p =>
            `<span class="bg-indigo-800/70 text-indigo-200 text-xs px-2.5 py-1 rounded-full font-semibold">${p}</span>`
        ).join('');

        const html = `
        <div class="bp-card">
            <!-- Hero -->
            <div class="relative overflow-hidden flex-shrink-0" style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #0c2340 100%);">
                <button class="bp-close absolute top-3 right-4 text-slate-400 text-3xl font-light cursor-pointer hover:text-white transition leading-none z-10 bg-transparent border-none">&times;</button>
                <div class="flex items-center gap-5 px-6 py-5">
                    <div class="flex-shrink-0">${buildSVG()}</div>
                    <div class="text-white min-w-0">
                        <div class="text-xs uppercase tracking-widest text-indigo-300 font-bold mb-0.5">${t.supra}</div>
                        <h2 class="text-xl font-extrabold leading-tight">${t.title}</h2>
                        <p class="text-indigo-200 text-sm mt-1 leading-snug">${t.tagline}</p>
                        <div class="mt-3 flex flex-wrap gap-1.5">${pillsHTML}</div>
                    </div>
                </div>
            </div>
            <!-- Body -->
            <div class="overflow-y-auto px-6 py-5 flex-1 space-y-4">
                <div class="bg-gradient-to-r from-indigo-50 to-blue-50 border-l-4 border-indigo-500 rounded-r-xl px-4 py-3">
                    <p class="text-sm text-indigo-900 font-medium leading-relaxed">${t.tenet}</p>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${stepsHTML}</div>
                <div class="rounded-xl px-5 py-4 text-center text-white" style="background: linear-gradient(135deg, #4338ca, #1d4ed8);">
                    <p class="font-extrabold text-base">${t.mantraMain}</p>
                    <p class="text-indigo-200 text-sm mt-0.5">${t.mantraSub}</p>
                </div>
                <div>
                    <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">${t.explore}</p>
                    <div class="flex flex-wrap gap-2">${wfBtnsHTML}</div>
                </div>
                <div class="text-center pt-1 pb-1">
                    <button class="bp-gotit bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-8 rounded-lg transition shadow-sm">${t.gotIt}</button>
                </div>
            </div>
        </div>`;

        return html;
    }

    function ensureModal() {
        injectStyles();
        if (!modalEl) {
            modalEl = document.createElement('div');
            modalEl.id = 'bpModal';
            modalEl.setAttribute('role', 'dialog');
            modalEl.setAttribute('aria-modal', 'true');
            document.body.appendChild(modalEl);

            // Backdrop + escape close
            modalEl.addEventListener('click', (e) => { if (e.target === modalEl) closeModal(); });
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalEl.classList.contains('bp-open')) closeModal(); });
        }
    }

    function renderContent() {
        const lang = getLang();
        modalEl.innerHTML = buildModal(lang);

        // Wire close
        modalEl.querySelector('.bp-close').addEventListener('click', closeModal);
        modalEl.querySelector('.bp-gotit').addEventListener('click', closeModal);

        // Wire workflow buttons
        modalEl.querySelectorAll('.bp-wf-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                closeModal();
                setTimeout(() => { if (window.showHowToUseModal) window.showHowToUseModal(tab); }, 350);
            });
        });
    }

    function openModal() {
        ensureModal();
        renderContent();
        modalEl.style.display = 'flex';
        requestAnimationFrame(() => requestAnimationFrame(() => modalEl.classList.add('bp-open')));
    }

    function closeModal() {
        if (!modalEl) return;
        modalEl.classList.remove('bp-open');
        setTimeout(() => { if (modalEl) modalEl.style.display = 'none'; }, 320);
    }

    /* ── Wire footer / header button ─────────────────────────── */
    document.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('bestPracticesBtn');
        if (btn) btn.addEventListener('click', openModal);

        // Hide the old inline modal if still present
        const old = document.getElementById('bestPracticesModal');
        if (old) old.style.display = 'none';
    });

    /* ── Public API ──────────────────────────────────────────── */
    window.showBestPractices = openModal;

})();
