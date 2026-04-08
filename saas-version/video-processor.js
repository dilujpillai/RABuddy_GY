// ============================================================================
// EHS SMART - VIDEO PROCESSOR MODULE
// Version: 1.0.0
// ============================================================================
// This module handles video upload, frame capture, face blurring, and 
// AI-powered scene description for the SaaS version.
// ============================================================================

'use strict';

// ============================================================================
// VIDEO PROCESSOR CONFIGURATION
// ============================================================================
const VIDEO_CONFIG = {
    MAX_VIDEO_SIZE_MB: 500,
    SUPPORTED_FORMATS: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'],
    MAX_FRAME_WIDTH: 1920,
    FACE_DETECTION_CONFIDENCE: 0.3, // Lowered for better detection
    JPEG_QUALITY: 0.9,
    AUTO_CAPTURE_INTERVAL_SEC: 5,
    MAX_FRAMES_PER_VIDEO: 50,
    // Enhanced blur settings
    BLUR_EXPANSION_FACTOR: 1.8, // Expand detected face box by 80%
    MIN_BLUR_AMOUNT: 25, // Minimum blur pixels
    BLUR_INTENSITY_FACTOR: 2.5, // Higher = more blur relative to face size
    MANUAL_BLUR_RADIUS: 50, // Default radius for manual blur
    MANUAL_BLUR_INTENSITY: 30 // Blur amount for manual clicks
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================
let videoProcessorState = {
    currentVideo: null,
    currentVideoName: '',
    capturedFrames: [],
    modelsLoaded: false,
    isProcessing: false,
    isPro: false // Will be set based on subscription
};

// ============================================================================
// FACE DETECTION MODEL LOADING
// ============================================================================

/**
 * Load face-api.js models for face detection
 */
async function loadFaceDetectionModels() {
    if (videoProcessorState.modelsLoaded) return true;
    
    const MODEL_URLS = [
        './models/',
        '../models/',
        'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/'
    ];
    
    for (const url of MODEL_URLS) {
        try {
            console.log('Loading face detection models from:', url);
            
            if (typeof faceapi === 'undefined') {
                throw new Error('face-api.js not loaded');
            }
            
            await faceapi.nets.ssdMobilenetv1.loadFromUri(url);
            videoProcessorState.modelsLoaded = true;
            console.log('Face detection models loaded successfully');
            return true;
        } catch (error) {
            console.warn(`Failed to load models from ${url}:`, error.message);
        }
    }
    
    console.error('Failed to load face detection models from all sources');
    return false;
}

// ============================================================================
// VIDEO UPLOAD & VALIDATION
// ============================================================================

/**
 * Handle video file upload
 */
function handleVideoUpload(file) {
    return new Promise((resolve, reject) => {
        // Validate file type
        if (!VIDEO_CONFIG.SUPPORTED_FORMATS.includes(file.type)) {
            reject(new Error(`Unsupported video format: ${file.type}. Supported: MP4, MOV, AVI, MKV, WebM`));
            return;
        }
        
        // Validate file size
        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB > VIDEO_CONFIG.MAX_VIDEO_SIZE_MB) {
            reject(new Error(`Video too large (${sizeMB.toFixed(1)}MB). Maximum: ${VIDEO_CONFIG.MAX_VIDEO_SIZE_MB}MB`));
            return;
        }
        
        // Create video URL
        const videoUrl = URL.createObjectURL(file);
        videoProcessorState.currentVideo = videoUrl;
        videoProcessorState.currentVideoName = file.name.replace(/\.[^/.]+$/, '');
        videoProcessorState.capturedFrames = [];
        
        resolve({
            url: videoUrl,
            name: file.name,
            size: sizeMB.toFixed(2) + ' MB',
            type: file.type
        });
    });
}

// ============================================================================
// FRAME CAPTURE & FACE BLURRING
// ============================================================================

/**
 * Capture a single frame from video and apply face blur
 */
