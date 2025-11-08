# 🛡️ SiteSense Security Module

## Overview

The SiteSense Security Module is a comprehensive web security auditing tool that integrates **OWASP ZAP (Zed Attack Proxy)** with crawler output to perform automated security vulnerability assessments. It provides detailed security analysis with impact/effort categorization and generates both JSON and human-readable reports.

## 🌟 Features

- **🔍 Comprehensive Security Scanning**: Uses OWASP ZAP for industry-standard vulnerability detection
- **📊 Impact & Effort Analysis**: Categorizes vulnerabilities by impact (High/Medium/Low) and effort to fix
- **🕷️ Crawler Integration**: Seamlessly processes URLs from the SiteSense crawler module
- **📈 Detailed Reporting**: JSON output with human-readable summaries and recommendations
- **🔄 Batch Processing**: Efficiently handles multiple websites and URLs
- **⚡ Quick Scan Mode**: Fast passive-only scans for rapid assessment
- **🛠️ CLI Interface**: Command-line tool for easy integration into workflows
- **📋 Structured Output**: Consistent format matching other SiteSense modules

## 🚀 Quick Start

### Prerequisites

1. **OWASP ZAP Installation**: Install ZAP locally or use Docker
   ```bash
   # Option 1: Download from https://www.zaproxy.org/download/
   
   # Option 2: Docker (recommended)
   docker pull zaproxy/zap-stable
   
   # Option 3: Package manager (Linux/Mac)
   # Ubuntu/Debian: apt install zaproxy
   # macOS: brew install zap
   ```

2. **Node.js**: Version 18 or higher

### Installation

```bash
cd modules/security
npm install
```

### Basic Usage

1. **Create input file** (`my-security-audit.json`):
   ```json
   {
     "endpoints": [
       "https://your-website.com",
       "https://your-website.com/login",
       "https://your-website.com/dashboard"
     ],
     "outputFile": "security-results.json",
     "options": {
       "maxDepth": 5,
       "timeout": 300000
     }
   }
   ```

2. **Run the security audit**:
   ```bash
   node cli.js my-security-audit.json
   ```

3. **View results**:
   - `security-results.json` - Detailed JSON report
   - `security-results-summary.txt` - Human-readable summary

## 📚 Usage Examples

### CLI Examples

```bash
# Basic audit from JSON file
node cli.js my-sites.json

# Single URL scan
node cli.js --url https://yoursite.com

# Multiple URLs scan
node cli.js --urls "https://site1.com,https://site2.com" --output results.json

# Advanced scan with options
node cli.js --url https://yoursite.com --depth 3 --timeout 600000 --exclude "logout,admin"

# Passive scan only (faster, less thorough)
node cli.js my-sites.json --passive-only

# Get help
node cli.js --help
```

### Programmatic Usage

```javascript
import { runSecurityAudit } from './index.js';

// Security audit
const results = await runSecurityAudit({
  endpoints: ['https://yoursite.com'],
  outputFile: 'results.json',
  options: {
    maxDepth: 5,
    timeout: 300000,
    batchSize: 5
  }
});

console.log(`Security Score: ${results.summary.overallSecurityScore}/100`);
console.log(`Issues Found: ${results.summary.totalIssues}`);
```

### Integration with Crawler

```javascript
// Process crawler output
const crawlerOutput = {
  endpoints: [
    "https://yoursite.com/",
    "https://yoursite.com/about",
    "https://yoursite.com/contact"
  ]
};

const securityResults = await runSecurityAudit({
  endpoints: crawlerOutput.endpoints,
  outputFile: 'security-audit.json'
});
```

## ⚙️ Configuration Options

### Input Format

