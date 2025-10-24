import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

/**
 * Calculate impact factor based on audit score and weight
 */
function calculateImpact(score, weight) {
  if (score >= 0.9) return 'Low';
  if (score >= 0.5 && weight >= 5) return 'High';
  if (score >= 0.5 || weight >= 3) return 'Medium';
  return 'High';
}

/**
 * Calculate effort factor for fixing the issue
 */
function calculateEffort(audit) {
  const highEffortAudits = [
    'unused-javascript', 'legacy-javascript', 'total-byte-weight', 
    'modern-image-formats', 'uses-responsive-images', 'offscreen-images', 
    'unminified-javascript', 'unminified-css', 'efficient-animated-content',
    'server-response-time', 'redirects', 'uses-rel-preconnect'
  ];
  const lowEffortAudits = [
    'meta-description', 'document-title', 'image-alt', 'link-text', 
    'crawlable-anchors', 'canonical', 'robots-txt', 'hreflang',
    'viewport', 'http-status-code'
  ];
  if (highEffortAudits.includes(audit.id)) return 'High';
  if (lowEffortAudits.includes(audit.id)) return 'Low';
  return 'Medium';
}

/**
 * Extract issues from audit results
 */
function extractIssues(audits, category, pageUrl) {
  const issues = [];
  for (const [auditId, audit] of Object.entries(audits)) {
    if (audit.score !== null && audit.score < 1) {
      const issue = {
        id: auditId,
        title: audit.title,
        description: audit.description,
        score: audit.score,
        displayValue: audit.displayValue || null,
        impact: calculateImpact(audit.score, audit.weight || 0),
        effort: calculateEffort(audit),
        category: category,
        page: pageUrl
      };
      if (audit.details && audit.details.items && Array.isArray(audit.details.items)) {
        issue.itemCount = audit.details.items.length;
        issue.details = audit.details.items.slice(0, 5);
      }
      issues.push(issue);
    }
  }
  const impactOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
  issues.sort((a, b) => {
    if (impactOrder[a.impact] !== impactOrder[b.impact]) {
      return impactOrder[a.impact] - impactOrder[b.impact];
    }
    return a.score - b.score;
  });
  return issues;
}

/**
 * Run Lighthouse audit for a single URL
 */
async function auditSinglePage(url, chrome) {
  const options = {
    logLevel: 'error',
    output: 'json',
    onlyCategories: ['performance', 'seo'],
    port: chrome.port,
    // Add more conservative settings
    throttling: {
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0,
      cpuSlowdownMultiplier: 1
    }
  };

  try {
    const runnerResult = await lighthouse(url, options);
    const lhr = runnerResult.lhr;

    const performanceScore = lhr.categories.performance.score * 100;
    const seoScore = lhr.categories.seo.score * 100;

    const performanceIssues = extractIssues(
      lhr.audits,
      'performance',
      url
    ).filter(issue => {
      const perfAuditRefs = lhr.categories.performance.auditRefs.map(ref => ref.id);
      return perfAuditRefs.includes(issue.id);
    });

    const seoIssues = extractIssues(
      lhr.audits,
      'seo',
      url
    ).filter(issue => {
      const seoAuditRefs = lhr.categories.seo.auditRefs.map(ref => ref.id);
      return seoAuditRefs.includes(issue.id);
    });

    return {
      url,
      performanceScore,
      seoScore,
      performanceIssues,
      seoIssues,
      metrics: {
        firstContentfulPaint: lhr.audits['first-contentful-paint']?.numericValue,
        largestContentfulPaint: lhr.audits['largest-contentful-paint']?.numericValue,
        totalBlockingTime: lhr.audits['total-blocking-time']?.numericValue,
        cumulativeLayoutShift: lhr.audits['cumulative-layout-shift']?.numericValue,
        speedIndex: lhr.audits['speed-index']?.numericValue,
      }
    };
  } catch (error) {
    console.error(`Lighthouse audit failed for ${url}:`, error.message);
    throw new Error(`Audit failed for ${url}: ${error.message}`);
  }
}

