import { describe, it, expect } from 'vitest';
import {
  runBatch,
  parseUntil,
  parseManifest,
  formatUntil,
  type BatchDeps,
  type BatchEvent,
  type Probe,
} from '../src/utils/batchRunner';

const waiting: Probe = { state: 'waiting' };
const reached: Probe = { state: 'reached' };

/** Fake Jenkins: each job answers its scripted probes in order (the last one repeats). */
function fakeDeps(scripts: Record<string, Array<Probe | Error>>, failLaunch: string[] = []) {
  const events: BatchEvent[] = [];
  const launched: string[] = [];
  const calls: Record<string, number> = {};
  let inFlight = 0;
  let maxInFlight = 0;
  const finished = new Set<string>();

  const deps: BatchDeps = {
    async launch(entry) {
      if (failLaunch.includes(entry.job)) throw new Error('403');
      launched.push(entry.job);
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      return { queueUrl: `q/${entry.job}` };
    },
    async probe(entry, handle) {
      handle.build ??= 1;
      const script = scripts[entry.job] ?? [reached];
      const step = script[Math.min(calls[entry.job] = (calls[entry.job] ?? -1) + 1, script.length - 1)];
      if (step instanceof Error) throw step;
      if (step.state !== 'waiting' && !finished.has(entry.job)) {
        finished.add(entry.job);
        inFlight--;
      }
      return step;
    },
    sleep: async () => {},
    onEvent: (event) => events.push(event),
  };

  return { deps, events, launched, maxInFlight: () => maxInFlight };
}

const jobs = (...names: string[]) => names.map((job) => ({ job }));

describe('runBatch', () => {
  it('nunca supera la concurrencia y lanza todos los jobs', async () => {
    const t = fakeDeps({
      a: [waiting, waiting, reached],
      b: [waiting, reached],
      c: [waiting, reached],
      d: [reached],
    });

    const results = await runBatch(jobs('a', 'b', 'c', 'd'), { concurrency: 2, pollIntervalMs: 0 }, t.deps);

    expect(t.maxInFlight()).toBe(2);
    expect(t.launched).toEqual(['a', 'b', 'c', 'd']);
    expect(results.map((r) => r.outcome)).toEqual(['reached', 'reached', 'reached', 'reached']);
  });

  it('no lanza el siguiente hasta que se libera un hueco', async () => {
    const t = fakeDeps({ a: [waiting, waiting, reached] });

    await runBatch(jobs('a', 'b'), { concurrency: 1, pollIntervalMs: 0 }, t.deps);

    const order = t.events.map((e) => `${e.type}:${e.job}`);
    expect(order.indexOf('reached:a')).toBeLessThan(order.indexOf('launched:b'));
  });

  it('libera el hueco cuando un build ya no puede alcanzar el objetivo', async () => {
    const t = fakeDeps({ a: [{ state: 'missed', reason: 'FAILURE' }] });

    const results = await runBatch(jobs('a', 'b'), { concurrency: 1, pollIntervalMs: 0 }, t.deps);

    expect(results.map((r) => r.outcome)).toEqual(['missed', 'reached']);
    expect(results[0].detail).toBe('FAILURE');
    expect(t.launched).toEqual(['a', 'b']);
  });

  it('un fallo al lanzar no bloquea el resto', async () => {
    const t = fakeDeps({}, ['a']);

    const results = await runBatch(jobs('a', 'b'), { concurrency: 1, pollIntervalMs: 0 }, t.deps);

    expect(results.map((r) => r.outcome)).toEqual(['failed', 'reached']);
    expect(results[0].detail).toBe('403');
  });

  it('tolera fallos de consulta aislados', async () => {
    const t = fakeDeps({ a: [new Error('blip'), new Error('blip'), reached] });

    const results = await runBatch(jobs('a'), { concurrency: 1, pollIntervalMs: 0 }, t.deps);

    expect(results[0].outcome).toBe('reached');
  });

  it('da por fallido un build tras tres consultas seguidas con error', async () => {
    const t = fakeDeps({ a: [new Error('down')] });

    const results = await runBatch(jobs('a', 'b'), { concurrency: 1, pollIntervalMs: 0 }, t.deps);

    expect(results.map((r) => r.outcome)).toEqual(['failed', 'reached']);
    expect(results[0].detail).toBe('down');
  });

  it('emite "started" una sola vez, cuando aparece el número de build', async () => {
    const t = fakeDeps({ a: [waiting, reached] });

    await runBatch(jobs('a'), { concurrency: 1, pollIntervalMs: 0 }, t.deps);

    expect(t.events.filter((e) => e.type === 'started')).toEqual([
      { type: 'started', index: 0, job: 'a', build: 1 },
    ]);
  });

  it('con concurrencia mayor que los jobs los lanza todos de golpe', async () => {
    const t = fakeDeps({ a: [waiting, reached], b: [waiting, reached] });

    await runBatch(jobs('a', 'b'), { concurrency: 10, pollIntervalMs: 0 }, t.deps);

    expect(t.maxInFlight()).toBe(2);
  });
});

describe('parseUntil', () => {
  it('acepta los estados conocidos y stage:<nombre>', () => {
    expect(parseUntil('started')).toEqual({ kind: 'started' });
    expect(parseUntil('finished')).toEqual({ kind: 'finished' });
    expect(parseUntil('success')).toEqual({ kind: 'success' });
    expect(parseUntil('paused')).toEqual({ kind: 'paused' });
    expect(parseUntil('stage:Deploy to prod')).toEqual({ kind: 'stage', stage: 'Deploy to prod' });
  });

  it('rechaza valores desconocidos y stage: vacío', () => {
    expect(() => parseUntil('done')).toThrow('--until');
    expect(() => parseUntil('stage:')).toThrow('--until');
  });

  it('formatUntil invierte parseUntil', () => {
    expect(formatUntil(parseUntil('stage:Build'))).toBe('stage:Build');
    expect(formatUntil(parseUntil('success'))).toBe('success');
  });
});

describe('parseManifest', () => {
  it('acepta jobs como cadena o con parámetros, más los ajustes', () => {
    const manifest = parseManifest(
      JSON.stringify({
        concurrency: 2,
        until: 'success',
        pollInterval: 3,
        jobs: ['app/build', { job: 'app/deploy', params: { ENV: 'staging', DRY: true, N: 2 } }],
      }),
      'p.json'
    );

    expect(manifest).toEqual({
      concurrency: 2,
      until: 'success',
      pollInterval: 3,
      jobs: [{ job: 'app/build' }, { job: 'app/deploy', params: { ENV: 'staging', DRY: true, N: 2 } }],
    });
  });

  it('rechaza JSON mal formado', () => {
    expect(() => parseManifest('{nope', 'p.json')).toThrow('p.json');
  });

  it('rechaza jobs vacío, concurrencia no entera y params anidados, indicando la ruta', () => {
    expect(() => parseManifest('{"jobs": []}', 'p.json')).toThrow('jobs');
    expect(() => parseManifest('{"concurrency": 1.5, "jobs": ["a"]}', 'p.json')).toThrow('concurrency');
    expect(() => parseManifest('{"jobs": [{"job": "a", "params": {"x": {"y": 1}}}]}', 'p.json')).toThrow('jobs.0');
  });
});
