/**
 * fra-floorplan.js — Fire Risk Assessment: Interactive Floor Plan Tab
 *
 * Rewritten from scratch for reliability.
 * Uses native DOM event listeners on the canvas (not React synthetic events)
 * to avoid stale-closure issues with useCallback/useState.
 *
 * Features:
 * - Upload floor plan image
 * - Floating dropdown to pick which zone to draw
 * - Draw zone rectangles on canvas (click canvas → pick zone → drag to draw)
 * - Double-click to select → move, resize, delete
 * - Heat map overlay toggle
 *
 * Uses React 18 + htm + Canvas API.
 */
(function () {
    'use strict';

    window.FRA = window.FRA || {};
    const { createElement: h, useState, useEffect, useRef, useCallback } = React;
    const html = htm.bind(h);

    const ZONE_COLORS = ['#ea580c','#2563eb','#16a34a','#dc2626','#7c3aed','#0891b2','#db2777','#65a30d','#d97706','#6366f1'];
    const HANDLE_SIZE = 8;

    // ─── Draw fire icon + FTRI score at center of a zone rect ────
    // Scales dynamically: score 0→100 maps to size 18px→52px
    function drawFireBadge(ctx, rx, ry, rw, rh, score, categoryColor, categoryLabel) {
        const cx = rx + rw / 2;
        const cy = ry + rh / 2;

        // Scale: score 1→100 maps card half-width 28→72px (very visible range)
        const t = score / 100;
        const cardW = 56 + t * 88;   // 56px (score≈0) → 144px (score=100)
        const cardH = cardW * 0.62;
        const cornerR = cardH * 0.22;
        const fireSize = 18 + t * 32; // 18px → 50px emoji
        const borderW = 2 + t * 4;    // 2px → 6px border

        ctx.save();

        // ── Drop shadow (category-colored) ───────────────────────
        ctx.shadowColor = categoryColor;
        ctx.shadowBlur = 18 + t * 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2 + t * 4;

        // ── Outer glow ring (score-color) ────────────────────────
        ctx.beginPath();
        roundRect(ctx, cx - cardW/2 - borderW, cy - cardH/2 - borderW,
                  cardW + borderW*2, cardH + borderW*2, cornerR + borderW);
        ctx.fillStyle = categoryColor;
        ctx.globalAlpha = 0.45 + t * 0.4;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowColor = 'transparent';

        // ── White card face ───────────────────────────────────────
        ctx.beginPath();
        roundRect(ctx, cx - cardW/2, cy - cardH/2, cardW, cardH, cornerR);
        ctx.fillStyle = 'rgba(255,255,255,0.97)';
        ctx.fill();

        // ── Colored top strip (fills top 38% of card) ────────────
        ctx.save();
        ctx.beginPath();
        roundRect(ctx, cx - cardW/2, cy - cardH/2, cardW, cardH * 0.38, cornerR);
        ctx.fillStyle = categoryColor;
        ctx.globalAlpha = 0.90;
        ctx.fill();
        ctx.restore();

        // ── Colored border ────────────────────────────────────────
        ctx.beginPath();
        roundRect(ctx, cx - cardW/2, cy - cardH/2, cardW, cardH, cornerR);
        ctx.strokeStyle = categoryColor;
        ctx.lineWidth = borderW;
        ctx.stroke();

        // ── Fire emoji (centered in top strip) ───────────────────
        ctx.font = fireSize + 'px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔥', cx, cy - cardH/2 + cardH * 0.19);

        // ── Score number (big, bold) ──────────────────────────────
        const scoreFontSize = Math.round(11 + t * 18); // 11→29px
        ctx.font = 'bold ' + scoreFontSize + 'px sans-serif';
        ctx.fillStyle = categoryColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(score + '/100', cx, cy + cardH * 0.12);

        // ── Category label (e.g. LOW / MEDIUM / HIGH / CRITICAL) ─
        const labelFontSize = Math.max(8, Math.round(7 + t * 7)); // 7→14px
        ctx.font = 'bold ' + labelFontSize + 'px sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((categoryLabel || '').toUpperCase(), cx, cy + cardH * 0.38);

        ctx.restore();
    }

    // Polyfill for roundRect (not in all browsers/canvas impls)
    function roundRect(ctx, x, y, w, h, r) {
        if (ctx.roundRect) {
            ctx.roundRect(x, y, w, h, r);
        } else {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // FIRE BADGE — React SVG overlay (vibrant, animated)
    // ═══════════════════════════════════════════════════════════════

    function FireBadgeSVG({ score, color, label }) {
        const t = score / 100;
        const cr  = Math.round(40 + t * 28);      // circle radius: 40 → 68px
        const pad = 16;
        const labelH = 24;
        const totalW = (cr + pad) * 2;
        const totalH = (cr + pad) * 2 + labelH + 8;
        const cx = totalW / 2;
        const cy = cr + pad;
        const fireSize  = Math.round(cr * 0.88);
        const scoreFsz  = Math.round(cr * 0.36);
        const labelFsz  = Math.round(9 + t * 4);
        const labelW    = Math.round(totalW * 0.88);
        const labelX    = (totalW - labelW) / 2;
        const labelY    = cy + cr + 9;
        const uid       = 'fbc' + score;
        const ringW     = (2.5 + t * 4).toFixed(1);
        const pulseDur  = (1.3 + (1 - t) * 0.7).toFixed(2) + 's';
        const flameDur  = (1.5 + (1 - t) * 0.6).toFixed(2) + 's';

        return html`
        <svg width=${totalW} height=${totalH}
            viewBox=${`0 0 ${totalW} ${totalH}`}
            xmlns="http://www.w3.org/2000/svg"
            style=${{ overflow: 'visible', display: 'block' }}>
            <defs>
                <!-- Radial gradient: large white interior → narrow tinted rim -->
                <radialGradient id=${uid + '-rg'} cx="50%" cy="45%" r="55%" fx="50%" fy="40%">
                    <stop offset="0%"   stopColor="#ffffff"/>
                    <stop offset="78%"  stopColor="#ffffff"/>
                    <stop offset="92%"  stopColor="#ffffff" stopOpacity="0.92"/>
                    <stop offset="100%" stopColor=${color} stopOpacity="0.22"/>
                </radialGradient>
                <!-- Flame glow filter -->
                <filter id=${uid + '-glow'} x="-70%" y="-70%" width="240%" height="240%">
                    <feGaussianBlur stdDeviation=${3 + t * 5} result="b"/>
                    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <!-- Blurred halo behind circle -->
                <filter id=${uid + '-halo'} x="-80%" y="-80%" width="260%" height="260%">
                    <feGaussianBlur stdDeviation=${14 + t * 16}/>
                </filter>
                <!-- Colored drop shadow -->
                <filter id=${uid + '-shadow'} x="-40%" y="-40%" width="180%" height="200%">
                    <feDropShadow dx="0" dy=${2 + t * 5} stdDeviation=${4 + t * 7}
                        floodColor=${color} floodOpacity=${0.55 + t * 0.3}/>
                </filter>
                <!-- Label pill gradient -->
                <linearGradient id=${uid + '-label'} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%"   stopColor=${color}/>
                    <stop offset="100%" stopColor=${color} stopOpacity="0.82"/>
                </linearGradient>
            </defs>

            <!-- Soft blurred halo (color-matched, static) -->
            <circle cx=${cx} cy=${cy} r=${cr + 10}
                fill=${color} opacity=${0.30 + t * 0.32}
                filter=${`url(#${uid}-halo)`}/>

            <!-- Pulsing animated ring -->
            <circle cx=${cx} cy=${cy} r=${cr + 6}
                fill="none"
                stroke=${color} strokeWidth=${2 + t * 3.5}
                opacity="0.65"
                style=${{ animation: `fra-badge-pulse ${pulseDur} ease-in-out infinite`,
                           transformOrigin: `${cx}px ${cy}px` }}/>

            <!-- Main circle — white/radial fill + colored border -->
            <circle cx=${cx} cy=${cy} r=${cr}
                fill=${`url(#${uid}-rg)`}
                stroke=${color} strokeWidth=${ringW}
                filter=${`url(#${uid}-shadow)`}/>

            <!-- Animated flame emoji, upper half of circle -->
            <text x=${cx} y=${cy - cr * 0.06}
                fontSize=${fireSize}
                textAnchor="middle" dominantBaseline="middle"
                filter=${`url(#${uid}-glow)`}
                style=${{ animation: `fra-badge-flame ${flameDur} ease-in-out infinite`,
                           transformOrigin: `${cx}px ${cy - cr * 0.06}px` }}>🔥</text>

            <!-- Score inside circle, lower third -->
            <text x=${cx} y=${cy + cr * 0.62}
                fontSize=${scoreFsz} fontWeight="900"
                textAnchor="middle" dominantBaseline="middle"
                fill=${color} fontFamily="system-ui,sans-serif">
                ${score}<tspan fontSize=${Math.round(scoreFsz * 0.62)} fontWeight="600" fill=${color} opacity="0.7">/100</tspan>
            </text>

            <!-- Color-coded label pill below circle -->
            <rect x=${labelX} y=${labelY}
                width=${labelW} height=${labelH}
                rx=${labelH / 2} ry=${labelH / 2}
                fill=${`url(#${uid}-label)`}
                filter=${`url(#${uid}-shadow)`}/>
            <text x=${cx} y=${labelY + labelH / 2 + 0.5}
                fontSize=${labelFsz} fontWeight="800"
                textAnchor="middle" dominantBaseline="middle"
                fill="#ffffff" fontFamily="system-ui,sans-serif"
                letterSpacing="2">
                ${(label || '').toUpperCase()}
            </text>
        </svg>`;
    }

    // ═══════════════════════════════════════════════════════════════
    // FLOOR PLAN TAB COMPONENT
    // ═══════════════════════════════════════════════════════════════

    function FloorPlanTab({ zones, floorPlanImg, onFloorPlanImgChange, onZonesChange }) {
        // DOM refs
        const canvasRef = useRef(null);
        const containerRef = useRef(null);
        const fileRef = useRef(null);
        const pickerRef = useRef(null);
        const searchInputRef = useRef(null);
        const imgRef = useRef(null);

        // UI state (triggers re-render for the template)
        const [drawingMode, setDrawingMode] = useState('draw');
        const [showHeatMap, setShowHeatMap] = useState(false);
        const [selectedRect, setSelectedRect] = useState(null);
        const [pickerOpen, setPickerOpen] = useState(false);
        const [pickerPos, setPickerPos] = useState({ x: 0, y: 0 });
        const [pickerSearch, setPickerSearch] = useState('');

        // Mutable state ref — all imperative canvas handlers read from here
        // to avoid stale-closure issues. Synced from React state/props via useEffect.
        const S = useRef({
            drawingMode: 'draw',
            selectedZoneIdx: 0,
            readyToDraw: false,
            pickerOpen: false,
            drawing: false,
            drawStart: null,
            drawEnd: null,
            selectedRect: null,
            dragOffset: { x: 0, y: 0 },
            zones: zones,
            showHeatMap: false
        });

        // Keep mutable ref in sync with React state/props
        useEffect(() => { S.current.zones = zones; }, [zones]);
        useEffect(() => { S.current.drawingMode = drawingMode; }, [drawingMode]);
        useEffect(() => { S.current.showHeatMap = showHeatMap; }, [showHeatMap]);
        useEffect(() => { S.current.selectedRect = selectedRect; }, [selectedRect]);
        useEffect(() => { S.current.pickerOpen = pickerOpen; }, [pickerOpen]);

        // ─── Upload handler ───────────────────────────────────────
        const handleUploadImg = useCallback((e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => onFloorPlanImgChange(ev.target.result);
            reader.readAsDataURL(file);
        }, [onFloorPlanImgChange]);

        // ─── Canvas redraw ────────────────────────────────────────
        const redraw = useCallback(() => {
            const canvas = canvasRef.current;
            const img = imgRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const cw = canvas.width, ch = canvas.height;
            const s = S.current;
            const zs = s.zones;
            ctx.clearRect(0, 0, cw, ch);

            // Background
            if (img && img.complete && img.naturalWidth > 0) {
                ctx.drawImage(img, 0, 0, cw, ch);
            } else {
                ctx.fillStyle = '#f1f5f9';
                ctx.fillRect(0, 0, cw, ch);
                ctx.fillStyle = '#94a3b8';
                ctx.font = '16px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('Upload a floor plan image', cw / 2, ch / 2);
            }

            // Heat map overlay
            if (s.showHeatMap) {
                zs.forEach((z) => {
                    if (!z.mapRect) return;
                    const score = z.result ? z.result.score : 0;
                    let color;
                    if (score >= 80) color = 'rgba(220,38,38,0.40)';
                    else if (score >= 60) color = 'rgba(234,88,12,0.35)';
                    else if (score >= 30) color = 'rgba(234,179,8,0.30)';
                    else color = 'rgba(22,163,74,0.25)';
                    ctx.fillStyle = color;
                    ctx.fillRect(z.mapRect.x * cw, z.mapRect.y * ch, z.mapRect.w * cw, z.mapRect.h * ch);
                });
            }

            // Zone rectangles
            zs.forEach((z, i) => {
                const r = z.mapRect;
                if (!r) return;
                const rx = r.x * cw, ry = r.y * ch, rw = r.w * cw, rh = r.h * ch;
                const c = ZONE_COLORS[i % ZONE_COLORS.length];
                const isSel = s.selectedRect && s.selectedRect.zoneIdx === i;
                ctx.strokeStyle = c;
                ctx.lineWidth = isSel ? 3 : 2;
                ctx.setLineDash(isSel ? [] : [6, 3]);
                ctx.strokeRect(rx, ry, rw, rh);
                ctx.setLineDash([]);

                // Label
                ctx.fillStyle = c;
                ctx.font = 'bold 12px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(z.name || ('Zone ' + (i + 1)), rx + 4, ry - 4 > 14 ? ry - 4 : ry + 14);

                // Score label (corner)
                if (z.result) {
                    ctx.fillStyle = z.result.category.color;
                    ctx.font = 'bold 11px sans-serif';
                    ctx.fillText(z.result.score + '/100', rx + rw - 50, ry - 4 > 14 ? ry - 4 : ry + 14);
                }

                // (Fire badge rendered via React SVG overlay — see below)

                // Resize handles
                if (isSel) {
                    ctx.fillStyle = '#4f46e5';
                    const hs = HANDLE_SIZE;
                    [[rx - hs/2, ry - hs/2], [rx + rw - hs/2, ry - hs/2],
                     [rx - hs/2, ry + rh - hs/2], [rx + rw - hs/2, ry + rh - hs/2]].forEach(([hx, hy]) => {
                        ctx.fillRect(hx, hy, hs, hs);
                    });
                }
            });

            // Drawing preview
            if (s.drawing && s.drawStart && s.drawEnd) {
                const c = ZONE_COLORS[s.selectedZoneIdx % ZONE_COLORS.length];
                ctx.strokeStyle = c;
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                const x = Math.min(s.drawStart.x, s.drawEnd.x) * cw;
                const y = Math.min(s.drawStart.y, s.drawEnd.y) * ch;
                const w = Math.abs(s.drawEnd.x - s.drawStart.x) * cw;
                const hh = Math.abs(s.drawEnd.y - s.drawStart.y) * ch;
                ctx.strokeRect(x, y, w, hh);
                ctx.setLineDash([]);
            }
        }, []); // No deps — reads everything from S.current

        // Redraw whenever zones/state changes
        useEffect(() => { redraw(); }, [zones, showHeatMap, selectedRect, redraw]);

        // Load image
        useEffect(() => {
            if (!floorPlanImg) { imgRef.current = null; redraw(); return; }
            const img = new Image();
            img.onload = () => {
                imgRef.current = img;
                if (canvasRef.current && containerRef.current) {
                    const ratio = img.naturalWidth / img.naturalHeight;
                    const w = containerRef.current.offsetWidth || 800;
                    canvasRef.current.width = w;
                    canvasRef.current.height = w / ratio;
                }
                redraw();
            };
            img.src = floorPlanImg;
        }, [floorPlanImg, redraw]);

        // Resize
        useEffect(() => {
            const onResize = () => {
                if (canvasRef.current && imgRef.current && containerRef.current) {
                    const w = containerRef.current.offsetWidth;
                    const ratio = imgRef.current.naturalWidth / imgRef.current.naturalHeight;
                    canvasRef.current.width = w;
                    canvasRef.current.height = w / ratio;
                    redraw();
                }
            };
            window.addEventListener('resize', onResize);
            return () => window.removeEventListener('resize', onResize);
        }, [redraw]);

        // ─── Helpers (plain functions, read from refs) ────────────
        function getPos(e) {
            const cvs = canvasRef.current;
            if (!cvs) return { x: 0, y: 0 };
            const rect = cvs.getBoundingClientRect();
            const cx = e.touches ? e.touches[0].clientX : e.clientX;
            const cy = e.touches ? e.touches[0].clientY : e.clientY;
            return { x: (cx - rect.left) / rect.width, y: (cy - rect.top) / rect.height };
        }

        function findZoneAt(pos) {
            const zs = S.current.zones;
            for (let i = zs.length - 1; i >= 0; i--) {
                const r = zs[i].mapRect;
                if (!r) continue;
                if (pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h) return i;
            }
            return -1;
        }

        function findHandle(pos) {
            const s = S.current;
            if (!s.selectedRect) return null;
            const r = s.zones[s.selectedRect.zoneIdx]?.mapRect;
            if (!r) return null;
            const cvs = canvasRef.current;
            if (!cvs) return null;
            const hT = HANDLE_SIZE / cvs.width * 1.5;
            const corners = [
                { name: 'nw', x: r.x, y: r.y },
                { name: 'ne', x: r.x + r.w, y: r.y },
                { name: 'sw', x: r.x, y: r.y + r.h },
                { name: 'se', x: r.x + r.w, y: r.y + r.h }
            ];
            for (const c of corners) {
                if (Math.abs(pos.x - c.x) < hT && Math.abs(pos.y - c.y) < hT) return c.name;
            }
            return null;
        }

        // ─── Imperative canvas event handlers ─────────────────────
        // Attached via useEffect with native DOM listeners to bypass
        // React synthetic events and avoid stale closures entirely.
        useEffect(() => {
            const cvs = canvasRef.current;
            if (!cvs) return;
            const s = S.current;

            function onMouseDown(e) {
                e.preventDefault();
                const pos = getPos(e);

                // If picker is showing, clicking the canvas closes it
                if (s.pickerOpen) {
                    s.pickerOpen = false;
                    setPickerOpen(false);
                    return;
                }

                // Double-click → select zone
                if (e.detail === 2) {
                    const zi = findZoneAt(pos);
                    if (zi >= 0) {
                        s.selectedRect = { zoneIdx: zi, handle: null };
                        setSelectedRect({ zoneIdx: zi, handle: null });
                        s.drawingMode = 'select';
                        setDrawingMode('select');
                    }
                    return;
                }

                // Select mode
                if (s.drawingMode === 'select') {
                    const handle = findHandle(pos);
                    if (handle) {
                        s.selectedRect = { ...s.selectedRect, handle };
                        setSelectedRect({ ...s.selectedRect, handle });
                        s.dragOffset = pos;
                        return;
                    }
                    const zi = findZoneAt(pos);
                    if (zi >= 0) {
                        const r = s.zones[zi].mapRect;
                        s.selectedRect = { zoneIdx: zi, handle: 'move' };
                        setSelectedRect({ zoneIdx: zi, handle: 'move' });
                        s.dragOffset = { x: pos.x - r.x, y: pos.y - r.y };
                        return;
                    }
                    s.selectedRect = null;
                    setSelectedRect(null);
                    return;
                }

                // Draw mode — if a zone was already picked, start drawing
                if (s.readyToDraw) {
                    s.drawing = true;
                    s.drawStart = pos;
                    s.drawEnd = pos;
                    s.readyToDraw = false;
                    redraw();
                    return;
                }

                // Draw mode — open floating zone picker at cursor position
                const rect = cvs.getBoundingClientRect();
                const cx = e.touches ? e.touches[0].clientX : e.clientX;
                const cy = e.touches ? e.touches[0].clientY : e.clientY;
                s.pickerOpen = true;
                setPickerPos({ x: cx - rect.left, y: cy - rect.top });
                setPickerSearch('');
                setPickerOpen(true);
                setTimeout(() => { if (searchInputRef.current) searchInputRef.current.focus(); }, 60);
            }

            function onMouseMove(e) {
                e.preventDefault();
                const pos = getPos(e);

                // Handle drag (move/resize)
                if (s.selectedRect && s.selectedRect.handle) {
                    const zi = s.selectedRect.zoneIdx;
                    const r = { ...s.zones[zi].mapRect };
                    if (s.selectedRect.handle === 'move') {
                        r.x = Math.max(0, Math.min(1 - r.w, pos.x - s.dragOffset.x));
                        r.y = Math.max(0, Math.min(1 - r.h, pos.y - s.dragOffset.y));
                    } else {
                        const handlers = {
                            nw: () => { const dx = pos.x - r.x; const dy = pos.y - r.y; r.x = pos.x; r.y = pos.y; r.w -= dx; r.h -= dy; },
                            ne: () => { const dy = pos.y - r.y; r.w = pos.x - r.x; r.y = pos.y; r.h -= dy; },
                            sw: () => { const dx = pos.x - r.x; r.x = pos.x; r.w -= dx; r.h = pos.y - r.y; },
                            se: () => { r.w = pos.x - r.x; r.h = pos.y - r.y; }
                        };
                        if (handlers[s.selectedRect.handle]) handlers[s.selectedRect.handle]();
                        if (r.w < 0.02) r.w = 0.02;
                        if (r.h < 0.02) r.h = 0.02;
                    }
                    const newZones = [...s.zones];
                    newZones[zi] = { ...newZones[zi], mapRect: r };
                    s.zones = newZones;
                    onZonesChange(newZones);
                    return;
                }

                // Drawing preview
                if (s.drawing) {
                    s.drawEnd = pos;
                    redraw();
                }
            }

            function onMouseUp() {
                // End drag
                if (s.selectedRect && s.selectedRect.handle) {
                    s.selectedRect = { ...s.selectedRect, handle: null };
                    setSelectedRect({ ...s.selectedRect, handle: null });
                    return;
                }

                // End draw
                if (s.drawing && s.drawStart && s.drawEnd) {
                    const x = Math.min(s.drawStart.x, s.drawEnd.x);
                    const y = Math.min(s.drawStart.y, s.drawEnd.y);
                    const w = Math.abs(s.drawEnd.x - s.drawStart.x);
                    const hh = Math.abs(s.drawEnd.y - s.drawStart.y);
                    if (w > 0.02 && hh > 0.02 && s.zones[s.selectedZoneIdx]) {
                        const newZones = [...s.zones];
                        newZones[s.selectedZoneIdx] = { ...newZones[s.selectedZoneIdx], mapRect: { x, y, w, h: hh } };
                        s.zones = newZones;
                        onZonesChange(newZones);
                    }
                }
                s.drawing = false;
                s.drawStart = null;
                s.drawEnd = null;
                redraw();
            }

            // Attach native DOM listeners (bypasses React synthetic event system)
            cvs.addEventListener('mousedown', onMouseDown);
            cvs.addEventListener('mousemove', onMouseMove);
            cvs.addEventListener('mouseup', onMouseUp);
            cvs.addEventListener('touchstart', onMouseDown, { passive: false });
            cvs.addEventListener('touchmove', onMouseMove, { passive: false });
            cvs.addEventListener('touchend', onMouseUp);

            return () => {
                cvs.removeEventListener('mousedown', onMouseDown);
                cvs.removeEventListener('mousemove', onMouseMove);
                cvs.removeEventListener('mouseup', onMouseUp);
                cvs.removeEventListener('touchstart', onMouseDown);
                cvs.removeEventListener('touchmove', onMouseMove);
                cvs.removeEventListener('touchend', onMouseUp);
            };
        }, [onZonesChange, redraw]); // Re-attach only when callback identity changes

        // ─── Keyboard shortcuts ───────────────────────────────────
        useEffect(() => {
            function onKey(e) {
                const s = S.current;
                if ((e.key === 'Delete' || e.key === 'Backspace') && s.selectedRect && !e.target.closest('input,textarea,select')) {
                    e.preventDefault();
                    const newZones = [...s.zones];
                    newZones[s.selectedRect.zoneIdx] = { ...newZones[s.selectedRect.zoneIdx], mapRect: null };
                    s.zones = newZones;
                    onZonesChange(newZones);
                    s.selectedRect = null;
                    setSelectedRect(null);
                }
                if (e.key === 'Escape') {
                    s.selectedRect = null;
                    setSelectedRect(null);
                    s.pickerOpen = false;
                    setPickerOpen(false);
                }
            }
            window.addEventListener('keydown', onKey);
            return () => window.removeEventListener('keydown', onKey);
        }, [onZonesChange]);

        // ─── Picker: pick a zone then draw ────────────────────────
        function startDrawFromPicker(zoneIdx) {
            const s = S.current;
            s.selectedZoneIdx = zoneIdx;
            s.readyToDraw = true;
            s.pickerOpen = false;
            s.drawingMode = 'draw';
            s.selectedRect = null;
            setPickerOpen(false);
            setDrawingMode('draw');
            setSelectedRect(null);
        }

        // Delete selected rect (for toolbar button)
        function deleteSel() {
            const s = S.current;
            if (!s.selectedRect) return;
            const newZones = [...s.zones];
            newZones[s.selectedRect.zoneIdx] = { ...newZones[s.selectedRect.zoneIdx], mapRect: null };
            s.zones = newZones;
            onZonesChange(newZones);
            s.selectedRect = null;
            setSelectedRect(null);
        }

        // Filtered zones for picker
        const filteredZones = zones.map((z, i) => ({ zone: z, idx: i })).filter(({ zone }) => {
            if (!pickerSearch.trim()) return true;
            return (zone.name || '').toLowerCase().includes(pickerSearch.toLowerCase());
        });

        // ─── Render ───────────────────────────────────────────────
        return html`
        <div className="space-y-4 fra-fade-in">
            <!-- Toolbar -->
            <div className="flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="font-bold text-sm text-slate-700">\u{1F5FA}\u{FE0F} Floor Plan</span>
                <div className="border-l border-slate-300 h-6 mx-1"></div>
                <input ref=${fileRef} type="file" accept="image/*" className="hidden" onChange=${handleUploadImg} />
                <button type="button" onClick=${() => fileRef.current.click()}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-100 transition">
                    \u{1F5BC}\u{FE0F} Upload Plan
                </button>
                <div className="border-l border-slate-300 h-6 mx-1"></div>
                <button type="button"
                    onClick=${() => {
                        const next = drawingMode === 'draw' ? 'select' : 'draw';
                        S.current.drawingMode = next;
                        S.current.selectedRect = null;
                        S.current.pickerOpen = false;
                        S.current.readyToDraw = false;
                        setDrawingMode(next);
                        setSelectedRect(null);
                        setPickerOpen(false);
                    }}
                    className=${drawingMode === 'select'
                        ? 'px-3 py-1.5 rounded-lg text-xs font-semibold transition bg-indigo-600 text-white'
                        : 'px-3 py-1.5 rounded-lg text-xs font-semibold transition bg-white border border-slate-300 hover:bg-slate-100'}>
                    ${drawingMode === 'select' ? '\u270B Select Mode' : '\u270F\u{FE0F} Draw Mode'}
                </button>
                ${drawingMode === 'draw' ? html`<span className="text-xs text-indigo-600 font-medium">Click on canvas to pick a zone, then drag to draw</span>` : ''}
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                    <input type="checkbox" checked=${showHeatMap} onChange=${(e) => {
                        S.current.showHeatMap = e.target.checked;
                        setShowHeatMap(e.target.checked);
                    }} className="h-4 w-4 rounded text-orange-600 focus:ring-orange-500" />
                    Heat Map
                </label>
                ${selectedRect ? html`
                <button type="button" onClick=${deleteSel}
                    className="ml-auto px-3 py-1.5 bg-red-100 text-red-700 border border-red-300 rounded-lg text-xs font-semibold hover:bg-red-200 transition">
                    \u{1F5D1}\u{FE0F} Delete Zone Rect
                </button>` : ''}
            </div>

            <!-- Canvas + floating picker overlay -->
            <div ref=${containerRef} className="fra-floorplan-canvas-wrap" style=${{ position: 'relative' }}>
                <canvas ref=${canvasRef} width="800" height="500"
                    style=${{ cursor: drawingMode === 'select' ? 'default' : 'crosshair', display: 'block', width: '100%' }}
                />

                <!-- React SVG fire badge overlay — pointer-events:none so canvas interactions pass through -->
                <div style=${{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                    ${zones.map((z, i) => {
                        if (!z.mapRect || !z.result || z.result.score <= 0) return null;
                        const r = z.mapRect;
                        return html`
                        <div key=${i} style=${{
                            position: 'absolute',
                            left: (r.x * 100) + '%',
                            top: (r.y * 100) + '%',
                            width: (r.w * 100) + '%',
                            height: (r.h * 100) + '%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            ${h(FireBadgeSVG, {
                                score: z.result.score,
                                color: z.result.category.color,
                                label: z.result.category.label
                            })}
                        </div>`;
                    })}
                </div>
                ${pickerOpen ? html`
                <div ref=${pickerRef} className="fra-fp-floating-picker"
                    style=${{ left: Math.min(pickerPos.x, (containerRef.current ? containerRef.current.offsetWidth - 220 : pickerPos.x)) + 'px',
                              top: Math.min(pickerPos.y, (canvasRef.current ? canvasRef.current.height - 180 : pickerPos.y)) + 'px' }}>
                    <input ref=${searchInputRef} type="text" placeholder="\u{1F50D} Search zone..."
                        value=${pickerSearch} onInput=${(e) => setPickerSearch(e.target.value)}
                        onKeyDown=${(e) => {
                            if (e.key === 'Enter' && filteredZones.length > 0) startDrawFromPicker(filteredZones[0].idx);
                            if (e.key === 'Escape') { S.current.pickerOpen = false; setPickerOpen(false); }
                        }} />
                    <div className="fra-fp-picker-list">
                        ${filteredZones.map(({ zone: z, idx: i }) => {
                            const c = ZONE_COLORS[i % ZONE_COLORS.length];
                            return html`<div key=${i}
                                className=${`fra-fp-picker-item ${S.current.selectedZoneIdx === i ? 'selected' : ''}`}
                                onClick=${() => startDrawFromPicker(i)}>
                                <span className="w-3 h-3 rounded-sm flex-shrink-0" style=${{ backgroundColor: c }}></span>
                                <span className="flex-1">${z.name || ('Zone ' + (i + 1))}</span>
                                ${z.mapRect ? html`<span className="text-xs text-slate-400">\u2713 drawn</span>` : ''}
                            </div>`;
                        })}
                        ${filteredZones.length === 0 ? html`<div className="text-xs text-slate-400 p-2 text-center">No matching zones</div>` : ''}
                    </div>
                </div>` : ''}
            </div>

            <!-- Legend -->
            <div className="flex flex-wrap gap-3 text-xs">
                ${zones.map((z, i) => {
                    const c = ZONE_COLORS[i % ZONE_COLORS.length];
                    const hasRect = !!z.mapRect;
                    return html`
                    <div key=${i} className=${`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${hasRect ? 'border-slate-300 bg-white' : 'border-dashed border-slate-300 bg-slate-50 text-slate-400 italic'}`}>
                        <span className="w-3 h-3 rounded-sm flex-shrink-0" style=${{ backgroundColor: c }}></span>
                        ${z.name || ('Zone ' + (i + 1))}
                        ${z.result ? html`<span className="font-bold" style=${{ color: z.result.category.color }}>${z.result.score}</span>` : ''}
                        ${!hasRect ? ' (not drawn)' : ''}
                    </div>`;
                })}
            </div>

            <!-- Instructions -->
            <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-200">
                <strong>How to use:</strong> In Draw Mode, click on the canvas \u2014 a searchable zone picker appears near your cursor. Pick a zone, then drag to draw its boundary.
                <strong>Double-click</strong> a drawn zone to select it \u2014 then drag to move, use corner handles to resize, or press <kbd className="px-1 py-0.5 bg-white border rounded text-xs">Delete</kbd> to remove.
                Toggle <strong>Heat Map</strong> to overlay risk scores.
            </div>
        </div>`;
    }

    // ═══════════════════════════════════════════════════════════════
    // HEAT MAP IMAGE CAPTURE (for PDF/HTML export)
    // ═══════════════════════════════════════════════════════════════

    function renderHeatMapToDataURL(zones, floorPlanImg, width) {
        return new Promise((resolve) => {
            const w = width || 800;
            const cvs = document.createElement('canvas');
            const ctx = cvs.getContext('2d');

            const draw = (img) => {
                const ratio = img ? img.naturalWidth / img.naturalHeight : 1.6;
                const ch = Math.round(w / ratio);
                cvs.width = w;
                cvs.height = ch;

                if (img) {
                    ctx.drawImage(img, 0, 0, w, ch);
                } else {
                    ctx.fillStyle = '#f1f5f9';
                    ctx.fillRect(0, 0, w, ch);
                }

                // Heat map overlay
                zones.forEach((z) => {
                    const rect = z.mapRect;
                    if (!rect) return;
                    const score = z.result ? z.result.score : 0;
                    let color;
                    if (score >= 80) color = 'rgba(220,38,38,0.45)';
                    else if (score >= 60) color = 'rgba(234,88,12,0.40)';
                    else if (score >= 30) color = 'rgba(234,179,8,0.35)';
                    else color = 'rgba(22,163,74,0.30)';
                    ctx.fillStyle = color;
                    ctx.fillRect(rect.x * w, rect.y * ch, rect.w * w, rect.h * ch);
                });

                // Zone outlines + labels
                zones.forEach((z, i) => {
                    const rect = z.mapRect;
                    if (!rect) return;
                    const rx = rect.x * w, ry = rect.y * ch, rw = rect.w * w, rh = rect.h * ch;
                    const c = ZONE_COLORS[i % ZONE_COLORS.length];
                    ctx.strokeStyle = c;
                    ctx.lineWidth = 2;
                    ctx.strokeRect(rx, ry, rw, rh);

                    // Fire badge at center
                    if (z.result && z.result.score > 0) {
                        drawFireBadge(ctx, rx, ry, rw, rh, z.result.score, z.result.category.color, z.result.category.label);
                    }

                    ctx.font = 'bold 13px sans-serif';
                    const label = z.name || ('Zone ' + (i + 1));
                    const scoreStr = z.result ? ' \u2014 ' + z.result.score + '/100 ' + z.result.category.label : '';
                    const fullLabel = label + scoreStr;
                    const tm = ctx.measureText(fullLabel);
                    const ly = ry > 20 ? ry - 6 : ry + 16;
                    ctx.fillStyle = 'rgba(255,255,255,0.85)';
                    ctx.fillRect(rx, ly - 12, tm.width + 8, 16);
                    ctx.fillStyle = c;
                    ctx.textAlign = 'left';
                    ctx.fillText(fullLabel, rx + 4, ly);
                });

                // Legend bar
                const legendY = cvs.height - 24;
                const legendItems = [
                    { label: 'CRITICAL \u226580', color: 'rgba(220,38,38,0.7)' },
                    { label: 'HIGH \u226560', color: 'rgba(234,88,12,0.7)' },
                    { label: 'MEDIUM \u226530', color: 'rgba(234,179,8,0.7)' },
                    { label: 'LOW <30', color: 'rgba(22,163,74,0.7)' }
                ];
                ctx.fillStyle = 'rgba(255,255,255,0.9)';
                ctx.fillRect(0, legendY - 4, w, 28);
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'left';
                let lx = 10;
                legendItems.forEach(item => {
                    ctx.fillStyle = item.color;
                    ctx.fillRect(lx, legendY, 14, 14);
                    ctx.fillStyle = '#1e293b';
                    ctx.fillText(item.label, lx + 18, legendY + 11);
                    lx += ctx.measureText(item.label).width + 32;
                });

                resolve(cvs.toDataURL('image/png'));
            };

            if (floorPlanImg) {
                const img = new Image();
                img.onload = () => draw(img);
                img.onerror = () => draw(null);
                img.src = floorPlanImg;
            } else {
                draw(null);
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // EXPORT
    // ═══════════════════════════════════════════════════════════════

    window.FRA.floorplan = { FloorPlanTab, renderHeatMapToDataURL };

})();
