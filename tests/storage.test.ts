import { describe, it, expect, beforeEach, vi } from 'vitest';
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { saveJobs, loadJobs, loadJobsCache, deleteJobs } from '../src/utils/storage';

vi.mock('node:fs');

describe('Jobs cache (per environment)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saves each environment in its own file under ~/.butler-ci-cli/jobs', () => {
    saveJobs('pro', ['a', 'b/c']);
    saveJobs('dev', ['x']);

    const files = vi.mocked(writeFileSync).mock.calls.map(c => String(c[0]));
    expect(files[0]).toMatch(/\.butler-ci-cli[\\/]jobs[\\/]pro\.json$/);
    expect(files[1]).toMatch(/\.butler-ci-cli[\\/]jobs[\\/]dev\.json$/);
    expect(mkdirSync).toHaveBeenCalledWith(expect.stringContaining('jobs'), { recursive: true });

    const saved = JSON.parse(String(vi.mocked(writeFileSync).mock.calls[0][1]));
    expect(saved).toMatchObject({ environment: 'pro', jobs: ['a', 'b/c'] });
    expect(saved.fetchedAt).toBeTruthy();
  });

  it('loads the jobs of an environment', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ fetchedAt: 't', jobs: ['a', 'b'] }));
    expect(loadJobs('pro')).toEqual(['a', 'b']);
  });

  it('returns empty / null when there is no cache or it is corrupt', () => {
    vi.mocked(existsSync).mockReturnValue(false);
    expect(loadJobs('pro')).toEqual([]);
    expect(loadJobsCache('pro')).toBeNull();

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue('{not json');
    expect(loadJobsCache('pro')).toBeNull();

    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ jobs: 'nope' }));
    expect(loadJobsCache('pro')).toBeNull();
  });

  it('deletes the cache of an environment and never throws', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    deleteJobs('pro');
    expect(unlinkSync).toHaveBeenCalledWith(expect.stringMatching(/pro\.json$/));

    vi.mocked(unlinkSync).mockImplementation(() => { throw new Error('EPERM'); });
    expect(() => deleteJobs('pro')).not.toThrow();
  });
});
