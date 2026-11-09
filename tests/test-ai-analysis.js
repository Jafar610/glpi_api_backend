const ticketAnalysisService = require('../src/services/ticket-analysis.service');

async function runAnalysisTest() {
  console.log('=== Running End-to-End AI Ticket Analysis Test ===\n');

  try {
    // Test 1: Ticket #17 ("Computer stop working")
    console.log('1. Analyzing Ticket #17...');
    const result17 = await ticketAnalysisService.analyzeTicket(17);
    console.log('Result for Ticket #17:');
    console.log(JSON.stringify(result17, null, 2));

    // Verify structured fields
    if (!result17.suggestedCategory || !result17.recommendedGroup || !result17.troubleshootingSteps) {
      throw new Error('Analysis result is missing required structured fields');
    }
    console.log('\n -> Ticket #17 Analysis PASSED!\n');

    // Test 2: Troubleshooting for Ticket #17
    console.log('2. Testing Troubleshooting Assistant for Ticket #17...');
    const troubles = await ticketAnalysisService.getTroubleshooting(17);
    console.log('Troubleshooting Output:');
    console.log(JSON.stringify(troubles, null, 2));
    console.log('\n -> Troubleshooting Assistant PASSED!\n');

    console.log('=== ALL PHASE 4 TESTS COMPLETED SUCCESSFULLY! ===');
    process.exit(0);
  } catch (err) {
    console.error('\nTest failed with error:', err.message);
    if (err.response) {
      console.error('Response details:', err.response.data);
    }
    process.exit(1);
  }
}

runAnalysisTest();
