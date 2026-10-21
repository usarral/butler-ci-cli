# Local Jenkins for development

A disposable Jenkins (LTS, JDK 21) run with podman, preloaded with sample pipelines, so butler-ci-cli can be tried against a real server instead of mocks. **Development only**: fixed credentials, bound to `127.0.0.1`.

```bash
dev/jenkins/jenkins.sh up      # build the image if needed, start Jenkins and wait until it is ready
dev/jenkins/jenkins.sh seed    # run a few builds (successful, unstable, failed) so there is history
```

Then point butler-ci-cli at it (`butler-ci-cli config create`):

| Field    | Value                                  |
| -------- | -------------------------------------- |
| URL      | `http://127.0.0.1:8088`                |
| User     | `admin`                                |
| Token    | `11aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`   |

The web UI accepts `admin` / `admin`. Use the API token with the CLI: Jenkins rejects POST requests authenticated with a password unless a CSRF crumb is sent, which butler-ci-cli does not do.

## Commands

| Command                                  | What it does                                                   |
| ---------------------------------------- | -------------------------------------------------------------- |
| `jenkins.sh up`                          | Start (creating it the first time) and wait until ready        |
| `jenkins.sh seed`                        | Trigger the sample builds                                      |
| `jenkins.sh trigger <job> [KEY=VALUE..]` | Trigger one job, optionally with parameters                    |
| `jenkins.sh down`                        | Stop and remove the container, keeping the data volume         |
| `jenkins.sh reset`                       | Remove the container **and** the data volume (jobs, history)   |
| `jenkins.sh build`                       | Rebuild the image (after changing plugins or the init script)  |
| `jenkins.sh logs` / `info`               | Follow the container log / print the connection details        |

`BUTLER_DEV_PORT`, `BUTLER_DEV_USER`, `BUTLER_DEV_PASSWORD`, `BUTLER_DEV_TOKEN`, `BUTLER_DEV_CONTAINER`, `BUTLER_DEV_IMAGE` and `BUTLER_DEV_VOLUME` override the defaults.

## Sample jobs

Every `pipelines/**/<name>.groovy` becomes a Pipeline job at the same path on first start (folders are created as needed). Jobs that already exist are left alone, so edit them in Jenkins or run `jenkins.sh reset` after changing the files.

| Job                              | Purpose                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| `hello-world`                    | Four stages, no parameters                                                           |
| `parametrized-build`             | `string`, `choice`, `boolean`, `password` and `text` parameters; fails if `ENVIRONMENT=production` without `RUN_TESTS` |
| `flaky`                          | `OUTCOME` parameter to produce a successful, unstable or failed build on demand      |
| `team-a/long-running`            | About two minutes long: try `jobs abort` and `jobs logs --stream`                    |
| `team-a/backend/deploy-service`  | Job inside nested folders, with parameters                                           |

A declarative pipeline only registers its parameters after its first run, so the first run of a parameterized job uses the defaults (`seed` takes care of it).

## Notes

- The image and the plugins (`plugins.txt`) are not pinned to exact versions; this is a throwaway dev tool.
- `init.groovy.d/10-setup.groovy.override` creates the admin user and its API token, creates the jobs, and is copied over the one in the data volume on every start.
