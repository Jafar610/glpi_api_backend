const axios = require('axios');

async function testApply() {
  console.log('Testing Apply Recommendation on Ticket #41...');

  try {
    const res = await axios.post(
  'https://glpi-api-backend.onrender.com/api/ai/tickets/41/apply-recommendation',
  {
    itilcategories_id: 1,
    priority: 3,
    groups_id: 1
  }
);

    console.log('Result:', JSON.stringify(res.data, null, 2));

    // Verify ticket in GLPI was updated
    const verifyRes = await axios.get(`${AI_SERVICE_BASE_URL}/tickets/41/test-glpi`);
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
