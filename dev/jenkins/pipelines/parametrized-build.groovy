pipeline {
  agent any
  parameters {
    string(name: 'BRANCH', defaultValue: 'main', description: 'Branch to build')
    choice(name: 'ENVIRONMENT', choices: ['dev', 'staging', 'production'], description: 'Target environment')
    booleanParam(name: 'RUN_TESTS', defaultValue: true, description: 'Run the test suite')
    password(name: 'DEPLOY_TOKEN', defaultValue: '', description: 'Deployment token (optional)')
    text(name: 'NOTES', defaultValue: '', description: 'Release notes')
  }
  stages {
    stage('Info') {
      steps {
        echo "Building ${params.BRANCH} for ${params.ENVIRONMENT}"
      }
    }
    stage('Test') {
      when { expression { params.RUN_TESTS } }
      steps {
        echo 'Running tests...'
        sleep 2
      }
    }
    stage('Deploy') {
      steps {
        script {
          if (params.ENVIRONMENT == 'production' && !params.RUN_TESTS) {
            error('Refusing to deploy to production without running the tests')
          }
        }
        echo "Deployed to ${params.ENVIRONMENT}"
      }
    }
  }
}
