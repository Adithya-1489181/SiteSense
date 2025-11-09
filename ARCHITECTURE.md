# SiteSense Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER (Browser)                          │
│                    http://localhost:3000                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FRONTEND (Next.js App)                        │
│                     apps/web/src/app/                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │  page.tsx   │  │ scanpage/    │  │ scans/[id]/        │    │
│  │  (Home)     │  │ page.tsx     │  │ page.tsx           │    │
│  │             │  │ (Start Scan) │  │ (View Results)     │    │
│  └─────────────┘  └──────────────┘  └────────────────────┘    │
│         │                 │                    │                │
│         └─────────────────┼────────────────────┘                │
│                           │                                     │
│                           │ HTTP REST API                       │
│                           │ (fetch calls)                       │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              BACKEND API (Express Server)                       │
│              apps/api/index.js                                  │
│              http://localhost:3001                              │
├─────────────────────────────────────────────────────────────────┤
│  Endpoints:                                                     │
│    POST   /api/scan           - Start new scan                 │
│    GET    /api/scan/:id       - Get scan status                │
│    GET    /api/scans          - List all scans                 │
│    GET    /api/health         - Health check                   │
│                                                                 │
│  Orchestration Logic:                                           │
│    1. Receive URL from frontend                                │
│    2. Create scan entry (return scanId)                        │
│    3. Run modules in sequence (async)                          │
│    4. Aggregate results                                         │
│    5. Save to JSON files                                        │
│    6. Return results to frontend                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Orchestrates
                         │
         ┌───────────────┼───────────────┬────────────────┐
         │               │               │                │
         ▼               ▼               ▼                ▼
┌────────────────┐ ┌────────────┐ ┌──────────┐ ┌────────────────┐
│   CRAWLER      │ │PERFORMANCE │ │    UX    │ │   SECURITY     │
│                │ │            │ │          │ │                │
│ modules/       │ │ modules/   │ │ modules/ │ │ modules/       │
│ crawler/       │ │performance/│ │ ux-audit/│ │ security/      │
│                │ │            │ │          │ │                │
│ • BFS crawl    │ │• Lighthouse│ │• axe-core│ │• OWASP ZAP     │
│ • Discover     │ │• Core Web  │ │• WCAG    │ │• Vulnerability │
│   endpoints    │ │  Vitals    │ │  checks  │ │  scanning      │
│ • Filter       │ │• SEO audit │ │• A11y    │ │• XSS/SQLi      │
│   internal     │ │• Metrics   │ │  issues  │ │• SSL check     │
│                │ │            │ │          │ │                │
│ Output:        │ │ Output:    │ │ Output:  │ │ Output:        │
│ endpoints[]    │ │ scores,    │ │ scores,  │ │ scores,        │
│                │ │ issues,    │ │ violations│ │ alerts,        │
│                │ │ metrics    │ │          │ │ risks          │
└────────┬───────┘ └─────┬──────┘ └────┬─────┘ └────────┬───────┘
         │               │              │                │
         │               │              │                │
         └───────────────┴──────────────┴────────────────┘
                         │
                         │ Save Results
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FILE SYSTEM (JSON)                           │
├─────────────────────────────────────────────────────────────────┤
│  modules/crawler/scan-{id}-results.json                         │
│  modules/performance/scan-{id}-results.json                     │
│  modules/ux-audit/scan-{id}-results.json                        │
│  modules/security/scan-{id}-results.json                        │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Sequence

