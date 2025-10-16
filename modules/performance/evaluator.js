import lighthouse from 'lighthouse';
import chromeLauncher from 'chrome-launcher';

/**
 * Evaluate all absolute URLs of a single website using Lighthouse.
 * Extracts Performance and SEO scores for each page.
 * Callable directly from a crawler or orchestrator module.
 *
 * @param {Object} siteData - JSON object containing "urls" array of absolute URLs.
 * Example:
 * {
 *   "urls": [
 *     "https://example.com",
 *     "https://example.com/about",
 *     "https://example.com/contact"
 *   ]
 * }
 *
 * @returns {Promise<Object>} - JSON object containing each URL’s Lighthouse scores.
 */
export async function evaluateWebsitePages(siteData) {
  if (!siteData || !Array.isArray(siteData.urls)) {
    throw new Error('Invalid input: expected a JSON object with a "urls" array.');
  }

  const results = {};
  const urls = siteData.urls;

  console.log(`🔍 Starting Lighthouse evaluation for ${urls.length} pages...`);

  // Sequential evaluation for stability
  for (const url of urls) {
    console.log(`🚀 Running Lighthouse for: ${url}`);

    const chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless', '--no-sandbox']
    });

    const options = {
      logLevel: 'silent',
      output: 'json',
      onlyCategories: ['performance', 'seo'],
      port: chrome.port
    };

    try {
      const runnerResult = await lighthouse(url, options);
      const { performance, seo } = runnerResult.lhr.categories;

      results[url] = {
        performance: performance?.score ?? null,
        seo: seo?.score ?? null,
        fetchedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ Lighthouse failed for ${url}:`, error.message);
      results[url] = {
        performance: null,
        seo: null,
        error: error.message
      };
    } finally {
      await chrome.kill();
    }
  }

  console.log(`✅ Completed evaluation of ${urls.length} pages.`);
  return results;
}
