/**
 * AWS Bedrock Titan Embeddings client.
 * Uses Amazon Titan Text Embeddings V2 for 1024-dim vectors.
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

const TITAN_EMBEDDINGS_MODEL = 'amazon.titan-embed-text-v2:0';
export const EMBEDDING_DIMENSION = 1024;

export interface EmbeddingResult {
  embedding: number[];
  dimension: number;
  durationMs: number;
  error?: string;
}

function getClient(): BedrockRuntimeClient {
  return new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
  });
}

/**
 * Generate embedding for text using AWS Titan.
 * Deterministic: same input always produces same embedding.
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const startTime = Date.now();
  const client = getClient();

  try {
    // Truncate text to Titan's limit (8192 tokens, ~30K chars safe limit)
    const truncatedText = text.slice(0, 30000);

    const command = new InvokeModelCommand({
      modelId: TITAN_EMBEDDINGS_MODEL,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        inputText: truncatedText,
        dimensions: EMBEDDING_DIMENSION,
        normalize: true, // Normalized for cosine similarity
      }),
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    return {
      embedding: responseBody.embedding,
      dimension: EMBEDDING_DIMENSION,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      embedding: [],
      dimension: 0,
      durationMs: Date.now() - startTime,
      error: message,
    };
  }
}
