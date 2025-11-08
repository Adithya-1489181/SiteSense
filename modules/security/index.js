/**
 * SiteSense Security Module - Main Entry Point
 * Integrates OWASP ZAP security scanning with crawler input
 * Returns formatted security audit results with impact/effort analysis
 */

import { ZAPClient } from './src/zap-client.js';
import { processZAPResults, generateSecuritySummary } from './src/evaluator.js';
import { validateInput, extractUniqueUrls, writeResults } from './src/utils.js';

/**
 * Main security audit function - accepts crawler JSON input
 * @param {Object} input - Input configuration from crawler or manual
 * @param {string[]} input.endpoints - Array of URLs to scan (from crawler)
 * @param {string} [input.outputFile] - Optional output file path
 * @param {Object} [input.options] - Scan options
 * @param {number} [input.options.maxDepth] - Spider crawl depth (default: 5)
 * @param {number} [input.options.timeout] - Scan timeout in ms (default: 300000)
 * @param {boolean} [input.options.passiveScanOnly] - Run only passive scans (default: false)
 * @param {string[]} [input.options.excludeUrls] - URLs to exclude from scanning
 * @returns {Promise<Object>} Security audit results
 */
export async function runSecurityAudit(input) {
  const startTime = Date.now();
  console.log('\n🛡️ Starting SiteSense Security Audit...');
  
  try {
    // Validate input
    validateInput(input);
    
    const { endpoints, outputFile, options = {} } = input;
    
    // Extract unique URLs and domains
    const uniqueUrls = extractUniqueUrls(endpoints);
    console.log(`📊 Scanning ${uniqueUrls.length} unique URLs`);
    
    // Initialize ZAP client with performance optimizations
    const zapClient = new ZAPClient({
      timeout: options.timeout || 180000, // Reduced default timeout
      maxRetries: 3,
      quiet: options.quiet || false,
      fast: options.fast !== false // Enable fast mode by default
    });
    
    let allResults = [];
    let processedUrls = 0;
    
    try {
      // Process URLs in batches to avoid overwhelming ZAP
      const batchSize = options.batchSize || 5;
      const batches = createBatches(uniqueUrls, batchSize);
      
      console.log(`🔄 Processing ${batches.length} batches of URLs`);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`\n📦 Processing batch ${i + 1}/${batches.length} (${batch.length} URLs)`);
        
        try {
          const batchResults = await processBatch(zapClient, batch, options);
          allResults.push(...batchResults);
          processedUrls += batch.length;
          
          console.log(`✅ Batch ${i + 1} completed (${processedUrls}/${uniqueUrls.length} URLs processed)`);
          
          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (batchError) {
          console.error(`❌ Batch ${i + 1} failed:`, batchError.message);
          // Continue with other batches
          continue;
        }
      }
      
    } finally {
      // Always attempt to shutdown ZAP
      await zapClient.shutdown();
    }
    
    // Process and format results
    const formattedResults = await formatSecurityResults(allResults, input);
    
    // Write results to file if specified
    if (outputFile) {
      await writeResults(formattedResults, outputFile);
      console.log(`💾 Results saved to: ${outputFile}`);
    }
    
    // Generate summary
    const executionTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n✅ Security audit completed in ${executionTime}s`);
    console.log(generateSecuritySummary(formattedResults));
    
    return formattedResults;
    
  } catch (error) {
    console.error('\n❌ Security audit failed:', error.message);
    throw error;
  }
}

/**
 * Process a batch of URLs through ZAP scanning
 */
async function processBatch(zapClient, urls, options) {
  const batchResults = [];
  
  // Ensure ZAP is running for this batch
  await zapClient.startZAP();
  await zapClient.configureZAP();
  
  for (const url of urls) {
    try {
      console.log(`🎯 Scanning: ${url}`);
      
      // Skip excluded URLs
      if (options.excludeUrls && options.excludeUrls.some(excluded => url.includes(excluded))) {
        console.log(`⏭️ Skipping excluded URL: ${url}`);
        continue;
      }
      
      // Perform security scan
      const scanOptions = {
        maxDepth: options.maxDepth || 5,
        passiveScanOnly: options.passiveScanOnly || false,
        skipCrawling: options.skipCrawling || false,
        endpoints: options.endpoints || []
      };
      
      const scanResult = await zapClient.fullScan(url, scanOptions);
      
      batchResults.push({
        ...scanResult,
        scanUrl: url,
        success: true
      });
      
      console.log(`✅ Completed scan for: ${url}`);
      
    } catch (error) {
      console.error(`❌ Failed to scan ${url}:`, error.message);
      
      // Add failed result to maintain consistency
      batchResults.push({
        scanUrl: url,
        success: false,
        error: error.message,
        alerts: [],
        discoveredUrls: [],
        scanTimestamp: new Date().toISOString()
      });
    }
  }
  
  return batchResults;
}

/**
 * Format raw ZAP results into SiteSense security report format
 */
async function formatSecurityResults(rawResults, originalInput) {
  try {
    // Combine all scan results
    const allAlerts = [];
    const allDiscoveredUrls = [];
    const scanMetadata = {
      totalScans: rawResults.length,
      successfulScans: rawResults.filter(r => r.success).length,
      failedScans: rawResults.filter(r => !r.success).length,
      scanDuration: null,
      scanTimestamp: new Date().toISOString()
    };
    
    // Aggregate results from all scans
    rawResults.forEach(result => {
      if (result.success && result.alerts) {
        allAlerts.push(...result.alerts);
      }
      if (result.discoveredUrls) {
        allDiscoveredUrls.push(...result.discoveredUrls);
      }
    });
    
    // Process combined results
    const processedResults = processZAPResults({
      alerts: allAlerts,
      discoveredUrls: allDiscoveredUrls,
      targetUrl: originalInput.endpoints?.[0] || 'Multiple URLs',
      scanTimestamp: scanMetadata.scanTimestamp
    });
    
    // Enhance with additional metadata
    const enhancedResults = {
      ...processedResults,
      metadata: {
        ...scanMetadata,
        originalInput: {
          endpoints: originalInput.endpoints?.length || 0,
          options: originalInput.options || {}
        },
        zapVersion: await getZAPVersion(),
        moduleVersion: '1.0.0'
      },
      recommendations: generateSecurityRecommendations(processedResults)
    };
    
    return enhancedResults;
    
  } catch (error) {
    console.error('❌ Error formatting security results:', error.message);
    throw error;
  }
}

/**
 * Generate security recommendations based on findings
 */
function generateSecurityRecommendations(results) {
  const recommendations = [];
  const { summary } = results;
  
  // High-level recommendations based on findings
  if (summary.riskDistribution.high > 0) {
    recommendations.push({
      priority: 'Critical',
      title: 'Address High-Risk Vulnerabilities Immediately',
      description: `${summary.riskDistribution.high} high-risk vulnerabilities found that require immediate attention.`,
      effort: 'High',
      impact: 'High'
    });
  }
  
  if (summary.overallSecurityScore < 60) {
    recommendations.push({
      priority: 'High',
      title: 'Implement Comprehensive Security Review',
      description: 'Overall security score is below acceptable threshold. Consider a complete security audit.',
      effort: 'High',
      impact: 'High'
    });
  }
  
  // Specific recommendations based on common issues
  const commonIssues = summary.topVulnerabilities.slice(0, 3);
  commonIssues.forEach(issue => {
    recommendations.push({
      priority: issue.risk === 'High' ? 'Critical' : issue.risk === 'Medium' ? 'High' : 'Medium',
      title: `Fix ${issue.title}`,
      description: `Found in ${issue.occurrences} locations. This ${issue.risk.toLowerCase()}-risk issue should be addressed.`,
      effort: issue.effort,
      impact: issue.risk
    });
  });
  
  // Security best practices recommendations
  if (summary.riskDistribution.low + summary.riskDistribution.informational > 10) {
    recommendations.push({
      priority: 'Medium',
      title: 'Implement Security Headers',
      description: 'Multiple security header issues found. Implement comprehensive security headers.',
      effort: 'Low',
      impact: 'Medium'
    });
  }
  
  return recommendations.slice(0, 10); // Limit to top 10 recommendations
}

/**
 * Get ZAP version information
 */
async function getZAPVersion() {
  try {
    const zapClient = new ZAPClient();
    const status = await zapClient.getStatus();
    return status.version || 'Unknown';
  } catch (error) {
    return 'Unknown';
  }
}

/**
 * Create batches of URLs for processing
 */
function createBatches(urls, batchSize) {
  const batches = [];
  for (let i = 0; i < urls.length; i += batchSize) {
    batches.push(urls.slice(i, i + batchSize));
  }
  return batches;
}



// Export main function
export default {
  runSecurityAudit
};