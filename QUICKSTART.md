# SiteSense - Quick Start Guide

## 🚀 Getting Started in 3 Steps

### Prerequisites
- Node.js 18+ installed
- OWASP ZAP installed (optional, for security scans)

### Step 1: Install Dependencies
```bash
npm install
```

This installs all dependencies for the entire workspace (frontend, backend, and all modules).

### Step 2: Start the Application
```bash
npm run dev
```

This starts both:
- **API Server** on http://localhost:3001
- **Web Frontend** on http://localhost:3000

### Step 3: Run Your First Scan
1. Open http://localhost:3000 in your browser
2. Click **"Start Audit"**
3. Enter a website URL (e.g., `https://example.com`)
4. Click **"Start Scan"**
5. Wait for the scan to complete (typically 2-5 minutes)
6. View comprehensive results!

---

## 📊 What Gets Scanned?

When you run a scan, SiteSense analyzes your website across 4 dimensions:

### 1. Performance 🚀
- Core Web Vitals (FCP, LCP, TBT, CLS, Speed Index)
- Page load times
- Resource optimization opportunities
- **Score:** 0-100 (based on Google Lighthouse)

### 2. SEO 🔍
- Meta tags and descriptions
- Heading structure
- Image alt attributes
- Mobile friendliness
- **Score:** 0-100 (based on Google Lighthouse)

### 3. UX/Accessibility ♿
- WCAG compliance
- Color contrast
- ARIA labels
- Keyboard navigation
- Screen reader compatibility
- **Score:** 0-100 (based on axe-core violations)

### 4. Security 🔒
- SSL/TLS configuration
- XSS vulnerabilities
- SQL injection risks
- Security headers
- Cookie security
- **Score:** 0-100 (based on OWASP ZAP findings)

---

## 📁 Where Are Results Saved?

All scan results are automatically saved as JSON files:

```
modules/
├── crawler/scan-1-results.json
├── performance/scan-1-results.json
├── ux-audit/scan-1-results.json
└── security/scan-1-results.json
```

Each file contains complete, raw data from that module's scan.

---

## 🛠️ Alternative: Run Services Separately

If you prefer to start services individually:

### Terminal 1: API Server
```bash
npm run start:api
```

### Terminal 2: Web Frontend
```bash
npm run dev:web
```

---

## 📝 Example Workflow

### Scan a Production Website
```bash
# Start the app
npm run dev

# Visit http://localhost:3000
# Enter URL: https://yourwebsite.com
# Click "Start Scan"
# Wait 2-5 minutes
# View results and recommendations
```

### Download PDF Report
1. Complete a scan
2. Click **"View Details"** on any scan
3. Click **"Download PDF"** button
4. Get a comprehensive PDF report with all findings

### Track Multiple Scans
- All scans are saved in browser localStorage
- View scan history on the main scan page
- Compare results between different scans
- Delete old scans as needed

---

## ⚙️ Configuration

### Adjust Scan Limits
Edit `apps/api/index.js` to change how many pages are scanned:

```javascript
// Performance & UX: scan up to 10 pages
endpoints: endpoints.slice(0, 10)

// Security: scan up to 5 pages (slower)
endpoints: endpoints.slice(0, 5)
```

### Change Ports
```bash
# API port (default: 3001)
PORT=3002 npm run start:api

# Web port (default: 3000) - edit apps/web/package.json
```

---

## 🐛 Troubleshooting

### "Cannot connect to API"
- Ensure API is running on port 3001
- Check terminal for errors
- Try: `npm run start:api`

### "Scan taking too long"
- Large websites take longer
- Reduce endpoint limits in `apps/api/index.js`
- Check module-specific timeouts

### "Security scan failed"
- Ensure OWASP ZAP is installed and running
- Or set `passiveScanOnly: true` in security options

### "Module not found"
- Run `npm install` in project root
- Verify all workspace dependencies installed

---

## 📖 Learn More

- **Full Documentation**: [README.md](README.md)
- **API Reference**: [apps/api/README.md](apps/api/README.md)
- **Integration Guide**: [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)
- **Module READMEs**:
  - [Performance](modules/performance/README.md)
  - [Security](modules/security/README.md)

---

## 🎯 Next Steps

After your first scan:

1. **Review Issues**: Check the detailed issue list
2. **Prioritize Fixes**: Use impact/effort matrix
3. **Track Progress**: Mark issues as fixed
4. **Re-scan**: Run another scan to see improvements
5. **Export Report**: Download PDF for stakeholders

---

## 💡 Tips

- **Start Small**: Test with simple websites first (e.g., example.com)
- **Be Patient**: First scan takes longer (caching helps later)
- **Check Logs**: Backend terminal shows detailed progress
- **Use Mock Data**: Comment out module calls for faster UI testing

---

## 🤝 Need Help?

- Check the terminal output for detailed error messages
- Review module-specific README files
- Ensure all prerequisites are installed
- Verify port 3001 and 3000 are available

---

**Happy Auditing! 🎉**
