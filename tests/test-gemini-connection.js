const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../src/config/env');

async function testGemini() {
  console.log('Testing Google Gemini API connectivity...');
  if (!config.gemini.apiKey) {
    console.error('ERROR: GEMINI_API_KEY is missing in .env');
    process.exit(1);
  }

  try {
    const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });
    const result = await model.generateContent('Return a test greeting in 5 words.');
    console.log('Success! Gemini response:', result.response.text().trim());
  } catch (err) {
    console.error('Gemini test failed with gemini-3.8-flash:', err.message);
  }
}

testGemini();
