import { describe, it, expect, beforeEach, vi } from 'vitest';
import inquirer from 'inquirer';
import { abort } from '../src/commands/abort';
import * as folder from '../src/utils/jenkinsFolder';
import { logger } from '../src/utils/logger';

vi.mock('inquirer', () => ({ default: { prompt: vi.fn() } }));
vi.mock('../src/utils/jenkinsFolder');

const runningBuild = { number: 50, url: 'u', result: null, timestamp: 0, duration: 0, building: true };
const finishedBuild = { ...runningBuild, number: 42, result: 'SUCCESS', building: false };

describe('abort command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(folder.abortBuild).mockResolvedValue({ aborted: true, buildNumber: 50, message: 'solicitado' });
  });

  it('pide confirmación y aborta si el usuario acepta', async () => {
    vi.mocked(folder.getBuildInfo).mockResolvedValue(runningBuild);
    vi.mocked(inquirer.prompt).mockResolvedValue({ confirm: true });

    await abort('app/deploy', '50', {});

    expect(inquirer.prompt).toHaveBeenCalledTimes(1);
    expect(folder.abortBuild).toHaveBeenCalledWith('app/deploy', 50);
  });

  it('no aborta si el usuario rechaza la confirmación', async () => {
    vi.mocked(folder.getBuildInfo).mockResolvedValue(runningBuild);
    vi.mocked(inquirer.prompt).mockResolvedValue({ confirm: false });

    await abort('app/deploy', '50', {});

    expect(folder.abortBuild).not.toHaveBeenCalled();
  });

  it('con --yes aborta sin preguntar', async () => {
    vi.mocked(folder.getBuildInfo).mockResolvedValue(runningBuild);

    await abort('app/deploy', '50', { yes: true });

    expect(inquirer.prompt).not.toHaveBeenCalled();
    expect(folder.abortBuild).toHaveBeenCalledWith('app/deploy', 50);
  });

  it('resuelve "latest" al último build', async () => {
    vi.mocked(folder.getBuildInfo).mockResolvedValue(runningBuild);

    await abort('app/deploy', 'LATEST', { yes: true });

    expect(folder.getBuildInfo).toHaveBeenCalledWith('app/deploy', 'lastBuild');
  });

  it('avisa y no pregunta si el build ya terminó', async () => {
    vi.mocked(folder.getBuildInfo).mockResolvedValue(finishedBuild);

    await abort('app/deploy', '42', {});

    expect(inquirer.prompt).not.toHaveBeenCalled();
    expect(folder.abortBuild).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('SUCCESS'));
  });

  it('sale con error si Jenkins falla', async () => {
    vi.mocked(folder.getBuildInfo).mockRejectedValue(new Error('boom'));
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await abort('app/deploy', '50', { yes: true });

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
    expect(exit).toHaveBeenCalledWith(1);
  });
});
