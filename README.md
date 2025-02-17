# WuWaBuilds

A web application for Wuthering Waves players to create, customize, and share character builds through manual input, screenshot scanning, or direct image importing.

Live at: [wuwabuilds.moe](https://wuwabuilds.moe)

## Features

### Home Page
- Example build showcase
- Interactive tutorial system
  - Screenshot & Scan guide for manual creation
  - Import guide for direct build importing
- Mobile-responsive design

### Build Creation
Two comprehensive workflows for creating builds:

#### Screenshot & Scan
- Step-by-step guide for taking screenshots
- Region-based OCR processing
- Real-time scanning feedback
- Manual adjustment capabilities
- Export to shareable images

#### Direct Import
- Uses official Discord images
- Automated build recognition
- Preview and validation system
- Direct integration with build editor

### Build Editor
User-friendly, intuitive and aesthetic interface for creating and customizing character builds:

#### Character & Weapon
- Full character roster with element variants
- Weapon selection with type filtering
- Level and refinement adjustments
- Auto-validation of objects to maintain integrity
- Custom portrait upload support

#### Echo System
- Five configurable echo panels
- Main/substat management with CV calculation
- Element set tracking and phantom support
- Drag-and-drop organization with presets
- Cost validation and set bonuses

#### Talent System
- Visual skill tree with node tracking
- Branch-specific animations and effects
- Quick actions (max/reset)
- Node stat contribution tracking

#### Real-Time Calculations
- Automatic CV and set bonus tracking
- Dynamic stat totals from all sources
- Cost validation for echoes and nodes
- Element bonus calculations
- Sequence effect tracking

#### Build Tools
- Screenshot OCR integration
- Direct build importing
- Local storage with compression
- Elegant image exports
- Build state migration
- Username watermark customization

### Build Management
- Build save/load functionality
- Search and sort capabilities
- Backup/restore system
- Build preview cards

### Build Display
- Interactive build showcase system
- Detailed stat breakdowns
- Move damage calculations
- Sequence effect support
- Weapon variant comparisons
- Share and export options

### Leaderboard System
- Real-time damage rankings
- Character-specific leaderboards
- Multiple weapon variant support
- Advanced sorting options:
  - Damage output
  - Crit values
  - Character-specific stats
- Build comparison tools
- Sequence effect tracking
- Pagination support

## Technical Stack
- React/TypeScript frontend
- Custom hooks and context providers
- Local storage with data migration
- OCR integration using [ocr.wuwabuilds.moe](https://ocr.wuwabuilds.moe)

## Environment
```env
NEXT_PUBLIC_API_URL= # OCR API endpoint (defaults to https://ocr.wuwabuilds.moe)
```

## Credits
All game assets are property of Kuro Games. WuWaBuilds is a fan-made tool and is not affiliated with Kuro Games or Tencent.

## Contact
Discord: Dommynation