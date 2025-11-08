/**
 * Security Module Utilities
 * Input validation, URL processing, and result formatting functions
 */

import { promises as fs } from 'fs';
import { URL } from 'url';
import path from 'path';

/**
 * Validate input configuration for security audit
 * @param {Object} input - Input configuration
 * @throws {Error} If validation fails
 */
export function validateInput(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Input must be an object');
  }

  // Check for endpoints
  if (!input.endpoints || !Array.isArray(input.endpoints)) {
    throw new Error('Input must contain an "endpoints" array');
  }

  if (input.endpoints.length === 0) {
    throw new Error('At least one endpoint is required');
  }

  if (input.endpoints.length > 50) {
    throw new Error('Maximum 50 endpoints allowed per security audit');
  }

  // Validate each endpoint URL
  for (const endpoint of input.endpoints) {
    if (typeof endpoint !== 'string') {
      throw new Error(`Invalid endpoint: ${endpoint} must be a string`);
    }

    if (!isValidUrl(endpoint)) {
      throw new Error(`Invalid URL: ${endpoint}`);
    }
  }

  // Validate output file if provided
  if (input.outputFile && typeof input.outputFile !== 'string') {
    throw new Error('outputFile must be a string');
  }

  // Validate options if provided
  if (input.options && typeof input.options !== 'object') {
    throw new Error('options must be an object');
  }

  // Validate specific options
  if (input.options) {
    const { maxDepth, timeout, batchSize, excludeUrls } = input.options;
    
    if (maxDepth !== undefined && (!Number.isInteger(maxDepth) || maxDepth < 1 || maxDepth > 10)) {
      throw new Error('maxDepth must be an integer between 1 and 10');
    }
    
    if (timeout !== undefined && (!Number.isInteger(timeout) || timeout < 10000 || timeout > 1800000)) {
      throw new Error('timeout must be an integer between 10000 (10s) and 1800000 (30min)');
    }
    
    if (batchSize !== undefined && (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 20)) {
      throw new Error('batchSize must be an integer between 1 and 20');
    }
    
    if (excludeUrls !== undefined && !Array.isArray(excludeUrls)) {
      throw new Error('excludeUrls must be an array of strings');
    }
  }

  console.log('✅ Input validation passed');
}

/**
 * Check if a string is a valid URL
 * @param {string} urlString - URL to validate
 * @returns {boolean} True if valid URL
 */
export function isValidUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Extract unique URLs from input endpoints, removing duplicates and normalizing
 * @param {string[]} endpoints - Array of URL strings
 * @returns {string[]} Array of unique, normalized URLs
 */
export function extractUniqueUrls(endpoints) {
  const uniqueUrls = new Set();
  const processedUrls = [];
  
  for (const endpoint of endpoints) {
    try {
      const url = new URL(endpoint);
      
      // Normalize URL (remove fragment, sort query params)
      const normalizedUrl = normalizeUrl(url);
      
      if (!uniqueUrls.has(normalizedUrl)) {
        uniqueUrls.add(normalizedUrl);
        processedUrls.push(normalizedUrl);
      }
    } catch (error) {
      console.warn(`⚠️ Skipping invalid URL: ${endpoint}`);
    }
  }
  
  console.log(`📊 Processed ${endpoints.length} endpoints into ${processedUrls.length} unique URLs`);
  return processedUrls;
}

/**
 * Normalize URL for consistent processing
 * @param {URL} url - URL object
 * @returns {string} Normalized URL string
 */
function normalizeUrl(url) {
  // Remove fragment
  url.hash = '';
  
  // Sort query parameters for consistency
  const params = new URLSearchParams(url.search);
  const sortedParams = new URLSearchParams();
  
  [...params.keys()].sort().forEach(key => {
    sortedParams.append(key, params.get(key));
  });
  
  url.search = sortedParams.toString();
  
  // Remove trailing slash from pathname (except root)
  if (url.pathname !== '/' && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1);
  }
  
  return url.toString();
}

/**
 * Write security audit results to file
 * @param {Object} results - Security audit results
 * @param {string} outputFile - Output file path
 */
export async function writeResults(results, outputFile) {
  try {
    // Ensure output directory exists
    const outputDir = path.dirname(outputFile);
    await fs.mkdir(outputDir, { recursive: true });
    
    // Write JSON results
    const jsonOutput = JSON.stringify(results, null, 2);
    await fs.writeFile(outputFile, jsonOutput, 'utf-8');
    
    // Also write a human-readable summary
    const summaryFile = outputFile.replace(/\.json$/, '-summary.txt');
    const textSummary = generateTextSummary(results);
    await fs.writeFile(summaryFile, textSummary, 'utf-8');
    
    console.log(`✅ Results written to: ${outputFile}`);
    console.log(`📄 Summary written to: ${summaryFile}`);
    
  } catch (error) {
    console.error(`❌ Failed to write results to ${outputFile}:`, error.message);
    throw error;
  }
}

