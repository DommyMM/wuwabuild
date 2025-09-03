# WuWaBuilds - Technical Documentation

## Project Overview
WuWaBuilds is a sophisticated web application for Wuthering Waves players to create, customize, and share character builds. The application provides multiple workflows for build creation including manual configuration, OCR screenshot scanning, and direct image importing from Discord bot formats.

**Production URL**: [wuwabuilds.moe](https://wuwabuilds.moe)

## Technology Stack

### Core Framework
- **Next.js 15.1.7** with App Router architecture
- **React 19.0.0** with TypeScript
- **TypeScript 5** for type safety

### UI Libraries
- **MUI (Material-UI) 6.4.4** for component library
- **Emotion** for CSS-in-JS styling
- **Lucide React** for icons
- **React Toastify** for notifications

### Data Visualization & Interactions
- **Recharts 2.15.1** for damage calculation graphs
- **DND Kit** for drag-and-drop echo panel reordering
- **React Fast Marquee** for typewriter effects

### Image Processing
- **Tesseract.js 6.0.0** for OCR screenshot scanning
- **dom-to-image 2.6.0** for build card export generation

### Search & Filtering
- **Fuse.js 7.1.0** for fuzzy search functionality

### Analytics & Monitoring
- **Vercel Analytics** for performance tracking
- **Vercel Speed Insights** for Core Web Vitals
- **PostHog** for user behavior analytics
- **ReactGA4** for Google Analytics integration

## Project Structure

```
WuwaBuild/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── (routes)/             # Route group for main pages
│   │   │   ├── builds/           # Global builds browser
│   │   │   ├── edit/             # Build editor page
│   │   │   ├── import/           # Discord image import
│   │   │   ├── saves/            # Saved builds management
│   │   │   ├── leaderboards/     # Character leaderboards
│   │   │   ├── profiles/         # User profiles
│   │   │   └── calcs/            # Damage calculations
│   │   ├── page.tsx              # Home page
│   │   └── layout.tsx            # Root layout
│   ├── components/               # React components
│   │   ├── Build/                # Build browser components
│   │   ├── Card/                 # Build card display components
│   │   ├── Edit/                 # Editor page components
│   │   ├── Home/                 # Homepage components
│   │   ├── Import/               # Import system components
│   │   ├── LB/                   # Leaderboard components
│   │   ├── Profiles/             # Profile page components
│   │   └── Save/                 # Save management components
│   ├── hooks/                    # Custom React hooks
│   ├── types/                    # TypeScript type definitions
│   └── lib/                      # Utility libraries
└── public/                       # Static assets

```

## Key Features & Implementation Details

### 1. Build Editor (`/edit`)
The core build creation interface with comprehensive character customization:

#### Character Management
- **Rover Special Handling**: Detects and manages Rover's gender and element variants
- **Level System**: 1-90 with stat scaling based on level curves
- **Sequence System**: 0-6 constellation levels affecting abilities

#### Echo System
- **5 Echo Panels** with drag-and-drop reordering via DND Kit
- **Cost Validation**: Enforces 12-cost limit with warnings
- **CV Calculation**: Real-time critical value calculations
- **Set Bonuses**: Tracks 2-piece and 5-piece element set effects
- **Phantom Echoes**: Special echo type toggle for specialized builds
- **Preset System**: Save/load echo configurations

#### Forte/Talent Tree
- **Interactive Skill Tree**: Visual node activation system
- **Branch Types**: Normal Attack, Resonance Skill, Forte Circuit, Liberation, Intro Skill
- **Level Scaling**: 1-10 levels per node with stat contributions
- **Batch Operations**: "Max All" and reset functionality

#### Stats Dashboard
- **Real-time Calculations**: Dynamic stat updates from all sources
- **Derived Stats**: CV, damage bonuses, element-specific modifiers
- **Quality Indicators**: Visual feedback for substat quality

### 2. OCR Screenshot Scanner
Advanced image processing for automatic build extraction:

#### Region Detection
- **Intelligent Segmentation**: Divides screenshots into specific regions
- **Parallel Processing**: Concurrent OCR on multiple regions
- **Character Recognition**: Special logic for Rover variant detection

#### Data Extraction
- **Main Stats**: Accurate parsing of primary echo stats
- **Substats**: Multi-line substat recognition with values
- **Weapon Details**: Name, level, and refinement extraction
- **Forte Levels**: Skill tree node level detection

### 3. Discord Image Import (`/import`)
Streamlined import from standardized Discord bot images:

#### Input Methods
- File upload via input element
- Drag-and-drop onto drop zone
- Clipboard paste (Ctrl+V)
- URL import from Discord CDN

#### Processing Pipeline
1. Image validation and format checking
2. Region segmentation for targeted OCR
3. Parallel OCR processing with progress tracking
4. Data mapping to application format
5. Preview and confirmation before import

### 4. Build Card Generation
Canvas-based image export system:

#### Visual Elements
- **Element-Themed Styling**: Dynamic colors based on character element
- **Character Portrait**: High-quality character images
- **Weapon Display**: Icon, name, level, and refinement
- **Echo Panels**: Visual representation with set indicators
- **Stats Grid**: Comprehensive stat breakdown
- **Forte Tree**: Visual skill tree representation

#### Export Options
- Custom username/UID watermark
- Quality settings for file size optimization
- Direct image download or clipboard copy

### 5. Global Builds Browser (`/builds`)
Community build database with advanced filtering:

#### Filtering System
- Character selection with element variants
- Weapon type filtering (Sword, Pistols, Rectifier, etc.)
- Echo set filtering (multiple sets)
- Main stat filtering (ATK%, Crit Rate, etc.)
- Region filtering (America, Europe, Asia, SEA, HMT)
- Username/UID search

#### Normalization
- All builds standardized to level 90
- Fair comparison metrics (CV, CR, CD, ATK)
- Expandable entries for detailed analysis

### 6. Character Leaderboards (`/leaderboards`)
Damage-focused build rankings:

#### Damage Calculations
- Weapon-specific damage formulas
- Sequence level impact analysis
- Visual damage comparison graphs via Recharts
- Rotation optimization suggestions

### 7. Data Management

#### LocalStorage Architecture
- **Compression Algorithm**: Custom property name mapping
- **Version Migration**: Backward compatibility for data updates
- **Auto-save**: Periodic save with recovery prompts
- **Backup/Restore**: JSON export/import functionality

#### State Management
- React Context providers for global state
- Component-level state for UI interactions
- Memoization for expensive calculations
- Optimistic updates for responsive UI

## Development Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd WuwaBuild

# Install dependencies
npm install

# Run development server
npm run dev
```

### Environment Variables
Create a `.env.local` file:
```env
# OCR API endpoint (defaults to http://localhost:5000 in development)
NEXT_PUBLIC_API_URL=https://ocr.wuwabuilds.moe
```

### Available Scripts
- `npm run dev` - Start development server on localhost:3000
- `npm run build` - Create production build
- `npm run start` - Run production server
- `npm run lint` - Run ESLint checks

### Testing
Currently, no test suite is configured. Consider adding:
- Jest for unit testing
- React Testing Library for component testing
- Playwright/Cypress for E2E testing

## Performance Optimizations

### Component Optimization
- React.memo for expensive stat calculations
- useMemo/useCallback for derived values
- Lazy loading for route components
- Image optimization with Next.js Image

### Data Caching
- Game data cached in memory
- Build calculations cached per session
- OCR results cached temporarily
- API responses cached with SWR patterns

### Bundle Optimization
- Dynamic imports for heavy libraries (Tesseract.js)
- Tree shaking for unused code
- Code splitting per route
- Asset optimization via Next.js

## Performance Metrics

### Target Metrics
- **First Contentful Paint (FCP)**: < 1.8s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Time to Interactive (TTI)**: < 3.8s
- **Cumulative Layout Shift (CLS)**: < 0.1
- **First Input Delay (FID)**: < 100ms

### Bundle Size Guidelines
- **Initial JS Bundle**: Target < 200KB (gzipped)
- **Per-Route Chunks**: Target < 100KB each
- **Image Assets**: Optimized with WebP format where supported
- **Critical CSS**: Inlined for above-the-fold content

### Optimization Techniques Applied
- **React Component Lazy Loading**: Routes loaded on demand
- **Image Optimization**: Next.js Image component with lazy loading
- **Font Optimization**: System fonts with fallbacks
- **State Management**: Minimized re-renders with proper memoization
- **API Response Caching**: Temporary cache for OCR results

## API Integration

### OCR API
- **Base URL**: Configurable via `NEXT_PUBLIC_API_URL`
- **Production**: https://ocr.wuwabuilds.moe
- **Development Default**: http://localhost:5000
- **Endpoint**: `/api/ocr`

#### Request Format
```typescript
POST /api/ocr
Content-Type: application/json

{
  image: string,  // Base64 encoded image
  type: string    // Region type for OCR processing
}
```

#### Response Format
```typescript
{
  success: boolean,
  text?: string,
  confidence?: number,
  error?: string
}
```

#### Region Types
- `character` - Character name and level
- `weapon` - Weapon details
- `echo` - Echo panel information
- `stats` - Stats panel
- `forte` - Forte/talent levels

### Image CDN
- **Wuthering Waves Assets**: https://files.wuthery.com/p/GameData/UIResources/Common/
- Configured in `next.config.ts` for Next.js Image optimization

## Browser Compatibility
- Chrome 90+ (recommended)
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (responsive design)

## Security Considerations
- Client-side only data storage (no sensitive data)
- CORS-enabled API endpoints
- Input validation for user-generated content
- XSS prevention via React's built-in escaping

## Deployment

### Vercel Deployment (Recommended)
1. Push code to GitHub repository
2. Import project in Vercel dashboard
3. Configure environment variables:
   - `NEXT_PUBLIC_API_URL`: Your OCR API endpoint
4. Deploy with automatic CI/CD

### Manual Deployment
```bash
# Build for production
npm run build

# Start production server
npm run start
```

### PostHog Analytics Setup
The application includes PostHog integration for analytics. Configure in `src/lib/posthog.ts`:
- Proxy rewrites configured in `next.config.ts` for privacy
- Events tracked: page views, build creation, OCR usage

## Troubleshooting

### Common Issues

#### OCR Not Working
- **Issue**: Screenshot scanning fails or returns errors
- **Solution**: 
  - Verify `NEXT_PUBLIC_API_URL` is set correctly
  - Check if OCR API is accessible
  - Ensure image is in correct format (PNG/JPG)
  - Verify screenshot regions match expected layout

#### Build Card Export Fails
- **Issue**: Cannot download or generate build card image
- **Solution**:
  - Check browser console for CORS errors
  - Verify all image assets are loading correctly
  - Try different browser if canvas issues persist

#### Echo Drag-and-Drop Not Working
- **Issue**: Cannot reorder echo panels
- **Solution**:
  - Ensure JavaScript is enabled
  - Check for conflicting CSS that might block pointer events
  - Verify DND Kit dependencies are installed

#### LocalStorage Data Loss
- **Issue**: Saved builds disappear
- **Solution**:
  - Check browser storage quota
  - Use backup/restore feature regularly
  - Verify browser allows localStorage

#### Image Import from Discord Fails
- **Issue**: Cannot import Discord bot images
- **Solution**:
  - Ensure image URL is accessible (not expired)
  - Check if image format matches expected Discord bot output
  - Try downloading and uploading directly

### Performance Issues

#### Slow Initial Load
- Check bundle size with `npm run build`
- Implement code splitting for large components
- Optimize images with Next.js Image component

#### Lag in Build Editor
- Reduce unnecessary re-renders with React.memo
- Check for expensive calculations in render loop
- Use production build for testing performance

## Contributing Guidelines
- TypeScript required for new components
- Follow existing code style patterns
- Component-based architecture
- Comprehensive prop typing
- Mobile-first responsive design
- Run `npm run lint` before committing

## Future Enhancements
- Server-side build storage with database
- Team composition tools for multi-character setups
- Advanced damage simulation with rotation optimization
- Public API for third-party integrations
- Build sharing via unique URLs
- Automated testing suite
- i18n support for multiple languages
- Dark/light theme toggle
- Build comparison tools
- Meta build recommendations

## License
All Wuthering Waves game assets are property of Kuro Games. WuWaBuilds is a fan-made tool and is not affiliated with Kuro Games or Tencent.

## Support
For issues, feature requests, or contributions, please visit the project repository.