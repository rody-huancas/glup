import { describe, expect, it } from 'vitest';
import toolsJson from '@/modules/tools/constants/tools.json';

describe('the icons of tools.json', () => {
  it('give every tool of a family its own icon (reducing the weight is the same idea everywhere)', () => {
    const byFamily = new Map<string, string[]>();
    toolsJson.forEach((tool) => byFamily.set(tool.family, [...(byFamily.get(tool.family) ?? []), tool.icon]));
    byFamily.forEach((icons) => expect(new Set(icons).size).toBe(icons.length));
  });
});
