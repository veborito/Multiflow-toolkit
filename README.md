# MultiFlow-DemoPoject

## Project Overview
MultiFlow is an interactive toolkit that combines voice, gesture, and color input modalities into a seamless user experience. It provides a modular and extensible architecture to build multimodal applications.


## Architecture
The project follows a Modular Monolith architecture with a Package-by-Feature organization. It consists of two main parts:

# multiflow-toolkit/- 
The core library that implements the multimodal input handling and fusion logic.
# apps/ - 
Demonstration applications that showcase the capabilities of the toolkit.
The overall architecture incorporates various design patterns to ensure a maintainable and extensible codebase.



┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  index.html  │  styles.css  │           script.js                          │
│   (DOM)      │  (Styles)    │    ┌─────────────────────────────────────┐   │
│              │              │    │  Canvas Rendering Engine           │   │
│              │              │    │  • drawLine()                       │   │
│              │              │    │  • setBackground()                  │   │
│              │              │    │  • clearCanvas()                    │   │
│              │              │    │  • Event Listeners                  │   │
│              │              │    └─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                            │ ▲
                                            │ │ Events & Commands
                                            ▼ │
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ORCHESTRATION LAYER                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                        MultiflowFusionEngine                               │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  State Manager  │  │  Event Router   │  │    Late Fusion Logic        │  │
│  │                 │  │                 │  │                             │  │
│  │ • idle          │  │ • Speech Events │  │ • Temporal Window (3s)      │  │
│  │ • painting      │  │ • Gesture Data  │  │ • Speech + Color Fusion     │  │
│  │ • paused        │  │ • Color Updates │  │ • Command Interpretation    │  │
│  │ • background_set│  │ • UI Commands   │  │ • Context Awareness         │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
        ▲                           ▲                           ▲
        │                           │                           │
        │ handleSpeechCommand()     │ handleGestureData()       │ updateDetectedColor()
        │                           │                           │
┌───────────────┐         ┌─────────────────┐         ┌─────────────────────┐
│               │         │                 │         │                     │
│  VoiceModule  │         │  GestureModule  │         │ ColorDetectionModule│
│               │         │                 │         │                     │
├───────────────┤         ├─────────────────┤         ├─────────────────────┤
│• Web Speech   │         │• MediaPipe      │         │• Canvas 2D Context  │
│  API          │         │  Hands          │         │• RGB Sampling       │
│• Continuous   │         │• EMA Smoothing  │         │• Color Mapping      │
│  Recognition  │         │• Coordinate     │         │• Real-time Update   │
│• Commands:    │         │  Tracking       │         │• Center Point       │
│  - "paint"    │         │• Movement       │         │  Detection          │
│  - "background│         │  Detection      │         │                     │
│  - "stop"     │         │• Gesture Params │         │                     │
│  - "clear"    │         │  Configuration  │         │                
