/**
 * Security Evaluator - Processes OWASP ZAP results into structured security reports
 * Converts raw ZAP alerts into impact/effort categorized security issues
 */

/**
 * Risk and impact mappings based on OWASP standards
 */
export const RISK_LEVELS = {
  'High': { impact: 'High', priority: 1, score: 9-10 },
  'Medium': { impact: 'Medium', priority: 2, score: 6-8 },
  'Low': { impact: 'Low', priority: 3, score: 3-5 },
  'Informational': { impact: 'Low', priority: 4, score: 1-2 }
};

/**
 * Effort estimation based on vulnerability types and common fix complexity
 */
export const EFFORT_MAPPING = {
  // High effort fixes (structural/architectural changes)
  'Cross Site Scripting (XSS)': 'High',
  'SQL Injection': 'High',
  'Path Traversal': 'High',
  'Remote File Inclusion': 'High',
  'XML External Entity (XXE)': 'High',
  'Server Side Request Forgery (SSRF)': 'High',
  'Insecure Direct Object References': 'High',
  'Cross-Site Request Forgery (CSRF)': 'Medium',
  
  // Medium effort fixes (configuration/implementation changes)
  'Missing Anti-clickjacking Header': 'Medium',
  'Content Security Policy (CSP) Header Not Set': 'Medium',
  'X-Content-Type-Options Header Missing': 'Low',
  'X-Frame-Options Header Not Set': 'Low',
  'Strict-Transport-Security Header Not Set': 'Low',
  'Weak Authentication Method': 'Medium',
  'Insecure HTTP Method': 'Medium',
  'Directory Browsing': 'Medium',
  'Session ID in URL Rewrite': 'Medium',
  'Cookie Without SameSite Attribute': 'Low',
  'Cookie Without Secure Flag': 'Low',
  'Cookie Without HttpOnly Flag': 'Low',
  
  // Low effort fixes (header/configuration tweaks)
  'Information Disclosure': 'Low',
  'Server Leaks Version Information': 'Low',
  'Server Leaks Information via "X-Powered-By"': 'Low',
  'Timestamp Disclosure': 'Low',
  'Hash Disclosure': 'Low',
  'Email Disclosure': 'Low',
  'Credit Card Disclosure': 'Low',
  'Private IP Disclosure': 'Low',
  'Session Management Response Identified': 'Low',
};

/**
 * Default effort estimation based on risk level if specific mapping not found
 */
export const DEFAULT_EFFORT_BY_RISK = {
  'High': 'High',
  'Medium': 'Medium', 
  'Low': 'Low',
  'Informational': 'Low'
};

/**
 * Detailed vulnerability information and remediation guidance
 */
export const VULNERABILITY_DETAILS = {
  'Cross Site Scripting (XSS)': {
    description: 'Cross-site scripting vulnerabilities allow attackers to inject malicious scripts into web pages viewed by other users.',
    impact: 'Can lead to session hijacking, data theft, malware distribution, and defacement',
    remediation: 'Implement proper input validation, output encoding, and Content Security Policy (CSP)',
    references: ['https://owasp.org/www-project-top-ten/2017/A7_2017-Cross-Site_Scripting_(XSS)']
  },
  'SQL Injection': {
    description: 'SQL injection vulnerabilities allow attackers to interfere with database queries.',
    impact: 'Can result in unauthorized data access, data manipulation, and complete system compromise',
    remediation: 'Use parameterized queries, stored procedures, and input validation',
    references: ['https://owasp.org/www-project-top-ten/2017/A1_2017-Injection']
  },
  'Missing Anti-clickjacking Header': {
    description: 'X-Frame-Options or CSP frame-ancestors header not configured to prevent clickjacking.',
    impact: 'Attackers can embed your site in malicious frames to trick users into unintended actions',
    remediation: 'Set X-Frame-Options: DENY or SAMEORIGIN, or use CSP frame-ancestors directive',
    references: ['https://owasp.org/www-community/attacks/Clickjacking']
  },
  'Content Security Policy (CSP) Header Not Set': {
    description: 'Content Security Policy header not configured to mitigate XSS and data injection attacks.',
    impact: 'Increased risk of XSS attacks and malicious content injection',
    remediation: 'Implement a strict CSP policy appropriate for your application',
    references: ['https://owasp.org/www-project-secure-headers/#content-security-policy']
  }
};

