import { OpenAI } from '@langchain/community/llms/openai.js';

async function testLangChain() {
  const model = new OpenAI({ openAIApiKey: 'your-api-key' });
  try {
    const res = await model.call('What is the capital of France?');
    console.log(res);
    console.log('Test passed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testLangChain();
