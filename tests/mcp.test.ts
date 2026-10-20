import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from '../src/mcp/server';
import * as config from '../src/utils/config';
import * as folder from '../src/utils/jenkinsFolder';
import * as jenkinsClient from '../src/utils/jenkinsClient';

vi.mock('../src/utils/jenkinsFolder');

const jenkinsConfig = {
  name: 'prod',
  url: 'https://jenkins.example.com',
  username: 'admin',
  token: 'super-secret-token',
};

async function connect(options: { readOnly?: boolean; allowCreateConfig?: boolean; userContext?: string } = {}) {
  const server = createMcpServer(options);
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, server };
}

function text(result: unknown): string {
  const content = (result as { content: { type: string; text: string }[] }).content;
  return content[0].text;
}

describe('MCP server', () => {
  let close: (() => Promise<void>)[] = [];

  async function setup(options: { readOnly?: boolean; allowCreateConfig?: boolean; userContext?: string } = {}) {
    const { client, server } = await connect(options);
    close.push(() => client.close(), () => server.close());
    return client;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(config, 'getJenkinsConfig').mockReturnValue(jenkinsConfig);
    vi.spyOn(config.configManager, 'listConfigs').mockReturnValue(['prod', 'dev']);
  });

  afterEach(async () => {
    await Promise.all(close.map((fn) => fn()));
    close = [];
  });

  it('expone todas las herramientas', async () => {
    const client = await setup();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      'abort_build',
      'create_config',
      'delete_config',
      'download_build_logs',
      'follow_build_logs',
      'get_build_logs',
      'get_build_steps',
      'get_config',
      'get_job_info',
      'get_job_params',
      'get_last_build',
      'list_builds',
      'list_jobs',
      'search_jobs',
      'trigger_build',
      'update_config',
      'use_config',
    ]);
  });

  it('create_config está visible pero desactivada por defecto, y explica cómo activarla', async () => {
    const save = vi.spyOn(config.configManager, 'saveConfig');
    const client = await setup();

    const { tools } = await client.listTools();
    expect(tools.find((t) => t.name === 'create_config')?.description).toContain('DISABLED');

    const result = await client.callTool({
      name: 'create_config',
      arguments: { name: 'staging', url: 'https://jenkins.example.com', username: 'u', token: 't' },
    });

    expect(result.isError).toBe(true);
    expect(text(result)).toContain('--enable-create-config');
    expect(text(result)).not.toContain('--read-only');
    expect(save).not.toHaveBeenCalled();
  });

  it('create_config funciona con allowCreateConfig', async () => {
    const client = await setup({ allowCreateConfig: true });
    const { tools } = await client.listTools();
    expect(tools.find((t) => t.name === 'create_config')?.description).not.toContain('DISABLED');
  });

  it('en modo solo lectura las tools que modifican siguen visibles pero fallan indicando --read-only', async () => {
    const save = vi.spyOn(config.configManager, 'saveConfig');
    const del = vi.spyOn(config.configManager, 'deleteConfig');
    const client = await setup({ readOnly: true, allowCreateConfig: true });

    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    for (const gated of ['trigger_build', 'abort_build', 'download_build_logs', 'create_config', 'update_config', 'delete_config']) {
      expect(names).toContain(gated);
      const result = await client.callTool({ name: gated, arguments: { job: 'j', name: 'n' } });
      expect(result.isError).toBe(true);
      expect(text(result)).toContain('--read-only');
    }

    expect(folder.buildJob).not.toHaveBeenCalled();
    expect(folder.abortBuild).not.toHaveBeenCalled();
    expect(folder.downloadBuildLogs).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();

    const create = await client.callTool({ name: 'create_config', arguments: {} });
    expect(text(create)).toContain('--enable-create-config');
    expect(names).toContain('use_config');
  });

  it('get_config lista los entornos sin filtrar ningún token', async () => {
    vi.spyOn(config.configManager, 'loadConfig').mockImplementation((name) =>
      name === 'prod' ? jenkinsConfig : { ...jenkinsConfig, name, url: 'https://dev.example.com', token: 'dev-token' }
    );
    const client = await setup();
    const result = await client.callTool({ name: 'get_config', arguments: {} });
    const body = text(result);
    expect(body).not.toContain('super-secret-token');
    expect(body).not.toContain('dev-token');
    const parsed = JSON.parse(body);
    expect(parsed.active.name).toBe('prod');
    expect(parsed.configs.map((c: { name: string }) => c.name)).toEqual(['prod', 'dev']);
  });

  it('devuelve un error de la tool (sin process.exit) si no hay configuración', async () => {
    vi.spyOn(config, 'getJenkinsConfig').mockReturnValue(null);
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const client = await setup();

    const result = await client.callTool({ name: 'search_jobs', arguments: { query: 'x' } });

    expect(result.isError).toBe(true);
    expect(text(result)).toContain('No active Jenkins environment');
    expect(folder.findJobsByName).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
  });

  it('search_jobs delega en findJobsByName', async () => {
    const jobs = [{ name: 'deploy', fullName: 'app/deploy', type: 'job', url: 'u', level: 1 }];
    vi.mocked(folder.findJobsByName).mockResolvedValue(jobs);
    const client = await setup();

    const result = await client.callTool({ name: 'search_jobs', arguments: { query: 'deploy' } });

    expect(folder.findJobsByName).toHaveBeenCalledWith('deploy');
    expect(JSON.parse(text(result))).toEqual(jobs);
  });

  it('list_jobs filtra por tipo y profundidad relativa a la carpeta', async () => {
    vi.mocked(folder.getAllJobsRecursive).mockResolvedValue([
      { name: 'a', fullName: 'f/a', type: 'job', url: 'u', level: 1 },
      { name: 'sub', fullName: 'f/sub', type: 'folder', url: 'u', level: 1 },
      { name: 'b', fullName: 'f/sub/b', type: 'job', url: 'u', level: 2 },
    ]);
    const client = await setup();

    const result = await client.callTool({
      name: 'list_jobs',
      arguments: { folder: 'f', maxLevel: 0, type: 'job' },
    });

    expect(folder.getAllJobsRecursive).toHaveBeenCalledWith('f');
    expect(JSON.parse(text(result)).map((i: { fullName: string }) => i.fullName)).toEqual(['f/a']);
  });

  it('list_builds aplica los valores por defecto', async () => {
    vi.mocked(folder.getBuilds).mockResolvedValue([]);
    const client = await setup();

    await client.callTool({ name: 'list_builds', arguments: { job: 'app/deploy', status: 'FAILURE' } });

    expect(folder.getBuilds).toHaveBeenCalledWith('app/deploy', {
      status: 'FAILURE',
      limit: 20,
      offset: 0,
      sortOrder: 'desc',
    });
  });

  it('get_build_logs resuelve "latest" y devuelve solo las últimas líneas', async () => {
    vi.mocked(folder.getBuildLogs).mockResolvedValue('l1\nl2\nl3\nl4\nl5');
    const client = await setup();

    const result = await client.callTool({
      name: 'get_build_logs',
      arguments: { job: 'app/deploy', tailLines: 2 },
    });

    expect(folder.getBuildLogs).toHaveBeenCalledWith('app/deploy', 'lastBuild');
    expect(text(result)).toBe('[... 3 earlier lines omitted ...]\nl4\nl5');
  });

  it('get_build_logs acepta un número de build concreto', async () => {
    vi.mocked(folder.getBuildLogs).mockResolvedValue('only');
    const client = await setup();

    const result = await client.callTool({
      name: 'get_build_logs',
      arguments: { job: 'app/deploy', build: 42 },
    });

    expect(folder.getBuildLogs).toHaveBeenCalledWith('app/deploy', 42);
    expect(text(result)).toBe('only');
  });

  it('trigger_build lanza el build con los parámetros', async () => {
    vi.mocked(folder.buildJob).mockResolvedValue({ queueUrl: 'q/1', message: 'ok' });
    const client = await setup();

    const result = await client.callTool({
      name: 'trigger_build',
      arguments: { job: 'app/deploy', parameters: { ENV: 'pre', DRY_RUN: true } },
    });

    expect(folder.buildJob).toHaveBeenCalledWith('app/deploy', { ENV: 'pre', DRY_RUN: true });
    expect(JSON.parse(text(result))).toEqual({ queueUrl: 'q/1', message: 'ok' });
  });

  it('convierte los errores de Jenkins en errores de la tool', async () => {
    vi.mocked(folder.getJobInfo).mockRejectedValue(new Error('Request failed with status code 404'));
    const client = await setup();

    const result = await client.callTool({ name: 'get_job_info', arguments: { job: 'nope' } });

    expect(result.isError).toBe(true);
    expect(text(result)).toContain('404');
  });

  it('rechaza argumentos inválidos', async () => {
    const client = await setup();

    const result = await client.callTool({
      name: 'get_build_logs',
      arguments: { job: 'app/deploy', build: 'nightly' },
    });

    expect(result.isError).toBe(true);
    expect(folder.getBuildLogs).not.toHaveBeenCalled();
  });
  describe('gestión de entornos', () => {
    it('use_config activa el entorno y reinicia el cliente cacheado', async () => {
      vi.spyOn(config.configManager, 'loadConfig').mockReturnValue(jenkinsConfig);
      const setCurrent = vi.spyOn(config.configManager, 'setCurrentConfig').mockReturnValue(true);
      const reset = vi.spyOn(jenkinsClient, 'resetJenkinsClient');
      const client = await setup();

      const result = await client.callTool({ name: 'use_config', arguments: { name: 'prod' } });

      expect(setCurrent).toHaveBeenCalledWith('prod');
      expect(reset).toHaveBeenCalled();
      expect(JSON.parse(text(result)).active.name).toBe('prod');
    });

    it('use_config falla si el entorno no existe', async () => {
      vi.spyOn(config.configManager, 'loadConfig').mockReturnValue(null);
      const setCurrent = vi.spyOn(config.configManager, 'setCurrentConfig');
      const client = await setup();

      const result = await client.callTool({ name: 'use_config', arguments: { name: 'nope' } });

      expect(result.isError).toBe(true);
      expect(setCurrent).not.toHaveBeenCalled();
    });

    it.each(['../evil', 'a/b', '.hidden', ''])('rechaza el nombre de entorno %j', async (name) => {
      const load = vi.spyOn(config.configManager, 'loadConfig');
      const client = await setup();

      const result = await client.callTool({ name: 'use_config', arguments: { name } });

      expect(result.isError).toBe(true);
      expect(load).not.toHaveBeenCalled();
    });

    it('create_config guarda, activa y no devuelve el token', async () => {
      const save = vi.spyOn(config.configManager, 'saveConfig').mockImplementation(() => undefined);
      const setCurrent = vi.spyOn(config.configManager, 'setCurrentConfig').mockReturnValue(true);
      const client = await setup({ allowCreateConfig: true });

      const result = await client.callTool({
        name: 'create_config',
        arguments: { name: 'staging', url: 'https://staging.example.com', username: 'bot', token: 'tkn-123' },
      });

      expect(save).toHaveBeenCalledWith({
        name: 'staging',
        url: 'https://staging.example.com',
        username: 'bot',
        token: 'tkn-123',
        description: undefined,
      });
      expect(setCurrent).toHaveBeenCalledWith('staging');
      expect(text(result)).not.toContain('tkn-123');
    });

    it('create_config no sobrescribe un entorno existente', async () => {
      const save = vi.spyOn(config.configManager, 'saveConfig');
      const client = await setup({ allowCreateConfig: true });

      const result = await client.callTool({
        name: 'create_config',
        arguments: { name: 'prod', url: 'https://x.example.com', username: 'u', token: 't' },
      });

      expect(result.isError).toBe(true);
      expect(save).not.toHaveBeenCalled();
    });

    it('create_config rechaza URLs que no son http(s)', async () => {
      const save = vi.spyOn(config.configManager, 'saveConfig');
      const client = await setup({ allowCreateConfig: true });

      const result = await client.callTool({
        name: 'create_config',
        arguments: { name: 'x', url: 'file:///etc/passwd', username: 'u', token: 't' },
      });

      expect(result.isError).toBe(true);
      expect(save).not.toHaveBeenCalled();
    });

    it('update_config cambia solo los campos indicados y reinicia el cliente si es el activo', async () => {
      vi.spyOn(config.configManager, 'loadConfig').mockReturnValue({
        ...jenkinsConfig,
        preferences: { editor: 'vim', logViewer: 'less' },
      });
      vi.spyOn(config.configManager, 'getCurrentConfig').mockReturnValue('prod');
      const save = vi.spyOn(config.configManager, 'saveConfig').mockImplementation(() => undefined);
      const reset = vi.spyOn(jenkinsClient, 'resetJenkinsClient');
      const client = await setup();

      const result = await client.callTool({
        name: 'update_config',
        arguments: { name: 'prod', url: 'https://new.example.com', preferences: { editor: '' } },
      });

      expect(save).toHaveBeenCalledWith({
        ...jenkinsConfig,
        url: 'https://new.example.com',
        description: undefined,
        preferences: { logViewer: 'less' },
      });
      expect(reset).toHaveBeenCalled();
      expect(text(result)).not.toContain('super-secret-token');
    });

    it('delete_config elimina el entorno y reinicia el cliente si era el activo', async () => {
      vi.spyOn(config.configManager, 'loadConfig').mockReturnValue(jenkinsConfig);
      vi.spyOn(config.configManager, 'getCurrentConfig').mockReturnValue('prod');
      const del = vi.spyOn(config.configManager, 'deleteConfig').mockReturnValue(true);
      const reset = vi.spyOn(jenkinsClient, 'resetJenkinsClient');
      const client = await setup();

      const result = await client.callTool({ name: 'delete_config', arguments: { name: 'prod' } });

      expect(del).toHaveBeenCalledWith('prod');
      expect(reset).toHaveBeenCalled();
      expect(JSON.parse(text(result)).wasActive).toBe(true);
    });
  });

  it('abort_build aborta el build indicado y resuelve "latest"', async () => {
    vi.mocked(folder.abortBuild).mockResolvedValue({ aborted: true, buildNumber: 42, message: 'ok' });
    const client = await setup();

    const byNumber = await client.callTool({ name: 'abort_build', arguments: { job: 'app/deploy', build: 42 } });
    expect(folder.abortBuild).toHaveBeenLastCalledWith('app/deploy', 42);
    expect(JSON.parse(text(byNumber))).toEqual({
      aborted: true,
      buildNumber: 42,
      message: 'Abort requested for build #42. It may take a few seconds to stop.',
    });

    await client.callTool({ name: 'abort_build', arguments: { job: 'app/deploy', build: 'latest' } });
    expect(folder.abortBuild).toHaveBeenLastCalledWith('app/deploy', 'lastBuild');
  });

  it('abort_build informa en inglés de que el build ya había terminado', async () => {
    vi.mocked(folder.abortBuild).mockResolvedValue({ aborted: false, buildNumber: 7, message: 'ya terminó' });
    const client = await setup();

    const result = await client.callTool({ name: 'abort_build', arguments: { job: 'app/deploy', build: 7 } });

    expect(result.isError).toBeFalsy();
    expect(JSON.parse(text(result))).toEqual({
      aborted: false,
      buildNumber: 7,
      message: 'Build #7 has already finished; only running builds can be aborted.',
    });
  });

  it('abort_build exige el build: nunca aborta "el último" por omisión', async () => {
    const client = await setup();

    const result = await client.callTool({ name: 'abort_build', arguments: { job: 'app/deploy' } });

    expect(result.isError).toBe(true);
    expect(folder.abortBuild).not.toHaveBeenCalled();
  });

  it('abort_build avisa de que es destructiva', async () => {
    const client = await setup();
    const tool = (await client.listTools()).tools.find((t) => t.name === 'abort_build');
    expect(tool?.annotations?.destructiveHint).toBe(true);
    expect(tool?.annotations?.readOnlyHint).toBe(false);
  });

  describe('instructions for the model', () => {
    const toolNames = async (client: Awaited<ReturnType<typeof setup>>) =>
      (await client.listTools()).tools.map((t) => t.name);

    it('the server sends instructions to the client', async () => {
      const client = await setup();
      const instructions = client.getInstructions() ?? '';

      expect(instructions).toContain('get_config');
      expect(instructions).toContain('DISABLED');
      expect(instructions).not.toContain('read-only');
      expect(instructions.length).toBeLessThan(3000);
    });

    it('only mention tools that exist', async () => {
      for (const options of [{}, { readOnly: true }, { allowCreateConfig: true }]) {
        const client = await setup(options);
        const names = await toolNames(client);
        const mentioned = (client.getInstructions() ?? '').match(/\b[a-z]+(?:_[a-z]+)+\b/g) ?? [];

        expect(mentioned.length).toBeGreaterThan(5);
        for (const tool of new Set(mentioned)) expect(names).toContain(tool);
      }
    });

    it('are written in English and ask the model to reply in the user\'s language', async () => {
      const instructions = (await setup()).getInstructions() ?? '';
      expect(instructions).toContain('Reply to the user in their language');
      expect(instructions).not.toMatch(/[áéíóúñ¿¡]/);
    });

    it('add the installation context written by the user', async () => {
      const client = await setup({ userContext: 'Deploy to pre with job "platform/deploy" (ENV=pre).' });
      const instructions = client.getInstructions() ?? '';

      expect(instructions).toContain('Installation context');
      expect(instructions).toContain('platform/deploy');
      expect(instructions.indexOf('Installation context')).toBeGreaterThan(instructions.indexOf('Disabled tools'));
    });

    it('do not add an empty installation context section', async () => {
      for (const userContext of [undefined, '', '   \n ']) {
        const client = await setup({ userContext });
        expect(client.getInstructions()).not.toContain('Installation context');
      }
    });

    it('describe the read-only mode', async () => {
      const client = await setup({ readOnly: true });
      expect(client.getInstructions()).toContain('This server is read-only');
    });

    it('only presents create_config as available when it is enabled', async () => {
      const off = (await setup()).getInstructions() ?? '';
      const on = (await setup({ allowCreateConfig: true })).getInstructions() ?? '';
      const readOnlyToo = (await setup({ readOnly: true, allowCreateConfig: true })).getInstructions() ?? '';

      expect(off).not.toContain('create_config adds');
      expect(on).toContain('create_config adds');
      expect(readOnlyToo).not.toContain('create_config adds');
    });
  });

  it('follow_build_logs devuelve el siguiente offset', async () => {
    vi.mocked(folder.getProgressiveBuildLogs).mockResolvedValue({ text: 'hola', size: 4, hasMore: true });
    const client = await setup();

    const result = await client.callTool({ name: 'follow_build_logs', arguments: { job: 'app/deploy', start: 10 } });

    expect(folder.getProgressiveBuildLogs).toHaveBeenCalledWith('app/deploy', 'lastBuild', 10);
    expect(JSON.parse(text(result))).toEqual({ text: 'hola', nextStart: 4, hasMore: true });
  });

  it('download_build_logs devuelve la ruta del fichero', async () => {
    vi.mocked(folder.downloadBuildLogs).mockResolvedValue('/home/u/.butler-ci-cli/logs/x.log');
    const client = await setup();

    const result = await client.callTool({ name: 'download_build_logs', arguments: { job: 'app/deploy', build: 7 } });

    expect(folder.downloadBuildLogs).toHaveBeenCalledWith('app/deploy', 7);
    expect(JSON.parse(text(result))).toEqual({ path: '/home/u/.butler-ci-cli/logs/x.log' });
  });
});
