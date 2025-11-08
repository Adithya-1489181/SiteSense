# Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Install Dependencies
```bash
cd modules/performance
npm install
```

### 2. Create Your Input File

Create `my-audit.json`:
```json
{
  "endpoints": [
    "https://your-website.com",
    "https://your-website.com/page1",
    "https://your-website.com/page2"
  ],
  "outputFile": "my-results.json"
}
```

### 3. Run the Audit
```bash
node cli.js my-audit.json
```

## 📊 What You Get

### Summary Scores
- Overall Performance Score (0-100)
- Overall SEO Score (0-100)
- Letter Grades (A-F)

### Detailed Analysis
- **Performance Issues**: Grouped by impact and effort
- **SEO Issues**: Organized by priority
- **Page Metrics**: FCP, LCP, TBT, CLS, Speed Index
- **Affected Pages**: Which pages have which issues

### Smart Prioritization
Issues are ranked by:
1. **Impact**: High/Medium/Low - How much it affects your site
2. **Effort**: High/Medium/Low - How hard it is to fix

## 🎯 Quick Wins

Look for issues marked as:
- **High Impact + Low Effort** = Fix these first!

Examples:
- Missing meta descriptions
- Missing alt tags
- Missing viewport meta tag
- HTTP issues

## 🔧 Common Use Cases

### Audit Before Deployment
```bash
node cli.js --urls https://staging.mysite.com https://staging.mysite.com/products -o pre-deploy.json
```

### Regular Site Health Check
```bash
node cli.js production-urls.json -o monthly-audit-$(date +%Y-%m).json
```

### Compare Multiple Environments
```bash
node cli.js staging-urls.json -o staging-audit.json
node cli.js production-urls.json -o prod-audit.json
```

## 📈 Understanding Scores

### Performance (0-100)
- **90-100**: Excellent - Keep it up!
- **50-89**: Needs improvement
- **0-49**: Poor - Immediate attention required

### SEO (0-100)
- **90-100**: Great - Your site is discoverable
- **80-89**: Good - Minor improvements needed
- **0-79**: Issues that may affect rankings

## 💡 Tips

1. **Test Production**: Always audit your live site
2. **Multiple Pages**: Include different page types (home, product, blog, etc.)
3. **Regular Audits**: Run weekly or after major changes
4. **Track Progress**: Save results to compare over time
5. **Fix Systematically**: Start with high-impact, low-effort issues

## 🐛 Troubleshooting

**Audit is slow?**
- Reduce number of endpoints
- Check your internet connection
- Target sites may be slow

**Chrome won't launch?**
- Make sure Chrome is installed
- Check if ports are available
- Try running as administrator (Windows)

**Out of memory?**
- Audit fewer pages at once
- Close other applications
- Increase Node memory: `node --max-old-space-size=4096 cli.js input.json`

## 📚 Learn More

See `README.md` for complete documentation.

## Example Output Structure

```json
{
  "summary": {
    "overallPerformanceScore": 78,
    "overallSeoScore": 92,
    "performanceGrade": "C",
    "seoGrade": "A"
  },
  "issues": {
    "performance": [...],
    "seo": [...]
  }
}
```

Happy auditing! 🎉