async function captureFrame(videoElement, applyFaceBlur = true) {
    if (!videoElement || videoElement.readyState < 2) {
        throw new Error('Video not ready for frame capture');
    }
    
    // Create canvas and draw current frame
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Calculate dimensions (max width constraint)
    let width = videoElement.videoWidth;
    let height = videoElement.videoHeight;
    
    if (width > VIDEO_CONFIG.MAX_FRAME_WIDTH) {
        const ratio = VIDEO_CONFIG.MAX_FRAME_WIDTH / width;
        width = VIDEO_CONFIG.MAX_FRAME_WIDTH;
        height = Math.round(height * ratio);
    }
    
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(videoElement, 0, 0, width, height);
    
    // Apply face blur if enabled
    let faceCount = 0;
    if (applyFaceBlur && videoProcessorState.modelsLoaded) {
        faceCount = await applyFaceBlurToCanvas(canvas, ctx);
    }
    
    // Convert to blob
    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const frameNumber = videoProcessorState.capturedFrames.length + 1;
            const frameName = `${videoProcessorState.currentVideoName}_frame${frameNumber}_${timestamp}.jpg`;
            
            const frameData = {
                id: `frame-${Date.now()}-${frameNumber}`,
                blob: blob,
                name: frameName,
                timestamp: videoElement.currentTime,
                faceCount: faceCount,
                fieldNotes: {
                    description: '',
                    hazards: '',
                    controls: '',
                    aiDescription: null // Will be populated if Pro user
                }
            };
            
            videoProcessorState.capturedFrames.push(frameData);
            resolve(frameData);
        }, 'image/jpeg', VIDEO_CONFIG.JPEG_QUALITY);
    });
}

/**
 * Apply face blur to canvas using face-api.js
 * Enhanced with stronger gaussian blur and expanded area
 */
async function applyFaceBlurToCanvas(canvas, ctx) {
    try {
        const detections = await faceapi.detectAllFaces(
            canvas, 
            new faceapi.SsdMobilenetv1Options({ minConfidence: VIDEO_CONFIG.FACE_DETECTION_CONFIDENCE })
        );
        
        if (detections.length > 0) {
            detections.forEach(detection => {
                let { x, y, width, height } = detection.box;
                if (width <= 0 || height <= 0) return;
                
                // Expand the blur area beyond detected face (for hair, ears, etc.)
                const expandX = width * (VIDEO_CONFIG.BLUR_EXPANSION_FACTOR - 1) / 2;
                const expandY = height * (VIDEO_CONFIG.BLUR_EXPANSION_FACTOR - 1) / 2;
                
                // Calculate expanded box with bounds checking
                const blurX = Math.max(0, x - expandX);
                const blurY = Math.max(0, y - expandY);
                const blurWidth = Math.min(canvas.width - blurX, width * VIDEO_CONFIG.BLUR_EXPANSION_FACTOR);
                const blurHeight = Math.min(canvas.height - blurY, height * VIDEO_CONFIG.BLUR_EXPANSION_FACTOR);
                
                // Calculate strong blur amount
                const blurAmount = Math.max(
                    VIDEO_CONFIG.MIN_BLUR_AMOUNT, 
                    Math.round(Math.max(blurWidth, blurHeight) / VIDEO_CONFIG.BLUR_INTENSITY_FACTOR)
                );
                
                // Apply heavy gaussian blur with multiple passes for stronger effect
                // First pass - main blur
                ctx.save();
                ctx.filter = `blur(${blurAmount}px)`;
                ctx.drawImage(canvas, blurX, blurY, blurWidth, blurHeight, blurX, blurY, blurWidth, blurHeight);
                ctx.restore();
                
                // Second pass - additional blur for stronger anonymization
                ctx.save();
                ctx.filter = `blur(${Math.round(blurAmount * 0.6)}px)`;
                ctx.drawImage(canvas, blurX, blurY, blurWidth, blurHeight, blurX, blurY, blurWidth, blurHeight);
                ctx.restore();
            });
        }
        
        return detections.length;
    } catch (error) {
        console.error('Face detection error:', error);
        return 0;
    }
}

