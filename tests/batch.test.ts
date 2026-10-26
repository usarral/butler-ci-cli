import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import inquirer from 'inquirer';
import { batch, probeBuild, resolveBatch } from '../src/commands/batch';
import { stages } from '../src/commands/stages';
import * as folder from '../src/utils/jenkinsFolder';
import { logger } from '../src/utils/logger';

vi.mock('inquirer', () => ({ default: { prompt: vi.fn() } }));
vi.mock('../src/utils/jenkinsFolder');

const running = { number: 7, url: 'u', result: null, timestamp: 0, duration: 0, building: true };
const finished = (result: string) => ({ ...running, result, building: false });

describe('probeBuild', () => {
  beforeEach(() => vi.resetAllMocks());

  it('espera mientras el item sigue en la cola', async () => {
    vi.mocked(folder.getQueueItem).mockResolvedValue({ cancelled: false });
    const handle = { queueUrl: 'http://j/queue/item/1/' };

    expect(await probeBuild('a', handle, { kind: 'finished' })).toEqual({ state: 'waiting' });
    expect(handle).toEqual({ queueUrl: 'http://j/queue/item/1/' });
  });

  it('si lo sacan de la cola no puede alcanzar el objetivo', async () => {
    vi.mocked(folder.getQueueItem).mockResolvedValue({ cancelled: true });

    const probe = await probeBuild('a', { queueUrl: 'q' }, { kind: 'started' });

    expect(probe.state).toBe('missed');
  });

  it('started se cumple en cuanto la cola asigna un build', async () => {
    vi.mocked(folder.getQueueItem).mockResolvedValue({ cancelled: false, buildNumber: 7 });
    const handle: { queueUrl: string; build?: number } = { queueUrl: 'q' };

    expect(await probeBuild('a', handle, { kind: 'started' })).toEqual({ state: 'reached' });
    expect(handle.build).toBe(7);
    expect(folder.getBuildInfo).not.toHaveBeenCalled();
  });

  it('finished espera a que termine y acepta cualquier resultado', async () => {
    vi.mocked(folder.getBuildInfo).mockResolvedValueOnce(running).mockResolvedValueOnce(finished('FAILURE'));
    const handle = { queueUrl: 'q', build: 7 };

    expect(await probeBuild('a', handle, { kind: 'finished' })).toEqual({ state: 'waiting' });
    expect(await probeBuild('a', handle, { kind: 'finished' })).toEqual({ state: 'reached' });
  });

  it('success da por perdido un build que termina en otro resultado', async () => {
    vi.mocked(folder.getBuildInfo).mockResolvedValue(finished('FAILURE'));

    const probe = await probeBuild('a', { queueUrl: 'q', build: 7 }, { kind: 'success' });

    expect(probe).toEqual({ state: 'missed', reason: expect.stringContaining('FAILURE') });
  });

  it('stage se cumple con el build aún en marcha cuando la etapa acaba bien', async () => {
    vi.mocked(folder.getBuildInfo).mockResolvedValue(running);
    vi.mocked(folder.getPipelineStages).mockResolvedValue([
      { name: 'Build', status: 'SUCCESS' },
      { name: 'Deploy', status: 'IN_PROGRESS' },
    ]);
    const handle = { queueUrl: 'q', build: 7 };

    expect(await probeBuild('a', handle, { kind: 'stage', stage: 'Build' })).toEqual({ state: 'reached' });
    expect(await probeBuild('a', handle, { kind: 'stage', stage: 'Deploy' })).toEqual({ state: 'waiting' });
  });

  it('stage que aún no existe es espera mientras el build corre, y perdida si termina sin ella', async () => {
    vi.mocked(folder.getPipelineStages).mockResolvedValue([{ name: 'Build', status: 'SUCCESS' }]);
    const handle = { queueUrl: 'q', build: 7 };

    vi.mocked(folder.getBuildInfo).mockResolvedValue(running);
    expect(await probeBuild('a', handle, { kind: 'stage', stage: 'Deploy' })).toEqual({ state: 'waiting' });

    vi.mocked(folder.getBuildInfo).mockResolvedValue(finished('SUCCESS'));
    expect((await probeBuild('a', handle, { kind: 'stage', stage: 'Deploy' })).state).toBe('missed');
  });

  it('paused se cumple cuando algún stage espera aprobación, con el build aún en marcha', async () => {
    vi.mocked(folder.getBuildInfo).mockResolvedValue(running);
    vi.mocked(folder.getPipelineStages)
      .mockResolvedValueOnce([{ name: 'Deploy', status: 'IN_PROGRESS' }])
      .mockResolvedValueOnce([
        { name: 'Deploy', status: 'SUCCESS' },
        { name: 'Approval', status: 'PAUSED_PENDING_INPUT' },
      ]);
    const handle = { queueUrl: 'q', build: 7 };

    expect(await probeBuild('a', handle, { kind: 'paused' })).toEqual({ state: 'waiting' });
    expect(await probeBuild('a', handle, { kind: 'paused' })).toEqual({ state: 'reached' });
  });

  it('paused da por perdido un build que termina sin haberse pausado', async () => {
    vi.mocked(folder.getBuildInfo).mockResolvedValue(finished('SUCCESS'));
    vi.mocked(folder.getPipelineStages).mockResolvedValue([{ name: 'Deploy', status: 'SUCCESS' }]);

    const probe = await probeBuild('a', { queueUrl: 'q', build: 7 }, { kind: 'paused' });

    expect(probe).toEqual({ state: 'missed', reason: expect.stringContaining('pausarse') });
  });

  it('paused indica el resultado del build y el stage que falló', async () => {
    vi.mocked(folder.getBuildInfo).mockResolvedValue(finished('FAILURE'));
    vi.mocked(folder.getPipelineStages).mockResolvedValue([
      { name: 'Deploy', status: 'SUCCESS' },
      { name: 'Test', status: 'FAILED' },
    ]);

    const probe = await probeBuild('a', { queueUrl: 'q', build: 7 }, { kind: 'paused' });

    expect(probe).toEqual({
      state: 'missed',
      reason: expect.stringMatching(/FAILURE.*stage "Test" terminó como FAILED/),
    });
  });

  it('stage inexistente en un build fallido indica el resultado', async () => {
    vi.mocked(folder.getBuildInfo).mockResolvedValue(finished('FAILURE'));
    vi.mocked(folder.getPipelineStages).mockResolvedValue([{ name: 'Build', status: 'FAILED' }]);

    const probe = await probeBuild('a', { queueUrl: 'q', build: 7 }, { kind: 'stage', stage: 'Deploy' });

    expect(probe).toEqual({ state: 'missed', reason: expect.stringMatching(/FAILURE.*"Deploy".*"Build"/) });
  });

  it('stage fallida libera de inmediato', async () => {
    vi.mocked(folder.getBuildInfo).mockResolvedValue(running);
    vi.mocked(folder.getPipelineStages).mockResolvedValue([{ name: 'Test', status: 'FAILED' }]);

    const probe = await probeBuild('a', { queueUrl: 'q', build: 7 }, { kind: 'stage', stage: 'Test' });

    expect(probe).toEqual({ state: 'missed', reason: expect.stringContaining('FAILED') });
  });
});

