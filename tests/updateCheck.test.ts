import { describe, it, expect } from 'vitest';
import { isNewerVersion, updateCheckDisabled } from '../src/utils/updateCheck';

describe('isNewerVersion', () => {
  it('detecta versiones mayores en cualquier componente', () => {
    expect(isNewerVersion('3.4.2', '3.4.1')).toBe(true);
    expect(isNewerVersion('3.5.0', '3.4.9')).toBe(true);
    expect(isNewerVersion('4.0.0', '3.99.99')).toBe(true);
  });

  it('compara numéricamente, no como texto', () => {
    expect(isNewerVersion('3.10.0', '3.9.0')).toBe(true);
    expect(isNewerVersion('3.9.0', '3.10.0')).toBe(false);
  });

  it('devuelve false si es igual o menor', () => {
    expect(isNewerVersion('3.4.1', '3.4.1')).toBe(false);
    expect(isNewerVersion('3.4.0', '3.4.1')).toBe(false);
  });

  it('ignora el sufijo de prerelease', () => {
    expect(isNewerVersion('3.5.0-beta.1', '3.4.1')).toBe(true);
    expect(isNewerVersion('3.4.1-beta.1', '3.4.1')).toBe(false);
  });
});

describe('updateCheckDisabled', () => {
  const argv = ['node', 'butler-ci-cli', 'list-jobs'];

  it('está activo por defecto', () => {
    expect(updateCheckDisabled({}, argv)).toBe(false);
  });

  it('se desactiva con variables de entorno', () => {
    expect(updateCheckDisabled({ BUTLER_NO_UPDATE_CHECK: '1' }, argv)).toBe(true);
    expect(updateCheckDisabled({ NO_UPDATE_NOTIFIER: '1' }, argv)).toBe(true);
    expect(updateCheckDisabled({ CI: 'true' }, argv)).toBe(true);
  });

  it('no actúa en el servidor MCP', () => {
    expect(updateCheckDisabled({}, ['node', 'butler-ci-cli', 'mcp'])).toBe(true);
  });
});

describe('desarrollo con versión por delante de npm', () => {
  it('no avisa si la versión local es mayor que la publicada', () => {
    expect(isNewerVersion('3.4.1', '3.5.0')).toBe(false);
    expect(isNewerVersion('3.4.1', '4.0.0-dev')).toBe(false);
  });
});
