/**
 * Server-side transcription of a time-table photo.
 *
 * Runs behind the API route so the Anthropic key never reaches the browser.
 */

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { TRANSCRIBE_PROMPT } from './prompt.js';
import { ScannedSheetSchema, type OcrRequest, type ScannedSheet } from './schema.js';

const MODEL = 'claude-opus-5';

export class OcrError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
    this.name = 'OcrError';
  }
}

/**
 * What the deployment can tell you about its key without revealing it.
 *
 * A key pasted into a dashboard field often carries a trailing newline or a
 * stray space, and the API rejects that as invalid with nothing to see. The
 * length and shape are enough to tell that apart from a wrong or truncated
 * key; none of it is secret.
 */
export function describeApiKey(): {
  hasApiKey: boolean;
  keyLength: number;
  hadSurroundingWhitespace: boolean;
  looksLikeAnthropicKey: boolean;
} {
  const raw = process.env['ANTHROPIC_API_KEY'] ?? '';
  const key = raw.trim();
  return {
    hasApiKey: key !== '',
    keyLength: key.length,
    hadSurroundingWhitespace: raw !== key,
    looksLikeAnthropicKey: key.startsWith('sk-ant-'),
  };
}

let client: Anthropic | undefined;
// Trimmed rather than left to the SDK's own env lookup, so a pasted newline
// does not turn into an authentication error.
const getClient = () =>
  (client ??= new Anthropic({ apiKey: (process.env['ANTHROPIC_API_KEY'] ?? '').trim() }));

export async function recognizeSheet({ imageBase64, mediaType }: OcrRequest): Promise<ScannedSheet> {
  const response = await getClient().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
          { type: 'text', text: TRANSCRIBE_PROMPT },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(ScannedSheetSchema) },
  });

  if (response.stop_reason === 'refusal') {
    throw new OcrError('The model declined to read this image.', 422);
  }
  if (response.stop_reason === 'max_tokens') {
    throw new OcrError('The table is larger than one response can hold.', 502);
  }
  if (!response.parsed_output) {
    throw new OcrError('Could not read a route sheet in this image.', 422);
  }
  return response.parsed_output;
}