/**
 * Manual blur at specific coordinates (for missed faces)
 * Enhanced with stronger blur and larger area
 */
function applyManualBlur(canvas, clickX, clickY, radius = VIDEO_CONFIG.MANUAL_BLUR_RADIUS) {
    const ctx = canvas.getContext('2d');
    const blurAmount = VIDEO_CONFIG.MANUAL_BLUR_INTENSITY;
    
    // Calculate blur box from click point
    const x = Math.max(0, clickX - radius);
    const y = Math.max(0, clickY - radius);
    const width = Math.min(canvas.width - x, radius * 2);
    const height = Math.min(canvas.height - y, radius * 2);
    
    // Create a temporary canvas for the blur operation
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0);
    
    // Apply circular blur mask with strong gaussian
    ctx.save();
    ctx.beginPath();
    ctx.arc(clickX, clickY, radius, 0, Math.PI * 2);
    ctx.clip();
    
    // First blur pass
    ctx.filter = `blur(${blurAmount}px)`;
    ctx.drawImage(tempCanvas, 0, 0);
    
    // Second blur pass for stronger effect
    ctx.filter = `blur(${Math.round(blurAmount * 0.5)}px)`;
    ctx.drawImage(canvas, x, y, width, height, x, y, width, height);
    
    ctx.restore();
    
    return canvas;
}

/**
 * Apply manual blur to a frame blob and return new blob
 */
async function applyManualBlurToFrame(frameId, clickX, clickY, imageWidth, imageHeight) {
    const frame = videoProcessorState.capturedFrames.find(f => f.id === frameId);
    if (!frame) {
        throw new Error('Frame not found');
    }
    
    // Create canvas from blob
    const img = await createImageFromBlob(frame.blob);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    // Scale click coordinates to actual image size
    const scaleX = img.width / imageWidth;
    const scaleY = img.height / imageHeight;
    const actualX = clickX * scaleX;
    const actualY = clickY * scaleY;
    
    // Scale radius proportionally
    const scaledRadius = VIDEO_CONFIG.MANUAL_BLUR_RADIUS * Math.max(scaleX, scaleY);
    
    // Apply blur
    applyManualBlur(canvas, actualX, actualY, scaledRadius);
    
    // Convert back to blob
    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            // Update the frame's blob
            frame.blob = blob;
            frame.manualBlurCount = (frame.manualBlurCount || 0) + 1;
            resolve({
                blob: blob,
                url: URL.createObjectURL(blob)
            });
        }, 'image/jpeg', VIDEO_CONFIG.JPEG_QUALITY);
    });
}

/**
 * Create an Image element from a Blob
 */
function createImageFromBlob(blob) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
    });
}

// ============================================================================
// AI-POWERED SCENE DESCRIPTION (PRO FEATURE)
// ============================================================================

/**
 * Generate AI description of the frame (Pro feature)
 */
async function generateAIDescription(frameBlob) {
    if (!videoProcessorState.isPro) {
        return { error: 'AI description requires Pro subscription' };
    }
    
    try {
        // Convert blob to base64
        const base64 = await blobToBase64(frameBlob);
        
        const prompt = `You are an expert EHS (Environment, Health & Safety) professional analyzing a workplace image.

Describe what you observe in this image in detail:
1. **Scene Description**: What is the work environment? What activity is being performed?
2. **Personnel**: How many workers are visible? What are they doing? What PPE are they wearing?
3. **Equipment/Machinery**: What equipment, tools, or machinery are visible?
4. **Potential Hazards**: What hazards can you identify? (physical, chemical, ergonomic, etc.)
5. **Existing Controls**: What safety measures are already in place?

Provide a structured response in JSON format:
{
  "scene": "Brief description of the work environment and activity",
  "personnel": "Description of workers and their activities",
  "equipment": "List of visible equipment and machinery",
  "hazards": ["hazard 1", "hazard 2", ...],
  "controls": ["control 1", "control 2", ...],
  "riskLevel": "low/medium/high/critical",
  "summary": "2-3 sentence summary for field notes"
}`;

        const response = await fetch(SAAS_CONFIG.API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
                    ]
                }]
            })
        });
        
        if (!response.ok) {
            throw new Error('AI API request failed');
        }
        
        const data = await response.json();
        const content = data.choices[0].message.content;
        
        // Parse JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        
        return { summary: content, raw: true };
    } catch (error) {
        console.error('AI description error:', error);
        return { error: error.message };
    }
}

