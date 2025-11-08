import { runAudit } from './index.js';

/**
 * Example usage of the performance auditor
 */
async function runExample() {
  console.log('=== SiteSense Performance & SEO Auditor Example ===\n');

  // Example 1: Audit a few public websites
  const input = {
    endpoints: [
      'https://web.dev',
      'https://web.dev/learn',
    ],
    outputFile: 'example-results.json'
  };

  try {
    const results = await runAudit(input);

    // Display summary
    console.log('\n=== SUMMARY ===');
    console.log('Total Pages:', results.summary.totalPages);
    console.log('Overall Performance Score:', results.summary.overallPerformanceScore, `(${results.summary.performanceGrade})`);
    console.log('Overall SEO Score:', results.summary.overallSeoScore, `(${results.summary.seoGrade})`);

    // Display page-by-page results
    console.log('\n=== PAGE RESULTS ===');
    results.pageResults.forEach((page, idx) => {
      console.log(`\nPage ${idx + 1}: ${page.url}`);
      console.log(`  Performance: ${page.performanceScore}/100`);
      console.log(`  SEO: ${page.seoScore}/100`);
      console.log(`  Metrics:`);
      console.log(`    - First Contentful Paint: ${(page.metrics.firstContentfulPaint / 1000).toFixed(2)}s`);
      console.log(`    - Largest Contentful Paint: ${(page.metrics.largestContentfulPaint / 1000).toFixed(2)}s`);
      console.log(`    - Total Blocking Time: ${page.metrics.totalBlockingTime}ms`);
      console.log(`    - Cumulative Layout Shift: ${page.metrics.cumulativeLayoutShift?.toFixed(3)}`);
    });

    // Display top issues
    console.log('\n=== TOP PERFORMANCE ISSUES ===');
    results.issues.performance.slice(0, 5).forEach((issue, idx) => {
      console.log(`\n${idx + 1}. ${issue.title}`);
      console.log(`   Impact: ${issue.impact} | Effort: ${issue.effort}`);
      console.log(`   Affects ${issue.affectedPages.length} page(s)`);
      console.log(`   Average Score: ${issue.averageScore}`);
      issue.affectedPages.forEach(page => {
        console.log(`   - ${page.url}: ${page.displayValue || 'N/A'}`);
      });
    });

    console.log('\n=== TOP SEO ISSUES ===');
    results.issues.seo.slice(0, 5).forEach((issue, idx) => {
      console.log(`\n${idx + 1}. ${issue.title}`);
      console.log(`   Impact: ${issue.impact} | Effort: ${issue.effort}`);
      console.log(`   Affects ${issue.affectedPages.length} page(s)`);
      console.log(`   Average Score: ${issue.averageScore}`);
    });

    // Priority recommendations
    console.log('\n=== PRIORITY RECOMMENDATIONS ===');
    const highImpactLowEffort = [
      ...results.issues.performance,
      ...results.issues.seo
    ].filter(issue => issue.impact === 'High' && issue.effort === 'Low');

    if (highImpactLowEffort.length > 0) {
      console.log('\nQuick Wins (High Impact, Low Effort):');
      highImpactLowEffort.forEach((issue, idx) => {
        console.log(`  ${idx + 1}. ${issue.title} (${issue.category})`);
      });
    }

    const highImpactIssues = [
      ...results.issues.performance,
      ...results.issues.seo
    ].filter(issue => issue.impact === 'High');

    console.log(`\nTotal High Impact Issues: ${highImpactIssues.length}`);
    console.log('Focus on resolving high-impact issues first for maximum improvement.');

  } catch (error) {
    console.error('Error running audit:', error.message);
    process.exit(1);
  }
}

// Run the example
runExample();
