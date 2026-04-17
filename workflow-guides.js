/* ============================================================
   workflow-guides.js  —  Headspace-style "How to?" onboarding modals
   Standalone file: zero dependencies on the core engine.
   Kill switch:  window.WORKFLOW_GUIDES_ENABLED = false;
   Reset seen:   localStorage.removeItem('guide_seen_rich-media');
   ============================================================ */

(function () {
    'use strict';

    /* ── Global kill switch ───────────────────────────────────── */
    if (window.WORKFLOW_GUIDES_ENABLED === false) return;

    /* ── Guide data per workflow ──────────────────────────────── */
    const GUIDE_DATA = {
        'rich-media': {
            title: { en: 'Rich Media Workflow', fr: 'Flux Médias Riches', de: 'Rich-Media-Arbeitsablauf' },
            bullets: {
                en: [
                    { icon: '📷', text: 'Snap photos or record short videos of the work area' },
                    { icon: '🙈', text: 'Faces are auto-blurred to protect privacy' },
                    { icon: '🏷️', text: 'Tap each image to tag hazards & controls' },
                    { icon: '🤖', text: 'AI generates your full risk assessment table' }
                ],
                fr: [
                    { icon: '📷', text: 'Prenez des photos ou enregistrez des vidéos de la zone de travail' },
                    { icon: '🙈', text: 'Les visages sont automatiquement floutés' },
                    { icon: '🏷️', text: 'Appuyez sur chaque image pour identifier les dangers' },
                    { icon: '🤖', text: "L'IA génère votre tableau d'évaluation des risques" }
                ],
                de: [
                    { icon: '📷', text: 'Fotografieren oder filmen Sie den Arbeitsbereich' },
                    { icon: '🙈', text: 'Gesichter werden automatisch unkenntlich gemacht' },
                    { icon: '🏷️', text: 'Tippen Sie auf jedes Bild, um Gefahren zu markieren' },
                    { icon: '🤖', text: 'KI erstellt Ihre Risikobewertungstabelle' }
                ]
            },
            accentFrom: '#6366f1',
            accentTo: '#3b82f6',
            bgFrom: '#eef2ff',
            bgTo: '#dbeafe'
        },
        'excel-legacy': {
            title: { en: 'Legacy Excel → AI Processing', fr: 'Excel Hérité → Traitement IA', de: 'Legacy-Excel → KI-Verarbeitung' },
            bullets: {
                en: [
                    { icon: '📂', text: 'Upload any old or messy Excel workbook — no formatting required' },
                    { icon: '🤖', text: 'AI normalizes hazards, controls & ratings automatically' },
                    { icon: '🖼️', text: 'Extract or replace images embedded in older spreadsheets' },
                    { icon: '📤', text: 'Process one-by-one or batch before pushing to GOEHS' }
                ],
                fr: [
                    { icon: '📂', text: 'Téléchargez un ancien classeur Excel — aucun format requis' },
                    { icon: '🤖', text: "L'IA normalise dangers, contrôles et évaluations automatiquement" },
                    { icon: '🖼️', text: 'Extrayez ou remplacez les images intégrées dans vos anciens fichiers' },
                    { icon: '📤', text: 'Traitez un par un ou en lot avant de pousser vers GOEHS' }
                ],
                de: [
                    { icon: '📂', text: 'Laden Sie jede alte oder unstrukturierte Excel-Datei hoch' },
                    { icon: '🤖', text: 'KI normalisiert Gefahren, Kontrollen und Bewertungen automatisch' },
                    { icon: '🖼️', text: 'Bilder aus älteren Tabellen extrahieren oder ersetzen' },
                    { icon: '📤', text: 'Einzeln oder als Batch verarbeiten, dann zu GOEHS pushen' }
                ]
            },
            accentFrom: '#2563eb',
            accentTo: '#4f46e5',
            bgFrom: '#eff6ff',
            bgTo: '#eef2ff'
        },
        'excel-ra2025': {
            title: { en: 'RA 2025 Template → GOEHS Export', fr: 'Modèle RA 2025 → Export GOEHS', de: 'RA 2025 Vorlage → GOEHS-Export' },
            bullets: {
                en: [
                    { icon: '📋', text: 'Upload a single clean RA 2025 standard-format file' },
                    { icon: '🌐', text: 'Translate the table into multiple languages instantly' },
                    { icon: '🗂️', text: 'Manually map any unfamiliar column headers' },
                    { icon: '⚡', text: 'Export GOEHS-ready output with full flexibility & control' }
                ],
                fr: [
                    { icon: '📋', text: 'Téléchargez un seul fichier RA 2025 au format standard' },
                    { icon: '🌐', text: 'Traduisez le tableau dans plusieurs langues instantanément' },
                    { icon: '🗂️', text: 'Mappez manuellement les en-têtes de colonnes inconnues' },
                    { icon: '⚡', text: 'Exportez un fichier GOEHS avec flexibilité et contrôle complets' }
                ],
                de: [
                    { icon: '📋', text: 'Laden Sie eine einzelne RA 2025 Standarddatei hoch' },
                    { icon: '🌐', text: 'Tabelle sofort in mehrere Sprachen übersetzen' },
                    { icon: '🗂️', text: 'Unbekannte Spaltenköpfe manuell zuordnen' },
                    { icon: '⚡', text: 'GOEHS-fähigen Export mit voller Flexibilität erstellen' }
                ]
            },
            accentFrom: '#ea580c',
            accentTo: '#dc2626',
            bgFrom: '#fff7ed',
            bgTo: '#fef2f2'
        },
        'excel-batch': {
            title: { en: 'Batch RA 2025 → GOEHS ZIP', fr: 'Lot RA 2025 → ZIP GOEHS', de: 'Batch RA 2025 → GOEHS-ZIP' },
            bullets: {
                en: [
                    { icon: '📦', text: 'Upload up to 20 RA 2025 workbooks in one go' },
                    { icon: '🔍', text: 'Auto-detects dropdown mismatches across every file' },
                    { icon: '🛠️', text: 'Fix issues instantly — manually or with AI clean-up' },
                    { icon: '🗜️', text: 'One-click ZIP: GOEHS CSV, XLSX & JSON per file' }
                ],
                fr: [
                    { icon: '📦', text: 'Téléchargez jusqu\'à 20 classeurs RA 2025 en une fois' },
                    { icon: '🔍', text: 'Détection automatique des erreurs de liste déroulante dans chaque fichier' },
                    { icon: '🛠️', text: 'Corrigez les problèmes instantanément — manuellement ou avec l\'IA' },
                    { icon: '🗜️', text: 'ZIP en un clic : CSV GOEHS, XLSX et JSON par fichier' }
                ],
                de: [
                    { icon: '📦', text: 'Bis zu 20 RA 2025 Arbeitsmappen auf einmal hochladen' },
                    { icon: '🔍', text: 'Automatische Erkennung von Dropdown-Fehlern in jeder Datei' },
                    { icon: '🛠️', text: 'Probleme sofort beheben — manuell oder per KI' },
                    { icon: '🗜️', text: 'Ein-Klick-ZIP: GOEHS CSV, XLSX & JSON pro Datei' }
                ]
            },
            accentFrom: '#059669',
            accentTo: '#0d9488',
            bgFrom: '#ecfdf5',
            bgTo: '#f0fdfa'
        },
        'free-text': {
            title: { en: 'Free Text Workflow', fr: 'Flux Texte Libre', de: 'Freitext-Arbeitsablauf' },
            bullets: {
                en: [
                    { icon: '✍️', text: 'Describe the work task in your own words' },
                    { icon: '⚠️', text: 'Mention any past incidents for better scoring' },
                    { icon: '🔀', text: 'AI breaks it into steps, hazards & controls' },
                    { icon: '✅', text: 'Review and refine the generated table' }
                ],
                fr: [
                    { icon: '✍️', text: 'Décrivez la tâche de travail dans vos propres mots' },
                    { icon: '⚠️', text: 'Mentionnez les incidents passés pour un meilleur scoring' },
                    { icon: '🔀', text: "L'IA décompose en étapes, dangers et contrôles" },
                    { icon: '✅', text: 'Vérifiez et affinez le tableau généré' }
                ],
                de: [
                    { icon: '✍️', text: 'Beschreiben Sie die Arbeitsaufgabe in eigenen Worten' },
                    { icon: '⚠️', text: 'Erwähnen Sie frühere Vorfälle für bessere Bewertung' },
                    { icon: '🔀', text: 'KI zerlegt in Schritte, Gefahren und Kontrollen' },
                    { icon: '✅', text: 'Überprüfen und verfeinern Sie die erstellte Tabelle' }
                ]
            },
            accentFrom: '#8b5cf6',
            accentTo: '#6366f1',
            bgFrom: '#f5f3ff',
            bgTo: '#eef2ff'
        }
    };

    /* ── Inject CSS animations once ──────────────────────────── */
    function injectGuideStyles() {
        if (document.getElementById('workflow-guide-styles')) return;
        const style = document.createElement('style');
        style.id = 'workflow-guide-styles';
        style.textContent = `
            /* Overlay */
            .wg-overlay {
                position: fixed; inset: 0; z-index: 9999;
                display: flex; align-items: center; justify-content: center;
                background: rgba(15,23,42,0.55);
                backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
                opacity: 0; transition: opacity .3s ease;
                padding: 16px;
            }
            .wg-overlay.wg-visible { opacity: 1; }

            /* Card */
            .wg-card {
                background: #fff;
                border-radius: 22px;
                width: 92vw; max-width: 420px;
                padding: 32px 28px 24px;
                box-shadow: 0 30px 80px rgba(15,23,42,0.3);
                transform: translateY(30px) scale(0.96);
                transition: transform .4s cubic-bezier(.22,1,.36,1);
                overflow: hidden; position: relative;
            }
            .wg-overlay.wg-visible .wg-card {
                transform: translateY(0) scale(1);
            }

            /* SVG scene container */
            .wg-scene {
                display: flex; justify-content: center;
                margin-bottom: 20px;
            }
            .wg-scene svg { width: 220px; height: 180px; }

            /* Float animation for cartoon character */
            @keyframes wgFloat {
                0%, 100% { transform: translateY(0); }
                50%      { transform: translateY(-6px); }
            }
            .wg-float { animation: wgFloat 3s ease-in-out infinite; }

            /* Pulse for phone/notepad screen glow */
            @keyframes wgPulse {
                0%, 100% { opacity: .25; }
                50%      { opacity: .55; }
            }
            .wg-pulse { animation: wgPulse 2.5s ease-in-out infinite; }

            /* Staggered bullet fade-in */
            @keyframes wgFadeUp {
                from { opacity: 0; transform: translateY(14px); }
                to   { opacity: 1; transform: translateY(0); }
            }
            .wg-bullet {
                opacity: 0;
                animation: wgFadeUp .45s ease forwards;
                display: flex; align-items: flex-start; gap: 10px;
                font-size: 0.92rem; color: #334155;
                line-height: 1.45;
            }
            .wg-bullet:nth-child(1) { animation-delay: .15s; }
            .wg-bullet:nth-child(2) { animation-delay: .35s; }
            .wg-bullet:nth-child(3) { animation-delay: .55s; }
            .wg-bullet:nth-child(4) { animation-delay: .75s; }

            .wg-bullet-icon {
                flex-shrink: 0; font-size: 1.15rem; margin-top: 1px;
            }

            /* Title */
            .wg-title {
                text-align: center; font-weight: 700; font-size: 1.15rem;
                color: #0f172a; margin-bottom: 18px;
            }

            /* Dismiss row */
            .wg-footer {
                margin-top: 22px; display: flex; flex-direction: column;
                align-items: center; gap: 12px;
            }
            .wg-got-it {
                padding: 10px 40px; border: none; border-radius: 12px;
                font-size: 0.95rem; font-weight: 700; color: #fff;
                cursor: pointer; transition: transform .15s ease, box-shadow .15s ease;
                box-shadow: 0 4px 14px rgba(99,102,241,0.35);
            }
            .wg-got-it:hover {
                transform: translateY(-1px);
                box-shadow: 0 6px 20px rgba(99,102,241,0.45);
            }
            .wg-got-it:active { transform: translateY(0); }

            .wg-dismiss-label {
                font-size: 0.78rem; color: #94a3b8;
                display: flex; align-items: center; gap: 6px; cursor: pointer;
                user-select: none;
            }
            .wg-dismiss-label input { accent-color: #6366f1; cursor: pointer; }

            /* Learn more link */
            .wg-learn-more {
                font-size: 0.8rem; color: #6366f1; font-weight: 600;
                text-decoration: none; transition: opacity .15s;
                display: flex; align-items: center; gap: 4px;
            }
            .wg-learn-more:hover { opacity: 0.65; text-decoration: underline; }

            /* Close X */
            .wg-close {
                position: absolute; top: 12px; right: 14px;
                background: none; border: none; font-size: 1.5rem;
                color: #94a3b8; cursor: pointer; line-height: 1;
                transition: color .15s;
            }
            .wg-close:hover { color: #475569; }

            /* Floating particles */
            @keyframes wgDrift {
                0%   { transform: translate(0, 0) scale(1); opacity: .5; }
                50%  { opacity: .8; }
                100% { transform: translate(var(--dx), var(--dy)) scale(.6); opacity: 0; }
            }
            .wg-particle {
                position: absolute; border-radius: 50%; pointer-events: none;
                animation: wgDrift var(--dur) ease-in-out infinite;
            }
        `;
        document.head.appendChild(style);
    }

    /* ── SVG Cartoon Illustrations ───────────────────────────── */

    function createRichMediaSVG() {
        // Cartoon person holding a phone, capturing a factory process
        return `
        <svg viewBox="0 0 220 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Background circle -->
            <circle cx="110" cy="95" r="75" fill="#eef2ff" opacity="0.6"/>
            
            <!-- Factory silhouette in background -->
            <g opacity="0.15">
                <rect x="145" y="45" width="22" height="55" rx="2" fill="#6366f1"/>
                <rect x="155" y="30" width="8" height="15" rx="1" fill="#6366f1"/>
                <rect x="170" y="55" width="30" height="45" rx="2" fill="#6366f1"/>
                <rect x="175" y="65" width="6" height="8" rx="1" fill="#eef2ff"/>
                <rect x="185" y="65" width="6" height="8" rx="1" fill="#eef2ff"/>
                <rect x="175" y="78" width="6" height="8" rx="1" fill="#eef2ff"/>
                <rect x="185" y="78" width="6" height="8" rx="1" fill="#eef2ff"/>
            </g>
            
            <!-- Person body (cartoon style) -->
            <g class="wg-float">
                <!-- Legs -->
                <rect x="82" y="130" width="10" height="28" rx="5" fill="#64748b"/>
                <rect x="98" y="130" width="10" height="28" rx="5" fill="#64748b"/>
                <!-- Shoes -->
                <ellipse cx="87" cy="158" rx="8" ry="4" fill="#334155"/>
                <ellipse cx="103" cy="158" rx="8" ry="4" fill="#334155"/>
                
                <!-- Body / Torso (safety vest) -->
                <rect x="76" y="95" width="38" height="40" rx="8" fill="#fbbf24"/>
                <!-- Vest stripes -->
                <rect x="76" y="108" width="38" height="4" rx="2" fill="#f59e0b" opacity="0.6"/>
                <rect x="76" y="118" width="38" height="4" rx="2" fill="#f59e0b" opacity="0.6"/>
                
                <!-- Left arm (holding phone up) -->
                <rect x="55" y="80" width="10" height="32" rx="5" fill="#fcd9b6" transform="rotate(-25 60 96)"/>
                
                <!-- Right arm (supporting phone) -->
                <rect x="108" y="98" width="10" height="25" rx="5" fill="#fcd9b6" transform="rotate(15 113 110)"/>
                
                <!-- Phone -->
                <g transform="translate(42, 58) rotate(-8)">
                    <rect width="26" height="42" rx="4" fill="#1e293b"/>
                    <rect x="2" y="4" width="22" height="30" rx="2" fill="#93c5fd"/>
                    <!-- Camera viewfinder lines on screen -->
                    <line x1="6" y1="8" x2="12" y2="8" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
                    <line x1="6" y1="8" x2="6" y2="14" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
                    <line x1="14" y1="28" x2="20" y2="28" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
                    <line x1="20" y1="22" x2="20" y2="28" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
                    <!-- Record dot -->
                    <circle cx="20" cy="8" r="2.5" fill="#ef4444" class="wg-pulse"/>
                    <!-- Phone screen glow -->
                    <rect x="2" y="4" width="22" height="30" rx="2" fill="#6366f1" class="wg-pulse" opacity="0.15"/>
                </g>
                
                <!-- Head -->
                <circle cx="95" cy="78" r="18" fill="#fcd9b6"/>
                <!-- Hard hat -->
                <ellipse cx="95" cy="66" rx="20" ry="10" fill="#fbbf24"/>
                <rect x="75" y="64" width="40" height="6" rx="3" fill="#f59e0b"/>
                <!-- Eyes -->
                <circle cx="89" cy="78" r="2.5" fill="#1e293b"/>
                <circle cx="101" cy="78" r="2.5" fill="#1e293b"/>
                <!-- Smile -->
                <path d="M89 85 Q95 90 101 85" stroke="#1e293b" stroke-width="1.5" fill="none" stroke-linecap="round"/>
            </g>
            
            <!-- Floating hazard icons -->
            <g opacity="0.7">
                <!-- Warning triangle -->
                <g transform="translate(148, 108)" class="wg-float" style="animation-delay: 0.5s;">
                    <polygon points="10,2 18,16 2,16" fill="#fbbf24" stroke="#f59e0b" stroke-width="1"/>
                    <text x="10" y="14" font-size="8" text-anchor="middle" fill="#92400e" font-weight="bold">!</text>
                </g>
                <!-- Checkmark circle -->
                <g transform="translate(30, 120)" class="wg-float" style="animation-delay: 1s;">
                    <circle cx="10" cy="10" r="9" fill="#34d399" opacity="0.8"/>
                    <path d="M6 10 L9 13 L14 7" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                </g>
            </g>
        </svg>`;
    }

    function createFreeTextSVG() {
        // Cartoon person typing on a notepad with thought bubbles
        return `
        <svg viewBox="0 0 220 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Background circle -->
            <circle cx="110" cy="95" r="75" fill="#f5f3ff" opacity="0.6"/>
            
            <!-- Person body (cartoon style, seated) -->
            <g class="wg-float">
                <!-- Chair -->
                <rect x="70" y="135" width="50" height="6" rx="3" fill="#94a3b8"/>
                <rect x="72" y="141" width="4" height="18" rx="2" fill="#94a3b8"/>
                <rect x="114" y="141" width="4" height="18" rx="2" fill="#94a3b8"/>
                
                <!-- Legs (seated) -->
                <rect x="82" y="130" width="10" height="18" rx="5" fill="#64748b"/>
                <rect x="98" y="130" width="10" height="18" rx="5" fill="#64748b"/>
                
                <!-- Body -->
                <rect x="78" y="95" width="34" height="40" rx="8" fill="#818cf8"/>
                
                <!-- Left arm (typing) -->
                <rect x="62" y="105" width="20" height="8" rx="4" fill="#fcd9b6"/>
                <!-- Right arm (typing) -->
                <rect x="108" y="105" width="20" height="8" rx="4" fill="#fcd9b6"/>
                
                <!-- Desk -->
                <rect x="45" y="110" width="120" height="6" rx="3" fill="#cbd5e1"/>
                <rect x="50" y="116" width="4" height="25" rx="2" fill="#94a3b8"/>
                <rect x="156" y="116" width="4" height="25" rx="2" fill="#94a3b8"/>
                
                <!-- Laptop on desk -->
                <g transform="translate(65, 82)">
                    <!-- Screen -->
                    <rect x="5" y="0" width="56" height="30" rx="3" fill="#1e293b"/>
                    <rect x="8" y="3" width="50" height="24" rx="2" fill="#c7d2fe"/>
                    <!-- Text lines on screen -->
                    <rect x="12" y="8" width="30" height="2" rx="1" fill="#6366f1" opacity="0.6"/>
                    <rect x="12" y="13" width="40" height="2" rx="1" fill="#6366f1" opacity="0.4"/>
                    <rect x="12" y="18" width="25" height="2" rx="1" fill="#6366f1" opacity="0.6"/>
                    <rect x="12" y="23" width="35" height="2" rx="1" fill="#6366f1" opacity="0.3"/>
                    <!-- Typing cursor -->
                    <rect x="48" y="18" width="2" height="6" rx="1" fill="#6366f1" class="wg-pulse"/>
                    <!-- Screen glow -->
                    <rect x="8" y="3" width="50" height="24" rx="2" fill="#8b5cf6" class="wg-pulse" opacity="0.1"/>
                    <!-- Keyboard base -->
                    <rect x="0" y="30" width="66" height="4" rx="2" fill="#475569"/>
                </g>
                
                <!-- Head -->
                <circle cx="95" cy="75" r="18" fill="#fcd9b6"/>
                <!-- Hair -->
                <ellipse cx="95" cy="63" rx="16" ry="8" fill="#92400e"/>
                <ellipse cx="85" cy="67" rx="5" ry="6" fill="#92400e"/>
                <!-- Eyes (looking at screen) -->
                <circle cx="89" cy="75" r="2.5" fill="#1e293b"/>
                <circle cx="101" cy="75" r="2.5" fill="#1e293b"/>
                <!-- Concentrated mouth -->
                <rect x="91" y="82" width="8" height="2" rx="1" fill="#1e293b" opacity="0.6"/>
            </g>
            
            <!-- Thought bubbles materializing -->
            <g class="wg-float" style="animation-delay: 0.7s;" opacity="0.85">
                <!-- Bubble trail -->
                <circle cx="140" cy="72" r="3" fill="#c7d2fe"/>
                <circle cx="148" cy="62" r="4.5" fill="#c7d2fe"/>
                <!-- Main thought bubble -->
                <rect x="152" y="35" width="52" height="38" rx="12" fill="#fff" stroke="#c7d2fe" stroke-width="1.5"/>
                <!-- Hazard icons inside bubble -->
                <!-- Warning -->
                <polygon points="166,48 172,58 160,58" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.8"/>
                <text x="166" y="56" font-size="6" text-anchor="middle" fill="#92400e" font-weight="bold">!</text>
                <!-- Gear (controls) -->
                <circle cx="183" cy="52" r="6" fill="none" stroke="#6366f1" stroke-width="1.5"/>
                <circle cx="183" cy="52" r="2" fill="#6366f1"/>
                <!-- Arrow (steps) -->
                <path d="M190 48 L196 52 L190 56" stroke="#34d399" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </g>
            
            <!-- Small floating elements -->
            <g opacity="0.5">
                <circle cx="35" cy="50" r="4" fill="#c7d2fe" class="wg-float" style="animation-delay: 1.2s;"/>
                <circle cx="185" cy="130" r="3" fill="#ddd6fe" class="wg-float" style="animation-delay: 0.3s;"/>
            </g>
        </svg>`;
    }

    function createExcelLegacySVG() {
        // Messy pile of papers → AI robot tidies them into a clean stack
        return `
        <svg viewBox="0 0 220 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="110" cy="95" r="74" fill="#eff6ff" opacity="0.55"/>

            <!-- Messy pile (left) -->
            <g class="wg-float" style="animation-delay:0s;">
                <rect x="18" y="90" width="52" height="65" rx="4" fill="#bfdbfe" stroke="#93c5fd" stroke-width="1.5" transform="rotate(-12 44 122)"/>
                <rect x="22" y="85" width="52" height="65" rx="4" fill="#dbeafe" stroke="#93c5fd" stroke-width="1.5" transform="rotate(-5 48 117)"/>
                <rect x="26" y="80" width="52" height="65" rx="4" fill="#eff6ff" stroke="#93c5fd" stroke-width="1.5"/>
                <!-- Scribbles on top sheet -->
                <line x1="32" y1="95" x2="58" y2="95" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="4 2"/>
                <line x1="32" y1="103" x2="52" y2="103" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="3 3"/>
                <line x1="32" y1="111" x2="60" y2="111" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="5 2"/>
                <line x1="32" y1="119" x2="46" y2="119" stroke="#ef4444" stroke-width="1.5" stroke-linecap="round"/>
                <text x="34" y="135" font-size="8" fill="#94a3b8">?</text>
                <text x="44" y="133" font-size="7" fill="#f59e0b">!</text>
                <text x="55" y="136" font-size="8" fill="#94a3b8">?</text>
            </g>

            <!-- AI Robot center -->
            <g class="wg-float" style="animation-delay:0.4s;">
                <!-- Body -->
                <rect x="90" y="88" width="40" height="42" rx="8" fill="#3b82f6"/>
                <!-- Screen -->
                <rect x="95" y="93" width="30" height="22" rx="4" fill="#1e3a8a"/>
                <!-- Loading bars on screen -->
                <rect x="98" y="97" width="24" height="2.5" rx="1" fill="#60a5fa" class="wg-pulse"/>
                <rect x="98" y="102" width="18" height="2.5" rx="1" fill="#93c5fd" class="wg-pulse" style="animation-delay:.3s"/>
                <rect x="98" y="107" width="22" height="2.5" rx="1" fill="#60a5fa" class="wg-pulse" style="animation-delay:.6s"/>
                <!-- Antenna -->
                <line x1="110" y1="88" x2="110" y2="78" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round"/>
                <circle cx="110" cy="75" r="4" fill="#60a5fa" class="wg-pulse"/>
                <!-- Feet -->
                <rect x="94" y="130" width="10" height="8" rx="3" fill="#1d4ed8"/>
                <rect x="116" y="130" width="10" height="8" rx="3" fill="#1d4ed8"/>
                <!-- Arms (reaching) -->
                <rect x="74" y="98" width="16" height="7" rx="3" fill="#3b82f6"/>
                <rect x="130" y="98" width="16" height="7" rx="3" fill="#3b82f6"/>
            </g>

            <!-- Arrow (left to right) -->
            <g opacity="0.7" class="wg-float" style="animation-delay:.2s;">
                <path d="M82 112 L90 112" stroke="#6366f1" stroke-width="2" stroke-dasharray="3 2" stroke-linecap="round"/>
            </g>
            <g opacity="0.7" class="wg-float" style="animation-delay:.2s;">
                <path d="M130 112 L138 112" stroke="#6366f1" stroke-width="2" stroke-dasharray="3 2" stroke-linecap="round"/>
            </g>

            <!-- Clean stack (right) -->
            <g class="wg-float" style="animation-delay:0.6s;">
                <rect x="142" y="82" width="52" height="65" rx="4" fill="#c7d2fe" stroke="#818cf8" stroke-width="1.5" transform="rotate(4 168 114)"/>
                <rect x="144" y="80" width="52" height="65" rx="4" fill="#ddd6fe" stroke="#818cf8" stroke-width="1.5" transform="rotate(1 170 112)"/>
                <rect x="146" y="78" width="52" height="65" rx="4" fill="#f5f3ff" stroke="#818cf8" stroke-width="1.5"/>
                <!-- Clean lines -->
                <line x1="153" y1="92" x2="190" y2="92" stroke="#6366f1" stroke-width="1.5" stroke-linecap="round"/>
                <line x1="153" y1="100" x2="185" y2="100" stroke="#6366f1" stroke-width="1" stroke-linecap="round" opacity="0.6"/>
                <line x1="153" y1="108" x2="188" y2="108" stroke="#6366f1" stroke-width="1" stroke-linecap="round" opacity="0.6"/>
                <line x1="153" y1="116" x2="180" y2="116" stroke="#6366f1" stroke-width="1" stroke-linecap="round" opacity="0.6"/>
                <!-- Checkmark -->
                <circle cx="183" cy="128" r="9" fill="#6366f1"/>
                <path d="M179 128 L182 131 L188 124" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </g>
        </svg>`;
    }

    function createExcelRA2025SVG() {
        // Single clean document flying to a GOEHS export target / dashboard
        return `
        <svg viewBox="0 0 220 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="110" cy="95" r="74" fill="#fff7ed" opacity="0.55"/>

            <!-- Single clean document (left) -->
            <g class="wg-float" style="animation-delay:0s;">
                <rect x="20" y="60" width="58" height="76" rx="6" fill="#fff" stroke="#fdba74" stroke-width="2"/>
                <!-- Document fold corner -->
                <path d="M62 60 L78 76 L62 76 Z" fill="#fed7aa" stroke="#fdba74" stroke-width="1"/>
                <!-- Header bar -->
                <rect x="20" y="60" width="58" height="12" rx="6" fill="#ea580c"/>
                <rect x="20" y="68" width="58" height="4" fill="#ea580c"/>
                <text x="27" y="70" font-size="6" fill="#fff" font-weight="bold">RA 2025</text>
                <!-- Rows -->
                <rect x="26" y="80" width="36" height="2.5" rx="1" fill="#fdba74"/>
                <rect x="26" y="86" width="28" height="2.5" rx="1" fill="#fed7aa"/>
                <rect x="26" y="92" width="34" height="2.5" rx="1" fill="#fdba74"/>
                <rect x="26" y="98" width="22" height="2.5" rx="1" fill="#fed7aa"/>
                <rect x="26" y="104" width="32" height="2.5" rx="1" fill="#fdba74"/>
                <rect x="26" y="110" width="26" height="2.5" rx="1" fill="#fed7aa"/>
                <!-- GOEHS badge -->
                <rect x="24" y="118" width="30" height="10" rx="3" fill="#ea580c" opacity="0.15"/>
                <text x="30" y="126" font-size="7" fill="#ea580c" font-weight="bold">GOEHS</text>
            </g>

            <!-- Flying arrow / trajectory -->
            <g class="wg-float" style="animation-delay:.3s;" opacity="0.8">
                <path d="M82 98 Q110 68 138 98" stroke="#f97316" stroke-width="2.5" stroke-dasharray="5 3" fill="none" stroke-linecap="round"/>
                <!-- Arrowhead -->
                <polygon points="135,93 142,100 128,100" fill="#f97316"/>
            </g>

            <!-- Globe / Language icon (translation flourish) -->
            <g class="wg-float" style="animation-delay:.6s;" transform="translate(98,48)">
                <circle cx="12" cy="12" r="11" fill="#fff7ed" stroke="#fdba74" stroke-width="1.5"/>
                <ellipse cx="12" cy="12" rx="5.5" ry="11" stroke="#fdba74" stroke-width="1" fill="none"/>
                <line x1="1" y1="12" x2="23" y2="12" stroke="#fdba74" stroke-width="1"/>
                <line x1="3" y1="7" x2="21" y2="7" stroke="#fdba74" stroke-width="0.8"/>
                <line x1="3" y1="17" x2="21" y2="17" stroke="#fdba74" stroke-width="0.8"/>
                <text x="8" y="15" font-size="7" fill="#ea580c">🌐</text>
            </g>

            <!-- GOEHS Export Target (right) -->
            <g class="wg-float" style="animation-delay:0.5s;">
                <!-- Monitor frame -->
                <rect x="140" y="62" width="62" height="46" rx="6" fill="#1e293b"/>
                <rect x="143" y="65" width="56" height="36" rx="3" fill="#0f172a"/>
                <!-- Dashboard bars inside -->
                <rect x="148" y="88" width="8" height="9" rx="1" fill="#f97316" opacity="0.9"/>
                <rect x="159" y="82" width="8" height="15" rx="1" fill="#ea580c" opacity="0.9"/>
                <rect x="170" y="78" width="8" height="19" rx="1" fill="#fb923c" opacity="0.9"/>
                <rect x="181" y="85" width="8" height="12" rx="1" fill="#f97316" opacity="0.9"/>
                <!-- Screen glow -->
                <rect x="143" y="65" width="56" height="36" rx="3" fill="#f97316" class="wg-pulse" opacity="0.05"/>
                <!-- Stand -->
                <rect x="163" y="108" width="16" height="5" rx="2" fill="#334155"/>
                <rect x="158" y="113" width="26" height="4" rx="2" fill="#475569"/>
                <!-- GOEHS label -->
                <text x="153" y="76" font-size="6.5" fill="#f97316" font-weight="bold">GOEHS</text>
                <!-- Check badge -->
                <circle cx="195" cy="65" r="9" fill="#ea580c"/>
                <path d="M191 65 L194 68 L200 61" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </g>
        </svg>`;
    }

    function createExcelBatchSVG() {
        // Stack of multiple files being bundled into a ZIP
        return `
        <svg viewBox="0 0 220 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="110" cy="95" r="74" fill="#ecfdf5" opacity="0.55"/>

            <!-- Incoming file stack (left) -->
            <g class="wg-float" style="animation-delay:0s;">
                <rect x="12" y="96" width="44" height="54" rx="4" fill="#a7f3d0" stroke="#34d399" stroke-width="1.5" transform="rotate(-8 34 123)"/>
                <rect x="16" y="90" width="44" height="54" rx="4" fill="#bbf7d0" stroke="#34d399" stroke-width="1.5" transform="rotate(-3 38 118)"/>
                <rect x="20" y="84" width="44" height="54" rx="4" fill="#d1fae5" stroke="#34d399" stroke-width="1.5" transform="rotate(2 42 111)"/>
                <rect x="24" y="78" width="44" height="54" rx="4" fill="#ecfdf5" stroke="#34d399" stroke-width="1.5"/>
                <!-- Lines -->
                <line x1="30" y1="91" x2="60" y2="91" stroke="#059669" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
                <line x1="30" y1="97" x2="56" y2="97" stroke="#059669" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>
                <line x1="30" y1="103" x2="58" y2="103" stroke="#059669" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
                <!-- File count badge -->
                <circle cx="60" cy="78" r="10" fill="#059669"/>
                <text x="60" y="82" font-size="9" text-anchor="middle" fill="#fff" font-weight="bold">20</text>
            </g>

            <!-- Converging arrows -->
            <g opacity="0.75" class="wg-float" style="animation-delay:.2s;">
                <path d="M72 100 Q88 100 94 110" stroke="#059669" stroke-width="2" stroke-linecap="round" fill="none"/>
                <path d="M72 118 Q88 116 94 114" stroke="#10b981" stroke-width="2" stroke-linecap="round" fill="none"/>
                <path d="M72 130 Q88 126 94 118" stroke="#059669" stroke-width="1.5" stroke-linecap="round" fill="none" stroke-dasharray="3 2"/>
            </g>

            <!-- Funnel / zip machine -->
            <g class="wg-float" style="animation-delay:.4s;">
                <polygon points="94,106 126,106 120,126 100,126" fill="#059669" opacity="0.9"/>
                <rect x="104" y="126" width="12" height="8" rx="2" fill="#047857"/>
                <!-- Zip icon on funnel -->
                <text x="106" y="120" font-size="10" fill="#fff" font-weight="bold">⚡</text>
            </g>

            <!-- ZIP output (right) -->
            <g class="wg-float" style="animation-delay:0.6s;">
                <!-- Box -->
                <rect x="138" y="72" width="64" height="70" rx="8" fill="#fff" stroke="#34d399" stroke-width="2"/>
                <!-- Lid -->
                <rect x="138" y="72" width="64" height="18" rx="8" fill="#059669"/>
                <rect x="138" y="82" width="64" height="8" fill="#059669"/>
                <!-- Zip seal -->
                <rect x="160" y="68" width="20" height="10" rx="3" fill="#d1fae5" stroke="#34d399" stroke-width="1.5"/>
                <text x="163" y="76" font-size="7" fill="#059669" font-weight="bold">ZIP</text>
                <!-- Contents label lines -->
                <rect x="148" y="98" width="20" height="3" rx="1" fill="#6ee7b7"/>
                <text x="150" y="107" font-size="6" fill="#047857">CSV</text>
                <rect x="148" y="108" width="20" height="3" rx="1" fill="#a7f3d0"/>
                <text x="150" y="117" font-size="6" fill="#047857">XLSX</text>
                <rect x="148" y="118" width="20" height="3" rx="1" fill="#6ee7b7"/>
                <text x="150" y="127" font-size="6" fill="#047857">JSON</text>
                <!-- Per-file stack lines (right of box) -->
                <rect x="175" y="98" width="16" height="3" rx="1" fill="#34d399" opacity="0.7"/>
                <rect x="175" y="104" width="16" height="3" rx="1" fill="#34d399" opacity="0.5"/>
                <rect x="175" y="110" width="16" height="3" rx="1" fill="#34d399" opacity="0.7"/>
                <rect x="175" y="116" width="16" height="3" rx="1" fill="#34d399" opacity="0.4"/>
                <rect x="175" y="122" width="16" height="3" rx="1" fill="#34d399" opacity="0.7"/>
                <!-- Bottom check -->
                <circle cx="172" cy="136" r="8" fill="#059669"/>
                <path d="M168 136 L171 139 L177 133" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </g>
        </svg>`;
    }

    const SVG_CREATORS = {
        'rich-media': createRichMediaSVG,
        'free-text': createFreeTextSVG,
        'excel-legacy': createExcelLegacySVG,
        'excel-ra2025': createExcelRA2025SVG,
        'excel-batch': createExcelBatchSVG
    };

    /* ── Get current language ────────────────────────────────── */
    function getLang() {
        const sel = document.getElementById('langSelect');
        const lang = sel ? sel.value : 'en';
        return ['en', 'fr', 'de'].includes(lang) ? lang : 'en';
    }

    /* ── Build & show the modal ──────────────────────────────── */
    function showWorkflowGuide(workflowId) {
        if (window.WORKFLOW_GUIDES_ENABLED === false) return;
        const data = GUIDE_DATA[workflowId];
        if (!data) return;

        // Remove any existing overlay
        const existing = document.getElementById('wg-overlay');
        if (existing) existing.remove();

        injectGuideStyles();

        const lang = getLang();
        const bullets = data.bullets[lang] || data.bullets.en;
        const title = data.title[lang] || data.title.en;

        // Build overlay
        const overlay = document.createElement('div');
        overlay.id = 'wg-overlay';
        overlay.className = 'wg-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', title);

        // Decorative particles
        const particles = [
            { size: 6, x: '12%', y: '18%', dx: '20px',  dy: '-30px', dur: '4s',   color: data.accentFrom + '40' },
            { size: 8, x: '82%', y: '75%', dx: '-25px', dy: '-20px', dur: '5s',   color: data.accentTo + '30' },
            { size: 5, x: '75%', y: '20%', dx: '15px',  dy: '25px',  dur: '4.5s', color: data.accentFrom + '35' },
        ];

        let particlesHTML = particles.map(p =>
            `<div class="wg-particle" style="width:${p.size}px;height:${p.size}px;left:${p.x};top:${p.y};background:${p.color};--dx:${p.dx};--dy:${p.dy};--dur:${p.dur};"></div>`
        ).join('');

        let bulletsHTML = bullets.map(b =>
            `<div class="wg-bullet">
                <span class="wg-bullet-icon">${b.icon}</span>
                <span>${b.text}</span>
            </div>`
        ).join('');

        overlay.innerHTML = `
            ${particlesHTML}
            <div class="wg-card">
                <button class="wg-close" aria-label="Close">&times;</button>
                <div class="wg-scene">${(SVG_CREATORS[workflowId] || (() => ''))()}</div>
                <div class="wg-title">${title}</div>
                <div style="display:flex;flex-direction:column;gap:10px;">
                    ${bulletsHTML}
                </div>
                <div class="wg-footer">
                    <button class="wg-got-it" style="background:linear-gradient(135deg,${data.accentFrom},${data.accentTo});">
                        ${{ en: 'Got it!', fr: "J'ai compris !", de: 'Verstanden!' }[lang] || 'Got it!'}
                    </button>
                    <a class="wg-learn-more" href="#">
                        <span>📖</span>
                        ${{ en: 'Learn more about all workflows', fr: 'En savoir plus sur tous les flux', de: 'Mehr erfahren' }[lang] || 'Learn more about all workflows'}
                    </a>
                    <label class="wg-dismiss-label">
                        <input type="checkbox" class="wg-dismiss-check"/>
                        ${{ en: "Don't show this again", fr: 'Ne plus afficher', de: 'Nicht mehr anzeigen' }[lang] || "Don't show this again"}
                    </label>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Trigger enter animation on next frame
        requestAnimationFrame(() => {
            requestAnimationFrame(() => overlay.classList.add('wg-visible'));
        });

        // Close handlers
        const close = () => {
            const check = overlay.querySelector('.wg-dismiss-check');
            if (check && check.checked) {
                try { localStorage.setItem('guide_seen_' + workflowId, '1'); } catch (_) {}
            }
            overlay.classList.remove('wg-visible');
            setTimeout(() => overlay.remove(), 350);
        };

        overlay.querySelector('.wg-close').addEventListener('click', close);
        overlay.querySelector('.wg-got-it').addEventListener('click', close);
        overlay.querySelector('.wg-learn-more').addEventListener('click', (e) => {
            e.preventDefault();
            close();
            // Map guide IDs to how-to-guide.js tab IDs
            const tabMap = {
                'rich-media':   'rich-media',
                'free-text':    'free-text',
                'excel-legacy': 'excel',
                'excel-ra2025': 'excel',
                'excel-batch':  'excel',
            };
            const targetTab = tabMap[workflowId] || 'rich-media';
            setTimeout(() => { if (window.showHowToUseModal) window.showHowToUseModal(targetTab); }, 360);
        });
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

        // Escape key
        const onKey = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } };
        document.addEventListener('keydown', onKey);
    }

    /* ── Expose globally ─────────────────────────────────────── */
    window.showWorkflowGuide = showWorkflowGuide;

})();
