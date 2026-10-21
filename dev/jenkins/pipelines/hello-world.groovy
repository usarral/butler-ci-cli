pipeline {
  agent any
  stages {
    stage('Checkout') {
      steps {
        echo 'Fetching sources...'
        sleep 2
      }
    }
    stage('Build') {
      steps {
        echo 'Compiling...'
        sleep 3
      }
    }
    stage('Test') {
      steps {
        echo 'Running tests...'
        sleep 3
      }
    }
    stage('Deploy') {
      steps {
        echo 'Deploying...'
        sleep 2
      }
    }
  }
}