describe('resolveBatch', () => {
  beforeEach(() => vi.resetAllMocks());

  it('usa los argumentos con sus parámetros comunes y los valores por defecto', () => {
    const r = resolveBatch(['a', 'b'], { params: 'ENV=staging,DRY=true' });

    expect(r.entries).toEqual([
      { job: 'a', params: { ENV: 'staging', DRY: true } },
      { job: 'b', params: { ENV: 'staging', DRY: true } },
    ]);
    expect(r).toMatchObject({ concurrency: 1, intervalSeconds: 5, until: { kind: 'finished' } });
  });

  it('combina argumentos y manifiesto; los flags ganan al manifiesto', () => {
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({ concurrency: 3, until: 'success', pollInterval: 2, jobs: [{ job: 'c', params: { X: 1 } }] })
    );

    const r = resolveBatch(['a'], { file: 'p.json', concurrency: '5' });

    expect(r.entries).toEqual([{ job: 'a' }, { job: 'c', params: { X: 1 } }]);
    expect(r).toMatchObject({ concurrency: 5, intervalSeconds: 2, until: { kind: 'success' } });
  });

  it('falla sin jobs, con concurrencia inválida y con --until desconocido', () => {
    expect(() => resolveBatch([], {})).toThrow('--file');
    expect(() => resolveBatch(['a'], { concurrency: '0' })).toThrow('concurrencia');
    expect(() => resolveBatch(['a'], { concurrency: '1.5' })).toThrow('concurrencia');
    expect(() => resolveBatch(['a'], { interval: 'abc' })).toThrow('intervalo');
    expect(() => resolveBatch(['a'], { until: 'done' })).toThrow('--until');
  });

  it('informa de un manifiesto ilegible', () => {
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error('ENOENT');
    });

    expect(() => resolveBatch([], { file: 'nope.json' })).toThrow('nope.json');
  });
});

