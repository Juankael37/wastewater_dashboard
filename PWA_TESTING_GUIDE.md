# PWA Testing Guide for Wastewater Monitoring System

## Overview
This guide provides comprehensive testing procedures for the Progressive Web App (PWA) features of the Wastewater Monitoring System. The PWA enables mobile-optimized, offline-capable operation with camera integration.

## Prerequisites

1. **Development Environment**:
   - Node.js 18+ installed
   - Modern web browser (Chrome, Edge, Firefox, Safari)
   - Mobile device or emulator for testing

2. **Browser Developer Tools**:
   - Chrome DevTools (F12)
   - Lighthouse for PWA audits
   - Application tab for service worker inspection

## Step 1: Build and Serve the PWA

### Development Mode
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (if not already installed)
npm install

# Start development server
npm run dev

# App will be available at: http://localhost:5173
```

### Production Build
```bash
# Create production build
npm run build

# Preview production build
npm run preview

# App will be available at: http://localhost:4173
```

## Step 2: PWA Installation Testing

### Desktop Browsers
1. Open Chrome/Edge and navigate to `http://localhost:5173`
2. Look for the install icon in the address bar (📥)
3. Click "Install" and verify:
   - App installs successfully
   - Creates desktop shortcut
   - Opens in standalone window
   - Has correct app icon and name

### Mobile Devices
1. Open Chrome/Safari on mobile device
2. Navigate to your deployed URL or local network IP
3. Look for "Add to Home Screen" option
4. Verify installation:
   - App icon appears on home screen
   - Opens in full-screen mode (no browser UI)
   - Orientation locked to portrait

## Step 3: Service Worker Testing

### Verify Service Worker Registration
1. Open Chrome DevTools (F12)
2. Go to **Application** → **Service Workers**
3. Verify service worker is registered and active
4. Check "Update on reload" for development

### Offline Testing
1. In DevTools, go to **Application** → **Service Workers**
2. Check "Offline" checkbox
3. Refresh the page
4. Verify:
   - App loads from cache
   - Shows offline indicator
   - Core functionality works
5. Uncheck "Offline" and refresh to restore connection

### Cache Inspection
1. In DevTools, go to **Application** → **Cache** → **Cache Storage**
2. Verify caches are populated:
   - `workbox-precache-v2-...`: Static assets
   - Custom caches for API responses
3. Check cache sizes and contents

## Step 4: Manifest Validation

### Lighthouse Audit
1. In Chrome DevTools, go to **Lighthouse**
2. Select "PWA" category
3. Run audit and verify:
   - ✅ Installs without errors
   - ✅ Responds with 200 when offline
   - ✅ Fast and reliable
   - ✅ Configured for custom splash screen
   - ✅ Sets a theme color for the address bar
   - ✅ Content is sized correctly for viewport

### Manifest Properties Check
Verify `public/manifest.json` includes:
- ✅ `name` and `short_name`
- ✅ `start_url` and `scope`
- ✅ `display: standalone` or `minimal-ui`
- ✅ Appropriate icons (multiple sizes)
- ✅ `theme_color` and `background_color`
- ✅ `orientation: portrait`

## Step 5: Mobile-Specific Testing

### Responsive Design
1. Use Chrome DevTools device toolbar
2. Test common mobile breakpoints:
   - iPhone SE (375x667)
   - iPhone 12/13 (390x844)
   - Samsung Galaxy S20 (360x800)
   - iPad (768x1024)
3. Verify:
   - No horizontal scrolling
   - Touch targets ≥ 44px
   - Font sizes readable
   - Forms usable on mobile

### Touch Interactions
1. Test on actual mobile device or emulator:
   - Button taps
   - Form input
   - Swipe gestures (if implemented)
   - Long press actions
2. Verify no 300ms click delay

### Mobile Performance
1. Use Chrome DevTools **Performance** tab
2. Simulate mobile CPU throttling (4x slowdown)
3. Measure:
   - First Contentful Paint (< 3s)
   - Time to Interactive (< 5s)
   - Input delay (< 100ms)

## Step 6: Offline Capabilities Testing

### IndexedDB Operations
1. Verify Dexie.js database setup:
   ```javascript
   // In browser console
   import('../../src/services/offline/database.ts').then(module => {
     console.log('Database schema:', module.db.schema);
   });
   ```
2. Test offline data storage:
   - Submit form while offline
   - Check data saved to IndexedDB
   - Verify sync queue populated
   - Go online and check auto-sync

### Background Sync
1. Submit data while offline
2. Go online
3. Verify:
   - Service worker triggers sync
   - Data sent to server
   - Success/failure notifications
   - Sync status updates in UI

### Network Detection
1. Test `OfflineContext` functionality:
   - Toggle network on/off
   - Verify UI updates (offline indicator)
   - Check offline mode warnings
   - Test manual sync trigger

## Step 7: Camera Integration Testing

### Camera Access
1. On mobile device, tap camera button
2. Grant camera permissions when prompted
3. Verify:
   - Camera preview displays
   - Can capture photo
   - Image preview shows
   - Can retake/remove photo

