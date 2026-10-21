pipeline {
  agent any
  parameters {
    string(name: 'SERVICE', defaultValue: 'billing', description: 'Service to deploy')
    choice(name: 'REGION', choices: ['eu-west-1', 'us-east-1'], description: 'Region')
  }
  stages {
    stage('Package') {
      steps {
        echo "Packaging ${params.SERVICE}"
        sleep 2
      }
    }
    stage('Deploy') {
      steps {
        echo "Deploying ${params.SERVICE} to ${params.REGION}"
        sleep 3
      }
    }
  }
}
