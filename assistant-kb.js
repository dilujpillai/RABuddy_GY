/**
 * Risk Assessment Buddy — Assistant Knowledge Base
 * ------------------------------------------------
 * ALL assistant content lives here, deliberately OUTSIDE the assistant's code
 * (assistant.js) and outside index.html. Add to this file as the app grows; you
 * should never need to touch assistant.js to teach the bot something new.
 *
 * How the pieces are used:
 *   scope        → what the bot may and may not answer. Enforced in the prompt.
 *   workflows    → one entry per workflow. `status` drives the beta disclaimer.
 *   glossary     → terms users get confused by (AI Fix vs Intelligent Fix, etc.)
 *   colorCoding  → what every colour/highlight in the UI means
 *   troubleshoot → symptom → cause → what to do
 *   screens      → maps a tab id to the workflow, so the bot knows where the user is
 *
 * NOTE ON ACCURACY: entries marked `verify: true` are placeholders written from a
 * reading of the UI, not confirmed by the product owner. The assistant is told to
 * hedge on those. Remove the flag once you've checked the wording is right.
 */
(function () {
    'use strict';

    const KB = {
        product: {
            name: 'Risk Assessment Buddy SMART 3.0',
            oneLiner:
                'A browser-based EHS risk assessment tool. Everything — face blurring, ' +
                'file generation, exports — runs locally on the user\'s own device.',
            privacy:
                'Image processing and face detection happen entirely in the browser. ' +
                'Images are never uploaded to a server. Only text prompts are sent to the ' +
                'AI service when the user explicitly triggers an AI action.'
        },

        // ── What the assistant is allowed to talk about ────────────────────────
        scope: {
            allowed: [
                'How to use any workflow in this application',
                'What a button, field, colour, badge or icon in this app means',
                'Troubleshooting problems the user hits inside this app',
                'Risk assessment concepts ONLY as this app implements them ' +
                    '(its rating scales, its hierarchy of controls, its registries)',
                'What the app does with the user\'s data and images',
            'Which file types, formats, sizes and limits the app accepts at each '
                + 'upload point, and what the browser needs in order to play or '
                + 'process them'
            ],
            refused: [
                'General knowledge, current events, maths, coding, or trivia',
                'Legal, medical, HR or regulatory advice — including whether a given ' +
                    'risk rating satisfies a particular law or standard',
                'Writing the actual content of a risk assessment for the user ' +
                    '(the app\'s own AI features do that; the assistant explains how)',
                'Anything about other software, other companies, or other tools',
                'Questions about people'
            ],
            refusalGuidance:
                'If a question falls outside scope, say plainly and briefly that you can ' +
                'only help with this application, and name one or two things you CAN help ' +
                'with that are closest to what they asked. Do not apologise repeatedly, ' +
                'do not lecture, and never attempt a partial answer to an out-of-scope ' +
                'question. Keep the refusal to one or two sentences.',
            // Distinct from refusalGuidance above on purpose. Added after a real user asked
            // "what is Load Project" - a genuine, working app feature that simply had no KB
            // entry yet - and got the SAME canned out-of-scope refusal as an unrelated
            // question would. That reads as "you asked the wrong thing" when the truth is
            // "we haven't written that part of the manual yet," and it's a different failure
            // that needs different wording.
            gapGuidance:
                'A question can be clearly ABOUT this application (a feature, button, ' +
                'workflow, colour, or behaviour of the app itself) while still not being ' +
                'covered by the knowledge base below. That is a DOCUMENTATION GAP, not an ' +
                'out-of-scope question - do NOT use the out-of-scope refusal for it. Never ' +
                'invent specifics (steps, button names, behaviour) about the undocumented ' +
                'feature itself; not knowing the details is fine, guessing at them is not. ' +
                'The "Buttons currently visible on screen" list further down may confirm a ' +
                'button exists even when its exact behaviour isn\'t documented - you may say ' +
                'it exists, but still must not invent what it does beyond what the knowledge ' +
                'base actually says.',
            // A literal phrase, not just abstract guidance, for the same reason betaNotice
            // (below) is a fixed string rather than "mention this is beta somehow": telling
            // the model exactly what to say is more reliable than describing the shape of
            // what to say. Composed into the prompt in buildSystemPrompt().
            gapNotice:
                'This knowledge is not currently accessible to me — it will be updated soon.'
        },

        // ── Workflows ─────────────────────────────────────────────────────────
        // status: 'approved' → answer normally.
        // status: 'beta'     → prepend the disclaimer in `betaNotice` below.
        workflows: [
            {
                id: 'rich-media',
                label: 'Rich Media (photos & video)',
                status: 'approved',
                summary:
                    'Upload site photos or video, let the app blur faces locally, then ' +
                    'generate a risk assessment from what it sees. The usual starting point.',
                steps: [
                    'Upload photos using the file picker, or drag them onto the upload area. ' +
                        'Videos work too — see the video walkthrough for that path.',
                    'Each image is resized and scanned for faces on your device, and any ' +
                        'faces found are blurred automatically. A progress bar shows this ' +
                        'while it runs.',
                    'Processed images appear in the gallery as steps, in upload order.',
                    'Drag thumbnails to reorder them so they follow the real sequence of ' +
                        'the job — the table is generated in gallery order.',
                    'Click a thumbnail to open the large preview. Here you add the step ' +
                        'description, what can go wrong, and existing controls, and you can ' +
                        'blur or annotate the picture.',
                    'Repeat for each step. Use the arrows or the thumbnail strip to move ' +
                        'between pictures without closing the preview.',
                    'Click "Generate AI Risk Assessment". The AI reads every image note '
                        + 'in gallery order and builds the full table. Ratings you entered '
                        + 'yourself are kept; extra hazards the AI finds are added and '
                        + 'marked with an AI badge.',
                    'Review the table — check any values flagged for attention, adjust ' +
                        'Frequency / Severity / Likelihood, and add controls.',
                    'Download with "Download ZIP" \u2014 you get the table, the processed '
                        + 'images and the report. "Save Project" instead writes a project '
                        + 'file you can reload later with "Load Project".'
                ],
                tips: [
                    'The editor toolbar has a blur brush, an eraser, circle, arrow, line and ' +
                        'a stickman for marking up a picture, with a brush-size control for ' +
                        'the blur and eraser.',
                    'The eraser un-blurs — it restores the original pixels underneath, for ' +
                        'when the detector blurred something that was not a face.',
                    'Use the blur brush for a face the detector missed. Both work per-picture ' +
                        'and only affect the copy in this assessment.',
                    'Use "Add Step" in the gallery to create a step with no photo, for ' +
                        'something you could not photograph.',
                    'Dictation is available on the notes fields via Audio Mode, if typing on ' +
                        'site is awkward.',
                    'Nothing is destroyed until you download — deleted rows can be restored.'
                ]
            },
            {
                id: 'rich-media-video',
                label: 'Working from a video (part of Rich Media)',
                status: 'approved',
                parent: 'rich-media',
                summary:
                    'Upload a video, scrub to the moments that matter, and capture them as ' +
                    'still frames or short clips. Each capture becomes a step in your ' +
                    'assessment. Nothing is uploaded — the video is read on your device.',
                steps: [
                    'On the Rich Media tab, upload your video the same way as images — use ' +
                        'the file picker, or drag the file straight onto the upload area.',
                    'The video appears in the video section below the image gallery.',
                    'Click the video to open the full-screen capture view.',
                    'The FIRST video of a session pauses briefly on "Preparing capture ' +
                        'tools…" while face detection warms up. The controls are disabled ' +
                        'until it finishes — this happens once, not for later videos.',
                    'Play, pause and drag the seek bar to reach the moment you want.',
                    'Click "Capture Frame" for a still, or "3s Clip" for a short animated ' +
                        'clip starting at the current position.',
                    'Captured items collect in the "Captured Frames" panel beside the video ' +
                        'so you can see what you have taken.',
                    'Close the capture view when finished. Everything you captured is added ' +
                        'to the gallery as steps, and the first one opens for review.',
                    'From there it is the normal Rich Media flow: blur or annotate each ' +
                        'picture, add your notes, then generate the risk assessment table.'
                ],
                tips: [
                    'Keyboard while the capture view is open: C = capture frame, ' +
                        'G = 3-second clip, Space = play/pause, M = mute/unmute, Esc = close.',
                    'Faces are blurred automatically on every capture, on your device.',
                    'A 3s clip is saved as an animated GIF, sized for sharing rather than ' +
                        'full quality. The download menu offers Optimized and Balanced ' +
                        'presets if you need a different size.',
                    'Capture more than you think you need — deleting a step later is easy, ' +
                        'going back to re-scrub the video is not.',
                    'If a face was missed, or wrongly blurred, fix it per-picture afterwards ' +
                        'in the image editor with the blur brush and the eraser.'
                ]
            },
            {
                id: 'excel',
                label: 'Excel Sheet tab — choosing between the three import paths',
                status: 'approved',
                summary:
                    'The Excel Sheet tab offers three separate import paths, shown as three ' +
                    'numbered cards. They are NOT variations of one flow — they end in ' +
                    'different places, so picking the right one matters.',
                steps: [
                    'Card 1 "Legacy Excel → AI Processing" — for old, messy or non-standard ' +
                        'sheets. Ends in the gallery, and you then generate the table with AI.',
                    'Card 2 "RA 2025 Template (1 file) → GOEHS Export" — for a single clean ' +
                        'file already in the RA 2025 standard format. Loads straight into the ' +
                        'main table, with no AI generation step.',
                    'Card 3 "Batch RA 2025 (~20 files) → GOEHS Export" — for up to 20 finished ' +
                        'RA 2025 workbooks. Never touches the main table; it produces a ZIP.',
                    'Each card has a "❓ How to?" button that opens a short guide for that path.'
                ],
                tips: [
                    'Need to change the photos? Start with Legacy (card 1) to extract, replace ' +
                        'or add imagery, then finish the export with card 2 or 3.',
                    'If your files are already clean RA 2025 and the pictures are fine, skip ' +
                        'Legacy entirely and go straight to card 2 or 3.',
                    'The difference that catches people out: only card 1 needs a separate AI ' +
                        'generation step afterwards. Card 2 fills the table for you.'
                ]
            },
            {
                id: 'excel-legacy',
                label: 'Legacy Excel → AI Processing (Excel Sheet tab, card 1)',
                status: 'approved',
                parent: 'excel',
                summary:
                    'For inherited, messy or non-standard spreadsheets. You map the columns ' +
                    'and sort out the pictures, hand the result over as a new project, and ' +
                    'then generate the risk assessment table with AI. Importing does NOT ' +
                    'produce the table by itself — that is a separate step at the end.',
                steps: [
                    'On the Excel Sheet tab, click card 1 "Legacy Excel → AI Processing" and ' +
                        'pick your workbook (.xlsx, .xlsm, .xls or .csv). The "Excel Import & ' +
                        'Image Mapper" window opens.',
                    'Choose "📄 Single Sheet → AI" or "📚 Multi Tab → AI" at the top, ' +
                        'depending on whether you want one sheet or several.',
                    'Open "🎯 Column Mapping & Preview" and use the "Map to" row above the ' +
                        'preview to tell the app which column holds what. The chip beside it ' +
                        'counts your progress (e.g. "4/10 mapped") and turns green as you go.',
                    'Map "Description" at least — the app will not continue without it. Then ' +
                        'Step, Hazard Group and Risk, for a better result.',
                    'If the header is not on row 1, correct the "Header Row" and "Data Start ' +
                        'Row" boxes above the preview.',
                    'Pictures embedded in the workbook appear in the left "🖼️ Source Images" ' +
                        'pane. Drag them onto the step cards on the right, delete the ones you ' +
                        'do not want, and use "Add Step" for a step that needs a new photo.',
                    'Click "✓ Load as New Project". The steps and pictures are handed to the ' +
                        'Rich Media gallery as a new project, and the window closes.',
                    'IMPORTANT — the main table is deliberately EMPTY at this point. Go to the ' +
                        'gallery and click "Generate AI Risk Assessment" to build the table ' +
                        'from the notes that came out of your spreadsheet.',
                    'Review the generated table, then export or download as usual.'
                ],
                tips: [
                    'This is the step people miss: after "✓ Load as New Project" you land in ' +
                        'the gallery, not on a finished table. Nothing is broken — you still ' +
                        'have to press "Generate AI Risk Assessment" yourself.',
                    'Multi-tab workbooks: map one tab, then use "📋 Copy Mapping" and "📌 ' +
                        'Paste" on the next tab, or "📋 Apply to All Tabs" to do them all at ' +
                        'once. The mapping is not saved between sessions, so copy it before ' +
                        'you leave.',
                    '"📂 Advanced Import / Column Mapping" at the bottom of the tab reopens ' +
                        'the mapper with your file still loaded — it changes to "📂 Continue ' +
                        'Mapping" and shows the filename. You do not need to upload it again.',
                    'Steps with no picture are fine. They are imported with a placeholder, and ' +
                        'the message afterwards tells you how many still need one.',
                    '"💾 Save Mapper Progress (JSON)" saves the mapper\'s own working state ' +
                        '(step cards and column mapping) if you want to stop and come back to ' +
                        'it later. This is DIFFERENT from "Save Project" on the main table - ' +
                        'that one only exists after the mapper has handed off to the gallery.',
                    'Deleted steps are not gone — "↩️ Restore" brings them back.'
                ]
            },
            {
                id: 'excel-ra2025',
                label: 'RA 2025 Template, single file → GOEHS Export (Excel Sheet tab, card 2)',
                status: 'approved',
                parent: 'excel',
                summary:
                    'For one clean file already in the official RA 2025 format. It goes ' +
                    'straight into the main table — there is no AI generation step.',
                steps: [
                    'On the Excel Sheet tab, click card 2 "RA 2025 Template (1 file) → GOEHS ' +
                        'Export" and pick the file (.xlsx, .xlsm or .xls).',
                    'The app reads it and detects the language automatically.',
                    'The column mapper opens in confirm mode, showing the mapping it detected ' +
                        'plus a confidence summary, so a wrong guess cannot slip through ' +
                        'silently. Check it and correct anything that looks wrong.',
                    'If the workbook has several sheets, pick the one you want from the sheet ' +
                        'strip inside the mapper.',
                    'Confirm. The rows load straight into the main table, the dashboard ' +
                        'appears, and the app switches to the tab where the table lives.',
                    'Edit, translate or adjust the table as needed, then open GOEHS ' +
                        'Integration to export.'
                ],
                tips: [
                    'Unlike the Legacy path, you do NOT press "Generate AI Risk Assessment" ' +
                        'here — the table is already filled in from your file.',
                    'If a column was mapped wrongly, a "Remap Columns" button appears once the ' +
                        'table is loaded, so you can redo the mapping without starting over.',
                    'The confidence summary flags rating-scale columns it could not verify, ' +
                        'rather than quietly assuming a value.'
                ]
            },
            {
                id: 'excel-batch',
                label: 'Batch RA 2025 → GOEHS ZIP (Excel Sheet tab, card 3)',
                status: 'approved',
                parent: 'excel',
                summary:
                    'For exporting up to 20 finished RA 2025 workbooks in one go. It is a ' +
                    'file-to-file pipeline — it never loads anything into the main table.',
                steps: [
                    'On the Excel Sheet tab, click card 3 "Batch RA 2025 (~20 files) → GOEHS ' +
                        'Export" and select up to 20 files at once.',
                    'Fill in the export details at the top: Export Title, Organization, ' +
                        'Location and Assessment Date. These apply to the whole batch.',
                    'The app scans every file — a workbook with several sheets is split into ' +
                        'one entry per sheet — and shows a progress bar as it goes.',
                    'When it finishes you get a dashboard counting the files as "Ready", ' +
                        '"Attention" or "Failed", with a card for each one.',
                    'Open any file needing attention. Values that do not match an allowed ' +
                        'dropdown option are listed, and you can fix each one from a dropdown, ' +
                        'edit cells directly, or delete rows that do not apply.',
                    'Or click "🤖 Auto Fix with AI" to have the app resolve the mismatches for ' +
                        'you, then "✓ Accept & Mark Ready" once you are happy with the file.',
                    'Click "📦 Download ZIP" to get a single archive containing a GOEHS CSV, ' +
                        'XLSX and JSON for each file.'
                ],
                tips: [
                    'Limits: 20 files maximum, each under 10 MB, and .xlsx, .xlsm or .xls ' +
                        'only. Anything else is listed as skipped, with the reason shown.',
                    'A file that fails auto-detection can still be rescued — open its card, ' +
                        'set the columns manually, and re-parse it.',
                    'This path produces files, not a table on screen. If you wanted to edit ' +
                        'the assessment inside the app, use card 2 instead.'
                ]
            },
            {
                id: 'free-text',
                label: 'Free Text',
                status: 'approved',
                summary:
                    'Describe the job in your own words and let the app draft the whole '
                    + 'assessment table from that description. No photos needed \u2014 you can '
                    + 'add them afterwards.',
                steps: [
                    'Open the "Free Text" tab. You will see "\u270d\ufe0f Describe Your Task".',
                    'Write a detailed description of the work process in the big text box. '
                        + 'The more detail the better \u2014 include the equipment used, the '
                        + 'sequence of steps, how many people are involved, and any hazards '
                        + 'you already know about.',
                    'Mention any past incidents, near misses or known problem areas. The AI '
                        + 'raises the Likelihood score for those specific hazards and notes '
                        + 'the reason in the Hazard Source column, so the history is visible '
                        + 'in the finished assessment.',
                    'Click "Generate Task Breakdown".',
                    'The AI splits your description into individual task steps, works out the '
                        + 'hazards and consequences for each one, suggests existing controls, '
                        + 'and fills in the Frequency, Severity and Likelihood ratings.',
                    'Review the table that appears. Edit any cell, delete steps that do not '
                        + 'apply, and add controls. Risk scores recalculate as you go.',
                    'Add pictures to individual steps afterwards if you want them, then '
                        + 'export or download.'
                ],
                tips: [
                    'Vague in, vague out. "Changing a filter" produces a thin assessment; a '
                        + 'paragraph naming the machine, the tools, the isolation steps and '
                        + 'who does what produces a usable one.',
                    'A Free Text assessment starts with no images. You can add one to any '
                        + 'step later from that step\'s card, or park several in the image '
                        + 'tray and drag them onto the right steps.',
                    'Pictures added this way get the same automatic face blurring as '
                        + 'uploaded ones, and export identically.',
                    'There is a "How to?" button next to the heading if you want the short '
                        + 'in-app version of this walkthrough.'
                ]
            },
            {
                id: 'fire-ra',
                label: 'Fire Risk Assessment',
                status: 'beta',
                summary:
                    'Evaluates a physical zone (a room or area), not a task step - the '
                    + 'app\'s other workflows assess hazards per work step, this one '
                    + 'assesses a whole location for the risk of a fire starting, '
                    + 'spreading, and being controlled. Scores it with the Fire Triangle '
                    + 'Risk Index (FTRI), 0-100.',
                steps: [
                    'Open the "Fire Risk" tab and click "+ Add Zone". Give the zone a '
                        + 'descriptive name (e.g. "Mixing Room - Bldg 4").',
                    'Fill in the Location Profile card: building, floor, occupancy, area '
                        + 'size and occupant count.',
                    'In the Fire Triangle Assessment card, tick the real ignition sources '
                        + '(HEAT), combustible materials (FUEL) and atmosphere conditions '
                        + '(OXYGEN) present in the zone, from the checklists shown - each '
                        + 'item is tagged with the NFPA standard it comes from.',
                    'Or, in the AI-Assisted Zone Analysis card, describe the zone in your '
                        + 'own words (typing or the microphone icon) and click "Analyze '
                        + 'with AI". It reads your description and ticks the matching '
                        + 'ignition/fuel/oxygen items and controls for you - it does NOT '
                        + 'look at photos, only the text you write.',
                    'In the Existing Fire Protection Controls card, tick what is actually '
                        + 'in place across five categories: Detection, Suppression, '
                        + 'Compartmentation, Evacuation and Management. Each item shows '
                        + 'its effectiveness and the standard behind it; some are marked '
                        + 'mandatory.',
                    'Add pictures under "Zone Photos" and a layout under "Floor Plan & '
                        + 'Heat Map" if you have them, and use "Zone Notes & Observations" '
                        + 'for anything else worth recording.',
                    'Click "Calculate Fire Risk Index" to get the FTRI score (0-100) with '
                        + 'the full breakdown.',
                    'Use "Copy Report" to export the findings for sharing, and "Delete '
                        + 'Zone" if a zone needs removing. A single assessment can hold '
                        + 'several zones - each is scored independently.'
                ],
                tips: [
                    'This module is BETA and marked "NOT FOR PRODUCTION USE" - it needs '
                        + 'internal EHS approval before its results are relied on.',
                    'The three fire triangle legs compound each other: when heat, fuel '
                        + 'and oxygen are all rated strong, the app applies a multiplier on '
                        + 'top of the individual scores, because a complete triangle makes '
                        + 'ignition far more likely than any single strong leg.',
                    'FTRI bands: 80+ is CRITICAL (cease operations), 60-79 HIGH (act '
                        + 'within 24-48h), 30-59 MEDIUM (plan within 30 days), under 30 LOW '
                        + '(annual review).',
                    '"Analyze with AI" merges its findings into whatever you have already '
                        + 'ticked rather than replacing it, so selections you made by hand '
                        + 'are not lost.',
                    'This module states its own score and cites the standards it draws '
                        + 'on (NFPA, OSHA, FM Global) - it does not judge whether a zone '
                        + 'satisfies any of them. That determination is not something '
                        + 'this assistant makes either.'
                ]
            },
            {
                id: 'cost-benefit',
                label: 'Cost Benefit Analysis',
                status: 'beta',
                summary:
                    'Weighs the cost of a proposed control against the risk reduction it buys.',
                steps: [],
                tips: []
            },
            {
                // Not a tab of its own - opened as a modal FROM whichever workflow tab the
                // user is on (Rich Media, Excel, Free Text). It is still listed here so the
                // model has real content for it; buildSystemPrompt() includes every workflow
                // on every question regardless of which tab is "active", so this does not
                // need special screen-detection wiring to be answerable.
                id: 'goehs',
                label: 'GOEHS Integration',
                status: 'approved',
                summary:
                    'Exports your risk assessment as the batch upload file the GOEHS Risk ' +
                    'Registry expects. Requires a risk table to already exist - GOEHS reads ' +
                    'its tasks and hazards FROM that table, it does not build one from scratch.',
                steps: [
                    'Generate a risk assessment table first, using any workflow (Rich Media, ' +
                        'Excel import, or Free Text).',
                    'Click the "GOEHS Integration" button near the table.',
                    'The modal opens as one page (header and final review together) with a ' +
                        'banner confirming how many tasks and hazards it pulled in from your ' +
                        'table automatically.',
                    'Fill in the assessment header: Organization, Location, Department and ' +
                        'Workstation (the last two optional), Assessment Title, Date, and ' +
                        'Approver.',
                    'Review the hazard rows below: Hazard/Sub-Hazard, Outcome, initial ' +
                        'Frequency/Severity/Likelihood, Countermeasures, Countermeasure ' +
                        'Ladder, and residual F/S/L are all editable here.',
                    'For the Countermeasure Ladder specifically, use the "🤖 AI" or ' +
                        '"⚡ Intelligent" buttons to auto-classify a control description - ' +
                        'see the glossary entry for the difference between the two.',
                    'If you change the main risk table after opening GOEHS, use "Re-sync" to ' +
                        'pull the update in rather than reopening the modal from scratch.',
                    'Click "Download GOEHS Batch Upload XLSX" to export the finished file.'
                ],
                tips: [
                    'Editing a hazard field here (Category, Sub-Hazard, Outcome, Hazard ' +
                        'Source, Current Control, or Countermeasure Ladder) writes back to ' +
                        'the main risk table too - the two stay in sync in both directions, ' +
                        'not just GOEHS reading from the table.',
                    'The banner at the top always tells you whether your data was freshly ' +
                        'detected, refreshed because the main table changed since you last ' +
                        'opened GOEHS, or found nothing at all - worth reading before you ' +
                        'start on the header.'
                ]
            }
        ],

        betaNotice:
            'This part of the app is still in beta and being fine-tuned, so treat its ' +
            'output as a draft to check rather than a finished answer.',

        // ── Maps a tab to a workflow so the bot knows where the user is ────────
        screens: {
            'rich-media': 'rich-media',
            'excel': 'excel',
            'free-text': 'free-text',
            'fire-ra': 'fire-ra',
            'cost-benefit': 'cost-benefit'
        },

        // ── Things users get confused by ───────────────────────────────────────
        glossary: [
            {
                term: '🔧 AI Fix Hazard/Risk',
                definition:
                    'Scans every row for a Hazard Group or Hazard List value that is not a ' +
                    'standard entry (red outline). It first tries a fast local match against ' +
                    'the registry; only the rows it cannot confidently resolve that way are ' +
                    'sent to the AI. Risk/Consequences is deliberately left untouched, since ' +
                    'that field is often localized or imported free text.',
                note:
                    'This is the button to reach for first on a red outline — it fixes the ' +
                    'row outright rather than just suggesting. It changes the classification ' +
                    'only: Severity and Likelihood you have already set are left alone, ' +
                    'whether they came from an Excel import, the AI, or your own edit.'
            },
            {
                term: '🎯 Suggest Closest Match',
                definition:
                    'For any Hazard Group or Hazard List dropdown STILL outlined red after ' +
                    'AI Fix, applies the nearest standard entry as a best guess — purely by ' +
                    'local text matching, it never calls the AI.',
                note:
                    'Because it is a guess, not a confirmed fix, the result lands with a ' +
                    'dashed amber "unverified" outline instead of a plain valid value, so you ' +
                    'know to review it rather than trust it silently.'
            },
            {
                term: '⚡ Intelligent (GOEHS Countermeasure Ladder)',
                definition:
                    'A DIFFERENT tool from AI Fix / Suggest Closest Match above — this one ' +
                    'lives in the GOEHS export modal and classifies your Current Control ' +
                    'text onto the Countermeasure Ladder, using local keyword matching only. ' +
                    'Free and instant, but it can miss unusual phrasing.',
                note:
                    'Sits next to a separate "🤖 AI" button in the same modal, which handles ' +
                    'exactly the control descriptions the Intelligent button could not match, ' +
                    'by calling the AI. Use Intelligent first (free), then AI for what is left.'
            },
            {
                term: 'Countermeasure Ladder / Hierarchy of Controls',
                definition:
                    'Ranks controls by how reliable they are: Eliminate, Substitute, ' +
                    'Engineer, Visual, Admin, Individual (PPE). Higher is better because ' +
                    'it removes the hazard rather than relying on people behaving.',
                note:
                    'Eliminate takes the risk to zero. Substitute/Engineer are treated as ' +
                    'high-reliability. Admin/Visual/PPE depend on human action, so the app ' +
                    'credits them with less reduction.'
            },
            {
                term: 'Risk Score',
                definition:
                    'Frequency × Severity × Likelihood, using this app\'s own scales. ' +
                    'The Risk Category band is derived from that score.'
            },
            {
                term: 'Baseline rating',
                definition:
                    'When a step has no rating yet, the app fills in a starting Severity ' +
                    'and Likelihood based on the hazard type, so a new row is never blank.',
                note:
                    'It only ever fills a genuinely empty rating. It will not overwrite a ' +
                    'rating that already exists, no matter where that rating came from.'
            },
            {
                term: 'GOEHS export',
                definition:
                    'Produces the batch upload file for the GOEHS Risk Registry, mapping ' +
                    'this app\'s fields onto the vendor\'s expected columns.'
            },
            {
                // A user may say "the Project button" (singular, generic) meaning either
                // one of the actual pair - answer for BOTH rather than asking which, unless
                // context genuinely disambiguates.
                term: 'Save Project / Load Project (aka "the Project button(s)")',
                definition:
                    'Save Project bundles the current table, every gallery image, your ' +
                    'notes, and the Plant/Department identity fields into a single .json ' +
                    'file you download. Load Project reads that file back in and rebuilds ' +
                    'everything exactly as it was, so you can close the app and resume ' +
                    'later without redoing any work.',
                note:
                    'This is DIFFERENT from Download: Download produces the final delivery ' +
                    'package (optimized images, CSV, report) meant to be handed off, not ' +
                    'reopened here. Save Project is the "resume later" file; Download is ' +
                    'the "I am done" file. It is ALSO different from "Save Mapper Progress ' +
                    '(JSON)" in the Legacy Excel mapper - that button saves the mapper\'s own ' +
                    'step cards and column mapping, a different file, for a different tool. ' +
                    'The two are easy to conflate because they share the word "Project", but ' +
                    'a mapper-progress file cannot be loaded with Load Project, and a ' +
                    'Save Project file cannot be reopened in the mapper.'
            },
            {
                term: '"Intelligent Fill" (a name in messages, not a button)',
                definition:
                    'Several AI failure messages end with "Use Intelligent Fill instead." '
                    + 'There is NO button labelled "Intelligent Fill" anywhere in the app. '
                    + 'What they mean is the local, no-network option: "\u26a1 Intelligent", '
                    + 'found under the "\ud83c\udfaf Fix Countermeasure Ladder \u25be" button on the '
                    + 'GOEHS screen.',
                note:
                    '"Intelligent Fill" is also the name the app uses when it fills GOEHS '
                    + 'task fields from task-name keywords on its own - that one runs '
                    + 'automatically and has no button either. If a user is hunting for an '
                    + '"Intelligent Fill" button, tell them plainly that it does not exist '
                    + 'and point them at "\u26a1 Intelligent" instead.'
            },
            {
                term: 'Fire Triangle',
                definition:
                    'The three elements required for combustion: HEAT (an ignition '
                    + 'source - hot work, electrical faults, friction, static discharge), '
                    + 'FUEL (combustibles - rubber, solvents, dust, oils, packaging), and '
                    + 'OXYGEN (the atmosphere feeding it - normal air, or an enriched or '
                    + 'oxidizing environment). Remove any one leg and fire cannot start or '
                    + 'sustain. This is the concept behind the Fire Risk Assessment (BETA) '
                    + 'module\'s scoring.',
                note:
                    'In that module, "Fire Triangle Assessment" is a checklist: you tick '
                    + 'off which real ignition sources, fuel sources and oxygen conditions '
                    + 'are present in the zone, drawn from built-in registries (each item '
                    + 'tagged with the NFPA standard it comes from). When all three legs '
                    + 'are strong, the app applies a compounding multiplier, since a '
                    + 'complete fire triangle makes ignition far more likely than any one '
                    + 'strong leg alone.'
            },
            {
                term: 'FTRI (Fire Triangle Risk Index)',
                definition:
                    'The 0-100 score the Fire Risk Assessment (BETA) module calculates '
                    + 'for a zone: FTRI = (Fire Triangle score \u00d7 (1 - Control '
                    + 'Effectiveness) \u00d7 Consequence Amplifier) / 30 \u00d7 100. Higher '
                    + 'means greater risk.',
                note:
                    'Bands: 80+ CRITICAL (cease operations), 60-79 HIGH (act within '
                    + '24-48h), 30-59 MEDIUM (plan within 30 days), under 30 LOW (annual '
                    + 'review). This is the app\'s own module output, not a legal or '
                    + 'regulatory determination - it does not state whether a zone '
                    + 'satisfies a particular code.'
            },
            {
                term: 'Does the AI look at my photos?',
                definition:
                    'No - the AI never sees your images. "Generate AI Risk Assessment" sends '
                    + 'TEXT only: each picture\'s Description, Hazards and Controls as you '
                    + 'typed them, plus any ratings you set. The photo is never uploaded.',
                note:
                    'So the result depends entirely on your notes - an unannotated photo '
                    + 'contributes nothing and is skipped. It is also why images never leave '
                    + 'your device. Photos are for the humans reviewing it and for the export. '
                    + 'Same in Fire RA: "Analyze with AI" reads your typed zone description, '
                    + 'not the zone photos.'
            },
            {
                term: 'Photos pasted into Excel cells (do they survive the import?)',
                definition:
                    'Yes. The Legacy Excel path extracts pictures from the workbook itself, '
                    + 'including ones pasted straight into cells and ones from much older '
                    + 'Excel versions. They appear in the "Source Images" pane.',
                note:
                    'They are NOT matched to rows automatically - drag each onto the right '
                    + 'step card. If a picture\'s sheet cannot be determined, every image in '
                    + 'the workbook is shown rather than hiding any.'
            },
            {
                term: 'Case, punctuation and spacing when matching imported values',
                definition:
                    'Forgiving. Values are trimmed and compared without regard to upper/lower '
                    + 'case, then by partial match, then by closest spelling. So "HEAT '
                    + 'STRESS", "Heat stress " and "Heat-stress" all resolve to one entry.',
                note:
                    'But an imported value that is not an exact match is still outlined red '
                    + 'first, so you can see what was off - "\ud83d\udd27 AI Fix Hazard/Risk" or '
                    + '"\ud83c\udfaf Suggest Closest Match" is what applies the tolerant matching. '
                    + 'Nothing changes silently.'
            },
            {
                term: 'Why is the Risk / Consequences column not translated?',
                definition:
                    'Only Hazard Group and Hazard List are translated. Risk / Consequences is '
                    + 'not, because it is usually free text from your own sheet rather than a '
                    + 'fixed dropdown value.',
                note:
                    'A current limitation, not a fault in the file - the same applies to the '
                    + 'rating scales and most UI labels outside English, French and German. '
                    + 'If Hazard Group and Hazard List translate but Risk / Consequences does '
                    + 'not, that is expected behaviour: confirm it rather than sending the '
                    + 'user hunting for a setting that does not exist.'
            }
        ],

        colorCoding: [
            {
                cue: 'Red / amber / green risk bands',
                meaning:
                    'The Risk Category derived from the Risk Score. Red is the highest ' +
                    'band and needs the most attention.'
            },
            {
                cue: 'Dashed amber outline on a Severity or Likelihood dropdown',
                meaning:
                    'The value could not be confirmed — either the Excel importer could ' +
                    'not read it, or the Hazard List entry is not recognised so no ' +
                    'sensible default could be suggested. Set it yourself.'
            },
            {
                cue: 'Red outline on the Hazard Group or Hazard List field',
                meaning:
                    'The current value is not one of the standard registry entries. Both ' +
                    'fields are ordinary dropdowns, so the fastest fix is often to open the ' +
                    'dropdown yourself and pick the right value directly. Otherwise use ' +
                    '"🔧 AI Fix Hazard/Risk" to auto-correct every flagged row in one go, or ' +
                    '"🎯 Suggest Closest Match" for a quick local best-guess on whatever AI ' +
                    'Fix could not resolve. The outline clears once the value is valid.'
            },
            {
                cue: 'Blue row background with a 🤖 AI badge',
                meaning:
                    'NOT simply "the AI touched this row." It specifically means the ' +
                    "table's current Frequency/Severity/Likelihood for this row disagree " +
                    'with a rating you separately entered for that picture in the large ' +
                    'preview. It is a discrepancy flag asking you to check which one is ' +
                    'right — the row is edited exactly like any other, no special steps.'
            },
            {
                cue: 'Struck-through, greyed row',
                meaning:
                    'The row is marked deleted. It is excluded from exports but can be ' +
                    'restored — nothing is destroyed until you download.'
            },
            {
                cue: 'USED / THIS STEP badge in the image tray',
                meaning:
                    'USED means that picture is already attached to some step. THIS STEP ' +
                    'means it is the picture on the card you are looking at. One picture ' +
                    'can serve several steps and still exports as a single file.'
            }
        ],

        // ── symptom → cause → fix ─────────────────────────────────────────────
        // ── What each upload accepts ──────────────────────────────────────────
        // Taken from the accept attributes and the validation code. Note that the
        // picker filter and what the app actually processes are NOT the same list.
        fileTypes: [
            {
                where: 'Rich Media - the main "upload images and videos" area',
                accepts:
                    'Images: the file picker offers PNG and JPEG, but any image format '
                    + 'the browser itself can read is accepted. Videos: the picker offers '
                    + 'MP4, MOV, AVI, MKV and WEBM, and the app additionally accepts FLV, '
                    + 'WMV, M4V and 3GP, plus anything the browser reports as a video file.',
                notes:
                    'Dragging a file onto the upload area bypasses the picker\'s filter '
                    + 'entirely, which is why the second list is wider than the first. '
                    + 'There is no file size limit here. A file that is neither an image '
                    + 'nor a recognised video is skipped silently, with no error message - '
                    + 'so if a file simply never appears in the gallery, its format is the '
                    + 'first thing to check. Separately, being accepted is not the same as '
                    + 'being playable: video is played through the browser\'s own player, '
                    + 'so an unusual container may still fail to play or to capture frames '
                    + 'even though the app took it. MP4 is the safest choice.'
            },
            {
                where: 'Replace a picture, Add Photo, and the task modal image tray',
                accepts: 'Any image format the browser can read.',
                notes: 'Videos cannot be attached to a step this way - only still images.'
            },
            {
                where: 'Load Project',
                accepts: 'A .json project file.',
                notes: 'This is the file "Save Project" produces. A downloaded ZIP is not a project file and will not load.'
            },
            {
                where: 'Excel Sheet card 1 - Legacy Excel',
                accepts: '.xlsx, .xlsm, .xls or .csv',
                notes: 'The widest of the three Excel paths - it is the one meant for non-standard files.'
            },
            {
                where: 'Excel Sheet card 2 - RA 2025 Template, single file',
                accepts: '.xlsx, .xlsm or .xls',
                notes: 'No CSV here, because the RA 2025 layout is detected from a real worksheet.'
            },
            {
                where: 'Excel Sheet card 3 - Batch RA 2025',
                accepts: '.xlsx, .xlsm or .xls, up to 20 files, each under 10 MB',
                notes: 'Anything failing those limits is listed as skipped with the reason shown, rather than silently dropped.'
            },
            {
                where: 'The Excel mapper\'s own drop zone, inside the import window',
                accepts: '.xlsx, .xlsm, .xls or .json',
                notes: 'The .json here is mapper progress saved earlier with "Save Mapper Progress (JSON)" - not a main-app "Save Project" file, which the mapper does not accept.'
            }
        ],

        // ── Button reference ──────────────────────────────────────────────────
        // Extracted from the app's own markup. "does" uses each button's real title
        // attribute where it has one. If a button is not listed here, it is not
        // documented - say so rather than guessing at what it does.
        buttons: [
            // Top bar - visible from anywhere
            // Split into one entry per tab (was a single combined label) so each tab
            // name becomes its own clickable jump link. `nav: true` marks these as
            // safe for the link to actually PERFORM (switch tabs) rather than only
            // point at, unlike every other jump-able button here - a tab switch is
            // pure navigation with no data effect, the same trust level as a normal
            // in-app link, not an action like "Generate" or "Download".
            { label: 'Rich Media', where: 'top tab bar', does: 'Switches to the Rich Media workflow (photos & video).', dom: 'tab-rich-media', nav: true },
            { label: 'Free Text', where: 'top tab bar', does: 'Switches to the Free Text workflow.', dom: 'tab-free-text', nav: true },
            { label: 'Excel Sheet', where: 'top tab bar', does: 'Switches to the Excel Sheet workflow.', dom: 'tab-excel', nav: true },
            { label: 'Fire Risk', where: 'top tab bar', does: 'Switches to the Fire Risk Assessment workflow. Marked BETA.', dom: 'tab-fire-ra', nav: true },
            { label: 'Cost-Benefit', where: 'top tab bar', does: 'Switches to the Cost-Benefit Analysis workflow. Marked BETA.', dom: 'tab-cost-benefit', nav: true },
            // NOT dom-linked, on purpose: stripped of its emoji/caret, this label's
            // matchable core collapses to the single word "Project" - a word that also
            // appears constantly in ordinary prose (Project ID, Project name, "your
            // risk project"...) with no connection to this specific menu. Linking it
            // was tried and reliably false-positived on exactly that generic prose.
            // "Save Project" and "Download Project ZIP" below are dom-linked
            // individually instead, each with `reveal: ['projectMenuBtn']` - the menu
            // still opens on the way to either, this toggle just is not a link itself.
            { label: '\ud83d\udcc1 Project \u25be', where: 'top bar', does: 'Opens a menu holding "Save Project" and "Download Project ZIP".' },
            // Same reasoning as Project above: "Language" alone is too generic a word
            // (target Language, hazard dropdown Language...) to safely auto-link.
            { label: '\ud83c\udf10 Language \u25be', where: 'top bar', does: 'Opens the language menu, holding "Translate" and "Revert All Translations".' },
            { label: 'Translate', where: 'Language menu', does: 'Translates the main table into the chosen language.', dom: 'translateTableBtn', reveal: ['languageMenuBtn'] },
            { label: 'Revert All Translations', where: 'Language menu', does: 'Reverts all translations to the original values.', dom: 'revertTranslationsBtn', reveal: ['languageMenuBtn', 'translateTableBtn'] },
            { label: 'How to Use This App \ud83d\ude80', where: 'top bar', does: 'Opens the built-in walkthrough for every workflow.', dom: 'howToUseBtn' },
            { label: 'Privacy Policy', where: 'top bar', does: 'Explains what stays on your device.', dom: 'privacyBtn' },

            // Rich Media / main table
            { label: 'Process Files', where: 'Rich Media tab', does: 'Processes the uploaded photos or videos: resizes them and blurs faces on your device.', dom: 'processBtn', reveal: ['tab-rich-media'] },
            { label: 'Generate AI Risk Assessment', where: 'Rich Media tab, above the table', does: 'Builds the whole risk table from your image notes. This is the step the Legacy Excel path also needs.', dom: 'generateAiReportBtn', reveal: ['tab-rich-media'] },
            { label: 'Download ZIP', where: 'Rich Media tab', does: 'Downloads the table, the processed images and the report.', dom: 'downloadBtn', reveal: ['tab-rich-media'] },
            { label: 'Save Project', where: 'Rich Media tab and the Project menu', does: 'Saves a project file you can reload later.', dom: 'saveProjectBtn2', reveal: ['projectMenuBtn'] },
            { label: 'Load Project', where: 'Rich Media tab', does: 'Reloads a saved project file, restoring images, notes and the table.', dom: 'loadProjectBtn', reveal: ['tab-rich-media'] },
            { label: 'Download Project ZIP', where: 'Project menu', does: 'Downloads a ZIP with both full-size and optimized images.', dom: 'downloadProjectZipBtn', reveal: ['projectMenuBtn'] },
            { label: 'GOEHS Integration', where: 'above the table', does: 'Opens the GOEHS export screen. Needs a table to exist first.', dom: 'goehsIntegrationBtn' },
            { label: 'Remap Columns', where: 'above the table, after an Excel import', does: 'Re-maps the Excel columns if the data was not imported correctly.', dom: 'remapColumnsBtn' },
            { label: '\ud83d\udd27 AI Fix Hazard/Risk', where: 'above the table', does: 'Scans all rows and auto-corrects Hazard Group / Hazard List values that do not match the standard dropdown options. Risk/Consequences is left alone, since it is often localized or imported text.', dom: 'aiFixMainTableBtn' },
            { label: '\ud83c\udfaf Suggest Closest Match', where: 'above the table', does: 'For any Hazard Group / Hazard List dropdown still outlined red after AI Fix, applies the closest standard entry as a best guess for you to review. Purely local - it never calls the AI.', dom: 'aiClosestMatchBtn' },

            // Picture preview (lightbox) and editor
            { label: 'Audio Mode', where: 'image preview', does: 'Starts dictation, so you can speak the Description, Hazards or Controls instead of typing. Click one of those fields to choose where the text goes.' },
            { label: 'Undo Blur', where: 'image editor', does: 'Undoes the last blur stroke on this picture.' },
            { label: 'Replace', where: 'image preview', does: 'Swaps this picture for a different file, keeping the notes.' },
            { label: 'Delete', where: 'image preview', does: 'Removes this picture from the gallery.' },

            // Fullscreen video
            { label: 'Capture Frame', where: 'fullscreen video', does: 'Captures the current frame as a step. Keyboard shortcut: C.' },
            { label: '3s Clip', where: 'fullscreen video', does: 'Captures a 3-second clip into the review pane. Keyboard shortcut: G.' },
            { label: 'Play/Pause and Mute', where: 'fullscreen video', does: 'Space toggles play/pause, M toggles mute.' },
            { label: 'Download GIF ZIP \u25be', where: 'fullscreen video', does: 'Chooses the GIF ZIP size before downloading.' },

            // Task modal (opened from a table row)
            { label: '\ud83d\udcf7 Add Photo', where: 'task modal', does: 'Attaches a picture to this table row.' },
            { label: '\u270f\ufe0f Edit / Blur', where: 'task modal', does: 'Opens this row\'s picture in the editor to blur or annotate it.' },
            { label: '\ud83d\udd01 Replace', where: 'task modal', does: 'Swaps the picture attached to this row.' },
            { label: 'Remove', where: 'task modal', does: 'Unlinks the photo from the step. The image stays in the gallery.' },
            { label: '\uff0b Add Images', where: 'task modal image tray', does: 'Adds pictures to the tray so you can drag them onto steps.' },
            { label: '+ Add Control', where: 'task modal', does: 'Adds another control measure to this row.' },
            { label: '\ud83d\uddd1\ufe0f Delete', where: 'task modal', does: 'Deletes this task row.' },
            { label: '\u2190 Previous / Next \u2192', where: 'task modal footer', does: 'Moves between task rows without closing. Arrow keys work too.' },

            // Legacy Excel mapper
            { label: '\ud83d\udcc2 Advanced Import / Column Mapping', where: 'Excel Sheet tab, below the three cards', does: 'Reopens the mapper. Once a file is loaded it changes to "\ud83d\udcc2 Continue Mapping" and shows the filename - no need to re-upload.', dom: 'advancedImportBtn', reveal: ['tab-excel'] },
            { label: '\ud83d\udcc4 Single Sheet \u2192 AI / \ud83d\udcda Multi Tab \u2192 AI', where: 'top of the Excel mapper', does: 'Chooses whether to process one sheet or run the multi-tab pipeline.' },
            { label: '\ud83d\udccb Copy Mapping', where: 'Excel mapper', does: 'Copies the current column mapping - then switch to the next tab and click Paste.' },
            { label: '\ud83d\udccc Paste', where: 'Excel mapper', does: 'Pastes the copied mapping into this tab.' },
            { label: '\ud83d\udccb Apply to All Tabs', where: 'Excel mapper', does: 'Applies this mapping to ALL other tabs at once.' },
            { label: '\ud83e\uddf9 Clear', where: 'Excel mapper', does: 'Clears all mapped columns.' },
            { label: '\u21bb Refresh', where: 'Excel mapper', does: 'Re-reads the sheet with the current mapping.' },
            { label: 'Add Step', where: 'Excel mapper', does: 'Adds an empty step card, for a step that needs a new photo.' },
            { label: '\u21a9\ufe0f Restore', where: 'Excel mapper', does: 'Brings back step cards you deleted. The count is shown on the button.' },
            { label: '\ud83d\udcbe Save Mapper Progress (JSON)', where: 'Excel mapper footer', does: 'Saves the MAPPER\'S OWN working state (step cards + column mapping) to come back to later. Different data, and a different file, from "Save Project" on the main table - do not conflate the two.' },
            { label: '\u2713 Load as New Project', where: 'Excel mapper footer', does: 'Hands the steps and pictures to the Rich Media gallery as a new project. The table is left EMPTY - you then press "Generate AI Risk Assessment".' },

            // RA 2025 mapper
            { label: '\ud83d\udcca Show full sheet preview & advanced mapping', where: 'RA 2025 mapper', does: 'Expands the full sheet preview so you can map columns by hand.' },
            { label: '\u2713 Parse & Load to Table', where: 'RA 2025 mapper', does: 'Confirms the mapping and loads the rows straight into the main table.' },

            // Multi-tab pipeline
            { label: 'Select all / Deselect all / Only with >=3 rows', where: 'Multi-Tab Excel pipeline', does: 'Chooses which sheets of the workbook to queue.' },
            { label: 'Re-read Rows', where: 'Multi-Tab pipeline', does: 'Re-parses the selected sheets with the current mapping.' },
            { label: 'Apply Copied to Selected', where: 'Multi-Tab pipeline', does: 'Applies a copied mapping to every selected sheet.' },
            { label: '\ud83e\udd16 Start AI', where: 'Multi-Tab pipeline', does: 'Runs AI processing over every queued sheet. The number queued is shown on the button.' },
            { label: 'Review Processed', where: 'Multi-Tab pipeline', does: 'Opens the results for checking, including after a cancel.' },
            { label: '\ud83d\udd27 AI Fix All Tabs', where: 'Multi-Tab results', does: 'Runs the hazard/risk fix across every processed tab at once.' },

            // GOEHS export screen
            { label: '\ud83c\udfaf Fix Countermeasure Ladder \u25be', where: 'GOEHS screen', does: 'Fixes the Current and Predictive ladder columns. Opens into two choices: AI, or local keyword matching.' },
            { label: '\ud83e\udd16 AI', where: 'under Fix Countermeasure Ladder', does: 'Makes an AI call to classify control descriptions the local keyword engine could not match.' },
            { label: '\u26a1 Intelligent', where: 'under Fix Countermeasure Ladder', does: 'Local keyword matching only - free and instant, but may miss unusual phrasing. Never calls the AI.' },
            { label: '\ud83e\udd16 AI Fix Hazard/Sub-Hazard', where: 'GOEHS screen', does: 'Uses AI to correct the Hazard / Sub-Hazard classification.' },
            { label: 'Download GOEHS Batch Upload XLSX', where: 'GOEHS screen', does: 'Downloads the finished GOEHS batch upload file.' },

            // Batch RA 2025
            { label: '\ud83e\udd16 Auto Fix with AI', where: 'batch file card', does: 'Resolves the dropdown mismatches in that file automatically.' },
            { label: '\u2713 Accept & Mark Ready', where: 'batch file card', does: 'Marks the file as ready for export.' },
            { label: '\ud83d\udce6 Download ZIP', where: 'batch screen', does: 'Downloads one archive with a GOEHS CSV, XLSX and JSON per file.' }
        ],

        // ── Literal error messages the app can show ───────────────────────────
        // Match on the message the user quotes. These are the exact strings in the
        // code, so if a user pastes one, it can be identified precisely.
        errorMessages: [
            { message: 'No risk assessment notes found. Please add notes to your images in the lightbox preview first.', means: 'No notes have been entered against any picture yet.', fix: 'Click a thumbnail to open the preview and fill in Description, Hazards or Controls, then generate again.' },
            { message: 'No risk assessment notes found. Please add notes (description, hazards, or controls) to your images.', means: 'Pictures exist, but not one of them has a description, hazard or control filled in.', fix: 'Open at least one picture and add a note. Empty pictures are skipped when the table is generated.' },
            { message: 'No data to save. Please generate a table or upload images.', means: 'There is nothing in the project yet.', fix: 'Upload images or generate a table first, then save.' },
            { message: 'Failed to load project: Invalid file. / Invalid Project File Structure', means: 'The chosen file is not a project file saved by this app, or it is damaged.', fix: 'Use the .json file produced by "Save Project". A downloaded ZIP is not a project file.' },
            { message: 'That picture is no longer in the gallery, so it cannot be edited.', means: 'The picture was deleted from the gallery while the editor was still pointing at it.', fix: 'Close the editor and pick a picture that is still in the gallery.' },
            { message: 'Could not add that picture. Please try a different image file.', means: 'The browser could not decode that image file.', fix: 'Try a normal JPG or PNG. Unusual or corrupted formats are rejected.' },
            { message: 'Video is still loading. Please wait a moment.', means: 'Capture was pressed before the browser had buffered enough video.', fix: 'Wait for the video to be ready, then capture again.' },
            { message: 'Move slightly earlier in the video, then try clip capture again.', means: 'You are within a fraction of a second of the end of the video, so a 3-second clip will not fit.', fix: 'Scrub back a little and capture again.' },
            { message: 'Could not find GIF data. Try playing the preview first.', means: 'The clip has not been rendered yet.', fix: 'Play the preview once, then download.' },
            { message: 'Speech recognition not supported in this browser. / Speech-to-text is not supported in your browser.', means: 'The browser has no speech recognition engine.', fix: 'Use Chrome, which supports it. Typing always works.' },
            { message: 'Microphone access denied. Please allow microphone access in your browser.', means: 'The browser blocked microphone permission.', fix: 'Allow the microphone for this site in the browser address bar, then start Audio Mode again.' },
            { message: 'No speech detected. Please speak into your microphone.', means: 'Dictation started but heard nothing.', fix: 'Check the right microphone is selected and speak clearly, or type instead.' },
            { message: 'ZIP library is unavailable. Refresh and try again. / Error: JSZip library not loaded.', means: 'A support library did not load with the page.', fix: 'Refresh the page. If it keeps happening the local files in the lib folder or the CDN are unreachable.' },
            { message: 'PDFKit is not loaded. Cannot generate PDF.', means: 'The PDF library did not load with the page.', fix: 'Refresh the page, then generate the report again.' },
            { message: 'Error: Failed to load essential libraries: ... Please ensure local files are in the ./lib/ directory or check CDN links, and refresh.', means: 'One or more of face-api.js, JSZip, pdfkit or blob-stream is missing, so face blurring or export cannot run.', fix: 'Refresh. If it persists, this is an installation or network problem, not something you can fix from inside the app.' },
            { message: 'Maximum 20 files allowed. You selected N.', means: 'The batch path takes at most 20 files at a time.', fix: 'Split the selection into batches of 20 or fewer.' },
            { message: 'Please enter an Export Title.', means: 'The batch export needs a title before it can build the ZIP.', fix: 'Fill in Export Title at the top of the batch screen.' },
            { message: 'No data rows found (auto-detection failed). Use the Column Mapper to set columns manually.', means: 'The importer could not work out which columns hold what.', fix: 'Open that file\'s card and set the columns by hand, then re-read the rows.' },
            { message: 'Could not auto-detect RA 2025 format. Opening manual column mapper...', means: 'The file did not match the expected RA 2025 layout.', fix: 'Nothing to do - the app opens the manual mapper for you automatically. Set the columns and continue.' },
            { message: 'AI returned no usable results - check column mapping or try again', means: 'The AI ran but produced nothing usable, usually because the mapped columns did not contain the expected text.', fix: 'Check the column mapping, then try again.' },
            { message: 'No rows in the table to fix. / No rows in the table.', means: 'A table-wide action was pressed before a table existed.', fix: 'Generate or import the table first.' },
            { message: 'Network error - API server may be unavailable. Use Intelligent Fill instead.', means: 'The AI service could not be reached at all.', fix: 'Check the connection and retry. To carry on without AI, use the local option: "\u26a1 Intelligent" under "\ud83c\udfaf Fix Countermeasure Ladder".' },
            { message: 'API endpoint not found (404). The AI service may be temporarily unavailable. Use Intelligent Fill instead.', means: 'The AI service is not answering on the expected address.', fix: 'Retry later. Meanwhile use the local option: "\u26a1 Intelligent" under "\ud83c\udfaf Fix Countermeasure Ladder".' },
            { message: 'All AI batch(es) failed. Use Intelligent Fill instead.', means: 'Every AI request in the run failed.', fix: 'Fall back to the local keyword matching, "\u26a1 Intelligent", which needs no network.' },
            { message: 'AI did not return valid JSON / AI response was in an invalid format / Empty AI response', means: 'The AI replied with something the app could not read.', fix: 'Try again - this is usually transient. If it repeats, use the local "\u26a1 Intelligent" option instead.' },
            { message: 'An error occurred while applying the blur. / Error loading image for manual blur.', means: 'The editor could not process that picture.', fix: 'Close and reopen the picture. If it keeps failing, replace the image with a different file.' }
        ],

        troubleshooting: [
            {
                symptom:
                    'I imported a legacy Excel sheet and the risk table is empty (Legacy '
                    + 'Excel \u2192 AI Processing)',
                cause:
                    'Nothing has gone wrong. The Legacy path hands the steps and pictures '
                    + 'to the gallery as a new project and leaves the table empty on '
                    + 'purpose \u2014 building it is a separate, deliberate step.',
                fix:
                    'Go to the gallery and click "Generate AI Risk Assessment". The AI '
                    + 'builds the table from the notes imported out of your spreadsheet. '
                    + 'Only the Legacy path works this way; the RA 2025 single-file path '
                    + 'fills the table for you.'
            },
            {
                symptom: 'The Excel mapper will not let me continue',
                cause:
                    'At least the "Description" column has to be mapped before the app '
                    + 'can extract anything.',
                fix:
                    'Use the "Map to" row above the preview to point Description at the '
                    + 'right column. The progress chip ("4/10 mapped") turns green as you '
                    + 'add more. If the headers sit lower down, fix the "Header Row" and '
                    + '"Data Start Row" boxes first.'
            },
            {
                symptom: 'The video controls do nothing when I first open a video',
                cause:
                    'The face-detection engine prepares itself the first time it is used ' +
                    'in a session, which briefly ties up the browser.',
                fix:
                    'The controls are disabled with a "Preparing capture tools" note until ' +
                    'it finishes, then unlock. It only happens for the first video.'
            },
            {
                symptom: 'My Severity/Likelihood changed when I fixed the hazard',
                cause: 'This was a bug in older versions.',
                fix:
                    'Existing ratings are now preserved on a Hazard List change regardless ' +
                    'of where they came from. Only a genuinely empty rating gets filled in.'
            },
            {
                symptom: 'A picture I added is not in the downloaded ZIP',
                cause: 'The picture is in the gallery but not attached to any step.',
                fix:
                    'Drag it from the image tray onto a step, or use Add Photo on that ' +
                    'step\'s card. Only pictures attached to a step are exported.'
            },
            {
                symptom: 'A face was blurred that should not have been',
                cause: 'The detector was over-eager.',
                fix:
                    'Open the picture in the editor and use the eraser — it restores the ' +
                    'original pixels underneath the blur.'
            },
            {
                symptom: 'A face was missed and not blurred',
                cause: 'The detector did not find it.',
                fix:
                    'Open the picture in the editor and use the blur brush to cover it ' +
                    'manually before exporting.'
            }
        ],

        // ── Suggested follow-up questions ─────────────────────────────────────
        // Rendered as tappable chips under the assistant's answer. Chosen in code from
        // this list — the model is NOT asked to invent them, so a suggestion can never
        // point at a feature that does not exist, and it costs no extra AI call.
        //
        //   when:  workflow ids (matching `screens` values) this applies to. '*' = always.
        //   needs: optional screen precondition, checked in assistant.js —
        //            'table'    → only once a risk table exists
        //            'no-table' → only before a table has been generated
        //            'gallery'  → only once there is at least one image
        // Order matters: earlier entries are offered first. Keep the most likely
        // next question near the top of each workflow's group.
        followUps: [
            // Rich Media — roughly the order a user meets them
            { q: 'Does the AI look at my photos?',                    when: ['rich-media'] },
            { q: 'What image and video formats can I upload?',       when: ['rich-media'] },
            { q: 'How do I capture frames from a video?',            when: ['rich-media'] },
            { q: 'How do I blur a face the detector missed?',        when: ['rich-media'], needs: 'gallery' },
            { q: 'A face was blurred by mistake — can I undo it?',   when: ['rich-media'], needs: 'gallery' },
            { q: 'How do I reorder my steps?',                       when: ['rich-media'], needs: 'gallery' },
            { q: 'How do I add a step without a photo?',             when: ['rich-media'] },
            { q: 'How do I generate the risk assessment table?',     when: ['rich-media', 'free-text'], needs: 'no-table' },

            // Excel — three genuinely different paths, so the chooser leads on the tab
            // itself. Sub-workflow ids ('excel-legacy' etc.) only become the ACTIVE
            // screen once that specific mapper modal is open (see MODAL_WORKFLOW_IDS
            // in assistant.js), so a chip tagged there surfaces only inside that
            // modal, not for the whole Excel tab in general.
            { q: 'Which Excel import path should I use?',            when: ['excel'] },
            { q: 'I loaded a legacy sheet — why is my table empty?', when: ['excel', 'excel-legacy'] },
            { q: 'How do I map my spreadsheet columns?',             when: ['excel', 'excel-legacy', 'excel-ra2025'] },
            { q: 'How do I reuse my pictures from the old sheet?',   when: ['excel', 'excel-legacy'] },
            { q: 'Are photos pasted into cells kept on import?',      when: ['excel', 'excel-legacy'] },
            { q: 'Can I load another sheet from the same file?',     when: ['excel', 'excel-legacy'] },
            { q: 'How do I fix mismatches in a batch export?',       when: ['excel', 'excel-batch'] },
            { q: 'Why is a value flagged after import?',             when: ['excel', 'excel-ra2025', 'excel-batch'] },

            // Free Text
            { q: 'Can I add pictures to a step afterwards?',         when: ['free-text'] },
            { q: 'How do I attach one photo to several steps?',      when: ['free-text'], needs: 'table' },

            // GOEHS Integration — its own modal, no tab of its own at all
            { q: 'What is the difference between the AI and Intelligent buttons here?', when: ['goehs'] },
            { q: 'How do I download the GOEHS batch upload file?',   when: ['goehs'] },

            // Once a table exists — relevant in any workflow
            { q: 'What do the colours in the table mean?',           when: ['*'], needs: 'table' },
            { q: "What's the difference between AI Fix and Suggest Closest Match?", when: ['*'], needs: 'table' },
            { q: 'What does the blue row with the AI badge mean?',              when: ['*'], needs: 'table' },
            { q: 'How is the risk score calculated?',                when: ['*'], needs: 'table' },
            { q: 'How do I add controls to reduce a risk?',          when: ['*'], needs: 'table' },
            { q: 'What do I get when I download?',                   when: ['*'], needs: 'table' },
            { q: 'How do I export to GOEHS?',                        when: ['*'], needs: 'table' },

            // Always available
            { q: 'What happens to my photos — are they uploaded?',   when: ['*'] },
            { q: 'What can you help me with?',                       when: ['*'] }
        ],

        // ── Language ──────────────────────────────────────────────────────────
        language: {
            policy:
                'Detect the language of the user\'s message and reply in that same ' +
                'language. Keep product names, button labels and field names in the ' +
                'form the user sees on screen (usually English), so they can find them, ' +
                'and explain around them in their language.'
        },

        // ── Tone ──────────────────────────────────────────────────────────────
        style: [
            'Match the length to the question. A yes/no or "what does this colour mean" ' +
                'question deserves two sentences. A "how do I…" question deserves the ' +
                'FULL numbered walkthrough, start to finish — do not summarise a procedure ' +
                'into a sentence or two, and do not stop at the first step.',
            'For any procedural question, give the numbered steps from the knowledge base, ' +
                'name the actual on-screen buttons in quotes, and mention the relevant ' +
                'keyboard shortcuts and the gotchas listed for that workflow.',
            'End a walkthrough by saying what happens next, so the user knows they are on ' +
                'the right track (e.g. what appears on screen once a step succeeds).',
            'Answer the question that was asked, not the one you wish had been asked.',
            'If the answer depends on which workflow they are in and you cannot tell, ask.',
            'Prefer specifics over generalities: "click Capture Frame, or press C" beats ' +
                '"use the capture controls".',
            'If you genuinely do not know, say so and suggest where in the app to look. ' +
                'Never invent a button, menu or feature that is not in this knowledge base.',
            'Never offer help you then withdraw. You explain how to use this app; you do ' +
                'not operate it for the user. So do not say you will build, generate or ' +
                'create something and then refuse it a message later - say up front that ' +
                'you will walk them through doing it, and then actually walk them through ' +
                'it, step by step, to the end.',
            'Resolve "it", "that", "this" and bare references like "the table" against ' +
                'the MOST RECENT thing discussed, not an earlier one. If a user asks a ' +
                'follow-up, they almost always mean the topic of the message immediately ' +
                'before it. When it is genuinely ambiguous, name the two possibilities and ' +
                'ask which they mean - never silently answer the older one.'
        ]
    };

    window.RAB_ASSISTANT_KB = KB;
})();
