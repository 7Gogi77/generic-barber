/**
 * BARBER SHOP STRESS TEST - Node.js Version
 * No k6 needed - uses native Node.js
 * 
 * Usage: node stress-test-node.js
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';

// Configuration
const BASE_URL = 'http://localhost:5173'; // Change if needed
const CONCURRENT_USERS = 50;
const TEST_DURATION_MS = 120000; // 2 minutes
const WORKERS = ['Marko', 'Ana', 'Ivan'];
const CLIENTS = ['Jovan', 'Milica', 'Petar', 'Sanja', 'Marko'];

// Statistics
let stats = {
  totalRequests: 0,
  successRequests: 0,
  failedRequests: 0,
  responseTimes: [],
  errors: [],
};

// Helper: Make HTTP request
function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const startTime = Date.now();
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'k6-stress-test/1.0',
      },
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const duration = Date.now() - startTime;
        stats.totalRequests++;
        stats.responseTimes.push(duration);

        if (res.statusCode >= 200 && res.statusCode < 400) {
          stats.successRequests++;
        } else {
          stats.failedRequests++;
          stats.errors.push(`${res.statusCode} on ${path}`);
        }

        resolve({ status: res.statusCode, duration, data });
      });
    });

    req.on('error', (e) => {
      stats.failedRequests++;
      stats.errors.push(e.message);
      stats.totalRequests++;
      resolve({ status: 0, duration: 0, error: e.message });
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Test scenarios
async function testLoadCalendar() {
  await makeRequest('/poslovni-panel.3f8a1c.html');
}

async function testLoadMainPage() {
  await makeRequest('/index.html');
}

async function testLoadAdminPanel() {
  await makeRequest('/admin-panel.html');
}

async function testLoadRezervacija() {
  await makeRequest('/rezervacija.html');
}

async function testLoadJS() {
  await makeRequest('/js/calendar-engine.js');
}

async function testLoadCSS() {
  await makeRequest('/css/calendar.css');
}

// Worker loop
async function userWorkerLoop(userId) {
  const startTime = Date.now();

  while (Date.now() - startTime < TEST_DURATION_MS) {
    const testChoice = Math.random();

    try {
      if (testChoice < 0.4) {
        await testLoadCalendar();
      } else if (testChoice < 0.6) {
        await testLoadMainPage();
      } else if (testChoice < 0.75) {
        await testLoadAdminPanel();
      } else if (testChoice < 0.85) {
        await testLoadRezervacija();
      } else if (testChoice < 0.93) {
        await testLoadJS();
      } else {
        await testLoadCSS();
      }
    } catch (e) {
      stats.failedRequests++;
      stats.errors.push(`User ${userId}: ${e.message}`);
    }

    // Small delay between requests
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`✓ User ${userId} completed`);
}

// Format number with commas
function formatNumber(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Calculate percentile
function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = arr.sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

// Main
async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║     BARBER SHOP CALENDAR - STRESS TEST (Node.js)           ║
╚════════════════════════════════════════════════════════════╝

📊 Test Configuration:
   • Concurrent Users: ${CONCURRENT_USERS}
   • Duration: 2 minutes
   • Base URL: ${BASE_URL}
   • Testing: HTML pages, JS, CSS loading

Starting in 3 seconds...
  `);

  await new Promise((r) => setTimeout(r, 3000));

  console.log('🚀 Test started!\n');
  const testStartTime = Date.now();

  // Start all user workers
  const workers = [];
  for (let i = 1; i <= CONCURRENT_USERS; i++) {
    workers.push(userWorkerLoop(i));
  }

  // Wait for all workers to complete
  await Promise.all(workers);

  const totalDuration = Date.now() - testStartTime;

  // Calculate statistics
  const avgResponseTime = stats.responseTimes.length > 0 
    ? stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length 
    : 0;
  const minResponseTime = Math.min(...stats.responseTimes);
  const maxResponseTime = Math.max(...stats.responseTimes);
  const p95ResponseTime = percentile(stats.responseTimes, 95);
  const errorRate = stats.totalRequests > 0 
    ? (stats.failedRequests / stats.totalRequests * 100).toFixed(2) 
    : 0;

  // Print results
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                    TEST RESULTS                            ║
╚════════════════════════════════════════════════════════════╝

✓ Test completed in ${((totalDuration) / 1000).toFixed(1)}s

📈 Request Statistics:
   • Total Requests: ${formatNumber(stats.totalRequests)}
   • Successful: ${formatNumber(stats.successRequests)} ✓
   • Failed: ${formatNumber(stats.failedRequests)} ✗
   • Error Rate: ${errorRate}%

⏱️  Response Times:
   • Avg: ${avgResponseTime.toFixed(0)}ms
   • Min: ${minResponseTime}ms
   • Max: ${maxResponseTime}ms
   • p95: ${p95ResponseTime.toFixed(0)}ms

📊 Throughput:
   • Requests/sec: ${(stats.totalRequests / (totalDuration / 1000)).toFixed(1)}

`);

  // Show pass/fail
  const avgPassOK = avgResponseTime < 500;
  const p95PassOK = p95ResponseTime < 500;
  const errorPassOK = errorRate < 1; // Static files should have very low error rate

  console.log('✅ THRESHOLDS:');
  console.log(`   ${avgPassOK ? '✓' : '✗'} Avg Response Time < 500ms: ${avgResponseTime.toFixed(0)}ms`);
  console.log(`   ${p95PassOK ? '✓' : '✗'} p95 Response Time < 500ms: ${p95ResponseTime.toFixed(0)}ms`);
  console.log(`   ${errorPassOK ? '✓' : '✗'} Error Rate < 1%: ${errorRate}%`);

  if (stats.errors.length > 0 && stats.errors.length <= 5) {
    console.log('\n⚠️  Errors:');
    stats.errors.slice(0, 5).forEach((e) => console.log(`   • ${e}`));
  }

  const allPassed = avgPassOK && p95PassOK && errorPassOK;
  console.log(`\n${allPassed ? '🎉' : '⚠️ '} Overall: ${allPassed ? 'PASSED' : 'NEEDS IMPROVEMENT'}\n`);

  process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);
