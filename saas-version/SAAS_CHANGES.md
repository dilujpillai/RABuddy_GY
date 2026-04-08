# EHS Smart SaaS - Workflow Changes Documentation

## Version 1.1.0 - Full Workflow Implementation
**Date:** June 2025  
**Summary:** Replicated Goodyear Index.HTML workflow with generic risk scales

---

## 1. Overview

This document tracks all changes made to implement the complete Goodyear-style risk assessment workflow in the SaaS version, with the following key modifications:
- **Rich Media Tab**: Combined Image and Video tabs into a single unified tab
- **Generic Risk Scales**: Replaced Goodyear EHS-specific definitions with industry-standard generic scales
- **All Core Features**: Lightbox modal, video capture, gallery, Hierarchy of Controls, Risk Reduction Strategy

---

## 2. Tab Structure Changes

### Before (SaaS v1.0)
```
📸 Images | 🎥 Video | ✍️ Free Text | 📊 Excel Import
```

### After (SaaS v1.1)
```
📸 Rich Media | ✍️ Free Text | 📊 Excel Import
```

**Rationale:** Users upload both images and videos in the same workflow. The Rich Media tab:
- Accepts images (PNG, JPEG, GIF)
- Accepts videos (MP4, MOV, AVI, MKV, WebM)
- Auto-detects file type and routes to appropriate handler
- Shows video gallery for frame extraction
- Shows image gallery for all processed images/frames

---

## 3. Risk Rating Scales (Generic vs Goodyear EHS)

### Frequency Scale (UNCHANGED)
| Value | Generic Label | Goodyear EHS Label |
|-------|---------------|-------------------|
| 1     | Rare (Yearly) | RARELY |
| 1.25  | Occasional (Quarterly) | OCCASIONAL |
| 1.5   | Monthly | INTERMEDIATE |
| 1.75  | Weekly | FREQUENTLY |
| 2     | Daily (Routine) | PERMANENT |

### Severity Scale (CHANGED - Generic)
| Value | Generic Label | ~~Goodyear EHS Label~~ |
|-------|---------------|------------------------|
| 1     | Negligible - No injury | ~~No potential of injury~~ |
| 2     | Minor - First Aid | ~~Potential of FIRST AID~~ |
| 4     | Moderate - Medical Treatment | ~~Potential of MEDICAL TREATMENT~~ |
| 6     | Major - Lost Work Days | ~~Potential of DART~~ |
| 8     | Severe - Permanent Disability | ~~Potential of SIA~~ |
| 10    | Catastrophic - Fatality | ~~Potential of Fatality~~ |

### Likelihood Scale (CHANGED - Generic)
| Value | Generic Label | ~~Goodyear EHS Label~~ |
|-------|---------------|------------------------|
| 1     | Rare - Almost impossible | ~~Almost impossible~~ |
| 2     | Unlikely - Could happen | ~~Very unlikely~~ |
| 4     | Possible - May happen | ~~Possible to happen~~ |
| 6     | Likely - Expected | ~~Likely to happen~~ |
| 8     | Almost Certain - Will happen | - |
| 10    | Certain - Inevitable | ~~Very likely to happen~~ |

---

## 4. New UI Components

### 4.1 Lightbox Modal
**Purpose:** Preview images, add field notes, manual blur faces

**Fields:**
- `stepDescription` - Description of the step/activity
- `spotHazards` - What can go wrong / hazards identified
- `existingControls` - Any existing control measures observed
- Optional Risk Ratings (Frequency, Severity, Likelihood)

**Features:**
- Large image preview with click-to-blur
- Navigation arrows (Previous/Next)
- Speech-to-text buttons for each field
- Gallery strip at bottom
- Undo blur, Replace Image, Delete Image buttons

### 4.2 Fullscreen Video Capture Modal
**Purpose:** Full-screen video scrubbing and frame capture

**Features:**
- Press SPACE to capture frame
- Press ESC to exit
- Thumbnail panel showing captured frames
- Auto face blur option
- Clear All / Download Frames / Exit & Load buttons

### 4.3 Hierarchy of Controls Triangle
**Purpose:** Visual selector for control measure hierarchy (NIOSH/OSHA standard)

**Levels (Most to Least Effective):**
| Hex | Level | Color | Description |
|-----|-------|-------|-------------|
| 6 | Eliminate | Green | Remove the hazard entirely |
| 5 | Substitute | Light Green | Replace with less hazardous alternative |
| 4 | Engineer | Yellow | Design out the hazard |
| 3 | Visual | Orange | Warning signs, signals |
| 2 | Admin | Red | Training, procedures, policies |
| 1 | Individual | Dark Red | PPE, personal protection |

