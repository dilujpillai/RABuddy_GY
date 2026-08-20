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
                'What the app does with the user\'s data and images'
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
                'question. Keep the refusal to one or two sentences.'
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
                    'Generate the risk assessment table from the gallery.',
                    'Review the table — check any values flagged for attention, adjust ' +
                        'Frequency / Severity / Likelihood, and add controls.',
                    'Download. You get the table, the processed images, and the report.'
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
                label: 'Excel import (legacy sheets & RA2025)',
                status: 'approved',
                summary:
                    'Bring an existing risk assessment spreadsheet in, map its columns to ' +
                    'the app\'s fields, and continue working on it here.',
                steps: [
                    'Upload an .xlsx, .xlsm or .xls file.',
                    'The app proposes a column mapping and shows a confidence indicator.',
                    'Confirm or correct the mapping, then load the sheet.',
                    'Pictures embedded in the sheet are extracted and can be attached to steps.'
                ],
                tips: [
                    'Mapping is remembered per template, not per file — the next sheet with ' +
                        'the same headers is mapped for you automatically.',
                    'The Advanced Import button shows the currently loaded file, so you can ' +
                        'reopen the mapper and work on another sheet without re-uploading.',
                    'Values the importer could not read are flagged rather than silently ' +
                        'defaulted, so you can see what needs checking.'
                ]
            },
            {
                id: 'free-text',
                label: 'Free Text',
                status: 'approved',
                summary:
                    'Describe the job in your own words and let the app draft the ' +
                    'assessment table. No photos needed.',
                steps: [
                    'Type or dictate a description of the task and its hazards.',
                    'Generate the table.',
                    'Add pictures to individual steps afterwards if you want them.'
                ],
                tips: [
                    'A Free Text assessment starts with no images. You can add one to any ' +
                        'step later from that step\'s card, or park several in the image ' +
                        'tray and drag them onto the right steps.',
                    'Pictures added this way get the same automatic face blurring as ' +
                        'uploaded ones, and export identically.'
                ]
            },
            {
                id: 'fire-ra',
                label: 'Fire Risk Assessment',
                status: 'beta',
                summary: 'A dedicated fire risk assessment module.',
                steps: [],
                tips: []
            },
            {
                id: 'cost-benefit',
                label: 'Cost Benefit Analysis',
                status: 'beta',
                summary:
                    'Weighs the cost of a proposed control against the risk reduction it buys.',
                steps: [],
                tips: []
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
                term: 'AI Fix (Hazard / Sub-Hazard)',
                definition:
                    'Sends the row to the AI to correct the hazard classification — it ' +
                    'picks the closest valid Hazard List entry for what you described.',
                note:
                    'It changes the classification only. Severity and Likelihood you have ' +
                    'already set are left alone, whether they came from an Excel import, ' +
                    'the AI, or your own edit.'
            },
            {
                term: 'Intelligent Fix',
                definition:
                    'Tries a local keyword match first and only calls the AI for rows it ' +
                    'could not resolve on its own.',
                note:
                    'Cheaper and faster than AI Fix because most rows never reach the AI. ' +
                    'Use it for bulk tidying; use AI Fix when one specific row is wrong.',
                verify: true
            },
            {
                term: 'Suggest Closest Match',
                definition:
                    'Offers the nearest valid Hazard List entry for a value that is not in ' +
                    'the registry, without committing the change until you accept it.'
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
            }
        ],

        // ── Colour / badge meanings ───────────────────────────────────────────
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
                cue: 'Red outline on the Hazard List or Hazard Group field',
                meaning:
                    'The value is not a recognised entry in the registry. Use Suggest ' +
                    'Closest Match or pick a valid entry.'
            },
            {
                cue: 'Blue row background with a 🤖 AI badge',
                meaning:
                    'The row was added or altered by the AI rather than coming straight ' +
                    'from your source data.'
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
        troubleshooting: [
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
            { q: 'How do I capture frames from a video?',            when: ['rich-media'] },
            { q: 'How do I blur a face the detector missed?',        when: ['rich-media'], needs: 'gallery' },
            { q: 'A face was blurred by mistake — can I undo it?',   when: ['rich-media'], needs: 'gallery' },
            { q: 'How do I reorder my steps?',                       when: ['rich-media'], needs: 'gallery' },
            { q: 'How do I add a step without a photo?',             when: ['rich-media'] },
            { q: 'How do I generate the risk assessment table?',     when: ['rich-media', 'free-text'], needs: 'no-table' },

            // Excel
            { q: 'How do I map my spreadsheet columns?',             when: ['excel'] },
            { q: 'Why is a value flagged after import?',             when: ['excel'] },
            { q: 'Can I load another sheet from the same file?',     when: ['excel'] },

            // Free Text
            { q: 'Can I add pictures to a step afterwards?',         when: ['free-text'] },
            { q: 'How do I attach one photo to several steps?',      when: ['free-text'], needs: 'table' },

            // Once a table exists — relevant in any workflow
            { q: 'What do the colours in the table mean?',           when: ['*'], needs: 'table' },
            { q: "What's the difference between AI Fix and Intelligent Fix?", when: ['*'], needs: 'table' },
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
                'Never invent a button, menu or feature that is not in this knowledge base.'
        ]
    };

    window.RAB_ASSISTANT_KB = KB;
})();