/**
 * Convert blob to base64
 */
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// ============================================================================
// AUTO-CAPTURE MODE
// ============================================================================

let autoCaptureInterval = null;

/**
 * Start auto-capture mode (captures frame every N seconds)
 */
function startAutoCapture(videoElement, intervalSeconds = VIDEO_CONFIG.AUTO_CAPTURE_INTERVAL_SEC) {
    if (autoCaptureInterval) {
        stopAutoCapture();
    }
    
    autoCaptureInterval = setInterval(async () => {
        if (videoElement.paused || videoElement.ended) {
            stopAutoCapture();
            return;
        }
        
        if (videoProcessorState.capturedFrames.length >= VIDEO_CONFIG.MAX_FRAMES_PER_VIDEO) {
            stopAutoCapture();
            showToast(`Maximum ${VIDEO_CONFIG.MAX_FRAMES_PER_VIDEO} frames reached`, 'warning');
            return;
        }
        
        try {
            const frame = await captureFrame(videoElement, true);
            onFrameCaptured(frame);
        } catch (error) {
            console.error('Auto-capture error:', error);
        }
    }, intervalSeconds * 1000);
    
    return autoCaptureInterval;
}

/**
 * Stop auto-capture mode
 */
function stopAutoCapture() {
    if (autoCaptureInterval) {
        clearInterval(autoCaptureInterval);
        autoCaptureInterval = null;
    }
}

// ============================================================================
// FRAME MANAGEMENT
// ============================================================================

/**
 * Delete a captured frame
 */
function deleteFrame(frameId) {
    const index = videoProcessorState.capturedFrames.findIndex(f => f.id === frameId);
    if (index > -1) {
        // Revoke blob URL to free memory
        const frame = videoProcessorState.capturedFrames[index];
        if (frame.blobUrl) {
            URL.revokeObjectURL(frame.blobUrl);
        }
        videoProcessorState.capturedFrames.splice(index, 1);
        return true;
    }
    return false;
}

/**
 * Update field notes for a frame
 */
function updateFrameNotes(frameId, notes) {
    const frame = videoProcessorState.capturedFrames.find(f => f.id === frameId);
    if (frame) {
        frame.fieldNotes = { ...frame.fieldNotes, ...notes };
        return true;
    }
    return false;
}

/**
 * Get all captured frames
 */
function getCapturedFrames() {
    return videoProcessorState.capturedFrames;
}

/**
 * Clear all captured frames
 */
