# Butler CI CLI Architecture

This document describes the internal architecture of Butler CI CLI, its main components and how they interact.

## Table of Contents

- Overview
- Main components
- Data flow
- Jenkins client
- Configuration system
- Folder handling
- Commands
- Utilities

## Overview

Butler CI CLI is a command-line application written in TypeScript and Node.js. The project follows a modular command pattern. Each command is implemented as a separate module and reuses shared utilities (config management, HTTP client, formatters, storage).

High-level architecture:

User -> Commander (CLI parser) -> Command modules -> Utilities -> Jenkins API

## Main components

- `src/index.ts` — program entry point; wires commands into `commander`.
- `src/commands/` — individual command implementations (fetchJobs, listJobs, jobInfo, build, logs, etc.).
- `src/utils/` — shared utilities (jenkinsClient, config, storage, formatters, messages).
- `data/` — local cached data (e.g. `data/jobs.json`).

## Data flow

Typical flow for a command:

1. Commander parses arguments and invokes the command handler.
2. The handler obtains the active configuration (from `~/.butler-ci-cli` or environment variables).
3. The handler acquires a Jenkins HTTP client instance.
4. The handler performs HTTP requests to Jenkins API using the client.
5. Responses are processed and formatted for display.
6. Optional local persistence (e.g. saving jobs to `data/jobs.json`).

## Jenkins client (`src/utils/jenkinsClient.ts`)

The project provides a small wrapper around `axios` to interact with Jenkins.

Key points:

- The client is created with basic-auth credentials (username + API token) and a base URL from the selected configuration.
- A singleton pattern is used so the same Axios instance is reused across commands.
- The client currently does not implement automatic CSRF crumb handling or proxy configuration. If your Jenkins instance requires a crumb header for POST requests, the client must explicitly request `/crumbIssuer/api/json` and send the crumb on subsequent POSTs.

Sample creation logic (simplified):

```ts
import axios, { AxiosInstance } from "axios";
import { getJenkinsConfig } from "./config";

let jenkinsInstance: AxiosInstance | null = null;

export function getJenkinsClient(): AxiosInstance {
  if (jenkinsInstance) return jenkinsInstance;

  const config = getJenkinsConfig();
  if (!config) throw new Error("No Jenkins configuration available");

  jenkinsInstance = axios.create({
    baseURL: config.url,
    auth: { username: config.username, password: config.token },
    headers: { Accept: "application/json" },
  });

  return jenkinsInstance;
}
```

Note: the actual code uses `getJenkinsConfig()` and exports a Proxy for backwards compatibility; review `src/utils/jenkinsClient.ts` for details.

## Configuration system

- Config files are stored under `~/.butler-ci-cli/configs/` as JSON files.
- The active configuration name is stored in `~/.butler-ci-cli/current-config.txt`.
- If no active configuration is found, the code falls back to environment variables: `JENKINS_URL`, `JENKINS_USER`, `JENKINS_TOKEN`.

Configuration shape (example):

```ts
interface Config {
  name: string;
  url: string;
  username: string;
  token: string;
  description?: string;
  preferences?: { editor?: string; logViewer?: string; logsDir?: string };
}
```

## Folder handling

Jenkins exposes jobs and folders using `/job/{name}` components for each level. Butler CLI accepts logical paths like `backend/microservices/user-service` and converts them to URL paths:

- Logical path: `backend/microservices/user-service`
- Actual path: `/job/backend/job/microservices/job/user-service`

The utilities provide functions to list jobs recursively and identify folder items via the `_class` property returned by Jenkins (folders typically contain `Folder` in their `_class` value).

## Commands

Commands live in `src/commands/`. Each command follows a simple pattern:

- Validate input
- Acquire Jenkins client
- Make API calls
- Format and print results
- Handle errors gracefully

Examples of implemented commands:

- `fetch-jobs` — fetches jobs recursively and caches them locally
- `list-jobs` — prints a hierarchical view
- `show-folders` — prints folder-only view
- `search-jobs` — searches cached jobs
- `job-info` — shows detailed job information
- `last-build` — shows last build metadata
- `job-params` — shows parameter definitions for a job
- `build` — triggers a build (supports parameters)
- `logs` — retrieves build console text

## Utilities

- `config.ts` — read/write configs, return current config
- `jenkinsClient.ts` — HTTP client wrapper
- `jenkinsFolder.ts` — helpers for folder path construction and traversal
- `storage.ts` — local persistence helpers (read/write `data/jobs.json`)
- `formatters.ts` — functions to format dates, durations, and statuses
- `jobStatus.ts` — translated job/build status labels prefixed with their icon
- `icons.ts` — emoji/ASCII icon sets

## Internationalization

User-facing text lives in `src/i18n/en.ts` (source of truth) and `src/i18n/es.ts`, and is used as typed properties: `msg.group.name()` or `msg.group.name({ var })`. The variables of each message come from its `{placeholders}`, and the compiler rejects a translation whose keys or placeholders differ from English. The language is chosen from `BUTLER_LANG`, then the system locale, defaulting to English. To add a message, add it to both catalogs and call it through `msg`; keep icons out of the text and compose them at the call site.

## Extending the client

If you need additional features (crumb handling, proxy support, custom timeouts), consider extending `src/utils/jenkinsClient.ts`:

- Add a `getCrumb()` helper that requests `/crumbIssuer/api/json` and stores the crumb for subsequent POSTs.
- Allow injecting `axios` options from configuration (timeout, proxy, agent).
- Add request/response interceptors for logging and error normalization.


