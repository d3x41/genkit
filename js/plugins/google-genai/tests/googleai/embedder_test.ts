/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as assert from 'assert';
import { Document, Genkit, GenkitError } from 'genkit';
import { afterEach, beforeEach, describe, it } from 'node:test';
import * as sinon from 'sinon';
import { EmbeddingConfig, defineEmbedder } from '../../src/googleai/embedder';
import {
  EmbedContentResponse,
  GoogleAIPluginOptions,
} from '../../src/googleai/types';
import { MISSING_API_KEY_ERROR } from '../../src/googleai/utils';

describe('defineGoogleAIEmbedder', () => {
  let mockGenkit: sinon.SinonStubbedInstance<Genkit>;
  let fetchStub: sinon.SinonStub;
  const ORIGINAL_ENV = process.env;

  let embedderFunc: (
    input: Document[],
    options?: EmbeddingConfig
  ) => Promise<any>;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }; // Shallow clone ORIGINAL_ENV
    mockGenkit = sinon.createStubInstance(Genkit);
    fetchStub = sinon.stub(global, 'fetch');

    mockGenkit.defineEmbedder.callsFake((config, func) => {
      embedderFunc = func;
      return {
        name: config.name,
      } as any;
    });
  });

  afterEach(() => {
    sinon.restore();
    process.env = ORIGINAL_ENV; // Restore original environment
  });

  function mockFetchResponse(body: any, status = 200) {
    const response = new Response(JSON.stringify(body), {
      status: status,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json' },
    });
    fetchStub.resolves(response);
  }

  const defaultPluginOptions: GoogleAIPluginOptions = {
    apiKey: 'test-api-key-option',
  };

  it('defines an embedder with the correct name and info for known model', () => {
    defineEmbedder(mockGenkit, 'text-embedding-004', defaultPluginOptions);
    sinon.assert.calledOnce(mockGenkit.defineEmbedder);
    const args = mockGenkit.defineEmbedder.lastCall.args[0];
    assert.strictEqual(args.name, 'googleai/text-embedding-004');
    assert.strictEqual(args.info?.dimensions, 768);
  });

  it('defines an embedder with a custom name', () => {
    defineEmbedder(mockGenkit, 'custom-embedding-model', defaultPluginOptions);
    sinon.assert.calledOnce(mockGenkit.defineEmbedder);
    const args = mockGenkit.defineEmbedder.lastCall.args[0];
    assert.strictEqual(args.name, 'googleai/custom-embedding-model');
  });

  it('handles custom name with prefix', () => {
    defineEmbedder(mockGenkit, 'googleai/custom-model', defaultPluginOptions);
    sinon.assert.calledOnce(mockGenkit.defineEmbedder);
    const args = mockGenkit.defineEmbedder.lastCall.args[0];
    assert.strictEqual(args.name, 'googleai/custom-model');
  });

  describe('API Key Handling', () => {
    beforeEach(() => {
      // Clear potentially relevant env variables
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_API_KEY;
      delete process.env.GOOGLE_GENAI_API_KEY;
    });

    it('throws if no API key is provided in options or env', () => {
      assert.throws(() => {
        defineEmbedder(mockGenkit, 'text-embedding-004', {});
      }, MISSING_API_KEY_ERROR);
    });

    it('uses API key from pluginOptions if provided', async () => {
      defineEmbedder(mockGenkit, 'text-embedding-004', defaultPluginOptions);
      mockFetchResponse({ embedding: { values: [] } });
      await embedderFunc([new Document({ content: [{ text: 'test' }] })]);
      sinon.assert.calledOnce(fetchStub);
      const fetchOptions = fetchStub.lastCall.args[1];
      assert.strictEqual(
        fetchOptions.headers['x-goog-api-key'],
        'test-api-key-option'
      );
    });

    it('uses API key from GEMINI_API_KEY env var', async () => {
      process.env.GEMINI_API_KEY = 'gemini-key';
      defineEmbedder(mockGenkit, 'text-embedding-004', {});
      mockFetchResponse({ embedding: { values: [] } });
      await embedderFunc([new Document({ content: [{ text: 'test' }] })]);
      sinon.assert.calledOnce(fetchStub);
      const fetchOptions = fetchStub.lastCall.args[1];
      assert.strictEqual(fetchOptions.headers['x-goog-api-key'], 'gemini-key');
    });

    it('uses API key from GOOGLE_API_KEY env var', async () => {
      process.env.GOOGLE_API_KEY = 'google-key';
      defineEmbedder(mockGenkit, 'text-embedding-004', {});
      mockFetchResponse({ embedding: { values: [] } });
      await embedderFunc([new Document({ content: [{ text: 'test' }] })]);
      sinon.assert.calledOnce(fetchStub);
      const fetchOptions = fetchStub.lastCall.args[1];
      assert.strictEqual(fetchOptions.headers['x-goog-api-key'], 'google-key');
    });

    it('uses API key from GOOGLE_GENAI_API_KEY env var', async () => {
      process.env.GOOGLE_GENAI_API_KEY = 'google-genai-key';
      defineEmbedder(mockGenkit, 'text-embedding-004', {});
      mockFetchResponse({ embedding: { values: [] } });
      await embedderFunc([new Document({ content: [{ text: 'test' }] })]);
      sinon.assert.calledOnce(fetchStub);
      const fetchOptions = fetchStub.lastCall.args[1];
      assert.strictEqual(
        fetchOptions.headers['x-goog-api-key'],
        'google-genai-key'
      );
    });

    it('pluginOptions apiKey takes precedence over env vars', async () => {
      process.env.GEMINI_API_KEY = 'gemini-key';
      defineEmbedder(mockGenkit, 'text-embedding-004', defaultPluginOptions);
      mockFetchResponse({ embedding: { values: [] } });
      await embedderFunc([new Document({ content: [{ text: 'test' }] })]);
      sinon.assert.calledOnce(fetchStub);
      const fetchOptions = fetchStub.lastCall.args[1];
      assert.strictEqual(
        fetchOptions.headers['x-goog-api-key'],
        'test-api-key-option'
      );
    });

    it('throws if apiKey is false in pluginOptions and not provided in call options', async () => {
      defineEmbedder(mockGenkit, 'text-embedding-004', {
        apiKey: false,
      });
      await assert.rejects(
        embedderFunc([new Document({ content: [{ text: 'test' }] })]),
        (err: GenkitError) => {
          assert.strictEqual(err.status, 'INVALID_ARGUMENT');
          assert.match(
            err.message,
            /GoogleAI plugin was initialized with \{apiKey: false\}/
          );
          return true;
        }
      );
      sinon.assert.notCalled(fetchStub);
    });

    it('uses API key from call options if apiKey is false in pluginOptions', async () => {
      defineEmbedder(mockGenkit, 'text-embedding-004', {
        apiKey: false,
      });
      mockFetchResponse({ embedding: { values: [] } });
      await embedderFunc([new Document({ content: [{ text: 'test' }] })], {
        apiKey: 'call-time-api-key',
      });
      sinon.assert.calledOnce(fetchStub);
      const fetchOptions = fetchStub.lastCall.args[1];
      assert.strictEqual(
        fetchOptions.headers['x-goog-api-key'],
        'call-time-api-key'
      );
    });

    it('call options apiKey takes precedence over pluginOptions apiKey', async () => {
      defineEmbedder(mockGenkit, 'text-embedding-004', defaultPluginOptions);
      mockFetchResponse({ embedding: { values: [] } });
      await embedderFunc([new Document({ content: [{ text: 'test' }] })], {
        apiKey: 'call-time-api-key',
      });
      sinon.assert.calledOnce(fetchStub);
      const fetchOptions = fetchStub.lastCall.args[1];
      assert.strictEqual(
        fetchOptions.headers['x-goog-api-key'],
        'call-time-api-key'
      );
    });
  });

  describe('Embedder Functionality', () => {
    const testDoc1 = new Document({ content: [{ text: 'Hello' }] });
    const testDoc2 = new Document({ content: [{ text: 'World' }] });

    it('calls embedContent for each document', async () => {
      defineEmbedder(mockGenkit, 'text-embedding-004', defaultPluginOptions);

      const mockResponse1: EmbedContentResponse = {
        embedding: { values: [0.1, 0.2] },
      };
      const mockResponse2: EmbedContentResponse = {
        embedding: { values: [0.3, 0.4] },
      };

      fetchStub.onFirstCall().resolves(
        new Response(JSON.stringify(mockResponse1), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
      fetchStub.onSecondCall().resolves(
        new Response(JSON.stringify(mockResponse2), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const result = await embedderFunc([testDoc1, testDoc2]);

      sinon.assert.calledTwice(fetchStub);
      const expectedUrl =
        'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent';

      // Call 1
      const fetchArgs1 = fetchStub.firstCall.args;
      assert.strictEqual(fetchArgs1[0], expectedUrl);
      const expectedRequest1 = {
        content: { role: '', parts: [{ text: 'Hello' }] },
      };
      assert.deepStrictEqual(JSON.parse(fetchArgs1[1].body), expectedRequest1);

      // Call 2
      const fetchArgs2 = fetchStub.secondCall.args;
      assert.strictEqual(fetchArgs2[0], expectedUrl);
      const expectedRequest2 = {
        content: { role: '', parts: [{ text: 'World' }] },
      };
      assert.deepStrictEqual(JSON.parse(fetchArgs2[1].body), expectedRequest2);

      assert.deepStrictEqual(result, {
        embeddings: [{ embedding: [0.1, 0.2] }, { embedding: [0.3, 0.4] }],
      });
    });

    it('calls embedContent with taskType, title, and outputDimensionality options', async () => {
      defineEmbedder(mockGenkit, 'text-embedding-004', defaultPluginOptions);
      mockFetchResponse({ embedding: { values: [0.1] } });

      const config: EmbeddingConfig = {
        taskType: 'RETRIEVAL_DOCUMENT',
        title: 'Doc Title',
        outputDimensionality: 256,
      };
      await embedderFunc([testDoc1], config);

      sinon.assert.calledOnce(fetchStub);
      const fetchOptions = fetchStub.lastCall.args[1];
      const body = JSON.parse(fetchOptions.body);

      assert.strictEqual(body.taskType, 'RETRIEVAL_DOCUMENT');
      assert.strictEqual(body.title, 'Doc Title');
      assert.strictEqual(body.outputDimensionality, 256);
      assert.deepStrictEqual(body.content, {
        role: '',
        parts: [{ text: 'Hello' }],
      });
    });

    it('uses the correct model name in the URL', async () => {
      defineEmbedder(mockGenkit, 'custom-model', defaultPluginOptions);
      mockFetchResponse({ embedding: { values: [0.1] } });

      await embedderFunc([testDoc1]);

      sinon.assert.calledOnce(fetchStub);
      const fetchArgs = fetchStub.lastCall.args;
      const expectedUrl =
        'https://generativelanguage.googleapis.com/v1beta/models/custom-model:embedContent';
      assert.strictEqual(fetchArgs[0], expectedUrl);
    });

    it('uses the correct model name in the URL with prefix', async () => {
      defineEmbedder(mockGenkit, 'googleai/custom-model', defaultPluginOptions);
      mockFetchResponse({ embedding: { values: [0.1] } });

      await embedderFunc([testDoc1]);

      sinon.assert.calledOnce(fetchStub);
      const fetchArgs = fetchStub.lastCall.args;
      const expectedUrl =
        'https://generativelanguage.googleapis.com/v1beta/models/custom-model:embedContent';
      assert.strictEqual(fetchArgs[0], expectedUrl);
    });
  });
});
