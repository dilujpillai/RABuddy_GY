/**
 * fra-app.js — Fire Risk Assessment: Main React App Entry Point
 *
 * Manages application state, zone tabs, sub-tab routing (zones vs floor plan),
 * wires together all components, and exposes window.FireRiskAssessment API.
 */
(function () {
    'use strict';

    window.FRA = window.FRA || {};
    const { createElement: h, useState, useCallback, useRef, useEffect, Fragment } = React;
    const html = htm.bind(h);
    const D = () => window.FRA.data;
    const C = () => window.FRA.components;
    const R = () => window.FRA.reports;
    const FP = () => window.FRA.floorplan;

    // ═══════════════════════════════════════════════════════════════
    // MAIN APP COMPONENT
    // ═══════════════════════════════════════════════════════════════

    function FRAApp() {
        const [zones, setZones] = useState([D().createBlankZone()]);
        const [activeIdx, setActiveIdx] = useState(0);
        const [subTab, setSubTab] = useState('zone'); // 'zone' | 'floorplan'
        const [floorPlanImg, setFloorPlanImg] = useState(null);
        const [, forceUpdate] = useState(0);
        const [editingTabIdx, setEditingTabIdx] = useState(-1);
        const editInputRef = useCallback((node) => {
            if (node) { node.focus(); node.select(); }
        }, []);

        const zone = zones[activeIdx] || zones[0];

        // Helper: update current zone
        const updateZone = useCallback((newZone) => {
            setZones(prev => {
                const copy = [...prev];
                copy[activeIdx] = newZone;
                return copy;
            });
        }, [activeIdx]);

        // Add zone
        const addZone = useCallback(() => {
            const newZone = D().createBlankZone();
            newZone.name = 'Zone ' + (zones.length + 1);
            setZones(prev => [...prev, newZone]);
            setActiveIdx(zones.length);
            setSubTab('zone');
        }, [zones.length]);

        // Remove zone
        const removeZone = useCallback((idx) => {
            if (zones.length <= 1) return;
            setZones(prev => prev.filter((_, i) => i !== idx));
            setActiveIdx(prev => prev >= idx ? Math.max(0, prev - 1) : prev);
        }, [zones.length]);

        // Rename zone (inline edit)
        const startRename = useCallback((idx) => {
            console.debug('[FRA] startRename zone index:', idx);
            setEditingTabIdx(idx);
        }, []);
        const commitRename = useCallback((idx, newName) => {
            console.debug('[FRA] commitRename zone', idx, 'to:', newName);
            setZones(prev => {
                const copy = [...prev];
                copy[idx] = { ...copy[idx], name: newName.trim() || ('Zone ' + (idx + 1)) };
                return copy;
            });
            setEditingTabIdx(-1);
        }, []);

        // Render a single zone tab (helper to avoid htm ternary parsing issues)
        const renderTab = (z, i) => {
            if (editingTabIdx === i) {
                console.debug('[FRA] renderTab: rendering INPUT for zone', i);
                return h('input', {
                    key: 'edit-' + i,
                    ref: editInputRef,
                    className: 'fra-zone-tab-edit',
                    defaultValue: z.name || ('Zone ' + (i + 1)),
                    onBlur: (e) => commitRename(i, e.target.value),
                    onKeyDown: (e) => { if (e.key === 'Enter') commitRename(i, e.target.value); if (e.key === 'Escape') setEditingTabIdx(-1); }
                });
            }
            return h('button', {
                key: 'tab-' + i,
                type: 'button',
                className: 'fra-zone-tab ' + (subTab === 'zone' && activeIdx === i ? 'active' : ''),
                onClick: () => { setActiveIdx(i); setSubTab('zone'); },
                onDoubleClick: (e) => { e.stopPropagation(); e.preventDefault(); startRename(i); }
            },
                z.name || ('Zone ' + (i + 1)),
                z.result ? h('span', { className: 'ml-1 text-xs font-bold', style: { color: z.result.category.color } }, '(' + z.result.score + ')') : null,
                zones.length > 1 ? h('span', {
                    className: 'ml-1 text-slate-400 hover:text-red-500 text-xs font-bold cursor-pointer',
                    onClick: (e) => { e.stopPropagation(); removeZone(i); },
                    title: 'Remove zone'
                }, '\u00d7') : null
            );
        };

        // Auto-calculate FTRI whenever zone data changes (debounced 400ms)
        const calcTimerRef = useRef(null);
        const prevScoreRef = useRef(null);
        useEffect(() => {
            clearTimeout(calcTimerRef.current);
            const hasHeat = zone.ignitionSources && zone.ignitionSources.length > 0;
            const hasFuel = (zone.fuelSources && zone.fuelSources.length > 0) ||
                            (zone.chemicals && zone.chemicals.length > 0);
            const hasOxy  = zone.oxygenConditions && zone.oxygenConditions.length > 0;
            if (!hasHeat || !hasFuel || !hasOxy) return;
            calcTimerRef.current = setTimeout(() => {
                const d = D();
                const result = d.runAssessment(zone);
                // Only update (and notify) if score actually changed
                if (result.score !== prevScoreRef.current) {
                    prevScoreRef.current = result.score;
                    updateZone({ ...zone, result });
                }
            }, 400);
            return () => clearTimeout(calcTimerRef.current);
        }, [
            zone.ignitionSources, zone.fuelSources, zone.oxygenConditions,
            zone.chemicals, zone.hasSprinklers, zone.selectedControls,
            zone.occupancyClass, zone.occupantCount, zone.areaSqM, zone.businessCritical
        ]);

        // Force re-render after AI analysis (zone is mutated in-place by aiAnalyzeZone)
        const onAIComplete = useCallback(() => {
            forceUpdate(n => n + 1);
        }, []);

        // Toolbar actions
        const getState = () => ({ zones, activeZoneIdx: activeIdx, floorPlanImg });
        const onSave = useCallback(() => R().saveProjectJSON(getState()), [zones, activeIdx, floorPlanImg]);
        const onLoad = useCallback(() => {
            R().loadProjectJSON((data) => {
                setZones(data.zones);
                setActiveIdx(data.activeZoneIdx || 0);
                if (data.floorPlanImg) setFloorPlanImg(data.floorPlanImg);
            });
        }, []);
        const onMerge = useCallback(() => {
            R().mergeFromJSON(zones, floorPlanImg, (data) => {
                setZones(prev => [...prev, ...data.zones]);
                if (data.floorPlanImg && !floorPlanImg) setFloorPlanImg(data.floorPlanImg);
            });
        }, [zones, floorPlanImg]);
        const onPDF = useCallback(() => R().generateFRAPDF(getState()), [zones, activeIdx, floorPlanImg]);
        const onHTML = useCallback(() => R().generateFRAHTML(getState()), [zones, activeIdx, floorPlanImg]);

        const comp = C();

        return html`
        <div className="space-y-4">
                        
            <!-- Toolbar -->
            <${comp.Toolbar}
                state=${getState()}
                onSave=${onSave}
                onLoad=${onLoad}
                onMerge=${onMerge}
                onPDF=${onPDF}
                onHTML=${onHTML}
            />

            <!-- Sub-tab bar: zone tabs + floor plan tab -->
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button type="button"
                    className=${`fra-zone-tab floorplan ${subTab === 'floorplan' ? 'active' : ''}`}
                    onClick=${() => setSubTab('floorplan')}>
                     Floor Plan
                </button>
                ${zones.map((z, i) => renderTab(z, i))}
                <button type="button" onClick=${addZone}
                    className="fra-zone-tab border-dashed text-slate-400 hover:text-orange-600 hover:border-orange-400">
                    + Add Zone
                </button>
                <div className="flex-1"></div>
            </div>

            <!-- Zone Content or Floor Plan -->
            ${subTab === 'zone' ? html`
                <div className="space-y-4 fra-fade-in" key=${'zone-' + activeIdx}>
                    <!-- Section 1: Photos -->
                    <${comp.ZonePhotos} zone=${zone} onChange=${updateZone} />

                    <!-- Section 2: Description + AI -->
                    <${comp.ZoneDescription} zone=${zone} onChange=${updateZone} onAnalyze=${onAIComplete} />

                    <!-- Section 3: Checklist -->
                    <${comp.ZoneChecklist} zone=${zone} onChange=${updateZone} />

                    <!-- Auto-calc status indicator -->
                    ${!zone.result ? html`
                    <div className="flex items-center justify-center gap-2 py-2 text-sm text-slate-400">
                        <span>⬆️ Select at least one Ignition, Fuel, and Oxygen source to auto-calculate FTRI</span>
                    </div>` : html`
                    <div className="flex items-center justify-center gap-2 py-1">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
                            <span style=${{ width:'7px', height:'7px', borderRadius:'50%', background:'#16a34a', display:'inline-block', animation:'fra-pulse-dot 1.8s ease-in-out infinite' }}></span>
                            Live — updates automatically
                        </span>
                    </div>`}

                    <!-- Section 4: Results -->
                    ${zone.result && html`<${comp.ZoneResults} zone=${zone} />`}

                    <!-- Copy report & Notes -->
                    ${zone.result && html`
                    <div className="flex justify-center">
                        <button type="button" onClick=${() => R().copyReport(zone)}
                            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50 transition">
                            📋 Copy Report to Clipboard
                        </button>
                    </div>`}

                    <!-- Notes -->
                    <${comp.ZoneNotes} zone=${zone} onChange=${updateZone} />
                </div>
            ` : html`
                <div className="fra-fade-in" key="floorplan">
                    <${FP().FloorPlanTab}
                        zones=${zones}
                        floorPlanImg=${floorPlanImg}
                        onFloorPlanImgChange=${setFloorPlanImg}
                        onZonesChange=${setZones}
                    />
                </div>
            `}
        </div>`;
    }

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC API — window.FireRiskAssessment
    // ═══════════════════════════════════════════════════════════════

    let appRoot = null;

    function init(targetId) {
        const container = document.getElementById(targetId || 'fra-app-root');
        if (!container) {
            console.error('[FRA] No container found: #' + (targetId || 'fra-app-root'));
            return;
        }
        appRoot = ReactDOM.createRoot(container);
        appRoot.render(html`<${FRAApp} />`);
    }

    function exportData() {
        // Placeholder — the save button handles export via reports module
        console.log('[FRA] Use the Save button or FRA.reports.saveProjectJSON()');
    }

    function importData(data) {
        // Re-mount with data — for external integration
        console.log('[FRA] Use the Load button or re-initialize');
    }

    window.FireRiskAssessment = { init, exportData, importData };

})();