**Interaction:**
- Click on triangle level to select control type
- Visual highlighting of selected level
- Grey-out of non-selected levels

### 4.4 Risk Reduction Strategy Panel
**Purpose:** Add and track control measures per hazard row

**Components:**
- Hierarchy of Controls triangle selector
- Control measure description field
- Add button to append controls
- List of selected controls with remove option
- Real-time risk evolution visualization

### 4.5 Table Image Modal
**Purpose:** Review and edit individual risk assessment entries

**Features:**
- Large image display (if tagged)
- Editable fields for all row data
- Risk rating dropdowns
- Risk score calculation display
- Risk category color coding
- Risk Evolution visualization (Before → Current → Projected)
- Control measures section with add/remove
- Navigation between rows
- Delete/Restore row functionality

---

## 5. Image Gallery Features

### Draggable Reorder
- Drag and drop images to reorder
- Uses SortableJS library
- Updates internal array order

### Auto Face Blur
- Automatic face detection on upload
- Uses face-api.js with SSD MobileNet model
- Expanded blur area (1.8x face size)
- Gaussian blur with iterations

### Manual Blur
- Click anywhere on image in lightbox
- Applies localized blur at click point
- Undo last blur action available

### Image-to-Row Tagging
- Click images in gallery to tag to table rows
- Multiple images can be tagged to one row
- Visual indicator shows tagged state

---

## 6. Video Workflow

### Upload
1. User uploads video file (MP4, MOV, AVI, MKV, WebM)
2. Video appears in video gallery section
3. Click thumbnail to open fullscreen capture modal

### Frame Capture
1. Scrub video to desired position
2. Press SPACE or click Capture button
3. Frame is auto-blurred (if enabled) and added to thumbnail panel
4. Repeat for all needed frames

### Field Notes
1. Click captured frame thumbnail
2. Opens Frame Edit Modal
3. Add description, hazards, controls
4. Optional: Generate AI description
5. Save notes

### Generate Assessment
1. Click "Generate AI Risk Assessment from Image Notes"
2. System compiles all field notes
3. Sends to AI for hazard identification
4. Results populate risk assessment table

---

## 7. Risk Calculation Formula

```
Risk Score = Frequency × Severity × Likelihood
```

