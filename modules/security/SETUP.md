# 🚀 SiteSense Security Module - Quick Setup

## ✅ Module Structure Created

Your security module is now complete with the following files:

### 📁 Core Files
```
modules/security/
├── package.json              # Dependencies and scripts
├── index.js                  # Main API entry point
├── cli.js                    # Command-line interface
└── src/
    ├── zap-client.js         # ZAP API wrapper
    ├── evaluator.js          # Security result processor
    └── utils.js              # Utilities and validation
```

### 📁 Configuration
```
├── .gitignore                # Git ignore rules
├── input-schema.json         # Input validation schema
├── zap-config.properties     # ZAP configuration template
├── example-input.json        # Sample input file
└── sample-output.json        # Example output format
```

### 📁 Documentation
```
├── README.md                 # Complete documentation
├── example.js                # Usage examples
└── SETUP.md                  # This setup guide
```

## 🛠️ Installation Steps

### 1. Install Dependencies
```bash
cd modules/security
npm install
```

### 2. Install OWASP ZAP

**Option A: Download ZAP**
- Visit: https://www.zaproxy.org/download/
- Install for your operating system

**Option B: Docker (Recommended)**
```bash
docker pull zaproxy/zap-stable
```

**Option C: Package Manager**
```bash
# Ubuntu/Debian
sudo apt install zaproxy

# macOS (with Homebrew)
brew install zap
```

## 🚀 Quick Test

### 1. Start ZAP
```bash
# Option 1: Use npm script
npm run start-zap

# Option 2: Manual start
zap.sh -daemon -port 8080

# Option 3: Docker
docker run -p 8080:8080 zaproxy/zap-stable zap.sh -daemon -host 0.0.0.0 -port 8080
```

### 2. Run Example
```bash
# Run all examples
node example.js

# Or run a single quick scan
node cli.js --url https://httpbin.org --quick
```

### 3. Test with Your Site
```bash
# Create input file
cat > my-security-test.json << EOF
{
  "endpoints": ["https://your-website.com"],
  "outputFile": "my-security-results.json",
  "options": {
    "maxDepth": 2,
    "timeout": 120000,
    "passiveScanOnly": true
  }
}
EOF

# Run security audit
node cli.js my-security-test.json
```

## 📊 Expected Output

After a successful scan, you'll see:

```
🛡️  SECURITY SCAN SUMMARY
============================================================
📊 Overall Security Score: 75/100 (C)
🎯 Total Issues Found: 8
🌐 Websites Scanned: 1

📈 Risk Distribution:
   🔴 High Risk: 1
   🟡 Medium Risk: 3
   🟢 Low Risk: 4
   ℹ️  Informational: 0

🔍 Top Vulnerabilities:
   1. Missing Anti-clickjacking Header - Medium Risk
   2. Content Security Policy (CSP) Header Not Set - Medium Risk
   3. X-Content-Type-Options Header Missing - Low Risk
============================================================
```

## 🔧 Integration with SiteSense

### With Crawler Module
```javascript
// Example integration
import { crawlWebsite } from '../crawler/index.js';
import { runSecurityAudit } from '../security/index.js';

// 1. Crawl website
const crawlResults = await crawlWebsite('https://example.com');

// 2. Run security audit on crawled URLs
const securityResults = await runSecurityAudit({
  endpoints: crawlResults.endpoints,
  outputFile: 'comprehensive-security.json'
});

// 3. Combined results
const combinedReport = {
  crawl: crawlResults,
  security: securityResults,
  timestamp: new Date().toISOString()
};
```

### Output Format Compatibility

The security module outputs match SiteSense patterns:
- **Website-based results**: Similar to performance module
- **Impact/Effort scoring**: Consistent with other modules  
- **JSON + Text output**: Same dual format approach
- **Issue categorization**: Compatible with the web dashboard

## 📋 CLI Usage Examples

```bash
# Basic scan from JSON file
node cli.js my-sites.json

# Quick single URL scan
node cli.js --url https://example.com --quick

# Batch scan multiple URLs
node cli.js --urls "https://site1.com,https://site2.com" --output results.json

# Advanced scan with options
node cli.js --url https://example.com --depth 3 --timeout 600000 --exclude "logout,admin"

# Passive scan only (faster)
node cli.js my-sites.json --passive-only

# Get help
node cli.js --help
```

## 🚨 Troubleshooting

### ZAP Not Starting
```bash
# Check if ZAP is already running
curl http://localhost:8080/JSON/core/view/version/

# Kill existing ZAP processes
pkill -f zap

# Start fresh
zap.sh -daemon -port 8080 -config api.disablekey=true
```

### Scan Timeouts
```bash
# Increase timeout and reduce depth
node cli.js --timeout 600000 --depth 2 input.json

# Use quick mode
node cli.js --quick --url https://example.com
```

### Memory Issues
```bash
# Increase Node.js memory
node --max-old-space-size=4096 cli.js input.json

# Process smaller batches
node cli.js --batch-size 2 input.json
```

## 🎯 Key Features

✅ **OWASP ZAP Integration** - Industry-standard security scanning  
✅ **Impact/Effort Analysis** - Prioritized vulnerability reporting  
✅ **Crawler Integration** - Seamless input from SiteSense crawler  
✅ **Batch Processing** - Efficient multi-website scanning  
✅ **CLI Interface** - Easy command-line usage  
✅ **JSON + Text Output** - Detailed and human-readable reports  
✅ **Error Resilience** - Continues scanning despite individual failures  
✅ **Configurable Scanning** - Passive/active modes, custom timeouts  

## 🔍 Example Security Issues Detected

The module will identify:
- **Cross-Site Scripting (XSS)** - High Risk
- **SQL Injection** - High Risk  
- **Missing Security Headers** - Medium Risk
- **Clickjacking Vulnerabilities** - Medium Risk
- **Information Disclosure** - Low Risk
- **SSL/TLS Issues** - Various Risk Levels
- **Authentication Bypasses** - High Risk
- **Directory Traversal** - High Risk

## 📈 Next Steps

1. **Test with Known Vulnerable Sites**: Try scanning `http://testphp.vulnweb.com/` for testing
2. **Integrate with CI/CD**: Add security scanning to your deployment pipeline  
3. **Customize Rules**: Modify ZAP scan policies for your specific needs
4. **Dashboard Integration**: Connect results to the SiteSense web interface
5. **Scheduled Scans**: Set up regular security audits

## 💡 Pro Tips

- Use `--passive-only` for quick, non-intrusive scans
- Always test with `--quick` mode first on new sites
- Exclude logout/admin URLs to avoid unwanted actions
- Run full scans during maintenance windows
- Review false positives and adjust exclusions

---

**🎉 Your security module is ready! Start with:**
```bash
npm install
node cli.js --url https://httpbin.org --quick
```