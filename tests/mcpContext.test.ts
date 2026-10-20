import { describe, it, expect, beforeEach, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { configManager } from '../src/utils/config';
import { defaultContextFile, MAX_CONTEXT_CHARS, resolveUserContext } from '../src/mcp/context';

const DEFAULT = '/home/u/.butler-ci-cli/context.md';

function files(contents: Record<string, string | Error>) {
  vi.mocked(existsSync).mockImplementation((path) => String(path) in contents);
  vi.mocked(readFileSync).mockImplementation(((path: unknown) => {
    const value = contents[String(path)];
    if (value instanceof Error) throw value;
    return value;
  }) as never);
}

describe('resolveUserContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(configManager, 'getConfigDir').mockReturnValue('/home/u/.butler-ci-cli/configs');
    files({});
  });

  it('usa ~/.butler-ci-cli/context.md', () => {
    expect(defaultContextFile()).toBe(DEFAULT);
  });

  it('devuelve undefined si no hay contexto', () => {
    expect(resolveUserContext()).toEqual({ text: undefined, warnings: [] });
  });

  it('carga el fichero por defecto sin necesidad de opciones', () => {
    files({ [DEFAULT]: '  Deploys go through platform/deploy.  \n' });

    expect(resolveUserContext()).toEqual({ text: 'Deploys go through platform/deploy.', warnings: [] });
  });

  it('combina fichero por defecto, --context-file y --context en ese orden', () => {
    files({ [DEFAULT]: 'one', '/tmp/extra.md': 'two' });

    const { text } = resolveUserContext({ contextFile: '/tmp/extra.md', context: 'three' });

    expect(text).toBe('one\n\ntwo\n\nthree');
  });

  it('avisa, sin fallar, si el --context-file no existe', () => {
    const result = resolveUserContext({ contextFile: '/nope.md', context: 'inline' });

    expect(result.text).toBe('inline');
    expect(result.warnings).toEqual(['context file not found: /nope.md']);
  });

  it('avisa, sin fallar, si un fichero no se puede leer', () => {
    files({ [DEFAULT]: new Error('EACCES') });

    const result = resolveUserContext({ context: 'inline' });

    expect(result.text).toBe('inline');
    expect(result.warnings[0]).toContain('EACCES');
  });

  it('no avisa si el fichero por defecto no existe', () => {
    expect(resolveUserContext({ context: 'x' }).warnings).toEqual([]);
  });

  it('ignora contextos vacíos o de solo espacios', () => {
    files({ [DEFAULT]: '  \n ' });

    expect(resolveUserContext({ context: '   ' }).text).toBeUndefined();
  });

  it('recorta el contexto demasiado largo y lo avisa', () => {
    const result = resolveUserContext({ context: 'a'.repeat(MAX_CONTEXT_CHARS + 500) });

    expect(result.text).toHaveLength(MAX_CONTEXT_CHARS);
    expect(result.warnings[0]).toContain('truncated');
  });
});
