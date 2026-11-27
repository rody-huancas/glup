import { describe, expect, it } from 'vitest';
import tools from '@tools/tools.json';
import { skillsOf } from '@/lib/skills';

describe('skillsOf', () => {
  it('keeps the family and the order of the app', () => {
    const list = [
      { family: 'pdf', title: 'Unir', description: 'Varios en uno solo' },
      { family: 'images', title: 'Convertir', description: 'A WebP, JPG o PNG' },
      { family: 'pdf', title: 'Separar', description: 'Todas o solo algunas páginas' },
    ];

    expect(skillsOf(list, 'pdf').map((skill) => skill.title)).toEqual(['Unir', 'Separar']);
    expect(skillsOf(list, 'text')).toEqual([]);
  });

  it('lists a skill once and copes without a description', () => {
    const list = [
      { family: 'pc', title: 'Limpieza' },
      { family: 'pc', title: 'Limpieza', description: 'Otra vez' },
    ];

    expect(skillsOf(list, 'pc')).toEqual([{ title: 'Limpieza', description: '' }]);
  });

  it('finds every family of the real list', () => {
    const families = ['images', 'pdf', 'media', 'text', 'clipboard', 'pc'] as const;

    families.forEach((family) => expect(skillsOf(tools, family).length).toBeGreaterThan(0));
  });
});
