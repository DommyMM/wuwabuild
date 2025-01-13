# WuWaBuilds

A comprehensive build management tool for Wuthering Waves featuring manual build creation, OCR-based scanning, and build sharing capabilities.

Live at: [wuwabuilds.moe](https://wuwabuilds.moe)

## Overview

WuWaBuilds is a web application designed to help Wuthering Waves players create, customize, save, and share character builds. It offers manual build creation, automatic scanning of in-game screenshots using OCR technology, and a full build management system.

## Core Features

### Pages and Navigation

#### Home Page
- Quick overview and getting started guide
- Screenshot scanning instructions
- Mobile device compatibility notices
- Example build showcases

#### Build Editor
- Complete build creation and customization
- OCR scanning integration
- Real-time stat calculations
- Build preview and export system

#### Builds Page
- Saved build management
- Expandable build previews with detailed stats
- Search and sort functionality
- Build backup and restore system

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
- Roll quality tracking and validation
- Set bonus calculation and visualization
- Echo save/load system with presets
- Cost limit and set bonus tracking

### Build Management

#### Save System
- Local storage for build persistence
- Build naming and organization
- JSON backup/restore functionality
- Advanced search and sort options

#### Build Preview
- Expandable build cards with detailed information
- Interactive stat tooltips and calculations
- Echo details with hover tooltips
- Set bonus and CV score tracking
- Dynamic stat highlighting system

#### Build Export
- High-quality PNG image generation
- Customizable watermark and credits
- JSON data export/import
- Mobile-optimized preview system

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

### User Interface

#### Navigation
- Responsive header with page navigation
- Mobile-aware layout adjustments
- Smooth transitions between pages
- Collapsible sections

#### Build Cards
- Compact and expanded view modes
- Interactive stat highlighting
- Dynamic Echo previews
- Real-time set bonus tracking

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
- Recharts for data visualization
- React Router for navigation
- Responsive design with mobile support

#### Backend
- Python FastAPI server
- Custom OCR processing pipeline
- Rate limiting and error recovery
- OpenCV for image processing
- [API Documentation](https://ocr.wuwabuilds.moe)

### Key Features

#### User Experience
- Mobile-responsive design with warning system
- Collapsible sections for organization
- Comprehensive error handling
- Persistent local storage
- Real-time calculations and updates

#### Build Management
- Build data persistence
- Custom image support
- Watermark customization
- Interactive highlighting system

### Upcoming Features
- User authentication system
- Online build sharing platform
- Enhanced mobile experience
- Community features
- Build comparison tools

## Usage Guidelines
- Use high-quality, full-screen screenshots for best OCR results
- Recommended browser: Chrome or Firefox for optimal performance
- Mobile users: Use landscape orientation for better experience
- Enable clipboard permissions for paste functionality

## Credits
All game assets, images, and related content are the property of Kuro Games. WuWaBuilds is a fan-made tool and is not affiliated with or endorsed by Kuro Games or Tencent.

## Contact
For bug reports and feature requests, please use the GitHub issues system.
For other inquiries, reach out on Discord: Dommynation