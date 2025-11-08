// index.js (UX Audit Module Entry Point - Formerly axe-auditor.js)

/**
 * Project: SiteSense Web Auditor - Axe-core Module
 * Purpose: Takes endpoints from a fixed file output by the crawler, launches a headless
 * browser (Puppeteer), and runs automated accessibility audits using axe-core.
 * Output: Prints a consolidated JSON object containing all audit results to the terminal.
 */

// --- Dependencies ---
const puppeteer = require('puppeteer');
const axe = require('axe-core');
const fs = require('fs').promises; // For file reading
// const { crawlWebsite } = require('../crawler/index.js'); // NOTE: Removed unused crawler dependency

// --- Configuration Constants ---
const MAX_CONCURRENT_PAGES = 3; // Limits simultaneous browser page audits to prevent resource exhaustion
const VIEWPORT_SIZE = { width: 1280, height: 800 };
// ⚠️ Fixed input file path for integration (assumes file is one directory up)
const INPUT_CRAWLED_FILE = '../crawler/crawledFile.json'; 


/**
 * Helper Function: Audits a single URL using axe-core in a headless browser.
 * @param {Object} browser - The Puppeteer browser instance.
 * @param {string} url - The URL of the page to audit.
 * @returns {Promise<Object>} The audit result object for one page.
 */
async function auditSinglePage(browser, url) {
    let page;
    try {
        page = await browser.newPage();
        await page.setViewport(VIEWPORT_SIZE);

        // 1. Navigate to the page
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Skip pages that returned an error (e.g., 404, 500)
        if (!response || !response.ok()) {
            return {
                url,
                status: 'FAILED_LOAD',
                error: `HTTP Error: ${response ? response.status() : 'No response'}`
            };
        }

        // 2. Inject axe-core into the page and run the audit
        await page.evaluate(axe.source);
        const results = await page.evaluate(() => axe.run());

        return {
            url,
            status: 'COMPLETED',
            timestamp: new Date().toISOString(),
            // Simple heuristic score (100 - (violations * penalty_factor))
            accessibility_score: results.violations.length === 0 ? 100 : Math.max(0, 100 - results.violations.length * 5), 
            violations: results.violations.map(v => ({ 
                id: v.id, 
                impact: v.impact, 
                description: v.description,
                helpUrl: v.helpUrl
            }))
        };
    } catch (error) {
        return {
            url,
            status: 'FAILED_AUDIT',
            error: `Audit failed: ${error.message}`
        };
    } finally {
        if (page) {
            await page.close();
        }
    }
}

/**
 * Core Axe-core Audit Function: Processes the list of URLs from the crawler output.
 * This is the callable JavaScript function for the main hierarchy.
 * @param {Object} crawlerOutput - The JSON object read from the file.
 * @returns {Promise<Object>} A summary object containing all audit results.
 */
async function runAxeAudit(crawlerOutput) {
    if (!crawlerOutput || !crawlerOutput.endpoints || crawlerOutput.endpoints.length === 0) {
        throw new Error("Crawler output is empty or malformed. Cannot run audit.");
    }

    const endpoints = crawlerOutput.endpoints;
    const allResults = [];
    
    // Launch a single browser instance for all audits
    const browser = await puppeteer.launch({ headless: true });

    // Use a Promise queue to limit concurrency 
    const promises = [];
    for (const url of endpoints) {
        if (promises.length >= MAX_CONCURRENT_PAGES) {
            // Wait for the oldest audit to complete before scheduling a new one
            await Promise.race(promises);
        }
        
        const promise = auditSinglePage(browser, url).then(result => {
            allResults.push(result);
            // Remove the completed promise from the active list
            promises.splice(promises.indexOf(promise), 1);
            return result;
        });
        promises.push(promise);
    }
    
    // Wait for the final active audits to complete
    await Promise.all(promises);

    await browser.close();

    return {
        scan_id: crawlerOutput.scan_id,
        timestamp: new Date().toISOString(),
        total_endpoints_audited: allResults.length,
        results: allResults
    };
}


// --- Module Export (For external calling) ---
module.exports = {
    runAxeAudit
};


/**
 * CLI Execution Harness (For fixed file-based input and testing)
 * This block runs the file directly, reads the hardcoded input file, and prints the results.
 */
async function main() {
    console.log("--- AXE-CORE AUDIT MODULE START ---");

    let crawlerOutput;
    
    try {
        console.log(`Attempting to read input from fixed file: ${INPUT_CRAWLED_FILE}`);
        
        // 1. READ AND PARSE THE FIXED JSON FILE
        const data = await fs.readFile(INPUT_CRAWLED_FILE, 'utf8');
        crawlerOutput = JSON.parse(data);
        
    } catch (error) {
        // Provide clear instructions for debugging file issues
        console.error(`\n🛑 CRITICAL INPUT ERROR: Could not read or parse file at path: ${INPUT_CRAWLED_FILE}`);
        console.error(`Ensure that the crawler has successfully written its JSON output to this exact file.`);
        console.error(`Error details: ${error.message}`);
        process.exit(1);
    }

    try {
        console.log(`Auditing ${crawlerOutput.endpoints.length} endpoints found in file...`);
        
        // 2. CALL THE CORE AUDIT FUNCTION
        const finalAuditResults = await runAxeAudit(crawlerOutput);
        
        console.log("\n=========================================================");
        console.log("         ✅ AXE-CORE AUDIT COMPLETE - RESULTS:");
        console.log("=========================================================");
        
        // 3. PRINT FINAL CONSOLIDATED JSON OUTPUT
        console.log(JSON.stringify(finalAuditResults, null, 2));

    } catch (error) {
        console.error(`\n🛑 CRITICAL AUDIT FAILURE: ${error.message}`);
        process.exit(1);
    }
}

// Execute the test harness only if the file is run directly
if (require.main === module) {
    main();
}