const http = require('http');

function makeRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const url = new URL(`http://127.0.0.1:5000${path}`);
    const reqHeaders = {
      'User-Agent': 'Papido-Audit-Engine/2.0',
      ...headers
    };
    let payload = null;
    if (data) {
      reqHeaders['Content-Type'] = 'application/json';
      payload = JSON.stringify(data);
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: reqHeaders,
      timeout: 10000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const latency = Date.now() - start;
        let json = null;
        try { json = JSON.parse(body); } catch (_) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          latency,
          rawBody: body,
          data: json
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runAudit() {
  console.log('================================================================');
  console.log('  🔍 PAPIDO PRODUCTION E2E LIVE AUDIT & BENCHMARK SUITE');
  console.log('================================================================\n');

  const report = {
    pages: [],
    apis: [],
    security: [],
    performance: [],
    lifecycle: {},
    summary: { total: 0, passed: 0, failed: 0 }
  };

  function record(category, testName, passed, latency, details = '') {
    report.summary.total++;
    if (passed) report.summary.passed++;
    else report.summary.failed++;
    const icon = passed ? '✅' : '❌';
    console.log(`  ${icon} [${latency}ms] ${testName.padEnd(45)} | ${details}`);
    report[category].push({ testName, passed, latency, details });
  }

  // ------------------------------------------------------------------
  // 1. FRONTEND PAGES & SPA ROUTING AUDIT
  // ------------------------------------------------------------------
  console.log('▶ [SECTION 1] FRONTEND ROUTES & ASSET RESOLUTION:');
  const pages = [
    { path: '/', name: 'Landing / Role Select' },
    { path: '/login', name: 'Unified Login' },
    { path: '/passenger/book', name: 'Passenger Book Ride' },
    { path: '/passenger/outside', name: 'Passenger Outside Trips' },
    { path: '/passenger/prebook', name: 'Passenger Pre-Book' },
    { path: '/passenger/history', name: 'Passenger History' },
    { path: '/passenger/profile', name: 'Passenger Profile' },
    { path: '/rider/home', name: 'Rider Portal Home' },
    { path: '/rider/history', name: 'Rider History' },
    { path: '/rider/earnings', name: 'Rider Earnings' },
    { path: '/rider/settlements', name: 'Rider Settlements' },
    { path: '/rider/profile', name: 'Rider Profile' },
    { path: '/register-core', name: 'Core Driver Register' },
    { path: '/admin', name: 'Admin Command Center' },
    { path: '/download', name: 'APK Download Portal' }
  ];

  for (const p of pages) {
    try {
      const res = await makeRequest(p.path);
      const passed = res.status === 200 && res.rawBody.includes('Papido') || (res.status === 200 && res.rawBody.length > 500);
      record('pages', p.name, passed, res.latency, `HTTP ${res.status}, ${res.rawBody.length} bytes`);
    } catch (err) {
      record('pages', p.name, false, 0, `Error: ${err.message}`);
    }
  }

  // ------------------------------------------------------------------
  // 2. AUTHENTICATION & ACCESS TOKENS
  // ------------------------------------------------------------------
  console.log('\n▶ [SECTION 2] AUTHENTICATION & IDENTITY LIFECYCLE:');
  
  // Health
  const health = await makeRequest('/api/health');
  record('apis', 'GET /api/health (System Health)', health.status === 200, health.latency, `DB: ${health.data?.database || 'OK'}`);

  // Admin Login
  const adminLogin = await makeRequest('/api/auth/login', 'POST', {
    email: 'pupapido@gmail.com',
    password: 'Papido@669669#',
    expectedRole: 'ADMIN'
  });
  const adminToken = adminLogin.data?.data?.accessToken;
  record('apis', 'POST /api/auth/login (Admin Master)', adminLogin.status === 200 && !!adminToken, adminLogin.latency, adminToken ? 'Token Acquired' : 'Login Failed');

  // Customer Dynamic Registration & Login
  const custSuffix = Date.now().toString().slice(-6);
  const custEmail = `audit.cust.${custSuffix}@papido.com`;
  const custPhone = `98${custSuffix}1234`.slice(0, 10);
  const custReg = await makeRequest('/api/auth/register', 'POST', {
    name: 'AUDIT PASSENGER',
    email: custEmail,
    phone: custPhone,
    gender: 'MALE',
    password: 'Password@123',
    role: 'CUSTOMER'
  });
  let customerToken = custReg.data?.data?.accessToken;
  if (!customerToken) {
    const custLogin = await makeRequest('/api/auth/login', 'POST', {
      email: custEmail,
      password: 'Password@123',
      expectedRole: 'CUSTOMER'
    });
    customerToken = custLogin.data?.data?.accessToken;
  }
  record('apis', 'POST /api/auth/register (Customer Account)', !!customerToken, custReg.latency, `User: ${custEmail}`);

  // Rider Dynamic Registration & Verification
  const riderSuffix = (Date.now() + 1).toString().slice(-6);
  const riderEmail = `audit.rider.${riderSuffix}@papido.com`;
  const riderPhone = `97${riderSuffix}5678`.slice(0, 10);
  const riderReg = await makeRequest('/api/auth/register', 'POST', {
    name: 'AUDIT RIDER RAJESH',
    email: riderEmail,
    phone: riderPhone,
    gender: 'MALE',
    password: 'Password@123',
    role: 'RIDER',
    vehicleModel: 'Hero Splendor Plus',
    collegeIdDocUrl: 'https://papido.com/uploads/college_id.jpg'
  });
  let riderToken = riderReg.data?.data?.accessToken;
  const riderUserId = riderReg.data?.data?.user?.id;
  record('apis', 'POST /api/auth/register (Rider Account)', !!riderToken, riderReg.latency, `Rider ID: ${riderUserId}`);

  // Approve Rider via Admin Token
  if (riderUserId && adminToken) {
    const approveRider = await makeRequest(`/api/admin/riders/${riderUserId}/verify`, 'PATCH', {
      status: 'APPROVED'
    }, { 'Authorization': `Bearer ${adminToken}` });
    record('apis', `PATCH /api/admin/riders/${riderUserId}/verify (Approval)`, approveRider.status === 200, approveRider.latency, 'Rider Verified');
  }

  // ------------------------------------------------------------------
  // 3. FARE ENGINE & ESTIMATES
  // ------------------------------------------------------------------
  console.log('\n▶ [SECTION 3] FARE ENGINE & PRICING VERIFICATION:');
  const fareRoutes = await makeRequest('/api/fares/routes');
  record('apis', 'GET /api/fares/routes (Predefined Routes)', fareRoutes.status === 200, fareRoutes.latency, `Stops: ${fareRoutes.data?.data?.length || 0}`);

  const fareEstimate = await makeRequest('/api/customer/estimate', 'POST', {
    pickupLat: 12.0182,
    pickupLng: 79.8558,
    destLat: 12.0225,
    destLng: 79.8601,
    vehicleType: 'BIKE'
  }, { 'Authorization': `Bearer ${customerToken}` });
  record('apis', 'POST /api/customer/estimate (Fare Estimate)', fareEstimate.status === 200, fareEstimate.latency, `Estimate: ₹${fareEstimate.data?.data?.estimatedFare || fareEstimate.data?.estimatedFare || 'OK'}`);

  // ------------------------------------------------------------------
  // 4. RIDE LIFECYCLE STATE MACHINE (E2E WORKFLOW)
  // ------------------------------------------------------------------
  console.log('\n▶ [SECTION 4] COMPLETE RIDE LIFECYCLE (STATE MACHINE):');
  let rideId = null;
  let otp = null;

  // Set Rider Online
  const riderOnline = await makeRequest('/api/rider/status', 'PATCH', {
    isOnline: true
  }, { 'Authorization': `Bearer ${riderToken}` });
  record('apis', 'PATCH /api/rider/status (Go Online)', riderOnline.status === 200, riderOnline.latency, 'Rider Online');

  // Customer Requests Ride
  const reqRide = await makeRequest('/api/customer/rides', 'POST', {
    vehicleType: 'BIKE',
    pickupAddress: 'Gate 2 Pondicherry University',
    pickupLatitude: 12.0182,
    pickupLongitude: 79.8558,
    destinationAddress: 'Silver Beach Main Arch',
    destinationLatitude: 12.0225,
    destinationLongitude: 79.8601,
    paymentMethod: 'CASH'
  }, { 'Authorization': `Bearer ${customerToken}` });

  rideId = reqRide.data?.data?.id;
  otp = reqRide.data?.data?.otp;
  record('apis', 'POST /api/customer/rides (Ride Requested)', reqRide.status === 201 || reqRide.status === 200, reqRide.latency, `Ride #${rideId}, OTP: ${otp}`);

  if (rideId && riderToken) {
    // Rider Accepts
    const accept = await makeRequest(`/api/rider/rides/${rideId}/accept`, 'POST', {}, { 'Authorization': `Bearer ${riderToken}` });
    record('apis', `POST /api/rider/rides/${rideId}/accept (Accept)`, accept.status === 200, accept.latency, `State: ${accept.data?.data?.status || 'ACCEPTED'}`);

    // Rider Arriving
    const arriving = await makeRequest(`/api/rider/rides/${rideId}/arriving`, 'POST', {}, { 'Authorization': `Bearer ${riderToken}` });
    record('apis', `POST /api/rider/rides/${rideId}/arriving (Arriving)`, arriving.status === 200, arriving.latency, 'State: RIDER_ARRIVING');

    // Rider Reached
    const reached = await makeRequest(`/api/rider/rides/${rideId}/reached`, 'POST', {}, { 'Authorization': `Bearer ${riderToken}` });
    record('apis', `POST /api/rider/rides/${rideId}/reached (Reached Pickup)`, reached.status === 200, reached.latency, 'State: RIDER_REACHED');

    // Attempt start with INVALID OTP
    const badOtp = await makeRequest(`/api/rider/rides/${rideId}/start`, 'POST', { otp: '0000' }, { 'Authorization': `Bearer ${riderToken}` });
    record('security', 'OTP Guard: Reject Invalid OTP', badOtp.status === 400 || badOtp.status === 401, badOtp.latency, `Rejected [${badOtp.status}]`);

    // Rider Starts with VALID OTP
    const startRide = await makeRequest(`/api/rider/rides/${rideId}/start`, 'POST', { otp }, { 'Authorization': `Bearer ${riderToken}` });
    record('apis', `POST /api/rider/rides/${rideId}/start (Start Ride)`, startRide.status === 200, startRide.latency, 'State: STARTED');

    // Customer Attempt to Cancel STARTED ride (Must be blocked)
    const cancelStarted = await makeRequest(`/api/customer/rides/${rideId}/cancel`, 'POST', { reason: 'Changed mind' }, { 'Authorization': `Bearer ${customerToken}` });
    record('security', 'State Machine Guard: Block Cancel of Started Ride', cancelStarted.status === 400, cancelStarted.latency, `Blocked [${cancelStarted.status}]`);

    // Rider Completes Ride
    const complete = await makeRequest(`/api/rider/rides/${rideId}/complete`, 'POST', {}, { 'Authorization': `Bearer ${riderToken}` });
    record('apis', `POST /api/rider/rides/${rideId}/complete (Complete Ride)`, complete.status === 200, complete.latency, `State: COMPLETED, Fare: ₹${complete.data?.data?.fare?.finalFare || complete.data?.data?.ride?.final_fare || 'Calculated'}`);

    // Customer Rates Ride
    const rate = await makeRequest(`/api/customer/rides/${rideId}/rating`, 'POST', {
      rating: 5,
      review: 'Fast and safe campus ride, smooth audit!'
    }, { 'Authorization': `Bearer ${customerToken}` });
    record('apis', `POST /api/customer/rides/${rideId}/rating (Rating)`, rate.status === 200, rate.latency, '5.0 Stars Submitted');
  }

  // ------------------------------------------------------------------
  // 5. OUTSIDE RIDES & ADVANCE BOOKINGS
  // ------------------------------------------------------------------
  console.log('\n▶ [SECTION 5] SPECIAL SERVICES (OUTSIDE & PRE-BOOK):');
  const outsideTrip = await makeRequest('/api/customer/outside-rides', 'POST', {
    vehicleType: 'CAB_MINI',
    pickupAddress: 'Pondicherry University Gate 1',
    pickupLatitude: 12.0180,
    pickupLongitude: 79.8550,
    destinationAddress: 'Chennai Airport Terminal 1',
    destinationLatitude: 12.9941,
    destinationLongitude: 80.1709,
    tripType: 'OUTSIDE_CAMPUS',
    scheduledTime: new Date(Date.now() + 86400000).toISOString()
  }, { 'Authorization': `Bearer ${customerToken}` });
  record('apis', 'POST /api/customer/outside-rides (Outside Trip)', outsideTrip.status === 201 || outsideTrip.status === 200, outsideTrip.latency, `Outside ID: ${outsideTrip.data?.data?.id || 'Created'}`);

  // ------------------------------------------------------------------
  // 6. ADMIN COMMAND CENTER & FINANCIAL AUDITING
  // ------------------------------------------------------------------
  console.log('\n▶ [SECTION 6] ADMIN COMMAND CENTER & LEDGERS:');
  const adminDash = await makeRequest('/api/admin/dashboard', 'GET', null, { 'Authorization': `Bearer ${adminToken}` });
  record('apis', 'GET /api/admin/dashboard (Executive Overview)', adminDash.status === 200, adminDash.latency, `Rides: ${adminDash.data?.data?.totalRides || 'Tracked'}`);

  const adminFares = await makeRequest('/api/admin/fare-settings', 'GET', null, { 'Authorization': `Bearer ${adminToken}` });
  record('apis', 'GET /api/admin/fare-settings (Fare Engine Matrix)', adminFares.status === 200, adminFares.latency, `Tiers: ${adminFares.data?.data?.length || 0}`);

  const adminSplits = await makeRequest('/api/admin/split-rules', 'GET', null, { 'Authorization': `Bearer ${adminToken}` });
  record('apis', 'GET /api/admin/split-rules (Dynamic Split Rules)', adminSplits.status === 200, adminSplits.latency, `Rules: ${adminSplits.data?.data?.length || 0}`);

  const riderEarnings = await makeRequest('/api/rider/earnings', 'GET', null, { 'Authorization': `Bearer ${riderToken}` });
  record('apis', 'GET /api/rider/earnings (Rider Payout Summary)', riderEarnings.status === 200, riderEarnings.latency, `Earned: ₹${riderEarnings.data?.data?.todayEarnings || riderEarnings.data?.data?.lifetime?.earnings || '0.00'}`);

  // ------------------------------------------------------------------
  // 7. SECURITY, PEN-TESTING & ROLE-BASED ACCESS CONTROL
  // ------------------------------------------------------------------
  console.log('\n▶ [SECTION 7] PEN-TESTING & ROLE-BASED ACCESS CONTROL:');

  // Customer -> Admin Dashboard (Forbidden)
  const custToAdmin = await makeRequest('/api/admin/dashboard', 'GET', null, { 'Authorization': `Bearer ${customerToken}` });
  record('security', 'RBAC: Customer accessing Admin Dashboard blocked', custToAdmin.status === 403, custToAdmin.latency, `HTTP ${custToAdmin.status}`);

  // Rider -> Admin Dashboard (Forbidden)
  const riderToAdmin = await makeRequest('/api/admin/dashboard', 'GET', null, { 'Authorization': `Bearer ${riderToken}` });
  record('security', 'RBAC: Rider accessing Admin Dashboard blocked', riderToAdmin.status === 403, riderToAdmin.latency, `HTTP ${riderToAdmin.status}`);

  // Customer -> Rider Earnings (Forbidden)
  const custToRider = await makeRequest('/api/rider/earnings', 'GET', null, { 'Authorization': `Bearer ${customerToken}` });
  record('security', 'RBAC: Customer accessing Rider Earnings blocked', custToRider.status === 403, custToRider.latency, `HTTP ${custToRider.status}`);

  // Unauthenticated Core Register (Forbidden)
  const unauthCore = await makeRequest('/api/auth/register-core', 'POST', { name: 'Attacker' });
  record('security', 'RBAC: Unauthenticated Core Driver registration blocked', unauthCore.status === 401 || unauthCore.status === 403, unauthCore.latency, `HTTP ${unauthCore.status}`);

  // SQL Injection in login
  const sqli = await makeRequest('/api/auth/login', 'POST', {
    email: "' OR '1'='1' --",
    password: 'Password@123'
  });
  record('security', 'Injection: SQL Injection in login blocked', sqli.status === 401, sqli.latency, `HTTP ${sqli.status}`);

  // SSRF Protection
  const ssrf = await makeRequest('/api/fares/resolve-link?url=http://169.254.169.254/latest/meta-data/');
  record('security', 'SSRF: Cloud Metadata (169.254.169.254) blocked', ssrf.status === 400 || ssrf.status === 403 || ssrf.status === 404, ssrf.latency, `HTTP ${ssrf.status}`);

  // Localhost SSRF Protection
  const ssrfLocal = await makeRequest('/api/fares/resolve-link?url=http://127.0.0.1:3306');
  record('security', 'SSRF: Localhost (127.0.0.1) loopback blocked', ssrfLocal.status === 400 || ssrfLocal.status === 403 || ssrfLocal.status === 404, ssrfLocal.latency, `HTTP ${ssrfLocal.status}`);

  // Security Headers
  const hdrs = health.headers;
  record('security', 'Header: X-Content-Type-Options nosniff', hdrs['x-content-type-options'] === 'nosniff', 0, hdrs['x-content-type-options'] || 'Missing');
  record('security', 'Header: X-Frame-Options configured', !!hdrs['x-frame-options'], 0, hdrs['x-frame-options'] || 'Missing');

  console.log('\n================================================================');
  console.log(`  🏁 AUDIT FINISHED: ${report.summary.passed}/${report.summary.total} TESTS PASSED (${Math.round((report.summary.passed / report.summary.total) * 100)}%)`);
  console.log('================================================================\n');

  return report;
}

runAudit().then(report => {
  process.exit(report.summary.failed > 0 ? 1 : 0);
}).catch(err => {
  console.error('Fatal Audit Runner Failure:', err);
  process.exit(1);
});
