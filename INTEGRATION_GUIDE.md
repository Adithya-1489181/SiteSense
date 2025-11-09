# SiteSense Integration Guide

## Overview
This document describes how the frontend integrates with the backend modules to provide real-time website auditing.

## Architecture Flow

```
User (Browser)
    ↓
Frontend (Next.js on :3000)
    ↓ HTTP REST API
Backend API (Express on :3001)
    ↓ Orchestrates ↓
    ├── Crawler Module
    ├── Performance Module (Lighthouse)
    ├── UX Module (Axe-core)
    └── Security Module (OWASP ZAP)
```

## Data Flow

### 1. User Initiates Scan
**Frontend** (`apps/web/src/app/scanpage/page.tsx`)
```typescript
// User clicks "Start Scan"
handleStartScan() {
  fetch('http://localhost:3001/api/scan', {
    method: 'POST',
    body: JSON.stringify({ url })
  })
}
```

**Backend** (`apps/api/index.js`)
```javascript
app.post('/api/scan', async (req, res) => {
  // 1. Validate URL
  // 2. Create scan entry
  // 3. Return scanId immediately
  // 4. Start async scan process
})
```

### 2. Backend Orchestrates Modules

The API runs modules in sequence:

#### Step 1: Crawler (10% progress)
```javascript
const crawlerOutput = await crawlWebsite(url, 2);
// Output: { endpoints: [...], scan_id, timestamp }
// Saved to: modules/crawler/scan-{id}-results.json
```

#### Step 2: Performance & SEO (40% progress)
```javascript
const performanceResults = await runPerformanceAudit({
  endpoints: crawlerOutput.endpoints.slice(0, 10),
  outputFile: 'modules/performance/scan-{id}-results.json'
});
// Output: { summary, pageResults, issues: {performance, seo} }
```

#### Step 3: UX/Accessibility (70% progress)
```javascript
const uxResults = await runAxeAudit({
  endpoints: crawlerOutput.endpoints.slice(0, 10)
});
// Output: { results: [{ url, violations, accessibility_score }] }
// Saved to: modules/ux-audit/scan-{id}-results.json
```

#### Step 4: Security (90% progress)
```javascript
const securityResults = await runSecurityAudit({
  endpoints: crawlerOutput.endpoints.slice(0, 5),
  outputFile: 'modules/security/scan-{id}-results.json'
});
// Output: { summary, issues: {high, medium, low} }
```

### 3. Results Aggregation

The API combines all module results:

```javascript
const finalResults = {
  performance: {
    score: performanceScore,      // 0-100
    metrics: {...},               // FCP, LCP, TBT, CLS, SI
    issues: [...],                // Performance issues
    pageResults: [...]            // Per-page results
  },
  seo: {
    score: seoScore,              // 0-100
    issues: [...]                 // SEO issues
  },
  ux: {
    score: uxScore,               // 0-100 (calculated from violations)
    issues: [...],                // Accessibility violations
    recommendations: [...]        // Grouped recommendations
  },
  security: {
    score: securityScore,         // 0-100
    vulnerabilities: [...]        // Security issues
  },
  overall: overallScore,          // Average of all scores
  summary: {...}
};
```

### 4. Frontend Polling

**Frontend** polls for results every 3 seconds:

```typescript
const pollInterval = setInterval(async () => {
  const scanData = await fetch(`http://localhost:3001/api/scan/${scanId}`);
  
  if (scanData.status === 'success') {
    // Transform and display results
    clearInterval(pollInterval);
  }
}, 3000);
```

### 5. Result Display

**Frontend** (`apps/web/src/app/scans/[id]/page.tsx`)
- Transforms API results to UI format
- Generates issues list from module outputs
- Displays:
  - Overall score and module scores
  - Radar chart for module balance
  - Issue breakdown by severity
  - Detailed recommendations
  - Progress tracker

## Data Transformation

### Module Output → Frontend Format

#### Performance/SEO
```javascript
// API provides raw Lighthouse data
{
  performance: {
    score: 85,
    metrics: {
      firstContentfulPaint: 1200,    // milliseconds
      largestContentfulPaint: 2400,
      totalBlockingTime: 150,
      cumulativeLayoutShift: 0.05,
      speedIndex: 2000
    }
  }
}

