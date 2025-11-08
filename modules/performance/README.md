# SiteSense Performance & SEO Auditor

A comprehensive tool to audit multiple website endpoints for performance and SEO issues using Google Lighthouse.

## Features

- ✅ Audit multiple endpoints in a single run
- ✅ Calculate overall performance and SEO scores
- ✅ Identify issues with impact and effort factors
- ✅ Group similar issues across pages
- ✅ Export results to JSON
- ✅ Detailed metrics for each page
- ✅ Priority-based issue ranking

## Installation

```bash
cd modules/performance
npm install
```

## Usage

### Method 1: Using CLI with Input File

1. Create an input JSON file (see `example-input.json`):

```json
{
  "endpoints": [
    "https://example.com",
    "https://example.com/about",
    "https://example.com/contact"
  ],
  "outputFile": "results.json"
}
```

2. Run the audit:

```bash
node cli.js input.json
```

### Method 2: Using CLI with Direct URLs

```bash
node cli.js --urls https://example.com https://example.com/about -o results.json
```

### Method 3: Using as a Module

```javascript
import { runAudit } from '@sitesense/performance';

const results = await runAudit({
  endpoints: [
    'https://example.com',
    'https://example.com/about'
  ],
  outputFile: 'results.json'
});

console.log(results.summary.overallPerformanceScore);
```

## Input Format

The input JSON should contain:

```json
{
  "endpoints": ["url1", "url2", ...],  // Required: Array of URLs to audit
  "outputFile": "path/to/output.json"   // Optional: Where to save results
}
```

## Output Format

The tool generates a comprehensive JSON report with:

### Summary
- `totalPages`: Number of pages audited
- `overallPerformanceScore`: Average performance score (0-100)
- `overallSeoScore`: Average SEO score (0-100)
- `performanceGrade`: Letter grade (A-F)
- `seoGrade`: Letter grade (A-F)
- `timestamp`: When the audit was run

### Page Results
Individual scores and metrics for each page:
- Performance score
- SEO score
- Key metrics (FCP, LCP, TBT, CLS, Speed Index)

### Issues
Grouped issues across all pages with:
- `id`: Unique issue identifier
- `title`: Human-readable title
- `description`: Detailed description
- `category`: "performance" or "seo"
- `impact`: "High", "Medium", or "Low"
- `effort`: Estimated effort to fix ("High", "Medium", "Low")
- `affectedPages`: List of pages with this issue
- `averageScore`: Average audit score across affected pages
- `occurrences`: Number of pages affected

### Detailed Page Issues
Per-page breakdown of all issues found

## Impact Factor

Issues are categorized by impact:

- **High Impact**: Critical issues that significantly affect performance/SEO
  - Score < 0.5
  - High weight audits failing
- **Medium Impact**: Important but not critical issues
  - Score between 0.5-0.9
  - Medium weight audits
- **Low Impact**: Minor issues with minimal effect
  - Score > 0.9

## Effort Factor

Estimated effort to resolve issues:

- **High Effort**: Requires significant development work
  - Examples: Optimizing JavaScript, image formats, lazy loading
- **Medium Effort**: Moderate development work
  - Examples: Caching, compression, resource optimization
- **Low Effort**: Quick fixes, usually content/metadata
  - Examples: Meta descriptions, title tags, alt text

## Example Output

```json
{
  "summary": {
    "totalPages": 3,
    "overallPerformanceScore": 78,
    "overallSeoScore": 92,
    "performanceGrade": "C",
    "seoGrade": "A",
    "timestamp": "2025-10-23T12:00:00.000Z"
  },
  "pageResults": [
    {
      "url": "https://example.com",
      "performanceScore": 85,
      "seoScore": 95,
      "metrics": {
        "firstContentfulPaint": 1200,
        "largestContentfulPaint": 2400,
        "totalBlockingTime": 150,
        "cumulativeLayoutShift": 0.05,
        "speedIndex": 2000
      }
    }
  ],
  "issues": {
    "performance": [
      {
        "id": "unused-javascript",
        "title": "Remove unused JavaScript",
        "description": "Reduce unused JavaScript...",
        "category": "performance",
        "impact": "High",
        "effort": "High",
        "affectedPages": [
          {
            "url": "https://example.com",
            "score": 0.45,
            "displayValue": "200 KB"
          }
        ],
        "averageScore": "0.45",
        "occurrences": 1
      }
    ],
    "seo": [...]
  },
  "detailedPageIssues": [...]
}
```

## Understanding the Scores

- **90-100 (A)**: Excellent
- **80-89 (B)**: Good
- **70-79 (C)**: Needs improvement
- **60-69 (D)**: Poor
- **0-59 (F)**: Critical issues

## Tips for Best Results

1. **Use production URLs**: Audit your live site, not development
2. **Test multiple pages**: Include homepage, landing pages, and key user flows
3. **Run during off-peak hours**: For more consistent results
4. **Address high-impact issues first**: Focus on issues affecting multiple pages
5. **Low effort wins**: Fix low-effort issues quickly for immediate improvements

## Troubleshooting

### Chrome fails to launch
- Ensure Chrome/Chromium is installed
- Check firewall settings
- Try running with `--no-sandbox` flag

### Slow audits
- Reduce number of endpoints
- Check network connection
- Ensure target sites are responsive

### Memory issues
- Audit fewer pages at once
- Close other applications
- Increase Node.js memory limit: `node --max-old-space-size=4096 cli.js`

## Contributing

When adding new audit checks:
1. Add the audit ID to appropriate effort category in `calculateEffort()`
2. Update impact calculation if needed
3. Add examples to documentation

## License

ISC
