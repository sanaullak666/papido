const { initializeDatabase } = require('../src/config/database');
const AuthService = require('../src/services/auth.service');
const FareService = require('../src/services/fare.service');
const RideService = require('../src/services/ride.service');
const RiderModel = require('../src/models/rider.model');
const RideModel = require('../src/models/ride.model');
const UserModel = require('../src/models/user.model');
const EarningModel = require('../src/models/earning.model');

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

async function runTests() {
  console.log('\n======================================================');
  console.log('  🧪 RUNNING PAPIDO TEST SUITE');
  console.log('======================================================\n');

  try {
    // Initialize DB
    await initializeDatabase();

    // ----------------------------------------------------
    // TEST 1: User Authentication & Passwords
    // ----------------------------------------------------
    console.log('▶ [1] Testing Authentication & Password Hashing...');
    const testEmail = `test.cust.${Date.now()}@papido.com`;
    const regResult = await AuthService.register({
      name: 'Test Customer Automated',
      email: testEmail,
      phone: `+9199${Date.now().toString().slice(-8)}`,
      password: 'SecurePassword@123',
      role: 'CUSTOMER'
    });

    assert(regResult.user.id > 0, 'Customer registered with valid ID');
    assert(regResult.user.role === 'CUSTOMER', 'Customer role correctly set');
    assert(typeof regResult.accessToken === 'string', 'JWT access token issued');

    const loginResult = await AuthService.login({
      email: testEmail,
      password: 'SecurePassword@123',
      expectedRole: 'CUSTOMER'
    });
    assert(loginResult.user.email === testEmail, 'Login successful with correct password');

    let failedLogin = false;
    try {
      await AuthService.login({
        email: testEmail,
        password: 'WrongPassword!',
        expectedRole: 'CUSTOMER'
      });
    } catch (e) {
      failedLogin = true;
    }
    assert(failedLogin, 'Login rejected with incorrect password');

    // ----------------------------------------------------
    // TEST 2: Role Separation
    // ----------------------------------------------------
    console.log('\n▶ [2] Testing Role Separation & Guard Rails...');
    let roleMismatchCaught = false;
    try {
      await AuthService.login({
        email: testEmail,
        password: 'SecurePassword@123',
        expectedRole: 'RIDER' // Expected RIDER but user is CUSTOMER
      });
    } catch (e) {
      roleMismatchCaught = true;
    }
    assert(roleMismatchCaught, 'Customer blocked from logging in as RIDER');

    // ----------------------------------------------------
    // TEST 3: Dynamic Fare Calculation & Estimates
    // ----------------------------------------------------
    console.log('\n▶ [3] Testing Configurable Fare Calculation Engine...');
    const fareBike = await FareService.calculateEstimatedFare(5.0, 15, 'BIKE');
    assert(fareBike.estimatedFare >= 25.0, `Bike fare computed: ₹${fareBike.estimatedFare} (min ₹25)`);

    const fareAuto = await FareService.calculateEstimatedFare(5.0, 18, 'AUTO');
    assert(fareAuto.estimatedFare > fareBike.estimatedFare, `Auto fare (₹${fareAuto.estimatedFare}) > Bike fare (₹${fareBike.estimatedFare})`);

    // ----------------------------------------------------
    // TEST 4: Papido Configurable Dynamic Split System
    // ----------------------------------------------------
    console.log('\n▶ [4] Testing Papido Split Rules...');
    
    // Tier 1: Fare <= 25 => Company = ₹2, Rider = ₹(Fare - 2)
    const split25 = await FareService.calculateFareSplit(25.00);
    assert(split25.companyEarning === 2.00, `Fare ₹25: Company cut is ₹2.00 (Got ₹${split25.companyEarning})`);
    assert(split25.riderEarning === 23.00, `Fare ₹25: Rider cut is ₹23.00 (Got ₹${split25.riderEarning})`);

    // Tier 2: Fare 25.01 - 35 => Company = ₹3, Rider = ₹(Fare - 3)
    const split30 = await FareService.calculateFareSplit(30.00);
    assert(split30.companyEarning === 3.00, `Fare ₹30: Company cut is ₹3.00 (Got ₹${split30.companyEarning})`);
    assert(split30.riderEarning === 27.00, `Fare ₹30: Rider cut is ₹27.00 (Got ₹${split30.riderEarning})`);

    // Tier 3: Fare 35.01 - 60 => Company = ₹4, Rider = ₹(Fare - 4)
    const split50 = await FareService.calculateFareSplit(50.00);
    assert(split50.companyEarning === 4.00, `Fare ₹50: Company cut is ₹4.00 (Got ₹${split50.companyEarning})`);
    assert(split50.riderEarning === 46.00, `Fare ₹50: Rider cut is ₹46.00 (Got ₹${split50.riderEarning})`);

    // Tier 4: Fare > 60 => Company = 20%, Rider = 80%
    const split100 = await FareService.calculateFareSplit(100.00);
    assert(split100.companyEarning === 20.00, `Fare ₹100: Company cut is 20% = ₹20.00 (Got ₹${split100.companyEarning})`);
    assert(split100.riderEarning === 80.00, `Fare ₹100: Rider cut is 80% = ₹80.00 (Got ₹${split100.riderEarning})`);

    // ----------------------------------------------------
    // TEST 5: Complete Ride Lifecycle State Machine
    // ----------------------------------------------------
    console.log('\n▶ [5] Testing Ride State Machine (REQUESTED -> ACCEPTED -> ARRIVING -> REACHED -> STARTED -> COMPLETED)...');
    
    // 1. Request
    const customerUser = regResult.user;
    let riderUser = await UserModel.findByEmail('rider.rahul@papido.com');
    if (!riderUser) {
      const riderReg = await AuthService.register({
        name: 'Test Driver Automated',
        email: `test.driver.${Date.now()}@papido.com`,
        phone: `+9197${Date.now().toString().slice(-8)}`,
        password: 'Password@123',
        role: 'RIDER',
        profileData: {
          vehicleType: 'BIKE',
          vehicleModel: 'Hero Splendor Plus',
          verificationStatus: 'APPROVED'
        }
      });
      riderUser = riderReg.user;
      await RiderModel.updateVerificationStatus(riderUser.id, 'APPROVED');
    }
    
    const ride = await RideService.requestRide({
      customerId: customerUser.id,
      vehicleType: 'BIKE',
      pickupAddress: 'Campus Main Library',
      pickupLatitude: 12.971598,
      pickupLongitude: 77.594566,
      destinationAddress: 'Tech Block 5',
      destinationLatitude: 12.979000,
      destinationLongitude: 77.601000,
      paymentMethod: 'CASH'
    });

    assert(ride.status === 'REQUESTED', 'Ride created in REQUESTED state');
    assert(ride.otp && ride.otp.length === 4, `4-digit OTP generated: ${ride.otp}`);

    // 2. Accept
    const acceptedRide = await RideService.acceptRide(ride.id, riderUser.id);
    assert(acceptedRide.status === 'ACCEPTED', 'Ride transitioned to ACCEPTED state');
    assert(acceptedRide.rider_id === riderUser.id, 'Rider assigned to ride');

    // 3. Arriving
    const arrivingRide = await RideService.setRiderArriving(ride.id, riderUser.id);
    assert(arrivingRide.status === 'RIDER_ARRIVING', 'Ride transitioned to RIDER_ARRIVING state');

    // 4. Reached
    const reachedRide = await RideService.setRiderReached(ride.id, riderUser.id);
    assert(reachedRide.status === 'RIDER_REACHED', 'Ride transitioned to RIDER_REACHED state');

    // 5. Start with OTP
    const startedRide = await RideService.startRide(ride.id, riderUser.id, ride.otp);
    assert(startedRide.status === 'STARTED', 'Ride transitioned to STARTED state after OTP verification');

    // 6. Complete
    const completeResult = await RideService.completeRide(ride.id, riderUser.id);
    assert(completeResult.ride.status === 'COMPLETED', 'Ride transitioned to COMPLETED state');
    assert(completeResult.payment.payment_status === 'COMPLETED', 'Payment record created with status COMPLETED');
    assert(completeResult.earning.rider_earning > 0, `Rider earning recorded: ₹${completeResult.earning.rider_earning}`);

    // 7. Rating
    const ratingResult = await RideService.submitRating({
      rideId: ride.id,
      customerId: customerUser.id,
      rating: 5.0,
      review: 'Awesome fast campus ride!'
    });
    assert(ratingResult.rating === 5.0, 'Customer rating submitted and recorded');

    // ----------------------------------------------------
    // TEST 6: Rider Earnings Summary & Platform Financials
    // ----------------------------------------------------
    console.log('\n▶ [6] Testing Rider Earnings & Financial Ledger...');
    const earnings = await EarningModel.getRiderEarningsSummary(riderUser.id);
    assert(earnings.lifetime.rides > 0, `Rider total completed rides tracked: ${earnings.lifetime.rides}`);
    assert(earnings.lifetime.earnings > 0, `Rider total lifetime earnings tracked: ₹${earnings.lifetime.earnings}`);

    // ----------------------------------------------------
    // TEST 7: Cancellation Flow
    // ----------------------------------------------------
    console.log('\n▶ [7] Testing Ride Cancellation Flow...');
    const rideToCancel = await RideService.requestRide({
      customerId: customerUser.id,
      vehicleType: 'BIKE',
      pickupAddress: 'Hostel Block A',
      pickupLatitude: 12.968000,
      pickupLongitude: 77.591000,
      destinationAddress: 'Sports Stadium',
      destinationLatitude: 12.976800,
      destinationLongitude: 77.592500
    });

    const cancelledRide = await RideService.cancelRide(rideToCancel.id, customerUser.id, 'CUSTOMER', 'Changed travel plans');
    assert(cancelledRide.status === 'CANCELLED', 'Ride successfully transitioned to CANCELLED state');
    assert(cancelledRide.cancelled_by_role === 'CUSTOMER', 'Cancelled by role recorded accurately');

    // ----------------------------------------------------
    // TEST 8: Regression - Ride Start OTP Enforcement
    // ----------------------------------------------------
    console.log('\n▶ [8] Testing Ride Start OTP Verification Enforcement...');
    const otpTestRide = await RideService.requestRide({
      customerId: customerUser.id,
      vehicleType: 'BIKE',
      pickupAddress: 'Science Complex',
      pickupLatitude: 12.0261,
      pickupLongitude: 79.8550,
      destinationAddress: 'Main Gate',
      destinationLatitude: 12.0228,
      destinationLongitude: 79.8509
    });

    await RideService.acceptRide(otpTestRide.id, riderUser.id);
    await RideService.setRiderReached(otpTestRide.id, riderUser.id);

    let emptyOtpCaught = false;
    try {
      await RideService.startRide(otpTestRide.id, riderUser.id, '');
    } catch (e) {
      emptyOtpCaught = true;
    }
    assert(emptyOtpCaught, 'startRide rejected when empty OTP supplied');

    let wrongOtpCaught = false;
    try {
      await RideService.startRide(otpTestRide.id, riderUser.id, '0000');
    } catch (e) {
      wrongOtpCaught = true;
    }
    assert(wrongOtpCaught, 'startRide rejected when wrong OTP supplied');

    const startedOtpRide = await RideService.startRide(otpTestRide.id, riderUser.id, otpTestRide.otp);
    assert(startedOtpRide.status === 'STARTED', 'startRide accepted with correct 4-digit customer OTP');

    // ----------------------------------------------------
    // TEST 9: Regression - Started Ride Cancellation Blocking
    // ----------------------------------------------------
    console.log('\n▶ [9] Testing Cancellation Prevention for Started Rides (Free Ride Exploit Shield)...');
    let cancelStartedCaught = false;
    try {
      await RideService.cancelRide(otpTestRide.id, customerUser.id, 'CUSTOMER', 'Trying to cancel in transit');
    } catch (e) {
      cancelStartedCaught = true;
    }
    assert(cancelStartedCaught, 'Passenger blocked from cancelling ride that is already STARTED in progress');

    // Complete the test ride safely
    await RideService.completeRide(otpTestRide.id, riderUser.id);

    // ----------------------------------------------------
    // TEST 10: Regression - Concurrent Ride Acceptance (Race Condition Shield)
    // ----------------------------------------------------
    console.log('\n▶ [10] Testing Concurrent Driver Acceptance Protection...');
    const raceRide = await RideService.requestRide({
      customerId: customerUser.id,
      vehicleType: 'BIKE',
      pickupAddress: 'Library Block',
      pickupLatitude: 12.0245,
      pickupLongitude: 79.8532,
      destinationAddress: 'ECR Gate',
      destinationLatitude: 12.0295,
      destinationLongitude: 79.8580
    });

    // First acceptance succeeds
    const firstAccept = await RideService.acceptRide(raceRide.id, riderUser.id);
    assert(firstAccept.status === 'ACCEPTED', 'First driver successfully accepts ride');

    // Second acceptance must fail with error
    let secondAcceptBlocked = false;
    try {
      await RideModel.assignRider(raceRide.id, 99999);
    } catch (e) {
      secondAcceptBlocked = true;
    }
    assert(secondAcceptBlocked, 'Second concurrent acceptance blocked by atomic status guard');

    // Clean up test ride
    await RideService.cancelRide(raceRide.id, customerUser.id, 'CUSTOMER', 'Race test clean up');

    // ----------------------------------------------------
    // TEST 11: Regression - UserModel.delete Alias & Cleanup
    // ----------------------------------------------------
    console.log('\n▶ [11] Testing UserModel.delete Alias & Error Recovery...');
    assert(typeof UserModel.delete === 'function', 'UserModel.delete is a callable function');
    assert(typeof UserModel.deleteUser === 'function', 'UserModel.deleteUser is a callable function');

    // ----------------------------------------------------
    // TEST 12: Regression - SSRF Protection on Map Link Resolver
    // ----------------------------------------------------
    console.log('\n▶ [12] Testing SSRF Protection against Internal IPs and Cloud Metadata...');
    const MapService = require('../src/services/map.service');
    const ssrfLoopback = await MapService.resolveMapLink('http://127.0.0.1:5000/api/health');
    assert(ssrfLoopback === null, 'SSRF blocked for 127.0.0.1 loopback URL');

    const ssrfMetadata = await MapService.resolveMapLink('http://169.254.169.254/latest/meta-data/');
    assert(ssrfMetadata === null, 'SSRF blocked for cloud metadata IP 169.254.169.254');

    const ssrfPrivate = await MapService.resolveMapLink('http://192.168.1.1/admin');
    assert(ssrfPrivate === null, 'SSRF blocked for private 192.168.x network');

    const ssrfEvilDomain = await MapService.resolveMapLink('https://evil-attacker-site.com/exploit');
    assert(ssrfEvilDomain === null, 'SSRF blocked for unauthorized arbitrary external domains');

    const validCoords = await MapService.resolveMapLink('12.0228, 79.8509');
    assert(validCoords && validCoords.success === true, 'Valid GPS coordinates properly resolved');

    // ----------------------------------------------------
    // TEST 13: Regression - StorageService Cloud & Local Fallback
    // ----------------------------------------------------
    console.log('\n▶ [13] Testing StorageService Resilient Upload Pipeline...');
    const storageService = require('../src/services/storage.service');
    assert(typeof storageService.uploadFile === 'function', 'storageService.uploadFile is a callable function');

    const testUploadResult = await storageService.uploadFile({
      buffer: Buffer.from('%PDF-1.4 test document content'),
      filename: `test_license_${Date.now()}.pdf`,
      mimetype: 'application/pdf',
      folder: 'documents'
    });
    assert(testUploadResult && testUploadResult.success === true, 'Storage upload successfully returned success: true');
    assert(testUploadResult.url && testUploadResult.url.length > 0, 'Storage upload returned valid URL');
    assert(testUploadResult.provider === 'local' || testUploadResult.provider === 'r2' || testUploadResult.provider === 's3', 'Storage upload resolved valid provider');

    // ----------------------------------------------------
    // TEST 14: Regression - SocketManager Multi-Instance Adapter Readiness
    // ----------------------------------------------------
    console.log('\n▶ [14] Testing SocketManager Horizontal Clustering Readiness...');
    const http = require('http');
    const SocketManager = require('../src/sockets/socketManager');
    const dummyServer = http.createServer();
    const testSocketManager = new SocketManager(dummyServer);
    assert(testSocketManager && testSocketManager.io, 'SocketManager initializes with io server instance');
    assert(typeof testSocketManager.setupRedisAdapter === 'function', 'SocketManager has setupRedisAdapter method');
    dummyServer.close();

    console.log('\n======================================================');
    console.log(`  🎉 TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('======================================================\n');

    if (failedTests > 0) {
      process.exit(1);
    }
    process.exit(0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
