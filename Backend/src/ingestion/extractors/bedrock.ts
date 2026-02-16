/**
 * AWS Bedrock client wrapper for Nova model.
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

// Default model ID for Amazon Nova
const DEFAULT_MODEL_ID = 'amazon.nova-lite-v1:0';

// Get the model ID at runtime (allows env var override)
function getModelId(): string {
  return process.env.BEDROCK_MODEL_ID || DEFAULT_MODEL_ID;
}

// Get the client at runtime (allows region override)
function getClient(): BedrockRuntimeClient {
  return new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
  });
}

export interface BedrockResponse {
  text: string;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  modelId: string;
  error?: string;
}

/**
 * Invoke AWS Bedrock Nova model with a prompt.
 * Returns the model's response text.
 */
export async function invokeNova(
  prompt: string,
  modelId?: string
): Promise<BedrockResponse> {
  const startTime = Date.now();
  const actualModelId = modelId || getModelId();
  const client = getClient();

  try {
    // Build request body based on model type
    const isClaudeModel = actualModelId.startsWith('anthropic.');
    let requestBody: object;

    if (isClaudeModel) {
      // Claude format
      requestBody = {
        anthropic_version: 'bedrock-2023-05-31',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096,
        temperature: 0.1,
      };
    } else {
      // Nova format
      requestBody = {
        messages: [
          {
            role: 'user',
            content: [{ text: prompt }],
          },
        ],
        inferenceConfig: {
          maxTokens: 4096,
          temperature: 0.1,
        },
      };
    }

    const command = new InvokeModelCommand({
      modelId: actualModelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody),
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // Extract text and token usage based on model response format
    let text: string;
    let inputTokens = 0;
    let outputTokens = 0;

    if (isClaudeModel) {
      // Claude response format
      text = responseBody.content?.[0]?.text || '';
      inputTokens = responseBody.usage?.input_tokens || 0;
      outputTokens = responseBody.usage?.output_tokens || 0;
    } else {
      // Nova response format
      text = responseBody.output?.message?.content?.[0]?.text || '';
      inputTokens = responseBody.usage?.inputTokens || 0;
      outputTokens = responseBody.usage?.outputTokens || 0;
    }

    return {
      text,
      durationMs: Date.now() - startTime,
      inputTokens,
      outputTokens,
      modelId: actualModelId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Bedrock error';
    return {
      text: '',
      durationMs: Date.now() - startTime,
      inputTokens: 0,
      outputTokens: 0,
      modelId: actualModelId,
      error: message,
    };
  }
}