### Risk Categories
| Score Range | Category | Color |
|-------------|----------|-------|
| ≥ 100 | Critical | Red (#dc2626) |
| 50-99 | High | Orange (#ea580c) |
| 20-49 | Medium | Yellow (#ca8a04) |
| < 20 | Low | Green (#16a34a) |

### Projected Risk with Controls
Each control type reduces risk by a factor:
- Eliminate (6): 0.1 (90% reduction)
- Substitute (5): 0.2 (80% reduction)
- Engineer (4): 0.3 (70% reduction)
- Visual (3): 0.5 (50% reduction)
- Admin (2): 0.7 (30% reduction)
- Individual (1): 0.85 (15% reduction)

---

## 8. Table Structure

### Columns
| # | Column | Type | Description |
|---|--------|------|-------------|
| 1 | Picture | Image | Thumbnail linked from gallery |
| 2 | AI | Badge | Shows 🤖 if AI-generated row |
| 3 | Steps | Text | Activity description |
| 4 | Hazard Group | Dropdown | HSE UK hazard categories |
| 5 | Hazard List | Dropdown | Specific hazard selection |
| 6 | Risk/Consequences | Dropdown | Potential outcomes |
| 7 | Frequency | Dropdown | Exposure frequency |
| 8 | Severity | Dropdown | Injury severity |
| 9 | Likelihood | Dropdown | Probability |
| 10 | Risk Score | Calculated | F × S × L |
| 11 | Risk Category | Derived | Critical/High/Medium/Low |
| 12 | Hazard Source | Text Input | Source of hazard |
| 13 | Current Control | Text Input | Existing controls |
| 14 | Activity Type | Text Input | Routine/Non-Routine/Emergency |
| 15 | Actions | Badge | 🛡️ control count or "Nil" |
| 16 | Delete | Button | Delete/Restore row |

---

## 9. Files Modified

### index.html
- Merged Image and Video tabs into Rich Media
- Added Lightbox Modal
- Added Fullscreen Video Capture Modal
- Added Table Image Modal with Hierarchy of Controls
- Updated risk rating dropdowns with generic labels
- Added Risk Evolution visualization
- Added Actions column to table

### core-engine.js
- Updated SEVERITY_SCALE with generic labels
- Updated LIKELIHOOD_SCALE with generic labels
- Added `calculateProjectedRiskScore()` function
- Added `generateRiskEvolutionVisualization()` function
- Added `generateRiskReductionVisualization()` function
- Added `renderControlTriangle()` function
- Added `openTableImageModal()` function
- Added `loadModalTaskDetails()` function

### video-processor.js
- No changes (already complete)

### hazard-registry.js
- No changes (already complete with 370+ hazards)

---

## 10. Removed/Not Included

### Goodyear-Specific Features NOT in SaaS
- ❌ GOEHS Integration button
- ❌ EHS-specific severity labels (DART, SIA)
- ❌ Direct GOEHS Excel template upload
- ❌ Goodyear branding/logos
- ❌ Plant/Department/Area dropdowns

### Reason
The SaaS version is designed to be industry-agnostic and comply with generic HSE UK standards rather than Goodyear's internal GOEHS system.

---

## 11. Future Enhancements (Planned)

- [ ] Cloud storage integration (SharePoint, OneDrive, Google Drive)
- [ ] Team collaboration features
- [ ] Assessment versioning
- [ ] PDF report generation
- [ ] Mobile responsive optimizations
- [ ] Voice-to-text for all fields
- [ ] AR/VR hazard visualization

---

## 12. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | May 2025 | Initial SaaS version with basic workflow |
| 1.1.0 | June 2025 | Full Goodyear workflow replication |
| 1.1.1 | June 2025 | Rich Media tab, Lightbox, Video Modal, Table Image Modal with HoC implemented |

---

## 13. Implementation Status

### ✅ Completed Features
- [x] Rich Media Tab (merged Images + Video)
- [x] Lightbox Modal with field notes form
- [x] Fullscreen Video Capture Modal
- [x] Frame capture with auto face blur
- [x] Gallery image management
- [x] AI Risk Assessment generation
- [x] Table with linked images
- [x] Table Image Modal with Hierarchy of Controls
- [x] Risk reduction visualization
- [x] Control measure add/remove
- [x] Row-level risk recalculation
- [x] Generic risk scales (not Goodyear EHS)

### ⏳ Pending Features
- [ ] Drag-and-drop image reorder
- [ ] Image-to-row tagging workflow
- [ ] Risk Evolution Before/After visualization
- [ ] PDF export with images
- [ ] Speech-to-text for fields

---

## 14. Key Functions Reference

### Lightbox Functions
```javascript
openLightbox(imgId)        // Open lightbox with specific image
closeLightbox()            // Close and save data
navigateLightbox(index)    // Navigate to image by index
saveLightboxData()         // Persist field notes to data store
```

### Video Capture Functions
```javascript
openFullscreenVideoModal(videoUrl, fileName)  // Open video modal
captureFullscreenFrame()                       // Capture current frame
closeFullscreenVideoModal()                    // Close and transfer frames
transferCapturedFramesToGallery()              // Move frames to main gallery
```

### Table Image Modal Functions
```javascript
openTableImageModal(imageUrl, rowIndex)  // Open modal for table row
closeTableImageModal()                   // Close modal
loadModalTaskDetails(rowIndex)           // Load row data into form
saveModalChanges()                       // Save form back to table
navigateModalTask(direction)             // Navigate between rows
```

### Hierarchy of Controls Functions
```javascript
renderControlTriangle()            // Draw SVG triangle
selectControlType(controlType)     // Handle level selection
loadCounterMeasuresForRow(rowIndex) // Load saved controls
updateControlIndicator(rowIndex)   // Update 🛡️ badge in Actions column
```

### Risk Calculation Functions
```javascript
recalculateRow(rowIndex)           // Recalculate F×S×L for row
recalculateModalRisk()             // Recalculate in modal view
getRiskCategory(score)             // Get Critical/High/Medium/Low
getRiskColor(score)                // Get color scheme for score
```

---

## 15. Reference

For detailed implementation, refer to:
- Original Goodyear: `Index.HTML` (15,877 lines)
- SaaS Version: `saas-version/index.html`
- Core Engine: `saas-version/core-engine.js`
- Video Processor: `saas-version/video-processor.js`
- Hazard Registry: `saas-version/hazard-registry.js`

---

*Document maintained by EHS Smart Development Team*
