/**
 * SiteSense API Server
 * Orchestrates all backend modules (crawler, performance, security, ux-audit)
 * and provides a unified REST API for the frontend
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { crawlWebsite } = require('../../modules/crawler/index.js');
const { runAudit: runPerformanceAudit } = require('../../modules/performance/index.js');
const { runSecurityAudit } = require('../../modules/security/index.js');
const { runAxeAudit } = require('../../modules/ux-audit/axe-auditor.js');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Store for scan results (in-memory for now, can be replaced with a database)
const scanResults = new Map();
let scanIdCounter = 1;

/**
 * Helper: Calculate overall score from module scores
 */
function calculateOverallScore(performance, seo, ux, security) {
  const scores = [performance, seo, ux, security].filter(s => s !== null && s !== undefined);
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

/**
 * Helper: Save results to JSON file in respective module folders
 */
async function saveModuleResults(scanId, moduleName, data) {
  const moduleDir = path.join(__dirname, '..', '..', 'modules', moduleName);
  const fileName = `scan-${scanId}-results.json`;
  const filePath = path.join(moduleDir, fileName);
  
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    console.log(`✓ Saved ${moduleName} results to ${filePath}`);
    return filePath;
  } catch (error) {
    console.error(`✗ Failed to save ${moduleName} results:`, error.message);
    return null;
  }
}

/**
 * Helper: Process UX audit results and calculate score
 */
function processUxResults(uxResults) {
  if (!uxResults || !uxResults.results) {
    return { score: 0, issues: [], recommendations: [] };
  }

  const allViolations = [];
  let totalScore = 0;
  let completedAudits = 0;

  uxResults.results.forEach(result => {
    if (result.status === 'COMPLETED') {
      totalScore += result.accessibility_score;
      completedAudits++;
      
      if (result.violations && result.violations.length > 0) {
        result.violations.forEach(violation => {
          allViolations.push({
            ...violation,
            url: result.url,
            severity: violation.impact || 'minor'
          });
        });
      }
    }
  });

  const averageScore = completedAudits > 0 ? Math.round(totalScore / completedAudits) : 0;

  // Group violations by type for recommendations
  const violationsByType = {};
  allViolations.forEach(v => {
    if (!violationsByType[v.id]) {
      violationsByType[v.id] = {
        id: v.id,
        description: v.description,
        helpUrl: v.helpUrl,
        severity: v.impact,
        count: 0,
        affectedPages: []
      };
    }
    violationsByType[v.id].count++;
    if (!violationsByType[v.id].affectedPages.includes(v.url)) {
      violationsByType[v.id].affectedPages.push(v.url);
    }
  });

  const recommendations = Object.values(violationsByType).map(v => 
    `${v.description} (${v.count} instances across ${v.affectedPages.length} pages)`
  );

  return {
    score: averageScore,
    issues: allViolations,
    recommendations
  };
}

/**
 * Helper: Process security results and calculate score
 */
