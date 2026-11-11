import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Command } from 'commander';
import * as config from '../src/utils/config';
import * as storage from '../src/utils/storage';
import { complete, jobCandidates, completionScript } from '../src/utils/completion';
import { createDeprecatedAlias } from '../src/utils/deprecatedCommands';

const JOBS: Record<string, string[]> = {
  pro: ['backend/api', 'backend/web ui', 'backend/db/migrate', 'deploy-prod'],
  dev: ['only-dev-job'],
};

function buildProgram(): Command {
  const program = new Command();
  program.option('--debug');
  const jobs = program.command('jobs');
  jobs.command('info').argument('<jobName>');
  jobs.command('build').argument('<jobName>').option('--params <params>');
  jobs.command('batch').argument('[jobs...]').option('-f, --file <path>');
  const cfg = program.command('config');
  cfg.command('use').argument('<name>');
  createDeprecatedAlias(program, 'job-info', 'jobs info', () => {}, { args: [{ name: '<jobName>', description: '' }] });
  return program;
}

describe('completion', () => {
  let active = 'pro';

  beforeEach(() => {
    active = 'pro';
    vi.spyOn(config, 'getJenkinsConfig').mockImplementation(
      () => ({ name: active, url: 'http://x', username: 'u', token: 't' })
    );
    vi.spyOn(storage, 'loadJobs').mockImplementation(env => JOBS[env] ?? []);
    vi.spyOn(config.configManager, 'listConfigs').mockReturnValue(['pro', 'dev']);
  });

  it('completes subcommands and hides deprecated aliases', () => {
    const top = complete(buildProgram(), [''], 'bash');
    expect(top).toEqual(expect.arrayContaining(['jobs', 'config']));
    expect(top).not.toContain('job-info');
    expect(complete(buildProgram(), ['jobs', 'b'], 'bash')).toEqual(['build', 'batch']);
  });

  it('completes job names of the ACTIVE environment, folder by folder', () => {
    expect(complete(buildProgram(), ['jobs', 'build', ''], 'bash')).toEqual(['backend/', 'deploy-prod']);
    active = 'dev';
    expect(complete(buildProgram(), ['jobs', 'build', ''], 'bash')).toEqual(['only-dev-job']);
  });

  it('completes inside a folder and escapes spaces for bash only', () => {
    const words = ['jobs', 'build', 'backend/'];
    expect(complete(buildProgram(), words, 'bash')).toEqual(['backend/api', 'backend/db/', 'backend/web\\ ui']);
    expect(complete(buildProgram(), words, 'zsh')).toContain('backend/web ui');
  });

  it('understands what the user already typed (escaped spaces, quotes)', () => {
    expect(complete(buildProgram(), ['jobs', 'build', 'backend/web\\ u'], 'bash')).toEqual(['backend/web\\ ui']);
    expect(complete(buildProgram(), ['jobs', 'build', "'backend/web"], 'bash')).toEqual(['backend/web ui']);
  });

  it('completes variadic job arguments after the first one', () => {
    expect(complete(buildProgram(), ['jobs', 'batch', 'deploy-prod', 'd'], 'bash')).toEqual(['deploy-prod']);
  });

  it('completes options, and leaves option values to the shell', () => {
    expect(complete(buildProgram(), ['jobs', 'build', '--p'], 'bash')).toEqual(['--params']);
    expect(complete(buildProgram(), ['jobs', 'build', '--params', ''], 'bash')).toEqual([]);
    // tras el valor de la opción, vuelve a completar el job
    expect(complete(buildProgram(), ['jobs', 'build', '--params', 'x', 'dep'], 'bash')).toEqual(['deploy-prod']);
  });

  it('completes environment names for config use', () => {
    expect(complete(buildProgram(), ['config', 'use', ''], 'bash')).toEqual(['dev', 'pro']);
  });

  it('offers nothing for job names when the environment has no cache', () => {
    active = 'unknown';
    expect(complete(buildProgram(), ['jobs', 'build', ''], 'bash')).toEqual([]);
  });

  it('jobCandidates lists a folder only once', () => {
    expect(jobCandidates(['a/x', 'a/y', 'a/b/z', 'c'], '')).toEqual(['a/', 'c']);
  });

  it('generates a script for every supported shell', () => {
    expect(completionScript('bash')).toContain('complete -o default -F _butler_ci_cli butler-ci-cli');
    expect(completionScript('zsh')).toContain('compdef _butler_ci_cli butler-ci-cli');
    expect(completionScript('fish')).toContain('complete -c butler-ci-cli');
  });
});
