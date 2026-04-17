/* ============================================================
   how-to-guide.js  —  Tabbed "How to Use This App" modal
   Standalone file: no engine coupling.
   Opens via:  window.showHowToUseModal(optionalTabId)
   Tab IDs:    'rich-media' | 'free-text' | 'excel' | 'fire-risk' | 'tips'
   Kill switch: window.HOW_TO_GUIDE_ENABLED = false
   ============================================================ */

(function () {
    'use strict';

    if (window.HOW_TO_GUIDE_ENABLED === false) return;

    /* ── Helpers ─────────────────────────────────────────────── */
    function getLang() {
        const sel = document.getElementById('langSelect');
        const v = sel ? sel.value : 'en';
        return ['en', 'fr', 'de'].includes(v) ? v : 'en';
    }

    /* ── Tab definitions ─────────────────────────────────────── */
    const TABS = [
        {
            id: 'rich-media',
            icon: '📸',
            label: { en: 'Rich Media', fr: 'Médias Riches', de: 'Rich Media' },
            accentColor: '#6366f1',
            activeBg: '#eef2ff',
            activeBorder: '#6366f1',
            activeText: '#4338ca'
        },
        {
            id: 'free-text',
            icon: '✍️',
            label: { en: 'Free Text', fr: 'Texte Libre', de: 'Freitext' },
            accentColor: '#8b5cf6',
            activeBg: '#f5f3ff',
            activeBorder: '#8b5cf6',
            activeText: '#6d28d9'
        },
        {
            id: 'excel',
            icon: '📊',
            label: { en: 'Excel', fr: 'Excel', de: 'Excel' },
            accentColor: '#059669',
            activeBg: '#ecfdf5',
            activeBorder: '#059669',
            activeText: '#065f46'
        },
        {
            id: 'fire-risk',
            icon: '🔥',
            label: { en: 'Fire Risk', fr: 'Risque Incendie', de: 'Brandrisiko' },
            accentColor: '#ea580c',
            activeBg: '#fff7ed',
            activeBorder: '#ea580c',
            activeText: '#9a3412'
        },
        {
            id: 'tips',
            icon: '💡',
            label: { en: 'Key Tips', fr: 'Conseils Clés', de: 'Wichtige Tipps' },
            accentColor: '#0284c7',
            activeBg: '#f0f9ff',
            activeBorder: '#0284c7',
            activeText: '#0c4a6e'
        }
    ];

    /* ── Content per tab ─────────────────────────────────────── */
    const CONTENT = {
        'rich-media': {
            en: {
                headline: '🎥 Start Fresh with Rich Media',
                intro: 'Capture the real world as it is — photos and videos become your risk assessment foundation.',
                sections: [
                    {
                        color: 'indigo',
                        title: '📷 Step 1 — Capture Your Process',
                        body: 'Upload images or short video clips of the work area or task. Walk through each step of the process as if documenting it for someone who has never seen it. More images = better AI coverage.'
                    },
                    {
                        color: 'violet',
                        title: '🙈 Step 2 — Faces Auto-Blurred',
                        body: 'The app automatically detects and blurs faces in every uploaded image using an on-device AI model. If a face is missed, click directly on it in the preview to apply a manual blur patch. No images ever leave your device.'
                    },
                    {
                        color: 'blue',
                        title: '🏷️ Step 3 — Tag Each Image',
                        body: 'Tap any thumbnail to open the detail panel. Add a <strong>Description</strong> (what is happening), <strong>Hazards</strong> (what could go wrong, with optional 1–5 rating), and <strong>Controls</strong> (what mitigations are in place). Sitting with the operational team at this step makes the output significantly stronger.'
                    },
                    {
                        color: 'indigo',
                        title: '🤖 Step 4 — Generate AI Risk Assessment',
                        body: 'Click <strong>"Generate AI Risk Assessment from Image Notes"</strong>. The AI processes all image notes, preserves any ratings you entered manually, identifies additional hazards, and builds the full risk table automatically.'
                    },
                    {
                        color: 'slate',
                        title: '✅ Step 5 — Review & Download',
                        body: 'Review the table. Delete steps that don\'t apply. Edit any AI-generated values. Once satisfied, click <strong>"Download Project ZIP"</strong> to save all images, reports, and JSON project file to your PC.'
                    }
                ]
            },
            fr: {
                headline: '🎥 Commencez avec des Médias Riches',
                intro: 'Capturez le monde réel tel qu\'il est — les photos et vidéos deviennent la base de votre évaluation des risques.',
                sections: [
                    { color: 'indigo', title: '📷 Étape 1 — Capturez le Processus', body: 'Téléchargez des images ou de courtes vidéos de la zone de travail. Documentez chaque étape du processus.' },
                    { color: 'violet', title: '🙈 Étape 2 — Floutage Automatique des Visages', body: 'L\'application détecte et floute automatiquement les visages. Si un visage est manqué, cliquez dessus manuellement. Aucune image ne quitte votre appareil.' },
                    { color: 'blue', title: '🏷️ Étape 3 — Annotez Chaque Image', body: 'Appuyez sur une miniature pour ouvrir le panneau de détail. Ajoutez une <strong>Description</strong>, des <strong>Dangers</strong> (note optionnelle 1–5), et des <strong>Contrôles</strong>.' },
                    { color: 'indigo', title: '🤖 Étape 4 — Générez l\'Évaluation IA', body: 'Cliquez sur <strong>"Générer une évaluation des risques IA à partir des notes d\'image"</strong>. L\'IA traite toutes vos notes et construit automatiquement le tableau complet.' },
                    { color: 'slate', title: '✅ Étape 5 — Vérifiez et Téléchargez', body: 'Vérifiez le tableau, supprimez les étapes inutiles, puis téléchargez le <strong>ZIP du projet</strong>.' }
                ]
            },
            de: {
                headline: '🎥 Mit Rich Media starten',
                intro: 'Erfassen Sie die reale Welt — Fotos und Videos werden zur Grundlage Ihrer Risikobewertung.',
                sections: [
                    { color: 'indigo', title: '📷 Schritt 1 — Prozess erfassen', body: 'Laden Sie Bilder oder kurze Videos des Arbeitsbereichs hoch. Dokumentieren Sie jeden Schritt des Prozesses.' },
                    { color: 'violet', title: '🙈 Schritt 2 — Gesichter automatisch unkenntlich', body: 'Die App erkennt und verpixelt Gesichter automatisch. Bei verpassten Gesichtern: manuell anklicken. Keine Bilder verlassen Ihr Gerät.' },
                    { color: 'blue', title: '🏷️ Schritt 3 — Jedes Bild beschriften', body: 'Tippen Sie auf ein Vorschaubild. Fügen Sie eine <strong>Beschreibung</strong>, <strong>Gefahren</strong> (optionale Bewertung 1–5) und <strong>Kontrollen</strong> hinzu.' },
                    { color: 'indigo', title: '🤖 Schritt 4 — KI-Risikobewertung erstellen', body: 'Klicken Sie auf <strong>"KI-Risikobewertung aus Bildnotizen generieren"</strong>. Die KI verarbeitet alle Notizen und erstellt die vollständige Tabelle.' },
                    { color: 'slate', title: '✅ Schritt 5 — Prüfen & Herunterladen', body: 'Tabelle prüfen, unnötige Schritte löschen, dann das <strong>Projekt-ZIP</strong> herunterladen.' }
                ]
            }
        },

        'free-text': {
            en: {
                headline: '✍️ Describe the Task in Plain Language',
                intro: 'No images? No problem. Write it out and let AI do the heavy lifting.',
                sections: [
                    { color: 'violet', title: '✍️ Step 1 — Write Your Description', body: 'Go to the <strong>Free Text</strong> tab. Write a plain-language description of the work task or process. Be as detailed as possible — include equipment used, sequence of steps, number of workers, and any known hazards. More detail = better AI output.' },
                    { color: 'purple', title: '⚠️ Step 2 — Mention Past Incidents', body: 'If there have been any past incidents, near-misses, or known problem areas related to this task, mention them in the text. The AI uses this to amplify the risk scoring for those areas.' },
                    { color: 'blue', title: '🔀 Step 3 — Generate Task Breakdown', body: 'Click <strong>"Generate Task Breakdown"</strong>. The AI splits your description into individual task steps, identifies hazards and consequences for each step, suggests existing controls, and auto-fills the frequency, severity, and likelihood ratings.' },
                    { color: 'indigo', title: '✅ Step 4 — Review & Refine', body: 'The full risk table appears. Review each row. You can edit any cell, add images by switching to the Rich Media tab, or delete rows that don\'t apply. The risk scores are calculated automatically.' }
                ]
            },
            fr: {
                headline: '✍️ Décrivez la Tâche en Langage Simple',
                intro: 'Pas d\'images ? Pas de problème. Écrivez et laissez l\'IA faire le reste.',
                sections: [
                    { color: 'violet', title: '✍️ Étape 1 — Rédigez votre Description', body: 'Accédez à l\'onglet <strong>Texte Libre</strong>. Rédigez une description en langage simple de la tâche de travail. Plus de détails = meilleur résultat IA.' },
                    { color: 'purple', title: '⚠️ Étape 2 — Mentionnez les Incidents Passés', body: 'Si des incidents passés, quasi-accidents ou problèmes connus existent, mentionnez-les. L\'IA utilise ces informations pour amplifier le scoring de risques.' },
                    { color: 'blue', title: '🔀 Étape 3 — Générez la Décomposition', body: 'Cliquez sur <strong>"Générer la décomposition des tâches"</strong>. L\'IA divise votre description en étapes et remplit automatiquement le tableau.' },
                    { color: 'indigo', title: '✅ Étape 4 — Vérifiez et Affinez', body: 'Le tableau complet apparaît. Modifiez les cellules, ajoutez des images ou supprimez les lignes inutiles.' }
                ]
            },
            de: {
                headline: '✍️ Aufgabe in einfacher Sprache beschreiben',
                intro: 'Keine Bilder? Kein Problem. Schreiben Sie es auf und lassen Sie die KI die Arbeit machen.',
                sections: [
                    { color: 'violet', title: '✍️ Schritt 1 — Beschreibung schreiben', body: 'Öffnen Sie den <strong>Freitext</strong>-Tab. Schreiben Sie eine einfache Beschreibung der Arbeitsaufgabe. Mehr Details = bessere KI-Ergebnisse.' },
                    { color: 'purple', title: '⚠️ Schritt 2 — Frühere Vorfälle erwähnen', body: 'Erwähnen Sie vergangene Vorfälle oder bekannte Problembereiche. Die KI nutzt diese zur Verstärkung der Risikobewertung.' },
                    { color: 'blue', title: '🔀 Schritt 3 — Aufgabengliederung erstellen', body: 'Klicken Sie auf <strong>"Aufgabengliederung generieren"</strong>. Die KI zerlegt Ihre Beschreibung in Schritte und füllt die Tabelle automatisch aus.' },
                    { color: 'indigo', title: '✅ Schritt 4 — Prüfen & Verfeinern', body: 'Die vollständige Tabelle erscheint. Bearbeiten Sie Zellen, fügen Sie Bilder hinzu oder löschen Sie nicht zutreffende Zeilen.' }
                ]
            }
        },

        'excel': {
            en: {
                headline: '📊 Import Excel Files',
                intro: 'Three paths depending on what you have. Pick the one that matches your situation.',
                sections: [
                    {
                        color: 'blue',
                        title: '1️⃣ Legacy Excel → AI Processing',
                        body: '<strong>Use when:</strong> You have old, messy, or non-standard Excel sheets.<br><br>Upload the workbook, let AI normalize columns (hazards, controls, ratings), extract embedded images, and rebuild each row into the current GOEHS format. Process one-by-one or batch everything before pushing to GOEHS.'
                    },
                    {
                        color: 'orange',
                        title: '2️⃣ RA 2025 Template → GOEHS Export',
                        body: '<strong>Use when:</strong> You have a single clean file already in the official RA 2025 standard format.<br><br>Sends the file straight to the main table. Translate into any language, manually remap unfamiliar column headers, and export GOEHS-ready output with full flexibility.'
                    },
                    {
                        color: 'emerald',
                        title: '3️⃣ Batch RA 2025 → GOEHS ZIP',
                        body: '<strong>Use when:</strong> You have 1–20 finalized RA 2025 workbooks to export at once.<br><br>Auto-detects dropdown mismatches across every file. Fix issues instantly — manually or via AI. One-click ZIP contains GOEHS CSV, XLSX, and JSON per file.'
                    },
                    {
                        color: 'slate',
                        title: '🔀 Which path first?',
                        body: '<strong>Tip:</strong> Need to update photos? Start with <em>Legacy</em> to extract, replace, or add imagery. Then finish the export using the <em>RA 2025</em> or <em>Batch</em> path. If you only have clean RA 2025 files and no image changes needed, go straight to path 2 or 3.'
                    }
                ]
            },
            fr: {
                headline: '📊 Importer des Fichiers Excel',
                intro: 'Trois chemins selon votre situation. Choisissez celui qui correspond.',
                sections: [
                    { color: 'blue', title: '1️⃣ Excel Hérité → Traitement IA', body: '<strong>Utilisez quand :</strong> Vous avez d\'anciens fichiers Excel désordonnés.<br><br>Téléchargez le classeur, laissez l\'IA normaliser les colonnes, extraire les images et reconstruire chaque ligne au format GOEHS actuel.' },
                    { color: 'orange', title: '2️⃣ Modèle RA 2025 → Export GOEHS', body: '<strong>Utilisez quand :</strong> Vous avez un seul fichier propre au format officiel RA 2025.<br><br>Envoyez directement au tableau principal, traduisez et exportez avec une flexibilité totale.' },
                    { color: 'emerald', title: '3️⃣ Lot RA 2025 → ZIP GOEHS', body: '<strong>Utilisez quand :</strong> Vous avez 1–20 classeurs RA 2025 à exporter en une fois.<br><br>Détection automatique des erreurs, correction rapide, ZIP en un clic.' },
                    { color: 'slate', title: '🔀 Quel chemin choisir ?', body: '<strong>Conseil :</strong> Besoin de mettre à jour des photos ? Commencez par <em>Hérité</em>, puis finissez avec <em>RA 2025</em> ou <em>Lot</em>. Si vos fichiers sont déjà propres, utilisez directement le chemin 2 ou 3.' }
                ]
            },
            de: {
                headline: '📊 Excel-Dateien importieren',
                intro: 'Drei Wege je nach Ihrer Situation. Wählen Sie den passenden.',
                sections: [
                    { color: 'blue', title: '1️⃣ Legacy Excel → KI-Verarbeitung', body: '<strong>Verwenden wenn:</strong> Sie alte, unstrukturierte Excel-Dateien haben.<br><br>Laden Sie die Datei hoch, lassen Sie die KI Spalten normalisieren, Bilder extrahieren und jede Zeile ins aktuelle GOEHS-Format umbauen.' },
                    { color: 'orange', title: '2️⃣ RA 2025 Vorlage → GOEHS-Export', body: '<strong>Verwenden wenn:</strong> Sie eine einzelne saubere Datei im offiziellen RA 2025-Format haben.<br><br>Direkt in die Haupttabelle senden, übersetzen und mit voller Flexibilität exportieren.' },
                    { color: 'emerald', title: '3️⃣ Batch RA 2025 → GOEHS-ZIP', body: '<strong>Verwenden wenn:</strong> Sie 1–20 fertige RA 2025-Arbeitsmappen auf einmal exportieren möchten.<br><br>Automatische Fehlererkennung, schnelle Korrektur, Ein-Klick-ZIP.' },
                    { color: 'slate', title: '🔀 Welchen Weg wählen?', body: '<strong>Tipp:</strong> Fotos aktualisieren? Starten Sie mit <em>Legacy</em>, dann mit <em>RA 2025</em> oder <em>Batch</em> fertigstellen. Bei sauberen Dateien direkt Weg 2 oder 3 nutzen.' }
                ]
            }
        },

        'fire-risk': {
            en: {
                headline: '🔥 Fire Risk Assessment (FTRI Engine)',
                intro: 'Location-based fire risk evaluation using the Fire Triangle Risk Index — backed by NFPA, OSHA & FM Global standards.',
                badge: { label: '⚡ BETA', bg: '#fef08a', color: '#713f12', border: '#fde047' },
                sections: [
                    { color: 'orange', title: '🗺️ Step 1 — Create Zones', body: 'Open the <strong>Fire Risk</strong> tab. Create Zones — each zone represents a distinct physical area (e.g., solvent storage room, mixing bay, warehouse). Each zone is assessed independently.' },
                    { color: 'red', title: '📸 Step 2 — Upload Zone Photos + AI Analyze', body: 'Upload photos of each zone. Use <strong>🤖 AI Analyze</strong> to auto-populate ignition sources, fuel types, oxygen conditions, and existing controls based on the image and your zone description.' },
                    { color: 'orange', title: '🔺 Step 3 — Fire Triangle Checklist', body: 'Use the <strong>Fire Triangle Checklist</strong> to confirm heat, fuel, and oxygen hazard factors. The animated fire triangle visualizes the risk balance in real time as you make selections.' },
                    { color: 'amber', title: '🧪 Step 4 — Chemical Inventory', body: 'Record chemicals from SDS sheets. Don\'t know the name? Use <strong>🤖 AI Lookup</strong> to auto-fill NFPA 704 ratings and flash point data. The engine compares your volumes against the <strong>NFPA 30 MAQ</strong> thresholds and amplifies the fuel leg if exceeded.' },
                    { color: 'red', title: '🛡️ Step 5 — Fire Protection Controls', body: 'Select all active fire protection controls. Missing mandatory controls are automatically flagged. Tick <strong>🚿 Sprinkler system</strong> if applicable — this raises the NFPA 30 MAQ threshold 4×.' },
                    { color: 'orange', title: '🔥 Step 6 — Calculate & Export', body: 'Click <strong>"Calculate Fire Risk Index"</strong> to get the FTRI score (0–100) with a full breakdown of the fire triangle, control effectiveness, and consequence amplifier. Use the <strong>🗺️ Floor Plan</strong> view to map zones, then export as PDF or HTML.' }
                ]
            },
            fr: {
                headline: '🔥 Évaluation des Risques Incendie (Moteur FTRI)',
                intro: 'Évaluation des risques incendie basée sur les normes NFPA, OSHA et FM Global.',
                badge: { label: '⚡ BÊTA', bg: '#fef08a', color: '#713f12', border: '#fde047' },
                sections: [
                    { color: 'orange', title: '🗺️ Étape 1 — Créez des Zones', body: 'Ouvrez l\'onglet <strong>Risque Incendie</strong>. Créez des Zones — chaque zone représente un espace physique distinct.' },
                    { color: 'red', title: '📸 Étape 2 — Photos + Analyse IA', body: 'Téléchargez des photos de chaque zone. Utilisez <strong>🤖 Analyse IA</strong> pour remplir automatiquement les sources d\'ignition, combustibles et contrôles.' },
                    { color: 'orange', title: '🔺 Étape 3 — Checklist Triangle du Feu', body: 'Confirmez les facteurs de chaleur, combustible et oxygène. Le triangle du feu animé visualise l\'équilibre des risques en temps réel.' },
                    { color: 'amber', title: '🧪 Étape 4 — Inventaire Chimique', body: 'Enregistrez les produits chimiques. Utilisez <strong>🤖 Recherche IA</strong> pour les NFPA 704 et points d\'éclair. Le moteur compare vos volumes aux seuils MAQ NFPA 30.' },
                    { color: 'red', title: '🛡️ Étape 5 — Contrôles de Protection', body: 'Sélectionnez tous les contrôles actifs. Les contrôles obligatoires manquants sont automatiquement signalés.' },
                    { color: 'orange', title: '🔥 Étape 6 — Calculez et Exportez', body: 'Cliquez sur <strong>"Calculer l\'Indice de Risque Incendie"</strong> pour obtenir le score FTRI (0–100). Exportez en PDF ou HTML.' }
                ]
            },
            de: {
                headline: '🔥 Brandrisikobewertung (FTRI-Engine)',
                intro: 'Standortbasierte Brandrisikobewertung nach NFPA, OSHA und FM Global Standards.',
                badge: { label: '⚡ BETA', bg: '#fef08a', color: '#713f12', border: '#fde047' },
                sections: [
                    { color: 'orange', title: '🗺️ Schritt 1 — Zonen erstellen', body: 'Öffnen Sie den <strong>Brandrisiko</strong>-Tab. Erstellen Sie Zonen — jede Zone steht für einen bestimmten Bereich.' },
                    { color: 'red', title: '📸 Schritt 2 — Fotos + KI-Analyse', body: 'Laden Sie Fotos jeder Zone hoch. Nutzen Sie <strong>🤖 KI-Analyse</strong> um Zündquellen, Brennstoffe und Kontrollen automatisch auszufüllen.' },
                    { color: 'orange', title: '🔺 Schritt 3 — Branddreieck-Checkliste', body: 'Bestätigen Sie Hitze-, Brennstoff- und Sauerstofffaktoren. Das animierte Branddreieck visualisiert das Risikoverhältnis in Echtzeit.' },
                    { color: 'amber', title: '🧪 Schritt 4 — Chemikalieninventar', body: 'Chemikalien aus SDB erfassen. <strong>🤖 KI-Suche</strong> für NFPA 704 und Flammpunkt nutzen. Engine vergleicht Mengen mit NFPA 30 MAQ.' },
                    { color: 'red', title: '🛡️ Schritt 5 — Brandschutzkontrollen', body: 'Alle aktiven Kontrollen auswählen. Fehlende Pflichtkontrollen werden automatisch markiert.' },
                    { color: 'orange', title: '🔥 Schritt 6 — Berechnen & Exportieren', body: 'Auf <strong>"Brandrisikoindex berechnen"</strong> klicken für FTRI-Score (0–100). Als PDF oder HTML exportieren.' }
                ]
            }
        },

        'tips': {
            en: {
                headline: '💡 Key Tips & Important Notes',
                intro: 'Things every user should know before starting a risk assessment project.',
                sections: [
                    { color: 'blue', title: '🚫 No Cloud Storage — Ever', body: 'All your images, videos, and data are processed <strong>100% locally in your browser</strong>. Nothing is uploaded to any server. Only text-based risk data is sent to the AI service (OpenRouter) for AI-powered features — no images are ever transmitted.' },
                    { color: 'amber', title: '⚠️ Browser Refresh = Data Loss', body: 'If you refresh or close your browser tab, <strong>all in-memory data is lost</strong>. Use <strong>💾 Save Project</strong> frequently. You can resume any session by loading the saved JSON file back into the app.' },
                    { color: 'indigo', title: '🌐 Language Support', body: 'All dropdown options, hazard lists, and control measures can be displayed in <strong>English, French, or German</strong> using the 🌐 Language selector in the header. Switch language at any time — table data is preserved.' },
                    { color: 'green', title: '🤖 AI Is a Starting Point', body: 'AI outputs are <strong>suggestions, not final answers</strong>. Always review and validate the generated risk table with your operational team and EHS expert. The value of this tool is in <strong>accelerating the conversation</strong>, not replacing it.' },
                    { color: 'slate', title: '📂 Save & Resume Anytime', body: 'Click <strong>💾 Save Project</strong> at any point to download a JSON file containing all your image data, notes, and risk table. Load it back via <strong>📂 Load Project</strong> to pick up exactly where you left off — even on a different device.' }
                ]
            },
            fr: {
                headline: '💡 Conseils Clés et Notes Importantes',
                intro: 'Ce que chaque utilisateur doit savoir avant de commencer un projet d\'évaluation des risques.',
                sections: [
                    { color: 'blue', title: '🚫 Aucun Stockage Cloud', body: 'Toutes vos images et données sont traitées <strong>100% localement dans votre navigateur</strong>. Seules les données textuelles sont envoyées au service IA.' },
                    { color: 'amber', title: '⚠️ Actualiser = Perte de Données', body: 'Si vous actualisez le navigateur, <strong>toutes les données en mémoire sont perdues</strong>. Utilisez <strong>💾 Enregistrer le projet</strong> fréquemment.' },
                    { color: 'indigo', title: '🌐 Support Multilingue', body: 'Toutes les listes déroulantes et options sont disponibles en <strong>anglais, français ou allemand</strong> via le sélecteur 🌐 dans l\'en-tête.' },
                    { color: 'green', title: '🤖 L\'IA est un Point de Départ', body: 'Les sorties IA sont des <strong>suggestions, pas des réponses définitives</strong>. Validez toujours avec votre équipe opérationnelle et votre expert EHS.' },
                    { color: 'slate', title: '📂 Enregistrez et Reprenez', body: 'Cliquez sur <strong>💾 Enregistrer le projet</strong> pour télécharger un fichier JSON. Rechargez-le via <strong>📂 Charger le projet</strong> pour reprendre exactement où vous vous étiez arrêté.' }
                ]
            },
            de: {
                headline: '💡 Wichtige Tipps & Hinweise',
                intro: 'Was jeder Nutzer vor dem Start eines Risikobewertungsprojekts wissen sollte.',
                sections: [
                    { color: 'blue', title: '🚫 Keine Cloud-Speicherung', body: 'Alle Bilder und Daten werden <strong>100% lokal in Ihrem Browser</strong> verarbeitet. Nur textbasierte Daten werden für KI-Funktionen übermittelt — keine Bilder.' },
                    { color: 'amber', title: '⚠️ Browser-Aktualisierung = Datenverlust', body: 'Bei Aktualisierung des Browsers <strong>gehen alle Daten im Speicher verloren</strong>. Nutzen Sie <strong>💾 Projekt speichern</strong> regelmäßig.' },
                    { color: 'indigo', title: '🌐 Sprachunterstützung', body: 'Alle Dropdown-Optionen sind in <strong>Englisch, Französisch oder Deutsch</strong> verfügbar — über die 🌐 Sprachauswahl im Header.' },
                    { color: 'green', title: '🤖 KI ist ein Ausgangspunkt', body: 'KI-Ergebnisse sind <strong>Vorschläge, keine Endergebnisse</strong>. Immer mit dem Betriebsteam und EHS-Experten validieren.' },
                    { color: 'slate', title: '📂 Speichern & Fortsetzen', body: 'Klicken Sie auf <strong>💾 Projekt speichern</strong> für eine JSON-Datei. Per <strong>📂 Projekt laden</strong> genau dort weitermachen, wo Sie aufgehört haben.' }
                ]
            }
        }
    };

    /* ── Section color map ───────────────────────────────────── */
    const COLOR_MAP = {
        indigo:  { bg: '#eef2ff', border: '#818cf8', title: '#3730a3' },
        violet:  { bg: '#f5f3ff', border: '#a78bfa', title: '#5b21b6' },
        purple:  { bg: '#faf5ff', border: '#c084fc', title: '#6b21a8' },
        blue:    { bg: '#eff6ff', border: '#93c5fd', title: '#1e40af' },
        orange:  { bg: '#fff7ed', border: '#fdba74', title: '#9a3412' },
        amber:   { bg: '#fffbeb', border: '#fcd34d', title: '#92400e' },
        red:     { bg: '#fef2f2', border: '#fca5a5', title: '#991b1b' },
        emerald: { bg: '#ecfdf5', border: '#6ee7b7', title: '#065f46' },
        green:   { bg: '#f0fdf4', border: '#86efac', title: '#14532d' },
        slate:   { bg: '#f8fafc', border: '#cbd5e1', title: '#1e293b' }
    };

    /* ── CSS injection ───────────────────────────────────────── */
    function injectStyles() {
        if (document.getElementById('htg-styles')) return;
        const s = document.createElement('style');
        s.id = 'htg-styles';
        s.textContent = `
            #htgModal {
                position: fixed; inset: 0; z-index: 10000;
                display: flex; align-items: center; justify-content: center;
                background: rgba(15,23,42,0.6);
                backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
                padding: 12px;
                opacity: 0; transition: opacity .3s ease;
            }
            #htgModal.htg-open { opacity: 1; }

            .htg-card {
                background: #fff; border-radius: 20px;
                width: 96vw; max-width: 780px;
                max-height: 92vh;
                display: flex; flex-direction: column;
                box-shadow: 0 32px 80px rgba(15,23,42,0.3);
                transform: translateY(28px) scale(0.97);
                transition: transform .4s cubic-bezier(.22,1,.36,1);
                overflow: hidden;
            }
            #htgModal.htg-open .htg-card { transform: translateY(0) scale(1); }

            /* Header */
            .htg-header {
                flex-shrink: 0;
                padding: 18px 22px 0;
                background: linear-gradient(135deg, #eef2ff, #dbeafe);
                border-bottom: 1px solid #e2e8f0;
            }
            .htg-header-top {
                display: flex; align-items: center;
                justify-content: space-between; margin-bottom: 14px;
            }
            .htg-title { font-size: 1.1rem; font-weight: 700; color: #0f172a; }
            .htg-subtitle { font-size: 0.75rem; color: #6366f1; font-weight: 500; margin-top: 1px; }
            .htg-close {
                background: none; border: none; font-size: 1.6rem;
                color: #94a3b8; cursor: pointer; line-height: 1;
                width: 34px; height: 34px; display: flex; align-items: center;
                justify-content: center; border-radius: 50%;
                transition: background .15s, color .15s; flex-shrink: 0;
            }
            .htg-close:hover { background: #f1f5f9; color: #334155; }

            /* Tab row */
            .htg-tabs {
                display: flex; gap: 2px; overflow-x: auto;
                scrollbar-width: none; -ms-overflow-style: none;
                padding-bottom: 0;
            }
            .htg-tabs::-webkit-scrollbar { display: none; }
            .htg-tab {
                flex-shrink: 0;
                padding: 8px 14px 10px;
                border: none; background: none; cursor: pointer;
                font-size: 0.82rem; font-weight: 600; color: #64748b;
                border-bottom: 3px solid transparent;
                transition: color .15s, border-color .15s, background .15s;
                border-radius: 8px 8px 0 0;
                display: flex; align-items: center; gap: 5px;
                white-space: nowrap;
            }
            .htg-tab:hover { color: #334155; background: rgba(0,0,0,0.03); }
            .htg-tab.htg-tab-active {
                color: var(--htg-tab-color);
                border-bottom-color: var(--htg-tab-color);
                background: var(--htg-tab-bg);
            }

            /* Body */
            .htg-body {
                flex: 1; overflow-y: auto; padding: 22px;
                scroll-behavior: smooth;
            }

            /* Headline row */
            .htg-panel-headline {
                font-size: 1.15rem; font-weight: 700; color: #0f172a;
                margin-bottom: 4px;
            }
            .htg-panel-intro {
                font-size: 0.875rem; color: #475569; margin-bottom: 18px;
                line-height: 1.55;
            }

            /* BETA badge */
            .htg-beta-badge {
                display: inline-flex; align-items: center; gap: 5px;
                font-size: 0.72rem; font-weight: 800;
                padding: 3px 10px; border-radius: 20px;
                border-width: 1px; border-style: solid;
                margin-bottom: 14px;
            }

            /* Section cards */
            .htg-section {
                border-radius: 10px; border-width: 1px; border-style: solid;
                padding: 13px 15px; margin-bottom: 10px;
            }
            .htg-section-title {
                font-size: 0.88rem; font-weight: 700;
                margin-bottom: 5px;
            }
            .htg-section-body {
                font-size: 0.83rem; color: #374151; line-height: 1.6;
            }

            /* Panel fade in */
            @keyframes htgFade {
                from { opacity: 0; transform: translateY(8px); }
                to   { opacity: 1; transform: translateY(0); }
            }
            .htg-panel { animation: htgFade .25s ease; }
        `;
        document.head.appendChild(s);
    }

    /* ── Build modal DOM (once) ──────────────────────────────── */
    let modalEl = null;
    let currentTabId = 'rich-media';

    function buildModal() {
        if (modalEl) return;
        injectStyles();

        modalEl = document.createElement('div');
        modalEl.id = 'htgModal';
        modalEl.setAttribute('role', 'dialog');
        modalEl.setAttribute('aria-modal', 'true');

        modalEl.innerHTML = `
            <div class="htg-card">
                <div class="htg-header">
                    <div class="htg-header-top">
                        <div>
                            <div class="htg-title">🚀 How to Use This App</div>
                            <div class="htg-subtitle">Risk Assessment Buddy — Field Accelerator</div>
                        </div>
                        <button class="htg-close" id="htgClose">&times;</button>
                    </div>
                    <div class="htg-tabs" id="htgTabs"></div>
                </div>
                <div class="htg-body" id="htgBody"></div>
            </div>
        `;

        document.body.appendChild(modalEl);

        // Render tabs
        const tabsEl = modalEl.querySelector('#htgTabs');
        TABS.forEach(tab => {
            const btn = document.createElement('button');
            btn.className = 'htg-tab';
            btn.dataset.tabId = tab.id;
            btn.style.setProperty('--htg-tab-color', tab.accentColor);
            btn.style.setProperty('--htg-tab-bg', tab.activeBg);
            btn.innerHTML = `<span>${tab.icon}</span><span class="htg-tab-label">${tab.label.en}</span>`;
            btn.addEventListener('click', () => switchTab(tab.id));
            tabsEl.appendChild(btn);
        });

        // Close handlers
        modalEl.querySelector('#htgClose').addEventListener('click', closeModal);
        modalEl.addEventListener('click', (e) => { if (e.target === modalEl) closeModal(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalEl.classList.contains('htg-open')) closeModal(); });
    }

    function renderTabLabels(lang) {
        if (!modalEl) return;
        TABS.forEach(tab => {
            const btn = modalEl.querySelector(`.htg-tab[data-tab-id="${tab.id}"]`);
            if (btn) btn.querySelector('.htg-tab-label').textContent = tab.label[lang] || tab.label.en;
        });
    }

    function switchTab(tabId) {
        currentTabId = tabId;
        const lang = getLang();
        const tab = TABS.find(t => t.id === tabId);
        const data = CONTENT[tabId]?.[lang] || CONTENT[tabId]?.en;
        if (!tab || !data) return;

        // Update tab active states
        if (modalEl) {
            modalEl.querySelectorAll('.htg-tab').forEach(btn => {
                const isActive = btn.dataset.tabId === tabId;
                btn.classList.toggle('htg-tab-active', isActive);
            });
        }

        // Render panel
        const body = document.getElementById('htgBody');
        if (!body) return;

        const betaBadge = data.badge
            ? `<div class="htg-beta-badge" style="background:${data.badge.bg};color:${data.badge.color};border-color:${data.badge.border};">${data.badge.label} — Not for production use</div>`
            : '';

        const sectionsHTML = data.sections.map(sec => {
            const c = COLOR_MAP[sec.color] || COLOR_MAP.slate;
            return `
                <div class="htg-section" style="background:${c.bg};border-color:${c.border};">
                    <div class="htg-section-title" style="color:${c.title};">${sec.title}</div>
                    <div class="htg-section-body">${sec.body}</div>
                </div>`;
        }).join('');

        body.innerHTML = `
            <div class="htg-panel">
                <div class="htg-panel-headline">${data.headline}</div>
                <div class="htg-panel-intro">${data.intro}</div>
                ${betaBadge}
                ${sectionsHTML}
            </div>
        `;
        body.scrollTop = 0;
    }

    function openModal(tabId) {
        if (!modalEl) buildModal();

        const lang = getLang();
        renderTabLabels(lang);
        switchTab(tabId || currentTabId || 'rich-media');

        modalEl.style.display = 'flex';
        requestAnimationFrame(() => requestAnimationFrame(() => modalEl.classList.add('htg-open')));
    }

    function closeModal() {
        if (!modalEl) return;
        modalEl.classList.remove('htg-open');
        setTimeout(() => { if (modalEl) modalEl.style.display = 'none'; }, 320);
    }

    /* ── Wire footer button ──────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', () => {
        const howToUseBtn = document.getElementById('howToUseBtn');
        if (howToUseBtn) howToUseBtn.addEventListener('click', () => openModal('rich-media'));
    });

    /* ── Public API ──────────────────────────────────────────── */
    // showHowToUseModal(optionalTabId) — callable from workflow-guides.js "Learn more" links
    window.showHowToUseModal = openModal;

})();