function processSecurityResults(securityResults) {
  if (!securityResults || !securityResults.summary) {
    return { score: 0, vulnerabilities: [] };
  }

  // Calculate security score based on risk distribution
  // Formula: Start with 100, subtract points based on severity and count
  let score = 100;
  const risks = securityResults.summary.riskDistribution || {};
  
  // Deduct points based on severity
  score -= (risks.high || 0) * 15;      // High risk: -15 points each
  score -= (risks.medium || 0) * 5;     // Medium risk: -5 points each
  score -= (risks.low || 0) * 2;        // Low risk: -2 points each
  // Informational issues don't reduce score
  
  // Ensure score stays within 0-100 range
  score = Math.max(0, Math.min(100, Math.round(score)));
  
  // Extract vulnerabilities from websites or topVulnerabilities
  const vulnerabilities = [];
  
  // Use topVulnerabilities if available (already summarized)
  if (securityResults.summary.topVulnerabilities && Array.isArray(securityResults.summary.topVulnerabilities)) {
    securityResults.summary.topVulnerabilities
      .filter(vuln => vuln.risk !== 'Informational') // Filter out informational items
      .slice(0, 15) // Limit to top 15
      .forEach(vuln => {
        vulnerabilities.push({
          title: vuln.title,
          severity: vuln.risk?.toLowerCase() || 'medium',
          description: vuln.title, // Use title as description if not available
          count: vuln.occurrences || 1,
          impact: vuln.impact || 5,
          effort: vuln.effort || 'Medium'
        });
      });
  }
  
  // If no vulnerabilities from topVulnerabilities, try to extract from websites
  if (vulnerabilities.length === 0 && securityResults.websites && Array.isArray(securityResults.websites)) {
    securityResults.websites.forEach(website => {
      if (website.issues && Array.isArray(website.issues)) {
        website.issues
          .filter(issue => issue.risk && issue.risk !== 'Informational')
          .slice(0, 15) // Limit per website
          .forEach(issue => {
            vulnerabilities.push({
              title: issue.title,
              severity: issue.risk?.toLowerCase() || 'medium',
              description: issue.description || issue.title,
              count: 1,
              impact: issue.impact || 5,
              effort: issue.effort || 'Medium'
            });
          });
      }
    });
  }

  console.log(`Security score calculated: ${score} (High: ${risks.high}, Medium: ${risks.medium}, Low: ${risks.low})`);
  console.log(`Found ${vulnerabilities.length} security vulnerabilities to display`);

  return { score, vulnerabilities };
}

/**
 * POST /api/scan
 * Start a new comprehensive scan
 */
