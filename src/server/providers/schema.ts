import { z } from 'zod';

export function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  if (schema instanceof z.ZodObject) {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(schema.shape)) {
      properties[key] = zodToJsonSchema(value as z.ZodTypeAny);
      if (!(value instanceof z.ZodOptional) && !(value instanceof z.ZodNullable) && !(value instanceof z.ZodDefault)) {
        required.push(key);
      }
    }
    const result: Record<string, unknown> = { type: 'object', properties };
    if (required.length > 0) result.required = required;
    return result;
  }
  if (schema instanceof z.ZodArray) return { type: 'array', items: zodToJsonSchema(schema.element) };
  if (schema instanceof z.ZodEnum) return { type: 'string', enum: Array.from(schema._def.values) };
  if (schema instanceof z.ZodNativeEnum) return { type: 'string', enum: Object.values(schema._def.values) };
  if (schema instanceof z.ZodLiteral) {
    const literal = schema._def.value as string | number | boolean | null;
    const type = literal === null ? 'null' : typeof literal;
    return { type, enum: [literal] };
  }
  if (schema instanceof z.ZodString) return { type: 'string' };
  if (schema instanceof z.ZodNumber) return { type: 'number' };
  if (schema instanceof z.ZodBoolean) return { type: 'boolean' };
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable || schema instanceof z.ZodDefault) {
    return zodToJsonSchema(schema._def.innerType);
  }
  if (schema instanceof z.ZodEffects) return zodToJsonSchema(schema._def.schema);
  if (schema instanceof z.ZodUnion) return { anyOf: schema._def.options.map(zodToJsonSchema) };
  return { type: 'string' };
}

export function parseJsonText(text: string): unknown {
  const trimmed = text.trim();
  const unfenced = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(unfenced);
}
