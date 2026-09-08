import { describe, expect, it } from 'vitest';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { ScannedSheetSchema } from '../schema';

/**
 * The schema only earns its keep if the SDK can turn it into the JSON schema
 * it sends to the model. That conversion uses `z.toJSONSchema`, which exists
 * on zod 4 and not on zod 3 — a mismatch the type checker cannot see, because
 * the SDK accepts either version as a peer dependency.
 */
describe('zodOutputFormat over the sheet schema', () => {
  // The SDK types `schema` loosely; the shape below is what it actually emits.
  const format = zodOutputFormat(ScannedSheetSchema) as unknown as {
    type: string;
    schema: { properties: Record<string, unknown>; required?: string[] };
  };

  it('produces a json_schema output format', () => {
    expect(format.type).toBe('json_schema');
  });

  it('carries every field the transcription needs', () => {
    expect(Object.keys(format.schema.properties).sort()).toEqual([
      'distanceKind',
      'kind',
      'legs',
      'rows',
      'title',
    ]);
  });

  it('requires them all, so the model cannot omit one', () => {
    expect(format.schema.required?.sort()).toEqual([
      'distanceKind',
      'kind',
      'legs',
      'rows',
      'title',
    ]);
  });
});
