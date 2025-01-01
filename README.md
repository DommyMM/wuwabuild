# WuWaBuilds

A build sharing tool for Wuthering Waves featuring manual build creation and OCR-based screenshot scanning.

Live at: [wuwabuilds.moe](https://wuwabuilds.moe)

## Overview

WuWaBuilds is a web application designed to help Wuthering Waves players create, customize, and share character builds. It features both manual build creation and automatic scanning of in-game screenshots using OCR technology.

## Core Features

### Build Creation

#### Character Customization
- Comprehensive character selection with special support for variant characters
- Advanced level progression with diamond indicators
- Weapon selection filtered by character compatibility
- Dual-slider system for weapon level (1-90) and rank (1-5)
- Real-time stat calculations with weapon scaling

#### Forte System
- Complete talent tree management
- Visual node activation tracking
- Skill level management
- Automatic stat bonus calculations

#### Echo Management
- Drag-and-drop interface for echo organization
- Main stat and substat optimization
- Roll quality tracking
- Set bonus visualization
- Save/load system for echo configurations
- Cost limit validation

### OCR Integration

#### Input Methods
- Drag-and-drop file upload
- Direct clipboard paste support
- Traditional file selection
- Real-time processing feedback

#### Processing Features
- Smart queue system prioritizing character data
- Batch processing capability
- Advanced stat recognition and normalization
- Element and gender detection
- Comprehensive error handling

### Build Sharing

#### Build Card Generation
- Professional layout matching game aesthetic
- Interactive stat highlighting
- Custom character image support
- Watermark customization
- High-quality image export

## Technical Details
### Environment Setup
```env
REACT_APP_API_URL= # OCR API endpoint (optional, can use https://ocr.wuwabuilds.moe)
```

### Development Stack

#### Frontend
- React with TypeScript
- Custom hooks for state management
- @dnd-kit for drag-and-drop functionality
- Tesseract.js for local OCR preprocessing

#### [Backend](https://github.com/DommyMM/wuwa-ocr-api)
- Python FastAPI server
- Custom OCR processing pipeline
- Rate limiting and error recovery
- [API Documentation](https://ocr.wuwabuilds.moe)

### Key Features

#### User Experience
- Mobile-responsive design with warning system
- Collapsible sections for better organization
- Comprehensive error handling
- Local storage for build persistence
- Real-time stat updates

#### Build Management
- Build data persistence
- Custom image support
- Watermark options
- Interactive stat highlighting

### Upcoming Features
- User authentication
- Build sharing and importing
- Build version tracking
- Enhanced mobile support
- Additional social features

## Usage Guidelines
- Use high-quality, full-screen screenshots for best OCR results
- Recommended browser: Chrome or Firefox for optimal performance
- Mobile users: Use landscape orientation for better experience

## Credits
All game assets, images, and related content are the property of Kuro Games. WuWaBuilds is a fan-made tool and is not affiliated with or endorsed by Kuro Games or Tencent.

## Contact
For bug reports and feature requests, please use the GitHub issues system.
For other inquiries, reach out on Discord: Dommynation