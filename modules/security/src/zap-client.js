/**
 * ZAP API Client - Wrapper for OWASP ZAP security scanning
 * Provides a simplified interface for interacting with ZAP proxy and scanner
 */

import axios from 'axios';
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

export class ZAPClient {
  constructor(options = {}) {
    this.zapUrl = options.zapUrl || 'http://localhost:8080';
    this.apiKey = options.apiKey || '';
    this.timeout = options.timeout || 180000; // Reduced to 3 minutes default
    this.zapProcess = null;
    this.maxRetries = options.maxRetries || 3;
    this.quiet = options.quiet || false; // Quiet mode for reduced logging
    this.fast = options.fast !== false; // Fast mode enabled by default
    
    // Create axios instance for ZAP API calls
    this.api = axios.create({
      baseURL: this.zapUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Log helper that respects quiet mode
   */
  log(message, force = false) {
    if (!this.quiet || force) {
      console.log(message);
    }
  }

  /**
   * Start ZAP daemon if not already running
   */
  async startZAP(options = {}) {
    try {
      // Check if ZAP is already running
      const isRunning = await this.isZAPRunning();
      if (isRunning) {
        this.log('✓ ZAP is already running');
        return true;
      }

      this.log('🚀 Starting OWASP ZAP...');
      
      // Determine ZAP executable path based on platform
      const zapExecutable = this.getZAPExecutablePath();
      
      const zapArgs = [
        '-daemon',
        '-port', '8080',
        '-config', 'api.disablekey=true',
        '-config', 'api.addrs.addr.name=.*',
        '-config', 'api.addrs.addr.regex=true',
        ...(options.additionalArgs || [])
      ];

      this.zapProcess = spawn(zapExecutable, zapArgs, {
        detached: false,
        stdio: 'pipe',
        cwd: process.platform === 'win32' ? 'C:\\Program Files\\ZAP\\Zed Attack Proxy' : undefined
      });

      // Wait for ZAP to start up
      let attempts = 0;
      const maxAttempts = 30;
      
      while (attempts < maxAttempts) {
        await setTimeout(2000);
        const running = await this.isZAPRunning();
        if (running) {
          this.log('✓ ZAP started successfully');
          return true;
        }
        attempts++;
      }

      throw new Error('ZAP failed to start within timeout period');
    } catch (error) {
      console.error('❌ Failed to start ZAP:', error.message);
      throw error;
    }
  }

  /**
   * Check if ZAP is running by calling the API
   */
  async isZAPRunning() {
    try {
      const response = await this.api.get('/JSON/core/view/version/');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get ZAP executable path based on operating system
   */
  getZAPExecutablePath() {
    const os = process.platform;
    
    if (os === 'win32') {
      // Use ZAP.exe instead of zap.bat to avoid Java version conflicts
      // ZAP.exe includes its own Java runtime
      return 'C:\\Program Files\\ZAP\\Zed Attack Proxy\\ZAP.exe';
    } else if (os === 'darwin') {
      return '/Applications/OWASP ZAP.app/Contents/MacOS/OWASP ZAP';
    } else {
      return 'zap.sh'; // Linux/Unix
    }
  }

  /**
   * Configure ZAP settings for optimal scanning
   */
  async configureZAP() {
    try {
      this.log('⚙️ Configuring ZAP settings...');
      
      // Performance optimizations for faster scanning
      const performanceConfigs = [
        // Increase thread counts for parallel processing
        { key: 'spider.threadCount', value: '10' },
        { key: 'ascan.threadPerHost', value: '8' },
        { key: 'ascan.hostPerScan', value: '4' },
        
        // Reduce delays and timeouts for faster execution
        { key: 'spider.requestwaittime', value: '50' }, // Reduced from default 200ms
        { key: 'spider.processingWaitTime', value: '100' },
        { key: 'connection.timeoutInSecs', value: '15' }, // Reduced from 20s
        
        // Optimize connection pooling
        { key: 'network.connection.timeoutInSecs', value: '10' },
        { key: 'network.httpState.maxConnections', value: '15' },
        { key: 'network.httpState.maxConnectionsPerHost', value: '8' },
      ];
      
      // Set scanner configurations based on mode
      const configs = this.fast ? [
        // Fast mode - optimized for speed
        { key: 'scanner.strength', value: 'LOW' },
        { key: 'scanner.attackmodestrength', value: 'LOW' },
        // Aggressive timeouts for fast mode
        { key: 'spider.maxduration', value: '2' }, // 2 minutes max
        { key: 'spider.maxdepth', value: '2' },
        { key: 'spider.maxchildren', value: '15' },
        // Fast active scan settings - GitHub-friendly
        { key: 'ascan.maxrulesperscan', value: '15' }, // Reduced for better completion
        { key: 'ascan.maxscandurationinmins', value: '3' }, // Shorter timeout for faster completion
        { key: 'ascan.delayInMs', value: '1000' }, // Respectful delay to avoid blocking
        { key: 'ascan.attackstrength', value: 'LOW' }, // LOW strength for public sites
        { key: 'ascan.threadPerHost', value: '2' }, // Reduced threads to be respectful
        { key: 'ascan.hostPerScan', value: '1' }, // Single host focus
        // Skip time-consuming checks but keep important ones
        { key: 'ascan.skipgzipbomb', value: 'true' },
        { key: 'ascan.allowattackonstart', value: 'true' },
        { key: 'ascan.promptInAttackMode', value: 'false' },
        { key: 'ascan.promptToClearFinishedScans', value: 'false' },
      ] : [
        // Normal mode - balanced performance and coverage
        { key: 'scanner.strength', value: 'MEDIUM' },
        { key: 'scanner.attackmodestrength', value: 'MEDIUM' },
        // Optimized timeouts
        { key: 'spider.maxduration', value: '5' }, // 5 minutes max
        { key: 'spider.maxdepth', value: '3' }, // Reduced from 5
        { key: 'spider.maxchildren', value: '25' },
        // Active scan settings - balanced GitHub-friendly approach
        { key: 'ascan.maxrulesperscan', value: '25' }, // Moderate coverage
        { key: 'ascan.maxscandurationinmins', value: '8' }, // Reasonable time limit
        { key: 'ascan.delayInMs', value: '800' }, // Respectful delay
        { key: 'ascan.attackstrength', value: 'LOW' }, // LOW for public sites
        { key: 'ascan.threadPerHost', value: '3' }, // Moderate threads
        { key: 'ascan.hostPerScan', value: '1' }, // Single host focus
        { key: 'ascan.allowattackonstart', value: 'true' },
        { key: 'ascan.promptInAttackMode', value: 'false' },
        { key: 'ascan.promptToClearFinishedScans', value: 'false' },
      ];

      // Apply performance configurations first
      for (const config of performanceConfigs) {
        await this.setAdvancedConfig(config.key, config.value);
      }

      // Apply mode-specific configurations
      for (const config of configs) {
        await this.setAdvancedConfig(config.key, config.value);
      }

      this.log('✓ ZAP configuration completed with performance optimizations');
    } catch (error) {
      console.error('❌ Failed to configure ZAP:', error.message);
      throw error;
    }
  }

  /**
   * Set advanced configuration values in ZAP
   */
  async setAdvancedConfig(key, value) {
    try {
      // Map configuration keys to their appropriate ZAP API endpoints
      const configMappings = {
        // Spider configurations
        'spider.threadCount': { endpoint: 'spider', action: 'setOptionThreadCount', param: 'Integer' },
        'spider.maxduration': { endpoint: 'spider', action: 'setOptionMaxDuration', param: 'Integer' },
        'spider.maxdepth': { endpoint: 'spider', action: 'setOptionMaxDepth', param: 'Integer' },
        'spider.maxchildren': { endpoint: 'spider', action: 'setOptionMaxChildren', param: 'Integer' },
        'spider.requestwaittime': { endpoint: 'spider', action: 'setOptionRequestWaitTime', param: 'Integer' },
        'spider.processingWaitTime': { endpoint: 'spider', action: 'setOptionProcessFormFields', param: 'Boolean' },
        
        // Active scan configurations
        'ascan.threadPerHost': { endpoint: 'ascan', action: 'setOptionThreadPerHost', param: 'Integer' },
        'ascan.hostPerScan': { endpoint: 'ascan', action: 'setOptionHostPerScan', param: 'Integer' },
        'ascan.maxrulesperscan': { endpoint: 'ascan', action: 'setOptionMaxRuleDurationInMins', param: 'Integer' },
        'ascan.maxscandurationinmins': { endpoint: 'ascan', action: 'setOptionMaxScanDurationInMins', param: 'Integer' },
        'ascan.delayInMs': { endpoint: 'ascan', action: 'setOptionDelayInMs', param: 'Integer' },
        'ascan.attackstrength': { endpoint: 'ascan', action: 'setOptionAttackStrength', param: 'String' },
        'ascan.allowattackonstart': { endpoint: 'ascan', action: 'setOptionAllowAttackOnStart', param: 'Boolean' },
        
        // Network configurations
        'connection.timeoutInSecs': { endpoint: 'network', action: 'setConnectionTimeout', param: 'Integer' },
        'network.connection.timeoutInSecs': { endpoint: 'network', action: 'setConnectionTimeout', param: 'Integer' },
        'network.httpState.maxConnections': { endpoint: 'network', action: 'setHttpStateMaxConnections', param: 'Integer' },
        'network.httpState.maxConnectionsPerHost': { endpoint: 'network', action: 'setHttpStateMaxConnectionsPerHost', param: 'Integer' },
      };

      const mapping = configMappings[key];
      if (mapping) {
        const params = {};
        params[mapping.param] = value;
        
        await this.api.get(`/JSON/${mapping.endpoint}/action/${mapping.action}/`, { params });
        this.log(`✓ Set ${key} = ${value}`, true);
      } else {
        // Fallback to generic configuration
        await this.setGenericConfig(key, value);
      }
    } catch (error) {
      // Don't fail on config errors, just warn
      console.warn(`⚠️ Config warning for ${key}:`, error.message);
    }
  }

  /**
   * Set generic configuration value in ZAP
   */
  async setGenericConfig(key, value) {
    try {
      // Try different generic config endpoints
      const endpoints = [
        '/JSON/core/action/setOptionProxyChainName/',
        '/JSON/core/action/setOptionDefaultUserAgent/',
        '/JSON/core/action/setOptionTimeoutInSecs/'
      ];

      for (const endpoint of endpoints) {
        try {
          await this.api.get(endpoint, {
            params: { String: value }
          });
          return; // Success, exit
        } catch (e) {
          // Try next endpoint
          continue;
        }
      }
    } catch (error) {
      // Ignore config errors - not critical
      console.warn(`⚠️ Generic config warning for ${key}:`, error.message);
    }
  }

  /**
   * Spider crawl a website to discover URLs
   */
  async spiderScan(url, maxDepth = 5) {
    try {
      this.log(`🎯 Starting spider scan for: ${url}`);
      
      // Start spider scan
      const spiderResponse = await this.api.get('/JSON/spider/action/scan/', {
        params: {
          url: url,
          maxChildren: 20,
          recurse: true,
          contextName: '',
          subtreeOnly: false
        }
      });

      const scanId = spiderResponse.data.scan;
      this.log(`📡 Spider scan started with ID: ${scanId}`);

      // Wait for scan to complete
      await this.waitForSpiderCompletion(scanId);
      
      // Get discovered URLs
      const urlsResponse = await this.api.get('/JSON/spider/view/results/', {
        params: { scanId }
      });

      const discoveredUrls = urlsResponse.data.results || [];
      this.log(`✓ Spider scan completed. Found ${discoveredUrls.length} URLs`);
      
      return discoveredUrls;
    } catch (error) {
      console.error(`❌ Spider scan failed for ${url}:`, error.message);
      throw error;
    }
  }

  /**
   * Wait for spider scan to complete
   */
  async waitForSpiderCompletion(scanId) {
    let progress = 0;
    let attempts = 0;
    let lastReported = 0;
    const interval = this.fast ? 500 : 1000; // Even faster polling
    const maxAttempts = this.fast ? 120 : 180; // Adjusted timeouts
    const reportInterval = this.quiet ? 25 : 15; // Less frequent reporting

    while (progress < 100 && attempts < maxAttempts) {
      await setTimeout(interval);
      
      try {
        const statusResponse = await this.api.get('/JSON/spider/view/status/', {
          params: { scanId }
        });
        
        progress = parseInt(statusResponse.data.status) || 0;
        
        // Only log progress at intervals or when complete
        if (progress >= lastReported + reportInterval || progress === 100) {
          this.log(`🕷️ Spider progress: ${progress}%`);
          lastReported = progress - (progress % reportInterval);
        }
        
        attempts++;
      } catch (error) {
        console.warn('⚠️ Error checking spider status:', error.message);
        attempts++;
      }
    }

    if (progress < 100) {
      console.warn('⚠️ Spider scan timeout reached - continuing with discovered URLs');
    }
  }

  /**
   * Run active security scan on discovered URLs
   */
  async activeScan(url) {
    try {
      this.log(`🔍 Starting active security scan for: ${url}`);
      
      // Start active scan
      const scanResponse = await this.api.get('/JSON/ascan/action/scan/', {
        params: {
          url: url,
          recurse: true,
          inScopeOnly: false,
          scanPolicyName: '',
          method: 'GET',
          postData: ''
        }
      });

      const scanId = scanResponse.data.scan;
      this.log(`🔍 Active scan started with ID: ${scanId}`);

      // Wait for scan to complete
      await this.waitForActiveScanCompletion(scanId);
      
      this.log('✓ Active security scan completed');
      return scanId;
    } catch (error) {
      console.error(`❌ Active scan failed for ${url}:`, error.message);
      throw error;
    }
  }

  /**
   * Wait for active scan to complete with smart timeout handling
   */
  async waitForActiveScanCompletion(scanId) {
    let progress = 0;
    let attempts = 0;
    let lastReported = 0;
    let stuckCounter = 0;
    let lastProgress = 0;
    let significantProgress = false;
    
    const interval = this.fast ? 750 : 1000; // Slightly slower polling for stability
    const maxAttempts = this.fast ? 300 : 600; // Adjusted for realistic completion times
    const reportInterval = this.quiet ? 20 : 10; // Balanced progress updates
    const stuckThreshold = 50; // Very patient for low-intensity scans
    const minProgressThreshold = 30; // Lower threshold for meaningful progress

    while (progress < 100 && attempts < maxAttempts) {
      await setTimeout(interval);
      
      try {
        const statusResponse = await this.api.get('/JSON/ascan/view/status/', {
          params: { scanId }
        });
        
        progress = parseInt(statusResponse.data.status) || 0;
        
        // Track if we've made significant progress
        if (progress >= minProgressThreshold) {
          significantProgress = true;
        }
        
        // Check if scan is stuck
        if (progress === lastProgress) {
          stuckCounter++;
          // Only terminate early if we haven't made significant progress
          if (stuckCounter >= stuckThreshold && !significantProgress) {
            console.warn(`⚠️ Active scan stuck at ${progress}% with minimal progress - terminating`);
            break;
          } else if (stuckCounter >= (stuckThreshold * 2) && significantProgress) {
            console.warn(`⚠️ Active scan stuck at ${progress}% but made progress - collecting results`);
            break;
          }
        } else {
          stuckCounter = 0; // Reset stuck counter on progress
          lastProgress = progress;
        }
        
        // Only log progress at intervals or when complete
        if (progress >= lastReported + reportInterval || progress === 100) {
          this.log(`🔍 Active scan progress: ${progress}%`);
          lastReported = progress - (progress % reportInterval);
        }
        
        attempts++;
      } catch (error) {
        console.warn('⚠️ Error checking active scan status:', error.message);
        attempts++;
      }
    }

    if (progress < 100) {
      if (significantProgress) {
        console.log(`✓ Active scan completed with ${progress}% progress - collecting results`);
      } else {
        console.warn(`⚠️ Active scan terminated early at ${progress}% - continuing with available results`);
      }
    } else {
      console.log('✓ Active scan completed successfully (100%)');
    }
  }

  /**
   * Get security scan results with robust error handling
   */
  async getResults() {
    try {
      this.log('📊 Retrieving security scan results...');
      
      let alerts = [];
      let spiderUrls = [];
      let passiveRecords = 0;

      // Get alerts (vulnerabilities) with multiple fallback methods
      try {
        const alertsResponse = await this.api.get('/JSON/core/view/alerts/');
        alerts = alertsResponse.data.alerts || [];
        this.log(`✓ Retrieved ${alerts.length} security alerts via primary method`);
      } catch (alertError) {
        console.warn('⚠️ Primary alerts method failed, trying alternative methods...');
        
        // Try alternative alert retrieval methods
        try {
          const altAlertsResponse = await this.api.get('/JSON/core/view/alertsSummary/');
          alerts = altAlertsResponse.data.alertsSummary || [];
          this.log(`✓ Retrieved ${alerts.length} alerts via summary method`);
        } catch (altError) {
          try {
            // Try getting alerts by risk level
            const highAlerts = await this.getAlertsByRisk('High');
            const mediumAlerts = await this.getAlertsByRisk('Medium');
            const lowAlerts = await this.getAlertsByRisk('Low');
            alerts = [...highAlerts, ...mediumAlerts, ...lowAlerts];
            this.log(`✓ Retrieved ${alerts.length} alerts via risk-based method`);
          } catch (riskError) {
            console.warn('⚠️ All alert retrieval methods failed, using empty alerts array');
            alerts = [];
          }
        }
      }

      // Get spider results with fallback
      try {
        const spiderResponse = await this.api.get('/JSON/spider/view/results/');
        spiderUrls = spiderResponse.data.results || [];
        this.log(`✓ Retrieved ${spiderUrls.length} discovered URLs`);
      } catch (spiderError) {
        console.warn('⚠️ Spider results retrieval failed, using empty array');
        spiderUrls = [];
      }

      // Get passive scan status (optional)
      try {
        const passiveResponse = await this.api.get('/JSON/pscan/view/recordsToScan/');
        passiveRecords = parseInt(passiveResponse.data.recordsToScan) || 0;
        this.log(`✓ Passive scan processed ${passiveRecords} records`);
      } catch (passiveError) {
        console.warn('⚠️ Passive scan status retrieval failed');
        passiveRecords = 0;
      }

      this.log(`✅ Results summary: ${alerts.length} alerts, ${spiderUrls.length} URLs, ${passiveRecords} passive records`);
      
      return {
        alerts,
        discoveredUrls: spiderUrls,
        passiveRecords,
        scanTimestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Failed to retrieve results:', error.message);
      // Return empty results instead of throwing to maintain speed
      return {
        alerts: [],
        discoveredUrls: [],
        passiveRecords: 0,
        scanTimestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Get alerts by specific risk level
   */
  async getAlertsByRisk(riskLevel) {
    try {
      const response = await this.api.get(`/JSON/core/view/alerts/`, {
        params: { riskLevel }
      });
      return response.data.alerts || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Wait for passive scan to complete processing
   */
  async waitForPassiveScanCompletion() {
    try {
      this.log('⏳ Waiting for passive scan to complete...');
      
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max wait
      const interval = 1000; // Check every second
      
      while (attempts < maxAttempts) {
        try {
          const response = await this.api.get('/JSON/pscan/view/recordsToScan/');
          const recordsToScan = parseInt(response.data.recordsToScan) || 0;
          
          if (recordsToScan === 0) {
            this.log('✓ Passive scan completed - no more records to process');
            break;
          }
          
          if (attempts % 5 === 0) { // Log every 5 seconds
            this.log(`⏳ Passive scan processing: ${recordsToScan} records remaining`);
          }
          
        } catch (error) {
          // If we can't check passive scan status, just wait a bit
          if (attempts === 0) {
            this.log('⚠️ Cannot check passive scan status, waiting fixed time...');
          }
        }
        
        await setTimeout(interval);
        attempts++;
      }
      
      // Additional short wait to ensure results are available
      await setTimeout(2000);
      
    } catch (error) {
      console.warn('⚠️ Error waiting for passive scan:', error.message);
      // Fall back to fixed wait
      await setTimeout(5000);
    }
  }

  /**
   * Perform complete security scan on a website
   */
  async fullScan(url, options = {}) {
    try {
      this.log(`🚀 Starting full security scan for: ${url}`);
      
      // Ensure ZAP is running
      await this.startZAP();
      
      // Configure ZAP
      await this.configureZAP();
      
      // Check if we should skip crawling and scan specific endpoints only
      if (options.skipCrawling && options.endpoints && options.endpoints.length > 0) {
        return await this.endpointOnlyScan(options.endpoints, options);
      }
      
      // Access the URL first
      await this.accessUrl(url);
      
      // Spider crawl to discover URLs
      const discoveredUrls = await this.spiderScan(url, options.maxDepth);
      
      // Run active scan on the main URL
      await this.activeScan(url);
      
      // Get all results
      const results = await this.getResults();
      
      this.log('✅ Full security scan completed');
      return {
        ...results,
        targetUrl: url,
        scanOptions: options
      };
    } catch (error) {
      console.error(`❌ Full scan failed for ${url}:`, error.message);
      throw error;
    }
  }

  /**
   * Perform security scan on specific endpoints only (no crawling)
   */
  async endpointOnlyScan(endpoints, options = {}) {
    try {
      this.log(`🎯 Starting endpoint-only security scan for ${endpoints.length} URLs`);
      this.log('📋 Skipping crawling - scanning provided endpoints only');
      
      // Ensure ZAP is running
      await this.startZAP();
      
      // Configure ZAP
      await this.configureZAP();
      
      // Access endpoints in parallel batches for faster loading
      this.log('📍 Loading all endpoints into ZAP history...');
      const batchSize = 5; // Process 5 URLs at a time
      const batches = [];
      
      for (let i = 0; i < endpoints.length; i += batchSize) {
        batches.push(endpoints.slice(i, i + batchSize));
      }
      
      for (const batch of batches) {
        await Promise.all(batch.map(async (endpoint) => {
          try {
            await this.accessUrl(endpoint);
          } catch (error) {
            console.warn(`⚠️ Failed to access ${endpoint}:`, error.message);
          }
        }));
        
        // Small delay between batches
        await setTimeout(500);
      }
      
      // Run active scans if not passive-only
      if (!options.passiveScanOnly) {
        this.log('🔍 Starting parallel active scans...');
        
        // For endpoint-only scanning, we can run active scans in parallel
        // but limit concurrency to avoid overwhelming the target
        const maxConcurrent = Math.min(3, endpoints.length);
        const scanPromises = [];
        
        for (let i = 0; i < endpoints.length; i += maxConcurrent) {
          const concurrentBatch = endpoints.slice(i, i + maxConcurrent);
          
          const batchPromises = concurrentBatch.map(async (endpoint) => {
            try {
              this.log(`🔍 Active scanning endpoint: ${endpoint}`);
              return await this.activeScan(endpoint);
            } catch (error) {
              console.warn(`⚠️ Active scan failed for ${endpoint}:`, error.message);
              return null;
            }
          });
          
          // Wait for this batch to complete before starting next
          await Promise.all(batchPromises);
          
          // Small delay between concurrent batches
          if (i + maxConcurrent < endpoints.length) {
            await setTimeout(1000);
          }
        }
        
        // Wait for passive scan to finish processing active scan results
        await this.waitForPassiveScanCompletion();
      } else {
        this.log('⚡ Running passive-only scan (no active scanning)');
        // Wait for passive scan to process all accessed URLs
        await this.waitForPassiveScanCompletion();
      }
      
      // Get all results
      const results = await this.getResults();
      
      this.log('✅ Endpoint-only security scan completed');
      return {
        ...results,
        targetUrl: endpoints[0], // Use first endpoint as primary target
        scannedEndpoints: endpoints,
        scanOptions: { ...options, skipCrawling: true }
      };
    } catch (error) {
      console.error(`❌ Endpoint-only scan failed:`, error.message);
      throw error;
    }
  }

  /**
   * Access URL through ZAP proxy
   */
  async accessUrl(url) {
    try {
      await this.api.get('/JSON/core/action/accessUrl/', {
        params: { url }
      });
      this.log(`✓ Accessed URL through ZAP: ${url}`);
    } catch (error) {
      console.warn(`⚠️ Warning accessing URL ${url}:`, error.message);
    }
  }

  /**
   * Clean shutdown of ZAP
   */
  async shutdown() {
    try {
      this.log('🛑 Shutting down ZAP...');
      
      // Try graceful shutdown via API
      await this.api.get('/JSON/core/action/shutdown/');
      
      // Give it time to shutdown
      await setTimeout(3000);
      
      // Force kill if process still exists
      if (this.zapProcess && !this.zapProcess.killed) {
        this.zapProcess.kill('SIGTERM');
        await setTimeout(2000);
        
        if (!this.zapProcess.killed) {
          this.zapProcess.kill('SIGKILL');
        }
      }
      
      this.log('✓ ZAP shutdown completed');
    } catch (error) {
      console.warn('⚠️ Warning during ZAP shutdown:', error.message);
    }
  }

  /**
   * Get ZAP version and status
   */
  async getStatus() {
    try {
      const versionResponse = await this.api.get('/JSON/core/view/version/');
      const statusResponse = await this.api.get('/JSON/core/view/stats/');
      
      return {
        version: versionResponse.data.version,
        stats: statusResponse.data.stats,
        isRunning: true
      };
    } catch (error) {
      return {
        version: null,
        stats: {},
        isRunning: false,
        error: error.message
      };
    }
  }
}

export default ZAPClient;