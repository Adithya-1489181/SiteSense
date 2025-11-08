import fs from 'fs/promises';
import { percentageChange, formatTime } from './utils.js';

/**
 * Compare two audit results to track progress
 * @param {string} oldResultPath - Path to previous audit results
 * @param {string} newResultPath - Path to new audit results
 * @returns {Object} Comparison report
 */
export async function compareAudits(oldResultPath, newResultPath) {
  const oldData = JSON.parse(await fs.readFile(oldResultPath, 'utf-8'));
  const newData = JSON.parse(await fs.readFile(newResultPath, 'utf-8'));

  const comparison = {
    timestamp: new Date().toISOString(),
    oldAudit: oldData.summary.timestamp,
    newAudit: newData.summary.timestamp,
    scoreChanges: {
      performance: {
        old: oldData.summary.overallPerformanceScore,
        new: newData.summary.overallPerformanceScore,
        change: newData.summary.overallPerformanceScore - oldData.summary.overallPerformanceScore,
        percentChange: percentageChange(
          oldData.summary.overallPerformanceScore,
          newData.summary.overallPerformanceScore
        ).toFixed(2),
        oldGrade: oldData.summary.performanceGrade,
        newGrade: newData.summary.performanceGrade
      },
      seo: {
        old: oldData.summary.overallSeoScore,
        new: newData.summary.overallSeoScore,
        change: newData.summary.overallSeoScore - oldData.summary.overallSeoScore,
        percentChange: percentageChange(
          oldData.summary.overallSeoScore,
          newData.summary.overallSeoScore
        ).toFixed(2),
        oldGrade: oldData.summary.seoGrade,
        newGrade: newData.summary.seoGrade
      }
    },
    issueChanges: {
      performance: {
        old: oldData.issues.performance.length,
        new: newData.issues.performance.length,
        change: newData.issues.performance.length - oldData.issues.performance.length,
        resolved: findResolvedIssues(oldData.issues.performance, newData.issues.performance),
        new: findNewIssues(oldData.issues.performance, newData.issues.performance)
      },
      seo: {
        old: oldData.issues.seo.length,
        new: newData.issues.seo.length,
        change: newData.issues.seo.length - oldData.issues.seo.length,
        resolved: findResolvedIssues(oldData.issues.seo, newData.issues.seo),
        new: findNewIssues(oldData.issues.seo, newData.issues.seo)
      }
    },
    pageComparisons: comparePages(oldData.pageResults, newData.pageResults)
  };

  return comparison;
}

/**
 * Find issues that were resolved
 */
function findResolvedIssues(oldIssues, newIssues) {
  const newIssueIds = new Set(newIssues.map(i => i.id));
  return oldIssues
    .filter(i => !newIssueIds.has(i.id))
    .map(i => ({ id: i.id, title: i.title, impact: i.impact }));
}

/**
 * Find new issues that appeared
 */
function findNewIssues(oldIssues, newIssues) {
  const oldIssueIds = new Set(oldIssues.map(i => i.id));
  return newIssues
    .filter(i => !oldIssueIds.has(i.id))
    .map(i => ({ id: i.id, title: i.title, impact: i.impact }));
}

/**
 * Compare page results
 */
function comparePages(oldPages, newPages) {
  const comparisons = [];
  
  for (const newPage of newPages) {
    const oldPage = oldPages.find(p => p.url === newPage.url);
    if (!oldPage) continue;

    comparisons.push({
      url: newPage.url,
      performanceScore: {
        old: oldPage.performanceScore,
        new: newPage.performanceScore,
        change: newPage.performanceScore - oldPage.performanceScore
      },
      seoScore: {
        old: oldPage.seoScore,
        new: newPage.seoScore,
        change: newPage.seoScore - oldPage.seoScore
      },
      metrics: {
        fcp: {
          old: oldPage.metrics.firstContentfulPaint,
          new: newPage.metrics.firstContentfulPaint,
          change: newPage.metrics.firstContentfulPaint - oldPage.metrics.firstContentfulPaint,
          changePercent: percentageChange(
            oldPage.metrics.firstContentfulPaint,
            newPage.metrics.firstContentfulPaint
          ).toFixed(2)
        },
        lcp: {
          old: oldPage.metrics.largestContentfulPaint,
          new: newPage.metrics.largestContentfulPaint,
          change: newPage.metrics.largestContentfulPaint - oldPage.metrics.largestContentfulPaint,
          changePercent: percentageChange(
            oldPage.metrics.largestContentfulPaint,
            newPage.metrics.largestContentfulPaint
          ).toFixed(2)
        },
        tbt: {
          old: oldPage.metrics.totalBlockingTime,
          new: newPage.metrics.totalBlockingTime,
          change: newPage.metrics.totalBlockingTime - oldPage.metrics.totalBlockingTime,
          changePercent: percentageChange(
            oldPage.metrics.totalBlockingTime,
            newPage.metrics.totalBlockingTime
          ).toFixed(2)
        }
      }
    });
  }

  return comparisons;
}

