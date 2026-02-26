# STRESS TEST GUIDE - Barber Shop Scheduling App

## What This Does

This stress test simulates **10 concurrent users** interacting with your barber shop calendar app for **2 minutes**. It tests:

- ✅ Loading the month view calendar
- ✅ Fetching calendar data from the API
- ✅ Loading day view
- ✅ Loading week view  
- ✅ Creating new appointments
- ✅ Measuring response times and errors

## Step-by-Step Setup & Usage

### **STEP 1: Install k6 (Load Testing Tool)**

**On Windows PowerShell:**
```powershell
# Install via Chocolatey (if you don't have Chocolatey, install it first)
choco install k6

# Or use direct download from:
# https://github.com/grafana/k6/releases
# Download the Windows executable and add it to PATH
```

**Verify installation:**
```powershell
k6 --version
```

If successful, you'll see version info like: `k6 v0.x.x`

### **STEP 2: Prepare Your App**

Before running the stress test, make sure your app is **running**:

**Option A: Development Server (Recommended)**
```powershell
cd c:\generic-barber25\generic-barber
npm run dev
# App will run at http://localhost:5173
```

**Option B: Production Build**
```powershell
npm run build
# Then deploy or use a simple server
npx serve -s dist
```

### **STEP 3: Update the Test Configuration (If Needed)**

Open `stress-test.js` and check these settings:

```javascript
// Line ~16 - Change if your app runs on different URL
const BASE_URL = 'http://localhost:5173'; 

// Line ~17-18 - Add your actual workers and clients
const WORKERS = ['Marko', 'Ana', 'Ivan'];
const CLIENTS = ['Jovan', 'Milica', 'Petar', 'Sanja', 'Marko'];
```

### **STEP 4: Run the Stress Test**

**Open a NEW PowerShell terminal** (keep your dev server running in the first):

```powershell
cd c:\generic-barber25\generic-barber

# Run the stress test
k6 run stress-test.js
```

You'll see output like:
```
          /\      |‾‾| /‾‾/‾‾ /‾‾/
     /\  /  \     |  |/  /   /  /
    /  \/    \    |     (   /   ‾‾\
   /          \   |  |\  \ |  (‾)  |
  / _________ \  |__| \__\ \_____/ .io

     execution: local
     script: stress-test.js
     duration: 2m
     vus: 10 concurrent users

 ✓ Calendar page loaded
 ✓ Response time < 1s
 ✓ Fetch schedule status ok
```

### **STEP 5: Read the Results**

After the test completes, you'll see a summary:

```
checks.........................: 95.50% ✓ 2147   ✗ 101
data_received..................: 15 MB  
data_sent.......................: 5.2 MB
http_req_blocked................: avg=5ms    min=0ms    med=2ms    max=145ms
http_req_connecting.............: avg=2ms    min=0ms    med=1ms    max=50ms
http_req_duration...............: avg=245ms  min=50ms   med=180ms  max=2500ms  ✓ p(95)=450ms
http_req_failed.................: 4.5%   ✓ rate passed (< 10%)
http_req_receiving..............: avg=45ms   min=10ms   med=35ms   max=300ms
http_req_sending................: avg=8ms    min=1ms    med=5ms    max=150ms
http_req_tls_handshaking........: avg=0s     min=0s     med=0s     max=0s
http_req_waiting................: avg=192ms  min=40ms   med=150ms  max=2300ms
http_requests...................: 2248   37.5/s
iteration_duration..............: avg=1.2s   min=1.02s  med=1.15s  max=1.95s
iterations.......................: 2248   37.5/s
vus............................: 0      min=0     max=10
vus_max.........................: 10     min=10    max=10
```

**What These Numbers Mean:**

| Metric | Target | What It Means |
|--------|--------|---------------|
| `http_req_duration` | < 500ms | How long requests take. **Good if <500ms** |
| `http_req_failed` | < 10% | Error rate. **Good if <5%** |
| `checks` | > 95% | Test assertions passed. **Good if >95%** |
| `p(95)` | < 500ms | 95% of requests faster than this. **Good if <500ms** |

---

## Advanced: Increase Stress Level

Want to test with MORE users? Edit `stress-test.js` lines 7-12:

```javascript
// For 50 concurrent users instead of 10:
stages: [
  { duration: '30s', target: 50 },   // Ramp up to 50 users
  { duration: '2m', target: 50 },    // Stay at 50 users for 2 minutes
  { duration: '30s', target: 0 },    // Ramp down
],
```

Then run again:
```powershell
k6 run stress-test.js
```

---

## Troubleshooting

**Q: Error "Cannot find k6 command"**
- Make sure k6 is installed: `k6 --version`
- If not, install from: https://grafana.com/docs/k6/latest/get-started/installation/

**Q: Error "Connection refused" or "Cannot reach localhost:5173"**
- Make sure your app is running in another terminal: `npm run dev`
- Check if it's using a different port and update BASE_URL in stress-test.js

**Q: Test shows high error rate (>10%)**
- Your app might be struggling with the load
- Try increasing the ramp-up time or reducing concurrent users
- Check browser console/Network tab while test runs for specific errors

**Q: "Port 5173 already in use"**
```powershell
# Find process using port 5173
netstat -ano | findstr :5173

# Kill it (replace PID with the process ID)
taskkill /PID 12345 /F
```

---

## Real Production Testing

Before going live, run this stronger test:

```javascript
// stress-test-production.js - Copy this replace the stages section:
stages: [
  { duration: '1m', target: 50 },    // Ramp up to 50 users
  { duration: '5m', target: 50 },    // Stay at 50 for 5 minutes
  { duration: '2m', target: 100 },   // Increase to 100 users
  { duration: '5m', target: 100 },   // Keep at 100 for 5 minutes
  { duration: '1m', target: 0 },     // Ramp down
],
```

Run it:
```powershell
k6 run stress-test-production.js
```

---

## What to Fix if Tests Fail

**High Response Time (>500ms)**
- 🔴 Too slow for users
- ✅ Optimize Firebase queries
- ✅ Add caching for calendar data
- ✅ Reduce event rendering overhead

**High Error Rate (>5%)**
- 🔴 Backend is failing under load
- ✅ Check Firebase write limits
- ✅ Check database rules aren't too restrictive
- ✅ Monitor Firebase console during test

**Memory Issues (app crashes during test)**
- 🔴 App leaking memory during operations
- ✅ Check for event listeners not being removed
- ✅ Verify no circular references in data structures

---

## Next Steps

1. ✅ Run stress test with 10 users → Should pass with <500ms response
2. ✅ Run stress test with 50 users → Check if still responsive
3. ✅ Make improvements based on results
4. ✅ Re-test after each improvement
5. ✅ Deploy to production with confidence!

---

**Questions?** Check the k6 documentation: https://grafana.com/docs/k6/latest/
