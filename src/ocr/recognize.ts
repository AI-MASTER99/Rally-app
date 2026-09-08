/**
 * Server-side transcription of a time-table photo.
 *
 * Runs behind the API route so the Anthropic key never reaches the browser.
 */

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { TRANSCRIBE_PROMPT } from './prompt';
import { ScannedTableSchema, type OcrRequest, type ScannedTable } from './schema';

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

let client: Anthropic | undefined;
const getClient = () => (client ??= new Anthropic());

export async function recognizeTable({ imageBase64, mediaType }: OcrRequest): Promise<ScannedTable> {
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
    output_config: { format: zodOutputFormat(ScannedTableSchema) },
  });

  if (response.stop_reason === 'refusal') {
    throw new OcrError('The model declined to read this image.', 422);
  }
  if (response.stop_reason === 'max_tokens') {
    throw new OcrError('The table is larger than one response can hold.', 502);
  }
  if (!response.parsed_output) {
    throw new OcrError('Could not read a time table in this image.', 422);
  }
  return response.parsed_output;
}
