# WuWaBuilds

A Reactive web application for creating and sharing builds for Wuthering Waves. Features both manual build creation and automatic scanning of in-game screenshots using OCR technology.

Live at: [wuwabuilds.moe](https://wuwabuilds.moe)

## Core Features

### Character Builder
![Character Selection Modal](https://github.com/user-attachments/assets/379fe736-6cfe-4c45-8455-ba6f953e7d37)
- Intuitive character selection through modal interface
- Special character support (e.g., Rover with Havoc/Spectro switching)
- Advanced level progression with diamond indicators
- Comprehensive Forte (talent tree) system
- Weapon selection filtered by character type
- Dual-slider system for level (1-90) and rank (1-5) management
- Automatic stat calculations with weapon scaling
- Forte node system with visual stat tracking

### Echo System
![Echo Management](https://github.com/user-attachments/assets/3370a048-654c-44e9-b393-d95c1d64729e)
- Drag-and-drop echo management for easy reorganization
- Comprehensive stat system with main stat and substat optimization
- Element set bonuses with visual indicators
- Roll quality tracking system
- Save/load functionality for echo configurations

### Build Card Generation
![Build-Card](https://github.com/user-attachments/assets/d7be742d-3929-4e08-bcb0-1c4f291ddc26)
- Professional build card generation
- Real-time Updates
- Interactive stat highlighting system
- Custom character image support
- Watermark customization
- Image export functionality

## OCR Integration

### Multi-Format Input
![OCR Processing](https://github.com/user-attachments/assets/ca014f8c-e69e-4d6e-bed7-836f0f33a319)
- Drag-and-drop upload functionality
- Direct clipboard paste support
- Traditional file selection
- Real-time processing status updates

### Intelligent Processing
![Queue](https://github.com/user-attachments/assets/18a4caa1-9f28-4eb2-a2cb-a0550796ba24)
- Smart queue system prioritizing character data
- Batch processing capabilities
- Gender and element detection
- Advanced stat recognition and normalization
- Comprehensive error handling

### Technical Features
![Console Output](https://github.com/user-attachments/assets/389ba719-0154-4b43-ba74-24927be80984)
- Detailed console logging for debugging
- Rate limiting protection
- Error recovery systems
- Full mobile responsiveness
- Local storage for build persistence

## Development

### Environment Variables
```env
REACT_APP_API_URL= # OCR API endpoint, can use mine that reads echoes specifically at https://ocr.wuwabuilds.moe
```
## Architecture

The application is built with a component-based architecture using React and TypeScript. Key architectural features include:

- Context-based state management for OCR and build data
- Custom hooks for reusable business logic
- Real-time stat calculation engine
- Modular component system for extensibility

## Technical Stack
- React with TypeScript
- Custom hooks for state management
- @dnd-kit for drag-and-drop functionality
- Tesseract.js for local OCR preprocessing
- Backend OCR service ([API Documentation](https://ocr.wuwabuilds.moe))

## Additional Information

### UI/UX Features
- Collapsible sections for better organization
- Real-time stat updates and calculations
- Mobile-responsive design with warning system
- Comprehensive error handling and user feedback
- Local storage for build persistence

### Build Management
- Local storage for recent builds
- Build image generation and export
- Custom character image support
- Watermark customization options
- Stat highlight system for easy comparison

## Credits
All game images and assets are the property of Kuro Games. This is a fan-made tool and is not affiliated with or endorsed by Kuro Games or Tencent.