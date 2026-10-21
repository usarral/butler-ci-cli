import axios, { AxiosInstance } from "axios";
import { getJenkinsConfig } from "./config";
import { logger } from "./logger";
import { msg } from "../i18n";
import { icons } from "../utils/icons";
import { formatters } from "./formatters";

let jenkinsInstance: AxiosInstance | null = null;

function createJenkinsClient(): AxiosInstance {
  const config = getJenkinsConfig();
  
  if (!config) {
    logger.error(formatters.error(`${icons.error} ${msg.errors.noConfig()}`));
    logger.info(formatters.secondary(`${icons.info} ${msg.hints.createConfig()}`));
    process.exit(1);
  }

  return axios.create({
    baseURL: config.url,
    auth: {
      username: config.username,
      password: config.token,
    },
  });
}

export function getJenkinsClient(): AxiosInstance {
  jenkinsInstance ??= createJenkinsClient();
  return jenkinsInstance;
}

/** Descarta el cliente cacheado; el siguiente uso lee de nuevo la configuración activa. */
export function resetJenkinsClient(): void {
  jenkinsInstance = null;
}

// Para compatibilidad con el código existente
export const jenkins = new Proxy({} as AxiosInstance, {
  get(target, prop) {
    const client = getJenkinsClient();
    return client[prop as keyof AxiosInstance];
  }
});