/**
 * Process ZAP alerts into structured security issues
 */
export function processZAPResults(zapResults) {
  try {
    const { alerts = [], targetUrl, scanTimestamp } = zapResults;
    
    // Group alerts by URL and vulnerability type
    const processedIssues = alerts.map(alert => processAlert(alert));
    
    // Group by website/URL
    const issuesByWebsite = groupIssuesByWebsite(processedIssues, targetUrl);
    
    // Calculate summary statistics
    const summary = calculateSecuritySummary(processedIssues);
    
    return {
      summary,
      websites: issuesByWebsite,
      timestamp: scanTimestamp || new Date().toISOString(),
      totalIssues: processedIssues.length,
      scanTarget: targetUrl
    };
  } catch (error) {
    console.error('❌ Error processing ZAP results:', error.message);
    throw new Error(`Failed to process security results: ${error.message}`);
  }
}

/**
 * Process individual ZAP alert into structured security issue
 */
function processAlert(alert) {
  const {
    pluginId,
    name,
    risk,
    confidence,
    url,
    description,
    solution,
    reference,
    instances = []
  } = alert;

  // Determine effort level
  const effort = determineEffort(name, risk);
  
  // Get detailed information
  const details = VULNERABILITY_DETAILS[name] || {};
  
  // Calculate impact score (1-10 scale)
  const impactScore = calculateImpactScore(risk, confidence);
  
  // Process all instances of this vulnerability
  let affectedUrls = instances.map(instance => ({
    url: instance.uri || url,
    method: instance.method || 'GET',
    param: instance.param || '',
    attack: instance.attack || '',
    evidence: instance.evidence || ''
  }));
  
  // If no instances but we have a main URL, use it
  if (affectedUrls.length === 0 && url) {
    affectedUrls = [{
      url: url,
      method: 'GET',
      param: '',
      attack: '',
      evidence: ''
    }];
  }

  return {
    id: `zap-${pluginId}`,
    title: name,
    description: description || details.description || 'No description available',
    risk: risk,
    confidence: confidence,
    impact: RISK_LEVELS[risk]?.impact || risk,
    effort: effort,
    impactScore: impactScore,
    priority: RISK_LEVELS[risk]?.priority || 5,
    solution: solution || details.remediation || 'No solution provided',
    references: parseReferences(reference) || details.references || [],
    affectedUrls: affectedUrls,
    category: 'security',
    plugin: pluginId,
    occurrences: instances.length || 1
  };
}

/**
 * Determine effort level for fixing a vulnerability
 */
function determineEffort(vulnerabilityName, riskLevel) {
  // First check specific mapping
  if (EFFORT_MAPPING[vulnerabilityName]) {
    return EFFORT_MAPPING[vulnerabilityName];
  }
  
  // Check partial matches for common vulnerability patterns
  const lowerName = vulnerabilityName.toLowerCase();
  
  if (lowerName.includes('xss') || lowerName.includes('cross-site scripting')) {
    return 'High';
  }
  if (lowerName.includes('sql injection') || lowerName.includes('injection')) {
    return 'High';
  }
  if (lowerName.includes('header') && (lowerName.includes('missing') || lowerName.includes('not set'))) {
    return 'Low';
  }
  if (lowerName.includes('cookie') && !lowerName.includes('injection')) {
    return 'Low';
  }
  if (lowerName.includes('information disclosure') || lowerName.includes('leaks')) {
    return 'Low';
  }
  
  // Fall back to risk-based estimation
  return DEFAULT_EFFORT_BY_RISK[riskLevel] || 'Medium';
}

/**
 * Calculate impact score on 1-10 scale
 */
