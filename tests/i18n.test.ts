import { describe, it, expect, afterEach } from 'vitest';
import { detectLocale, setLocale, msg } from '../src/i18n';
import { en } from '../src/i18n/en';
import { es } from '../src/i18n/es';

afterEach(() => setLocale(null));

describe('detectLocale', () => {
  it('prioriza BUTLER_LANG sobre las variables del sistema', () => {
    expect(detectLocale({ BUTLER_LANG: 'en', LANG: 'es_ES.UTF-8' })).toBe('en');
    expect(detectLocale({ BUTLER_LANG: 'es', LANG: 'en_US.UTF-8' })).toBe('es');
  });

  it('lee LC_ALL, LC_MESSAGES y LANG en ese orden', () => {
    expect(detectLocale({ LC_ALL: 'es_ES.UTF-8', LANG: 'en_US.UTF-8' })).toBe('es');
    expect(detectLocale({ LC_MESSAGES: 'es_MX', LANG: 'en_US.UTF-8' })).toBe('es');
    expect(detectLocale({ LANG: 'es_ES.UTF-8' })).toBe('es');
  });

  it('usa inglés para idiomas no soportados', () => {
    expect(detectLocale({ LANG: 'fr_FR.UTF-8' })).toBe('en');
  });

  it('ignora C y POSIX y pasa a la siguiente fuente', () => {
    expect(detectLocale({ LC_ALL: 'C', LANG: 'es_ES.UTF-8' })).toBe('es');
    expect(detectLocale({ LANG: 'POSIX', BUTLER_LANG: 'es' })).toBe('es');
  });
});

describe('msg', () => {
  it('devuelve el texto del idioma activo e interpola variables', () => {
    setLocale('en');
    expect(msg.update.available({ current: '1.0.0', latest: '2.0.0' })).toBe('New version available: 1.0.0 → 2.0.0');
    setLocale('es');
    expect(msg.update.available({ current: '1.0.0', latest: '2.0.0' })).toBe('Nueva versión disponible: 1.0.0 → 2.0.0');
  });

  it('resuelve el idioma al llamar, no al importar', () => {
    const disable = msg.update.disable;
    setLocale('en');
    expect(disable()).toContain('disable');
    setLocale('es');
    expect(disable()).toContain('desactivar');
  });
});

type Tree = { readonly [key: string]: string | Tree };

function flatten(node: Tree, prefix = ''): Record<string, string> {
  return Object.entries(node).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = `${prefix}${key}`;
    return typeof value === 'string' ? { ...acc, [path]: value } : { ...acc, ...flatten(value, `${path}.`) };
  }, {});
}

describe('catálogos', () => {
  const flatEn = flatten(en);
  const flatEs = flatten(es);

  it('en y es tienen exactamente las mismas claves', () => {
    expect(Object.keys(flatEs).sort()).toEqual(Object.keys(flatEn).sort());
  });

  it('es usa los mismos marcadores que en', () => {
    const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    for (const key of Object.keys(flatEn)) {
      expect(vars(flatEs[key])).toEqual(vars(flatEn[key]));
    }
  });
});
