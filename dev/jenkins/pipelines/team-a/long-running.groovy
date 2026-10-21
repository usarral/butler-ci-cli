// Runs for about two minutes: useful to try `jobs abort` and `jobs logs --stream`.
pipeline {
  agent any
  stages {
    stage('Warm up') {
      steps {
        echo 'Starting a long task...'
        sleep 5
      }
    }
    stage('Crunch') {
      steps {
        script {
          for (int i = 1; i <= 50; i++) {
            echo "Step ${i}/50"
            sleep 2
          }
        }
      }
    }
  }
}
