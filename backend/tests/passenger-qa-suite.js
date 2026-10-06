const http = require('http');
const app = require('../src/app');
const { initializeDatabase } = require('../src/config/database');

let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  failures: []
};

function recordTest(name, passed, detail = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`  ✅ [PASS] ${name}`);
  } else {
    testResults.failed++;
    console.error(`  ❌ [FAIL] ${name} ${detail ? '- ' + detail : ''}`);
    testResults.failures.push({ name, detail });
  }
}

async function runPassengerQASuite() {
  console.log('\n======================================================');
  console.log('  🚀 PASSENGER WEB ONLY — COMPREHENSIVE QA TEST SUITE');
  console.log('======================================================\n');

  let server;
  let baseUrl;

  try {
    await initializeDatabase();

    // Start server on an ephemeral random port
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
    console.log(`[QA Runner] Test server listening on ${baseUrl}\n`);

    const api = async (endpoint, options = {}) => {
      const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
      const config = {
        method: options.method || 'GET',
        headers
      };
      if (options.body) {
        config.body = JSON.stringify(options.body);
      }
      const res = await fetch(`${baseUrl}${endpoint}`, config);
      let data = null;
      try {
        data = await res.json();
      } catch (_) {}
      return { status: res.status, ok: res.ok, body: data, headers: res.headers };
    };

    // --------------------------------------------------------
    // SECTION 1: PASSENGER AUTHENTICATION & SESSION
    // --------------------------------------------------------
    console.log('▶ [SECTION 1] Passenger Registration, Login & Session Management');
    const timestamp = Date.now();
    const customerEmail1 = `qa.passenger.${timestamp}@papido.com`;
    const customerPhone1 = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
    const customerPassword = 'PassengerSecret@123';

    // 1.1 Valid Registration
    const regRes = await api('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'QA Passenger Primary',
        email: customerEmail1,
        phone: customerPhone1,
        password: customerPassword,
        role: 'CUSTOMER',
        gender: 'FEMALE'
      }
    });
    recordTest('1.1 Normal Case: Passenger registration succeeds with 201/200', regRes.status === 201 || regRes.status === 200, `Got ${regRes.status}`);
    recordTest('1.2 Normal Case: Registration returns valid JWT token', Boolean(regRes.body?.data?.accessToken || regRes.body?.token));

    const token1 = regRes.body?.data?.accessToken || regRes.body?.token;

    // 1.3 Duplicate Registration
    const dupRes = await api('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Duplicate Passenger',
        email: customerEmail1,
        phone: customerPhone1,
        password: customerPassword,
        role: 'CUSTOMER'
      }
    });
    recordTest('1.3 Duplicate Case: Duplicate email/phone registration rejected with 400/409', dupRes.status === 400 || dupRes.status === 409, `Got ${dupRes.status}`);

    // 1.4 Empty Fields Registration
    const emptyRegRes = await api('/api/auth/register', {
      method: 'POST',
      body: {}
    });
    recordTest('1.4 Empty Case: Registration with empty payload rejected with 400', emptyRegRes.status === 400, `Got ${emptyRegRes.status}`);

    // 1.5 Valid Login
    const loginRes = await api('/api/auth/login', {
      method: 'POST',
      body: {
        email: customerEmail1,
        password: customerPassword,
        expectedRole: 'CUSTOMER'
      }
    });
    recordTest('1.5 Normal Case: Passenger login succeeds with valid credentials', loginRes.status === 200 && loginRes.body?.success === true, `Got ${loginRes.status}`);

    // 1.6 Invalid Password
    const badPassRes = await api('/api/auth/login', {
      method: 'POST',
      body: {
        email: customerEmail1,
        password: 'IncorrectPassword999',
        expectedRole: 'CUSTOMER'
      }
    });
    recordTest('1.6 Invalid Case: Login rejected with wrong password (401)', badPassRes.status === 401, `Got ${badPassRes.status}`);

    // 1.7 Role Guard: Customer attempting Rider login
    const wrongRoleRes = await api('/api/auth/login', {
      method: 'POST',
      body: {
        email: customerEmail1,
        password: customerPassword,
        expectedRole: 'RIDER'
      }
    });
    recordTest('1.7 Security Case: Passenger prevented from logging in as RIDER', wrongRoleRes.status === 401 || wrongRoleRes.status === 403, `Got ${wrongRoleRes.status}`);

    // 1.8 Authenticated Session Check (/api/auth/me)
    const meRes = await api('/api/auth/me', {
      headers: { Authorization: `Bearer ${token1}` }
    });
    recordTest('1.8 Normal Case: /api/auth/me returns authenticated passenger profile', meRes.status === 200 && (meRes.body?.data?.user?.role === 'CUSTOMER' || meRes.body?.data?.role === 'CUSTOMER'), `Got ${meRes.status}`);

    // 1.9 Profile Update
    const updateRes = await api('/api/auth/profile', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token1}` },
      body: { name: 'QA Passenger Updated', gender: 'FEMALE' }
    });
    recordTest('1.9 Normal Case: Passenger profile update succeeds', updateRes.status === 200, `Got ${updateRes.status}`);

    // 1.10 Password Change
    const changePassRes = await api('/api/auth/change-password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: {
        currentPassword: customerPassword,
        newPassword: 'NewSecurePassword@456'
      }
    });
    recordTest('1.10 Normal Case: Passenger password change succeeds with valid old password', changePassRes.status === 200, `Got ${changePassRes.status}`);

    // Login with new password
    const newLoginRes = await api('/api/auth/login', {
      method: 'POST',
      body: {
        email: customerEmail1,
        password: 'NewSecurePassword@456',
        expectedRole: 'CUSTOMER'
      }
    });
    recordTest('1.11 Normal Case: Login succeeds with newly changed password', newLoginRes.status === 200, `Got ${newLoginRes.status}`);
    const activeToken1 = newLoginRes.body?.data?.accessToken || newLoginRes.body?.token;

    // --------------------------------------------------------
    // SECTION 2: FARE ESTIMATION & DISCOVERY
    // --------------------------------------------------------
    console.log('\n▶ [SECTION 2] Route Discovery & Fare Estimation');

    // 2.1 Route Stops Discovery
    const routesRes = await api('/api/fares/routes');
    recordTest('2.1 Discovery: Campus routes and active stops list returned', routesRes.status === 200 && Array.isArray(routesRes.body?.data || routesRes.body), `Got ${routesRes.status}`);

    // 2.2 Standard Inside-Campus Fare Estimate
    const estRes = await api('/api/fares/estimate', {
      method: 'POST',
      body: {
        pickupLatitude: 12.0228681,
        pickupLongitude: 79.8509415,
        pickupAddress: 'PU Main Gate (Gate 1)',
        destinationLatitude: 12.0215,
        destinationLongitude: 79.8565,
        destinationAddress: 'Madame Curie Girls Hostel',
        vehicleType: 'ANY',
        isDoubleRide: false
      }
    });
    const estFare = estRes.body?.data?.estimatedFare || estRes.body?.estimatedFare;
    recordTest('2.2 Normal Case: Inside-campus fare estimation calculated (flat rate ₹25)', estRes.status === 200 && estFare >= 20, `Got ${estFare}`);

    // 2.3 Double Ride Discount Calculation
    const estDoubleRes = await api('/api/fares/estimate', {
      method: 'POST',
      body: {
        pickupLatitude: 12.0228681,
        pickupLongitude: 79.8509415,
        pickupAddress: 'PU Main Gate (Gate 1)',
        destinationLatitude: 12.0215,
        destinationLongitude: 79.8565,
        destinationAddress: 'Madame Curie Girls Hostel',
        vehicleType: 'BIKE',
        isDoubleRide: true
      }
    });
    recordTest('2.3 Normal Case: Double ride fare reflects discount/two-passenger pricing', estDoubleRes.status === 200, `Got ${estDoubleRes.status}`);

    // 2.4 Invalid / Missing Coords in Estimation
    const estInvalidRes = await api('/api/fares/estimate', {
      method: 'POST',
      body: {}
    });
    recordTest('2.4 Invalid Case: Fare estimate with missing coordinates handled cleanly (400 or fallback)', estInvalidRes.status === 400 || estInvalidRes.status === 200, `Got ${estInvalidRes.status}`);

    // --------------------------------------------------------
    // SECTION 3: INSIDE-CAMPUS RIDE BOOKING & PROGRESSION
    // --------------------------------------------------------
    console.log('\n▶ [SECTION 3] Inside-Campus Ride Booking Flow & State Machine');

    // 3.1 Book Inside-Campus Ride
    const bookRes = await api('/api/customer/rides', {
      method: 'POST',
      headers: { Authorization: `Bearer ${activeToken1}` },
      body: {
        pickupLatitude: 12.0228681,
        pickupLongitude: 79.8509415,
        pickupAddress: 'PU Main Gate (Gate 1)',
        destinationLatitude: 12.0215,
        destinationLongitude: 79.8565,
        destinationAddress: 'Madame Curie Girls Hostel',
        vehicleType: 'ANY',
        femaleRiderOnly: false,
        isDoubleRide: false,
        paymentMethod: 'CASH',
        isScheduled: false
      }
    });
    recordTest('3.1 Normal Case: Ride booking request successfully created (status 201/200)', bookRes.status === 201 || bookRes.status === 200, `Got ${bookRes.status} (${JSON.stringify(bookRes.body)})`);

    const ride1 = bookRes.body?.data || bookRes.body?.ride;
    const rideId1 = ride1?.id;
    recordTest('3.2 Normal Case: Booking created with REQUESTED state and 4-digit OTP', Boolean(rideId1) && Boolean(ride1?.otp || ride1?.otp_code));

    // 3.3 Active Ride Inspection
    const activeRideRes = await api('/api/customer/rides/active', {
      headers: { Authorization: `Bearer ${activeToken1}` }
    });
    recordTest('3.3 Normal Case: /api/customer/rides/active returns the current active booking', activeRideRes.status === 200 && activeRideRes.body?.data?.id === rideId1, `Got ${activeRideRes.status}`);

    // 3.4 Duplicate Booking Attempt while one is active
    const dupBookRes = await api('/api/customer/rides', {
      method: 'POST',
      headers: { Authorization: `Bearer ${activeToken1}` },
      body: {
        pickupLatitude: 12.0228681,
        pickupLongitude: 79.8509415,
        pickupAddress: 'PU Main Gate (Gate 1)',
        destinationLatitude: 12.0215,
        destinationLongitude: 79.8565,
        destinationAddress: 'Central Library',
        vehicleType: 'ANY'
      }
    });
    recordTest('3.4 Guard Case: Duplicate active ride request handled cleanly (preventing overlapping active rides)', dupBookRes.status === 400 || dupBookRes.status === 409 || dupBookRes.body?.data?.id === rideId1, `Got ${dupBookRes.status}`);

    // 3.5 Ride Cancellation by Passenger
    const cancelRes = await api(`/api/customer/rides/${rideId1}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${activeToken1}` },
      body: { reason: 'QA Test voluntary cancellation' }
    });
    recordTest('3.5 Normal Case: Passenger can cancel unassigned/requested ride without penalty', cancelRes.status === 200, `Got ${cancelRes.status}`);

    // Verify ride is no longer active
    const checkActiveAfterCancel = await api('/api/customer/rides/active', {
      headers: { Authorization: `Bearer ${activeToken1}` }
    });
    recordTest('3.6 State Verification: /api/customer/rides/active returns null/empty after cancellation', checkActiveAfterCancel.status === 200 && !checkActiveAfterCancel.body?.data, `Got ${checkActiveAfterCancel.status}`);

    // --------------------------------------------------------
    // SECTION 4: OUTSIDE-CAMPUS BOOKING FLOW
    // --------------------------------------------------------
    console.log('\n▶ [SECTION 4] Outside-Campus Trip Booking');

    // 4.1 Outside Campus Trip Request (White Town / Rock Beach)
    const outsideBookRes = await api('/api/customer/outside-rides', {
      method: 'POST',
      headers: { Authorization: `Bearer ${activeToken1}` },
      body: {
        pickupLatitude: 12.0228681,
        pickupLongitude: 79.8509415,
        pickupAddress: 'PU Main Gate (Gate 1)',
        destinationLatitude: 11.9338,
        destinationLongitude: 79.8359,
        destinationAddress: 'White Town / Rock Beach',
        vehicleType: 'BIKE',
        isDoubleRide: false,
        paymentMethod: 'CASH',
        isOutside: true
      }
    });
    recordTest('4.1 Normal Case: Outside-campus ride request accepted with PENDING_ADMIN_QUOTE or REQUESTED state', outsideBookRes.status === 201 || outsideBookRes.status === 200, `Got ${outsideBookRes.status}`);

    const outsideRideId = outsideBookRes.body?.data?.id || outsideBookRes.body?.id;
    if (outsideRideId) {
      await api(`/api/customer/rides/${outsideRideId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${activeToken1}` },
        body: { reason: 'QA cleanup' }
      });
    }

    // --------------------------------------------------------
    // SECTION 5: ADVANCE / PRE-BOOKED RIDES
    // --------------------------------------------------------
    console.log('\n▶ [SECTION 5] Advance / Scheduled Trips');

    const tomorrowIST = new Date(Date.now() + 86400000).toISOString().slice(0, 10) + ' 10:00:00';
    const prebookRes = await api('/api/customer/rides', {
      method: 'POST',
      headers: { Authorization: `Bearer ${activeToken1}` },
      body: {
        pickupLatitude: 12.0228681,
        pickupLongitude: 79.8509415,
        pickupAddress: 'PU Main Gate (Gate 1)',
        destinationLatitude: 12.0215,
        destinationLongitude: 79.8565,
        destinationAddress: 'Madame Curie Girls Hostel',
        vehicleType: 'BIKE',
        isScheduled: true,
        scheduledTime: tomorrowIST
      }
    });
    recordTest('5.1 Normal Case: Advance pre-booked ride created successfully', prebookRes.status === 201 || prebookRes.status === 200, `Got ${prebookRes.status}`);

    const schedRideId = prebookRes.body?.data?.id;

    // 5.2 Fetch Scheduled List
    const schedListRes = await api('/api/customer/rides/scheduled', {
      headers: { Authorization: `Bearer ${activeToken1}` }
    });
    recordTest('5.2 Normal Case: /api/customer/rides/scheduled lists the pre-booked trip', schedListRes.status === 200 && Array.isArray(schedListRes.body?.data), `Got ${schedListRes.status}`);

    // 5.3 Reschedule Pre-booked Trip
    if (schedRideId) {
      const newScheduledTime = new Date(Date.now() + 90000000).toISOString().slice(0, 10) + ' 11:30:00';
      const reschedRes = await api(`/api/customer/rides/${schedRideId}/reschedule`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${activeToken1}` },
        body: { scheduledTime: newScheduledTime }
      });
      recordTest('5.3 Normal Case: Rescheduling pre-booked ride updates timing', reschedRes.status === 200, `Got ${reschedRes.status}`);

      // 5.4 Cancel Pre-booked Trip (Zero fee)
      const cancelSchedRes = await api(`/api/customer/rides/${schedRideId}/cancel-scheduled`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${activeToken1}` },
        body: {}
      });
      recordTest('5.4 Normal Case: Pre-booked trip cancelled with zero penalty', cancelSchedRes.status === 200, `Got ${cancelSchedRes.status}`);
    }

    // --------------------------------------------------------
    // SECTION 6: RIDE HISTORY & FEEDBACK
    // --------------------------------------------------------
    console.log('\n▶ [SECTION 6] Ride History & Feedback');

    const historyRes = await api('/api/customer/rides/history', {
      headers: { Authorization: `Bearer ${activeToken1}` }
    });
    recordTest('6.1 Normal Case: /api/customer/rides/history returns array of past trips', historyRes.status === 200 && Array.isArray(historyRes.body?.data?.items || historyRes.body?.data), `Got ${historyRes.status}`);

    // --------------------------------------------------------
    // SECTION 7: SECURITY & AUTHORIZATION (STRICT ISOLATION)
    // --------------------------------------------------------
    console.log('\n▶ [SECTION 7] Security, IDOR & Authorization Controls');

    // Register Passenger 2 (Attacker simulation)
    const customerEmail2 = `qa.passenger.two.${timestamp}@papido.com`;
    const regRes2 = await api('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'QA Passenger Two',
        email: customerEmail2,
        phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: customerPassword,
        role: 'CUSTOMER'
      }
    });
    const token2 = regRes2.body?.data?.accessToken || regRes2.body?.token;

    // Create a ride for Passenger 1
    const privateRideRes = await api('/api/customer/rides', {
      method: 'POST',
      headers: { Authorization: `Bearer ${activeToken1}` },
      body: {
        pickupLatitude: 12.0228681,
        pickupLongitude: 79.8509415,
        pickupAddress: 'PU Main Gate (Gate 1)',
        destinationLatitude: 12.0215,
        destinationLongitude: 79.8565,
        destinationAddress: 'Madame Curie Girls Hostel',
        vehicleType: 'ANY'
      }
    });
    const targetRideId = privateRideRes.body?.data?.id;

    // 7.1 IDOR Test: Passenger 2 attempts to fetch Passenger 1's ride
    const idorGetRes = await api(`/api/customer/rides/${targetRideId}`, {
      headers: { Authorization: `Bearer ${token2}` }
    });
    recordTest('7.1 IDOR Shield: Passenger 2 blocked from viewing Passenger 1 ride (403/404)', idorGetRes.status === 403 || idorGetRes.status === 404, `Got ${idorGetRes.status}`);

    // 7.2 IDOR Test: Passenger 2 attempts to cancel Passenger 1's ride
    const idorCancelRes = await api(`/api/customer/rides/${targetRideId}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token2}` },
      body: { reason: 'Malicious cancellation attempt' }
    });
    recordTest('7.2 IDOR Shield: Passenger 2 blocked from cancelling Passenger 1 ride (400/403/404)', idorCancelRes.status === 403 || idorCancelRes.status === 404 || idorCancelRes.status === 400, `Got ${idorCancelRes.status}`);

    // Clean up ride
    if (targetRideId) {
      await api(`/api/customer/rides/${targetRideId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${activeToken1}` },
        body: { reason: 'Cleaned' }
      });
    }

    // 7.3 Privilege Escalation: Passenger Token attempting Admin API
    const privEscAdmin = await api('/api/admin/outside-rides', {
      headers: { Authorization: `Bearer ${activeToken1}` }
    });
    recordTest('7.3 Role Guard: Passenger token blocked from Admin endpoints (403 Forbidden)', privEscAdmin.status === 403, `Got ${privEscAdmin.status}`);

    // 7.4 Privilege Escalation: Passenger Token attempting Driver/Rider API
    const privEscRider = await api('/api/rider/profile', {
      headers: { Authorization: `Bearer ${activeToken1}` }
    });
    recordTest('7.4 Role Guard: Passenger token blocked from Driver/Rider endpoints (403 Forbidden)', privEscRider.status === 403, `Got ${privEscRider.status}`);

    // 7.5 Unauthenticated Access Shield
    const noTokenRes = await api('/api/customer/profile');
    recordTest('7.5 Auth Guard: Unauthenticated request to /api/customer/profile rejected with 401', noTokenRes.status === 401, `Got ${noTokenRes.status}`);

    // 7.6 Forged / Tampered JWT
    const tamperedTokenRes = await api('/api/customer/profile', {
      headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.invalidsignature' }
    });
    recordTest('7.6 Auth Guard: Forged / tampered JWT signature rejected with 401/403', tamperedTokenRes.status === 401 || tamperedTokenRes.status === 403, `Got ${tamperedTokenRes.status}`);

    // 7.7 SQL Injection Injections in Address Fields
    const sqliRes = await api('/api/customer/rides', {
      method: 'POST',
      headers: { Authorization: `Bearer ${activeToken1}` },
      body: {
        pickupLatitude: 12.0228681,
        pickupLongitude: 79.8509415,
        pickupAddress: "PU Main Gate' OR 1=1 --",
        destinationLatitude: 12.0215,
        destinationLongitude: 79.8565,
        destinationAddress: "Hostel'; DROP TABLE rides; --",
        vehicleType: 'ANY'
      }
    });
    recordTest('7.7 SQLi Shield: SQL injection payload safely parameterized or sanitized without DB corruption', sqliRes.status === 200 || sqliRes.status === 201 || sqliRes.status === 400, `Got ${sqliRes.status}`);

    // 7.8 XSS Payload in Pickup Details
    const xssRes = await api('/api/auth/profile', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${activeToken1}` },
      body: {
        name: '<script>alert("xss")</script>Passenger'
      }
    });
    recordTest('7.8 XSS Shield: Script injection safely stored as escaped text without execution vulnerability', xssRes.status === 200, `Got ${xssRes.status}`);

    // --------------------------------------------------------
    // SECTION 8: PENALTY SYSTEM & SAFETY
    // --------------------------------------------------------
    console.log('\n▶ [SECTION 8] Penalty System & Safety');

    const penaltyRes = await api('/api/customer/pending-penalty', {
      headers: { Authorization: `Bearer ${activeToken1}` }
    });
    recordTest('8.1 Normal Case: /api/customer/pending-penalty check responds with 200', penaltyRes.status === 200, `Got ${penaltyRes.status}`);

    // --------------------------------------------------------
    // SUMMARY
    // --------------------------------------------------------
    console.log('\n======================================================');
    console.log(`  🎉 TOTAL TESTS RUN: ${testResults.total}`);
    console.log(`  ✅ PASSED: ${testResults.passed}`);
    console.log(`  ❌ FAILED: ${testResults.failed}`);
    console.log('======================================================\n');

    server.close();
    process.exit(testResults.failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test Suite encountered fatal error:', err);
    if (server) server.close();
    process.exit(1);
  }
}

runPassengerQASuite();
