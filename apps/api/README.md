# SiteSense API Server

Backend API server that orchestrates all auditing modules (crawler, performance, security, ux-audit).

## Features

- 🔍 **Comprehensive Scanning**: Integrates crawler, performance, SEO, UX, and security audits
- 📊 **Real-time Progress**: Polls scan status and progress
- 💾 **Result Persistence**: Saves all module results to JSON files in respective folders
- 🚀 **RESTful API**: Clean API endpoints for frontend integration

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

The server will run on `http://localhost:3001` by default.

## API Endpoints

### POST /api/scan
Start a new comprehensive website scan.

**Request Body:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "scanId": 1,
  "status": "scanning",
  "message": "Scan initiated successfully"
}
```

### GET /api/scan/:id
Get the status and results of a specific scan.

**Response (while scanning):**
```json
{
  "id": 1,
  "url": "https://example.com",
  "timestamp": "2025-11-09T...",
  "status": "scanning",
  "progress": 45,
  "results": null
}
```

**Response (completed):**
```json
{
  "id": 1,
  "url": "https://example.com",
  "timestamp": "2025-11-09T...",
  "status": "success",
  "progress": 100,
  "results": {
    "performance": {
      "score": 85,
      "metrics": {...},
      "issues": [...]
    },
    "seo": {
      "score": 92,
      "issues": [...]
    },
    "ux": {
      "score": 78,
      "issues": [...],
      "recommendations": [...]
    },
    "security": {
      "score": 88,
      "vulnerabilities": [...]
    },
    "overall": 85
  }
}
```

### GET /api/scans
Get all scans (history).

**Response:**
```json
[
  {
    "id": 1,
    "url": "https://example.com",
    "timestamp": "2025-11-09T...",
    "status": "success",
    "progress": 100,
    "results": {
      "overall": 85,
      "performance": { "score": 85 },
      "seo": { "score": 92 },
      "ux": { "score": 78 },
      "security": { "score": 88 }
    }
  }
]
```

### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-09T..."
}
```

## Module Integration

The API orchestrates the following modules:

1. **Crawler** (`modules/crawler`): Discovers all endpoints on the website
2. **Performance** (`modules/performance`): Runs Lighthouse audits for performance and SEO
3. **UX Audit** (`modules/ux-audit`): Runs axe-core accessibility audits
4. **Security** (`modules/security`): Runs OWASP ZAP security scans

### Result Persistence

All module results are automatically saved to JSON files in their respective module folders:

- `modules/crawler/scan-{id}-results.json`
- `modules/performance/scan-{id}-results.json`
- `modules/ux-audit/scan-{id}-results.json`
- `modules/security/scan-{id}-results.json`

## Development

### Running with the Frontend

From the project root:
```bash
npm run dev
```

This will start both the API server (port 3001) and the web frontend (port 3000).

### Testing the API

Using curl:
```bash
# Start a scan
curl -X POST http://localhost:3001/api/scan \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Check scan status
curl http://localhost:3001/api/scan/1

# Get all scans
curl http://localhost:3001/api/scans
```

## Configuration

- **PORT**: Server port (default: 3001)
- Set via environment variable: `PORT=3002 npm start`

## Error Handling

The API handles errors gracefully:
- Invalid URLs return 400 Bad Request
- Missing scans return 404 Not Found
- Module failures are logged and don't crash the server
- Partial results are returned if some modules fail

## Performance Considerations

- Scans are processed asynchronously
- Results are stored in memory (consider adding database for production)
- Endpoints are limited (10 for performance/UX, 5 for security) to ensure reasonable scan times
- Batch processing prevents resource exhaustion
