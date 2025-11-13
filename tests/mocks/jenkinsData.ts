/**
 * Mock data basado en la documentación oficial de Jenkins API
 * https://www.jenkins.io/doc/book/using/remote-access-api/
 */

export const mockJenkinsRootResponse = {
  _class: 'hudson.model.Hudson',
  assignedLabels: [{}],
  mode: 'NORMAL',
  nodeDescription: 'the master Jenkins node',
  nodeName: '',
  numExecutors: 2,
  description: null,
  jobs: [
    {
      _class: 'hudson.model.FreeStyleProject',
      name: 'test-job-1',
      url: 'http://localhost:8080/job/test-job-1/',
      color: 'blue',
    },
    {
      _class: 'com.cloudbees.hudson.plugins.folder.Folder',
      name: 'backend',
      url: 'http://localhost:8080/job/backend/',
    },
    {
      _class: 'hudson.model.FreeStyleProject',
      name: 'frontend-build',
      url: 'http://localhost:8080/job/frontend-build/',
      color: 'red',
    },
  ],
  primaryView: {
    _class: 'hudson.model.AllView',
    name: 'all',
    url: 'http://localhost:8080/',
  },
  slaveAgentPort: 50000,
  useCrumbs: true,
  useSecurity: true,
  views: [
    {
      _class: 'hudson.model.AllView',
      name: 'all',
      url: 'http://localhost:8080/',
    },
  ],
};

export const mockFolderResponse = {
  _class: 'com.cloudbees.hudson.plugins.folder.Folder',
  name: 'backend',
  url: 'http://localhost:8080/job/backend/',
  jobs: [
    {
      _class: 'hudson.model.FreeStyleProject',
      name: 'api-service',
      url: 'http://localhost:8080/job/backend/job/api-service/',
      color: 'blue',
    },
    {
      _class: 'org.jenkinsci.plugins.workflow.job.WorkflowJob',
      name: 'database-migration',
      url: 'http://localhost:8080/job/backend/job/database-migration/',
      color: 'yellow',
    },
  ],
};

export const mockJobInfoResponse = {
  _class: 'hudson.model.FreeStyleProject',
  name: 'test-job-1',
  url: 'http://localhost:8080/job/test-job-1/',
  description: 'Test job for unit testing',
  displayName: 'Test Job 1',
  fullName: 'test-job-1',
  buildable: true,
  color: 'blue',
  healthReport: [
    {
      description: 'Build stability: No recent builds failed.',
      iconClassName: 'icon-health-80plus',
      iconUrl: 'health-80plus.png',
      score: 100,
    },
  ],
  inQueue: false,
  keepDependencies: false,
  lastBuild: {
    _class: 'hudson.model.FreeStyleBuild',
    number: 42,
    url: 'http://localhost:8080/job/test-job-1/42/',
  },
  lastCompletedBuild: {
    _class: 'hudson.model.FreeStyleBuild',
    number: 42,
    url: 'http://localhost:8080/job/test-job-1/42/',
  },
  lastFailedBuild: {
    _class: 'hudson.model.FreeStyleBuild',
    number: 35,
    url: 'http://localhost:8080/job/test-job-1/35/',
  },
  lastStableBuild: {
    _class: 'hudson.model.FreeStyleBuild',
    number: 42,
    url: 'http://localhost:8080/job/test-job-1/42/',
  },
  lastSuccessfulBuild: {
    _class: 'hudson.model.FreeStyleBuild',
    number: 42,
    url: 'http://localhost:8080/job/test-job-1/42/',
  },
  lastUnstableBuild: null,
  lastUnsuccessfulBuild: {
    _class: 'hudson.model.FreeStyleBuild',
    number: 35,
    url: 'http://localhost:8080/job/test-job-1/35/',
  },
  nextBuildNumber: 43,
  property: [
    {
      _class: 'hudson.model.ParametersDefinitionProperty',
      parameterDefinitions: [
        {
          _class: 'hudson.model.StringParameterDefinition',
          name: 'ENVIRONMENT',
          description: 'Environment to deploy to',
          defaultParameterValue: {
            _class: 'hudson.model.StringParameterValue',
            name: 'ENVIRONMENT',
            value: 'staging',
          },
          type: 'StringParameterDefinition',
        },
        {
          _class: 'hudson.model.BooleanParameterDefinition',
          name: 'RUN_TESTS',
          description: 'Run tests before deployment',
          defaultParameterValue: {
            _class: 'hudson.model.BooleanParameterValue',
            name: 'RUN_TESTS',
            value: true,
          },
          type: 'BooleanParameterDefinition',
        },
        {
          _class: 'hudson.model.ChoiceParameterDefinition',
          name: 'VERSION',
          description: 'Version to deploy',
          choices: ['1.0.0', '1.1.0', '2.0.0'],
          defaultParameterValue: {
            _class: 'hudson.model.StringParameterValue',
            name: 'VERSION',
            value: '1.1.0',
          },
          type: 'ChoiceParameterDefinition',
        },
      ],
    },
  ],
  queueItem: null,
  concurrentBuild: false,
  disabled: false,
  downstreamProjects: [],
  labelExpression: null,
  scm: {
    _class: 'hudson.plugins.git.GitSCM',
  },
  upstreamProjects: [],
};

