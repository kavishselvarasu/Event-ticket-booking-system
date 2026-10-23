/**
 * Standalone Automated Concurrency & Race Condition Validator
 * Run via: npm run test:concurrency
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

async function runTest() {
  console.log('\n======================================================');
  console.log('🧪 HIGH-CONCURRENCY DOUBLE-BOOKING STRESS TEST');
  console.log(`🎯 Target API: ${BASE_URL}/api/test/concurrency`);
  console.log('======================================================\n');

  try {
    const response = await fetch(`${BASE_URL}/api/test/concurrency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalSeats: 5,
        concurrentRequests: 30
      })
    });

    const data = await response.json();
    console.log('--- TEST RESULTS ---');
    console.log(`Database Engine:             ${data.testSummary.databaseEngine}`);
    console.log(`Seats Configured:            ${data.testSummary.totalSeatsConfigured}`);
    console.log(`Simultaneous Requests:       ${data.testSummary.concurrentBookingAttempts}`);
    console.log(`Successful Holds:            ${data.testSummary.successfulHolds}`);
    console.log(`Rejected (409 Conflict):     ${data.testSummary.rejectedDueToFullCapacity}`);
    console.log(`Double Booked Seats:         ${data.testSummary.doubleBookedSeats}`);
    console.log(`Execution Duration:          ${data.testSummary.durationMs}ms`);
    console.log(`Race Condition Prevented:    ${data.testSummary.raceConditionPrevented ? '✅ YES' : '❌ NO'}`);
    console.log(`Final Evaluation:            ${data.testSummary.status}`);
    console.log('---------------------\n');

    if (data.testSummary.raceConditionPrevented) {
      console.log('🎉 SUCCESS: ACID Row-level / write transaction locking validated with ZERO double bookings!\n');
      process.exit(0);
    } else {
      console.error('💥 FAILED: Double booking detected!');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error executing test:', error.message);
    console.log('\nPlease make sure the server is running on http://localhost:5000 before running the test.');
    process.exit(1);
  }
}

runTest();