```json
{
  "endpoints": ["https://yoursite.com"],          // Required: URLs to scan
  "outputFile": "results.json",                  // Optional: Output file path
  "options": {
    "maxDepth": 5,                              // Spider crawl depth (1-10)
    "timeout": 300000,                          // Scan timeout in ms
    "passiveScanOnly": false,                   // Only passive scanning
    "batchSize": 5,                             // URLs per batch (1-20)
    "excludeUrls": ["logout", "admin"],         // URL patterns to exclude
    "headers": {                                // Custom headers
      "Authorization": "Bearer token123"
    },
    "authentication": {                         // Authentication config
      "type": "form",
      "loginUrl": "https://example.com/login",
      "username": "user",
      "password": "pass",
      "usernameField": "email",
      "passwordField": "password"
    }
  }
}
```

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--url <url>` | Single URL to scan | - |
| `--urls <url1,url2,...>` | Comma-separated URLs | - |
| `--output <file>` | Output file path | `security-results.json` |
| `--depth <number>` | Spider crawl depth | 5 |
| `--timeout <ms>` | Scan timeout | 300000 |
| `--passive-only` | Passive scans only | false |
| `--batch-size <number>` | URLs per batch | 5 |
| `--exclude <patterns>` | URL patterns to exclude | - |
| `--quick` | Quick scan mode | false |
| `--verbose` | Verbose logging | false |

## 📊 Output Format

### JSON Output Structure

```json
{
  "summary": {
    "totalIssues": 15,
    "riskDistribution": {
      "high": 2,
      "medium": 6,
      "low": 7,
      "informational": 0
    },
    "overallSecurityScore": 68,
    "securityGrade": "C",
    "topVulnerabilities": [...],
    "criticalFindings": [...]
  },
  "websites": [
    {
      "website": "https://example.com",
      "domain": "example.com",
      "issues": [
        {
          "id": "zap-10020",
          "title": "Missing Anti-clickjacking Header",
          "description": "X-Frame-Options header not set...",
          "risk": "Medium",
          "impact": "Medium",
          "effort": "Low",
          "impactScore": 6,
          "solution": "Set X-Frame-Options header...",
          "affectedUrls": [...],
          "references": [...]
        }
      ],
      "summary": {
        "totalIssues": 8,
        "overallRiskScore": 6
      }
    }
  ],
  "recommendations": [...],
  "metadata": {...}
}
```

### Key Metrics

- **Security Score**: 0-100 overall security score
- **Security Grade**: A-F letter grade
- **Risk Distribution**: Count of High/Medium/Low/Informational issues
- **Impact Score**: 1-10 severity rating per vulnerability
- **Effort Level**: High/Medium/Low estimated fix effort

## 🎯 Vulnerability Categories

### Risk Levels

| Risk | Impact | Examples |
|------|--------|----------|
| **High** | Critical security flaws | XSS, SQL Injection, Path Traversal |
| **Medium** | Significant security issues | Missing security headers, CSRF |
| **Low** | Minor security concerns | Information disclosure, version leaks |
| **Informational** | Security recommendations | Best practice violations |

### Effort Levels

| Effort | Description | Examples |
|--------|-------------|----------|
| **High** | Structural/architectural changes | XSS fixes, injection prevention |
| **Medium** | Configuration/implementation changes | CSRF protection, authentication |
| **Low** | Header/configuration tweaks | Security headers, cookie flags |

## 🔧 ZAP Integration

### ZAP Startup Options

```bash
# Manual ZAP startup
zap.sh -daemon -port 8080 -config api.disablekey=true

# Docker ZAP
docker run -p 8080:8080 zaproxy/zap-stable zap.sh -daemon -host 0.0.0.0 -port 8080

# Using npm script
npm run start-zap
```

### ZAP Configuration

The module automatically configures ZAP with optimal settings:
- Spider depth and duration limits
- Active scan timeouts and rules
- Security-focused scan policies
- Memory and performance optimization

## 🚨 Troubleshooting

### Common Issues

1. **ZAP Connection Failed**
   ```bash
   # Check if ZAP is running
   curl http://localhost:8080/JSON/core/view/version/
   
   # Start ZAP manually
   zap.sh -daemon -port 8080
   ```

2. **Scan Timeouts**
   ```bash
   # Increase timeout
   node cli.js --timeout 600000 input.json
   
   # Use quick mode
   node cli.js --quick --url https://example.com
   ```

3. **Memory Issues**
   ```bash
   # Increase Node.js memory
   node --max-old-space-size=4096 cli.js input.json
   
   # Reduce batch size
   node cli.js --batch-size 2 input.json
   ```

### Performance Tips

- Use `--passive-only` for faster scans
- Reduce `--depth` for large sites
- Exclude unnecessary URLs with `--exclude`
- Process in smaller batches for better stability

## 🔒 Security Considerations

- **Safe Testing**: Only scan websites you own or have permission to test
- **Rate Limiting**: Built-in delays prevent overwhelming target servers
- **Authentication**: Supports various authentication methods
- **Scope Control**: Exclude sensitive areas (logout, admin panels)

## 📝 NPM Scripts

```bash
npm run audit         # Run CLI auditor
npm run example       # Run examples
npm run start-zap     # Start ZAP daemon
npm run help          # Show available commands
```

## 🤝 Integration

### With SiteSense Modules

```javascript
// After crawler
const crawlerResults = await runCrawler(url);
const securityResults = await runSecurityAudit({
  endpoints: crawlerResults.endpoints
});

// Combine with performance audit
const combined = {
  performance: performanceResults,
  security: securityResults,
  ux: uxResults
};
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Security Audit
  run: |
    cd modules/security
    npm install
    node cli.js sites.json
    
- name: Upload Results
  uses: actions/upload-artifact@v3
  with:
    name: security-results
    path: modules/security/security-results.json
```

## 📈 Example Output

```
🛡️  SECURITY SCAN SUMMARY
============================================================
📊 Overall Security Score: 72/100 (C)
🎯 Total Issues Found: 12
🌐 Websites Scanned: 1

📈 Risk Distribution:
   🔴 High Risk: 2
   🟡 Medium Risk: 4
   🟢 Low Risk: 5
   ℹ️  Informational: 1

🚨 Critical Findings:
   1. Cross Site Scripting (XSS) (Impact: 9/10)
   2. SQL Injection (Impact: 10/10)

🔍 Top Vulnerabilities:
   1. Missing Anti-clickjacking Header - Medium Risk (3 occurrences)
   2. Content Security Policy (CSP) Header Not Set - Medium Risk (3 occurrences)
   3. X-Content-Type-Options Header Missing - Low Risk (3 occurrences)
============================================================
```

## 🆘 Support

- **Documentation**: See example files and inline code comments
- **Issues**: Report bugs and feature requests in the main repository
- **ZAP Documentation**: https://www.zaproxy.org/docs/
- **OWASP Resources**: https://owasp.org/

## 📄 License

ISC License - See main repository for details.

---

**⚡ Ready to secure your websites? Start with:**
```bash
npm install
node cli.js --url https://your-website.com --quick
```