app.post('/api/scan', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Validate URL format
  try {
    new URL(url);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  const scanId = scanIdCounter++;
  const timestamp = new Date();

  // Initialize scan result
  const scanResult = {
    id: scanId,
    url,
    timestamp,
    status: 'scanning',
    progress: 0,
    results: null
  };

  scanResults.set(scanId, scanResult);

  // Send immediate response with scan ID
  res.json({
    scanId,
    status: 'scanning',
    message: 'Scan initiated successfully'
  });

  // Start the scan process asynchronously
  (async () => {
    try {
      console.log(`\n🚀 Starting scan ${scanId} for ${url}`);
      
      // Step 1: Crawl the website (10% progress)
      console.log(`[Scan ${scanId}] Step 1/4: Crawling website...`);
      scanResult.progress = 10;
      const crawlerOutput = await crawlWebsite(url, 2);
      await saveModuleResults(scanId, 'crawler', crawlerOutput);
      
      const endpoints = crawlerOutput.endpoints || [url];
      console.log(`[Scan ${scanId}] Found ${endpoints.length} endpoints`);
      
      // Step 2: Run Performance & SEO audit (40% progress)
      console.log(`[Scan ${scanId}] Step 2/4: Running performance & SEO audit...`);
      scanResult.progress = 30;
      const performanceInput = {
        endpoints: endpoints.slice(0, 10), // Limit to 10 pages for faster scans
        outputFile: path.join(__dirname, '..', '..', 'modules', 'performance', `scan-${scanId}-results.json`),
        batchSize: 3
      };
      const performanceResults = await runPerformanceAudit(performanceInput);
      
      // Step 3: Run UX/Accessibility audit (70% progress)
      console.log(`[Scan ${scanId}] Step 3/4: Running UX/accessibility audit...`);
      scanResult.progress = 60;
      const uxResults = await runAxeAudit({
        scan_id: `scan-${scanId}`,
        endpoints: endpoints.slice(0, 10)
      });
      await saveModuleResults(scanId, 'ux-audit', uxResults);
      
      // Step 4: Run Security audit (90% progress)
      console.log(`[Scan ${scanId}] Step 4/4: Running security audit...`);
      scanResult.progress = 80;
      const securityInput = {
        endpoints: endpoints.slice(0, 5), // Limit security scan to 5 pages (slower)
        outputFile: path.join(__dirname, '..', '..', 'modules', 'security', `scan-${scanId}-results.json`),
        options: {
          maxDepth: 2,
          timeout: 180000,
          passiveScanOnly: false,
          batchSize: 2
        }
      };
      const securityResults = await runSecurityAudit(securityInput);
      
      // Process and combine all results
      console.log(`[Scan ${scanId}] Processing results...`);
      scanResult.progress = 95;
      
      const uxProcessed = processUxResults(uxResults);
      const securityProcessed = processSecurityResults(securityResults);
      
      const performanceScore = performanceResults.summary?.overallPerformanceScore || 0;
      const seoScore = performanceResults.summary?.overallSeoScore || 0;
      const uxScore = uxProcessed.score;
      const securityScore = securityProcessed.score;
      
      const overallScore = calculateOverallScore(performanceScore, seoScore, uxScore, securityScore);
      
      // Compile final results
      const finalResults = {
        performance: {
          score: performanceScore,
          metrics: performanceResults.pageResults?.[0]?.metrics || {
            firstContentfulPaint: 0,
            largestContentfulPaint: 0,
            totalBlockingTime: 0,
            cumulativeLayoutShift: 0,
            speedIndex: 0
          },
          issues: performanceResults.issues?.performance || [],
          pageResults: performanceResults.pageResults || []
        },
        seo: {
          score: seoScore,
          issues: performanceResults.issues?.seo || []
        },
        ux: uxProcessed,
        security: securityProcessed,
        overall: overallScore,
        summary: {
          totalPages: endpoints.length,
          scannedPages: Math.min(10, endpoints.length),
          performanceGrade: performanceResults.summary?.performanceGrade || 'F',
          seoGrade: performanceResults.summary?.seoGrade || 'F'
        }
      };
      
      // Update scan result
      scanResult.status = 'success';
      scanResult.progress = 100;
      scanResult.results = finalResults;
      
      console.log(`✅ [Scan ${scanId}] Completed successfully`);
      console.log(`   Overall Score: ${overallScore}`);
      console.log(`   Performance: ${performanceScore}, SEO: ${seoScore}, UX: ${uxScore}, Security: ${securityScore}`);
      console.log(`   Performance issues count: ${finalResults.performance.issues?.length || 0}`);
      console.log(`   SEO issues count: ${finalResults.seo.issues?.length || 0}`);
      console.log(`   UX issues count: ${finalResults.ux.issues?.length || 0}`);
      console.log(`   Security vulnerabilities count: ${finalResults.security.vulnerabilities?.length || 0}`);
      
    } catch (error) {
      console.error(`❌ [Scan ${scanId}] Failed:`, error.message);
      scanResult.status = 'error';
      scanResult.error = error.message;
      scanResult.progress = 100;
    }
  })();
});

/**
 * GET /api/scan/:id
 * Get scan status and results
 */
app.get('/api/scan/:id', (req, res) => {
  const scanId = parseInt(req.params.id);
  const scanResult = scanResults.get(scanId);

  if (!scanResult) {
    return res.status(404).json({ error: 'Scan not found' });
  }

  res.json(scanResult);
});

/**
 * GET /api/scans
 * Get all scans (for history)
 */
app.get('/api/scans', (req, res) => {
  const allScans = Array.from(scanResults.values())
    .map(scan => ({
      id: scan.id,
      url: scan.url,
      timestamp: scan.timestamp,
      status: scan.status,
      progress: scan.progress,
      results: scan.results ? {
        overall: scan.results.overall,
        performance: { score: scan.results.performance.score },
        seo: { score: scan.results.seo.score },
        ux: { score: scan.results.ux.score },
        security: { score: scan.results.security.score }
      } : null
    }))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json(allScans);
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 SiteSense API Server running on http://localhost:${PORT}`);
  console.log(`📊 Ready to receive scan requests at POST /api/scan`);
});

module.exports = app;
