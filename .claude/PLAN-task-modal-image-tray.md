# Plan: Task modal image tray + drag-to-step

Working doc for the two-container redesign of the task-details modal (`#tableImageModal`).
Baseline: commit `971e7f6` on `feature/use-of-gif`. Untracked on purpose — agent working notes.

## Goal (from the user)

Restructure the task modal into:
1. **Vertical image tray on the left** — a mirror of the top Rich Media gallery, available
   right there in the modal. Supports **bulk upload** so the user isn't re-picking files
   from the PC one at a time.
2. **Horizontal card strip** — the task cards, navigable left/right (existing prev/next).
3. **Drag an image from the tray onto a step** to attach it.
4. **Edit opens the existing lightbox editor.**
5. Plumbing to the table/exporters must stay intact.

Model to mirror: the legacy Excel→AI flow, where `xl/media/` images are extracted into
`gyImagesByRow` (index.html ~19110) and reconciled onto `.gy-card`s in `renderUI()` (~18894).

## Architecture facts (hard-won — do not re-derive)

**The one link that matters:** `tr[data-image-id]` → an `img` inside `.gallery-item`
(id = the image id) → `window.originalFileNames.get(id)`.

Both exporters resolve pictures through exactly that chain:
- CSV Picture column: filename via `imageNameMap` / `window.originalFileNames` (~7313)
- ZIP: `addImagesToZip` (~8095) walks `.gallery-item img`, filtered to `usedImageIds`
  collected from each row's `data-image-id`, names files with `originalFileNames`.

**Consequence:** an image that becomes a real gallery member and is pointed at by a row
exports identically to an uploaded one. **No export code changes are ever needed.**
An image parked in the tray but not yet dropped is simply unreferenced → skipped by the
ZIP until it's attached. That is correct behaviour, not a bug.

**Primitives already built (971e7f6), all near `ensureAddStepButton`:**
- `createGalleryImageFromFile(file)` → runs `processImage()` (the SAME local face-blur
  pass the bulk uploader uses), registers `originalFileNames`, stores the pre-blur
  original in `autoBlurOriginalByImageId` for the eraser, appends a `.gallery-item`,
  returns the new image id. **Reuse this for bulk upload — do not write a second path.**
- `attachImageToRow(imageId, rowIndex)` → the ONLY writer of the row→image link. Links,
  does not copy: one photo can serve several steps and still exports as one file.
- `detachImageFromRow(rowIndex)` → unlinks only; image stays in the gallery.
- `backfillGalleryDataFromRow(imageId, rowIndex)` → copies the row's
  Steps/Hazards/Controls/F-S-L into `window.riskAssessmentData` so the editor's notes
  panel isn't empty. Called from `attachImageToRow`.

**Table column order** (fixed by `buildTableFromData`):
`0 Picture, 1 AI, 2 Steps, 3 Hazard Group, 4 Hazard List, 5 Risk/Consequences,
6 Frequency, 7 Severity, 8 Likelihood, 9 Score, 10 Category, 11 Hazard Source,
12 Current Control, 13 Routine, 14 Actions, 15 Delete`

## Gotchas that have already bitten (all real, all cost time)

1. **Cross-`<script>`-block scope.** The task modal and the lightbox are in DIFFERENT
   script blocks. Bare calls to `showLightboxImage` / `loadModalTaskDetails` from the
   modal throw `ReferenceError`. Both are now exported — **always call them as
   `window.showLightboxImage(...)` / `window.loadModalTaskDetails(...)`.** This one
   presented as a "blank lightbox" and cost four wrong fixes, because the modal is set
   to `display:flex` on the line *before* the throw, so it opens and then dies silently.
2. **`.rab-btn` forces `display:inline-flex !important`** — inline `style.display`
   toggles silently do nothing. Use `classList.toggle('rab-hidden', ...)`.