export const mockBuildInfoResponse = {
  _class: 'hudson.model.FreeStyleBuild',
  number: 42,
  url: 'http://localhost:8080/job/test-job-1/42/',
  displayName: '#42',
  fullDisplayName: 'test-job-1 #42',
  description: null,
  building: false,
  duration: 45620,
  estimatedDuration: 43000,
  executor: null,
  result: 'SUCCESS',
  timestamp: 1698768000000,
  builtOn: '',
  changeSet: {
    _class: 'hudson.plugins.git.GitChangeSetList',
    items: [],
    kind: 'git',
  },
  culprits: [],
  id: '42',
  keepLog: false,
  queueId: 156,
  actions: [
    {
      _class: 'hudson.model.ParametersAction',
      parameters: [
        {
          _class: 'hudson.model.StringParameterValue',
          name: 'ENVIRONMENT',
          value: 'production',
        },
        {
          _class: 'hudson.model.BooleanParameterValue',
          name: 'RUN_TESTS',
          value: true,
        },
      ],
    },
    {
      _class: 'hudson.model.CauseAction',
      causes: [
        {
          _class: 'hudson.model.Cause$UserIdCause',
          shortDescription: 'Started by user admin',
          userId: 'admin',
          userName: 'Administrator',
        },
      ],
    },
  ],
};

export const mockBuildQueueResponse = {
  _class: 'hudson.model.Queue$LeftItem',
  id: 157,
  inQueueSince: 1698768100000,
  params: 'ENVIRONMENT=staging&RUN_TESTS=true',
  stuck: false,
  task: {
    _class: 'hudson.model.FreeStyleProject',
    name: 'test-job-1',
    url: 'http://localhost:8080/job/test-job-1/',
    color: 'blue_anime',
  },
  url: 'queue/item/157/',
  why: 'In the quiet period. Expires in 4.8 sec',
  buildableStartMilliseconds: 1698768105000,
  executable: {
    _class: 'hudson.model.FreeStyleBuild',
    number: 43,
    url: 'http://localhost:8080/job/test-job-1/43/',
  },
};

export const mockConsoleLogOutput = `Started by user admin
Building in workspace /var/jenkins_home/workspace/test-job-1
[test-job-1] $ /bin/sh -xe /tmp/jenkins123.sh
+ echo 'Starting deployment to staging'
Starting deployment to staging
+ npm install
added 234 packages in 12s
+ npm run build
> test-app@1.0.0 build
> tsc && webpack

Hash: 123abc456def
Version: webpack 5.88.0
Time: 3456ms
Built at: 10/31/2025 10:30:45 AM
+ npm run test
> test-app@1.0.0 test
> jest

PASS  tests/unit/app.test.ts
PASS  tests/integration/api.test.ts

Test Suites: 2 passed, 2 total
Tests:       15 passed, 15 total
Snapshots:   0 total
Time:        4.567 s
Ran all test suites.
+ echo 'Deployment completed successfully'
Deployment completed successfully
Finished: SUCCESS`;

export const mockJobWithoutParams = {
  ...mockJobInfoResponse,
  property: [],
};

