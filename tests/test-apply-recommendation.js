const axios = require('axios');

async function testApply() {
  console.log('Testing Apply Recommendation on Ticket #41...');

  try {
    const res = await axios.post('http://localhost:3000/api/ai/tickets/41/apply-recommendation', {
      itilcategories_id: 1, // Software Issue
      priority: 3,         // Medium
      groups_id: 1         // IT Support
    });

    console.log('Result:', JSON.stringify(res.data, null, 2));

    // Verify ticket in GLPI was updated
    const verifyRes = await axios.get('http://localhost:3000/api/ai/tickets/41/test-glpi');
    console.log('Updated Ticket in GLPI:', JSON.stringify(verifyRes.data, null, 2));

    if (verifyRes.data.ticket.itilcategories_id === 1) {
      console.log('\nSUCCESS! Ticket #41 category was successfully updated to Software Issue (ID: 1) in GLPI!');
    } else {
      console.log('\nWARNING: itilcategories_id is', verifyRes.data.ticket.itilcategories_id);
    }
  } catch (e) {
    console.error('Error applying recommendation:', e.response ? e.response.data : e.message);
  }
}

testApply();
