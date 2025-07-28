const axios = require('axios');

async function testOpenRouter() {
  try {
    console.log('Testing OpenRouter API key...');
    
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'moonshotai/kimi-k2:free',
        messages: [
          {
            role: 'user',
            content: 'Hello, this is a test message.'
          }
        ],
        max_tokens: 50,
        temperature: 0.6
      },
      {
        headers: {
          'Authorization': 'Bearer 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',
          'HTTP-Referer': 'https://alkaforge.vercel.app',
          'X-Title': 'AlkaForge'
        }
      }
    );
    
    console.log('✅ OpenRouter API key is working!');
    console.log('Response:', response.data.choices[0].message.content);
  } catch (error) {
    console.error('❌ OpenRouter API key test failed:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data);
    console.error('Error:', error.message);
  }
}

testOpenRouter(); 