import { describe, it, expect, beforeEach, vi } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import { getWorkflowSteps } from '../src/utils/jenkinsFolder';
import * as config from '../src/utils/config';

describe('Job Steps - getWorkflowSteps', () => {
  let mockAxios: MockAdapter;

  beforeEach(() => {
    vi.resetModules();
    mockAxios = new MockAdapter(axios);
    vi.clearAllMocks();
    
    // Mock de configuración
    vi.spyOn(config, 'getJenkinsConfig').mockReturnValue({
      name: 'test',
      url: 'http://localhost:8080',
      username: 'admin',
      token: 'test-token',
    });
  });

  it('should retrieve workflow steps using wfapi', async () => {
    const mockWfapiResponse = {
      id: '1',
      name: 'test-job #42',
      status: 'SUCCESS',
      startTimeMillis: 1698768000000,
      durationMillis: 45620,
      stages: [
        {
          id: 'stage-1',
          name: 'Build',
          status: 'SUCCESS',
          startTimeMillis: 1698768000000,
          durationMillis: 15000,
          stageFlowNodes: [
            {
              id: 'step-1',
              name: 'npm install',
              status: 'SUCCESS',
              startTimeMillis: 1698768000000,
              durationMillis: 5000,
            },
            {
              id: 'step-2',
              name: 'npm run build',
              status: 'SUCCESS',
              startTimeMillis: 1698768005000,
              durationMillis: 10000,
            },
          ],
        },
        {
          id: 'stage-2',
          name: 'Test',
          status: 'SUCCESS',
          startTimeMillis: 1698768015000,
          durationMillis: 20000,
          stageFlowNodes: [
            {
              id: 'step-3',
              name: 'npm test',
              status: 'SUCCESS',
              startTimeMillis: 1698768015000,
              durationMillis: 20000,
            },
          ],
        },
        {
          id: 'stage-3',
          name: 'Deploy',
          status: 'SUCCESS',
          startTimeMillis: 1698768035000,
          durationMillis: 10620,
          stageFlowNodes: [],
        },
      ],
    };

    mockAxios
      .onGet('http://localhost:8080/job/test-job/42/wfapi/describe')
      .reply(200, mockWfapiResponse);

    const stages = await getWorkflowSteps('test-job', 42);

    expect(stages).toHaveLength(3);
    expect(stages[0].name).toBe('Build');
    expect(stages[0].status).toBe('SUCCESS');
    expect(stages[0].stageFlowNodes).toHaveLength(2);
    expect(stages[0].stageFlowNodes![0].name).toBe('npm install');
    expect(stages[1].name).toBe('Test');
    expect(stages[1].stageFlowNodes).toHaveLength(1);
    expect(stages[2].name).toBe('Deploy');
    expect(stages[2].stageFlowNodes).toHaveLength(0);
  });

});