// Frontend transforms to display format
{
  performance: {
    score: 85,
    metrics: {
      loadTime: "1.20s",
      firstContentfulPaint: "1.20s",
      timeToInteractive: "0.15s"
    }
  }
}
```

#### UX/Accessibility
```javascript
// API provides axe-core violations
{
  ux: {
    score: 78,
    issues: [
      {
        id: "color-contrast",
        impact: "serious",
        description: "Elements must have sufficient color contrast",
        helpUrl: "..."
      }
    ]
  }
}

// Frontend generates Issue objects
{
  title: "Elements must have sufficient color contrast",
  severity: "major",       // mapped from "serious"
  impact: 7,               // numeric scale
  effort: 5,               // estimated
  module: "UX",
  fixed: false
}
```

#### Security
```javascript
// API provides ZAP alerts
{
  security: {
    score: 88,
    vulnerabilities: [
      {
        title: "Missing Anti-clickjacking Header",
        severity: "medium",
        description: "...",
        affectedUrls: [...]
      }
    ]
  }
}

// Frontend generates Issue objects
{
  title: "Missing Anti-clickjacking Header",
  severity: "major",       // mapped from "medium"
  impact: 7,
  effort: 5,
  module: "Security",
  fixed: false
}
```

## File Storage

All scan results are persisted as JSON:

```
modules/
├── crawler/
│   └── scan-1-results.json
├── performance/
│   └── scan-1-results.json
├── ux-audit/
│   └── scan-1-results.json
└── security/
    └── scan-1-results.json
```

Each file contains the complete output from that module for the given scan.

## Error Handling

### Frontend
- Shows error state if scan fails
- Displays partial results if available
- Allows retry

### Backend
- Catches module failures individually
- Logs errors but continues with other modules
- Returns partial results with error flags
- Failed modules show score of 0

## Performance Optimizations

### Endpoint Limiting
To keep scan times reasonable:
- **Performance/UX**: Limited to 10 endpoints
- **Security**: Limited to 5 endpoints (slower scans)
- Adjustable in `apps/api/index.js`

### Batch Processing
- Performance module uses batch size of 3
- Security module uses batch size of 2
- Prevents resource exhaustion

### Asynchronous Execution
- Scan starts immediately, returns scanId
- Processing happens in background
- Frontend polls for updates
- Non-blocking for other users

## Testing

### 1. Start the API server
```bash
npm run start:api
```

### 2. Test API endpoints
```bash
node apps/api/test.js
```

### 3. Start the frontend
```bash
npm run dev:web
```

### 4. Full integration test
```bash
npm run dev
```

Then visit http://localhost:3000 and run a scan.

## Troubleshooting

### API not starting
- Check if port 3001 is already in use
- Verify all dependencies installed: `npm install`
- Check module paths in `apps/api/index.js`

### Modules not running
- Verify module dependencies installed in each module folder
- Check OWASP ZAP is running (for security scans)
- Review module-specific README files

### Frontend not connecting
- Verify API is running on port 3001
- Check CORS settings in `apps/api/index.js`
- Verify API URL in frontend code matches

### Results not saving
- Check write permissions in module folders
- Verify file paths in `apps/api/index.js`
- Check disk space

## Extending the System

### Adding a New Module

1. **Create module** in `modules/your-module/`
2. **Implement interface**:
   ```javascript
   export async function runYourAudit(input) {
     // input: { endpoints, outputFile }
     // returns: { score, issues, ... }
   }
   ```
3. **Update API** (`apps/api/index.js`):
   ```javascript
   const yourResults = await runYourAudit({
     endpoints: crawlerOutput.endpoints,
     outputFile: path.join(..., 'scan-{id}-results.json')
   });
   ```
4. **Update frontend** to display new results
5. **Add to documentation**

### Customizing Score Calculation

Edit `calculateOverallScore()` in `apps/api/index.js`:
```javascript
function calculateOverallScore(performance, seo, ux, security) {
  // Weighted average example:
  return Math.round(
    (performance * 0.3) +
    (seo * 0.2) +
    (ux * 0.3) +
    (security * 0.2)
  );
}
```

## Next Steps

- [ ] Add database for persistent storage
- [ ] Implement user authentication
- [ ] Add scheduled/recurring scans
- [ ] Add email notifications
- [ ] Add comparison between scans
- [ ] Add historical trends
- [ ] Add custom module configuration
- [ ] Add API rate limiting
