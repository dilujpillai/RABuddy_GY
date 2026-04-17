/**
 * fra-reports.js — Fire Risk Assessment: Save/Load/Merge, PDF & HTML Reports
 */
(function () {
    'use strict';

    window.FRA = window.FRA || {};
    const D = () => window.FRA.data;

    // ═══════════════════════════════════════════════════════════════
    // SAVE / LOAD / MERGE JSON
    // ═══════════════════════════════════════════════════════════════

    function saveProjectJSON(state) {
        const data = {
            version: '3.0-fra',
            savedAt: new Date().toISOString(),
            zones: JSON.parse(JSON.stringify(state.zones)),
            activeZoneIdx: state.activeZoneIdx,
            floorPlanImg: state.floorPlanImg || null
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'FireRA_' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        URL.revokeObjectURL(a.href);
        if (typeof window.showCustomAlert === 'function') window.showCustomAlert('Fire Risk Assessment saved!', 'success');
    }

    function loadProjectJSON(onLoad) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    if (!data.zones || !Array.isArray(data.zones)) throw new Error('Invalid file format — missing zones array');
                    onLoad(data);
                    if (typeof window.showCustomAlert === 'function')
                        window.showCustomAlert('Loaded ' + data.zones.length + ' zone(s) successfully!', 'success');
                } catch (err) {
                    if (typeof window.showCustomAlert === 'function')
                        window.showCustomAlert('Failed to load file: ' + err.message, 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    function mergeFromJSON(zones, floorPlanImg, onMerge) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    if (!data.zones || !Array.isArray(data.zones)) throw new Error('Invalid file format');
                    onMerge(data);
                    if (typeof window.showCustomAlert === 'function')
                        window.showCustomAlert('Merged ' + data.zones.length + ' zone(s) from file!', 'success');
                } catch (err) {
                    if (typeof window.showCustomAlert === 'function')
                        window.showCustomAlert('Failed to merge: ' + err.message, 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    // ═══════════════════════════════════════════════════════════════
    // SHARED: TERMS & DEFINITIONS (used by both PDF and HTML appendix)
    // ═══════════════════════════════════════════════════════════════

    const FRA_TERMS = [
        { section: 'Scoring & Methodology' },
        { term: 'FTRI (Fire Triangle Risk Index)', def: 'A composite score from 0 to 100 derived from the fire triangle leg scores, control effectiveness, and a consequence amplifier. Higher scores indicate greater fire risk.' },
        { term: 'Fire Triangle', def: 'The three elements required for combustion: Heat (ignition source), Fuel (combustibles), and Oxygen. Removing any one element extinguishes or prevents fire.' },
        { term: 'Heat / Ignition Score', def: 'Rated 1\u201310. Reflects the intensity and probability of ignition sources present in the zone (e.g., hot work, electrical equipment, friction).' },
        { term: 'Fuel / Combustible Score', def: 'Rated 1\u201310. Reflects the type, quantity, and flash point of combustible or flammable materials stored or used in the zone.' },
        { term: 'Oxygen Score', def: 'Rated 1\u201310. Reflects oxygen availability and ventilation conditions. Higher scores indicate conditions that support rapid fire spread.' },
        { term: 'Triangle Score', def: 'The product of the three leg averages, scaled 0\u201315, multiplied by the Interaction Factor. Represents combined fire triangle intensity.' },
        { term: 'Interaction Factor', def: 'A multiplier (1.0\u20131.5) applied when multiple high-scoring legs co-exist (Compound Risk). A minimum leg score above 6 triggers 1.30; above 8 triggers 1.50.' },
        { term: 'Control Effectiveness', def: 'Weighted percentage (0\u2013100%) of fire protection controls in place across five NFPA categories. Mandatory controls carry higher weight.' },
        { term: 'Consequence Amplifier', def: 'A multiplier (1.0\u20131.5) that increases the final score based on occupancy class, business criticality, and absence of sprinkler suppression.' },
        { section: 'Risk Categories' },
        { term: 'CRITICAL (Score 80\u2013100)', def: 'Immediate action required. Cease operations until fire risks are mitigated. Escalate to site management and EHS immediately.' },
        { term: 'HIGH (Score 60\u201379)', def: 'Urgent mitigation required within 24\u201348 hours. Assign responsible persons and define corrective action timeline.' },
        { term: 'MEDIUM (Score 30\u201359)', def: 'Plan and implement corrective actions within 30 days. Review controls and close gaps through the site action tracking system.' },
        { term: 'LOW (Score 0\u201329)', def: 'Maintain current controls. Conduct annual review to confirm no changes in zone conditions.' },
        { section: 'Standards Referenced' },
        { term: 'NFPA 30', def: 'Standard for Flammable and Combustible Liquids. Defines Maximum Allowable Quantities (MAQ) per control area and storage requirements.' },
        { term: 'NFPA 72', def: 'National Fire Alarm and Signaling Code. Covers smoke detectors, heat detectors, manual pull stations, and alarm notification appliances.' },
        { term: 'NFPA 13', def: 'Standard for the Installation of Sprinkler Systems. Governs design, installation, and testing of automatic sprinkler systems.' },
        { term: 'NFPA 101', def: 'Life Safety Code. Addresses egress, emergency lighting, EXIT signs, and occupancy classifications.' },
        { term: 'NFPA 704', def: 'Standard System for the Identification of the Hazards of Materials for Emergency Response (the "fire diamond"). Rates health, flammability, instability, and special hazards 0\u20134.' },
        { term: 'NFPA 51B', def: 'Standard for Fire Prevention During Welding, Cutting, and Other Hot Work. Requires permits, fire watch, and specific clearance distances.' },
        { term: 'NFPA 652', def: 'Standard on the Fundamentals of Combustible Dust. Applies to facilities handling powders or dusts that can form explosive atmospheres.' },
        { term: 'FM Global', def: 'Factory Mutual Global \u2014 a leading commercial and industrial property insurer whose data sheets provide engineering-based fire protection standards.' },
        { term: 'OSHA 1910.39', def: 'US OSHA standard requiring documented Fire Prevention Plans, employee training, and identification of potential ignition sources.' },
        { section: 'Key Technical Terms' },
        { term: 'Flash Point', def: 'The lowest temperature at which a liquid produces sufficient vapour to ignite momentarily when an ignition source is applied (NFPA 30). Liquids with flash points below 37.8\u00b0C are Class I flammables.' },
        { term: 'MAQ (Maximum Allowable Quantity)', def: 'The maximum amount of flammable or combustible liquid permitted in a single control area under NFPA 30. NFPA 30 \u00a79.4 allows 4\u00d7 the MAQ in sprinklered areas.' },
        { term: 'Control Area', def: 'A building space bounded by construction capable of limiting the spread of fire and restricting the release of hazardous materials (NFPA 30).' },
        { term: 'Hot Work', def: 'Any work involving open flames, sparks, or heat-generating operations including welding, cutting, grinding, brazing, or use of open-flame torches (NFPA 51B).' },
        { term: 'LEL (Lower Explosive Limit)', def: 'The minimum concentration of a flammable gas or vapour in air that can sustain ignition. Concentrations below the LEL are too lean to ignite.' },
        { term: 'ERT (Emergency Response Team)', def: 'Trained in-house personnel who lead response to fire emergencies, conduct evacuations, and coordinate with external fire services.' },
        { term: 'Occupancy Class', def: 'A classification of a building or zone based on the nature of activities conducted (e.g., Factory \u2014 General, Assembly, Storage, Office, Laboratory). Affects the consequence amplifier.' }
    ];

    // ═══════════════════════════════════════════════════════════════
    // PDF REPORT
    // ═══════════════════════════════════════════════════════════════

    async function generateFRAPDF(state) {
        if (typeof PDFDocument === 'undefined' || typeof blobStream === 'undefined') {
            if (typeof window.showCustomAlert === 'function')
                window.showCustomAlert('PDFKit is not loaded. Cannot generate PDF.', 'error');
            return;
        }
        if (typeof window.showCustomAlert === 'function')
            window.showCustomAlert('Generating PDF report...', 'info');

        const d = D();
        const zones = state.zones;

        // Strip emoji/multi-byte characters that PDFKit built-in fonts cannot render
        const pdfSafe = (str) => String(str || '').replace(/\p{Emoji}/gu, '').replace(/\s{2,}/g, ' ').trim();

        // Fetch Noto Sans TTF for professional Unicode typography (graceful fallback to Helvetica)
        let _fontBufs = null;
        try {
            const [rRes, bRes] = await Promise.all([
                fetch('https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf'),
                fetch('https://cdn.jsdelivr.net/gh/rsms/inter@master/docs/font-files/Inter-Bold.ttf')
            ]);
            if (rRes.ok && bRes.ok)
                _fontBufs = await Promise.all([rRes.arrayBuffer(), bRes.arrayBuffer()]);
        } catch (e) { /* Helvetica fallback */ }

        const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
        if (_fontBufs) {
            doc.registerFont('Inter', _fontBufs[0]);
            doc.registerFont('Inter-Bold', _fontBufs[1]);
            // Transparently redirect all Helvetica font calls to Inter
            const _origFont = doc.font.bind(doc);
            doc.font = (name, ...a) => _origFont(
                name === 'Helvetica' ? 'Inter' :
                name === 'Helvetica-Bold' ? 'Inter-Bold' : name, ...a);
        }
        const stream = doc.pipe(blobStream());
        const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const pw = 495; // page width minus margins

        // Helper: draw a horizontal rule
        const hr = (color) => { doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(color || '#cbd5e1').lineWidth(0.5).stroke(); doc.moveDown(0.4); };
        // Helper: colored badge
        const badge = (text, bg, fg) => {
            const x = doc.x, y = doc.y;
            const tw = doc.widthOfString(text);
            doc.roundedRect(x, y - 1, tw + 12, 16, 4).fill(bg);
            doc.fillColor(fg).fontSize(9).font('Helvetica-Bold').text(text, x + 6, y + 2, { continued: false });
            doc.fillColor('#1e293b');
        };
        // Helper: section header
        const sectionHead = (title) => {
            doc.moveDown(0.5);
            const sy = doc.y;
            // Left accent bar
            doc.rect(50, sy, 3, 14).fill('#ea580c');
            doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e293b')
               .text('  ' + title, 56, sy + 1);
            doc.moveDown(0.15);
            hr('#e2e8f0');
        };

        // ─── TITLE PAGE ───
        doc.moveDown(6);
        doc.fontSize(32).font('Helvetica-Bold').fillColor('#7f1d1d').text('FIRE RISK', { align: 'center' });
        doc.fontSize(32).text('ASSESSMENT', { align: 'center' });
        doc.moveDown(0.5);
        hr('#dc2626');
        doc.moveDown(0.5);
        doc.fontSize(14).font('Helvetica').fillColor('#64748b').text('Fire Triangle Risk Index (FTRI) Report', { align: 'center' });
        doc.moveDown(2);
        doc.fontSize(11).fillColor('#475569');
        doc.text('Report Date: ' + dateStr, { align: 'center' });
        doc.text('Zones Assessed: ' + zones.length, { align: 'center' });
        doc.text('Methodology: NFPA / OSHA / FM Global', { align: 'center' });
        doc.moveDown(4);
        doc.fontSize(9).fillColor('#94a3b8').text('Generated by Risk Assessment Buddy Smart 3.0', { align: 'center' });

        // ─── EXECUTIVE SUMMARY ───
        doc.addPage();
        doc.fontSize(18).font('Helvetica-Bold').fillColor('#1e293b').text('Executive Summary');
        doc.moveDown(0.3);
        hr('#ea580c');
        doc.moveDown(0.3);

        // Summary table — col widths: #, Zone, Score, Heat/Fuel/O2, Ctrl%, Action
        const colW = [25, 135, 85, 65, 50, pw - 360];
        const tableHead = ['#', 'Zone Name', 'Score / Rating', 'Heat/Fuel/O2', 'Ctrl %', 'Action Required'];

        // Draw header row
        doc.fontSize(8).font('Helvetica-Bold');
        let tx = 50;
        doc.rect(50, doc.y, pw, 18).fill('#374151');
        doc.fillColor('#fff');
        const headY = doc.y + 5;
        tableHead.forEach((h, i) => { doc.text(h, tx + 4, headY, { width: colW[i] - 8, lineBreak: false }); tx += colW[i]; });
        doc.y = headY + 15;

        zones.forEach((z, i) => {
            if (doc.y > 710) doc.addPage();
            const r = z.result;

            // Pre-calculate row height based on tallest cell
            doc.fontSize(8).font('Helvetica');
            const actionText = r ? r.category.action : 'Not calculated';
            const actionH = doc.heightOfString(actionText, { width: colW[5] - 8 });
            const zoneName = z.name || 'Zone ' + (i + 1);
            const nameH = doc.heightOfString(zoneName, { width: colW[1] - 8 });
            const rowH = Math.max(actionH, nameH, 20) + 8;

            const rowY = doc.y;
            const bg = i % 2 === 0 ? '#f8fafc' : '#ffffff';
            doc.rect(50, rowY, pw, rowH).fill(bg);

            // Draw subtle row border
            doc.moveTo(50, rowY + rowH).lineTo(545, rowY + rowH).strokeColor('#e2e8f0').lineWidth(0.3).stroke();

            tx = 50;
            const scoreLabel = r ? r.category.label : '—';
            const scoreColor = r ? r.category.color : '#64748b';
            const vals = [
                { text: String(i + 1), color: '#64748b', bold: false },
                { text: zoneName, color: '#1e293b', bold: true },
                { text: r ? r.score + '/100' : '—', color: scoreColor, bold: true, sub: scoreLabel },
                { text: r ? r.heat + ' / ' + r.fuel + ' / ' + r.oxygen : '—', color: '#1e293b', bold: false },
                { text: r ? Math.round(r.controls.totalEffectiveness * 100) + '%' : '—', color: '#1e293b', bold: false },
                { text: actionText, color: '#1e293b', bold: false }
            ];

            vals.forEach((v, j) => {
                const cellX = tx + 4;
                const cellW = colW[j] - 8;
                doc.fillColor(v.color).font(v.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
                if (j === 2 && v.sub) {
                    // Score cell: score on top, label badge below
                    doc.text(v.text, cellX, rowY + 4, { width: cellW, lineBreak: false });
                    doc.fontSize(7).fillColor(scoreColor + 'cc').font('Helvetica')
                       .text(v.sub, cellX, rowY + 15, { width: cellW, lineBreak: false });
                    doc.fontSize(8);
                } else {
                    doc.text(v.text, cellX, rowY + 4, { width: cellW });
                }
                tx += colW[j];
            });

            doc.y = rowY + rowH;
        });
        doc.moveDown(0.5);

        // ─── HEAT MAP PAGE ───
        const hasAnyRect = zones.some(z => z.mapRect);
        if (hasAnyRect && window.FRA.floorplan && window.FRA.floorplan.renderHeatMapToDataURL) {
            doc.addPage();
            doc.fontSize(18).font('Helvetica-Bold').fillColor('#1e293b').text('Floor Plan — Heat Map');
            doc.moveDown(0.3);
            hr('#ea580c');
            doc.moveDown(0.3);
            doc.fontSize(9).font('Helvetica').fillColor('#64748b').text('Risk scores overlaid on the facility floor plan. Colors indicate assessed fire risk severity per zone.');
            doc.moveDown(0.5);
            try {
                const heatMapDataURL = await window.FRA.floorplan.renderHeatMapToDataURL(zones, state.floorPlanImg, 1000);
                doc.image(heatMapDataURL, 50, doc.y, { fit: [pw, 380], align: 'center' });
                doc.y += 390;
            } catch (e) {
                doc.fontSize(9).fillColor('#94a3b8').text('(Heat map could not be rendered)');
            }
            doc.moveDown(0.5);
        }

        // ─── ZONE DETAIL PAGES ───
        zones.forEach((z, i) => {
            doc.addPage();
            const r = z.result;
            const catColor = r ? r.category.color : '#64748b';

            // Zone header with score badge
            doc.fontSize(18).font('Helvetica-Bold').fillColor('#1e293b').text('Zone ' + (i + 1) + ': ' + z.name);
            if (r) {
                doc.moveDown(0.1);
                doc.fontSize(11).font('Helvetica-Bold').fillColor(catColor)
                    .text('[' + r.category.label + '] \u2014 FTRI Score: ' + r.score + '/100');
            }
            doc.moveDown(0.2);
            hr(catColor);

            // Location profile table
            sectionHead('Location Profile');
            doc.fontSize(9).font('Helvetica').fillColor('#1e293b');
            const locRows = [
                ['Building', z.building || '\u2014', 'Floor / Level', z.floor || '\u2014'],
                ['Occupancy Class', z.occupancyClass, 'Area', z.areaSqM + ' m\u00b2'],
                ['Occupants', String(z.occupantCount), 'Business Critical', z.businessCritical ? 'Yes' : 'No']
            ];
            locRows.forEach(row => {
                doc.font('Helvetica-Bold').text(row[0] + ': ', { continued: true }).font('Helvetica').text(row[1] + '     ', { continued: true });
                doc.font('Helvetica-Bold').text(row[2] + ': ', { continued: true }).font('Helvetica').text(row[3]);
            });

            // Fire Triangle
            sectionHead('Fire Triangle Analysis');
            doc.fontSize(9).font('Helvetica').fillColor('#1e293b');
            if (r) {
                doc.font('Helvetica-Bold').text('Heat (Ignition): ' + r.heat + '/10   |   Fuel (Combustibles): ' + r.fuel + '/10   |   Oxygen: ' + r.oxygen + '/10');
                doc.font('Helvetica').text('Triangle Score: ' + r.triangle.triangleScore.toFixed(2) + '/15   |   Interaction Factor: \u00d7' + r.triangle.interaction.toFixed(2) +
                    (r.triangle.interaction >= 1.3 ? ' (COMPOUND RISK)' : ''));
            }
            doc.moveDown(0.2);
            doc.text('Ignition Sources: ' + (z.ignitionSources.length > 0 ? z.ignitionSources.join(', ') : 'None identified'));
            doc.text('Fuel Sources: ' + (z.fuelSources.length > 0 ? z.fuelSources.join(', ') : 'None identified'));
            doc.text('Oxygen Conditions: ' + (z.oxygenConditions.length > 0 ? z.oxygenConditions.join(', ') : 'None identified'));

            // Controls
            sectionHead('Fire Protection Controls');
            doc.fontSize(9).font('Helvetica').fillColor('#1e293b');
            for (const [catKey, catDef] of Object.entries(d.CONTROL_CATEGORIES)) {
                const sel = z.selectedControls[catKey] || [];
                const total = Object.keys(catDef.items).length;
                const pct = total > 0 ? Math.round((sel.length / total) * 100) : 0;
                doc.font('Helvetica-Bold').text(pdfSafe(catDef.label) + ' (' + sel.length + '/' + total + ' \u2014 ' + pct + '%)', { continued: false });
                if (sel.length > 0) {
                    doc.font('Helvetica').fontSize(8).text('   ' + sel.join('; '));
                } else {
                    doc.font('Helvetica').fontSize(8).fillColor('#dc2626').text('   (No controls in place)');
                    doc.fillColor('#1e293b');
                }
                doc.fontSize(9);
            }

            // FTRI Result
            if (r) {
                sectionHead('FTRI Result');
                doc.fontSize(10).font('Helvetica-Bold').fillColor(catColor);
                doc.text('[' + r.category.label + ']  Score: ' + r.score + '/100');
                doc.fontSize(9).font('Helvetica').fillColor('#1e293b');
                doc.text('Action Required: ' + r.category.action);
                doc.text('Control Effectiveness: ' + Math.round(r.controls.totalEffectiveness * 100) + '%   |   Consequence Amplifier: \u00d7' + r.consequence.toFixed(2));
                doc.moveDown(0.2);
                doc.fontSize(8).fillColor('#64748b').font('Helvetica');
                doc.text('Formula: FTRI = (Triangle \u00d7 (1 \u2212 ControlEff) \u00d7 Consequence) \u00f7 30 \u00d7 100 = (' +
                    r.triangle.triangleScore.toFixed(2) + ' \u00d7 ' + (1 - r.controls.totalEffectiveness).toFixed(3) + ' \u00d7 ' + r.consequence.toFixed(2) + ') \u00f7 30 \u00d7 100 = ' + r.score);
                doc.fillColor('#1e293b');

                if (r.controls.gaps.length > 0) {
                    doc.moveDown(0.4);
                    doc.fontSize(10).font('Helvetica-Bold').fillColor('#991b1b').text('Gaps & Missing Controls');
                    doc.fontSize(8).font('Helvetica');
                    r.controls.gaps.forEach(g => {
                        doc.fillColor(g.startsWith('MANDATORY') ? '#7f1d1d' : '#854d0e');
                        const gText = g.replace(/^MANDATORY MISSING:\s*/, '');
                        if (g.startsWith('MANDATORY')) {
                            doc.font('Helvetica-Bold').text('        \u2022  ', { continued: true })
                               .font('Helvetica').text(gText);
                        } else {
                            doc.font('Helvetica').text('        \u2013  ' + gText);
                        }
                    });
                    doc.fillColor('#1e293b');
                }
            }

            // Notes
            if (z.notes) {
                sectionHead('Notes & Observations');
                doc.fontSize(9).font('Helvetica').text(z.notes);
            }

            // Photos
            if (z.photos && z.photos.length > 0) {
                if (doc.y > 500) doc.addPage();
                sectionHead('Zone Photos');
                let photoX = 50;
                z.photos.forEach((photo, pi) => {
                    if (doc.y > 580) { doc.addPage(); photoX = 50; }
                    try {
                        const imgW = 160, imgH = 120;
                        if (photoX + imgW > 545) { photoX = 50; doc.moveDown(0.5); }
                        doc.image(photo.data, photoX, doc.y, { fit: [imgW, imgH] });
                        if (photo.caption) {
                            doc.fontSize(7).font('Helvetica').fillColor('#64748b')
                                .text(photo.caption, photoX, doc.y + imgH + 2, { width: imgW, align: 'center' });
                            doc.fillColor('#1e293b');
                        }
                        photoX += imgW + 12;
                    } catch (e) { /* skip */ }
                });
                doc.moveDown(0.5);
            }
        });

        // ─── APPENDIX A — TERMS & DEFINITIONS ───
        doc.addPage();
        doc.fontSize(18).font('Helvetica-Bold').fillColor('#1e293b').text('Appendix A \u2014 Terms & Definitions');
        doc.moveDown(0.3);
        hr('#ea580c');
        doc.moveDown(0.3);
        doc.fontSize(9).font('Helvetica').fillColor('#475569')
           .text('The following terms are used throughout this Fire Risk Assessment report. Definitions are based on NFPA standards, OSHA regulations, and FM Global engineering guidelines.');
        doc.moveDown(0.5);

        FRA_TERMS.forEach(entry => {
            if (doc.y > 750) doc.addPage();
            if (entry.section) {
                // Section sub-heading
                doc.moveDown(0.4);
                const sy = doc.y;
                doc.rect(50, sy, 3, 12).fill('#ea580c');
                doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b').text('  ' + entry.section, 56, sy + 1);
                doc.moveDown(0.1);
                doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').lineWidth(0.4).stroke();
                doc.moveDown(0.3);
            } else {
                // Term + definition row
                const termY = doc.y;
                doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e293b')
                   .text(entry.term, 54, termY, { width: 160, lineBreak: true });
                const termEndY = doc.y;
                doc.fontSize(8).font('Helvetica').fillColor('#374151')
                   .text(entry.def, 220, termY, { width: 320, lineBreak: true });
                const defEndY = doc.y;
                doc.y = Math.max(termEndY, defEndY) + 3;
                // Light row divider
                doc.moveTo(54, doc.y).lineTo(540, doc.y).strokeColor('#f1f5f9').lineWidth(0.3).stroke();
                doc.y += 2;
            }
        });
        doc.moveDown(0.5);

        // ─── FOOTER on each page ───
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
            doc.switchToPage(i);
            doc.fontSize(7).font('Helvetica').fillColor('#94a3b8');
            doc.text('Fire Risk Assessment \u2014 FTRI Report \u2014 ' + dateStr + '  |  Page ' + (i + 1) + ' of ' + pageCount,
                50, 780, { align: 'center', width: pw });
        }

        doc.end();

        return new Promise((resolve) => {
            stream.on('finish', () => {
                const blob = stream.toBlob('application/pdf');
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'FireRA_Report_' + new Date().toISOString().slice(0, 10) + '.pdf';
                a.click();
                URL.revokeObjectURL(url);
                if (typeof window.showCustomAlert === 'function')
                    window.showCustomAlert('PDF report downloaded!', 'success');
                resolve(blob);
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // HTML REPORT
    // ═══════════════════════════════════════════════════════════════

    // Generates an animated circular SVG fire badge for HTML export
    function fireBadgeSVGString(score, color, label) {
        const t = score / 100;
        const cr   = Math.round(44 + t * 24);   // radius 44→68px
        const pad  = 14;
        const lH   = 24;
        const lW   = Math.round(cr * 2.2);
        const W    = (cr + pad) * 2;
        const H    = (cr + pad) * 2 + lH + 7;
        const cxv  = W / 2;
        const cyv  = cr + pad;
        const fSz  = Math.round(cr * 0.90);
        const sFsz = Math.round(cr * 0.36);
        const lFsz = Math.round(9 + t * 4);
        const lX   = (W - lW) / 2;
        const lY   = cyv + cr + 7;
        const rW   = (2.5 + t * 4).toFixed(1);
        const uid  = 'fra' + score + Math.random().toString(36).slice(2, 6);
        const pDur = (1.3 + (1 - t) * 0.7).toFixed(2) + 's';
        const fDur = (1.5 + (1 - t) * 0.6).toFixed(2) + 's';
        return '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" style="overflow:visible;display:block;">' +
            '<defs>' +
              '<radialGradient id="' + uid + 'rg" cx="50%" cy="45%" r="55%"><stop offset="0%" stop-color="#fff"/><stop offset="78%" stop-color="#fff"/><stop offset="100%" stop-color="' + color + '" stop-opacity="0.2"/></radialGradient>' +
              '<filter id="' + uid + 'halo" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="' + (12 + t * 14) + '"/></filter>' +
              '<filter id="' + uid + 'shadow" x="-40%" y="-40%" width="180%" height="200%"><feDropShadow dx="0" dy="' + (2 + t * 5) + '" stdDeviation="' + (4 + t * 7) + '" flood-color="' + color + '" flood-opacity="' + (0.55 + t * 0.3).toFixed(2) + '"/></filter>' +
              '<filter id="' + uid + 'glow" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="' + (3 + t * 4) + '" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
              '<linearGradient id="' + uid + 'lg" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="' + color + '"/><stop offset="100%" stop-color="' + color + '" stop-opacity="0.82"/></linearGradient>' +
            '</defs>' +
            // Halo
            '<circle cx="' + cxv + '" cy="' + cyv + '" r="' + (cr + 10) + '" fill="' + color + '" opacity="' + (0.28 + t * 0.3).toFixed(2) + '" filter="url(#' + uid + 'halo)"/>' +
            // Pulsing ring
            '<circle cx="' + cxv + '" cy="' + cyv + '" r="' + (cr + 6) + '" fill="none" stroke="' + color + '" stroke-width="' + (2 + t * 3).toFixed(1) + '" opacity="0.6" style="animation:fra-ring-pulse ' + pDur + ' ease-in-out infinite;transform-origin:' + cxv + 'px ' + cyv + 'px"/>' +
            // Main circle
            '<circle cx="' + cxv + '" cy="' + cyv + '" r="' + cr + '" fill="url(#' + uid + 'rg)" stroke="' + color + '" stroke-width="' + rW + '" filter="url(#' + uid + 'shadow)"/>' +
            // Flame
            '<text x="' + cxv + '" y="' + (cyv - cr * 0.07) + '" font-size="' + fSz + '" text-anchor="middle" dominant-baseline="middle" filter="url(#' + uid + 'glow)" style="animation:fra-flame-bounce ' + fDur + ' ease-in-out infinite;transform-origin:' + cxv + 'px ' + (cyv - cr * 0.07) + 'px">&#x1F525;</text>' +
            // Score
            '<text x="' + cxv + '" y="' + (cyv + cr * 0.62) + '" font-size="' + sFsz + '" font-weight="900" text-anchor="middle" dominant-baseline="middle" fill="' + color + '" font-family="system-ui,sans-serif">' + score + '<tspan font-size="' + Math.round(sFsz * 0.62) + '" font-weight="600" fill="' + color + '" opacity="0.7">/100</tspan></text>' +
            // Label pill
            '<rect x="' + lX + '" y="' + lY + '" width="' + lW + '" height="' + lH + '" rx="' + (lH / 2) + '" fill="url(#' + uid + 'lg)" filter="url(#' + uid + 'shadow)"/>' +
            '<text x="' + cxv + '" y="' + (lY + lH / 2 + 0.5) + '" font-size="' + lFsz + '" font-weight="800" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-family="system-ui,sans-serif" letter-spacing="2">' + (label || '').toUpperCase() + '</text>' +
            '</svg>';
    }

    async function generateFRAHTML(state) {
        const d = D();
        const zones = state.zones;
        const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const esc = d.esc;

        // Heat map image
        let heatMapHTML = '';
        const hasAnyRect = zones.some(z => z.mapRect);
        if (hasAnyRect && window.FRA.floorplan && window.FRA.floorplan.renderHeatMapToDataURL) {
            try {
                const heatMapDataURL = await window.FRA.floorplan.renderHeatMapToDataURL(zones, state.floorPlanImg, 1000);
                heatMapHTML = '<div style="break-inside:avoid;margin-bottom:24px;">' +
                    '<h2 style="color:#1e293b;border-bottom:3px solid #ea580c;padding-bottom:8px;">\uD83D\uDDFA\uFE0F Floor Plan \u2014 Heat Map</h2>' +
                    '<p style="font-size:12px;color:#64748b;">Risk scores overlaid on the facility floor plan. Colors indicate assessed fire risk severity per zone.</p>' +
                    '<img src="' + heatMapDataURL + '" style="width:100%;max-width:860px;border-radius:8px;border:1px solid #e2e8f0;" alt="Heat Map"/>' +
                    '</div>';
            } catch (e) { /* skip */ }
        }

        let zonesHTML = '';
        zones.forEach((z, i) => {
            const r = z.result;
            const catColor = r ? r.category.color : '#64748b';
            const catLabel = r ? r.category.label : 'NOT CALCULATED';
            const catBg = r ? r.category.bg : '#f1f5f9';

            let photosHTML = '';
            if (z.photos && z.photos.length > 0) {
                photosHTML = '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;">' +
                    z.photos.map(p => '<div style="flex:0 0 auto;"><img src="' + p.data +
                        '" style="height:120px;border-radius:4px;border:1px solid #e2e8f0;" alt="' +
                        esc(p.caption || '') + '"/>' +
                        (p.caption ? '<div style="font-size:10px;text-align:center;color:#64748b;">' +
                            esc(p.caption) + '</div>' : '') + '</div>').join('') +
                    '</div>';
            }

            let controlsHTML = '';
            for (const [catKey, catDef] of Object.entries(d.CONTROL_CATEGORIES)) {
                const sel = z.selectedControls[catKey] || [];
                controlsHTML += '<div style="margin-bottom:4px;"><strong>' + catDef.label + ':</strong> ' +
                    (sel.length > 0 ? sel.map(s => esc(s)).join('; ') : '<em>(none)</em>') + '</div>';
            }

            let gapsHTML = '';
            if (r && r.controls.gaps.length > 0) {
                gapsHTML = '<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;margin-top:8px;">' +
                    '<h4 style="color:#7f1d1d;margin:0 0 6px;">Gaps &amp; Missing Controls</h4>' +
                    r.controls.gaps.map(g => '<div style="font-size:12px;color:' +
                        (g.startsWith('MANDATORY') ? '#7f1d1d' : '#854d0e') + ';">' +
                        (g.startsWith('MANDATORY') ? '🔴' : '🟡') + ' ' + esc(g) + '</div>').join('') +
                    '</div>';
            }

            zonesHTML += '<div style="break-inside:avoid;border:2px solid ' +
                (r ? r.category.border : '#e2e8f0') + ';border-radius:12px;padding:20px;margin-bottom:20px;background:' +
                catBg + ';">' +
                '<div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;">' +
                (r ? fireBadgeSVGString(r.score, r.category.color, r.category.label) : '') +
                '<div><h2 style="margin:0;color:' + catColor + ';">Zone ' + (i + 1) + ': ' + esc(z.name) + '</h2>' +
                '<div style="color:' + catColor + ';font-weight:600;font-size:14px;">' + catLabel + '</div>' +
                (r ? '<div style="font-size:12px;color:' + catColor + ';">' + r.category.action + '</div>' : '') +
                '</div></div>' +

                '<table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:12px;">' +
                '<tr><td style="padding:4px 8px;background:#fff;border:1px solid #e2e8f0;"><strong>Building</strong></td><td style="padding:4px 8px;background:#fff;border:1px solid #e2e8f0;">' + esc(z.building || '\u2014') + '</td>' +
                '<td style="padding:4px 8px;background:#fff;border:1px solid #e2e8f0;"><strong>Floor</strong></td><td style="padding:4px 8px;background:#fff;border:1px solid #e2e8f0;">' + esc(z.floor || '\u2014') + '</td></tr>' +
                '<tr><td style="padding:4px 8px;background:#fff;border:1px solid #e2e8f0;"><strong>Occupancy</strong></td><td style="padding:4px 8px;background:#fff;border:1px solid #e2e8f0;">' + esc(z.occupancyClass) + '</td>' +
                '<td style="padding:4px 8px;background:#fff;border:1px solid #e2e8f0;"><strong>Area</strong></td><td style="padding:4px 8px;background:#fff;border:1px solid #e2e8f0;">' + z.areaSqM + ' m\u00b2</td></tr>' +
                '<tr><td style="padding:4px 8px;background:#fff;border:1px solid #e2e8f0;"><strong>Occupants</strong></td><td style="padding:4px 8px;background:#fff;border:1px solid #e2e8f0;">' + z.occupantCount + '</td>' +
                '<td style="padding:4px 8px;background:#fff;border:1px solid #e2e8f0;"><strong>Critical</strong></td><td style="padding:4px 8px;background:#fff;border:1px solid #e2e8f0;">' + (z.businessCritical ? 'Yes' : 'No') + '</td></tr></table>' +

                (r ? '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;">' +
                    '<div style="background:#fff;border-radius:8px;padding:8px;text-align:center;border:1px solid #e2e8f0;"><div style="font-size:10px;color:#64748b;">Heat</div><div style="font-size:18px;font-weight:900;color:#dc2626;">' + r.heat + '/10</div></div>' +
                    '<div style="background:#fff;border-radius:8px;padding:8px;text-align:center;border:1px solid #e2e8f0;"><div style="font-size:10px;color:#64748b;">Fuel</div><div style="font-size:18px;font-weight:900;color:#d97706;">' + r.fuel + '/10</div></div>' +
                    '<div style="background:#fff;border-radius:8px;padding:8px;text-align:center;border:1px solid #e2e8f0;"><div style="font-size:10px;color:#64748b;">Oxygen</div><div style="font-size:18px;font-weight:900;color:#2563eb;">' + r.oxygen + '/10</div></div></div>' : '') +

                '<div style="font-size:12px;margin-bottom:8px;"><strong>Ignition Sources:</strong> ' +
                (z.ignitionSources.length > 0 ? z.ignitionSources.map(s => esc(s)).join(', ') : '<em>None</em>') + '</div>' +
                '<div style="font-size:12px;margin-bottom:8px;"><strong>Fuel Sources:</strong> ' +
                (z.fuelSources.length > 0 ? z.fuelSources.map(s => esc(s)).join(', ') : '<em>None</em>') + '</div>' +
                '<div style="font-size:12px;margin-bottom:12px;"><strong>Oxygen Conditions:</strong> ' +
                (z.oxygenConditions.length > 0 ? z.oxygenConditions.map(s => esc(s)).join(', ') : '<em>None</em>') + '</div>' +
                '<div style="font-size:12px;margin-bottom:8px;">' + controlsHTML + '</div>' +
                gapsHTML +
                (z.notes ? '<div style="background:#fff;border-radius:8px;padding:12px;margin-top:8px;font-size:12px;border:1px solid #e2e8f0;"><strong>Notes:</strong> ' + esc(z.notes) + '</div>' : '') +
                photosHTML +
                '</div>';
        });

        // Build appendix HTML
        let appendixRows = '';
        FRA_TERMS.forEach(entry => {
            if (entry.section) {
                appendixRows += '<tr><td colspan="2" style="padding:10px 12px 4px;background:#f8fafc;border-bottom:2px solid #ea580c;">' +
                    '<span style="display:inline-block;width:3px;height:12px;background:#ea580c;margin-right:8px;vertical-align:middle;border-radius:2px;"></span>' +
                    '<strong style="font-size:12px;color:#1e293b;">' + entry.section + '</strong></td></tr>';
            } else {
                appendixRows += '<tr>' +
                    '<td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top;width:220px;font-size:11px;font-weight:700;color:#1e293b;">' + entry.term + '</td>' +
                    '<td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top;font-size:11px;color:#374151;line-height:1.6;">' + entry.def + '</td>' +
                    '</tr>';
            }
        });
        const appendixHTML = '<div style="break-inside:avoid;margin-top:32px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">' +
            '<div style="background:#1e293b;padding:14px 20px;">' +
            '<h2 style="margin:0;color:#fff;font-size:16px;">Appendix A \u2014 Terms &amp; Definitions</h2>' +
            '<p style="margin:4px 0 0;color:#94a3b8;font-size:11px;">Based on NFPA standards, OSHA regulations, and FM Global engineering guidelines.</p>' +
            '</div>' +
            '<table style="width:100%;border-collapse:collapse;background:#fff;">' + appendixRows + '</table>' +
            '</div>';

        const htmlStr = '<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">' +
            '<title>Fire Risk Assessment Report \u2014 ' + dateStr + '</title>' +
            '<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:900px;margin:0 auto;padding:20px;background:#f8fafc;color:#1e293b;}h1{text-align:center;color:#7f1d1d;}.meta{text-align:center;color:#64748b;font-size:13px;margin-bottom:24px;}@media print{body{background:#fff;padding:0;}.no-print{display:none;}}' +
            '@keyframes fra-ring-pulse{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:.9;transform:scale(1.12)}}' +
            '@keyframes fra-flame-bounce{0%,100%{transform:scale(1) translateY(0)}50%{transform:scale(1.15) translateY(-4px)}}' +
            '</style>' +
            '</head><body>' +
            '<h1>\ud83d\udd25 Fire Risk Assessment Report</h1>' +
            '<div class="meta">' + dateStr + ' \u2022 ' + zones.length + ' zone(s) assessed \u2022 Methodology: FTRI (NFPA/OSHA)</div>' +
            heatMapHTML +
            zonesHTML +
            appendixHTML +
            '<div style="text-align:center;font-size:11px;color:#94a3b8;margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;">Generated by Risk Assessment Buddy Smart 3.0 \u2014 Fire Triangle Risk Index (FTRI)</div>' +
            '</body></html>';

        const blob = new Blob([htmlStr], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'FireRA_Report_' + new Date().toISOString().slice(0, 10) + '.html';
        a.click();
        URL.revokeObjectURL(url);
        if (typeof window.showCustomAlert === 'function')
            window.showCustomAlert('HTML report downloaded!', 'success');
    }

    // ═══════════════════════════════════════════════════════════════
    // COPY REPORT
    // ═══════════════════════════════════════════════════════════════

    function copyReport(zone) {
        const d = D();
        if (!zone.result) {
            if (typeof window.showCustomAlert === 'function')
                window.showCustomAlert('Calculate the Fire Risk Index first.', 'info');
            return;
        }
        const r = zone.result;
        const lines = [
            '═══════════════════════════════════════════════',
            'FIRE RISK ASSESSMENT REPORT',
            '═══════════════════════════════════════════════',
            '', 'Zone: ' + zone.name, 'Building: ' + (zone.building || '—'),
            'Floor: ' + (zone.floor || '—'), 'Occupancy: ' + zone.occupancyClass,
            'Occupants: ' + zone.occupantCount, 'Area: ' + zone.areaSqM + ' m²',
            'Business Critical: ' + (zone.businessCritical ? 'Yes' : 'No'),
            '', '── FIRE TRIANGLE ──',
            'Heat (Ignition): ' + r.heat + '/10', 'Fuel (Combustibles): ' + r.fuel + '/10',
            'Oxygen: ' + r.oxygen + '/10', 'Triangle Score: ' + r.triangle.triangleScore.toFixed(2) + '/15',
            'Interaction Factor: ×' + r.triangle.interaction,
            '', '── IGNITION SOURCES ──',
            ...(zone.ignitionSources.length > 0 ? zone.ignitionSources.map(s => '  • ' + s) : ['  (none selected)']),
            '', '── FUEL SOURCES ──',
            ...(zone.fuelSources.length > 0 ? zone.fuelSources.map(s => '  • ' + s) : ['  (none selected)']),
            '', '── OXYGEN CONDITIONS ──',
            ...(zone.oxygenConditions.length > 0 ? zone.oxygenConditions.map(s => '  • ' + s) : ['  (none selected)']),
            '', '── CONTROLS IN PLACE ──'
        ];
        for (const [catKey, catDef] of Object.entries(d.CONTROL_CATEGORIES)) {
            lines.push('  ' + catDef.label + ':');
            const sel = zone.selectedControls[catKey] || [];
            if (sel.length === 0) lines.push('    (none)');
            else sel.forEach(s => lines.push('    ✓ ' + s));
        }
        lines.push('', '── RESULT ──', 'FTRI Score: ' + r.score + '/100', 'Category: ' + r.category.label,
            'Action: ' + r.category.action,
            'Control Effectiveness: ' + Math.round(r.controls.totalEffectiveness * 100) + '%',
            'Consequence Amplifier: ×' + r.consequence.toFixed(2));
        if (r.controls.gaps.length > 0) {
            lines.push('', '── GAPS & MISSING CONTROLS ──');
            r.controls.gaps.forEach(g => lines.push('  ⚠ ' + g));
        }
        if (zone.notes) { lines.push('', '── NOTES ──', zone.notes); }
        lines.push('', 'Report generated: ' + new Date().toISOString().slice(0, 10),
            'Methodology: FTRI (Fire Triangle Risk Index) — NFPA/OSHA based');

        navigator.clipboard.writeText(lines.join('\n')).then(() => {
            if (typeof window.showCustomAlert === 'function')
                window.showCustomAlert('Fire Risk Report copied to clipboard!', 'success');
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // EXPORT
    // ═══════════════════════════════════════════════════════════════

    window.FRA.reports = {
        saveProjectJSON,
        loadProjectJSON,
        mergeFromJSON,
        generateFRAPDF,
        generateFRAHTML,
        copyReport
    };

})();
