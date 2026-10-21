import { vi } from 'vitest';

// Los tests comprueban textos en español; fijamos el idioma para que no dependa del entorno.
process.env.BUTLER_LANG = 'es';

// Mock de los módulos de file system para tests
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    readdirSync: vi.fn(),
    unlinkSync: vi.fn(),
  };
});

// Mock de logger para evitar output en tests
vi.mock('../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));