/**
 * Main function to audit multiple endpoints with proper resource management
 */
export async function auditMultipleEndpoints(endpoints, batchId = 0) {
  // Use different ports for each batch to avoid conflicts
  const basePort = 9222 + (batchId * 10);
  const chrome = await chromeLauncher.launch({ 
    chromeFlags: ['--headless', '--no-sandbox', '--disable-dev-shm-usage'],
    port: basePort
  });
  
  try {
    const results = [];
    
    // Add small delay between audits within a batch to reduce resource pressure
    for (let i = 0; i < endpoints.length; i++) {
      const endpoint = endpoints[i];
      console.log(`Auditing: ${endpoint}`);
      
      try {
        const result = await auditSinglePage(endpoint, chrome);
        results.push(result);
        
        // Small delay between audits in the same batch
        if (i < endpoints.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Failed to audit ${endpoint}:`, error.message);
        // Continue with other endpoints in the batch
      }
    }

    // Calculate overall scores (weighted average)
    const overallPerformanceScore = results.reduce((sum, r) => sum + r.performanceScore, 0) / results.length;
    const overallSeoScore = results.reduce((sum, r) => sum + r.seoScore, 0) / results.length;

    // Aggregate all issues
    const allPerformanceIssues = results.flatMap(r => r.performanceIssues);
    const allSeoIssues = results.flatMap(r => r.seoIssues);

    // Group issues by ID and aggregate
    const groupedPerformanceIssues = groupIssuesByType(allPerformanceIssues);
    const groupedSeoIssues = groupIssuesByType(allSeoIssues);

    return {
      summary: {
        totalPages: endpoints.length,
        overallPerformanceScore: Math.round(overallPerformanceScore),
        overallSeoScore: Math.round(overallSeoScore),
        performanceGrade: getGrade(overallPerformanceScore),
        seoGrade: getGrade(overallSeoScore),
        timestamp: new Date().toISOString()
      },
      pageResults: results.map(r => ({
        url: r.url,
        performanceScore: Math.round(r.performanceScore),
        seoScore: Math.round(r.seoScore),
        metrics: r.metrics
      })),
      issues: {
        performance: groupedPerformanceIssues,
        seo: groupedSeoIssues
      },
      detailedPageIssues: results.map(r => ({
        url: r.url,
        performanceIssueCount: r.performanceIssues.length,
        seoIssueCount: r.seoIssues.length,
        performanceIssues: r.performanceIssues,
        seoIssues: r.seoIssues
      }))
    };
  } finally {
    await chrome.kill();
  }
}

/**
 * Group issues by type and aggregate information
 */
function groupIssuesByType(issues) {
  const grouped = {};
  
  issues.forEach(issue => {
    if (!grouped[issue.id]) {
      grouped[issue.id] = {
        id: issue.id,
        title: issue.title,
        description: issue.description,
        category: issue.category,
        impact: issue.impact,
        effort: issue.effort,
        affectedPages: [],
        averageScore: 0,
        occurrences: 0
      };
    }
    
    grouped[issue.id].affectedPages.push({
      url: issue.page,
      score: issue.score,
      displayValue: issue.displayValue
    });
    grouped[issue.id].averageScore += issue.score;
    grouped[issue.id].occurrences += 1;
  });

  // Calculate average scores and sort
  const result = Object.values(grouped).map(issue => {
    issue.averageScore = (issue.averageScore / issue.occurrences).toFixed(2);
    return issue;
  });

  // Sort by impact and then by average score
  const impactOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
  result.sort((a, b) => {
    if (impactOrder[a.impact] !== impactOrder[b.impact]) {
      return impactOrder[a.impact] - impactOrder[b.impact];
    }
    return parseFloat(a.averageScore) - parseFloat(b.averageScore);
  });

  return result;
}

/**
 * Get grade based on score
 */
function getGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}
