import { describe, it, expect, beforeEach, vi } from 'vitest';
import { existsSync, writeFileSync } from 'node:fs';
import { renderTemplate } from '../src/utils/batchTemplate';
import { parseManifest } from '../src/utils/batchRunner';
import { template } from '../src/commands/template';
import * as folder from '../src/utils/jenkinsFolder';
import { logger } from '../src/utils/logger';

vi.mock('../src/utils/jenkinsFolder');

const job = (fullName: string, color = 'blue') => ({ name: fullName.split('/').pop()!, fullName, type: 'job' as const, url: 'u', level: 0, color });

describe('renderTemplate', () => {
  it('genera un JSONC válido con todos los jobs comentados y agrupados por carpeta', () => {
    const text = renderTemplate([
      { job: 'zeta' },
      { job: 'app/web/deploy' },
      { job: 'app/api/deploy', params: { ENV: 'staging', DRY_RUN: false } },
    ]);

    expect(parseManifest(text, 't.jsonc')).toEqual({ concurrency: 1, until: 'finished', pollInterval: 5, jobs: [] });
    expect(text).toContain('// --- app/api ---');
    expect(text).toContain('// --- app/web ---');
    expect(text).toContain('// --- (raíz) ---');
    expect(text).toContain('// "app/web/deploy",');
    expect(text.indexOf('app/api')).toBeLessThan(text.indexOf('app/web'));
  });

  it('pone primero los jobs de la raíz y agrupa cada carpeta sin intercalar subcarpetas', () => {
    const text = renderTemplate([
      { job: 'team/long' },
      { job: 'team/backend/deploy' },
      { job: 'zeta' },
      { job: 'team/other' },
    ]);

    const groups = text.split('\n').filter((l) => l.includes('// --- '));
    expect(groups.map((l) => l.trim())).toEqual(['// --- (raíz) ---', '// --- team ---', '// --- team/backend ---']);
  });

  it('descomentar una línea la convierte en un job válido, con sus parámetros intactos', () => {
    const text = renderTemplate([
      { job: 'app/deploy', params: { MSG: 'a, b: c', DRY_RUN: true, N: 3 } },
      { job: 'app/plain' },
    ]);

    const active = text
      .split('\n')
      .map((line) => line.replace(/^(\s*)\/\/ (?=["{])/, '$1'))
      .join('\n');

    expect(parseManifest(active, 't.jsonc').jobs).toEqual([
      { job: 'app/deploy', params: { MSG: 'a, b: c', DRY_RUN: true, N: 3 } },
      { job: 'app/plain' },
    ]);
  });

  it('los valores con saltos de línea no rompen el comentario de una sola línea', () => {
    const text = renderTemplate([{ job: 'a', params: { SCRIPT: 'one\ntwo' } }]);

    expect(text.split('\n').filter((l) => l.includes('SCRIPT'))).toHaveLength(1);
  });
});

describe('template command', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.mocked(folder.getAllJobs).mockResolvedValue([job('app/b'), job('app/a'), job('old/job', 'disabled')]);
  });

  it('imprime la plantilla por stdout sin los jobs deshabilitados', async () => {
    await template(undefined, {});

    const out = vi.mocked(console.log).mock.calls.flat().join('\n');
    expect(out).toContain('"app/a"');
    expect(out).toContain('"app/b"');
    expect(out).not.toContain('old/job');
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it('limita a una carpeta', async () => {
    await template('app', {});

    expect(folder.getAllJobs).toHaveBeenCalledWith('app');
  });

  it('escribe el fichero con -o', async () => {
    vi.mocked(existsSync).mockReturnValue(false);

    await template(undefined, { output: 'plantilla.jsonc' });

    expect(writeFileSync).toHaveBeenCalledWith('plantilla.jsonc', expect.stringContaining('"app/a"'), 'utf8');
    expect(console.log).not.toHaveBeenCalled();
  });

  it('no pisa un fichero existente sin --force', async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await template(undefined, { output: 'plantilla.jsonc' });

    expect(writeFileSync).not.toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('--force'));
  });

  it('con --force lo sobrescribe', async () => {
    vi.mocked(existsSync).mockReturnValue(true);

    await template(undefined, { output: 'plantilla.jsonc', force: true });

    expect(writeFileSync).toHaveBeenCalled();
  });

  it('con --with-params añade los valores por defecto y deja fuera contraseñas y ficheros', async () => {
    vi.mocked(folder.getAllJobs).mockResolvedValue([job('app/deploy')]);
    vi.mocked(folder.getJobParameters).mockResolvedValue([
      { name: 'ENV', type: 'choice', defaultValue: 'staging', choices: ['staging', 'qa'] },
      { name: 'DRY_RUN', type: 'boolean', defaultValue: false },
      { name: 'EMPTY', type: 'string' },
      { name: 'SECRET', type: 'password', defaultValue: 'hunter2' },
      { name: 'UPLOAD', type: 'file' },
    ]);

    await template(undefined, { withParams: true });

    const out = vi.mocked(console.log).mock.calls.flat().join('\n');
    expect(out).toContain('"params": { "ENV": "staging", "DRY_RUN": false, "EMPTY": "" }');
    expect(out).not.toContain('hunter2');
    expect(out).not.toContain('SECRET');
    expect(out).not.toContain('UPLOAD');
  });

  it('un job cuyos parámetros no se pueden leer sale como texto simple', async () => {
    vi.mocked(folder.getAllJobs).mockResolvedValue([job('app/deploy')]);
    vi.mocked(folder.getJobParameters).mockRejectedValue(new Error('403'));

    await template(undefined, { withParams: true });

    expect(vi.mocked(console.log).mock.calls.flat().join('\n')).toContain('// "app/deploy",');
  });

  it('falla si no hay jobs', async () => {
    vi.mocked(folder.getAllJobs).mockResolvedValue([]);
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await template('nada', {});

    expect(exit).toHaveBeenCalledWith(1);
  });
});
