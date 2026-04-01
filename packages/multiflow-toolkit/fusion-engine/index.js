// packages/multiflow-toolkit/fusion-engine/index.js

import { VoiceModule } from '../modules/voice-module.js';
import { CameraModule } from '../modules/camera.js';
import { ColorDetectionModule } from '../modules/color.js';

/**
 * The MultiflowFusionEngine is responsible for orchestrating
 * multimodal inputs (speech, gestures, color detection) and
 * providing a unified output to the main application.
 * It now implements a late fusion strategy for speech and color.
 */
export class MultiflowFusionEngine {
    constructor() {
        console.log("MultiflowFusionEngine constructor: Starting init...");
        
        this.voiceModule = new VoiceModule();
        this.cameraModule = new CameraModule();
        this.colorModule = new ColorDetectionModule();

        this.currentMode = 'idle'; // e.g., 'idle', 'painting', 'background_set'
        this.currentLineWidth = 1; // Default line width
        
        // This will store the LAST detected color event with its timestamp
        this.lastDetectedColorEvent = { color: 'none', timestamp: 0 }; 
        // Define the time window for late fusion in milliseconds (e.g., 3 seconds)
        this.FUSION_WINDOW_MS = 3000; 

        this.validSpeechCommands = ['paint', 'background', 'one', 'two', 'three', 'stop'];
        this.lineWidthMap = { 'one': 1, 'two': 2, 'three': 3 };

        this.onCommand = null; // Callback for the application
        this.videoElement = null; // Reference to the app's video element for camera feed
        this.colorDetectionInterval = null; // Interval ID for continuous color detection loop

        console.log("🚀 MultiflowFusionEngine initialized successfully.");
    }

    /**
     * Starts listening for multimodal inputs.
     * @param {Function} appCallback - A callback function from the application to receive processed commands/events.
     * @param {HTMLVideoElement} videoElem - The HTML <video> element to display the camera stream.
     */
    async start(appCallback, videoElem) {
        this.onCommand = appCallback;
        this.videoElement = videoElem;

        console.log("FusionEngine.start: Attempting to start speech module...");
        if (typeof this.handleSpeechCommand === 'function' && this.voiceModule && typeof this.voiceModule.startListening === 'function') {
            this.voiceModule.startListening(this.handleSpeechCommand.bind(this));
        } else {
            console.error("FusionEngine.start: voiceModule not properly initialized or startListening method is missing, or handleSpeechCommand is missing.");
            this.emitCommand('error', 'Speech recognition module failed to start.');
        }
        
        // Start camera stream
        const cameraStarted = await this.cameraModule.startCamera(this.videoElement);
        if (cameraStarted) {
            console.log("Camera started within Fusion Engine.");
            // Wait for the video to actually start playing before attempting to detect colors
            this.videoElement.addEventListener('loadeddata', () => {
                this.startColorDetectionLoop();
            }, { once: true }); 
        } else {
            this.emitCommand('error', 'Failed to start camera.');
        }

        console.log("Engine started. Listening for inputs...");
    }

    /**
     * Stops all multimodal input listening.
     */
    stop() {
        this.voiceModule.stopListening();
        this.cameraModule.stopCamera();
        this.stopColorDetectionLoop(); // Stop color detection loop
        this.colorModule.destroy(); // Clean up hidden canvas created by color module

        this.currentMode = 'idle';
        this.lastDetectedColorEvent = { color: 'none', timestamp: 0 }; // Reset color event on stop
        console.log("Engine stopped.");
    }

