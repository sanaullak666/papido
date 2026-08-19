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
    const riderUser = await UserModel.findByEmail('rider.rahul@papido.com');
    
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

    console.log('\n======================================================');
    console.log(`  🎉 TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('======================================================\n');

    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