/**
 * Generate human-readable text summary of security results
 * @param {Object} results - Security audit results
 * @returns {string} Text summary
 */
function generateTextSummary(results) {
  const { summary, websites, metadata, recommendations } = results;
  
  let report = '';
  report += '='.repeat(80) + '\n';
  report += 'SITESENSE SECURITY AUDIT REPORT\n';
  report += '='.repeat(80) + '\n';
  report += `Generated: ${new Date().toLocaleString()}\n`;
  report += `Module Version: ${metadata?.moduleVersion || '1.0.0'}\n`;
  report += `ZAP Version: ${metadata?.zapVersion || 'Unknown'}\n\n`;
  
  // Executive Summary
  report += 'EXECUTIVE SUMMARY\n';
  report += '-'.repeat(40) + '\n';
  report += `Overall Security Score: ${summary.overallSecurityScore}/100 (Grade: ${summary.securityGrade})\n`;
  report += `Total Security Issues: ${summary.totalIssues}\n`;
  report += `Websites Scanned: ${websites.length}\n`;
  report += `Scan Success Rate: ${metadata ? Math.round((metadata.successfulScans / metadata.totalScans) * 100) : 100}%\n\n`;
  
  // Risk Distribution
  report += 'RISK DISTRIBUTION\n';
  report += '-'.repeat(40) + '\n';
  report += `High Risk Issues: ${summary.riskDistribution.high}\n`;
  report += `Medium Risk Issues: ${summary.riskDistribution.medium}\n`;
  report += `Low Risk Issues: ${summary.riskDistribution.low}\n`;
  report += `Informational Issues: ${summary.riskDistribution.informational}\n\n`;
  
  // Critical Findings
  if (summary.criticalFindings.length > 0) {
    report += 'CRITICAL FINDINGS (HIGH RISK)\n';
    report += '-'.repeat(40) + '\n';
    summary.criticalFindings.forEach((finding, idx) => {
      report += `${idx + 1}. ${finding.title}\n`;
      report += `   Impact Score: ${finding.impactScore}/10\n`;
      report += `   Affected URLs: ${finding.affectedUrls}\n\n`;
    });
  }
  
  // Top Vulnerabilities
  if (summary.topVulnerabilities.length > 0) {
    report += 'TOP VULNERABILITIES\n';
    report += '-'.repeat(40) + '\n';
    summary.topVulnerabilities.slice(0, 10).forEach((vuln, idx) => {
      report += `${idx + 1}. ${vuln.title}\n`;
      report += `   Risk: ${vuln.risk} | Impact: ${vuln.impact}/10 | Effort: ${vuln.effort}\n`;
      report += `   Occurrences: ${vuln.occurrences}\n\n`;
    });
  }
  
  // Per-Website Results
  if (websites.length > 1) {
    report += 'WEBSITE-SPECIFIC RESULTS\n';
    report += '-'.repeat(40) + '\n';
    websites.forEach((website, idx) => {
      report += `${idx + 1}. ${website.website}\n`;
      report += `   Domain: ${website.domain}\n`;
      report += `   Risk Score: ${website.summary.overallRiskScore}/10\n`;
      report += `   Total Issues: ${website.summary.totalIssues}\n`;
      report += `   High: ${website.summary.high || 0} | Medium: ${website.summary.medium || 0} | Low: ${website.summary.low || 0}\n\n`;
    });
  }
  
  // Recommendations
  if (recommendations && recommendations.length > 0) {
    report += 'SECURITY RECOMMENDATIONS\n';
    report += '-'.repeat(40) + '\n';
    recommendations.forEach((rec, idx) => {
      report += `${idx + 1}. [${rec.priority}] ${rec.title}\n`;
      report += `   ${rec.description}\n`;
      report += `   Effort: ${rec.effort} | Impact: ${rec.impact}\n\n`;
    });
  }
  
  // Detailed Website Issues
  report += 'DETAILED VULNERABILITY BREAKDOWN\n';
  report += '-'.repeat(40) + '\n';
  websites.forEach((website, idx) => {
    if (website.issues.length > 0) {
      report += `\n${website.website}\n`;
      report += '~'.repeat(website.website.length) + '\n';
      
      website.issues
        .sort((a, b) => {
          const priorityOrder = { 'High': 1, 'Medium': 2, 'Low': 3, 'Informational': 4 };
          return (priorityOrder[a.risk] || 5) - (priorityOrder[b.risk] || 5);
        })
        .forEach((issue, issueIdx) => {
          report += `\n${issueIdx + 1}. ${issue.title} [${issue.risk} Risk]\n`;
          report += `   Impact: ${issue.impactScore}/10 | Effort: ${issue.effort}\n`;
          report += `   Affected URLs: ${issue.affectedUrls.length}\n`;
          if (issue.solution) {
            report += `   Solution: ${issue.solution.substring(0, 200)}${issue.solution.length > 200 ? '...' : ''}\n`;
          }
        });
    }
  });
  
  report += '\n' + '='.repeat(80) + '\n';
  report += `Report generated by SiteSense Security Module v${metadata?.moduleVersion || '1.0.0'}\n`;
  report += 'For detailed remediation guidance, see the JSON output file.\n';
  report += '='.repeat(80) + '\n';
  
  return report;
}

