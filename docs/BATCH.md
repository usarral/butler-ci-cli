# Running several jobs with `jobs batch`

`jobs batch` launches a list of jobs while keeping at most N of them "in flight". A build stays in flight until it reaches a **target state**; then its slot is freed and the next job in the list is launched. When every job has reached the target, the command exits (code `0` if all of them did, `1` otherwise).

All the names below (`app/...`, `staging`) are placeholders: use your own jobs.

## Target states

| `--until` | The slot is freed when... |
| --- | --- |
| `started` | the build leaves the queue and starts running |
| `finished` (default) | the build ends, whatever its result |
| `success` | the build ends with `SUCCESS` |
| `paused` | the build stops at an `input` step waiting for approval |
| `stage:<name>` | the stage `<name>` ends with `SUCCESS`, even if the build keeps running |

A build that can no longer reach the target (it ended as `FAILURE` while waiting for `success`, finished without ever pausing, was removed from the queue...) also frees its slot and is reported as *not reached*. The rest of the batch carries on.

## Recipe 1: deploy several things up to an approval gate

Each deploy pipeline has an `input` step before promoting to production. You want to deploy everything to `staging` and leave each build waiting for approval, without launching them all at once:

```bash
butler-ci-cli jobs batch app/deploy-api app/deploy-web app/deploy-worker \
  --params "ENVIRONMENT=staging" --until paused --concurrency 2
```

```
🎯 3 jobs, at most 2 at a time. The next one starts when a build reaches: paused

🚀 [1/3] app/deploy-api: launched
🚀 [2/3] app/deploy-web: launched
🔄 app/deploy-api: running as build #41
🔄 app/deploy-web: running as build #17
✅ app/deploy-api #41 reached paused
🚀 [3/3] app/deploy-worker: launched
...
✅ Done: 3 reached the target, 0 did not, 0 failed.
```

The builds stay paused afterwards: approve or abort them from Jenkins (or `jobs abort`). A paused build does not count against the batch once it reached `paused`.

Tip: put the `input` in a stage with its own `input { ... }` directive and `agent none` at the top, so a paused build does not hold an executor. `dev/jenkins/pipelines/approval-gate.groovy` is a working example.

## Recipe 2: a chain where each step needs the previous one to pass

```bash
butler-ci-cli jobs batch app/build app/integration-tests app/package \
  --until success --concurrency 1
```

With `--concurrency 1` the jobs run in order. If `app/build` fails, the batch does **not** stop: `app/integration-tests` is launched anyway and the summary reports the failure at the end (exit code `1`).

## Recipe 3: start the next job as soon as a stage is done

Find the exact stage names of the last build:

```bash
butler-ci-cli jobs stages app/release
```

```
📄 Pipeline stages
================================================================================
  1. Checkout - ✅ Successful (2s)
  2. Build - ✅ Successful (3s)
  3. Publish - ⏸️ Waiting for input (7s)

💡 Use a name with: jobs batch ... --until "stage:<name>"
```

Then use one of them as the target. The next job starts as soon as `Build` succeeds, while the first build is still running its remaining stages:

```bash
butler-ci-cli jobs batch app/release app/release --until "stage:Build"
```

Stage names are matched exactly (case included). `jobs stages` needs the Pipeline Stage View plugin and a job that has run at least once.

## Recipe 4: a manifest with per-job parameters

Parameters passed with `--params` are shared by every job given as an argument. When each job needs its own values, use a JSON (or JSONC, see recipe 5) manifest, for example `pipelines.json`:

```json
{
  "concurrency": 2,
  "until": "paused",
  "pollInterval": 5,
  "jobs": [
    "app/smoke-tests",
    { "job": "app/deploy-api", "params": { "ENVIRONMENT": "staging", "VERSION": "1.4.2" } },
    { "job": "app/deploy-web", "params": { "ENVIRONMENT": "staging", "DRY_RUN": false } },
    { "job": "app/deploy-api", "params": { "ENVIRONMENT": "qa", "VERSION": "1.4.2" } }
  ]
}
```

```bash
butler-ci-cli jobs batch --file pipelines.json
```

- Every field except `jobs` is optional.
- A job is either a string (no parameters) or `{ "job": ..., "params": { ... } }`. Values may be strings, numbers or booleans.
- Parameters you do not list use the job's defaults.
- The same job can appear several times with different parameters; its output lines are numbered (`app/deploy-api (2/4)`) so they can be told apart.
- Jobs given as arguments run first, then the ones in the file. Command-line flags (`--concurrency`, `--until`, `--interval`) override the manifest.

## Recipe 5: a template with every service, commenting out what you do not need

The manifest is read as **JSONC**: `//` and `/* ... */` comments and trailing commas are allowed (in `.json` files too). That lets you keep one template with all your services and comment out, each time, the ones you do not want to launch; only the uncommented entries run.

[`examples/batch-template.jsonc`](examples/batch-template.jsonc) is a starting point:

```jsonc
{
  "concurrency": 2,
  "until": "paused",
  "jobs": [
    { "job": "app/backend/deploy-api", "params": { "ENVIRONMENT": "staging" } },
    // { "job": "app/backend/deploy-worker", "params": { "ENVIRONMENT": "staging" } },
    { "job": "app/frontend/deploy-web", "params": { "ENVIRONMENT": "staging" } },
    // "app/tools/clear-cache",
  ],
}
```

```bash
cp docs/examples/batch-template.jsonc my-deploy.jsonc   # edit it: comment/uncomment services
butler-ci-cli jobs batch --file my-deploy.jsonc
```

Here only `deploy-api` and `deploy-web` are launched. If every job is commented out the command stops with an error instead of doing nothing.

### Generating the template from your Jenkins

You do not have to write the list of services by hand: `jobs template` reads the jobs from the active Jenkins and writes a JSONC manifest with **every job commented out**, grouped by folder (root jobs first). Disabled jobs are left out.

```bash
butler-ci-cli jobs template -o my-deploy.jsonc              # every job in Jenkins
butler-ci-cli jobs template app/backend -o backend.jsonc    # only the jobs under a folder
butler-ci-cli jobs template --with-params -o my-deploy.jsonc # also each job's parameters with their defaults
butler-ci-cli jobs template > my-deploy.jsonc               # without -o it prints to stdout
```

Open the file, uncomment the jobs you want, adjust `concurrency` / `until` and run `butler-ci-cli jobs batch --file my-deploy.jsonc`.

- With `--with-params` a job is written as `{ "job": ..., "params": { ... } }` using the default values, so you only edit the ones that change. It costs one extra request per job. Password and file parameters are never written.
- An existing output file is not overwritten unless you pass `--force`, so a template you already edited is safe.

## Good to know

- **Nothing is launched until every job has been checked.** A misspelled name or a folder fails the whole command before the first build starts. It then asks for confirmation (skip it with `--yes`, needed in scripts and CI).
- **Concurrency is about builds that have not reached the target**, not about Jenkins executors. If Jenkins has no free executor the build waits in the queue and still counts as in flight.
- **Polling:** the CLI queries Jenkins every `--interval` seconds (5 by default). A few consecutive failed queries are tolerated before a build is given up on, so a network blip does not free its slot.
- **Ctrl+C** stops the CLI, not the builds already launched: they keep running in Jenkins.
- **Identical launches may be merged by Jenkins.** Two launches of the same job with the same parameters can end up as a single queued build, depending on the job's configuration. Give them different parameters if you need two builds.
