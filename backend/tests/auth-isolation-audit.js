const { initializeDatabase } = require('../src/config/database');
const AuthService = require('../src/services/auth.service');
const { verifyToken } = require('../src/middleware/auth.middleware');
const { requireRole } = require('../src/middleware/role.middleware');
const jwt = require('jsonwebtoken');
const env = require('../src/config/environment');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  }
}

async function runAudit() {
  console.log('\n======================================================');
  console.log('  🔒 PAPIDO AUTH & ROLE ISOLATION AUDIT SUITE');
  console.log('======================================================\n');

  await initializeDatabase();

  const now = Date.now();
  const passengerEmail = `audit.passenger.${now}@papido.com`;
  const passengerPhone = `91${now.toString().slice(-8)}`;
  const riderEmail = `audit.rider.${now}@papido.com`;
  const riderPhone = `92${now.toString().slice(-8)}`;
  const password = 'SecurePassword@123';

  // 1. Register Passenger
  console.log('▶ [1] Registering Test Passenger & Rider accounts...');
  const passReg = await AuthService.register({
    name: 'Audit Passenger',
    email: passengerEmail,
    phone: passengerPhone,
    password: password,
    role: 'CUSTOMER'
  });
  assert(passReg.user.role === 'CUSTOMER', 'Passenger registered with CUSTOMER role');

  const riderReg = await AuthService.register({
    name: 'Audit Rider',
    email: riderEmail,
    phone: riderPhone,
    password: password,
    role: 'RIDER',
    profileData: {
      vehicleType: 'BIKE',
      vehicleModel: 'Hero Splendor',
      collegeIdDocUrl: 'https://example.com/id.jpg'
    }
  });
  assert(riderReg.user.role === 'RIDER', 'Rider registered with RIDER role');

  // 2. Scenario A & B: Fresh Login
  console.log('\n▶ [2] Testing Scenario A & B: Fresh Role Logins...');
  const passLogin = await AuthService.login({
    email: passengerEmail,
    password: password,
    expectedRole: 'CUSTOMER'
  });
  assert(passLogin.user.role === 'CUSTOMER', 'Scenario A: Passenger logged in to Passenger portal successfully');

  const riderLogin = await AuthService.login({
    email: riderEmail,
    password: password,
    expectedRole: 'RIDER'
  });
  assert(riderLogin.user.role === 'RIDER', 'Scenario B: Rider logged in to Rider portal successfully');

  // 3. Scenario I: Invalid credentials
  console.log('\n▶ [3] Testing Scenario I: Invalid Credentials Error Handling...');
  let invalidCredError = null;
  try {
    await AuthService.login({
      email: passengerEmail,
      password: 'IncorrectPassword999!',
      expectedRole: 'CUSTOMER'
    });
  } catch (err) {
    invalidCredError = err;
  }
  assert(invalidCredError !== null, 'Scenario I: Invalid password correctly rejected');
  assert(invalidCredError.message.includes('Invalid email or password'), 'Scenario I: Message is "Invalid email or password", NOT cross-portal error');
  assert(invalidCredError.code !== 'ROLE_VIOLATION', 'Scenario I: Error code is NOT ROLE_VIOLATION');

  // 4. Role Toggle Mismatch: Passenger logging in as RIDER
  console.log('\n▶ [4] Testing Role Toggle Mismatch: Passenger selecting Rider tab...');
  let roleMismatchError = null;
  try {
    await AuthService.login({
      email: passengerEmail,
      password: password,
      expectedRole: 'RIDER'
    });
  } catch (err) {
    roleMismatchError = err;
  }
  assert(roleMismatchError !== null, 'Role mismatch rejected by backend');
  assert(roleMismatchError.code === 'ROLE_MISMATCH', 'Error code is ROLE_MISMATCH (HTTP 400 compatible)');
  assert(roleMismatchError.message.includes('Please select the correct account type'), 'Message is user-friendly account type mismatch hint');

  // 5. Scenario C & D: Expired Token
  console.log('\n▶ [5] Testing Scenario C & D: Expired JWT Token Handling...');
  const expiredPayload = { id: passReg.user.id, role: 'CUSTOMER', type: 'access' };
  const expiredToken = jwt.sign(expiredPayload, env.JWT.SECRET, { expiresIn: '-10s' }); // Expired in the past

  let expiredReq = {
    headers: { authorization: `Bearer ${expiredToken}` }
  };
  let expiredResStatus = null;
  let expiredResBody = null;
  const mockExpiredRes = {
    status(s) { expiredResStatus = s; return this; },
    json(b) { expiredResBody = b; return this; }
  };

  await verifyToken(expiredReq, mockExpiredRes, () => {});
  assert(expiredResStatus === 401, 'Scenario C & D: Expired token returns HTTP 401 (NOT 403)');
  assert(expiredResBody.message.includes('expired'), 'Scenario C & D: Message notes token expiration');
  assert(expiredResBody.code !== 'ROLE_VIOLATION', 'Scenario C & D: Expired token does NOT return ROLE_VIOLATION');

  // 6. Scenario E: Missing / No Token
  console.log('\n▶ [6] Testing Scenario E: Missing Token...');
  let noTokenReq = { headers: {} };
  let noTokenStatus = null;
  let noTokenBody = null;
  const mockNoTokenRes = {
    status(s) { noTokenStatus = s; return this; },
    json(b) { noTokenBody = b; return this; }
  };
  await verifyToken(noTokenReq, mockNoTokenRes, () => {});
  assert(noTokenStatus === 401, 'Scenario E: Missing token returns HTTP 401');
  assert(noTokenBody.code !== 'ROLE_VIOLATION', 'Scenario E: Missing token does NOT return ROLE_VIOLATION');

  // 7. Scenario F: Authenticated Passenger attempting Rider route
  console.log('\n▶ [7] Testing Scenario F: Authenticated Passenger attempting Rider Route...');
  const riderGuard = requireRole('RIDER');
  let passOnRiderStatus = null;
  let passOnRiderBody = null;
  const mockPassOnRiderRes = {
    status(s) { passOnRiderStatus = s; return this; },
    json(b) { passOnRiderBody = b; return this; }
  };
  riderGuard({ user: passReg.user }, mockPassOnRiderRes, () => {
    assert(false, 'Should NOT allow Passenger into Rider route');
  });
  assert(passOnRiderStatus === 403, 'Scenario F: Passenger blocked with HTTP 403');
  assert(passOnRiderBody.code === 'ROLE_VIOLATION', 'Scenario F: Explicit machine-readable ROLE_VIOLATION code emitted');
  assert(passOnRiderBody.message === 'This account cannot access this portal.', 'Scenario F: Security message returned');

  // 8. Scenario G: Authenticated Rider attempting Passenger route
  console.log('\n▶ [8] Testing Scenario G: Authenticated Rider attempting Passenger Route...');
  const customerGuard = requireRole('CUSTOMER');
  let riderOnPassStatus = null;
  let riderOnPassBody = null;
  const mockRiderOnPassRes = {
    status(s) { riderOnPassStatus = s; return this; },
    json(b) { riderOnPassBody = b; return this; }
  };
  customerGuard({ user: riderReg.user }, mockRiderOnPassRes, () => {
    assert(false, 'Should NOT allow Rider into Passenger route');
  });
  assert(riderOnPassStatus === 403, 'Scenario G: Rider blocked with HTTP 403');
  assert(riderOnPassBody.code === 'ROLE_VIOLATION', 'Scenario G: Explicit machine-readable ROLE_VIOLATION code emitted');
  assert(riderOnPassBody.message === 'This account cannot access this portal.', 'Scenario G: Security message returned');

  // 9. Scenario H: Non-Admin attempting Admin route
  console.log('\n▶ [9] Testing Scenario H: Non-Admin attempting Admin Route...');
  const adminGuard = requireRole('ADMIN');
  let passOnAdminStatus = null;
  let passOnAdminBody = null;
  const mockPassOnAdminRes = {
    status(s) { passOnAdminStatus = s; return this; },
    json(b) { passOnAdminBody = b; return this; }
  };
  adminGuard({ user: passReg.user }, mockPassOnAdminRes, () => {
    assert(false, 'Should NOT allow Passenger into Admin route');
  });
  assert(passOnAdminStatus === 403, 'Scenario H: Passenger blocked from Admin route with HTTP 403');
  assert(passOnAdminBody.code === 'ROLE_VIOLATION', 'Scenario H: Explicit ROLE_VIOLATION code emitted');

  // 10. Valid Role access
  console.log('\n▶ [10] Testing Valid Role Routes (Should Pass)...');
  let passengerPassed = false;
  customerGuard({ user: passReg.user }, {}, () => { passengerPassed = true; });
  assert(passengerPassed === true, 'Passenger successfully authorized on Passenger route');

  let riderPassed = false;
  riderGuard({ user: riderReg.user }, {}, () => { riderPassed = true; });
  assert(riderPassed === true, 'Rider successfully authorized on Rider route');

  console.log('\n======================================================');
  console.log(`  🎉 AUDIT RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runAudit().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