```
USER                FRONTEND              API                 MODULES              FILES
 │                     │                   │                      │                   │
 │ Enter URL           │                   │                      │                   │
 │────────────────────>│                   │                      │                   │
 │                     │                   │                      │                   │
 │                     │ POST /api/scan    │                      │                   │
 │                     │──────────────────>│                      │                   │
 │                     │                   │ Create scan entry    │                   │
 │                     │                   │ Return scanId        │                   │
 │                     │<──────────────────│                      │                   │
 │                     │ {scanId: 1}       │                      │                   │
 │                     │                   │                      │                   │
 │ Show "Scanning..."  │                   │ (async process)      │                   │
 │<────────────────────│                   │                      │                   │
 │                     │                   │ Step 1: Crawl        │                   │
 │                     │                   │─────────────────────>│                   │
 │                     │                   │                      │ crawlWebsite()    │
 │                     │                   │                      │ ────┐             │
 │                     │                   │                      │     │ BFS crawl   │
 │                     │                   │                      │ <───┘             │
 │                     │                   │                      │────────────────┐  │
 │                     │                   │                      │  endpoints[]   │  │
 │                     │                   │<─────────────────────│ <──────────────┘  │
 │                     │                   │                      │                   │
 │                     │                   │ Save crawler results │                   │
 │                     │                   │──────────────────────────────────────────>│
 │                     │                   │                      │ scan-1-results.json│
 │                     │                   │                      │                   │
 │                     │ Poll: GET /api/   │ progress: 10%        │                   │
 │                     │ scan/1            │                      │                   │
 │                     │──────────────────>│                      │                   │
 │                     │<──────────────────│                      │                   │
 │                     │ {status:scanning} │                      │                   │
 │                     │                   │                      │                   │
 │                     │                   │ Step 2: Performance  │                   │
 │                     │                   │─────────────────────>│                   │
 │                     │                   │                      │ runPerformanceAudit()
 │                     │                   │                      │ ────┐             │
 │                     │                   │                      │     │ Lighthouse  │
 │                     │                   │                      │ <───┘             │
 │                     │                   │                      │────────────────┐  │
 │                     │                   │                      │  scores,       │  │
 │                     │                   │                      │  issues,       │  │
 │                     │                   │                      │  metrics       │  │
 │                     │                   │<─────────────────────│ <──────────────┘  │
 │                     │                   │                      │                   │
 │                     │                   │ Save perf results    │                   │
 │                     │                   │──────────────────────────────────────────>│
 │                     │                   │                      │                   │
 │                     │ Poll: GET /api/   │ progress: 40%        │                   │
 │                     │ scan/1            │                      │                   │
 │                     │──────────────────>│                      │                   │
 │                     │<──────────────────│                      │                   │
 │                     │                   │                      │                   │
 │                     │                   │ Step 3: UX Audit     │                   │
 │                     │                   │─────────────────────>│                   │
 │                     │                   │                      │ runAxeAudit()     │
 │                     │                   │                      │ ────┐             │
 │                     │                   │                      │     │ axe-core    │
 │                     │                   │                      │ <───┘             │
 │                     │                   │                      │────────────────┐  │
 │                     │                   │                      │  violations    │  │
 │                     │                   │<─────────────────────│ <──────────────┘  │
 │                     │                   │                      │                   │
 │                     │                   │ Save UX results      │                   │
 │                     │                   │──────────────────────────────────────────>│
 │                     │                   │                      │                   │
 │                     │ Poll: GET /api/   │ progress: 70%        │                   │
 │                     │ scan/1            │                      │                   │
 │                     │──────────────────>│                      │                   │
 │                     │<──────────────────│                      │                   │
 │                     │                   │                      │                   │
 │                     │                   │ Step 4: Security     │                   │
 │                     │                   │─────────────────────>│                   │
 │                     │                   │                      │ runSecurityAudit()│
 │                     │                   │                      │ ────┐             │
 │                     │                   │                      │     │ OWASP ZAP   │
 │                     │                   │                      │ <───┘             │
 │                     │                   │                      │────────────────┐  │
 │                     │                   │                      │  alerts,       │  │
 │                     │                   │                      │  vulns         │  │
 │                     │                   │<─────────────────────│ <──────────────┘  │
 │                     │                   │                      │                   │
 │                     │                   │ Save security results│                   │
 │                     │                   │──────────────────────────────────────────>│
 │                     │                   │                      │                   │
 │                     │                   │ Aggregate results    │                   │
 │                     │                   │ Calculate overall    │                   │
 │                     │                   │ score                │                   │
 │                     │                   │                      │                   │
 │                     │ Poll: GET /api/   │ progress: 100%       │                   │
 │                     │ scan/1            │ status: success      │                   │
 │                     │──────────────────>│ results: {...}       │                   │
 │                     │<──────────────────│                      │                   │
 │                     │                   │                      │                   │
 │ Display Results     │ Transform &       │                      │                   │
 │<────────────────────│ Display           │                      │                   │
 │                     │                   │                      │                   │
```

## Module Integration Detail

