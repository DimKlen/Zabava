/// <reference types="node" />
import { readFileSync } from 'fs';
import { join } from 'path';

import { colors } from '../tokens';

// Les tokens doivent rester identiques aux variables du prototype validé.
const css = readFileSync(join(__dirname, '../../../../specs/reference/styles.css'), 'utf8');

function cssVar(name: string): string {
  const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6});`));
  if (!match?.[1]) throw new Error(`Variable --color-${name} absente de styles.css`);
  return match[1].toLowerCase();
}

const mapping: Record<string, keyof typeof colors> = {
  bg: 'bg',
  surface: 'surface',
  text: 'text',
  accent: 'accent',
  'accent-2': 'accent2',
  section: 'section',
  'section-glow': 'sectionGlow',
  'section-ghost': 'sectionGhost',
  ...Object.fromEntries(
    [100, 200, 300, 400, 500, 600, 700, 800, 900].flatMap((n) => [
      [`neutral-${n}`, `neutral${n}`],
      [`accent-${n}`, `accent${n}`],
    ]),
  ),
};

describe('tokens', () => {
  it.each(Object.entries(mapping))('--color-%s = colors.%s', (cssName, token) => {
    expect(colors[token]).toBe(cssVar(cssName));
  });

  it('divider = text à 16 %', () => {
    expect(css).toMatch(/--color-divider:\s*color-mix\(in srgb, #e9e9ed 16%, transparent\)/);
    expect(colors.divider).toBe('rgba(233,233,237,0.16)');
  });
});
