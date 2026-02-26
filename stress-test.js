/**
 * BARBER SHOP CALENDAR STRESS TEST
 * Tests the scheduling app with concurrent users
 * 
 * Usage: k6 run stress-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

// Configuration
export const options = {
  // Test with 10 concurrent users for 2 minutes
  stages: [
    { duration: '10s', target: 10 },   // Ramp up to 10 users in 10 seconds
    { duration: '1m', target: 10 },    // Stay at 10 users for 1 minute
    { duration: '10s', target: 0 },    // Ramp down to 0 users in 10 seconds
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be <500ms
    http_req_failed: ['rate<0.1'],    // Error rate should be <10%
  },
};

// Test data - modify these for your app
const BASE_URL = 'http://localhost:5173'; // Vite dev server or production URL
const WORKERS = ['Marko', 'Ana', 'Ivan'];
const CLIENTS = ['Jovan', 'Milica', 'Petar', 'Sanja', 'Marko'];

// Helper: Get random element from array
function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper: Generate appointment times (next 7 days)
function getRandomAppointmentTime() {
  const now = new Date();
  const dayOffset = Math.floor(Math.random() * 7) + 1;
  const date = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
  const hour = Math.floor(Math.random() * 8) + 9; // 9 AM - 5 PM
  const minute = Math.random() < 0.5 ? 0 : 30;
  
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

// Test 1: Load month view calendar (most common user action)
export function testLoadCalendar() {
  const response = http.get(BASE_URL);
  
  check(response, {
    'Calendar page loaded': (r) => r.status === 200,
    'Page has content': (r) => r.body.length > 1000,
    'Response time < 1s': (r) => r.timings.duration < 1000,
  });
  
  sleep(1);
}

// Test 2: Simulate creating an appointment
export function testCreateAppointment() {
  const payload = JSON.stringify({
    workerName: randomElement(WORKERS),
    clientName: randomElement(CLIENTS),
    phoneNumber: `+381${Math.floor(Math.random() * 900000000) + 100000000}`,
    start: getRandomAppointmentTime(),
    end: new Date(new Date(getRandomAppointmentTime()).getTime() + 30 * 60000).toISOString(),
    service: 'Haircut',
    notes: 'Stress test appointment',
  });

  const response = http.post(`${BASE_URL}/api/appointments`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(response, {
    'Create appointment status ok': (r) => r.status === 200 || r.status === 201,
    'Response has appointment ID': (r) => r.body.includes('id') || r.status !== 500,
  });

  sleep(0.5);
}

// Test 3: Fetch calendar data (what the app does on load)
export function testFetchCalendarData() {
  const response = http.get(`${BASE_URL}/api/schedule`);

  check(response, {
    'Fetch schedule status ok': (r) => r.status === 200,
    'Response is JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    },
    'Response time < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(0.5);
}

// Test 4: Simulate day view loading
export function testLoadDayView() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateStr = tomorrow.toISOString().split('T')[0];

  const response = http.get(`${BASE_URL}?date=${dateStr}`);

  check(response, {
    'Day view loaded': (r) => r.status === 200,
    'Response time < 1s': (r) => r.timings.duration < 1000,
  });

  sleep(1);
}

// Test 5: Simulate week view loading
export function testLoadWeekView() {
  const response = http.get(`${BASE_URL}?view=week`);

  check(response, {
    'Week view loaded': (r) => r.status === 200,
    'Response time < 1.5s': (r) => r.timings.duration < 1500,
  });

  sleep(1);
}

// Main test function - all workflows
export default function () {
  // Randomly choose a test to run
  const testChoice = Math.random();

  if (testChoice < 0.3) {
    testLoadCalendar();
  } else if (testChoice < 0.5) {
    testFetchCalendarData();
  } else if (testChoice < 0.7) {
    testLoadDayView();
  } else if (testChoice < 0.85) {
    testLoadWeekView();
  } else {
    testCreateAppointment();
  }
}