```
┌────────────────────────────────────────────────────────────────┐
│                       CRAWLER MODULE                           │
├────────────────────────────────────────────────────────────────┤
│  Input:  { url: "https://example.com", maxDepth: 2 }          │
│                                                                │
│  Process:                                                      │
│    1. Start BFS from root URL                                 │
│    2. Extract all internal links                              │
│    3. Filter out non-HTML resources                           │
│    4. Normalize URLs (remove query/hash)                      │
│                                                                │
│  Output: {                                                     │
│    scan_id: "crawl-1234567890",                               │
│    endpoints: [                                                │
│      "https://example.com",                                    │
│      "https://example.com/about",                              │
│      "https://example.com/contact"                             │
│    ],                                                          │
│    total_endpoints_found: 3                                    │
│  }                                                             │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                    PERFORMANCE MODULE                          │
├────────────────────────────────────────────────────────────────┤
│  Input:  {                                                     │
│    endpoints: ["url1", "url2", ...],  // From crawler         │
│    batchSize: 3                                                │
│  }                                                             │
│                                                                │
│  Process:                                                      │
│    1. Run Lighthouse on each endpoint                         │
│    2. Collect Core Web Vitals                                 │
│    3. Analyze SEO factors                                      │
│    4. Identify optimization opportunities                      │
│    5. Calculate aggregate scores                               │
│                                                                │
│  Output: {                                                     │
│    summary: {                                                  │
│      overallPerformanceScore: 78,  // 0-100                   │
│      overallSeoScore: 92           // 0-100                   │
│    },                                                          │
│    pageResults: [...],             // Per-page metrics        │
│    issues: {                                                   │
│      performance: [...],           // Optimization tips       │
│      seo: [...]                    // SEO improvements        │
│    }                                                           │
│  }                                                             │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                      UX/A11Y MODULE                            │
├────────────────────────────────────────────────────────────────┤
│  Input:  {                                                     │
│    endpoints: ["url1", "url2", ...]  // From crawler          │
│  }                                                             │
│                                                                │
│  Process:                                                      │
│    1. Launch headless browser (Puppeteer)                     │
│    2. Inject axe-core on each page                            │
│    3. Run accessibility audit                                  │
│    4. Categorize violations by impact                          │
│    5. Calculate accessibility score                            │
│                                                                │
│  Output: {                                                     │
│    results: [                                                  │
│      {                                                         │
│        url: "https://example.com",                             │
│        accessibility_score: 85,   // 0-100                    │
│        violations: [                                           │
│          {                                                     │
│            id: "color-contrast",                               │
│            impact: "serious",                                  │
│            description: "...",                                 │
│            helpUrl: "..."                                      │
│          }                                                     │
│        ]                                                       │
│      }                                                         │
│    ]                                                           │
│  }                                                             │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                     SECURITY MODULE                            │
├────────────────────────────────────────────────────────────────┤
│  Input:  {                                                     │
│    endpoints: ["url1", "url2", ...],  // From crawler         │
│    options: {                                                  │
│      maxDepth: 2,                                              │
│      timeout: 180000,                                          │
│      passiveScanOnly: false                                    │
│    }                                                           │
│  }                                                             │
│                                                                │
│  Process:                                                      │
│    1. Start OWASP ZAP                                          │
│    2. Spider each endpoint                                     │
│    3. Run passive scan                                         │
│    4. Run active scan (if enabled)                             │
│    5. Categorize alerts by risk                                │
│    6. Calculate security score                                 │
│                                                                │
│  Output: {                                                     │
│    summary: {                                                  │
│      overallSecurityScore: 88,    // 0-100                    │
│      totalIssues: 12                                           │
│    },                                                          │
│    issues: {                                                   │
│      high: [...],      // Critical vulnerabilities            │
│      medium: [...],    // Medium risk issues                  │
│      low: [...]        // Low risk warnings                   │
│    }                                                           │
│  }                                                             │
└────────────────────────────────────────────────────────────────┘
```

## Score Calculation

```
┌───────────────────────────────────────────────────────────────┐
│                    SCORE AGGREGATION                          │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Performance Score (0-100) ────┐                             │
│  SEO Score (0-100) ─────────────┤                             │
│  UX Score (0-100) ──────────────┼─> Calculate Average        │
│  Security Score (0-100) ────────┘                             │
│                                                               │
│  Overall Score = (P + S + U + Sec) / 4                       │
│                                                               │
│  Color Coding:                                                │
│    > 70  →  Green (Good)                                      │
│    31-70 →  Yellow (Medium)                                   │
│    ≤ 30  →  Red (Poor)                                        │
│                                                               │
│  Grade Assignment:                                             │
│    90-100 →  A                                                │
│    80-89  →  B                                                │
│    70-79  →  C                                                │
│    60-69  →  D                                                │
│    < 60   →  F                                                │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                       FRONTEND                              │
├─────────────────────────────────────────────────────────────┤
│  • Next.js 15.5                                             │
│  • React 19.1                                               │
│  • TypeScript 5.9                                           │
│  • Tailwind CSS 3.4                                         │
│  • Radix UI Components                                      │
│  • html2canvas + jsPDF (PDF export)                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                              │
├─────────────────────────────────────────────────────────────┤
│  • Node.js 18+                                              │
│  • Express 4.18                                             │
│  • CORS middleware                                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        MODULES                              │
├─────────────────────────────────────────────────────────────┤
│  Crawler:       axios 1.12, cheerio 1.0                    │
│  Performance:   lighthouse 12.8, chrome-launcher 1.1       │
│  UX:            axe-core 4.11, puppeteer 24.25             │
│  Security:      OWASP ZAP API, axios 1.6                   │
└─────────────────────────────────────────────────────────────┘
```
