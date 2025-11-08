#!/usr/bin/env node

import { runAudit, loadInputFromFile } from './index.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);

function printUsage() {
  console.log(`
SiteSense Performance & SEO Auditor - Batch Processing

Usage:
  node cli.js <input-file.json> [options]
  node cli.js --urls <url1> <url2> ... [options]

Options:
  -o, --output <file>     Save results to JSON file
  -b, --batch-size <num>  Number of endpoints per batch (default: 5)
  -h, --help              Show this help message

Examples:
  # Audit from input file with default batch size (5)
  node cli.js input.json -o results.json

  # Audit with custom batch size
  node cli.js input.json -b 3 -o results.json

  # Audit specific URLs with batch processing
  node cli.js --urls https://example.com https://example.com/about -b 2 -o results.json

Input JSON format:
  {
    "endpoints": [
      "https://example.com",
      "https://example.com/about",
      "https://example.com/contact"
    ],
    "batchSize": 5,           // optional, defaults to 5
    "outputFile": "results.json" // optional
  }

Batch Processing:
  - Runs multiple audits in parallel for better performance
  - Automatically aggregates results from all batches
  - Recommended batch size: 3-10 endpoints per batch
  - Larger batches = faster but more resource intensive
`);
}

async function main() {
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    printUsage();
    process.exit(0);
  }

  try {
    let input = {};
    let batchSize = 5; // Default batch size

    // Check if using --urls flag
    const urlsIndex = args.findIndex(arg => arg === '--urls');
    if (urlsIndex !== -1) {
      const urls = [];
      for (let i = urlsIndex + 1; i < args.length; i++) {
        if (args[i].startsWith('-')) break;
        urls.push(args[i]);
      }
      input.endpoints = urls;
    } else {
      // Load from file
      const inputFile = args[0];
      input = await loadInputFromFile(inputFile);
    }

    // Check for output flag
    const outputIndex = args.findIndex(arg => arg === '-o' || arg === '--output');
    if (outputIndex !== -1 && args[outputIndex + 1]) {
      input.outputFile = args[outputIndex + 1];
    }

    // Check for batch size flag
    const batchIndex = args.findIndex(arg => arg === '-b' || arg === '--batch-size');
    if (batchIndex !== -1 && args[batchIndex + 1]) {
      batchSize = parseInt(args[batchIndex + 1], 10);
      if (isNaN(batchSize) || batchSize < 1) {
        console.error('Error: Batch size must be a positive integer');
        process.exit(1);
      }
    }

    // Override with CLI batch size if provided
    input.batchSize = batchSize;

    console.log(`\n🚀 Starting audit for ${input.endpoints.length} endpoints with batch size ${batchSize}...`);
    console.log(`📊 This will run approximately ${Math.ceil(input.endpoints.length / batchSize)} batches in parallel\n`);

    // Run the audit
    const results = await runAudit(input);

    // Print summary
    console.log('\n=== AUDIT SUMMARY ===');
    console.log(`Total Pages Audited: ${results.summary.totalPages}`);
    console.log(`Performance Score: ${results.summary.overallPerformanceScore}/100 (${results.summary.performanceGrade})`);
    console.log(`SEO Score: ${results.summary.overallSeoScore}/100 (${results.summary.seoGrade})`);
    
    console.log('\n=== TOP ISSUES ===');
    console.log('\nPerformance Issues:');
    results.issues.performance.slice(0, 5).forEach((issue, idx) => {
      console.log(`  ${idx + 1}. ${issue.title}`);
      console.log(`     Impact: ${issue.impact} | Effort: ${issue.effort} | Affects ${issue.affectedPages.length} page(s)`);
    });

    console.log('\nSEO Issues:');
    results.issues.seo.slice(0, 5).forEach((issue, idx) => {
      console.log(`  ${idx + 1}. ${issue.title}`);
      console.log(`     Impact: ${issue.impact} | Effort: ${issue.effort} | Affects ${issue.affectedPages.length} page(s)`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
