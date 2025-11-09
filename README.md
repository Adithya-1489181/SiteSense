# SiteSense
A unified and actionable view of overall website health

## Overview

SiteSense is a comprehensive web auditing platform that analyzes websites across four key dimensions:
- **Performance**: Lighthouse-powered metrics and optimization recommendations
- **SEO**: Search engine optimization analysis
- **UX/Accessibility**: Axe-core powered accessibility audits
- **Security**: OWASP ZAP vulnerability scanning

## Architecture

### Frontend (`apps/web`)
Next.js application providing an intuitive dashboard for viewing scan results.

### Backend API (`apps/api`)
Express server that orchestrates all auditing modules and provides REST API endpoints.

### Modules
- **crawler** (`modules/crawler`): Website endpoint discovery
- **performance** (`modules/performance`): Lighthouse performance & SEO audits
- **ux-audit** (`modules/ux-audit`): Axe-core accessibility testing
- **security** (`modules/security`): OWASP ZAP security scanning

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- OWASP ZAP installed (for security scans)

### Installation

```bash
# Install all dependencies
npm install

# Start both API and frontend
npm run dev
```

This will start:
- API Server: http://localhost:3001
- Web Frontend: http://localhost:3000

### Alternative: Start services separately

```bash
# Terminal 1: Start API
npm run start:api

# Terminal 2: Start Web Frontend
npm run dev:web
```

## Usage

1. Navigate to http://localhost:3000
2. Click "Start Audit"
3. Enter a website URL
4. Wait for the comprehensive scan to complete
5. View detailed results across all modules

## Features

### Real-time Scanning
- Live progress updates during scans
- Asynchronous processing of all modules
- Poll-based status checks

### Comprehensive Results
- Overall health score (0-100)
- Module-specific scores (Performance, SEO, UX, Security)
- Detailed issue breakdowns with impact/effort analysis
- Visual charts and graphs

### Result Persistence
All scan results are automatically saved to JSON files in their respective module folders:
- `modules/crawler/scan-{id}-results.json`
- `modules/performance/scan-{id}-results.json`
- `modules/ux-audit/scan-{id}-results.json`
- `modules/security/scan-{id}-results.json`

### PDF Export
Download comprehensive reports as PDF documents with all scan details.

## API Documentation

See [apps/api/README.md](apps/api/README.md) for complete API documentation.

### Key Endpoints
- `POST /api/scan` - Start a new scan
- `GET /api/scan/:id` - Get scan status and results
- `GET /api/scans` - Get all scans
- `GET /api/health` - Health check

## Module Details

### Crawler
Discovers all internal endpoints on a website using BFS traversal.
- Configurable depth and page limits
- Filters non-HTML resources
- Outputs endpoint list for other modules

### Performance
Uses Google Lighthouse to audit:
- Core Web Vitals (FCP, LCP, TBT, CLS, SI)
- Performance score
- SEO score
- Optimization opportunities

### UX/Accessibility
Uses axe-core to detect:
- WCAG violations
- ARIA issues
- Color contrast problems
- Keyboard navigation issues

### Security
Uses OWASP ZAP to scan for:
- SQL injection vulnerabilities
- XSS vulnerabilities
- Security misconfigurations
- SSL/TLS issues

## Configuration

### Environment Variables
Copy `apps/api/.env.example` to `apps/api/.env` and adjust as needed.

### Module Limits
To keep scan times reasonable:
- Performance/UX: Limited to 10 endpoints
- Security: Limited to 5 endpoints
- Adjust in `apps/api/index.js` if needed

## Development

### Project Structure
```
SiteSense/
├── apps/
│   ├── api/          # Backend API server
│   ├── cli/          # CLI tools
│   └── web/          # Next.js frontend
├── modules/
│   ├── crawler/      # Endpoint discovery
│   ├── performance/  # Lighthouse audits
│   ├── security/     # OWASP ZAP scans
│   ├── ux-audit/     # Axe-core accessibility
│   └── shared/       # Shared utilities
├── db/               # Database utilities
└── package.json      # Root workspace config
```

### Adding New Modules
1. Create module in `modules/`
2. Implement main export function
3. Add to API orchestration in `apps/api/index.js`
4. Update frontend to display new results

## Commit Comment Guidelines

When adding commit comments, please use the following standard format:

```
([Commit Type] "Commit message")
```

**Examples:**
- (feat "Add user authentication module")
- (fix "Resolve issue with image loading on homepage")
- (docs "Update README with installation instructions")
- (refactor "Simplify database connection logic")

**Commit Types:**
- `feat` – New feature
- `fix` – Bug fix
- `docs` – Documentation changes
- `refactor` – Code refactoring
- `test` – Adding or updating tests
- `chore` – Maintenance tasks

This format helps maintain clarity and consistency across the project.

## Note about dependencies

Dependencies from individual workspace packages have been consolidated into the root `package.json` for easier installation and running from the repository root. Conflicts were resolved by choosing the most recent compatible versions where possible. If you prefer per-package isolation, you can continue using the workspace package.json files and adjust versions as needed.