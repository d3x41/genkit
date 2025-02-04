import { OpenAI } from '@langchain/openai';

// Mock OpenAI class
class MockOpenAI {
  constructor(config) {
    this.config = config;
  }

  async call(prompt) {
    return 'Paris is the capital of France.';
  }
}

async function testLangChain(AIClass) {
  const model = new AIClass({ openAIApiKey: 'mock-api-key' });
  try {
    const res = await model.call('What is the capital of France?');
    console.log(res);
    console.log('Test passed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Test with mock OpenAI
console.log('Testing with MockOpenAI:');
await testLangChain(MockOpenAI);

// Uncomment the following lines to test with real OpenAI (requires valid API key)
// console.log('\nTesting with real OpenAI:');
// await testLangChain(OpenAI);

