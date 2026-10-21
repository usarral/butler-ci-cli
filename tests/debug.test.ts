import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import {
  attachDebugInterceptors,
  bodyExcerpt,
  debugVerdict,
  diagnoseError,
  enableDebug,
  getDebugStats,
  isTruthyFlag,
  resetDebugStats,
} from '../src/utils/debug';

const ANSI = /\u001B\[[0-9;]*m/g;

describe('isTruthyFlag', () => {
  it('treats empty, 0, false, no and off as disabled', () => {
    for (const v of [undefined, '', '0', 'false', 'No', 'OFF', ' 0 ']) expect(isTruthyFlag(v)).toBe(false);
    for (const v of ['1', 'true', 'yes', 'on']) expect(isTruthyFlag(v)).toBe(true);
  });
});

describe('diagnoseError', () => {
  it('classifies network errors with a hint', () => {
    const d = diagnoseError({ code: 'ECONNREFUSED', message: 'connect ECONNREFUSED 127.0.0.1:8080', request: {} });
    expect(d.kind).toBe('network');
    expect(d.hint).toContain('Is Jenkins running');
    expect(diagnoseError({ code: 'ENOTFOUND', message: 'x' }).hint).toContain('could not be resolved');
    expect(diagnoseError({ code: 'ETIMEDOUT', message: 'x' }).hint).toContain('timed out');
  });

  it('recognises TLS problems', () => {
    const d = diagnoseError({ code: 'DEPTH_ZERO_SELF_SIGNED_CERT', message: 'self-signed certificate' });
    expect(d.kind).toBe('network');
    expect(d.hint).toContain('NODE_EXTRA_CA_CERTS');
  });

  it('classifies HTTP errors by status', () => {
    const http = (status: number) => diagnoseError({ response: { status, statusText: 'x' } });
    expect(http(401).hint).toContain('credentials');
    expect(http(403).hint).toContain('crumb');
    expect(http(404).hint).toContain('context path');
    expect(http(503).hint).toContain('proxy');
    expect(http(404).kind).toBe('http');
  });

  it('flags errors that are not an HTTP exchange', () => {
    const d = diagnoseError(new Error('boom'));
    expect(d.kind).toBe('other');
    expect(d.summary).toBe('boom');
  });
});

describe('bodyExcerpt', () => {
  it('drops tags and scripts, collapses whitespace and truncates', () => {
    expect(bodyExcerpt('<html><script>alert(1)</script><h1>Oops</h1>\n  <p>Not   Found</p></html>')).toBe('Oops Not Found');
    expect(bodyExcerpt('a'.repeat(400), 10)).toBe('aaaaaaaaaa…');
    expect(bodyExcerpt(undefined)).toBe('');
    expect(bodyExcerpt({ message: 'Unauthorized' })).toContain('Unauthorized');
  });
});

describe('debugVerdict', () => {
  const verdict = (stats: Partial<{ requests: number; failed: number; unexpected: number }>, errors: number) =>
    debugVerdict({ requests: 0, failed: 0, unexpected: 0, ...stats }, errors).join('\n');

  it('blames Jenkins/network when a request failed and the command errored', () => {
    expect(verdict({ requests: 2, failed: 1 }, 1)).toContain('Jenkins/network side');
  });

  it('says nothing reached Jenkins when the command failed before any request', () => {
    expect(verdict({}, 1)).toContain('before sending any request');
  });

  it('blames the CLI when all requests succeeded but the command errored', () => {
    expect(verdict({ requests: 3 }, 1)).toContain('in the CLI');
  });

  it('flags unexpected (non-JSON) answers', () => {
    expect(verdict({ requests: 1, unexpected: 1 }, 0)).toContain('did not answer with the expected JSON');
  });

  it('reports a clean run', () => {
    expect(verdict({ requests: 2 }, 0)).toContain('no errors');
  });
});

describe('attachDebugInterceptors', () => {
  let client: AxiosInstance;
  let mock: MockAdapter;
  let output: string;
  let write: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    enableDebug();
    resetDebugStats();
    output = '';
    write = vi.spyOn(process.stderr, 'write').mockImplementation(((chunk: string) => {
      output += String(chunk).replace(ANSI, '');
      return true;
    }) as never);
    client = axios.create({ baseURL: 'http://jenkins.test', auth: { username: 'admin', password: 'S3CRET-TOKEN' } });
    attachDebugInterceptors(client);
    mock = new MockAdapter(client);
  });

  afterEach(() => {
    write.mockRestore();
  });

  it('logs request and response and counts them', async () => {
    mock.onGet('/api/json').reply(200, { jobs: [] }, { 'x-jenkins': '2.580.1', 'content-type': 'application/json' });
    await client.get('/api/json');
    expect(output).toContain('→ GET http://jenkins.test/api/json');
    expect(output).toContain('← 200');
    expect(output).toContain('Jenkins 2.580.1');
    expect(getDebugStats()).toMatchObject({ requests: 1, failed: 0, unexpected: 0 });
  });

  it('logs failures with the diagnosis and the response body, and still rejects', async () => {
    mock.onGet('/job/nope/api/json').reply(404, '<html><body>Oops! Not Found</body></html>');
    await expect(client.get('/job/nope/api/json')).rejects.toBeDefined();
    expect(output).toContain('✗ HTTP 404');
    expect(output).toContain('context path');
    expect(output).toContain('Oops! Not Found');
    expect(getDebugStats().failed).toBe(1);
  });

  it('logs network failures', async () => {
    mock.onGet('/api/json').networkError();
    await expect(client.get('/api/json')).rejects.toBeDefined();
    expect(output).toContain('✗');
    expect(getDebugStats().failed).toBe(1);
  });

  it('warns when HTML comes back where JSON was expected', async () => {
    mock.onGet('/api/json').reply(200, '<html>login</html>', { 'content-type': 'text/html' });
    await client.get('/api/json');
    expect(output).toContain('expected JSON but got HTML');
    expect(getDebugStats().unexpected).toBe(1);
  });

  it('prints form field names but never their values, nor the credentials', async () => {
    mock.onPost('/job/x/buildWithParameters').reply(201);
    await client.post('/job/x/buildWithParameters', new URLSearchParams({ BRANCH: 'secret-branch', DEPLOY_TOKEN: 'hunter2' }));
    expect(output).toContain('form fields: BRANCH, DEPLOY_TOKEN');
    for (const secret of ['secret-branch', 'hunter2', 'S3CRET-TOKEN', 'admin:']) expect(output).not.toContain(secret);
  });
});
