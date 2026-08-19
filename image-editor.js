/**
 * Image Editor Module for Risk Assessment Buddy
 * Provides Photoshop-like annotation tools: blur brush, circles, arrows
 * All annotations are resizable and deletable.
 */
(function () {
    'use strict';

    // ─── STATE ──────────────────────────────────────────────────────────
    const state = {
        tool: 'blur',           // 'blur' | 'eraser' | 'circle' | 'arrow' | 'line' | 'stickman' | 'select'
        brushSize: 30,
        brushColor: '#ef4444',  // Red default for annotations
        strokeWidth: 3,
        annotations: new Map(), // imageId → [{type, ...props}]
        originalImages: new Map(), // imageId → original src (before any blur)
        baseImages: new Map(),  // imageId → clean src (with blur/erase but NO circles/arrows)
        selectedIdx: -1,
        isDrawing: false,
        isDragging: false,
        isResizing: false,
        dragStart: null,
        drawStart: null,
        resizeHandle: null,
        scale: 1,
        offset: { x: 0, y: 0 },
        rendered: { w: 0, h: 0 },
        natural: { w: 0, h: 0 },
    };

    // ─── DOM REFERENCES (set during init) ───────────────────────────────
    let canvas, ctx;
    // NOTE: this module used to borrow #manualBlurCanvas as scratch space, which the
    // automatic face-blur pipeline in index.html also owns and resizes. Stroke sessions
    // allocate their own canvas per drag, so that shared surface is no longer touched.
    let imageWrapper, lightboxImage;
    let toolbar;

    // ─── COORDINATE HELPERS ─────────────────────────────────────────────

    /** Recompute how the image fits inside its container (object-contain math) */
    function recalcLayout() {
        if (!lightboxImage || !lightboxImage.naturalWidth) return;
        const { naturalWidth: nw, naturalHeight: nh, clientWidth: cw, clientHeight: ch } = lightboxImage;
        const imgAR = nw / nh;
        const boxAR = cw / ch;
        let rw, rh, ox, oy;
        if (imgAR > boxAR) {
            rw = cw; rh = cw / imgAR; ox = 0; oy = (ch - rh) / 2;
        } else {
            rh = ch; rw = ch * imgAR; ox = (cw - rw) / 2; oy = 0;
        }
        // Account for the <img> element's position within the flex wrapper
        const imgRect = lightboxImage.getBoundingClientRect();
        const wrapperRect = imageWrapper.getBoundingClientRect();
        const imgOffsetX = imgRect.left - wrapperRect.left;
        const imgOffsetY = imgRect.top - wrapperRect.top;

        state.scale = nw / rw;
        state.offset = { x: ox, y: oy };
        state.rendered = { w: rw, h: rh };
        state.natural = { w: nw, h: nh };
        // Sync canvas size to the rendered image area
        canvas.width = rw;
        canvas.height = rh;
        canvas.style.left = (imgOffsetX + ox) + 'px';
        canvas.style.top = (imgOffsetY + oy) + 'px';
    }

    /** Convert page event coords → image-local rendered coords */
    function eventToLocal(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    }

    /** Convert rendered coords → natural (full-res) coords */
    function toNatural(pt) {
        return { x: pt.x * state.scale, y: pt.y * state.scale };
    }

    /** Convert natural coords → rendered coords */
    function toRendered(pt) {
        return { x: pt.x / state.scale, y: pt.y / state.scale };
    }

    // ─── ANNOTATION DATA HELPERS ────────────────────────────────────────

    function getAnnotations() {
        const id = window.currentLightboxImageId;
        if (!id) return [];
        if (!state.annotations.has(id)) state.annotations.set(id, []);
        return state.annotations.get(id);
    }

    function setAnnotations(arr) {
        const id = window.currentLightboxImageId;
        if (id) state.annotations.set(id, arr);
    }

    // ─── RENDER ALL ANNOTATIONS ─────────────────────────────────────────

    function render() {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Live brush preview. During a drag the <img> underneath still shows the
        // pre-drag pixels (it is only re-encoded once, on pointerup), so the
        // in-progress work canvas is blitted over it here. The overlay canvas is
        // sized to exactly the rendered image area, so this lines up 1:1.
        if (strokeSession && strokeSession.dirty) {
            ctx.drawImage(strokeSession.work, 0, 0, canvas.width, canvas.height);
        }

        const annots = getAnnotations();

        annots.forEach((a, i) => {
            const selected = i === state.selectedIdx;
            if (a.type === 'circle') drawCircle(a, selected);
            else if (a.type === 'arrow') drawArrow(a, selected);
            else if (a.type === 'line') drawLine(a, selected);
            else if (a.type === 'stickman') drawStickman(a, selected);
        });

        // Draw brush cursor when blur or eraser tool active
        if ((state.tool === 'blur' || state.tool === 'eraser') && state._cursorPos) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(state._cursorPos.x, state._cursorPos.y, state.brushSize / state.scale / 2, 0, Math.PI * 2);
            ctx.strokeStyle = state.tool === 'eraser' ? 'rgba(255,180,0,0.8)' : 'rgba(255,255,255,0.6)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }
    }

    function drawCircle(a, selected) {
        const c = toRendered({ x: a.cx, y: a.cy });
        const rx = a.rx / state.scale;
        const ry = a.ry / state.scale;
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = a.color || state.brushColor;
        ctx.lineWidth = (a.strokeWidth || state.strokeWidth);
        ctx.stroke();
        ctx.restore();

        if (selected) drawSelectionHandles(a);
    }

    function drawArrow(a, selected) {
        const from = toRendered({ x: a.x1, y: a.y1 });
        const to = toRendered({ x: a.x2, y: a.y2 });
        const lw = a.strokeWidth || state.strokeWidth;
        const color = a.color || state.brushColor;

        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = lw;
        ctx.lineCap = 'round';

        // Shaft
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();

        // Arrowhead
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const headLen = Math.max(14, lw * 4);
        ctx.beginPath();
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(to.x - headLen * Math.cos(angle - Math.PI / 6), to.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(to.x - headLen * Math.cos(angle + Math.PI / 6), to.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        if (selected) {
            drawHandle(from.x, from.y);
            drawHandle(to.x, to.y);
        }
    }

    function drawLine(a, selected) {
        const from = toRendered({ x: a.x1, y: a.y1 });
        const to = toRendered({ x: a.x2, y: a.y2 });
        const lw = a.strokeWidth || state.strokeWidth;
        const color = a.color || state.brushColor;

        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        ctx.restore();

        if (selected) {
            drawHandle(from.x, from.y);
            drawHandle(to.x, to.y);
        }
    }

    function drawStickman(a, selected) {
        const c = toRendered({ x: a.x, y: a.y });
        const s = a.size / state.scale;
        const lw = a.strokeWidth || state.strokeWidth;
        const color = a.color || state.brushColor;

        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Head
        ctx.beginPath();
        ctx.arc(c.x, c.y - s * 0.65, s * 0.2, 0, Math.PI * 2);
        ctx.stroke();
        // Body
        ctx.beginPath();
        ctx.moveTo(c.x, c.y - s * 0.45);
        ctx.lineTo(c.x, c.y + s * 0.05);
        ctx.stroke();
        // Left arm
        ctx.beginPath();
        ctx.moveTo(c.x, c.y - s * 0.35);
        ctx.lineTo(c.x - s * 0.4, c.y - s * 0.1);
        ctx.stroke();
        // Right arm
        ctx.beginPath();
        ctx.moveTo(c.x, c.y - s * 0.35);
        ctx.lineTo(c.x + s * 0.4, c.y - s * 0.1);
        ctx.stroke();
        // Left leg
        ctx.beginPath();
        ctx.moveTo(c.x, c.y + s * 0.05);
        ctx.lineTo(c.x - s * 0.3, c.y + s * 0.65);
        ctx.stroke();
        // Right leg
        ctx.beginPath();
        ctx.moveTo(c.x, c.y + s * 0.05);
        ctx.lineTo(c.x + s * 0.3, c.y + s * 0.65);
        ctx.stroke();
        ctx.restore();

        if (selected) {
            // Resize handle at the bottom
            drawHandle(c.x, c.y + s * 0.65);
            // Dashed bounding box
            ctx.save();
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 3]);
            ctx.strokeRect(c.x - s * 0.45, c.y - s * 0.85, s * 0.9, s * 1.5);
            ctx.setLineDash([]);
            ctx.restore();
        }
    }

    function drawHandle(x, y) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    function drawSelectionHandles(a) {
        // For ellipse: draw 4 cardinal handles
        const c = toRendered({ x: a.cx, y: a.cy });
        const rx = a.rx / state.scale;
        const ry = a.ry / state.scale;
        const handles = [
            { x: c.x - rx, y: c.y },     // left
            { x: c.x + rx, y: c.y },     // right
            { x: c.x, y: c.y - ry },     // top
            { x: c.x, y: c.y + ry },     // bottom
        ];
        handles.forEach(h => drawHandle(h.x, h.y));
    }

    // ─── HIT TESTING ────────────────────────────────────────────────────

    const HANDLE_RADIUS = 10;

    /** Returns { idx, handle } or null */
    function hitTest(pt) {
        const annots = getAnnotations();
        // Check in reverse order (topmost first)
        for (let i = annots.length - 1; i >= 0; i--) {
            const a = annots[i];
            const handle = hitTestHandles(a, pt);
            if (handle) return { idx: i, handle };
            if (hitTestBody(a, pt)) return { idx: i, handle: null };
        }
        return null;
    }

    function hitTestHandles(a, pt) {
        if (a.type === 'circle') {
            const c = toRendered({ x: a.cx, y: a.cy });
            const rx = a.rx / state.scale;
            const ry = a.ry / state.scale;
            const handles = [
                { name: 'left', x: c.x - rx, y: c.y },
                { name: 'right', x: c.x + rx, y: c.y },
                { name: 'top', x: c.x, y: c.y - ry },
                { name: 'bottom', x: c.x, y: c.y + ry },
            ];
            for (const h of handles) {
                if (dist(pt, h) < HANDLE_RADIUS) return h.name;
            }
        } else if (a.type === 'arrow') {
            const from = toRendered({ x: a.x1, y: a.y1 });
            const to = toRendered({ x: a.x2, y: a.y2 });
            if (dist(pt, from) < HANDLE_RADIUS) return 'start';
            if (dist(pt, to) < HANDLE_RADIUS) return 'end';
        } else if (a.type === 'line') {
            const from = toRendered({ x: a.x1, y: a.y1 });
            const to = toRendered({ x: a.x2, y: a.y2 });
            if (dist(pt, from) < HANDLE_RADIUS) return 'start';
            if (dist(pt, to) < HANDLE_RADIUS) return 'end';
        } else if (a.type === 'stickman') {
            const c = toRendered({ x: a.x, y: a.y });
            const s = a.size / state.scale;
            if (dist(pt, { x: c.x, y: c.y + s * 0.65 }) < HANDLE_RADIUS) return 'resize';
        }
        return null;
    }

    function hitTestBody(a, pt) {
        if (a.type === 'circle') {
            const c = toRendered({ x: a.cx, y: a.cy });
            const rx = a.rx / state.scale;
            const ry = a.ry / state.scale;
            // Point-in-ellipse + tolerance
            const tol = 8;
            const val = ((pt.x - c.x) ** 2) / ((rx + tol) ** 2) + ((pt.y - c.y) ** 2) / ((ry + tol) ** 2);
            const valInner = rx > tol && ry > tol ? ((pt.x - c.x) ** 2) / ((rx - tol) ** 2) + ((pt.y - c.y) ** 2) / ((ry - tol) ** 2) : 0;
            return val <= 1 || (valInner > 1 && val <= 1.5); // on or near stroke
        } else if (a.type === 'arrow') {
            const from = toRendered({ x: a.x1, y: a.y1 });
            const to = toRendered({ x: a.x2, y: a.y2 });
            return distToSegment(pt, from, to) < 10;
        } else if (a.type === 'line') {
            const from = toRendered({ x: a.x1, y: a.y1 });
            const to = toRendered({ x: a.x2, y: a.y2 });
            return distToSegment(pt, from, to) < 10;
        } else if (a.type === 'stickman') {
            const c = toRendered({ x: a.x, y: a.y });
            const s = a.size / state.scale;
            return pt.x >= c.x - s * 0.45 && pt.x <= c.x + s * 0.45 &&
                   pt.y >= c.y - s * 0.85 && pt.y <= c.y + s * 0.65;
        }
        return false;
    }

    function dist(a, b) {
        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    }

    function distToSegment(p, v, w) {
        const l2 = dist(v, w) ** 2;
        if (l2 === 0) return dist(p, v);
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        return dist(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
    }

    // ─── BLUR BRUSH ENGINE ──────────────────────────────────────────────

    /** Save the original (pre-blur) image if not already saved */
    function saveOriginalImage() {
        const id = window.currentLightboxImageId;
        if (!id || state.originalImages.has(id)) return;
        const thumb = document.getElementById(id);
        if (thumb) state.originalImages.set(id, thumb.src);
    }

    // ─── STROKE SESSIONS (shared by the blur and eraser brushes) ────────
    //
    // Both brushes used to do a full round-trip on EVERY pointermove: decode the
    // current image off its blob URL (and, for the eraser, the pre-blur original
    // too), repaint a full-resolution canvas, re-encode it to JPEG, mint a new
    // object URL, then assign that to the lightbox <img> AND the gallery thumbnail
    // AND rebuild the entire lightbox gallery strip from scratch. A one-second drag
    // fires dozens of pointermoves, so that meant dozens of full-res decodes and
    // encodes, dozens of complete gallery teardowns, and one leaked object URL per
    // move - which is why the thumbnail strip visibly thrashed and the brush lagged
    // behind the cursor.
    //
    // A drag now opens a stroke session instead: pixels are decoded once up front,
    // each move paints synchronously into an in-memory canvas that is previewed live
    // on the annotation overlay, and the expensive commit (encode -> object URL ->
    // <img> + thumbnail + gallery) happens exactly once, on pointerup.

    let strokeSession = null;               // the in-progress drag, or null
    const originalPixelCache = new Map();   // imageId → decoded pre-blur pixels (canvas)
    const editorCreatedUrls = new Map();    // imageId → last object URL this editor minted

    function makeCanvas(w, h) {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
    }

    /** Decode the saved pre-blur original for `id` into a canvas once, then cache it. */
    function loadOriginalPixels(id) {
        if (originalPixelCache.has(id)) return Promise.resolve(originalPixelCache.get(id));
        const src = state.originalImages.get(id);
        if (!src) return Promise.resolve(null);
        return new Promise(resolve => {
            const im = new Image();
            im.crossOrigin = 'anonymous';
            im.onload = () => {
                const c = makeCanvas(im.naturalWidth, im.naturalHeight);
                c.getContext('2d').drawImage(im, 0, 0);
                originalPixelCache.set(id, c);
                resolve(c);
            };
            im.onerror = () => resolve(null); // eraser simply no-ops if this fails
            im.src = src;
        });
    }

    function beginStrokeSession(tool) {
        const id = window.currentLightboxImageId;
        const img = lightboxImage;
        if (!id || !img || !img.naturalWidth) return null;

        // The lightbox <img> is already decoded and on screen, so it can be drawn
        // straight into a canvas - no Image() + onload round-trip needed for it.
        const work = makeCanvas(img.naturalWidth, img.naturalHeight);
        work.getContext('2d').drawImage(img, 0, 0);

        const session = {
            id,
            tool,
            work,
            ctx: work.getContext('2d'),
            orig: null,
            pending: [],   // dabs that landed before `orig` finished decoding
            dirty: false
        };
        strokeSession = session;

        if (tool === 'eraser') {
            // Deliberately NOT guarded on `strokeSession === session`: a drag can finish
            // before this decode does, and commitStrokeSession() still needs the pixels
            // to flush whatever was queued. Guarding on identity here silently threw the
            // whole stroke away whenever the user erased faster than the image decoded.
            session.loadPromise = loadOriginalPixels(id).then(origCanvas => {
                session.orig = origCanvas;
                flushPendingDabs(session);
            });
        }
        return session;
    }

    /** Paint any dabs that arrived before the eraser's source pixels were ready. */
    function flushPendingDabs(session) {
        if (!session.orig || !session.pending.length) return;
        session.pending.splice(0).forEach(p => paintEraserDab(session, p));
        if (strokeSession === session) render();
    }

    /** Region of the work canvas covered by a dab at `natPt`, or null if off-image. */
    function dabRect(session, natPt) {
        const r = state.brushSize;
        const w = session.work.width;
        const h = session.work.height;
        const ex = Math.max(0, natPt.x - r);
        const ey = Math.max(0, natPt.y - r);
        const ew = Math.min(r * 2, w - ex);
        const eh = Math.min(r * 2, h - ey);
        if (ew <= 0 || eh <= 0) return null;
        return { ex, ey, ew, eh, w, h };
    }

    function paintBlurDab(session, natPt) {
        const d = dabRect(session, natPt);
        if (!d) return;
        const c = session.ctx;
        c.save();
        c.filter = 'blur(12px)';
        // Blurring the region by drawing it back onto itself, as before - so holding
        // the brush in one place keeps compounding the blur, which is the existing
        // and expected feel of this tool.
        c.drawImage(session.work, d.ex, d.ey, d.ew, d.eh, d.ex, d.ey, d.ew, d.eh);
        c.restore();
        session.dirty = true;
    }

    function paintEraserDab(session, natPt) {
        if (!session.orig) { session.pending.push(natPt); return; }
        const d = dabRect(session, natPt);
        if (!d) return;
        // Map the destination rect into the original's own pixel space, in case the
        // stored original differs in size from the current (blurred) image.
        const sxr = session.orig.width / d.w;
        const syr = session.orig.height / d.h;
        const c = session.ctx;
        c.save();
        c.beginPath();
        c.arc(natPt.x, natPt.y, state.brushSize, 0, Math.PI * 2);
        c.clip();
        c.drawImage(session.orig, d.ex * sxr, d.ey * syr, d.ew * sxr, d.eh * syr, d.ex, d.ey, d.ew, d.eh);
        c.restore();
        session.dirty = true;
    }

    /**
     * End the drag and write the result out ONCE: encode, swap the <img> and the
     * gallery thumbnail, and rebuild the gallery a single time.
     */
    function commitStrokeSession() {
        const session = strokeSession;
        strokeSession = null;
        if (!session) return;

        // A short eraser drag can end before the source pixels have decoded. Wait for
        // them and paint the queued dabs, otherwise the stroke is lost on release.
        if (session.pending.length && session.loadPromise) {
            session.loadPromise.then(() => {
                flushPendingDabs(session);
                writeOutStrokeSession(session);
            });
            return;
        }
        writeOutStrokeSession(session);
    }

    function writeOutStrokeSession(session) {
        if (!session.dirty) { render(); return; }

        const id = session.id;
        const thumb = document.getElementById(id);
        session.work.toBlob(blob => {
            if (!blob) { render(); return; }
            const url = URL.createObjectURL(blob);
            const previous = editorCreatedUrls.get(id);

            if (lightboxImage && window.currentLightboxImageId === id) lightboxImage.src = url;
            if (thumb) thumb.src = url;
            state.baseImages.set(id, url);
            editorCreatedUrls.set(id, url);
            if (typeof window.updateLightboxGallery === 'function') window.updateLightboxGallery();

            // Release the blob this one replaces. Guarded: the pre-blur original and
            // whatever undo is holding are both still live references elsewhere, and
            // revoking either would break the image rather than just free memory.
            const undoUrl = window._imageEditorUndoMap && window._imageEditorUndoMap.get(id);
            if (previous && previous !== url
                && previous !== state.originalImages.get(id)
                && previous !== undoUrl) {
                URL.revokeObjectURL(previous);
            }
            render();
        }, 'image/jpeg', 0.92);
    }

    function applyBlurStroke(localPt) {
        if (!strokeSession) return;
        paintBlurDab(strokeSession, toNatural(localPt));
    }

    function updateUndoButton() {
        const btn = document.getElementById('undoBlurBtn');
        if (btn) btn.style.display = 'none'; // Hidden — eraser replaces undo
    }

    // ─── ERASER ENGINE (restores original pixels) ───────────────────────

    function applyEraserStroke(localPt) {
        if (!strokeSession) return;
        paintEraserDab(strokeSession, toNatural(localPt));
    }

    // ─── POINTER EVENT HANDLERS ─────────────────────────────────────────

    function onPointerDown(e) {
        e.preventDefault();
        const pt = eventToLocal(e);

        if (state.tool === 'blur' || state.tool === 'eraser') {
            // Capture the pointer so a drag that wanders outside the canvas still
            // delivers its pointerup here - otherwise the session would never commit
            // and the stroke would be lost.
            if (e.pointerId != null && canvas.setPointerCapture) {
                try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* non-fatal */ }
            }
            state.isDrawing = true;

            if (state.tool === 'blur') {
                saveOriginalImage();                       // keep the pre-blur pixels for the eraser
                if (!window._imageEditorUndoMap) window._imageEditorUndoMap = new Map();
                const id = window.currentLightboxImageId;
                // Each drag pushes a new undo point, which orphans the one it replaces.
                // Release it here - commitStrokeSession() can't, because at the moment it
                // runs that URL is still the live undo target and revoking it would break
                // undo rather than just free memory.
                const staleUndo = window._imageEditorUndoMap.get(id);
                if (staleUndo && staleUndo !== lightboxImage.src && staleUndo !== state.originalImages.get(id)) {
                    URL.revokeObjectURL(staleUndo);
                }
                window._imageEditorUndoMap.set(id, lightboxImage.src);
                updateUndoButton();
            } else if (!state.originalImages.get(window.currentLightboxImageId)) {
                state.isDrawing = false;                   // nothing was ever blurred here
                return;
            }

            beginStrokeSession(state.tool);
            if (state.tool === 'blur') applyBlurStroke(pt);
            else applyEraserStroke(pt);
            render();
            return;
        }

        if (state.tool === 'select') {
            const hit = hitTest(pt);
            if (hit) {
                state.selectedIdx = hit.idx;
                if (hit.handle) {
                    state.isResizing = true;
                    state.resizeHandle = hit.handle;
                } else {
                    state.isDragging = true;
                }
                state.dragStart = pt;
                render();
                return;
            }
            state.selectedIdx = -1;
            render();
            return;
        }

        // Click-to-place: stickman
        if (state.tool === 'stickman') {
            const natPt = toNatural(pt);
            const annots = getAnnotations();
            ensureBaseImage(window.currentLightboxImageId);
            const defaultSize = Math.max(state.natural.h * 0.12, 40);
            annots.push({ type: 'stickman', x: natPt.x, y: natPt.y, size: defaultSize, color: state.brushColor, strokeWidth: state.strokeWidth });
            setAnnotations(annots);
            state.selectedIdx = annots.length - 1;
            setActiveTool('select');
            return;
        }

        // Drawing circle, arrow, or line
        if (state.tool === 'circle' || state.tool === 'arrow' || state.tool === 'line') {
            state.isDrawing = true;
            state.drawStart = pt;
            return;
        }
    }

    function onPointerMove(e) {
        e.preventDefault();
        const pt = eventToLocal(e);

        // Update cursor display for blur/eraser brush
        if (state.tool === 'blur' || state.tool === 'eraser') {
            state._cursorPos = pt;
            if (state.isDrawing) {
                if (state.tool === 'blur') applyBlurStroke(pt);
                else applyEraserStroke(pt);
            }
            render();
            return;
        }

        if (state.tool === 'select') {
            // Change cursor based on what's under pointer
            const hit = hitTest(pt);
            canvas.style.cursor = hit ? (hit.handle ? 'nwse-resize' : 'move') : 'default';
        }

        if (state.isDrawing && state.drawStart) {
            // Live preview while drawing
            render();
            const from = state.drawStart;
            if (state.tool === 'circle') {
                const rx = Math.abs(pt.x - from.x);
                const ry = Math.abs(pt.y - from.y);
                const cx = (from.x + pt.x) / 2;
                const cy = (from.y + pt.y) / 2;
                ctx.save();
                ctx.beginPath();
                ctx.ellipse(cx, cy, rx / 2, ry / 2, 0, 0, Math.PI * 2);
                ctx.strokeStyle = state.brushColor;
                ctx.lineWidth = state.strokeWidth;
                ctx.setLineDash([6, 4]);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
            } else if (state.tool === 'arrow') {
                ctx.save();
                ctx.strokeStyle = state.brushColor;
                ctx.lineWidth = state.strokeWidth;
                ctx.setLineDash([6, 4]);
                ctx.beginPath();
                ctx.moveTo(from.x, from.y);
                ctx.lineTo(pt.x, pt.y);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
            } else if (state.tool === 'line') {
                ctx.save();
                ctx.strokeStyle = state.brushColor;
                ctx.lineWidth = state.strokeWidth;
                ctx.lineCap = 'round';
                ctx.setLineDash([6, 4]);
                ctx.beginPath();
                ctx.moveTo(from.x, from.y);
                ctx.lineTo(pt.x, pt.y);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
            }
            return;
        }

        if (state.isDragging && state.dragStart) {
            const dx = pt.x - state.dragStart.x;
            const dy = pt.y - state.dragStart.y;
            const a = getAnnotations()[state.selectedIdx];
            if (!a) return;
            const dxN = dx * state.scale;
            const dyN = dy * state.scale;
            if (a.type === 'circle') {
                a.cx += dxN; a.cy += dyN;
            } else if (a.type === 'arrow') {
                a.x1 += dxN; a.y1 += dyN;
                a.x2 += dxN; a.y2 += dyN;
            } else if (a.type === 'line') {
                a.x1 += dxN; a.y1 += dyN;
                a.x2 += dxN; a.y2 += dyN;
            } else if (a.type === 'stickman') {
                a.x += dxN; a.y += dyN;
            }
            state.dragStart = pt;
            render();
            return;
        }

        if (state.isResizing && state.dragStart) {
            const natPt = toNatural(pt);
            const a = getAnnotations()[state.selectedIdx];
            if (!a) return;
            if (a.type === 'circle') {
                if (state.resizeHandle === 'left' || state.resizeHandle === 'right') {
                    a.rx = Math.abs(natPt.x - a.cx);
                } else {
                    a.ry = Math.abs(natPt.y - a.cy);
                }
                // Minimum size
                a.rx = Math.max(a.rx, 10);
                a.ry = Math.max(a.ry, 10);
            } else if (a.type === 'arrow') {
                if (state.resizeHandle === 'start') {
                    a.x1 = natPt.x; a.y1 = natPt.y;
                } else {
                    a.x2 = natPt.x; a.y2 = natPt.y;
                }
            } else if (a.type === 'line') {
                if (state.resizeHandle === 'start') {
                    a.x1 = natPt.x; a.y1 = natPt.y;
                } else {
                    a.x2 = natPt.x; a.y2 = natPt.y;
                }
            } else if (a.type === 'stickman') {
                // Drag the bottom handle to resize the figure
                const dy = natPt.y - a.y;
                if (dy > 0) a.size = Math.max(dy / 0.65, 20);
            }
            state.dragStart = pt;
            render();
            return;
        }
    }

    function onPointerUp(e) {
        const pt = eventToLocal(e);

        if ((state.tool === 'blur' || state.tool === 'eraser') && state.isDrawing) {
            if (e.pointerId != null && canvas.releasePointerCapture && canvas.hasPointerCapture?.(e.pointerId)) {
                try { canvas.releasePointerCapture(e.pointerId); } catch (_) { /* non-fatal */ }
            }
            state.isDrawing = false;
            // The single expensive write-out for the whole drag.
            commitStrokeSession();
            return;
        }

        if (state.isDrawing && state.drawStart) {
            const from = state.drawStart;
            const natFrom = toNatural(from);
            const natTo = toNatural(pt);
            const annots = getAnnotations();

            // Save base image before first annotation is created
            ensureBaseImage(window.currentLightboxImageId);

            if (state.tool === 'circle') {
                const cx = (natFrom.x + natTo.x) / 2;
                const cy = (natFrom.y + natTo.y) / 2;
                const rx = Math.abs(natTo.x - natFrom.x) / 2;
                const ry = Math.abs(natTo.y - natFrom.y) / 2;
                if (rx > 5 && ry > 5) { // Min size to avoid accidental micro-draws
                    annots.push({ type: 'circle', cx, cy, rx, ry, color: state.brushColor, strokeWidth: state.strokeWidth });
                    state.selectedIdx = annots.length - 1;
                }
            } else if (state.tool === 'arrow') {
                if (dist(from, pt) > 10) { // Min length
                    annots.push({ type: 'arrow', x1: natFrom.x, y1: natFrom.y, x2: natTo.x, y2: natTo.y, color: state.brushColor, strokeWidth: state.strokeWidth });
                    state.selectedIdx = annots.length - 1;
                }
            } else if (state.tool === 'line') {
                if (dist(from, pt) > 10) { // Min length
                    annots.push({ type: 'line', x1: natFrom.x, y1: natFrom.y, x2: natTo.x, y2: natTo.y, color: state.brushColor, strokeWidth: state.strokeWidth });
                    state.selectedIdx = annots.length - 1;
                }
            }
            setAnnotations(annots);
            // Auto-switch to select after drawing
            setActiveTool('select');
        }

        state.isDrawing = false;
        state.isDragging = false;
        state.isResizing = false;
        state.drawStart = null;
        state.dragStart = null;
        state.resizeHandle = null;
        render();
    }

    function onPointerLeave() {
        state._cursorPos = null;
        if (state.tool === 'blur' || state.tool === 'eraser') render();
    }

    // ─── KEYBOARD SHORTCUTS ─────────────────────────────────────────────

    function onKeyDown(e) {
        if (document.getElementById('lightboxModal').style.display !== 'flex') return;
        const active = document.activeElement;
        if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT')) return;

        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (state.selectedIdx >= 0) {
                e.preventDefault();
                e.stopPropagation();
                deleteSelected();
            }
        }
        if (e.key === 'Escape') {
            state.selectedIdx = -1;
            render();
        }
    }

    function deleteSelected() {
        const annots = getAnnotations();
        if (state.selectedIdx >= 0 && state.selectedIdx < annots.length) {
            annots.splice(state.selectedIdx, 1);
            setAnnotations(annots);
            state.selectedIdx = -1;
            render();
        }
    }

    // ─── TOOLBAR ────────────────────────────────────────────────────────

    function createToolbar() {
        toolbar = document.createElement('div');
        toolbar.id = 'imageEditorToolbar';
        toolbar.className = 'absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-slate-900/90 backdrop-blur-xl rounded-2xl px-2 py-1.5 border border-white/10 shadow-2xl';
        toolbar.innerHTML = `
            <div class="flex items-center gap-0.5 pr-2 border-r border-white/10">
                <button data-tool="select" title="Select / Move (V)" class="tool-btn p-2 rounded-xl transition-all duration-150" aria-label="Select tool">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>
                </button>
                <button data-tool="blur" title="Blur Brush (B)" class="tool-btn p-2 rounded-xl transition-all duration-150" aria-label="Blur brush">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" opacity="0.3"/><circle cx="12" cy="12" r="6" opacity="0.5"/><circle cx="12" cy="12" r="2"/></svg>
                </button>
                <button data-tool="eraser" title="Eraser — remove blur (E)" class="tool-btn p-2 rounded-xl transition-all duration-150" aria-label="Eraser">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.8l10-10c.8-.8 2-.8 2.8 0l5.6 5.6c.8.8.8 2 0 2.8L16 17"/><path d="M6 11l7 7"/></svg>
                </button>
                <button data-tool="circle" title="Draw Circle (C)" class="tool-btn p-2 rounded-xl transition-all duration-150" aria-label="Circle tool">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/></svg>
                </button>
                <button data-tool="arrow" title="Draw Arrow (A)" class="tool-btn p-2 rounded-xl transition-all duration-150" aria-label="Arrow tool">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 19L19 5M19 5h-6M19 5v6"/></svg>
                </button>
                <button data-tool="line" title="Draw Line — no arrowhead (L)" class="tool-btn p-2 rounded-xl transition-all duration-150" aria-label="Line tool">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="4" y1="20" x2="20" y2="4" stroke-linecap="round"/></svg>
                </button>
                <button data-tool="stickman" title="Add Stick Figure (S)" class="tool-btn p-2 rounded-xl transition-all duration-150" aria-label="Stick figure">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="4" r="2"/><line x1="12" y1="6" x2="12" y2="14"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="12" y1="14" x2="9" y2="20"/><line x1="12" y1="14" x2="15" y2="20"/></svg>
                </button>
            </div>
            <div class="flex items-center gap-1.5 px-2 border-r border-white/10">
                <label class="text-[10px] text-white/50 uppercase tracking-wider">Color</label>
                <input type="color" id="editorColor" value="${state.brushColor}" class="w-6 h-6 rounded-lg border border-white/20 cursor-pointer bg-transparent p-0" title="Annotation color">
            </div>
            <div class="flex items-center gap-1.5 px-2 border-r border-white/10">
                <label class="text-[10px] text-white/50 uppercase tracking-wider">Size</label>
                <input type="range" id="editorBrushSize" min="10" max="80" value="${state.brushSize}" class="w-16 h-1 accent-indigo-500 cursor-pointer" title="Brush / stroke size">
            </div>
            <div class="flex items-center gap-0.5 pl-1 border-r border-white/10 pr-2">
                <button id="editorDeleteBtn" title="Delete selected (Del)" class="tool-btn p-2 rounded-xl text-red-400 hover:bg-red-500/20 transition-all duration-150 disabled:opacity-30" disabled aria-label="Delete annotation">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
                <button id="editorClearAllBtn" title="Clear all annotations" class="tool-btn p-2 rounded-xl text-amber-400 hover:bg-amber-500/20 transition-all duration-150" aria-label="Clear all">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>
                </button>
            </div>
            <div class="flex items-center gap-0.5 pl-1">
                <button id="editorReplaceBtn" title="Replace image" class="tool-btn p-2 rounded-xl text-indigo-400 hover:bg-indigo-500/20 transition-all duration-150" aria-label="Replace image">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                </button>
            </div>
        `;
        return toolbar;
    }

    function setActiveTool(toolName) {
        state.tool = toolName;
        state.selectedIdx = -1;
        toolbar.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            const active = btn.dataset.tool === toolName;
            btn.className = `tool-btn p-2 rounded-xl transition-all duration-150 ${active ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'text-white/60 hover:bg-white/10 hover:text-white'}`;
        });
        // Update cursor
        if (toolName === 'blur' || toolName === 'eraser') canvas.style.cursor = 'none';
        else if (toolName === 'circle' || toolName === 'arrow' || toolName === 'line') canvas.style.cursor = 'crosshair';
        else if (toolName === 'stickman') canvas.style.cursor = 'copy';
        else canvas.style.cursor = 'default';
        updateDeleteButton();
        render();
    }

    function updateDeleteButton() {
        const btn = document.getElementById('editorDeleteBtn');
        if (btn) btn.disabled = state.selectedIdx < 0;
    }

    function bindToolbarEvents() {
        toolbar.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => setActiveTool(btn.dataset.tool));
        });

        document.getElementById('editorColor').addEventListener('input', (e) => {
            state.brushColor = e.target.value;
            // Update selected annotation color live
            if (state.selectedIdx >= 0) {
                const annots = getAnnotations();
                if (annots[state.selectedIdx]) {
                    annots[state.selectedIdx].color = state.brushColor;
                    render();
                }
            }
        });

        document.getElementById('editorBrushSize').addEventListener('input', (e) => {
            state.brushSize = parseInt(e.target.value);
            state.strokeWidth = Math.max(2, state.brushSize / 8);
        });

        document.getElementById('editorDeleteBtn').addEventListener('click', deleteSelected);

        document.getElementById('editorClearAllBtn').addEventListener('click', () => {
            if (getAnnotations().length === 0) return;
            setAnnotations([]);
            state.selectedIdx = -1;
            render();
        });

        // Replace image button — trigger the hidden file input from Index.HTML
        document.getElementById('editorReplaceBtn').addEventListener('click', () => {
            const replaceInput = document.getElementById('replaceImageInput');
            if (replaceInput) replaceInput.click();
        });

        // Keyboard tool shortcuts
        document.addEventListener('keydown', (e) => {
            if (document.getElementById('lightboxModal').style.display !== 'flex') return;
            const active = document.activeElement;
            if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT')) return;
            if (e.key === 'v' || e.key === 'V') setActiveTool('select');
            else if (e.key === 'b' || e.key === 'B') setActiveTool('blur');
            else if (e.key === 'e' || e.key === 'E') setActiveTool('eraser');
            else if (e.key === 'c' || e.key === 'C') setActiveTool('circle');
            else if (e.key === 'a' || e.key === 'A') setActiveTool('arrow');
            else if (e.key === 'l' || e.key === 'L') setActiveTool('line');
            else if (e.key === 's' || e.key === 'S') setActiveTool('stickman');
        });
    }

    // ─── BAKE ANNOTATIONS INTO IMAGE ────────────────────────────────────

    /** Flatten current annotations onto the actual image pixels (for export) */
    function bakeAnnotations(imageId) {
        const annots = state.annotations.get(imageId);
        if (!annots || annots.length === 0) return Promise.resolve();

        const img = document.getElementById(imageId);
        if (!img) return Promise.resolve();

        // Use base image (clean, no annotation overlay) as source
        const baseSrc = state.baseImages.get(imageId) || img.src;

        return new Promise((resolve) => {
            const tempImg = new Image();
            tempImg.crossOrigin = 'anonymous';
            tempImg.onload = () => {
                const c = document.createElement('canvas');
                c.width = tempImg.naturalWidth;
                c.height = tempImg.naturalHeight;
                const cCtx = c.getContext('2d');
                cCtx.drawImage(tempImg, 0, 0);

                // Scale factor: annotations have screen-pixel strokeWidth, bake at natural resolution
                const sf = state.scale || (tempImg.naturalWidth / (state.rendered ? state.rendered.w : tempImg.naturalWidth)) || 1;

                // Draw annotations at natural resolution
                annots.forEach(a => {
                    if (a.type === 'circle') {
                        cCtx.beginPath();
                        cCtx.ellipse(a.cx, a.cy, a.rx, a.ry, 0, 0, Math.PI * 2);
                        cCtx.strokeStyle = a.color || '#ef4444';
                        cCtx.lineWidth = (a.strokeWidth || 3) * sf;
                        cCtx.stroke();
                    } else if (a.type === 'arrow') {
                        const lw = (a.strokeWidth || 3) * sf;
                        cCtx.strokeStyle = a.color || '#ef4444';
                        cCtx.fillStyle = a.color || '#ef4444';
                        cCtx.lineWidth = lw;
                        cCtx.lineCap = 'round';
                        cCtx.beginPath();
                        cCtx.moveTo(a.x1, a.y1);
                        cCtx.lineTo(a.x2, a.y2);
                        cCtx.stroke();
                        // Arrowhead
                        const angle = Math.atan2(a.y2 - a.y1, a.x2 - a.x1);
                        const hl = Math.max(14, lw * 4);
                        cCtx.beginPath();
                        cCtx.moveTo(a.x2, a.y2);
                        cCtx.lineTo(a.x2 - hl * Math.cos(angle - Math.PI / 6), a.y2 - hl * Math.sin(angle - Math.PI / 6));
                        cCtx.lineTo(a.x2 - hl * Math.cos(angle + Math.PI / 6), a.y2 - hl * Math.sin(angle + Math.PI / 6));
                        cCtx.closePath();
                        cCtx.fill();
                    } else if (a.type === 'line') {
                        const lw = (a.strokeWidth || 3) * sf;
                        cCtx.strokeStyle = a.color || '#ef4444';
                        cCtx.lineWidth = lw;
                        cCtx.lineCap = 'round';
                        cCtx.beginPath();
                        cCtx.moveTo(a.x1, a.y1);
                        cCtx.lineTo(a.x2, a.y2);
                        cCtx.stroke();
                    } else if (a.type === 'stickman') {
                        const lw = (a.strokeWidth || 3) * sf;
                        const s = a.size;
                        cCtx.strokeStyle = a.color || '#ef4444';
                        cCtx.lineWidth = lw;
                        cCtx.lineCap = 'round';
                        cCtx.lineJoin = 'round';
                        cCtx.beginPath(); cCtx.arc(a.x, a.y - s * 0.65, s * 0.2, 0, Math.PI * 2); cCtx.stroke();
                        cCtx.beginPath(); cCtx.moveTo(a.x, a.y - s * 0.45); cCtx.lineTo(a.x, a.y + s * 0.05); cCtx.stroke();
                        cCtx.beginPath(); cCtx.moveTo(a.x, a.y - s * 0.35); cCtx.lineTo(a.x - s * 0.4, a.y - s * 0.1); cCtx.stroke();
                        cCtx.beginPath(); cCtx.moveTo(a.x, a.y - s * 0.35); cCtx.lineTo(a.x + s * 0.4, a.y - s * 0.1); cCtx.stroke();
                        cCtx.beginPath(); cCtx.moveTo(a.x, a.y + s * 0.05); cCtx.lineTo(a.x - s * 0.3, a.y + s * 0.65); cCtx.stroke();
                        cCtx.beginPath(); cCtx.moveTo(a.x, a.y + s * 0.05); cCtx.lineTo(a.x + s * 0.3, a.y + s * 0.65); cCtx.stroke();
                    }
                });

                c.toBlob(blob => {
                    if (!blob) { resolve(); return; }
                    const url = URL.createObjectURL(blob);
                    img.src = url;
                    const lbImage = document.getElementById('lightboxImage');
                    if (lbImage && window.currentLightboxImageId === imageId) lbImage.src = url;
                    // Clear baked annotations and base — they're now permanent pixels
                    state.annotations.set(imageId, []);
                    state.baseImages.delete(imageId);
                    resolve();
                }, 'image/jpeg', 0.92);
            };
            tempImg.onerror = resolve;
            tempImg.src = baseSrc;
        });
    }

    /** Bake all annotations across all images (call before export/download) */
    async function bakeAllAnnotations() {
        const ids = Array.from(state.annotations.keys());
        for (const id of ids) {
            await bakeAnnotations(id);
        }
    }

    // ─── INIT / TEARDOWN ────────────────────────────────────────────────

    function init() {
        lightboxImage = document.getElementById('lightboxImage');
        imageWrapper = lightboxImage ? lightboxImage.parentElement : null;

        if (!imageWrapper || !lightboxImage) {
            console.warn('Image editor: lightbox elements not found');
            return;
        }

        // Ensure wrapper is positioned for canvas overlay
        if (getComputedStyle(imageWrapper).position === 'static') {
            imageWrapper.style.position = 'relative';
        }

        // Create overlay canvas
        canvas = document.createElement('canvas');
        canvas.id = 'imageEditorCanvas';
        canvas.style.cssText = 'position:absolute;top:0;left:0;z-index:10;touch-action:none;';
        imageWrapper.appendChild(canvas);
        ctx = canvas.getContext('2d');

        // Create and mount toolbar
        const tb = createToolbar();
        imageWrapper.appendChild(tb);
        bindToolbarEvents();

        // Remove old click-to-blur listener from lightboxImage
        lightboxImage.removeEventListener('click', window._oldBlurHandler);
        lightboxImage.style.cursor = 'default';
        // Pointer events on canvas, not image
        lightboxImage.style.pointerEvents = 'none';

        // Canvas events
        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointerleave', onPointerLeave);
        // Touch support
        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); onPointerDown(e.touches[0]); }, { passive: false });
        canvas.addEventListener('touchmove', (e) => { e.preventDefault(); onPointerMove(e.touches[0]); }, { passive: false });
        canvas.addEventListener('touchend', (e) => { e.preventDefault(); onPointerUp(e.changedTouches ? e.changedTouches[0] : e); }, { passive: false });

        // Keyboard
        document.addEventListener('keydown', onKeyDown);

        // Re-layout on image load and resize
        lightboxImage.addEventListener('load', () => { recalcLayout(); render(); });
        window.addEventListener('resize', () => { recalcLayout(); render(); });

        // Initial layout if image already loaded
        if (lightboxImage.complete && lightboxImage.naturalWidth) {
            recalcLayout();
        }

        setActiveTool('blur');
    }

    /** Called when lightbox opens — resets state and shows canvas */
    function onLightboxOpen() {
        if (!canvas) init();
        state.selectedIdx = -1;
        state.isDrawing = false;
        state.isDragging = false;
        canvas.style.display = 'block';
        toolbar.style.display = '';

        // Restore base image if this image has editable annotations
        const currentId = window.currentLightboxImageId;
        if (currentId && state.baseImages.has(currentId) && state.annotations.has(currentId) && state.annotations.get(currentId).length > 0) {
            lightboxImage.src = state.baseImages.get(currentId);
        }

        setTimeout(() => { recalcLayout(); render(); }, 50);
        updateUndoButton();
    }

    /** Called when lightbox closes — render preview, hide canvas */
    function onLightboxClose() {
        // Commit rather than discard: if the lightbox is closed mid-drag the user
        // still expects the strokes they just painted to be there.
        if (strokeSession) commitStrokeSession();
        // Decoded originals are only a cache; drop them so a long session doesn't
        // hold a full-resolution canvas per edited image.
        originalPixelCache.clear();

        const closingId = window.currentLightboxImageId;
        if (closingId) {
            // Save base image if we have annotations but haven't saved base yet
            ensureBaseImage(closingId);
            updateThumbnailPreview(closingId);
        }
        if (canvas) canvas.style.display = 'none';
        if (toolbar) toolbar.style.display = 'none';
        state.isDrawing = false;
        state.isDragging = false;
        state._cursorPos = null;
    }

    /** Called when switching to a new image — preview previous, restore current base */
    function onImageChange(previousImageId) {
        // Flush any in-progress drag against the OUTGOING image before the id
        // switches, or the commit would write those pixels onto the wrong image.
        if (strokeSession) commitStrokeSession();

        if (previousImageId) {
            ensureBaseImage(previousImageId);
            updateThumbnailPreview(previousImageId);
        }
        state.selectedIdx = -1;
        state.isDrawing = false;

        // Restore base image for the current image so overlay canvas can render editable annotations
        const currentId = window.currentLightboxImageId;
        if (currentId && state.baseImages.has(currentId) && state.annotations.has(currentId) && state.annotations.get(currentId).length > 0) {
            lightboxImage.src = state.baseImages.get(currentId);
        }

        setTimeout(() => { recalcLayout(); render(); }, 50);
        updateUndoButton();
    }

    /** Save the current (clean) image src as base if not yet saved */
    function ensureBaseImage(imageId) {
        if (!imageId || state.baseImages.has(imageId)) return;
        // Use lightbox src if it's the current image, otherwise thumbnail
        const src = (window.currentLightboxImageId === imageId && lightboxImage)
            ? lightboxImage.src : (document.getElementById(imageId) || {}).src;
        if (src) state.baseImages.set(imageId, src);
    }

    /** Render annotations onto thumbnail as a visual preview (NON-DESTRUCTIVE — keeps annotation data) */
    function updateThumbnailPreview(imageId) {
        const annots = state.annotations.get(imageId);
        if (!annots || annots.length === 0) return;

        const thumb = document.getElementById(imageId);
        if (!thumb) return;

        // Always use the clean base as source for preview rendering
        const baseSrc = state.baseImages.get(imageId) || thumb.src;

        const tempImg = new Image();
        tempImg.crossOrigin = 'anonymous';
        tempImg.onload = () => {
            const c = document.createElement('canvas');
            c.width = tempImg.naturalWidth;
            c.height = tempImg.naturalHeight;
            const cCtx = c.getContext('2d');
            cCtx.drawImage(tempImg, 0, 0);

            const sf = state.scale || (tempImg.naturalWidth / (state.rendered ? state.rendered.w : tempImg.naturalWidth)) || 1;

            annots.forEach(a => {
                if (a.type === 'circle') {
                    cCtx.beginPath();
                    cCtx.ellipse(a.cx, a.cy, a.rx, a.ry, 0, 0, Math.PI * 2);
                    cCtx.strokeStyle = a.color || '#ef4444';
                    cCtx.lineWidth = (a.strokeWidth || 3) * sf;
                    cCtx.stroke();
                } else if (a.type === 'arrow') {
                    const lw = (a.strokeWidth || 3) * sf;
                    cCtx.strokeStyle = a.color || '#ef4444';
                    cCtx.fillStyle = a.color || '#ef4444';
                    cCtx.lineWidth = lw;
                    cCtx.lineCap = 'round';
                    cCtx.beginPath();
                    cCtx.moveTo(a.x1, a.y1);
                    cCtx.lineTo(a.x2, a.y2);
                    cCtx.stroke();
                    const angle = Math.atan2(a.y2 - a.y1, a.x2 - a.x1);
                    const hl = Math.max(14, lw * 4);
                    cCtx.beginPath();
                    cCtx.moveTo(a.x2, a.y2);
                    cCtx.lineTo(a.x2 - hl * Math.cos(angle - Math.PI / 6), a.y2 - hl * Math.sin(angle - Math.PI / 6));
                    cCtx.lineTo(a.x2 - hl * Math.cos(angle + Math.PI / 6), a.y2 - hl * Math.sin(angle + Math.PI / 6));
                    cCtx.closePath();
                    cCtx.fill();
                } else if (a.type === 'line') {
                    const lw = (a.strokeWidth || 3) * sf;
                    cCtx.strokeStyle = a.color || '#ef4444';
                    cCtx.lineWidth = lw;
                    cCtx.lineCap = 'round';
                    cCtx.beginPath();
                    cCtx.moveTo(a.x1, a.y1);
                    cCtx.lineTo(a.x2, a.y2);
                    cCtx.stroke();
                } else if (a.type === 'stickman') {
                    const lw = (a.strokeWidth || 3) * sf;
                    const s = a.size;
                    cCtx.strokeStyle = a.color || '#ef4444';
                    cCtx.lineWidth = lw;
                    cCtx.lineCap = 'round';
                    cCtx.lineJoin = 'round';
                    cCtx.beginPath(); cCtx.arc(a.x, a.y - s * 0.65, s * 0.2, 0, Math.PI * 2); cCtx.stroke();
                    cCtx.beginPath(); cCtx.moveTo(a.x, a.y - s * 0.45); cCtx.lineTo(a.x, a.y + s * 0.05); cCtx.stroke();
                    cCtx.beginPath(); cCtx.moveTo(a.x, a.y - s * 0.35); cCtx.lineTo(a.x - s * 0.4, a.y - s * 0.1); cCtx.stroke();
                    cCtx.beginPath(); cCtx.moveTo(a.x, a.y - s * 0.35); cCtx.lineTo(a.x + s * 0.4, a.y - s * 0.1); cCtx.stroke();
                    cCtx.beginPath(); cCtx.moveTo(a.x, a.y + s * 0.05); cCtx.lineTo(a.x - s * 0.3, a.y + s * 0.65); cCtx.stroke();
                    cCtx.beginPath(); cCtx.moveTo(a.x, a.y + s * 0.05); cCtx.lineTo(a.x + s * 0.3, a.y + s * 0.65); cCtx.stroke();
                }
            });

            c.toBlob(blob => {
                if (!blob) return;
                const url = URL.createObjectURL(blob);
                // Update thumbnail with preview (annotations are visual only here)
                thumb.src = url;
                // NOTE: Do NOT clear annotations — they remain editable in state
                if (typeof window.updateLightboxGallery === 'function') window.updateLightboxGallery();
            }, 'image/jpeg', 0.92);
        };
        tempImg.onerror = () => console.error('Failed to render preview for', imageId);
        tempImg.src = baseSrc;
    }

    /** Handle undo (replaces old handleUndoBlur) */
    function handleUndo() {
        const id = window.currentLightboxImageId;
        if (!id || !window._imageEditorUndoMap) return;
        const lastUrl = window._imageEditorUndoMap.get(id);
        if (!lastUrl) return;
        const img = document.getElementById('lightboxImage');
        const thumb = document.getElementById(id);
        if (!img || !thumb) return;
        const currentUrl = thumb.src;
        img.src = lastUrl;
        thumb.src = lastUrl;
        window._imageEditorUndoMap.delete(id);
        updateUndoButton();
        if (typeof window.updateLightboxGallery === 'function') window.updateLightboxGallery();
        setTimeout(() => URL.revokeObjectURL(currentUrl), 100);
    }

    function setTool(toolName) {
        if (!toolbar || !canvas) return;
        setActiveTool(toolName);
    }

    function registerAutoBlurResult(imageId, originalSrc, blurredSrc) {
        if (!imageId) return;
        if (originalSrc && !state.originalImages.has(imageId)) {
            state.originalImages.set(imageId, originalSrc);
        }
        if (blurredSrc) {
            state.baseImages.set(imageId, blurredSrc);
        }
    }

    // ─── EXPOSE API ─────────────────────────────────────────────────────
    window.ImageEditor = {
        init,
        onLightboxOpen,
        onLightboxClose,
        onImageChange,
        handleUndo,
        updateThumbnailPreview,
        bakeAnnotations,
        bakeAllAnnotations,
        getAnnotations: () => getAnnotations(),
        getState: () => state,
        setTool,
        registerAutoBlurResult,
        render,
        recalcLayout,
    };
})();