export const mockPipelineJob = {
  _class: 'org.jenkinsci.plugins.workflow.job.WorkflowJob',
  name: 'pipeline-test',
  url: 'http://localhost:8080/job/pipeline-test/',
  description: 'Test pipeline job',
  displayName: 'Pipeline Test',
  fullName: 'pipeline-test',
  buildable: true,
  color: 'blue',
  lastBuild: {
    _class: 'org.jenkinsci.plugins.workflow.job.WorkflowRun',
    number: 10,
    url: 'http://localhost:8080/job/pipeline-test/10/',
  },
};

export const mockMultiBranchPipeline = {
  _class: 'org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject',
  name: 'multi-branch-pipeline',
  url: 'http://localhost:8080/job/multi-branch-pipeline/',
  jobs: [
    {
      _class: 'org.jenkinsci.plugins.workflow.job.WorkflowJob',
      name: 'main',
      url: 'http://localhost:8080/job/multi-branch-pipeline/job/main/',
      color: 'blue',
    },
    {
      _class: 'org.jenkinsci.plugins.workflow.job.WorkflowJob',
      name: 'develop',
      url: 'http://localhost:8080/job/multi-branch-pipeline/job/develop/',
      color: 'yellow',
    },
  ],
};

export const mockFailedBuildResponse = {
  ...mockBuildInfoResponse,
  number: 35,
  url: 'http://localhost:8080/job/test-job-1/35/',
  result: 'FAILURE',
  duration: 12340,
  actions: [
    {
      _class: 'hudson.model.CauseAction',
      causes: [
        {
          _class: 'hudson.model.Cause$SCMTriggerCause',
          shortDescription: 'Started by an SCM change',
        },
      ],
    },
  ],
};

export const mockAbortedBuildResponse = {
  ...mockBuildInfoResponse,
  number: 38,
  url: 'http://localhost:8080/job/test-job-1/38/',
  result: 'ABORTED',
  duration: 5670,
  actions: [
    {
      _class: 'hudson.model.CauseAction',
      causes: [
        {
          _class: 'hudson.model.Cause$UserIdCause',
          shortDescription: 'Started by user admin',
          userId: 'admin',
          userName: 'Administrator',
        },
      ],
    },
  ],
};

export const mockRunningBuildResponse = {
  ...mockBuildInfoResponse,
  number: 50,
  url: 'http://localhost:8080/job/test-job-1/50/',
  result: null,
  building: true,
  duration: 0,
  estimatedDuration: 45000,
};

export const mockBuildsListResponse = {
  _class: 'hudson.model.FreeStyleProject',
  name: 'test-job-1',
  url: 'http://localhost:8080/job/test-job-1/',
  builds: [
    {
      number: 45,
      url: 'http://localhost:8080/job/test-job-1/45/',
      result: 'SUCCESS',
      timestamp: 1698768300000,
      duration: 48000,
      building: false,
      displayName: '#45',
      fullDisplayName: 'test-job-1 #45',
      description: null,
    },
    {
      number: 44,
      url: 'http://localhost:8080/job/test-job-1/44/',
      result: 'FAILURE',
      timestamp: 1698768200000,
      duration: 35000,
      building: false,
      displayName: '#44',
      fullDisplayName: 'test-job-1 #44',
      description: null,
    },
    {
      number: 43,
      url: 'http://localhost:8080/job/test-job-1/43/',
      result: 'SUCCESS',
      timestamp: 1698768100000,
      duration: 42000,
      building: false,
      displayName: '#43',
      fullDisplayName: 'test-job-1 #43',
      description: null,
    },
    {
      number: 42,
      url: 'http://localhost:8080/job/test-job-1/42/',
      result: 'SUCCESS',
      timestamp: 1698768000000,
      duration: 45620,
      building: false,
      displayName: '#42',
      fullDisplayName: 'test-job-1 #42',
      description: null,
    },
    {
      number: 41,
      url: 'http://localhost:8080/job/test-job-1/41/',
      result: 'UNSTABLE',
      timestamp: 1698767900000,
      duration: 40000,
      building: false,
      displayName: '#41',
      fullDisplayName: 'test-job-1 #41',
      description: null,
    },
    {
      number: 40,
      url: 'http://localhost:8080/job/test-job-1/40/',
      result: 'ABORTED',
      timestamp: 1698767800000,
      duration: 10000,
      building: false,
      displayName: '#40',
      fullDisplayName: 'test-job-1 #40',
      description: null,
    },
  ],
};