describe('batch command', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(folder.getJobInfo).mockResolvedValue({ buildable: true });
  });

  it('no lanza nada si algún job no existe o no es ejecutable', async () => {
    vi.mocked(folder.getJobInfo).mockResolvedValueOnce({ buildable: true }).mockResolvedValueOnce({ buildable: false });
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await batch(['a', 'folder'], { yes: true });

    expect(folder.buildJob).not.toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('no lanza nada si el usuario no confirma', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({ confirm: false });

    await batch(['a'], {});

    expect(folder.buildJob).not.toHaveBeenCalled();
  });

  it('lanza el lote con --yes hasta started y termina sin error', async () => {
    vi.mocked(folder.buildJob).mockResolvedValue({ queueUrl: 'http://j/queue/item/1/', message: 'ok' });
    vi.mocked(folder.getQueueItem).mockResolvedValue({ cancelled: false, buildNumber: 3 });
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await batch(['a', 'b'], { yes: true, until: 'started', interval: '0.001' });

    expect(inquirer.prompt).not.toHaveBeenCalled();
    expect(folder.buildJob).toHaveBeenCalledTimes(2);
    expect(exit).not.toHaveBeenCalled();
  });

  it('sale con código 1 si algún job no alcanza el objetivo', async () => {
    vi.mocked(folder.buildJob).mockResolvedValue({ queueUrl: 'http://j/queue/item/1/', message: 'ok' });
    vi.mocked(folder.getQueueItem).mockResolvedValue({ cancelled: false, buildNumber: 3 });
    vi.mocked(folder.getBuildInfo).mockResolvedValue(finished('FAILURE'));
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await batch(['a'], { yes: true, until: 'success', interval: '0.001' });

    expect(exit).toHaveBeenCalledWith(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('FAILURE'));
  });
});

describe('stages command', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  it('resuelve "latest" al último build y lista los nombres de los stages', async () => {
    vi.mocked(folder.getBuildInfo).mockResolvedValue(finished('SUCCESS'));
    vi.mocked(folder.getPipelineStages).mockResolvedValue([
      { name: 'Build', status: 'SUCCESS', durationMillis: 1500 },
      { name: 'Deploy', status: 'NOT_EXECUTED' },
    ]);

    await stages('app/deploy');

    expect(folder.getBuildInfo).toHaveBeenCalledWith('app/deploy', 'lastBuild');
    expect(folder.getPipelineStages).toHaveBeenCalledWith('app/deploy', 7);
    const output = vi.mocked(console.log).mock.calls.flat().join('\n');
    expect(output).toContain('Build');
    expect(output).toContain('Deploy');
  });

  it('avisa cuando el build no tiene stages', async () => {
    vi.mocked(folder.getBuildInfo).mockResolvedValue(finished('SUCCESS'));
    vi.mocked(folder.getPipelineStages).mockResolvedValue([]);

    await stages('app/deploy', '7');

    expect(folder.getPipelineStages).toHaveBeenCalledWith('app/deploy', 7);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('No se encontraron stages'));
  });

  it('sale con error si Jenkins falla', async () => {
    vi.mocked(folder.getBuildInfo).mockRejectedValue(new Error('boom'));
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await stages('app/deploy');

    expect(exit).toHaveBeenCalledWith(1);
  });
});