function calculateImpactScore(risk, confidence) {
  const riskScores = {
    'High': 9,
    'Medium': 6,
    'Low': 3,
    'Informational': 1
  };
  
  const confidenceMultiplier = {
    'High': 1.0,
    'Medium': 0.8,
    'Low': 0.6,
    'Informational': 0.4
  };
  
  const baseScore = riskScores[risk] || 5;
  const multiplier = confidenceMultiplier[confidence] || 0.7;
  
  return Math.round(baseScore * multiplier);
}

/**
 * Group security issues by website/domain
 */
function groupIssuesByWebsite(issues, scanTarget = null) {
  const websiteMap = new Map();
  
  issues.forEach(issue => {
    let urlsToProcess = [];
    
    // If issue has affected URLs, use them
    if (issue.affectedUrls && issue.affectedUrls.length > 0) {
      urlsToProcess = issue.affectedUrls;
    } 
    // If no affected URLs but we have a scan target, use that
    else if (scanTarget) {
      urlsToProcess = [{ url: scanTarget }];
    }
    // If neither, skip this issue for website grouping but log it
    else {
      console.warn(`⚠️ Issue "${issue.title}" has no affected URLs and no scan target`);
      return;
    }
    
    urlsToProcess.forEach(urlInfo => {
      try {
        const url = new URL(urlInfo.url);
        const website = `${url.protocol}//${url.host}`;
        
        if (!websiteMap.has(website)) {
          websiteMap.set(website, {
            website: website,
            domain: url.host,
            issues: [],
            summary: {
              totalIssues: 0,
              highRisk: 0,
              mediumRisk: 0,
              lowRisk: 0,
              informational: 0,
              overallRiskScore: 0
            }
          });
        }
        
        const websiteData = websiteMap.get(website);
        
        // Check if this issue already exists for this website
        const existingIssue = websiteData.issues.find(i => i.id === issue.id);
        if (!existingIssue) {
          websiteData.issues.push({
            ...issue,
            affectedUrls: urlsToProcess.filter(u => {
              try {
                return u.url.startsWith(website) || new URL(u.url).host === url.host;
              } catch (e) {
                return false;
              }
            })
          });
          
          // Update summary counts
          websiteData.summary.totalIssues++;
          const riskKey = issue.risk.toLowerCase();
          websiteData.summary[riskKey] = (websiteData.summary[riskKey] || 0) + 1;
        }
      } catch (error) {
        console.warn(`⚠️ Invalid URL in security results: ${urlInfo.url}`);
      }
    });
  });
  
  // Calculate overall risk scores for each website
  websiteMap.forEach((websiteData, website) => {
    websiteData.summary.overallRiskScore = calculateOverallRiskScore(websiteData.issues);
  });
  
  return Array.from(websiteMap.values());
}

/**
 * Calculate overall risk score for a website
 */
function calculateOverallRiskScore(issues) {
  if (issues.length === 0) return 0;
  
  const totalScore = issues.reduce((sum, issue) => sum + issue.impactScore, 0);
  return Math.round(totalScore / issues.length);
}

/**
 * Calculate security summary statistics
 */