3. **Tailwind `hidden` + `flex`**: toggling only `hidden` on an element whose layout
   class is `flex` leaves it laid out. Toggle both.
4. **`populatePictureColumn()` early-returns on rows with no `imageId` WITHOUT clearing
   the cell** — a detach must clear the cell itself.
5. **Project save**: the save loop (search `tableState.deletedRows = deleted`) now reads
   `tr.dataset.imageId` back into `tableState.rows[i].imageId`. Anything that writes a
   picture link must go through `attachImageToRow` so this keeps working.
6. **Blob URL hygiene**: `image-editor.js` revokes editor-created URLs, guarded against
   the pre-blur original and the live undo target. Don't revoke a gallery image's src.

## Implementation steps

### Step 1 — Layout restructure (markup only, no logic)
`#tableImageModal` inner grid becomes: `[tray 140px] [card body 1fr] [risk panel 24rem]`.
- New `<aside id="taskImageTray">` with a header, a scrollable
  `<div id="taskImageTrayList">`, and a footer holding the bulk-upload control.
- Keep the existing three panes inside the card body so nothing existing moves.
- Verify: modal still opens, prev/next still work, nothing overlaps at 1280px and 1920px.

### Step 2 — Tray renderer
`renderTaskImageTray()`:
- Source of truth is the SAME gallery: `galleryDiv.querySelectorAll('.gallery-item img')`.
  Do **not** keep a second list — the tray is a view, not a store.
- Each tile: thumbnail, filename (from `originalFileNames`), `draggable="true"`,
  `dataset.imageId`.
- Mark tiles already used by some row (dim + a "used" badge) so the user can see what's
  been placed. Do not hide them — one photo may legitimately serve several steps.
- Call it from `loadModalTaskDetails()` and after any attach/detach.

### Step 3 — Bulk upload into the tray
- `<input type="file" multiple accept="image/*">` in the tray footer + a drop zone on the
  tray itself (reuse `wireDropZoneToInput()` from goehs-integration.js if convenient).
- Loop `createGalleryImageFromFile(file)` per file, sequentially (the face pass is
  main-thread heavy — a parallel `Promise.all` over 20 photos will lock the UI).
- Show per-file progress in the tray footer; the existing upload path's progress card
  (`proc-bar-fill` / `proc-done-count`) is a reference for wording.
- These land in the gallery unattached. That is the intended resting state.

### Step 4 — Drag from tray → drop on the step
- `dragstart` on a tray tile: `dataTransfer.setData('text/rab-image-id', id)`.
- Drop targets: the modal's image stage (`#modalImageStage`) for the *current* card.
- On drop: `attachImageToRow(id, currentRowIndex)` then `window.loadModalTaskDetails(row)`.
- If the row already has a picture, **replace** (matches the non-destructive Remove
  button — the old image stays in the gallery for reuse). Do not stack.
- Guard against dropping a non-image / foreign drag: check the custom MIME type.

### Step 5 — Edit hop
Already works via the Edit/Blur button (`window.showLightboxImage`). Once the tray exists,
consider double-click on a tray tile → same hop. Reuse, don't duplicate.

### Step 6 — Verify (do not skip)
- Free Text RA → bulk upload 3 photos → drag each to a different step.
- Download ZIP: exactly the attached photos appear in `edited_images_optimized/`, and the
  CSV Picture column names them. An un-dropped tray photo must NOT appear.
- Save project → reload → links survive.
- Attach the same photo to two steps → ONE file in the ZIP, named by both rows.
- `node --check` every inline `<script>` block + CSS brace balance (see prior sessions'
  one-liner in git history).

## Explicitly out of scope for this pass
- Reordering the card strip.
- Deleting an image from the tray (the top gallery already owns deletion).
- The `switchTab('rich-media')` hop in the Edit button: it was added to fix a problem
  that turned out to be imaginary (the ReferenceError above). It survives only because
  the user independently suggested it. Revisit if it feels like unwanted navigation.
