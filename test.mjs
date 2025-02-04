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

// Replace the real OpenAI with our mock
const RealOpenAI = OpenAI;
OpenAI = MockOpenAI;

async function testLangChain() {
  const model = new OpenAI({ openAIApiKey: 'mock-api-key' });
  try {
    const res = await model.call('What is the capital of France?');
    console.log(res);
    console.log('Test passed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testLangChain();