/**
 * Read and validate input from JSON file
 * @param {string} filePath - Path to input JSON file
 * @returns {Object} Parsed and validated input
 */
export async function readFileInput(filePath) {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const input = JSON.parse(fileContent);
    
    // Validate the input
    validateInput(input);
    
    return input;
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Input file not found: ${filePath}`);
    } else if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in input file: ${error.message}`);
    } else {
      throw error;
    }
  }
}

/**
 * Parse command line arguments
 * @param {string[]} args - Command line arguments
 * @returns {Object} Parsed configuration
 */
export function parseCommandLineArgs(args) {
  const config = {
    inputFile: null,
    url: null,
    urls: null,
    outputFile: 'security-results.json',
    options: {},
    verbose: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];
    
    switch (arg) {
      case '--url':
        if (!nextArg) throw new Error('--url requires a URL argument');
        config.url = nextArg;
        i++;
        break;
        
      case '--urls':
        if (!nextArg) throw new Error('--urls requires a comma-separated list of URLs');
        config.urls = nextArg.split(',').map(url => url.trim());
        i++;
        break;
        
      case '--output':
      case '-o':
        if (!nextArg) throw new Error('--output requires a file path');
        config.outputFile = nextArg;
        i++;
        break;
        
      case '--depth':
        if (!nextArg) throw new Error('--depth requires a number');
        config.options.maxDepth = parseInt(nextArg);
        if (isNaN(config.options.maxDepth)) throw new Error('--depth must be a number');
        i++;
        break;
        
      case '--timeout':
        if (!nextArg) throw new Error('--timeout requires a number');
        config.options.timeout = parseInt(nextArg);
        if (isNaN(config.options.timeout)) throw new Error('--timeout must be a number');
        i++;
        break;
        
      case '--batch-size':
        if (!nextArg) throw new Error('--batch-size requires a number');
        config.options.batchSize = parseInt(nextArg);
        if (isNaN(config.options.batchSize)) throw new Error('--batch-size must be a number');
        i++;
        break;
        
      case '--exclude':
        if (!nextArg) throw new Error('--exclude requires a comma-separated list');
        config.options.excludeUrls = nextArg.split(',').map(pattern => pattern.trim());
        i++;
        break;
        
      case '--passive-only':
        config.options.passiveScanOnly = true;
        break;
        
      case '--no-crawl':
        config.options.skipCrawling = true;
        break;
        
      case '--endpoints':
        if (!nextArg) throw new Error('--endpoints requires a comma-separated list of URLs');
        config.options.endpoints = nextArg.split(',').map(url => url.trim());
        config.options.skipCrawling = true; // Auto-enable no-crawl when endpoints provided
        i++;
        break;
        
      case '--quiet':
      case '-q':
        config.options.quiet = true;
        config.verbose = false;
        break;
        
      case '--verbose':
      case '-v':
        config.verbose = true;
        config.options.quiet = false; // Verbose overrides quiet
        break;
        
      default:
        if (!arg.startsWith('--') && !config.inputFile) {
          config.inputFile = arg;
        }
        break;
    }
  }
  
  return config;
}

/**
 * Format file size in human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
export function formatFileSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Format duration in human readable format
 * @param {number} milliseconds - Duration in milliseconds
 * @returns {string} Formatted duration
 */
export function formatDuration(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Get domain from URL
 * @param {string} url - URL string
 * @returns {string} Domain name
 */
export function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown';
  }
}

/**
 * Deep merge two objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} Merged object
 */
export function deepMerge(target, source) {
  const output = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      output[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  }
  
  return output;
}

export default {
  validateInput,
  isValidUrl,
  extractUniqueUrls,
  writeResults,
  readFileInput,
  parseCommandLineArgs,
  formatFileSize,
  formatDuration,
  getDomain,
  deepMerge
};