pipeline {
  agent any
  parameters {
    choice(name: 'OUTCOME', choices: ['success', 'unstable', 'failure'], description: 'Result this build should produce')
  }
  stages {
    stage('Work') {
      steps {
        echo 'Doing some work...'
        sleep 2
      }
    }
    stage('Outcome') {
      steps {
        script {
          if (params.OUTCOME == 'failure') {
            error('Simulated failure')
          }
          if (params.OUTCOME == 'unstable') {
            unstable('Simulated unstable build')
          }
        }
      }
    }
  }
}
