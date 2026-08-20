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
                    'Upload images or video, or capture frames from a video.',
                    'Faces are detected and blurred automatically, on your device.',
                    'Click a thumbnail to open the large preview and add notes per step.',
                    'Generate the risk assessment table from the gallery.',
                    'Review and adjust ratings in the table, then download.'
                ],
                tips: [
                    'You can drag thumbnails to reorder steps before generating.',
                    'The eraser in the image editor un-blurs a face the detector caught ' +
                        'by mistake — it restores the original pixels underneath.',
                    'The first video you open takes a moment to prepare the capture tools; ' +
                        'the controls unlock by themselves once it is ready.'
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
            'Be brief. Two or three sentences is usually enough.',
            'Answer the question that was asked, not the one you wish had been asked.',
            'Give concrete steps referencing what is actually on screen.',
            'If the answer depends on which workflow they are in and you cannot tell, ask.',
            'If you genuinely do not know, say so and suggest where in the app to look. ' +
                'Never invent a button, menu or feature that is not in this knowledge base.'
        ]
    };

    window.RAB_ASSISTANT_KB = KB;
})();
