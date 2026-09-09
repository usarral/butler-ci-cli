import { describe, it, expect } from 'vitest';
import { buildIcons, resolveIconMode } from '../src/utils/icons';

describe('resolveIconMode', () => {
  it('usa emoji fuera de Windows', () => {
    expect(resolveIconMode({}, 'linux')).toBe('emoji');
    expect(resolveIconMode({}, 'darwin')).toBe('emoji');
  });

  it('cae a ASCII en la consola clásica de Windows', () => {
    expect(resolveIconMode({}, 'win32')).toBe('ascii');
  });

  it('usa emoji en terminales modernos de Windows', () => {
    expect(resolveIconMode({ WT_SESSION: 'abc' }, 'win32')).toBe('emoji');
    expect(resolveIconMode({ TERM_PROGRAM: 'vscode' }, 'win32')).toBe('emoji');
    expect(resolveIconMode({ ConEmuANSI: 'ON' }, 'win32')).toBe('emoji');
    expect(resolveIconMode({ TERM: 'xterm-256color' }, 'win32')).toBe('emoji');
  });

  it('BUTLER_ICONS manda sobre la detección', () => {
    expect(resolveIconMode({ BUTLER_ICONS: 'ascii' }, 'linux')).toBe('ascii');
    expect(resolveIconMode({ BUTLER_ICONS: ' EMOJI ' }, 'win32')).toBe('emoji');
  });

  it('ignora valores desconocidos de BUTLER_ICONS', () => {
    expect(resolveIconMode({ BUTLER_ICONS: 'nerdfont' }, 'linux')).toBe('emoji');
  });
});

describe('buildIcons', () => {
  it('define los mismos nombres en ambos juegos', () => {
    expect(Object.keys(buildIcons('ascii')).sort()).toEqual(Object.keys(buildIcons('emoji')).sort());
  });

  it('el juego ASCII no contiene ningún carácter fuera de ASCII', () => {
    for (const [name, glyph] of Object.entries(buildIcons('ascii'))) {
      // eslint-disable-next-line no-control-regex
      expect(glyph, `icono "${name}"`).toMatch(/^[\x20-\x7E]+$/);
    }
  });

  it('el juego emoji no está vacío', () => {
    for (const [name, glyph] of Object.entries(buildIcons('emoji'))) {
      expect(glyph.length, `icono "${name}"`).toBeGreaterThan(0);
    }
  });
});