    /**
     * Handles recognized speech commands, filters them, and processes them.
     * This method now incorporates the last detected color event for late fusion.
     * @param {string} command - The raw command recognized by the speech module.
     */
    handleSpeechCommand(command) {
        const lowerCaseCommand = command.toLowerCase();
        const currentTime = Date.now(); // Get current time for fusion window check

        if (this.validSpeechCommands.includes(lowerCaseCommand)) {
            console.log(`✅ Fusion Engine received valid speech command: "${lowerCaseCommand}".`);
            
            // Check for a recent color detection within the fusion window
            const isColorRecent = (currentTime - this.lastDetectedColorEvent.timestamp <= this.FUSION_WINDOW_MS);
            const fusionColor = this.lastDetectedColorEvent.color;

            // --- LATE FUSION LOGIC ---
            if (lowerCaseCommand === 'background') {
                if (isColorRecent && fusionColor !== 'none' && fusionColor !== 'white') { 
                    console.log(`✨ LATE FUSION: Setting background to ${fusionColor} via speech command.`);
                    this.emitCommand('setBackgroundColor', fusionColor); // Emit a specific event for setting background
                    this.currentMode = 'background_set'; // Update internal mode
                    this.emitCommand('modeChange', this.currentMode); // Inform app about mode change
                    this.lastDetectedColorEvent = { color: 'none', timestamp: 0 }; // Consume the color event
                } else {
                    const reason = isColorRecent ? "color is white" : (fusionColor === 'none' ? "no color detected" : "color too old");
                    console.log(`⚠️ LATE FUSION: Command 'background' ignored because ${reason}.`);
                    this.emitCommand('warning', `Say 'background' within ${this.FUSION_WINDOW_MS / 1000}s of pointing at a color.`);
                    this.emitCommand('modeChange', 'idle'); // Ensure UI reflects idle if action not taken
                }
            } else if (lowerCaseCommand === 'paint') {
                // For 'paint' command, we'll store the intention and potentially the color
                this.currentMode = 'painting'; // Update mode immediately
                if (isColorRecent && fusionColor !== 'none' && fusionColor !== 'white') {
                    console.log(`✨ LATE FUSION: Entering painting mode with color ${fusionColor} via speech command.`);
                    this.emitCommand('startPainting', { color: fusionColor }); // Emit event with detected color
                    this.lastDetectedColorEvent = { color: 'none', timestamp: 0 }; // Consume the color event
                } else {
                    const reason = isColorRecent ? "color is white" : (fusionColor === 'none' ? "no color detected" : "color too old");
                    console.log(`💡 LATE FUSION: Entering painting mode. ${reason}, will use default or wait for color.`);
                    this.emitCommand('startPainting', { color: 'default' }); // Emit event to start painting with default color
                }
                this.emitCommand('modeChange', 'painting'); // Update mode display for app
            }
            // --- END LATE FUSION LOGIC ---

            // Other non-fused speech commands (always processed)
            else if (this.lineWidthMap.hasOwnProperty(lowerCaseCommand)) {
                this.currentLineWidth = this.lineWidthMap[lowerCaseCommand];
                this.emitCommand('lineWidthChange', this.currentLineWidth);
            } else if (lowerCaseCommand === 'stop') {
                this.currentMode = 'idle';
                this.emitCommand('modeChange', 'idle');
                this.emitCommand('setBackgroundColor', 'none'); // Reset background
            }
        } else {
            console.log(`❌ Fusion Engine ignored invalid speech command: "${lowerCaseCommand}"`);
        }
    }

    /**
     * Starts a loop to continuously detect colors from the video feed.
     */
    startColorDetectionLoop() {
        if (!this.videoElement) {
            console.error("Cannot start color detection loop: video element is not set.");
            return;
        }
        if (this.colorDetectionInterval) {
            this.stopColorDetectionLoop(); // Clear any existing interval
        }

        // It's crucial that videoWidth/Height are available. If not, wait a bit and retry.
        if (this.videoElement.videoWidth === 0 || this.videoElement.videoHeight === 0) {
            console.warn("Video dimensions not ready for color detection. Retrying in 200ms.");
            setTimeout(() => this.startColorDetectionLoop(), 200);
            return;
        }

        const centerX = this.videoElement.videoWidth / 2;
        const centerY = this.videoElement.videoHeight / 2;

        this.colorDetectionInterval = setInterval(() => {
            const detected = this.colorModule.detectColor(this.videoElement, centerX, centerY);
            // This method now updates `lastDetectedColorEvent` with a timestamp
            this.updateDetectedColor(detected);
        }, 100); // Check for color every 100ms (10 times per second)
    }

    /**
     * Stops the color detection loop.
     */
    stopColorDetectionLoop() {
        if (this.colorDetectionInterval) {
            clearInterval(this.colorDetectionInterval);
            this.colorDetectionInterval = null;
            console.log("Color detection loop stopped.");
        }
    }

    /**
     * This method is called by the color detection loop to update the engine's internal detected color.
     * It also stores the timestamp of the detection.
     * @param {string} color - The name of the detected color.
     */
    updateDetectedColor(color) {
        // Only update and emit if the color has actually changed to avoid spamming events
        // OR if the color is 'none' and the last detected was a specific color (to clear it)
        if (color !== this.lastDetectedColorEvent.color) {
            this.lastDetectedColorEvent = { color: color, timestamp: Date.now() };
            console.log(`🌈 Internal last detected color updated to: ${color} at ${this.lastDetectedColorEvent.timestamp}`);
            // Always emit 'colorDetected' for UI display purposes, regardless of fusion logic
            this.emitCommand('colorDetected', color); 
        }
    }

    /**
     * Emits a processed command/event to the registered application callback.
     * @param {string} eventType - The type of event (e.g., 'modeChange', 'lineWidthChange', 'colorDetected', 'setBackgroundColor').
     * @param {*} data - The data associated with the event.
     */
    emitCommand(eventType, data) {
        if (this.onCommand) {
            this.onCommand({ type: eventType, data: data });
        }
    }

    // TODO: Add methods for handling gesture data (e.g., handleGestureData(x, y, gestureType))
    // TODO: Implement more complex fusion logic here (e.g., combining speech "paint" with gesture movement and detected color)
}