function calculateSecuritySummary(issues) {
  const summary = {
    totalIssues: issues.length,
    riskDistribution: {
      high: 0,
      medium: 0,
      low: 0,
      informational: 0
    },
    effortDistribution: {
      high: 0,
      medium: 0,
      low: 0
    },
    overallSecurityScore: 0,
    securityGrade: 'F',
    topVulnerabilities: [],
    criticalFindings: []
  };
  
  // Count risk and effort distributions
  issues.forEach(issue => {
    const risk = issue.risk.toLowerCase();
    const effort = issue.effort.toLowerCase();
    
    if (summary.riskDistribution[risk] !== undefined) {
      summary.riskDistribution[risk]++;
    }
    
    if (summary.effortDistribution[effort] !== undefined) {
      summary.effortDistribution[effort]++;
    }
  });
  
  // Calculate overall security score (0-100)
  const maxPossibleScore = 100;
  const highRiskPenalty = summary.riskDistribution.high * 20;
  const mediumRiskPenalty = summary.riskDistribution.medium * 10;
  const lowRiskPenalty = summary.riskDistribution.low * 5;
  
  summary.overallSecurityScore = Math.max(0, maxPossibleScore - highRiskPenalty - mediumRiskPenalty - lowRiskPenalty);
  summary.securityGrade = calculateSecurityGrade(summary.overallSecurityScore);
  
  // Group vulnerabilities by title and aggregate occurrences
  const vulnerabilityGroups = new Map();
  issues.forEach(issue => {
    const key = issue.title;
    if (vulnerabilityGroups.has(key)) {
      const existing = vulnerabilityGroups.get(key);
      existing.occurrences += issue.occurrences;
      existing.totalAffectedUrls += issue.affectedUrls.length;
      // Keep the highest impact score
      if (issue.impactScore > existing.impactScore) {
        existing.impactScore = issue.impactScore;
        existing.risk = issue.risk;
        existing.effort = issue.effort;
      }
    } else {
      vulnerabilityGroups.set(key, {
        title: issue.title,
        risk: issue.risk,
        impactScore: issue.impactScore,
        effort: issue.effort,
        occurrences: issue.occurrences,
        totalAffectedUrls: issue.affectedUrls.length
      });
    }
  });

  // Get top vulnerabilities by impact (grouped and deduplicated)
  summary.topVulnerabilities = Array.from(vulnerabilityGroups.values())
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, 10)
    .map(vuln => ({
      title: vuln.title,
      risk: vuln.risk,
      impact: vuln.impactScore,
      effort: vuln.effort,
      occurrences: vuln.occurrences
    }));
    
  // Get critical findings (high risk issues, grouped and deduplicated)
  summary.criticalFindings = Array.from(vulnerabilityGroups.values())
    .filter(vuln => vuln.risk === 'High')
    .map(vuln => ({
      title: vuln.title,
      impactScore: vuln.impactScore,
      affectedUrls: vuln.totalAffectedUrls
    }));
  
  return summary;
}

/**
 * Calculate security grade based on score
 */
function calculateSecurityGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Parse reference URLs from ZAP alert
 */
function parseReferences(referenceString) {
  if (!referenceString) return [];
  
  // Split by common delimiters and extract URLs
  const urls = referenceString
    .split(/[\n\r,;]/)
    .map(ref => ref.trim())
    .filter(ref => ref.startsWith('http'))
    .slice(0, 5); // Limit to 5 references
    
  return urls;
}

/**
 * Generate security report summary text
 */
export function generateSecuritySummary(results) {
  const { summary, websites } = results;
  
  let report = `\n=== SECURITY AUDIT SUMMARY ===\n`;
  report += `Overall Security Score: ${summary.overallSecurityScore}/100 (Grade: ${summary.securityGrade})\n`;
  report += `Total Issues Found: ${summary.totalIssues}\n\n`;
  
  report += `=== RISK DISTRIBUTION ===\n`;
  report += `High Risk: ${summary.riskDistribution.high}\n`;
  report += `Medium Risk: ${summary.riskDistribution.medium}\n`;
  report += `Low Risk: ${summary.riskDistribution.low}\n`;
  report += `Informational: ${summary.riskDistribution.informational}\n\n`;
  
  if (summary.criticalFindings.length > 0) {
    report += `=== CRITICAL FINDINGS ===\n`;
    summary.criticalFindings.forEach((finding, idx) => {
      report += `${idx + 1}. ${finding.title} (Impact: ${finding.impactScore}/10, URLs: ${finding.affectedUrls})\n`;
    });
    report += '\n';
  }
  
  report += `=== WEBSITES SCANNED ===\n`;
  websites.forEach((website, idx) => {
    report += `${idx + 1}. ${website.website}\n`;
    report += `   Risk Score: ${website.summary.overallRiskScore}/10\n`;
    report += `   Issues: ${website.summary.totalIssues} (H:${website.summary.high || 0} M:${website.summary.medium || 0} L:${website.summary.low || 0})\n\n`;
  });
  
  return report;
}

export default {
  processZAPResults,
  generateSecuritySummary,
  RISK_LEVELS,
  EFFORT_MAPPING,
  VULNERABILITY_DETAILS
};