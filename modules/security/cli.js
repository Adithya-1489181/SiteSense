#!/usr/bin/env node

/**
 * SiteSense Security Module - Command Line Interface
 * Provides command-line access to security scanning functionality
 */

import { runSecurityAudit } from './index.js';
import { readFileInput, parseCommandLineArgs } from './src/utils.js';

/**
 * Display help information
 */
function displayHelp() {
  console.log(`
🛡️  SiteSense Security Module CLI

USAGE:
  node cli.js <input-file.json>                    # Scan from JSON file
  node cli.js --url <url> [options]                # Quick single URL scan
  node cli.js --urls <url1,url2,...> [options]     # Batch URL scan
  node cli.js --help                               # Show this help

INPUT FILE FORMAT:
  {
    "endpoints": ["https://site1.com", "https://site2.com/page"],
    "outputFile": "security-results.json",
    "options": {
      "maxDepth": 5,
      "timeout": 300000,
      "passiveScanOnly": false,
      "batchSize": 5,
      "skipCrawling": false,
      "endpoints": ["https://site1.com/api", "https://site1.com/login"]
    }
  }

OPTIONS:
  --url <url>              Single URL to scan
  --urls <url1,url2,...>   Comma-separated list of URLs to scan
  --output <file>          Output file path (default: security-results.json)
  --depth <number>         Spider crawl depth (default: 5, ignored if --no-crawl)
  --timeout <ms>           Scan timeout in milliseconds (default: 300000)
  --passive-only           Run only passive scans (faster)
  --batch-size <number>    Number of URLs per batch (default: 5)
  --exclude <patterns>     Comma-separated URL patterns to exclude
  --no-crawl               Skip crawling, scan only provided endpoints
  --endpoints <urls>       Specific endpoints to scan (comma-separated)
  --quiet                  Minimal logging output
  --verbose                Enable verbose logging
  --help                   Show this help message

EXAMPLES:
  # Scan from JSON file
  node cli.js input.json

  # Single URL scan with crawling
  node cli.js --url https://yoursite.com

  # Multiple URLs scan
  node cli.js --urls "https://site1.com,https://site2.com"

  # Endpoint-only scan (no crawling)
  node cli.js --no-crawl --endpoints "https://yoursite.com/api,https://yoursite.com/login"

  # Passive scan only
  node cli.js --url https://yoursite.com --passive-only

PREREQUISITES:
  - OWASP ZAP installed and accessible in PATH
  - OR ZAP running as daemon on localhost:8080
  - OR ZAP Docker container running

For more information, see README.md
  `);
}

/**
 * Main CLI entry point
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
      displayHelp();
      return;
    }

    // Parse command line arguments
    const config = parseCommandLineArgs(args);
    
    if (config.verbose) {
      console.log('🔧 Configuration:', JSON.stringify(config, null, 2));
    }

    let results;

    // Handle different input modes
    if (config.inputFile) {
      // File-based input
      console.log(`📂 Loading configuration from: ${config.inputFile}`);
      const inputData = await readFileInput(config.inputFile);
      
      // Merge CLI options with file options
      const mergedInput = {
        ...inputData,
        outputFile: config.outputFile || inputData.outputFile,
        options: {
          ...inputData.options,
          ...config.options
        }
      };
      
      results = await runSecurityAudit(mergedInput);
      
    } else if (config.url) {
      // Single URL scan
      console.log(`🎯 Scanning single URL: ${config.url}`);
      
      const input = {
        endpoints: [config.url],
        outputFile: config.outputFile,
        options: config.options
      };
      
      results = await runSecurityAudit(input);
      
    } else if (config.urls && config.urls.length > 0) {
      // Multiple URLs scan
      console.log(`🔄 Scanning ${config.urls.length} URLs`);
      
      const input = {
        endpoints: config.urls,
        outputFile: config.outputFile,
        options: config.options
      };
      
      results = await runSecurityAudit(input);
      
    } else {
      console.error('❌ Error: No input provided. Use --help for usage information.');
      process.exit(1);
    }

    // Display summary
    if (results) {
      displayResultsSummary(results);
      console.log('\n🎉 Security scan completed successfully!');
      
      if (config.outputFile) {
        console.log(`💾 Detailed results saved to: ${config.outputFile}`);
      }
    }

  } catch (error) {
    console.error(`\n❌ CLI Error: ${error.message}`);
    
    if (error.message.includes('ZAP')) {
      console.log('\n💡 ZAP Troubleshooting:');
      console.log('  1. Ensure OWASP ZAP is installed');
      console.log('  2. Try running: npm run start-zap');
      console.log('  3. Or start ZAP manually: zap.sh -daemon -port 8080');
      console.log('  4. Check ZAP is running: curl http://localhost:8080/JSON/core/view/version/');
    }
    
    if (error.message.includes('timeout')) {
      console.log('\n💡 Timeout Troubleshooting:');
      console.log('  1. Try increasing timeout: --timeout 600000');
      console.log('  2. Use quick mode: --quick');
      console.log('  3. Reduce scan depth: --depth 2');
    }
    
    process.exit(1);
  }
}

/**
 * Display a concise summary of scan results
 */
