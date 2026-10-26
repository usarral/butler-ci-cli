// Pauses at an input step, without holding an executor, until someone approves or aborts it.
pipeline {
  agent none
  stages {
    stage('Deploy staging') {
      agent any
      steps {
        echo 'Deploying to staging...'
        sleep 2
      }
    }
    stage('Approval') {
      input {
        message 'Promote to production?'
        ok 'Promote'
      }
      steps {
        echo 'Approved'
      }
    }
    stage('Promote') {
      agent any
      steps {
        echo 'Promoting to production...'
        sleep 2
      }
    }
  }
}
