/**
 * fra-components.js — Fire Risk Assessment: React UI Components
 * 
 * Zone content components: Photos, Description+Voice, AI Nudging,
 * Checklist (fire triangle + controls), Results, Toolbar.
 * Uses React 18 + htm (no build step required).
 */
(function () {
    'use strict';

    window.FRA = window.FRA || {};
    const { createElement: h, useState, useEffect, useRef, useCallback, Fragment } = React;
    const html = htm.bind(h);
    const D = () => window.FRA.data;
    const AI = () => window.FRA.ai;

    // ═══════════════════════════════════════════════════════════════
    // SHARED HELPERS
    // ═══════════════════════════════════════════════════════════════

    function VoiceButton({ onText, className }) {
        const [recording, setRecording] = useState(false);
        const toggle = useCallback(() => {
            const ai = AI();
            if (recording) { ai.stopVoice(); setRecording(false); }
            else {
                const started = ai.toggleVoice((text) => { onText(text); });
                setRecording(started);
            }
        }, [recording, onText]);

        // Stop on unmount
        useEffect(() => { return () => { if (recording) AI().stopVoice(); }; }, []);

        return html`<button type="button"
            onClick=${toggle}
            className=${(className || '') + ' w-9 h-9 rounded-full flex items-center justify-center transition text-lg ' +
                (recording ? 'bg-red-100 fra-voice-recording' : 'bg-slate-100 hover:bg-slate-200')}
            title=${recording ? 'Stop recording' : 'Voice input'}>
            ${recording ? '🔴' : '🎤'}
        </button>`;
    }

    function Spinner() {
        return html`<svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>`;
    }

    // ═══════════════════════════════════════════════════════════════
    // SECTION 1: ZONE PHOTOS
    // ═══════════════════════════════════════════════════════════════

    function ZonePhotos({ zone, onChange }) {
        const fileRef = useRef(null);
        const cameraRef = useRef(null);

        const handleUpload = useCallback((files) => {
            if (!files || files.length === 0) return;
            const maxSize = 800;
            let processed = 0;
            const total = files.length;
            const newPhotos = [...(zone.photos || [])];
            Array.from(files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        let w = img.width, hh = img.height;
                        if (w > maxSize || hh > maxSize) {
                            const ratio = Math.min(maxSize / w, maxSize / hh);
                            w = Math.round(w * ratio);
                            hh = Math.round(hh * ratio);
                        }
                        const cvs = document.createElement('canvas');
                        cvs.width = w; cvs.height = hh;
                        cvs.getContext('2d').drawImage(img, 0, 0, w, hh);
                        newPhotos.push({ data: cvs.toDataURL('image/jpeg', 0.85), caption: '' });
                        processed++;
                        if (processed === total) onChange({ ...zone, photos: newPhotos });
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            });
        }, [zone, onChange]);

        const deletePhoto = useCallback((idx) => {
            const photos = [...zone.photos];
            photos.splice(idx, 1);
            onChange({ ...zone, photos });
        }, [zone, onChange]);

        const updateCaption = useCallback((idx, caption) => {
            const photos = [...zone.photos];
            photos[idx] = { ...photos[idx], caption };
            onChange({ ...zone, photos });
        }, [zone, onChange]);

        return html`
        <div className="fra-card theme-slate fra-fade-in">
            <div className="fra-card-header">
                <span className="fra-step-indicator fra-step-active mr-2">1</span>
                📸 Area Photos
            </div>
            <div className="fra-card-body">
                <p className="text-sm text-slate-500 mb-3">Upload or capture photos of this zone to document conditions, hazards, and existing controls.</p>
                <div className="flex gap-2 flex-wrap mb-4">
                    <input ref=${fileRef} type="file" accept="image/*" multiple className="hidden"
                        onChange=${(e) => handleUpload(e.target.files)} />
                    <button type="button" onClick=${() => fileRef.current.click()}
                        className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50 transition">
                        📁 Upload Photos
                    </button>
                    <input ref=${cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
                        onChange=${(e) => handleUpload(e.target.files)} />
                    <button type="button" onClick=${() => cameraRef.current.click()}
                        className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50 transition">
                        📷 Camera
                    </button>
                </div>
                ${(zone.photos && zone.photos.length > 0)
                    ? html`<div className="fra-photo-grid">
                        ${zone.photos.map((p, i) => html`
                            <div key=${i} className="fra-photo-item">
                                <img src=${p.data} alt=${p.caption || 'Photo ' + (i + 1)} />
                                <input type="text" value=${p.caption || ''} placeholder="Caption..."
                                    className="w-full p-1 text-xs border-t border-slate-200"
                                    onInput=${(e) => updateCaption(i, e.target.value)} />
                                <button type="button" className="fra-photo-delete" onClick=${() => deletePhoto(i)}>×</button>
                            </div>
                        `)}
                    </div>`
                    : html`<p className="text-sm text-slate-400 italic">No photos yet. Upload or capture zone images.</p>`
                }
            </div>
        </div>`;
    }

    // ═══════════════════════════════════════════════════════════════
    // SECTION 2: ZONE DESCRIPTION + VOICE
    // ═══════════════════════════════════════════════════════════════

    function ZoneDescription({ zone, onChange, onAnalyze }) {
        const [analyzing, setAnalyzing] = useState(false);
        const [showNudge, setShowNudge] = useState(false);
        const [missingItems, setMissingItems] = useState([]);
        const [nudgeAnswers, setNudgeAnswers] = useState({});

        const handleDescChange = useCallback((val) => {
            onChange({ ...zone, description: val });
        }, [zone, onChange]);

        const appendVoice = useCallback((text) => {
            const newDesc = (zone.description || '') + (zone.description ? ' ' : '') + text;
            onChange({ ...zone, description: newDesc });
        }, [zone, onChange]);

        // AI Analyze click — first check for missing info
        const handleAnalyzeClick = useCallback(async () => {
            const fullText = (zone.description || '').trim();
            if (!fullText) {
                if (typeof window.showCustomAlert === 'function')
                    window.showCustomAlert('Please describe the zone first.', 'info');
                return;
            }

            const missing = AI().detectMissingInfo(fullText);
            if (missing.length > 0 && !showNudge) {
                setMissingItems(missing);
                setShowNudge(true);
                return;
            }

            // Combine description + nudge answers for AI
            let combinedText = fullText;
            for (const [key, ans] of Object.entries(nudgeAnswers)) {
                if (ans && ans.trim()) combinedText += '\n' + ans.trim();
            }

            setAnalyzing(true);
            try {
                await AI().aiAnalyzeZone(combinedText, zone);
                zone.description = combinedText;
                if (typeof window.showCustomAlert === 'function')
                    window.showCustomAlert('AI analysis complete! Review the checklist below — items marked 🤖 were set by AI.', 'success');
                setShowNudge(false);
                onAnalyze(); // triggers parent re-render
            } catch (err) {
                console.error('FRA AI error:', err);
                if (typeof window.showCustomAlert === 'function')
                    window.showCustomAlert('AI analysis failed: ' + err.message, 'error');
            } finally {
                setAnalyzing(false);
            }
        }, [zone, onChange, onAnalyze, showNudge, nudgeAnswers]);

        const updateNudge = useCallback((key, val) => {
            setNudgeAnswers(prev => ({ ...prev, [key]: val }));
        }, []);

        return html`
        <div className="fra-card theme-indigo fra-fade-in">
            <div className="fra-card-header">
                <span className="fra-step-indicator ${zone.description ? 'fra-step-complete' : 'fra-step-active'} mr-2">2</span>
                📝 Describe This Area
            </div>
            <div className="fra-card-body">
                <div className="fra-hint-banner mb-4">
                    <strong>💡 Describe the zone comprehensively.</strong> Include details about:<br/>
                    • <strong>Building type & use</strong> (manufacturing, storage, office, etc.)<br/>
                    • <strong>Number of occupants</strong> per shift<br/>
                    • <strong>Area size</strong> (square meters/feet)<br/>
                    • <strong>Ignition sources</strong> (welding, electrical panels, hot processes, sparks)<br/>
                    • <strong>Combustible materials</strong> (rubber, solvents, dust, oils, wood)<br/>
                    • <strong>Ventilation type</strong> (forced air, natural, enclosed, dust extraction)<br/>
                    • <strong>Existing fire controls</strong> (sprinklers, extinguishers, alarms, fire doors)
                </div>
                <div className="relative">
                    <textarea
                        className="w-full p-3 pr-12 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm min-h-[120px]"
                        rows="5"
                        placeholder='Example: "This is a rubber mixing area on the ground floor of Building 4. There are Banbury mixers, carbon black storage bins, hydraulic presses, and conveyor systems. The area has forced ventilation, wet-pipe sprinklers, and smoke detectors. About 15 workers per shift in a 500m² space."'
                        value=${zone.description || ''}
                        onInput=${(e) => handleDescChange(e.target.value)}
                    />
                    <div className="absolute top-2 right-2">
                        <${VoiceButton} onText=${appendVoice} />
                    </div>
                </div>

                ${showNudge && html`
                <div className="fra-nudge-panel mt-4 fra-fade-in">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl">💬</span>
                        <div>
                            <div className="font-bold text-amber-900 text-sm">I noticed some details are missing</div>
                            <div className="text-xs text-amber-700">Please fill in what you can — this helps AI provide better analysis.</div>
                        </div>
                    </div>
                    ${missingItems.map(item => html`
                        <div key=${item.key} className="fra-nudge-question">
                            <label>${item.label}</label>
                            <div className="flex gap-2">
                                <input type="text" placeholder=${item.question}
                                    value=${nudgeAnswers[item.key] || ''}
                                    onInput=${(e) => updateNudge(item.key, e.target.value)} />
                                <${VoiceButton} onText=${(t) => updateNudge(item.key, (nudgeAnswers[item.key] || '') + ' ' + t)} />
                            </div>
                        </div>
                    `)}
                    <button type="button" onClick=${handleAnalyzeClick} disabled=${analyzing}
                        className="mt-3 w-full bg-amber-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-amber-600 transition flex items-center justify-center gap-2 disabled:opacity-50">
                        ${analyzing ? html`<${Spinner}/> Analyzing...` : '🤖 Proceed with AI Analysis'}
                    </button>
                </div>`}

                ${!showNudge && html`
                <button type="button" onClick=${handleAnalyzeClick} disabled=${analyzing}
                    className="mt-3 w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50">
                    ${analyzing ? html`<${Spinner}/> Analyzing...` : '🤖 Analyze with AI'}
                </button>`}
            </div>
        </div>`;
    }

    // ═══════════════════════════════════════════════════════════════
    // SECTION 3: FIRE TRIANGLE CHECKLIST
    // ═══════════════════════════════════════════════════════════════

    function MultiSelect({ title, tooltip, registry, selectedKeys, aiItems, prefix, onChange, formatLabel }) {
        const [open, setOpen] = useState(true);

        const toggle = useCallback((key) => {
            const newKeys = selectedKeys.includes(key)
                ? selectedKeys.filter(k => k !== key)
                : [...selectedKeys, key];
            onChange(newKeys);
        }, [selectedKeys, onChange]);

        return html`
        <div className="fra-checklist-section">
            <div className="fra-checklist-header" onClick=${() => setOpen(!open)}>
                <span className="flex-1${tooltip ? ' cursor-help' : ''}" title=${tooltip || undefined}>${title}</span>
                <span className="text-xs px-2 py-0.5 rounded-full ${selectedKeys.length > 0 ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}">
                    ${selectedKeys.length}/${Object.keys(registry).length}
                </span>
                <span className="ml-2 text-slate-400">${open ? '▾' : '▸'}</span>
            </div>
            ${open && html`
            <div className="fra-checklist-body">
                ${Object.keys(registry).map(key => {
                    const isAI = aiItems && aiItems[prefix + ':' + key];
                    return html`
                    <label key=${key} className="fra-checklist-item">
                        <input type="checkbox" checked=${selectedKeys.includes(key)}
                            onChange=${() => toggle(key)}
                            className="mt-0.5 h-4 w-4 text-orange-600 rounded focus:ring-orange-500 flex-shrink-0" />
                        <span className="leading-tight">
                            ${isAI ? html`<span className="fra-ai-badge">AI</span> ` : ''}
                            ${formatLabel ? formatLabel(key) : key}
                        </span>
                    </label>`;
                })}
            </div>`}
        </div>`;
    }

    // ═══════════════════════════════════════════════════════════════
    // FIRE TRIANGLE — dedicated React component
    // Uses Web Animations API (WAAPI) in useEffect for bullet-proof
    // animation of all three edges, including the fuel baseline.
    // No CSS classes used for animation — all imperative DOM calls.
    // ═══════════════════════════════════════════════════════════════

    // Inject flame-pulse CSS once at load time (not via React class binding)
    (function () {
        if (document.getElementById('fra-flame-css')) return;
        const s = document.createElement('style');
        s.id = 'fra-flame-css';
        s.textContent = '@keyframes fra-flame{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.82;transform:scale(1.1)}}.fra-flame{animation:fra-flame 2s ease-in-out 2.5s infinite;transform-origin:210px 195px;}' +
            '@keyframes fra-pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.5)}}' +
            '@keyframes fra-badge-pulse{0%,100%{opacity:.18;transform:scale(1)}50%{opacity:.45;transform:scale(1.14)}}' +
            '@keyframes fra-badge-flame{0%,100%{transform:scale(1) translateY(0px);opacity:1}50%{transform:scale(1.18) translateY(-4px);opacity:.88}}';
        document.head.appendChild(s);
    })();

    // ═══════════════════════════════════════════════════════════════
    // FLOATING MINI TRIANGLE — appears when main triangle scrolls out
    // ═══════════════════════════════════════════════════════════════

    function FloatingMiniTriangle({ visible, heatRating, fuelRating, oxygenRating, hC, fC, oC, showFlame, onClickScroll }) {
        const elRef = useRef(null);
        const prevVisible = useRef(false);

        useEffect(() => {
            const el = elRef.current;
            if (!el) return;
            if (visible && !prevVisible.current) {
                // Slide in from right
                el.style.display = 'flex';
                el.animate(
                    [{ transform: 'translateX(120%)', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }],
                    { duration: 350, easing: 'cubic-bezier(0.34,1.56,0.64,1)', fill: 'forwards' }
                );
            } else if (!visible && prevVisible.current) {
                // Slide out to right
                const a = el.animate(
                    [{ transform: 'translateX(0)', opacity: 1 }, { transform: 'translateX(120%)', opacity: 0 }],
                    { duration: 280, easing: 'ease-in', fill: 'forwards' }
                );
                a.onfinish = () => { if (elRef.current) elRef.current.style.display = 'none'; };
            } else if (!visible) {
                el.style.display = 'none';
            }
            prevVisible.current = visible;
        }, [visible]);

        const sw = (r) => Math.max(r * 0.3 + 1, 1.5);

        return html`
        <div ref=${elRef}
            onClick=${onClickScroll}
            style=${{
                position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
                display: 'none', flexDirection: 'column', alignItems: 'center',
                background: 'white', borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1)',
                padding: '12px 16px 8px', cursor: 'pointer',
                border: '2px solid #e2e8f0',
                userSelect: 'none', backdropFilter: 'blur(8px)',
            }}
            title="Click to scroll back to Fire Triangle">
            <svg viewBox="0 0 120 115" width="110" xmlns="http://www.w3.org/2000/svg">
                <!-- Mini triangle -->
                <polygon points="60,8 12,88 108,88" fill=${showFlame ? '#fef2f2' : '#f8fafc'}
                    stroke="#e2e8f0" strokeWidth="1" opacity="0.5"/>
                <path d="M60,8 L12,88" stroke=${hC} strokeWidth=${sw(heatRating)} strokeLinecap="round" fill="none"/>
                <path d="M12,88 L108,88" stroke=${fC} strokeWidth=${sw(fuelRating)} strokeLinecap="round" fill="none"/>
                <path d="M108,88 L60,8" stroke=${oC} strokeWidth=${sw(oxygenRating)} strokeLinecap="round" fill="none"/>
                <!-- Nodes -->
                <circle cx="60" cy="8"  r="3.5" fill=${hC} stroke="white" strokeWidth="1.5"/>
                <circle cx="12" cy="88" r="3.5" fill=${fC} stroke="white" strokeWidth="1.5"/>
                <circle cx="108" cy="88" r="3.5" fill=${oC} stroke="white" strokeWidth="1.5"/>
                <!-- Center -->
                ${showFlame
                    ? html`<text x="60" y="56" fontSize="18" textAnchor="middle" dominantBaseline="middle">🔥</text>`
                    : html`<text x="60" y="56" fontSize="16" textAnchor="middle" dominantBaseline="middle" fill="#cbd5e1">△</text>`}
            </svg>
            <!-- Rating bar -->
            <div style=${{ display: 'flex', gap: '6px', marginTop: '4px', fontSize: '11px', fontWeight: 800, fontFamily: 'monospace' }}>
                <span style=${{ color: hC }}>H:${heatRating}</span>
                <span style=${{ color: fC }}>F:${fuelRating}</span>
                <span style=${{ color: oC }}>O:${oxygenRating}</span>
            </div>
            <div style=${{ fontSize: '9px', color: '#94a3b8', marginTop: '2px', letterSpacing: '0.5px' }}>▲ SCROLL UP</div>
        </div>`;
    }

    function FireTriangle({ heatRating, fuelRating, oxygenRating, hC, fC, oC, showFlame }) {
        const svgRef = useRef(null);

        useEffect(() => {
            const svg = svgRef.current;
            if (!svg) return;
            const anims = [];

            // ── Triangle fill fades in
            const fill = svg.querySelector('[data-tri-fill]');
            if (fill) {
                fill.style.opacity = '0';
                anims.push(fill.animate(
                    [{ opacity: 0 }, { opacity: 1 }],
                    { duration: 600, delay: 200, fill: 'forwards' }
                ));
            }

            // ── Edges draw on using getTotalLength() for exact dash values
            [
                { sel: '[data-edge="h"]', delay: 0 },
                { sel: '[data-edge="f"]', delay: 500 },
                { sel: '[data-edge="o"]', delay: 1000 },
            ].forEach(({ sel, delay }) => {
                const el = svg.querySelector(sel);
                if (!el) return;
                const len = el.getTotalLength();
                // Must set as CSS style (not SVG attribute) for WAAPI to work
                el.style.strokeDasharray = `${len}`;
                el.style.strokeDashoffset = `${len}`;
                el.style.opacity = '0';
                anims.push(el.animate(
                    [
                        { strokeDashoffset: `${len}`, opacity: 0 },
                        { strokeDashoffset: `${len * 0.85}`, opacity: 1, offset: 0.12 },
                        { strokeDashoffset: '0', opacity: 1 },
                    ],
                    { duration: 950, delay, fill: 'forwards', easing: 'cubic-bezier(0.4,0,0.2,1)' }
                ));
            });

            // ── Vertex nodes pop in (fade + radius bounce)
            [
                { sel: '[data-node="h"]', delay: 900 },
                { sel: '[data-node="f"]', delay: 1400 },
                { sel: '[data-node="o"]', delay: 1900 },
            ].forEach(({ sel, delay }) => {
                const el = svg.querySelector(sel);
                if (!el) return;
                el.style.opacity = '0';
                anims.push(el.animate(
                    [{ opacity: 0, r: '1' }, { opacity: 1, r: '11', offset: 0.6 }, { opacity: 1, r: '8' }],
                    { duration: 420, delay, fill: 'forwards', easing: 'cubic-bezier(0.34,1.56,0.64,1)' }
                ));
            });

            // ── Badges slide up
            [
                { sel: '[data-badge="h"]', delay: 1050 },
                { sel: '[data-badge="f"]', delay: 1550 },
                { sel: '[data-badge="o"]', delay: 2050 },
            ].forEach(({ sel, delay }) => {
                const el = svg.querySelector(sel);
                if (!el) return;
                el.style.opacity = '0';
                anims.push(el.animate(
                    [
                        { opacity: 0, transform: 'translate(0,16px)' },
                        { opacity: 1, transform: 'translate(0,-2px)', offset: 0.7 },
                        { opacity: 1, transform: 'translate(0,0)' },
                    ],
                    { duration: 520, delay, fill: 'forwards', easing: 'ease-out' }
                ));
            });

            // ── Center icon fades in last
            const center = svg.querySelector('[data-tri-center]');
            if (center) {
                center.style.opacity = '0';
                anims.push(center.animate(
                    [{ opacity: 0 }, { opacity: 1 }],
                    { duration: 600, delay: 2200, fill: 'forwards' }
                ));
            }

            // Cancel on unmount / re-run
            return () => anims.forEach(a => { try { a.cancel(); } catch (e) {} });
        }, [heatRating, fuelRating, oxygenRating, showFlame]);

        const swH = Math.max(heatRating + 1, 2.5);
        const swF = Math.max(fuelRating + 1, 2.5);
        const swO = Math.max(oxygenRating + 1, 2.5);
        const bdH = heatRating >= 6 ? 2 : 0.8,  opH = heatRating >= 6 ? 0.7 : 0.25;
        const bdF = fuelRating >= 6 ? 2 : 0.8,  opF = fuelRating >= 6 ? 0.7 : 0.25;
        const bdO = oxygenRating >= 6 ? 2 : 0.8, opO = oxygenRating >= 6 ? 0.7 : 0.25;

        return html`
        <div className="flex justify-center py-4">
            <svg ref=${svgRef} viewBox="0 0 420 410" width="380"
                xmlns="http://www.w3.org/2000/svg"
                style=${{ filter: 'drop-shadow(0 4px 18px rgba(0,0,0,0.08))', display: 'block', overflow: 'visible' }}>
                <defs>
                    <linearGradient id="fra-tf" x1="0.5" y1="0" x2="0.5" y2="1">
                        <stop offset="0%" stopColor=${showFlame ? '#fef2f2' : '#f8fafc'} stopOpacity="0.85"/>
                        <stop offset="100%" stopColor=${showFlame ? '#fecaca' : '#e2e8f0'} stopOpacity="0.2"/>
                    </linearGradient>
                    <filter id="fra-eg" filterUnits="userSpaceOnUse" x="0" y="0" width="420" height="410">
                        <feGaussianBlur stdDeviation="5" result="blur"/>
                        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                    <filter id="fra-fg" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="8" result="blur"/>
                        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                    <filter id="fra-bs" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.13"/>
                    </filter>
                </defs>

                <!-- Ghost outline (always visible, no animation) -->
                <polygon points="210,32 45,308 375,308" fill="none" stroke="#e2e8f0"
                    strokeWidth="1.5" strokeDasharray="7,5" opacity="0.7"/>

                <!-- Fill fades in via WAAPI -->
                <polygon data-tri-fill="1" points="210,32 45,308 375,308"
                    fill="url(#fra-tf)" stroke="none" opacity="0"/>

                <!-- Edges — WAAPI getTotalLength() → strokeDashoffset draw-on -->
                <path data-edge="h" d="M210,32 L45,308"
                    stroke=${hC} strokeWidth=${swH} strokeLinecap="round" fill="none"
                    filter=${heatRating >= 6 ? 'url(#fra-eg)' : 'none'}/>
                <path data-edge="f" d="M45,308 L375,308"
                    stroke=${fC} strokeWidth=${swF} strokeLinecap="round" fill="none"
                    filter=${fuelRating >= 6 ? 'url(#fra-eg)' : 'none'}/>
                <path data-edge="o" d="M375,308 L210,32"
                    stroke=${oC} strokeWidth=${swO} strokeLinecap="round" fill="none"
                    filter=${oxygenRating >= 6 ? 'url(#fra-eg)' : 'none'}/>

                <!-- Nodes pop in via WAAPI -->
                <circle data-node="h" cx="210" cy="32"  r="8" fill=${hC} stroke="white" strokeWidth="2.5" opacity="0"/>
                <circle data-node="f" cx="45"  cy="308" r="8" fill=${fC} stroke="white" strokeWidth="2.5" opacity="0"/>
                <circle data-node="o" cx="375" cy="308" r="8" fill=${oC} stroke="white" strokeWidth="2.5" opacity="0"/>

                <!-- HEAT badge slides up via WAAPI -->
                <g data-badge="h" filter="url(#fra-bs)" opacity="0">
                    <rect x="36" y="113" rx="14" ry="14" width="106" height="64" fill="white"
                        stroke=${hC} strokeWidth=${bdH} strokeOpacity=${opH}/>
                    <text x="89" y="136" fill=${hC} fontSize="12" fontWeight="700"
                        textAnchor="middle" dominantBaseline="middle">🔥 HEAT</text>
                    <text x="89" y="160" fill=${hC} fontSize="20" fontWeight="900"
                        textAnchor="middle" dominantBaseline="middle">
                        ${heatRating}<tspan fill="#94a3b8" fontSize="12" fontWeight="600">/10</tspan>
                    </text>
                </g>

                <!-- FUEL badge slides up via WAAPI -->
                <g data-badge="f" filter="url(#fra-bs)" opacity="0">
                    <rect x="152" y="318" rx="14" ry="14" width="116" height="64" fill="white"
                        stroke=${fC} strokeWidth=${bdF} strokeOpacity=${opF}/>
                    <text x="210" y="339" fill=${fC} fontSize="12" fontWeight="700"
                        textAnchor="middle" dominantBaseline="middle">🪵 FUEL</text>
                    <text x="210" y="363" fill=${fC} fontSize="20" fontWeight="900"
                        textAnchor="middle" dominantBaseline="middle">
                        ${fuelRating}<tspan fill="#94a3b8" fontSize="12" fontWeight="600">/10</tspan>
                    </text>
                </g>

                <!-- OXYGEN badge slides up via WAAPI -->
                <g data-badge="o" filter="url(#fra-bs)" opacity="0">
                    <rect x="278" y="113" rx="14" ry="14" width="106" height="64" fill="white"
                        stroke=${oC} strokeWidth=${bdO} strokeOpacity=${opO}/>
                    <text x="331" y="136" fill=${oC} fontSize="12" fontWeight="700"
                        textAnchor="middle" dominantBaseline="middle">💨 O₂</text>
                    <text x="331" y="160" fill=${oC} fontSize="20" fontWeight="900"
                        textAnchor="middle" dominantBaseline="middle">
                        ${oxygenRating}<tspan fill="#94a3b8" fontSize="12" fontWeight="600">/10</tspan>
                    </text>
                </g>

                <!-- Center icon — WAAPI fade-in, flame uses injected CSS pulse -->
                <g data-tri-center="1" opacity="0">
                    ${showFlame ? html`
                        <circle cx="210" cy="200" r="36" fill="#fef2f2" stroke="#fecaca" strokeWidth="1.5" opacity="0.8"/>
                        <g className="fra-flame">
                            <text x="210" y="195" fontSize="42" textAnchor="middle"
                                dominantBaseline="middle" filter="url(#fra-fg)">🔥</text>
                        </g>
                        <text x="210" y="232" fontSize="9" fontWeight="800" fill="#dc2626"
                            textAnchor="middle" letterSpacing="1.5">COMPOUND RISK</text>
                    ` : html`
                        <circle cx="210" cy="200" r="28" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" opacity="0.5"/>
                        <text x="210" y="204" fontSize="30" textAnchor="middle"
                            dominantBaseline="middle" fill="#cbd5e1">△</text>
                    `}
                </g>
            </svg>
        </div>`;
    }

    // ═══════════════════════════════════════════════════════════════
    // NFPA 704 DIAMOND BADGE — compact inline display
    // ═══════════════════════════════════════════════════════════════

    function NFPA704Diamond({ f, h: hVal, r }) {
        const fBg = { 4: '#7f1d1d', 3: '#b91c1c', 2: '#ea580c', 1: '#ca8a04', 0: '#6b7280' };
        const hBg = { 4: '#1e3a8a', 3: '#1d4ed8', 2: '#2563eb', 1: '#60a5fa', 0: '#6b7280' };
        return html`<span className="inline-flex items-center gap-1 font-mono">
            <span className="px-1.5 py-0.5 rounded text-white text-xs font-bold leading-none"
                style=${{ background: hBg[hVal ?? 0] || '#6b7280' }}>H:${hVal ?? '?'}</span>
            <span className="px-1.5 py-0.5 rounded text-white text-xs font-bold leading-none"
                style=${{ background: fBg[f ?? 0] || '#6b7280' }}>F:${f ?? '?'}</span>
            <span className="px-1.5 py-0.5 rounded text-white text-xs font-bold leading-none"
                style=${{ background: '#d97706' }}>R:${r ?? '?'}</span>
        </span>`;
    }

    // ═══════════════════════════════════════════════════════════════
    // CHEMICAL INVENTORY — NFPA 30 Volume-Based FTRI Enhancement
    //
    // Scientific basis:
    //  • NFPA 30 (2024) — Flammable & Combustible Liquids Code
    //    – MAQ per control area (Table 2.7.1.1): Class IA/IB/IC → 30 gal
    //      (114 L) unprotected, ×4 sprinklered; Class II → 120 gal (454 L);
    //      Class IIIA → 330 gal (1249 L); Class IIIB → 13 200 gal (49 960 L)
    //  • NFPA 704 — Standard System for Identification of the Hazards of
    //    Materials: F rating (0–4) mapped linearly to FTRI fuel leg (0–10)
    //  • FM Global DS 7-29 / NFPA 1 Ch.50 — volume > MAQ raises effective
    //    fire load and demands additional control measures
    //  • Volume amplifier: ratio of stored volume to MAQ drives +1…+4 to
    //    the fuel leg, capped at 10 (same mechanism as the base FTRI engine)
    // ═══════════════════════════════════════════════════════════════

    function ChemicalInventory({ zone, onChange }) {
        const d = D();
        const chemicals = zone.chemicals || [];
        const [showForm, setShowForm]   = useState(false);
        const [editIdx,  setEditIdx]    = useState(-1);
        const [form,     setForm]       = useState(null);
        const [aiLoading, setAiLoading] = useState(false);
        const [aiError,   setAiError]   = useState('');

        const blankForm = useCallback(() => ({
            id: Date.now() + Math.random(),
            name: '', nfpa704F: null, nfpa704H: null, nfpa704R: null,
            flashpointC: null, boilingPointC: null, nfpa30Class: null,
            volumeValue: '', volumeUnit: 'drum — 55 gal / 208 L',
            volumeLiters: 0, physicalState: 'Liquid', notes: ''
        }), []);

        const openAdd  = useCallback(() => { setForm(blankForm()); setEditIdx(-1); setShowForm(true); setAiError(''); }, [blankForm]);
        const openEdit = useCallback((i)  => { setForm({ ...chemicals[i] }); setEditIdx(i); setShowForm(true); setAiError(''); }, [chemicals]);

        const updateForm = useCallback((patch) => {
            setForm(prev => {
                if (!prev) return prev;
                const next = { ...prev, ...patch };
                if ('flashpointC' in patch || 'boilingPointC' in patch)
                    next.nfpa30Class = d.getNFPA30Class(next.flashpointC, next.boilingPointC);
                if ('volumeValue' in patch || 'volumeUnit' in patch)
                    next.volumeLiters = d.convertVolumeToLiters(next.volumeValue, next.volumeUnit);
                return next;
            });
        }, [d]);

        const aiLookup = useCallback(async () => {
            if (!form || !form.name.trim()) { setAiError('Enter a chemical name first.'); return; }
            setAiLoading(true); setAiError('');
            try {
                const prompt =
                    'You are a chemical safety expert. Provide NFPA 704 ratings and fire data for: "' +
                    form.name.trim() + '". Return ONLY valid JSON with no markdown fences:\n' +
                    '{"name":"full name or trade name","nfpa704F":0,"nfpa704H":0,"nfpa704R":0,' +
                    '"flashpointC":null,"boilingPointC":null,"nfpa30Class":null,' +
                    '"physicalState":"Liquid","notes":"1-sentence safety note"}';
                const raw = await AI().fraCallAI(prompt);
                const m = raw.match(/\{[\s\S]*\}/);
                if (!m) throw new Error('No JSON in AI response');
                const res = JSON.parse(m[0]);
                const autoClass = res.nfpa30Class || d.getNFPA30Class(res.flashpointC, res.boilingPointC);
                updateForm({
                    name:        res.name || form.name,
                    nfpa704F:    res.nfpa704F    !== undefined ? Number(res.nfpa704F)  : null,
                    nfpa704H:    res.nfpa704H    !== undefined ? Number(res.nfpa704H)  : null,
                    nfpa704R:    res.nfpa704R    !== undefined ? Number(res.nfpa704R)  : null,
                    flashpointC: res.flashpointC  !== undefined ? res.flashpointC  : null,
                    boilingPointC: res.boilingPointC !== undefined ? res.boilingPointC : null,
                    nfpa30Class: autoClass,
                    physicalState: res.physicalState || 'Liquid',
                    notes: res.notes || ''
                });
            } catch (e) { setAiError('AI lookup failed: ' + e.message); }
            finally { setAiLoading(false); }
        }, [form, d, updateForm]);

        const saveChemical = useCallback(() => {
            if (!form || !form.name.trim()) return;
            const final = {
                ...form,
                volumeLiters: d.convertVolumeToLiters(form.volumeValue, form.volumeUnit),
                nfpa30Class:  form.nfpa30Class || d.getNFPA30Class(form.flashpointC, form.boilingPointC)
            };
            const updated = editIdx >= 0
                ? chemicals.map((c, i) => i === editIdx ? final : c)
                : [...chemicals, final];
            onChange({ ...zone, chemicals: updated });
            setShowForm(false); setForm(null); setEditIdx(-1);
        }, [form, editIdx, chemicals, zone, onChange, d]);

        const removeChemical = useCallback((i) => {
            onChange({ ...zone, chemicals: chemicals.filter((_, ci) => ci !== i) });
        }, [chemicals, zone, onChange]);

        const chemResult = d.calcChemicalFuelRating(chemicals, zone.hasSprinklers || false);

        return html`
        <div className="fra-checklist-section">
            <!-- Section header -->
            <div className="fra-checklist-header" style=${{ cursor: 'default', userSelect: 'none' }}>
                <span className="flex-1 font-bold text-sm"> Chemical Inventory — NFPA 30 Volume Analysis</span>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer mr-3 select-none"
                    title="NFPA 30 §9.4 — Sprinklered buildings are permitted 4× the Maximum Allowable Quantity (MAQ) of flammable/combustible liquids per control area. Tick this if the zone has an automatic sprinkler system (wet/dry pipe per NFPA 13). This multiplier significantly raises the MAQ threshold before the volume amplifier kicks in.">
                    <input type="checkbox" checked=${zone.hasSprinklers || false}
                        onChange=${(e) => onChange({ ...zone, hasSprinklers: e.target.checked })}
                        className="h-3.5 w-3.5 text-blue-600 rounded" />
                    🚿 Sprinkler system (NFPA 30 ×4 MAQ)
                </label>
                <button type="button" onClick=${openAdd}
                    className="text-xs px-3 py-1 bg-orange-500 text-white rounded-full hover:bg-orange-600 font-semibold transition">
                    + Add Chemical
                </button>
            </div>

            <div className="fra-checklist-body space-y-2">
                ${chemicals.length === 0 && !showForm ? html`
                <div className="text-xs text-slate-400 italic py-2 px-1">
                    No chemicals recorded. Add chemicals from your SDS sheets (or by name for AI lookup) to enable
                    <strong> volume-based NFPA 30 fuel amplification</strong> on the FTRI score.
                </div>` : ''}

                <!-- Chemical cards -->
                ${chemicals.map((chem, i) => {
                    const cls  = chem.nfpa30Class ? d.NFPA30_LIQUID_CLASSES[chem.nfpa30Class] : null;
                    const maq  = cls ? (zone.hasSprinklers ? cls.maqL_sprk : cls.maqL_none) : 0;
                    const ratio    = maq > 0 && chem.volumeLiters > 0 ? chem.volumeLiters / maq : 0;
                    const barPct   = Math.min(ratio * 100, 100);
                    const overPct  = ratio > 1 ? Math.round((ratio - 1) * 100) : 0;
                    const barColor = ratio > 1.0 ? '#dc2626' : ratio > 0.5 ? '#f97316' : '#22c55e';
                    return html`
                    <div key=${chem.id || i} className="border rounded-lg p-3 bg-white shadow-sm">
                        <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                    ${cls ? html`<span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style=${{ background: cls.color }}></span>` : ''}
                                    <span className="font-bold text-sm text-slate-800">${chem.name || '—'}</span>
                                    ${ratio > 1 ? html`<span className="text-xs font-bold text-red-600">⚠ EXCEEDS NFPA 30 MAQ</span>` : ''}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    ${(chem.nfpa704F !== null || chem.nfpa704H !== null || chem.nfpa704R !== null)
                                        ? html`<span className="cursor-help" title="NFPA 704 Diamond Ratings (from SDS Section 14/16):\n• H (Health): 0=Normal → 4=Deadly\n• F (Flammability): 0=Won't burn → 4=Extremely flammable (FP<22.8°C, BP<37.8°C)\n• R (Reactivity): 0=Stable → 4=May detonate\nHigher F rating = higher FTRI fuel leg score.">${h(NFPA704Diamond, { f: chem.nfpa704F, h: chem.nfpa704H, r: chem.nfpa704R })}</span>` : ''}
                                    ${chem.flashpointC !== null && chem.flashpointC !== undefined
                                        ? html`<span className="text-xs text-slate-500 cursor-help" title="Flash Point — the lowest temperature at which the liquid gives off enough vapor to ignite in air (SDS Section 9). Lower flash point = more dangerous.\n\nNFPA 30 Classification:\n• <22.8°C = Class I (Flammable)\n• 22.8–60°C = Class II (Combustible)\n• 60–93.3°C = Class IIIA\n• ≥93.3°C = Class IIIB">FP: ${chem.flashpointC}°C</span>` : ''}
                                    ${cls ? html`<span className="text-xs font-semibold cursor-help" style=${{ color: cls.color }}
                                        title=${`${cls.label}\n${cls.description}\nExamples: ${cls.examples}\n\nNFPA 30 MAQ: ${zone.hasSprinklers ? cls.maqL_sprk : cls.maqL_none} L (${zone.hasSprinklers ? 'sprinklered ×4' : 'no sprinklers'})`}>${chem.nfpa30Class}</span>` : ''}
                                    ${chem.physicalState ? html`<span className="text-xs text-slate-400">${chem.physicalState}</span>` : ''}
                                </div>
                                ${cls && chem.volumeLiters > 0 ? html`
                                <div>
                                    <div className="flex justify-between text-xs mb-0.5">
                                        <span className="text-slate-500">${chem.volumeValue} ${chem.volumeUnit}
                                            = <strong>${Math.round(chem.volumeLiters * 10) / 10} L</strong></span>
                                        <span className=${(ratio > 1 ? 'text-red-600 font-bold' : 'text-slate-500') + ' cursor-help'}
                                            title="MAQ = Maximum Allowable Quantity per NFPA 30 control area.\nThis is the maximum quantity of flammable/combustible liquids\npermitted in a single fire control area before additional\nprotection (storage cabinets, dedicated rooms) is required.\n\n🟢 <50% = Within compliance\n🟡 50-100% = Approaching limit\n🔴 >100% = Exceeds MAQ — code violation">
                                            ${Math.round(ratio * 100)}% of MAQ (${Math.round(maq)} L)
                                            ${ratio > 1 ? ' 🔴' : ratio > 0.5 ? ' 🟡' : ' 🟢'}
                                        </span>
                                    </div>
                                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div className="h-2 rounded-full transition-all" style=${{ width: barPct + '%', background: barColor }}></div>
                                    </div>
                                    ${ratio > 1 ? html`
                                    <p className="text-xs text-red-600 font-semibold mt-0.5">
                                        Exceeds NFPA 30 MAQ by ${overPct}% — upgrade to compliant storage cabinet or reduce inventory.
                                    </p>` : ''}
                                </div>` : html`
                                <span className="text-xs text-slate-400">
                                    ${chem.volumeValue
                                        ? chem.volumeValue + ' ' + chem.volumeUnit + ' = ' + Math.round(d.convertVolumeToLiters(chem.volumeValue, chem.volumeUnit) * 10) / 10 + ' L (class not set)'
                                        : 'No quantity specified'}
                                </span>`}
                                ${chem.notes ? html`<p className="text-xs text-slate-500 italic mt-1">${chem.notes}</p>` : ''}
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                                <button type="button" onClick=${() => openEdit(i)}
                                    className="text-xs px-2 py-1 border border-slate-300 rounded-md hover:bg-slate-50 transition">✏️</button>
                                <button type="button" onClick=${() => removeChemical(i)}
                                    className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition">✕</button>
                            </div>
                        </div>
                    </div>`;
                })}

                <!-- Add / Edit form -->
                ${showForm && form ? html`
                <div className="border-2 border-orange-300 rounded-xl p-4 bg-orange-50 space-y-3 mt-2">
                    <div className="font-bold text-sm text-orange-900">
                        ${editIdx >= 0 ? '✏️ Edit Chemical' : '➕ Add Chemical to Inventory'}
                    </div>

                    <!-- Name + AI Lookup -->
                    <div className="flex gap-2">
                        <input type="text"
                            placeholder="Chemical / product name (e.g. Toluene, Hydraulic Oil 46, unknown drum)"
                            value=${form.name}
                            onInput=${(e) => updateForm({ name: e.target.value })}
                            className="flex-1 p-2 border border-orange-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-400 outline-none" />
                        <button type="button" onClick=${aiLookup} disabled=${aiLoading}
                            className="flex items-center gap-1.5 text-xs px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-semibold whitespace-nowrap transition">
                            ${aiLoading ? h(Spinner, {}) : '🤖'} AI Lookup
                        </button>
                    </div>
                    ${aiError ? html`<p className="text-xs text-red-600 font-medium">${aiError}</p>` : ''}

                    <!-- NFPA 704 Ratings -->
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 cursor-help"
                            title="NFPA 704 — Standard System for the Identification of the Hazards of Materials for Emergency Response.\nThese ratings are found on the Safety Data Sheet (SDS) in Section 14 or 16, and on the product's GHS label or NFPA diamond placard.\n\n• F (Flammability): How easily the material ignites — 0 (won't burn) to 4 (extremely flammable, FP < 22.8°C)\n• H (Health): Health hazard upon exposure — 0 (no hazard) to 4 (short exposure can cause death)\n• R (Reactivity/Instability): How unstable the material is — 0 (stable) to 4 (readily detonates)">
                            NFPA 704 Ratings ℹ️
                            <span className="normal-case font-normal text-slate-400 ml-1">— from SDS Section 14 or GHS label (click AI Lookup to auto-fill)</span>
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            ${[
                                { key: 'nfpa704F', label: '🔴 Flammability (F)', bg: '#ef4444' },
                                { key: 'nfpa704H', label: '🔵 Health (H)',       bg: '#3b82f6' },
                                { key: 'nfpa704R', label: '🟡 Reactivity (R)',   bg: '#f59e0b' }
                            ].map(field => html`
                            <div key=${field.key}>
                                <label className="text-xs font-semibold mb-1.5 block text-slate-700">${field.label}</label>
                                <div className="flex gap-1">
                                    ${[0,1,2,3,4].map(v => html`
                                    <button key=${v} type="button"
                                        onClick=${() => updateForm({ [field.key]: form[field.key] === v ? null : v })}
                                        className="w-7 h-7 rounded font-bold text-xs transition border-2 focus:outline-none"
                                        style=${{
                                            background:   form[field.key] === v ? field.bg : '#f8fafc',
                                            color:        form[field.key] === v ? 'white' : '#64748b',
                                            borderColor:  form[field.key] === v ? field.bg : '#e2e8f0'
                                        }}>
                                        ${v}
                                    </button>`)}
                                </div>
                            </div>`)}
                        </div>
                    </div>

                    <!-- Flashpoint + Boiling point + Physical state -->
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1 cursor-help"
                                title="Flash Point — the lowest temperature at which the liquid produces enough vapor to ignite momentarily in the presence of an ignition source (SDS Section 9.1).\n\nThis is the primary classifier for NFPA 30 liquid class:\n• Class IA: FP < 22.8°C AND BP < 37.8°C\n• Class IB: FP < 22.8°C AND BP ≥ 37.8°C\n• Class IC: FP 22.8–37.8°C\n• Class II: FP 37.8–60°C\n• Class IIIA: FP 60–93.3°C\n• Class IIIB: FP ≥ 93.3°C\n\nLower flash point = more dangerous = higher FTRI score.">Flash Point (°C) ℹ️</label>
                            <input type="number" placeholder="e.g. 4"
                                value=${form.flashpointC ?? ''}
                                onInput=${(e) => updateForm({ flashpointC: e.target.value !== '' ? parseFloat(e.target.value) : null })}
                                className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-400 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1 cursor-help"
                                title="Boiling Point — the temperature at which the liquid boils (SDS Section 9.1).\n\nThe boiling point distinguishes Class IA from Class IB:\n• Class IA: FP < 22.8°C AND BP < 37.8°C (e.g. diethyl ether, pentane)\n• Class IB: FP < 22.8°C AND BP ≥ 37.8°C (e.g. gasoline, acetone)\n\nOptional if FP ≥ 22.8°C (Classes IC–IIIB don't use boiling point).">Boiling Point (°C) ℹ️</label>
                            <input type="number" placeholder="optional"
                                value=${form.boilingPointC ?? ''}
                                onInput=${(e) => updateForm({ boilingPointC: e.target.value !== '' ? parseFloat(e.target.value) : null })}
                                className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-400 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Physical State</label>
                            <select value=${form.physicalState || 'Liquid'}
                                onChange=${(e) => updateForm({ physicalState: e.target.value })}
                                className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-400 outline-none">
                                <option>Liquid</option>
                                <option>Flammable Gas</option>
                                <option>Flammable Solid</option>
                                <option>Aerosol</option>
                                <option>Other / Unknown</option>
                            </select>
                        </div>
                    </div>

                    <!-- NFPA 30 Class -->
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1 cursor-help"
                            title="NFPA 30 — Flammable and Combustible Liquids Code.\nClassifies liquids by flash point and boiling point into 6 classes:\n\n🔴 Class IA: FP < 22.8°C, BP < 37.8°C — Extremely flammable (diethyl ether)\n🟠 Class IB: FP < 22.8°C, BP ≥ 37.8°C — Highly flammable (gasoline, acetone)\n🟠 Class IC: FP 22.8–37.8°C — Flammable (turpentine, n-butanol)\n🟡 Class II: FP 37.8–60°C — Combustible (diesel, kerosene)\n🟡 Class IIIA: FP 60–93.3°C — Combustible (linseed oil, hydraulic oil)\n⚪ Class IIIB: FP ≥ 93.3°C — Combustible (cooking oil, gear oil)\n\nEach class has a Maximum Allowable Quantity (MAQ) per control area.\nExceeding the MAQ raises the FTRI fuel leg score.">
                            NFPA 30 Liquid Class ℹ️
                            ${form.nfpa30Class
                                ? html`<span className="normal-case font-normal text-green-600 ml-1">✓ auto-detected — override if needed</span>`
                                : html`<span className="normal-case font-normal text-slate-400 ml-1">— enter flash point above for auto-detection, or select manually</span>`}
                        </label>
                        <select value=${form.nfpa30Class || ''}
                            onChange=${(e) => updateForm({ nfpa30Class: e.target.value || null })}
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-400 outline-none">
                            <option value="">— Select class —</option>
                            ${Object.entries(d.NFPA30_LIQUID_CLASSES).map(([k, cls]) => html`
                            <option key=${k} value=${k}>${cls.label} | ${cls.description}</option>`)}
                        </select>
                        ${form.nfpa30Class && d.NFPA30_LIQUID_CLASSES[form.nfpa30Class] ? html`
                        <p className="text-xs text-slate-500 mt-1">
                            <strong>Examples:</strong> ${d.NFPA30_LIQUID_CLASSES[form.nfpa30Class].examples} ·
                            <strong>MAQ limit:</strong> ${zone.hasSprinklers
                                ? d.NFPA30_LIQUID_CLASSES[form.nfpa30Class].maqL_sprk
                                : d.NFPA30_LIQUID_CLASSES[form.nfpa30Class].maqL_none} L
                            <span className="text-slate-400">(${zone.hasSprinklers ? 'with sprinklers ×4' : 'no sprinklers — tick checkbox above to apply ×4 multiplier'})</span>
                        </p>` : ''}
                    </div>

                    <!-- Quantity -->
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1 cursor-help"
                            title="Total quantity of this chemical stored in the zone / control area.\n\nVolume matters because NFPA 30 defines a Maximum Allowable Quantity (MAQ) per control area. Exceeding MAQ adds +1 to +4 to the FTRI fuel leg:\n\n• <25% MAQ → no amplification\n• 25–50% MAQ → +1 fuel leg\n• 50–100% MAQ → +2 fuel leg\n• 100–200% MAQ → +3 (exceeds code)\n• >200% MAQ → +4 (fire code violation)\n\nSelect units: drums (55 gal), IBCs (275 gal), litres, gallons, or kg with density estimate.">Quantity on Site ℹ️</label>
                        <div className="flex gap-2">
                            <input type="number" placeholder="e.g. 3" min="0"
                                value=${form.volumeValue}
                                onInput=${(e) => updateForm({ volumeValue: e.target.value })}
                                className="w-28 p-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-400 outline-none" />
                            <select value=${form.volumeUnit}
                                onChange=${(e) => updateForm({ volumeUnit: e.target.value })}
                                className="flex-1 p-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-400 outline-none">
                                ${Object.keys(d.VOLUME_UNIT_CONVERSIONS).map(u => html`<option key=${u} value=${u}>${u}</option>`)}
                            </select>
                        </div>
                        ${form.volumeValue ? html`
                        <p className="text-xs text-green-700 mt-1 font-semibold">
                            = ${Math.round(d.convertVolumeToLiters(form.volumeValue, form.volumeUnit) * 10) / 10} litres
                        </p>` : ''}
                    </div>

                    <!-- SDS Notes -->
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Notes / SDS Reference</label>
                        <input type="text"
                            placeholder="SDS revision date, storage location, UN number, special precautions..."
                            value=${form.notes || ''}
                            onInput=${(e) => updateForm({ notes: e.target.value })}
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-400 outline-none" />
                    </div>

                    <!-- Buttons -->
                    <div className="flex gap-2 justify-end pt-1 border-t border-orange-200">
                        <button type="button"
                            onClick=${() => { setShowForm(false); setForm(null); setEditIdx(-1); }}
                            className="px-4 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition">Cancel</button>
                        <button type="button" onClick=${saveChemical}
                            disabled=${!form || !form.name.trim()}
                            className="px-4 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-semibold transition">
                            ${editIdx >= 0 ? '✓ Update Chemical' : '✓ Add to Inventory'}
                        </button>
                    </div>
                </div>` : ''}

                <!-- NFPA 30 Impact Summary -->
                ${chemicals.length > 0 && chemResult.hasChemicals ? html`
                <div className="mt-2 p-3 rounded-xl border-2 text-xs" style=${{
                    borderColor: chemResult.rating >= 8 ? '#fca5a5' : chemResult.rating >= 6 ? '#fdba74' : '#bbf7d0',
                    background:  chemResult.rating >= 8 ? '#fef2f2' : chemResult.rating >= 6 ? '#fff7ed' : '#f0fdf4'
                }}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-700">⚗️ Chemical Fuel Leg — NFPA 30 Impact on FTRI</span>
                        <span className="font-mono font-bold" style=${{ color: d.ratingColor(chemResult.rating) }}>
                            base ${chemResult.baseRating}
                            ${chemResult.volumeAmplifier > 0 ? html`
                            <span className="text-red-600"> + ${chemResult.volumeAmplifier} vol.</span>` : ''}
                            → <strong>${chemResult.rating}/10</strong>
                        </span>
                    </div>
                    ${chemResult.classDetails.map(cd => {
                        const cls = d.NFPA30_LIQUID_CLASSES[cd.cls];
                        return html`
                        <div key=${cd.cls} className="flex items-center gap-2 py-0.5 text-xs">
                            <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style=${{ background: cls?.color || '#94a3b8' }}></span>
                            <span className="font-semibold w-20" style=${{ color: cls?.color || '#64748b' }}>${cd.cls}</span>
                            <span className="text-slate-600">${cd.totalLiters} L / ${cd.maq} L MAQ = ${Math.round(cd.ratio * 100)}%</span>
                            ${cd.amplifier > 0
                                ? html`<span className="ml-auto text-red-600 font-bold">+${cd.amplifier} fuel leg</span>`
                                : html`<span className="ml-auto text-green-600">✓ within limit</span>`}
                        </div>`;
                    })}
                    ${chemResult.classDetails.some(cd => cd.exceeds) ? html`
                    <div className="mt-2 pt-2 border-t border-red-200 text-red-700 font-semibold">
                        ⚠️ NFPA 30 MAQ exceeded — requires FM-approved flammable storage cabinet,
                        dedicated storage room, or inventory reduction. Reference: NFPA 30 §9.4.
                    </div>` : ''}
                </div>` : ''}
            </div>
        </div>`;
    }

    // ═══════════════════════════════════════════════════════════════
    // SECTION 3: ZONE CHECKLIST (fire triangle + controls)
    // ═══════════════════════════════════════════════════════════════

    function ZoneChecklist({ zone, onChange }) {
        const d = D();
        const [triHidden, setTriHidden] = useState(false);
        const triSentinelRef = useRef(null);

        // IntersectionObserver: detect when main triangle scrolls out of view
        useEffect(() => {
            const el = triSentinelRef.current;
            if (!el) return;
            const observer = new IntersectionObserver(
                ([entry]) => { setTriHidden(!entry.isIntersecting); },
                { threshold: 0.05 }
            );
            observer.observe(el);
            return () => observer.disconnect();
        }, []);

        const scrollToTriangle = useCallback(() => {
            const el = triSentinelRef.current;
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, []);

        const updateField = useCallback((field, value) => {
            onChange({ ...zone, [field]: value });
        }, [zone, onChange]);

        const updateControl = useCallback((catKey, keys) => {
            const newControls = { ...zone.selectedControls, [catKey]: keys };
            onChange({ ...zone, selectedControls: newControls });
        }, [zone, onChange]);

        // Build fire triangle SVG data
        const heatRating = zone.ignitionSources.length > 0
            ? Math.max(...zone.ignitionSources.map(k => (d.IGNITION_SOURCES[k] || {}).rating || 1)) : 0;
        const fuelFromSources = zone.fuelSources.length > 0
            ? Math.max(...zone.fuelSources.map(k => (d.FUEL_SOURCES[k] || {}).rating || 1)) : 0;
        // Chemical inventory (NFPA 30 volume-amplified) can override the fuel leg
        const zoneChemResult  = d.calcChemicalFuelRating(zone.chemicals || [], zone.hasSprinklers || false);
        const fuelRating      = Math.max(fuelFromSources, zoneChemResult.rating);
        const chemFuelOverride = zoneChemResult.hasChemicals && zoneChemResult.rating > fuelFromSources;
        const oxygenRating = zone.oxygenConditions.length > 0
            ? Math.max(...zone.oxygenConditions.map(k => (d.OXYGEN_CONDITIONS[k] || {}).rating || 1)) : 0;
        const hC = d.ratingColor(heatRating), fC = d.ratingColor(fuelRating), oC = d.ratingColor(oxygenRating);
        const showFlame = heatRating >= 6 && fuelRating >= 6 && oxygenRating >= 6;

        const isAIApplied = zone.aiApplied;

        return html`
        <div className="fra-card theme-orange fra-fade-in">
            <div className="fra-card-header">
                <span className="fra-step-indicator ${isAIApplied ? 'fra-step-complete' : 'fra-step-incomplete'} mr-2">3</span>
                🔺 Fire Triangle Checklist
                ${isAIApplied ? html`<span className="fra-ai-badge ml-2">AI populated — please review</span>` : ''}
            </div>
            <div className="fra-card-body space-y-4">
                <!-- Location Profile -->
                <details open className="border border-slate-200 rounded-lg">
                    <summary className="p-3 bg-slate-50 rounded-lg font-semibold text-sm cursor-pointer hover:bg-slate-100">
                        📍 Location Profile
                        ${zone.aiItems && zone.aiItems['occupancyClass'] ? html`<span className="fra-ai-badge ml-2">AI</span>` : ''}
                    </summary>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Zone / Area Name</label>
                            <input type="text" value=${zone.name} className="w-full p-2 border border-slate-300 rounded-md text-sm"
                                onInput=${(e) => updateField('name', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Building</label>
                            <input type="text" value=${zone.building || ''} className="w-full p-2 border border-slate-300 rounded-md text-sm"
                                onInput=${(e) => updateField('building', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Floor / Level</label>
                            <input type="text" value=${zone.floor || ''} className="w-full p-2 border border-slate-300 rounded-md text-sm"
                                onInput=${(e) => updateField('floor', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Occupancy Class (NFPA 101)</label>
                            <select value=${zone.occupancyClass} className="w-full p-2 border border-slate-300 rounded-md text-sm"
                                onChange=${(e) => updateField('occupancyClass', e.target.value)}>
                                ${Object.keys(d.OCCUPANCY_CLASSES).map(k => html`
                                    <option key=${k} value=${k}>${k} [${d.OCCUPANCY_CLASSES[k].code}]</option>
                                `)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Occupant Count</label>
                            <input type="number" value=${zone.occupantCount || ''} className="w-full p-2 border border-slate-300 rounded-md text-sm"
                                onInput=${(e) => updateField('occupantCount', parseInt(e.target.value) || 0)} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Area (m²)</label>
                            <input type="number" value=${zone.areaSqM || ''} className="w-full p-2 border border-slate-300 rounded-md text-sm"
                                onInput=${(e) => updateField('areaSqM', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked=${zone.businessCritical}
                                    onChange=${(e) => updateField('businessCritical', e.target.checked)}
                                    className="h-5 w-5 text-orange-600 rounded focus:ring-orange-500" />
                                <span className="text-sm font-medium text-slate-700">Business-critical area</span>
                            </label>
                        </div>
                    </div>
                </details>

                <!-- Fire Triangle Visual -->
                <div ref=${triSentinelRef}>
                    ${h(FireTriangle, { heatRating, fuelRating, oxygenRating, hC, fC, oC, showFlame })}
                </div>

                <!-- Floating mini triangle (appears when main scrolls out of view) -->
                ${h(FloatingMiniTriangle, {
                    visible: triHidden,
                    heatRating, fuelRating, oxygenRating,
                    hC, fC, oC, showFlame,
                    onClickScroll: scrollToTriangle
                })}


                <!-- Ignition Sources -->
                <${MultiSelect}
                    title="🔥 HEAT — Ignition Sources"
                    registry=${d.IGNITION_SOURCES}
                    selectedKeys=${zone.ignitionSources}
                    aiItems=${zone.aiItems}
                    prefix="ignition"
                    tooltip="Heat/Ignition Sources — select ALL potential ignition sources present in this zone.\n\nEach item shows its NFPA reference standard.\nThe highest-rated source sets the FTRI heat leg score (0–10).\n\nExamples: open flames, hot work, electrical equipment,\nstatic discharge, friction, hot surfaces."
                    onChange=${(keys) => updateField('ignitionSources', keys)}
                    formatLabel=${(k) => { const s = d.IGNITION_SOURCES[k]; return k + ' [' + s.nfpa + ']'; }}
                />
                <!-- Fuel Sources -->
                <${MultiSelect}
                    title="🪵 FUEL — Combustible Materials (registry)"
                    tooltip="Fuel Sources Registry — select ALL types of combustible materials present in this zone.\n\nEach item shows its NFPA reference and Flash Point (FP).\nThe highest-rated fuel source sets the baseline FTRI fuel leg score.\n\n⚠️ This registry identifies WHAT can burn — not HOW MUCH.\nFor volume/quantity tracking and NFPA 30 MAQ compliance,\nuse the 🧪 Chemical Inventory section below.\n\nIf both registry and chemical inventory contribute fuel ratings,\nthe HIGHER value drives the FTRI fuel leg."
                    registry=${d.FUEL_SOURCES}
                    selectedKeys=${zone.fuelSources}
                    aiItems=${zone.aiItems}
                    prefix="fuel"
                    onChange=${(keys) => updateField('fuelSources', keys)}
                    formatLabel=${(k) => { const s = d.FUEL_SOURCES[k]; return k + ' [' + s.nfpa + ', FP: ' + s.flashPoint + ']'; }}
                />

                <!-- Chemical Inventory (NFPA 30 SDS-driven analysis) -->
                ${h(ChemicalInventory, { zone, onChange })}

                ${chemFuelOverride ? html`
                <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-orange-100 border border-orange-300">
                    <span className="text-orange-700">⚗️ <strong>Chemical inventory</strong> is driving the FUEL leg
                        (${zoneChemResult.rating}/10 vs registry ${fuelFromSources}/10).
                        Volume-based NFPA 30 amplification active.</span>
                </div>` : ''}

                <!-- Oxygen Conditions -->
                <${MultiSelect}
                    title="💨 OXYGEN — Atmosphere Conditions"
                    tooltip="Oxygen/Atmosphere Conditions — select factors that affect\noxygen availability and ventilation in this zone.\n\nThe oxygen leg of the fire triangle scores how readily\na fire can sustain and spread.\n\nExamples: normal atmosphere (21% O₂), oxygen-enriched\nenvironments, poor ventilation, confined spaces,\nforced-air systems, oxidising chemicals nearby."
                    registry=${d.OXYGEN_CONDITIONS}
                    selectedKeys=${zone.oxygenConditions}
                    aiItems=${zone.aiItems}
                    prefix="oxygen"
                    onChange=${(keys) => updateField('oxygenConditions', keys)}
                    formatLabel=${(k) => { const s = d.OXYGEN_CONDITIONS[k]; return k + ' [' + s.note + ']'; }}
                />
            </div>
        </div>

        <!-- Controls Audit -->
        <div className="fra-card theme-green fra-fade-in mt-4">
            <div className="fra-card-header">
                🛡️ Fire Protection Controls
                ${isAIApplied ? html`<span className="fra-ai-badge ml-2">AI</span>` : ''}
            </div>
            <div className="fra-card-body">
                <p className="text-sm text-slate-600 mb-3">Select all fire protection measures currently in place. <span className="text-red-600 font-semibold">★ Mandatory</span> items are required by code.</p>
                ${Object.entries(d.CONTROL_CATEGORIES).map(([catKey, catDef]) => {
                    const selected = zone.selectedControls[catKey] || [];
                    return html`
                    <${ControlCategory} key=${catKey}
                        catKey=${catKey} catDef=${catDef} selected=${selected}
                        aiItems=${zone.aiItems}
                        onChange=${(keys) => updateControl(catKey, keys)} />`;
                })}
            </div>
        </div>`;
    }

    function ControlCategory({ catKey, catDef, selected, aiItems, onChange }) {
        const [open, setOpen] = useState(false);
        const total = Object.keys(catDef.items).length;

        const toggle = useCallback((itemName) => {
            const newSel = selected.includes(itemName)
                ? selected.filter(k => k !== itemName)
                : [...selected, itemName];
            onChange(newSel);
        }, [selected, onChange]);

        return html`
        <details className="border border-slate-200 rounded-lg mb-2">
            <summary className="cursor-pointer p-3 bg-slate-50 rounded-lg font-semibold text-sm hover:bg-slate-100 transition flex items-center justify-between">
                <span>${catDef.label}</span>
                <span className="text-xs px-2 py-0.5 rounded-full ${selected.length > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${selected.length}/${total}
                </span>
            </summary>
            <div className="p-3 space-y-1">
                <p className="text-xs text-slate-500 mb-2">${catDef.description}</p>
                ${Object.entries(catDef.items).map(([itemName, itemDef]) => {
                    const isAI = aiItems && aiItems['control:' + catKey + ':' + itemName];
                    return html`
                    <label key=${itemName} className="fra-checklist-item">
                        <input type="checkbox" checked=${selected.includes(itemName)}
                            onChange=${() => toggle(itemName)}
                            className="mt-0.5 h-4 w-4 text-green-600 rounded focus:ring-green-500 flex-shrink-0" />
                        <span className="leading-tight text-sm">
                            ${isAI ? html`<span className="fra-ai-badge">AI</span> ` : ''}
                            ${itemDef.mandatory ? html`<span className="text-red-600 font-bold">★</span> ` : ''}
                            ${itemName}
                            <span className="text-xs text-slate-400"> (${itemDef.standard}, ${Math.round(itemDef.effectiveness * 100)}% eff.)</span>
                        </span>
                    </label>`;
                })}
            </div>
        </details>`;
    }

    // ═══════════════════════════════════════════════════════════════
    // SECTION 4: RESULTS
    // ═══════════════════════════════════════════════════════════════

    function ZoneResults({ zone }) {
        const d = D();
        const r = zone.result;
        if (!r) return null;
        const cat = r.category;

        return html`
        <div id="fra-result-card" className="rounded-xl border-2 p-6 space-y-6 fra-fade-in"
            style=${{ borderColor: cat.border, backgroundColor: cat.bg }}>
            <!-- Score Header -->
            <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="fra-score-badge" style=${{ backgroundColor: cat.color }}>
                    <span className="fra-score-number">${r.score}</span>
                    <span className="fra-score-max">/ 100</span>
                </div>
                <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-2xl font-black" style=${{ color: cat.color }}>${cat.icon} ${cat.label} FIRE RISK</h3>
                    <p className="text-sm font-medium mt-1" style=${{ color: cat.color }}>${cat.action}</p>
                    <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                        <div className="bg-white/70 rounded-lg p-2"><div className="text-xs text-slate-500">Heat</div><div className="text-lg font-bold text-red-600">${r.heat}/10</div></div>
                        <div className="bg-white/70 rounded-lg p-2"><div className="text-xs text-slate-500">Fuel</div><div className="text-lg font-bold text-amber-600">${r.fuel}/10</div></div>
                        <div className="bg-white/70 rounded-lg p-2"><div className="text-xs text-slate-500">Oxygen</div><div className="text-lg font-bold text-blue-600">${r.oxygen}/10</div></div>
                    </div>
                </div>
            </div>

            <!-- Metrics -->
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="fra-metric"><div className="fra-metric-label">Fire Triangle</div><div className="fra-metric-value" style=${{ color: '#ea580c' }}>${r.triangle.triangleScore.toFixed(1)}</div><div className="fra-metric-sub">max 15</div></div>
                <div className="fra-metric"><div className="fra-metric-label">Interaction</div><div className="fra-metric-value" style=${{ color: '#dc2626' }}>×${r.triangle.interaction.toFixed(2)}</div><div className="fra-metric-sub">${r.triangle.interaction >= 1.3 ? 'COMPOUND' : 'Normal'}</div></div>
                <div className="fra-metric"><div className="fra-metric-label">Control Eff.</div><div className="fra-metric-value" style=${{ color: '#16a34a' }}>${Math.round(r.controls.totalEffectiveness * 100)}%</div><div className="fra-metric-sub">max 80%</div></div>
                <div className="fra-metric"><div className="fra-metric-label">Consequence</div><div className="fra-metric-value" style=${{ color: '#7c3aed' }}>×${r.consequence.toFixed(2)}</div><div className="fra-metric-sub">max 2.0</div></div>
            </div>

            <!-- Control Breakdown -->
            <div className="bg-white/70 rounded-lg p-4">
                <h4 className="font-bold text-slate-800 mb-3 text-sm">Control Effectiveness Breakdown</h4>
                <div className="space-y-2">
                    ${Object.entries(d.CONTROL_CATEGORIES).map(([catKey, catDef]) => {
                        const score = r.controls.categoryScores[catKey] || 0;
                        const pct = Math.round((score / catDef.maxWeight) * 100);
                        const barColor = pct > 60 ? '#16a34a' : pct > 30 ? '#eab308' : '#ef4444';
                        return html`
                        <div key=${catKey} className="flex items-center gap-3 text-xs">
                            <span className="w-36 text-right font-medium text-slate-600 truncate">${catDef.label}</span>
                            <div className="flex-1 bg-slate-200 rounded-full h-3 overflow-hidden">
                                <div className="fra-ctrl-bar" style=${{ width: pct + '%', background: barColor }}></div>
                            </div>
                            <span className="w-10 font-bold" style=${{ color: barColor }}>${pct}%</span>
                        </div>`;
                    })}
                </div>
            </div>

            <!-- Gaps -->
            ${r.controls.gaps.length > 0 && html`
            <div className="bg-white/70 rounded-lg p-4">
                <h4 className="font-bold text-red-800 mb-3 text-sm">⚠️ Gaps & Missing Mandatory Controls</h4>
                <ul className="space-y-1">
                    ${r.controls.gaps.map((g, i) => html`
                        <li key=${i} className="text-xs" style=${{ color: g.startsWith('MANDATORY') ? '#7f1d1d' : '#854d0e' }}>
                            ${g.startsWith('MANDATORY') ? '🔴' : '🟡'} ${g}
                        </li>
                    `)}
                </ul>
            </div>`}

            <!-- Formula -->
            <div className="bg-white/70 rounded-lg p-4">
                <h4 className="font-bold text-slate-800 mb-2 text-sm">📐 FTRI Formula</h4>
                <div className="text-xs text-slate-700 font-mono bg-white p-3 rounded border border-slate-200">
                    FTRI = (Fire Triangle × (1 − Control Effectiveness) × Consequence) ÷ 30 × 100<br/>
                    FTRI = (${r.triangle.triangleScore.toFixed(2)} × (1 − ${r.controls.totalEffectiveness.toFixed(3)}) × ${r.consequence.toFixed(2)}) ÷ 30 × 100<br/>
                    FTRI = <strong>${r.score}</strong>
                </div>
            </div>
        </div>`;
    }

    // ═══════════════════════════════════════════════════════════════
    // NOTES SECTION
    // ═══════════════════════════════════════════════════════════════

    function ZoneNotes({ zone, onChange }) {
        const appendVoice = useCallback((text) => {
            const newNotes = (zone.notes || '') + (zone.notes ? ' ' : '') + text;
            onChange({ ...zone, notes: newNotes });
        }, [zone, onChange]);

        return html`
        <div className="fra-card theme-slate fra-fade-in">
            <div className="fra-card-header">📝 Notes & Observations</div>
            <div className="fra-card-body">
                <div className="relative">
                    <textarea className="w-full p-3 pr-12 border border-slate-300 rounded-lg text-sm" rows="3"
                        placeholder="Additional observations, recommendations, or notes for this zone..."
                        value=${zone.notes || ''}
                        onInput=${(e) => onChange({ ...zone, notes: e.target.value })} />
                    <div className="absolute top-2 right-2">
                        <${VoiceButton} onText=${appendVoice} />
                    </div>
                </div>
            </div>
        </div>`;
    }

    // ═══════════════════════════════════════════════════════════════
    // TOOLBAR
    // ═══════════════════════════════════════════════════════════════

    function Toolbar({ state, onSave, onLoad, onMerge, onPDF, onHTML }) {
        return html`
        <div className="fra-toolbar">
            <span className="fra-toolbar-title"> </span>
            <div className="fra-toolbar-group">
                <button type="button" className="fra-toolbar-btn fra-btn-data" onClick=${onSave}>Save</button>
                <button type="button" className="fra-toolbar-btn fra-btn-data" onClick=${onLoad}>Load</button>
                <button type="button" className="fra-toolbar-btn fra-btn-data" onClick=${onMerge}>Merge</button>
            </div>
            <div className="fra-toolbar-group">
                <button type="button" className="fra-toolbar-btn fra-btn-export" onClick=${onPDF}>PDF</button>
                <button type="button" className="fra-toolbar-btn fra-btn-export" onClick=${onHTML}>HTML</button>
            </div>
        </div>`;
    }

    // ═══════════════════════════════════════════════════════════════
    // EXPORT
    // ═══════════════════════════════════════════════════════════════

    window.FRA.components = {
        ZonePhotos,
        ZoneDescription,
        ZoneChecklist,
        ZoneResults,
        ZoneNotes,
        Toolbar,
        VoiceButton,
        Spinner
    };

})();