function clearAllFrames() {
    videoProcessorState.capturedFrames.forEach(frame => {
        if (frame.blobUrl) {
            URL.revokeObjectURL(frame.blobUrl);
        }
    });
    videoProcessorState.capturedFrames = [];
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Export frames as ZIP
 */
async function exportFramesAsZip() {
    if (videoProcessorState.capturedFrames.length === 0) {
        throw new Error('No frames to export');
    }
    
    const zip = new JSZip();
    const framesFolder = zip.folder('frames');
    const notesFolder = zip.folder('field_notes');
    
    // Add frames and notes
    for (const frame of videoProcessorState.capturedFrames) {
        framesFolder.file(frame.name, frame.blob);
        
        // Create field notes text file
        const notesContent = `Frame: ${frame.name}
Timestamp: ${formatVideoTime(frame.timestamp)}
Faces Blurred: ${frame.faceCount}

--- Field Notes ---
Description: ${frame.fieldNotes.description || 'Not provided'}

Hazards Identified: ${frame.fieldNotes.hazards || 'Not provided'}

Existing Controls: ${frame.fieldNotes.controls || 'Not provided'}

${frame.fieldNotes.aiDescription ? `
--- AI Analysis ---
${JSON.stringify(frame.fieldNotes.aiDescription, null, 2)}
` : ''}
`;
        notesFolder.file(frame.name.replace('.jpg', '_notes.txt'), notesContent);
    }
    
    // Generate summary JSON
    const summary = {
        exportDate: new Date().toISOString(),
        videoName: videoProcessorState.currentVideoName,
        totalFrames: videoProcessorState.capturedFrames.length,
        frames: videoProcessorState.capturedFrames.map(f => ({
            name: f.name,
            timestamp: f.timestamp,
            faceCount: f.faceCount,
            fieldNotes: f.fieldNotes
        }))
    };
    zip.file('summary.json', JSON.stringify(summary, null, 2));
    
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    return zipBlob;
}

/**
 * Prepare frames for risk assessment generation
 */
function prepareFramesForAssessment() {
    return videoProcessorState.capturedFrames.map(frame => ({
        id: frame.id,
        name: frame.name,
        description: frame.fieldNotes.description,
        hazards: frame.fieldNotes.hazards,
        controls: frame.fieldNotes.controls,
        aiDescription: frame.fieldNotes.aiDescription,
        blob: frame.blob
    }));
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format video time (seconds to MM:SS)
 */
function formatVideoTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Callback placeholder - will be set by UI
 */
let onFrameCaptured = (frame) => {
    console.log('Frame captured:', frame.name);
};

/**
 * Set frame capture callback
 */
function setFrameCaptureCallback(callback) {
    onFrameCaptured = callback;
}

/**
 * Set Pro status
 */
function setProStatus(isPro) {
    videoProcessorState.isPro = isPro;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize video processor
 */
async function initializeVideoProcessor() {
    console.log('Initializing EHS Smart Video Processor...');
    
    // Load face detection models
    const modelsReady = await loadFaceDetectionModels();
    
    if (modelsReady) {
        console.log('Video processor ready with face detection');
    } else {
        console.warn('Video processor initialized without face detection');
    }
    
    return modelsReady;
}

// ============================================================================
// EXPORTS
// ============================================================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        VIDEO_CONFIG,
        initializeVideoProcessor,
        handleVideoUpload,
        captureFrame,
        applyManualBlur,
        generateAIDescription,
        startAutoCapture,
        stopAutoCapture,
        deleteFrame,
        updateFrameNotes,
        getCapturedFrames,
        clearAllFrames,
        exportFramesAsZip,
        prepareFramesForAssessment,
        setFrameCaptureCallback,
        setProStatus,
        formatVideoTime
    };
}

// Make functions globally available
window.VideoProcessor = {
    init: initializeVideoProcessor,
    uploadVideo: handleVideoUpload,
    captureFrame,
    manualBlur: applyManualBlur,
    manualBlurFrame: applyManualBlurToFrame,
    aiDescribe: generateAIDescription,
    autoCapture: { start: startAutoCapture, stop: stopAutoCapture },
    frames: {
        get: getCapturedFrames,
        delete: deleteFrame,
        updateNotes: updateFrameNotes,
        clear: clearAllFrames
    },
    export: exportFramesAsZip,
    prepareForAssessment: prepareFramesForAssessment,
    setCallback: setFrameCaptureCallback,
    setPro: setProStatus,
    formatTime: formatVideoTime,
    state: videoProcessorState
};

// Also expose manual blur function directly for easy access
window.applyManualBlurToFrame = applyManualBlurToFrame;
