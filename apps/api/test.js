/**
 * Test script for API endpoints
 * Quick smoke test to verify API is working
 */

const API_BASE = 'http://localhost:3001';

async function testHealthEndpoint() {
  console.log('\n1. Testing health endpoint...');
  try {
    const response = await fetch(`${API_BASE}/api/health`);
    const data = await response.json();
    console.log('✓ Health check passed:', data);
    return true;
  } catch (error) {
    console.error('✗ Health check failed:', error.message);
    return false;
  }
}

async function testScanEndpoint() {
  console.log('\n2. Testing scan endpoint...');
  try {
    const response = await fetch(`${API_BASE}/api/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' })
    });
    const data = await response.json();
    console.log('✓ Scan initiated:', data);
    
    // Wait a bit and check status
    console.log('\n3. Waiting 5 seconds before checking status...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const statusResponse = await fetch(`${API_BASE}/api/scan/${data.scanId}`);
    const statusData = await statusResponse.json();
    console.log('✓ Scan status:', {
      id: statusData.id,
      url: statusData.url,
      status: statusData.status,
      progress: statusData.progress
    });
    
    return true;
  } catch (error) {
    console.error('✗ Scan test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('='.repeat(50));
  console.log('SiteSense API Test Suite');
  console.log('='.repeat(50));
  console.log('\nMake sure the API server is running on port 3001');
  console.log('(Run: npm run start:api)');
  
  const healthOk = await testHealthEndpoint();
  
  if (healthOk) {
    await testScanEndpoint();
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('Tests completed');
  console.log('='.repeat(50));
}

runTests();
