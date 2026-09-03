import { describe, it, expect, vi } from 'vitest';

// tests/setup.ts mockea el logger globalmente; aquí necesitamos el módulo real.
const loadLogger = async () =>
  (await vi.importActual<typeof import('../src/utils/logger')>('../src/utils/logger'));

describe('formatLogLine', () => {
  it('imprime el contenido de info sin prefijo de nivel ni hora', async () => {
    const { formatLogLine } = await loadLogger();
    const line = formatLogLine(
      { msg: '   Jobs: 577', level: 30, time: Date.now() },
      'msg',
      { showTimestamps: false }
    );
    expect(line).toBe('   Jobs: 577');
    expect(line).not.toContain('INFO');
  });

  it('conserva los saltos de línea que separan bloques', async () => {
    const { formatLogLine } = await loadLogger();
    const line = formatLogLine({ msg: '\n📊 Resumen:', level: 30 }, 'msg', {
      showTimestamps: false,
    });
    expect(line).toBe('\n📊 Resumen:');
  });

  it('marca warn y error para distinguirlos del contenido', async () => {
    const { formatLogLine } = await loadLogger();
    const warn = formatLogLine({ msg: 'cuidado', level: 40 }, 'msg', { showTimestamps: false });
    const error = formatLogLine({ msg: 'roto', level: 50 }, 'msg', { showTimestamps: false });
    expect(warn).toContain('WARN');
    expect(warn).toContain('cuidado');
    expect(error).toContain('ERROR');
    expect(error).toContain('roto');
  });

  it('añade la hora cuando se pide, después de los saltos de línea', async () => {
    const { formatLogLine, localTime } = await loadLogger();
    const time = Date.now();
    const line = formatLogLine({ msg: '\nResumen', level: 30, time }, 'msg', {
      showTimestamps: true,
    });
    expect(line.startsWith('\n')).toBe(true);
    expect(line).toContain(`[${localTime(time)}]`);
    expect(line.endsWith('Resumen')).toBe(true);
  });
});

describe('localTime', () => {
  it('usa la zona horaria del sistema, no UTC', async () => {
    const { localTime } = await loadLogger();
    // 2024-01-15T05:27:54Z -> 06:27:54 en Europe/Madrid (UTC+1 en enero)
    const timestamp = Date.UTC(2024, 0, 15, 5, 27, 54);
    const expected = new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    expect(localTime(timestamp)).toBe(expected);
  });

  it('cae al momento actual si el timestamp no es válido', async () => {
    const { localTime } = await loadLogger();
    const now = Date.UTC(2024, 0, 15, 5, 27, 54);
    expect(localTime(undefined, now)).toBe(localTime(now, now));
  });
});
