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
        const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
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
        const sectionHead = (title) => { doc.moveDown(0.4); doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e293b').text(title); doc.moveDown(0.2); hr('#e2e8f0'); };

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

        // Summary table
        const colW = [30, 150, 70, 65, 65, pw - 380];
        const tableHead = ['#', 'Zone Name', 'Score', 'Heat/Fuel/O\u2082', 'Ctrl Eff.', 'Action Required'];
        doc.fontSize(8).font('Helvetica-Bold');
        let tx = 50;
        doc.rect(50, doc.y, pw, 16).fill('#475569');
        doc.fillColor('#fff');
        const headY = doc.y + 4;
        tableHead.forEach((h, i) => { doc.text(h, tx + 3, headY, { width: colW[i] - 6 }); tx += colW[i]; });
        doc.y = headY + 14;

        zones.forEach((z, i) => {
            if (doc.y > 720) doc.addPage();
            const r = z.result;
            const rowY = doc.y;
            const bg = i % 2 === 0 ? '#f8fafc' : '#ffffff';
            doc.rect(50, rowY, pw, 18).fill(bg);
            doc.fillColor('#1e293b').font('Helvetica').fontSize(8);
            tx = 50;
            const vals = [
                String(i + 1),
                z.name || 'Zone ' + (i + 1),
                r ? r.score + '/100 ' + r.category.label : '—',
                r ? r.heat + '/' + r.fuel + '/' + r.oxygen : '—',
                r ? Math.round(r.controls.totalEffectiveness * 100) + '%' : '—',
                r ? r.category.action : 'Not calculated'
            ];
            vals.forEach((v, j) => { doc.text(v, tx + 3, rowY + 4, { width: colW[j] - 6 }); tx += colW[j]; });
            doc.y = rowY + 18;
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
                    .text(r.category.icon + ' ' + r.category.label + ' — FTRI Score: ' + r.score + '/100');
            }
            doc.moveDown(0.2);
            hr(catColor);

            // Location profile table
            sectionHead('\uD83D\uDCCD Location Profile');
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
            sectionHead('\uD83D\uDD3A Fire Triangle Analysis');
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
            sectionHead('\uD83D\uDEE1\uFE0F Fire Protection Controls');
            doc.fontSize(9).font('Helvetica').fillColor('#1e293b');
            for (const [catKey, catDef] of Object.entries(d.CONTROL_CATEGORIES)) {
                const sel = z.selectedControls[catKey] || [];
                const total = Object.keys(catDef.items).length;
                const pct = total > 0 ? Math.round((sel.length / total) * 100) : 0;
                doc.font('Helvetica-Bold').text(catDef.label + ' (' + sel.length + '/' + total + ' \u2014 ' + pct + '%)', { continued: false });
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
                sectionHead('\uD83D\uDCCA FTRI Result');
                doc.fontSize(10).font('Helvetica-Bold').fillColor(catColor);
                doc.text(r.category.icon + '  Score: ' + r.score + '/100  \u2014  ' + r.category.label);
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
                    doc.fontSize(10).font('Helvetica-Bold').fillColor('#991b1b').text('\u26A0 Gaps & Missing Controls');
                    doc.fontSize(8).font('Helvetica');
                    r.controls.gaps.forEach(g => {
                        doc.fillColor(g.startsWith('MANDATORY') ? '#7f1d1d' : '#854d0e');
                        doc.text('  ' + (g.startsWith('MANDATORY') ? '\uD83D\uDD34' : '\uD83D\uDFE1') + ' ' + g);
                    });
                    doc.fillColor('#1e293b');
                }
            }

            // Notes
            if (z.notes) {
                sectionHead('\uD83D\uDCDD Notes & Observations');
                doc.fontSize(9).font('Helvetica').text(z.notes);
            }

            // Photos
            if (z.photos && z.photos.length > 0) {
                if (doc.y > 500) doc.addPage();
                sectionHead('\uD83D\uDCF7 Zone Photos');
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
                (r ? '<div style="width:80px;height:80px;border-radius:50%;background:' + catColor +
                    ';color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:900;">' +
                    '<span style="font-size:24px;">' + r.score + '</span><span style="font-size:10px;opacity:0.8;">/100</span></div>' : '') +
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

        const htmlStr = '<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">' +
            '<title>Fire Risk Assessment Report \u2014 ' + dateStr + '</title>' +
            '<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:900px;margin:0 auto;padding:20px;background:#f8fafc;color:#1e293b;}h1{text-align:center;color:#7f1d1d;}.meta{text-align:center;color:#64748b;font-size:13px;margin-bottom:24px;}@media print{body{background:#fff;padding:0;}.no-print{display:none;}}</style>' +
            '</head><body>' +
            '<h1>\ud83d\udd25 Fire Risk Assessment Report</h1>' +
            '<div class="meta">' + dateStr + ' \u2022 ' + zones.length + ' zone(s) assessed \u2022 Methodology: FTRI (NFPA/OSHA)</div>' +
            heatMapHTML +
            zonesHTML +
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
