const glpiService = require('../src/services/glpi.service');
const { sanitizeTicketContent } = require('../src/utils/sanitize');

async function runTests() {
  console.log('=== Testing GLPI API Client Service ===\n');

  try {
    // 1. Test Session Initialization & Ticket Retrieval
    console.log('1. Fetching Ticket #41...');
    const ticket = await glpiService.getTicket(41);
    console.log(' -> Success! Ticket ID:', ticket.id);
    console.log(' -> Title:', ticket.name);
    console.log(' -> Raw Content:', ticket.content);

    // 2. Test Sanitization
    console.log('\n2. Testing Content Sanitization...');
    const sanitized = sanitizeTicketContent(ticket.content);
    console.log(' -> Sanitized Content:', sanitized);

    // 3. Test Categories Fetch
    console.log('\n3. Fetching ITIL Categories from GLPI...');
    const categories = await glpiService.getCategories();
    console.log(` -> Found ${categories.length} categories.`);
    categories.slice(0, 3).forEach(c => console.log(`    - [${c.id}] ${c.completename || c.name}`));

    // 4. Test Groups Fetch
    console.log('\n4. Fetching Groups from GLPI...');
    const groups = await glpiService.getGroups();
    console.log(` -> Found ${groups.length} groups.`);
    groups.slice(0, 3).forEach(g => console.log(`    - [${g.id}] ${g.completename || g.name}`));

    // 5. Test Non-existent Ticket Error Handling
    console.log('\n5. Testing Error Handling on non-existent Ticket #999999...');
    try {
      await glpiService.getTicket(999999);
      console.error(' -> FAIL: Expected 404 error but request succeeded.');
    } catch (err) {
      console.log(` -> Success! Correctly caught expected error: ${err.message} (Status: ${err.statusCode})`);
    }

    console.log('\n=== ALL GLPI CLIENT TESTS PASSED! ===');
    process.exit(0);
  } catch (err) {
    console.error('\nTest failed with error:', err);
    process.exit(1);
  }
}

runTests();
