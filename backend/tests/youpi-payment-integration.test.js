process.env.NODE_ENV = 'test';
const crypto = require('crypto');
const { initializeDatabase } = require('../src/config/database');
const db = require('../src/config/database');
const YoupiService = require('../src/services/youpi.service');
const PaymentService = require('../src/services/payment.service');
const PaymentModel = require('../src/models/payment.model');
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

async function runYoupiIntegrationTests() {
  console.log('\n======================================================');
  console.log('  🧪 RUNNING PAPIDO YOUPI PG V2 INTEGRATION TEST SUITE');
  console.log('======================================================\n');

  try {
    await initializeDatabase();

    // ----------------------------------------------------
    // TEST 1: Order ID Generation & Papido Ride ID Preservation
    // ----------------------------------------------------
    console.log('▶ [1] Testing Ride & Settlement Order ID Preservation...');
    const testRideId = 105;
    const generatedRideOrderId = YoupiService.generateRideOrderId(testRideId);
    assert(
      generatedRideOrderId.startsWith(`PAPIDO-RIDE-${testRideId}-`),
      `Ride Order ID starts with PAPIDO-RIDE-${testRideId}- (${generatedRideOrderId})`
    );

    const parsedRideId = PaymentService.parseRideId(generatedRideOrderId);
    assert(
      parsedRideId === testRideId,
      `Parsed rideId matches original rideId: ${parsedRideId} === ${testRideId}`
    );

    const testRiderId = 42;
    const testDate = '2026-10-18';
    const generatedSettleOrderId = YoupiService.generateSettlementOrderId(testRiderId, testDate);
    assert(
      generatedSettleOrderId.startsWith(`PAPIDO-SETTLE-RIDER${testRiderId}-20261018-`),
      `Settlement Order ID contains riderId and date (${generatedSettleOrderId})`
    );

    const { riderId: parsedRiderId, dateStr: parsedDate } = PaymentService.parseSettlementInfo(generatedSettleOrderId);
    assert(
      parsedRiderId === testRiderId && parsedDate === testDate,
      `Parsed settlement info matches: riderId=${parsedRiderId}, date=${parsedDate}`
    );

    // ----------------------------------------------------
    // TEST 2: Cryptographic Webhook HMAC-SHA256 Signature Verification
    // ----------------------------------------------------
    console.log('\n▶ [2] Testing Webhook HMAC-SHA256 Cryptographic Verification...');
    const testSecret = 'papido_test_secret_key_32_characters_long';
    const samplePayload = JSON.stringify({
      event: 'PAYMENT_SUCCESS',
      paymentId: 'youpi_pay_test_998877',
      orderId: generatedRideOrderId,
      amount: '35.00',
      currency: 'INR',
      status: 'SUCCESS',
      timestamp: new Date().toISOString()
    });

    const validSignature = crypto
      .createHmac('sha256', testSecret)
      .update(Buffer.from(samplePayload, 'utf8'))
      .digest('hex');

    // Valid signature with sha256= prefix
    const isValidWithPrefix = YoupiService.verifyWebhookSignature(samplePayload, `sha256=${validSignature}`, testSecret);
    assert(isValidWithPrefix === true, 'Signature verified successfully with sha256= prefix');

    // Valid signature without prefix
    const isValidWithoutPrefix = YoupiService.verifyWebhookSignature(samplePayload, validSignature, testSecret);
    assert(isValidWithoutPrefix === true, 'Signature verified successfully without prefix');

    // Tampered payload
    const tamperedPayload = samplePayload.replace('35.00', '1.00');
    const isTamperedRejected = YoupiService.verifyWebhookSignature(tamperedPayload, `sha256=${validSignature}`, testSecret);
    assert(isTamperedRejected === false, 'Tampered payload rejected (integrity check)');

    // Wrong secret
    const isWrongSecretRejected = YoupiService.verifyWebhookSignature(samplePayload, `sha256=${validSignature}`, 'wrong_secret_key');
    assert(isWrongSecretRejected === false, 'Incorrect secret rejected');

    // Empty or malformed signature
    assert(YoupiService.verifyWebhookSignature(samplePayload, '', testSecret) === false, 'Empty signature rejected');
    assert(YoupiService.verifyWebhookSignature(samplePayload, 'malformed-short-hex', testSecret) === false, 'Malformed signature length rejected without crash');

    // ----------------------------------------------------
    // TEST 3: Database Tables & Column Verification
    // ----------------------------------------------------
    console.log('\n▶ [3] Verifying Database Schema for YouPI Integration...');
    const paymentsCols = await db.query('SHOW COLUMNS FROM payments');
    const paymentColNames = paymentsCols.map(c => c.Field);
    assert(paymentColNames.includes('order_id'), 'payments table has order_id column');
    assert(paymentColNames.includes('gateway_payment_id'), 'payments table has gateway_payment_id column');
    assert(paymentColNames.includes('gateway'), 'payments table has gateway column');
    assert(paymentColNames.includes('utr'), 'payments table has utr column');

    const txTableCheck = await db.query("SHOW TABLES LIKE 'payment_transactions'");
    assert(txTableCheck.length > 0, 'payment_transactions table exists for audit history and idempotency');

    const settleTableCheck = await db.query("SHOW TABLES LIKE 'daily_shift_settlements'");
    assert(settleTableCheck.length > 0, 'daily_shift_settlements table exists');

    // ----------------------------------------------------
    // TEST 4: FLOW A - Passenger Ride Payment Creation & Completion Lifecycle
    // ----------------------------------------------------
    console.log('\n▶ [4] Testing Flow A: Passenger Ride Payment Lifecycle...');
    // Create test customer
    const ts = Date.now();
    const custRes = await db.query(
      `INSERT INTO users (name, email, phone, role, status, password_hash)
       VALUES (?, ?, ?, 'CUSTOMER', 'ACTIVE', 'dummy_hash')`,
      [`Test Customer ${ts}`, `cust.${ts}@papido.test`, `+9198${String(ts).slice(-8)}`]
    );
    const testCustomerId = custRes.insertId;

    // Create test rider
    const riderRes = await db.query(
      `INSERT INTO users (name, email, phone, role, status, password_hash)
       VALUES (?, ?, ?, 'RIDER', 'ACTIVE', 'dummy_hash')`,
      [`Test Rider ${ts}`, `rider.${ts}@papido.test`, `+9197${String(ts).slice(-8)}`]
    );
    const testDriverId = riderRes.insertId;

    // Create completed ride with final_fare = 45.00
    const rideRes = await db.query(
      `INSERT INTO rides (
         ride_code, customer_id, rider_id, status, payment_status, payment_method,
         final_fare, estimated_fare, pickup_address, destination_address,
         requested_at, completed_at
       ) VALUES (?, ?, ?, 'COMPLETED', 'PENDING', 'UPI', 45.00, 45.00, 'Campus Gate 1', 'Library', NOW(), NOW())`,
      [`PU-TEST-${ts}`, testCustomerId, testDriverId]
    );
    const createdRideId = rideRes.insertId;

    // Step A.1: Passenger initiates ride payment
    const sessionResult = await PaymentService.createRidePayment(createdRideId, testCustomerId);
    assert(sessionResult.success === true, 'createRidePayment returned success: true');
    assert(sessionResult.rideId === createdRideId, `Session preserved exact rideId: ${sessionResult.rideId} === ${createdRideId}`);
    assert(parseFloat(sessionResult.amount) === 45.00, 'Session amount equals ride final_fare (₹45.00)');
    assert(typeof sessionResult.checkoutUrl === 'string', 'Session provides checkoutUrl for client');
    assert(typeof sessionResult.orderId === 'string', 'Session generated unique gateway orderId');

    // Verify transaction attempt recorded
    const txRecords = await PaymentModel.getTransactionsForReference('RIDE_FARE', createdRideId);
    assert(txRecords.length >= 1, 'Transaction attempt saved in payment_transactions');
    assert(txRecords[0].order_id === sessionResult.orderId, 'Recorded transaction order_id matches session');

    // Step A.2: Simulate incoming YouPI Webhook for Payment Success
    const testUtr = `4281${String(Date.now()).slice(-8)}`;
    const webhookPayloadObj = {
      event: 'PAYMENT_SUCCESS',
      orderId: sessionResult.orderId,
      paymentId: sessionResult.paymentId,
      amount: '45.00',
      currency: 'INR',
      status: 'SUCCESS',
      utr: testUtr,
      metadata: {
        type: 'RIDE_FARE',
        rideId: createdRideId
      }
    };
    const webhookPayloadRaw = JSON.stringify(webhookPayloadObj);
    const webhookSig = crypto
      .createHmac('sha256', process.env.YOUPI_WEBHOOK_SECRET || 'papido_youpi_webhook_secret_key_32_chars')
      .update(Buffer.from(webhookPayloadRaw, 'utf8'))
      .digest('hex');

    const webhookHeaders = {
      'x-gateway-signature': `sha256=${webhookSig}`
    };

    const webhookResult = await PaymentService.processYoupiWebhook(webhookPayloadRaw, webhookHeaders);
    assert(webhookResult.success === true, 'Webhook processed successfully');
    assert(webhookResult.status === 'SUCCESS', 'Webhook returned status: SUCCESS');

    // Verify Database State Transition: rides table
    const updatedRide = await RideModel.findById(createdRideId);
    assert(updatedRide.payment_status === 'PAID', `Ride payment_status updated to PAID (actual: ${updatedRide.payment_status})`);

    // Verify Database State Transition: payments table
    const updatedPayment = await PaymentModel.findByRideId(createdRideId);
    assert(updatedPayment.payment_status === 'COMPLETED', `Payment record status updated to COMPLETED (actual: ${updatedPayment.payment_status})`);
    assert(updatedPayment.utr === testUtr, `Payment record stored authoritative UTR: ${updatedPayment.utr}`);

    // ----------------------------------------------------
    // TEST 5: Idempotency Protection on Duplicate Webhooks
    // ----------------------------------------------------
    console.log('\n▶ [5] Testing Webhook Idempotency (Prevent Duplicate Processing)...');
    const duplicateWebhookResult = await PaymentService.processYoupiWebhook(webhookPayloadRaw, webhookHeaders);
    assert(duplicateWebhookResult.success === true, 'Duplicate webhook returns success');
    assert(duplicateWebhookResult.duplicate === true, 'Duplicate webhook identified with duplicate: true');
    assert(duplicateWebhookResult.alreadyProcessed === true, 'Duplicate webhook identified with alreadyProcessed: true');

    // Verify ride payment state was not corrupted or duplicated
    const rideAfterDupe = await RideModel.findById(createdRideId);
    assert(rideAfterDupe.payment_status === 'PAID', 'Ride payment_status remains PAID after duplicate webhook');

    // ----------------------------------------------------
    // TEST 6: FLOW B - Rider Daily Shift Settlement Payment Lifecycle
    // ----------------------------------------------------
    console.log('\n▶ [6] Testing Flow B: Rider Daily Shift Commission Settlement...');
    const settleDateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    // Insert an earnings record with valid company_earning so shift settlement has commission due
    await db.query(
      `INSERT INTO rider_earnings (
         rider_id, ride_id, total_fare, rider_earning, company_earning, controller_earning, platform_fee, settlement_status, created_at
       ) VALUES (?, ?, 100.00, 90.00, 8.00, 2.00, 10.00, 'UNSETTLED', NOW())`,
      [testDriverId, createdRideId]
    );

    // Call createSettlementPayment
    const settleSession = await PaymentService.createSettlementPayment(testDriverId, settleDateStr);
    assert(settleSession.success === true, 'createSettlementPayment returned success: true');
    assert(settleSession.riderId === testDriverId, `Settlement session has riderId: ${settleSession.riderId}`);
    assert(settleSession.amount > 0, `Settlement due commission amount > 0 (₹${settleSession.amount})`);
    assert(typeof settleSession.checkoutUrl === 'string', 'Settlement session provides checkoutUrl');

    // Simulate incoming YouPI Webhook for Commission Settlement
    const settleUtr = `9876${String(Date.now()).slice(-8)}`;
    const settleWebhookPayloadObj = {
      event: 'PAYMENT_SUCCESS',
      orderId: settleSession.orderId,
      paymentId: settleSession.paymentId,
      amount: String(settleSession.amount),
      currency: 'INR',
      status: 'SUCCESS',
      utr: settleUtr,
      metadata: {
        type: 'COMMISSION_SETTLEMENT',
        riderId: testDriverId,
        date: settleDateStr
      }
    };
    const settleWebhookRaw = JSON.stringify(settleWebhookPayloadObj);
    const settleWebhookSig = crypto
      .createHmac('sha256', process.env.YOUPI_WEBHOOK_SECRET || 'papido_youpi_webhook_secret_key_32_chars')
      .update(Buffer.from(settleWebhookRaw, 'utf8'))
      .digest('hex');

    const settleWebhookResult = await PaymentService.processYoupiWebhook(settleWebhookRaw, {
      'x-gateway-signature': `sha256=${settleWebhookSig}`
    });
    assert(settleWebhookResult.success === true, 'Settlement webhook processed successfully');
    assert(settleWebhookResult.status === 'SUCCESS', 'Settlement webhook status: SUCCESS');

    // Verify daily_shift_settlements updated
    const updatedSettlement = await EarningModel.getRiderShiftSettlement(testDriverId, settleDateStr);
    assert(
      updatedSettlement && updatedSettlement.status === 'SETTLED',
      `Shift settlement status transitioned to SETTLED (actual: ${updatedSettlement?.status})`
    );

    // Duplicate settlement webhook idempotency
    const dupeSettleResult = await PaymentService.processYoupiWebhook(settleWebhookRaw, {
      'x-gateway-signature': `sha256=${settleWebhookSig}`
    });
    assert(dupeSettleResult.duplicate === true, 'Duplicate settlement webhook identified and short-circuited');

    console.log('\n======================================================');
    console.log(`  🎉 YOUPI INTEGRATION RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('======================================================\n');

    // Clean up test records
    await db.query('DELETE FROM payment_transactions WHERE reference_id IN (?, ?)', [createdRideId, testDriverId]);
    await db.query('DELETE FROM payments WHERE ride_id = ?', [createdRideId]);
    await db.query('DELETE FROM rider_earnings WHERE ride_id = ?', [createdRideId]);
    await db.query('DELETE FROM daily_shift_settlements WHERE rider_id = ?', [testDriverId]);
    await db.query('DELETE FROM rides WHERE id = ?', [createdRideId]);
    await db.query('DELETE FROM users WHERE id IN (?, ?)', [testCustomerId, testDriverId]);

    if (failedTests > 0) {
      process.exit(1);
    }
    process.exit(0);
  } catch (err) {
    console.error('Integration test exception:', err);
    process.exit(1);
  }
}

runYoupiIntegrationTests();
