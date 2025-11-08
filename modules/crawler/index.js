// index.js (Core Endpoint Discovery Module)

/**
 * Project: SiteSense Web Auditor - Crawler Component
 * Purpose: Implements a Breadth-First Search (BFS) to crawl a website and discover
 * internal, canonical HTML endpoints.
 * Output: Writes the resulting JSON object to a file named crawled.json.
 */

// --- Dependencies ---
const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
const fs = require('fs').promises; // Re-import fs for file writing

// --- Configuration Constants ---
const MAX_CRAWL_DEPTH = 2; 
const MAX_PAGES_TO_VISIT = 50; 
const REQUEST_TIMEOUT_MS = 5000;
const OUTPUT_FILE_PATH = 'crawledFile.json'; // The fixed file path for the output

/**
 * Helper Function: Normalizes and Validates URLs
 * Ensures the URL is absolute, on the same domain, and removes query parameters/anchors.
 * (Logic remains unchanged)
 */
function normalizeAndValidateUrl(href, baseUrl) {
    try {
        const resolvedUrl = new URL(href, baseUrl);
        const baseHost = new URL(baseUrl).host;
        if (resolvedUrl.host !== baseHost) {
            return null;
        }
        resolvedUrl.search = '';
        resolvedUrl.hash = '';
        const path = resolvedUrl.pathname.toLowerCase();
        if (path.match(/\.(pdf|zip|png|jpg|gif|css|js|xml)$/)) {
            return null;
        }
        return resolvedUrl.href;
    } catch (e) {
        return null;
    }
}


/**
 * Core Crawler Function: Discovers all endpoints on a website.
 * @param {string} startUrl The entry point for the crawl.
 * @param {number} [maxDepth=MAX_CRAWL_DEPTH] The maximum recursion depth.
 * @returns {Promise<Object>} A promise that resolves to the final JSON output object.
 */
async function crawlWebsite(startUrl, maxDepth = MAX_CRAWL_DEPTH) {
    const initialUrl = normalizeAndValidateUrl(startUrl, startUrl);
    if (!initialUrl) {
        throw new Error("Invalid or unparseable starting URL provided.");
    }
    
    // State for BFS (unchanged)
    const visitedUrls = new Set();
    const urlsQueue = [{ url: initialUrl, depth: 0 }];
    const discoveredEndpoints = new Set();
    visitedUrls.add(initialUrl);
    discoveredEndpoints.add(initialUrl);

    // Main BFS Loop (unchanged)
    while (urlsQueue.length > 0 && visitedUrls.size <= MAX_PAGES_TO_VISIT) {
        const { url: currentUrl, depth: currentDepth } = urlsQueue.shift();
        if (currentDepth >= maxDepth) {
            continue;
        }

        try {
            const response = await axios.get(currentUrl, { timeout: REQUEST_TIMEOUT_MS });
            if (!response.headers['content-type'] || !response.headers['content-type'].includes('text/html')) {
                continue;
            }

            const $ = cheerio.load(response.data);
            $('a').each((i, element) => {
                const rawHref = $(element).attr('href');
                if (!rawHref) return;
                const nextUrl = normalizeAndValidateUrl(rawHref, currentUrl);

                if (nextUrl && !visitedUrls.has(nextUrl)) {
                    visitedUrls.add(nextUrl);
                    discoveredEndpoints.add(nextUrl);
                    urlsQueue.push({ url: nextUrl, depth: currentDepth + 1 });
                }
            });
        } catch (error) {
            // Suppress verbose network errors.
        }
    }
    
    // Final Output Generation
    const finalEndpointsArray = Array.from(discoveredEndpoints);

    const jsonOutput = {
        scan_id: `crawl-${Date.now()}`,
        start_url: initialUrl,
        total_endpoints_found: finalEndpointsArray.length,
        timestamp: new Date().toISOString(),
        endpoints: finalEndpointsArray,
        metadata: {
            max_depth_used: maxDepth,
            pages_scanned: visitedUrls.size,
        }
    };
    
    // ----------------------------------------------------
    //  NEW LOGIC: Write JSON Object to File
    // ----------------------------------------------------
    try {
        const jsonString = JSON.stringify(jsonOutput, null, 2);
        // fs.writeFile is asynchronous and uses the fixed path
        await fs.writeFile(OUTPUT_FILE_PATH, jsonString, 'utf8');
        console.log(`\n✅ Successfully wrote crawl results to: ${OUTPUT_FILE_PATH}`);
    } catch (fileError) {
        console.error(`\n🛑 CRITICAL FILE WRITE ERROR: Could not write results to file. ${fileError.message}`);
    }
    // ----------------------------------------------------
    
    // Returns the JavaScript Object for programmatic consumption (SEO/Dashboard)
    return jsonOutput;
}


// --- Module Export (CRITICAL: Makes crawlWebsite callable by other modules) ---
module.exports = {
    crawlWebsite
};


/**
 * CLI Execution Harness (For direct testing/local CLI)
 */
async function main() {
    // Takes the URL as the first command-line argument.
    const userUrl = process.argv[2]; 
    
    if (!userUrl) {
        console.error('\n🚫 Error: Please provide a starting URL to crawl.');
        console.log('Usage: node index.js <YOUR_URL_HERE>');
        return;
    }

    try {
        console.log('\n======================================================');
        console.log(`         Crawler Service Starting for: ${userUrl}`);
        console.log('======================================================');
        
        // The crawlWebsite function now writes the file itself.
        const resultObject = await crawlWebsite(userUrl, MAX_CRAWL_DEPTH);
        
        console.log('\n======================================================');
        console.log('         ✅ Crawl Complete. Endpoints JSON:');
        console.log('======================================================');
        
        // Output the result as a formatted JSON string to the terminal
        console.log(JSON.stringify(resultObject, null, 2));

    } catch (error) {
        console.error(`\n🛑 CRITICAL FAILURE: The crawling process could not start. ${error.message}`);
        process.exit(1);
    }
}

// Execute CLI harness only if run directly
if (require.main === module) {
    main();
}