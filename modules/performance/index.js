import { auditMultipleEndpoints } from './evaluator.js';
import { validateInput, generateTextSummary, aggregateResults } from './utils.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Main entry point for performance and SEO auditing with batch processing
 * @param {Object} input - Input configuration
 * @param {string[]} input.endpoints - Array of URLs to audit
 * @param {string} [input.outputFile] - Optional output file path
 * @param {number} [input.batchSize=5] - Number of endpoints per batch
 * @returns {Promise<Object>} Audit results
 */
export async function runAudit(input) {
  // Validate input
  validateInput(input);

  const batchSize = input.batchSize || 5;
  const endpoints = input.endpoints;
  
  console.log(`Starting batch audit for ${endpoints.length} endpoint(s) with batch size ${batchSize}...`);
  const startTime = Date.now();

  // Split endpoints into batches
  const batches = [];
  for (let i = 0; i < endpoints.length; i += batchSize) {
    batches.push(endpoints.slice(i, i + batchSize));
  }

  console.log(`Split into ${batches.length} batch(es)`);

  try {
    // Process batches sequentially to avoid Lighthouse conflicts
    const results = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Starting batch ${i + 1}/${batches.length} with ${batch.length} endpoint(s)...`);
      
      try {
        const result = await auditMultipleEndpoints(batch, i);
        results.push(result);
        console.log(`✓ Completed batch ${i + 1}/${batches.length} (${i + 1}/${batches.length} total)`);
      } catch (error) {
        console.error(`✗ Failed batch ${i + 1}/${batches.length}:`, error.message);
        // Add empty result for failed batch
        results.push({
          summary: {
            totalPages: 0,
            overallPerformanceScore: 0,
            overallSeoScore: 0,
            performanceGrade: 'F',
            seoGrade: 'F'
          },
          pageResults: [],
          issues: { performance: [], seo: [] },
          detailedPageIssues: []
        });
      }
      
      // Add delay between batches to ensure clean separation
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Filter out failed batches (those with 0 pages)
    const successfulResults = results.filter(result => result.summary.totalPages > 0);
    const failedBatches = results.length - successfulResults.length;

    if (successfulResults.length === 0) {
      throw new Error('All batches failed. Please check your endpoints and try again.');
    }

    if (failedBatches > 0) {
      console.log(`\n⚠️  Warning: ${failedBatches} batch(es) failed`);
      console.log(`✓ Successfully processed ${successfulResults.length} batch(es)`);
    }
    
    // Aggregate all successful results
    console.log('\nAggregating results...');
    const aggregatedResults = aggregateResults(successfulResults);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\nBatch audit completed in ${duration} seconds`);
    console.log(`Overall Performance Score: ${aggregatedResults.summary.overallPerformanceScore} (${aggregatedResults.summary.performanceGrade})`);
    console.log(`Overall SEO Score: ${aggregatedResults.summary.overallSeoScore} (${aggregatedResults.summary.seoGrade})`);
    console.log(`Total Performance Issues: ${aggregatedResults.issues.performance.length}`);
    console.log(`Total SEO Issues: ${aggregatedResults.issues.seo.length}`);

    // Save to file if specified
    if (input.outputFile) {
      const outputPath = path.resolve(input.outputFile);
      await fs.writeFile(outputPath, JSON.stringify(aggregatedResults, null, 2));
      console.log(`\nResults saved to: ${outputPath}`);
      
      // Also save a text summary
      const textPath = outputPath.replace('.json', '-summary.txt');
      await fs.writeFile(textPath, generateTextSummary(aggregatedResults));
      console.log(`Summary saved to: ${textPath}`);
    }

    return aggregatedResults;
  } catch (error) {
    console.error('\nBatch processing failed:', error.message);
    throw error;
  }
}

/**
 * Load input from JSON file
 * @param {string} filePath - Path to input JSON file
 * @returns {Promise<Object>} Parsed input
 */
export async function loadInputFromFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

export { auditMultipleEndpoints } from './evaluator.js';