function displayResultsSummary(results) {
  const { summary, websites, metadata } = results;
  
  console.log('\n' + '='.repeat(60));
  console.log('🛡️  SECURITY SCAN SUMMARY');
  console.log('='.repeat(60));
  
  // Overall metrics
  console.log(`📊 Overall Security Score: ${summary.overallSecurityScore}/100 (${summary.securityGrade})`);
  console.log(`🎯 Total Issues Found: ${summary.totalIssues}`);
  console.log(`🌐 Websites Scanned: ${websites.length}`);
  
  // Risk distribution
  console.log('\n📈 Risk Distribution:');
  console.log(`   🔴 High Risk: ${summary.riskDistribution.high}`);
  console.log(`   🟡 Medium Risk: ${summary.riskDistribution.medium}`);
  console.log(`   🟢 Low Risk: ${summary.riskDistribution.low}`);
  console.log(`   ℹ️  Informational: ${summary.riskDistribution.informational}`);
  
  // Critical findings
  if (summary.criticalFindings.length > 0) {
    console.log('\n🚨 Critical Findings:');
    summary.criticalFindings.slice(0, 5).forEach((finding, idx) => {
      console.log(`   ${idx + 1}. ${finding.title} (Impact: ${finding.impactScore}/10)`);
    });
  }
  
  // Top vulnerabilities
  if (summary.topVulnerabilities.length > 0) {
    console.log('\n🔍 Top Vulnerabilities:');
    summary.topVulnerabilities.slice(0, 5).forEach((vuln, idx) => {
      console.log(`   ${idx + 1}. ${vuln.title} - ${vuln.risk} Risk (${vuln.occurrences} occurrences)`);
    });
  }
  
  // Per-website summary
  if (websites.length > 1) {
    console.log('\n🌐 Per-Website Summary:');
    websites.forEach((website, idx) => {
      const riskScore = website.summary.overallRiskScore;
      const riskIcon = riskScore >= 8 ? '🔴' : riskScore >= 5 ? '🟡' : '🟢';
      console.log(`   ${idx + 1}. ${website.website}`);
      console.log(`      ${riskIcon} Risk Score: ${riskScore}/10 | Issues: ${website.summary.totalIssues}`);
    });
  }
  
  // Scan metadata
  if (metadata) {
    console.log('\n📋 Scan Details:');
    console.log(`   ✅ Successful Scans: ${metadata.successfulScans}/${metadata.totalScans}`);
    if (metadata.failedScans > 0) {
      console.log(`   ❌ Failed Scans: ${metadata.failedScans}`);
    }
    console.log(`   ⏱️  Scan Time: ${new Date(metadata.scanTimestamp).toLocaleString()}`);
    if (metadata.zapVersion) {
      console.log(`   🔧 ZAP Version: ${metadata.zapVersion}`);
    }
  }
  
  console.log('='.repeat(60));
}

/**
 * Handle process signals for graceful shutdown
 */
process.on('SIGINT', () => {
  console.log('\n\n🛑 Scan interrupted by user. Cleaning up...');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Scan terminated. Cleaning up...');
  process.exit(143);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Execute main function
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});