### Image Processing
1. Capture test images for each parameter
2. Verify:
   - Images stored locally (IndexedDB)
   - Upload to Supabase Storage when online
   - Image metadata preserved (parameter, timestamp)
   - Image display in reports

### Fallback Behavior
1. Test without camera permissions
2. Verify:
   - Graceful fallback to file upload
   - Clear error messages
   - Alternative input methods available

## Step 8: App Lifecycle Testing

### App Launch
1. Close all browser instances
2. Launch from installed app icon
3. Verify:
   - Opens in standalone window
   - Loads latest version
   - Restores previous state if applicable

### Background/Resume
1. Switch to another app
2. Return to wastewater app
3. Verify:
   - App resumes quickly
   - State preserved
   - Network reconnection handled

### Update Flow
1. Deploy new version
2. Open installed app
3. Verify:
   - Service worker updates in background
   - User notified of update
   - Can refresh to get new version

## Step 9: Security Testing

### HTTPS Requirement
1. Verify production deployment uses HTTPS
2. Test mixed content warnings
3. Check security headers

### Permission Management
1. Test camera permission flow
2. Verify permission revocation handling
3. Check graceful degradation

### Data Protection
1. Verify sensitive data encrypted in IndexedDB
2. Test clear data on logout
3. Check secure storage of credentials

## Step 10: Cross-Browser Testing

### Browser Compatibility
Test on:
- **Chrome** (Android, Windows, macOS)
- **Safari** (iOS, macOS)
- **Firefox** (Android, Windows, macOS)
- **Edge** (Windows, Android)

### Specific Checks
1. **Safari iOS**:
   - Service worker support
   - Add to Home Screen
   - Camera API compatibility
   - Push notifications (if implemented)

2. **Firefox Mobile**:
   - PWA installation
   - Camera access
   - IndexedDB performance

## Step 11: Performance Testing

### Web Vitals
Measure using Chrome DevTools or web-vitals library:
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

### Bundle Size Analysis
```bash
# Analyze bundle size
npm run build
# Check dist folder for bundle sizes
```

Targets:
- Total bundle size: < 500KB gzipped
- Critical path: < 100KB
- Code splitting implemented

### Memory Usage
1. Monitor memory in DevTools **Memory** tab
2. Test for memory leaks:
   - Navigate between pages
   - Open/close modals
   - Take multiple photos
3. Force garbage collection and check memory

## Step 12: Accessibility Testing

### Screen Readers
1. Test with NVDA (Windows) or VoiceOver (macOS/iOS)
2. Verify:
   - Logical reading order
   - Alt text for images
   - Form labels associated
   - ARIA attributes where needed

### Keyboard Navigation
1. Tab through all interactive elements
2. Verify:
   - Focus indicators visible
   - Logical tab order
   - All functionality accessible via keyboard

### Color Contrast
1. Use DevTools **Accessibility** checker
2. Verify contrast ratio ≥ 4.5:1 for normal text
3. Test with color blindness simulators

## Step 13: Real Device Testing

### Physical Devices
Test on actual devices if possible:
- iPhone (latest iOS)
- Android phone (latest)
- Tablet (iPad/Android)

### Network Conditions
Test under different network conditions:
- **WiFi**: Fast, reliable
- **4G/5G**: Mobile data
- **3G**: Slow connection
- **Offline**: No connection

### Battery Impact
Monitor battery usage during extended use:
- Background sync frequency
- Camera usage impact
- GPS usage (if implemented)

## Step 14: Automated Testing Setup

### PWA Audit Automation
```bash
# Install Lighthouse CI
npm install -g @lhci/cli

# Run audit
lhci autorun
```

### Service Worker Tests
Create tests for:
- Service worker registration
- Cache strategies
- Offline functionality
- Background sync

## Common Issues and Solutions

### Issue: PWA not installing
**Solution**: 
- Check HTTPS in production
- Verify manifest is served with correct MIME type
- Ensure service worker scope matches start_url

### Issue: Camera not working on iOS
**Solution**:
- Use `<input type="file" accept="image/*" capture="environment">`
- Request permissions appropriately
- Provide fallback

### Issue: Offline data not syncing
**Solution**:
- Check service worker registration
- Verify IndexedDB operations
- Test background sync events

### Issue: App updates not detected
**Solution**:
- Check service worker update strategy
- Implement update notification
- Force refresh if needed

## Success Criteria

The PWA is considered successfully tested when:

1. ✅ Installs on desktop and mobile
2. ✅ Works offline with core functionality
3. ✅ Camera integration functions on supported devices
4. ✅ Performance meets targets on 3G connection
5. ✅ Passes Lighthouse PWA audit (≥ 90)
6. ✅ Accessible via keyboard and screen readers
7. ✅ Cross-browser compatible
8. ✅ Memory usage stable during extended use

## Next Steps After Testing

1. **Deploy to production**: Cloudflare Pages or similar
2. **Monitor analytics**: Track installs and usage
3. **Collect feedback**: User testing with operators
4. **Iterate improvements**: Based on real-world usage