/**
 * Generate comparison report text
 */
export function generateComparisonReport(comparison) {
  const lines = [];
  
  lines.push('='.repeat(60));
  lines.push('AUDIT COMPARISON REPORT');
  lines.push('='.repeat(60));
  lines.push('');
  
  lines.push(`Previous Audit: ${new Date(comparison.oldAudit).toLocaleString()}`);
  lines.push(`New Audit:      ${new Date(comparison.newAudit).toLocaleString()}`);
  lines.push('');
  
  lines.push('SCORE CHANGES');
  lines.push('-'.repeat(60));
  
  const perfChange = comparison.scoreChanges.performance.change;
  const perfSymbol = perfChange > 0 ? '↑' : perfChange < 0 ? '↓' : '→';
  lines.push(`Performance: ${comparison.scoreChanges.performance.old} → ${comparison.scoreChanges.performance.new} (${perfSymbol} ${Math.abs(perfChange)})`);
  lines.push(`Grade: ${comparison.scoreChanges.performance.oldGrade} → ${comparison.scoreChanges.performance.newGrade}`);
  lines.push('');
  
  const seoChange = comparison.scoreChanges.seo.change;
  const seoSymbol = seoChange > 0 ? '↑' : seoChange < 0 ? '↓' : '→';
  lines.push(`SEO: ${comparison.scoreChanges.seo.old} → ${comparison.scoreChanges.seo.new} (${seoSymbol} ${Math.abs(seoChange)})`);
  lines.push(`Grade: ${comparison.scoreChanges.seo.oldGrade} → ${comparison.scoreChanges.seo.newGrade}`);
  lines.push('');
  
  lines.push('ISSUE CHANGES');
  lines.push('-'.repeat(60));
  
  if (comparison.issueChanges.performance.resolved.length > 0) {
    lines.push(`✓ Resolved ${comparison.issueChanges.performance.resolved.length} Performance Issue(s):`);
    comparison.issueChanges.performance.resolved.forEach(i => {
      lines.push(`  - ${i.title}`);
    });
    lines.push('');
  }
  
  if (comparison.issueChanges.seo.resolved.length > 0) {
    lines.push(`✓ Resolved ${comparison.issueChanges.seo.resolved.length} SEO Issue(s):`);
    comparison.issueChanges.seo.resolved.forEach(i => {
      lines.push(`  - ${i.title}`);
    });
    lines.push('');
  }
  
  if (comparison.issueChanges.performance.new.length > 0) {
    lines.push(`⚠ New ${comparison.issueChanges.performance.new.length} Performance Issue(s):`);
    comparison.issueChanges.performance.new.forEach(i => {
      lines.push(`  - ${i.title} (${i.impact} impact)`);
    });
    lines.push('');
  }
  
  if (comparison.issueChanges.seo.new.length > 0) {
    lines.push(`⚠ New ${comparison.issueChanges.seo.new.length} SEO Issue(s):`);
    comparison.issueChanges.seo.new.forEach(i => {
      lines.push(`  - ${i.title} (${i.impact} impact)`);
    });
    lines.push('');
  }
  
  lines.push('PAGE-BY-PAGE CHANGES');
  lines.push('-'.repeat(60));
  comparison.pageComparisons.forEach(page => {
    lines.push(`${page.url}`);
    lines.push(`  Performance: ${page.performanceScore.old} → ${page.performanceScore.new} (${page.performanceScore.change > 0 ? '+' : ''}${page.performanceScore.change})`);
    lines.push(`  SEO: ${page.seoScore.old} → ${page.seoScore.new} (${page.seoScore.change > 0 ? '+' : ''}${page.seoScore.change})`);
    lines.push(`  FCP: ${formatTime(page.metrics.fcp.old)} → ${formatTime(page.metrics.fcp.new)} (${page.metrics.fcp.changePercent}%)`);
    lines.push(`  LCP: ${formatTime(page.metrics.lcp.old)} → ${formatTime(page.metrics.lcp.new)} (${page.metrics.lcp.changePercent}%)`);
    lines.push('');
  });
  
  lines.push('='.repeat(60));
  
  return lines.join('\n');
}

// CLI for comparison
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node compare.js <old-results.json> <new-results.json> [output.json]');
    process.exit(1);
  }
  
  const [oldPath, newPath, outputPath] = args;
  
  compareAudits(oldPath, newPath).then(async comparison => {
    console.log(generateComparisonReport(comparison));
    
    if (outputPath) {
      await fs.writeFile(outputPath, JSON.stringify(comparison, null, 2));
      console.log(`\nComparison saved to: ${outputPath}`);
    }
  }).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
