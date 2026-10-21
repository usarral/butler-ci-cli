import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { logger } from "./logger";
import { msg } from "../i18n";
import { formatters } from "./formatters";

export interface JenkinsConfig {
  name: string;
  url: string;
  username: string;
  token: string;
  description?: string;
  preferences?: {
    editor?: string;
    logViewer?: string;
    downloadLogsDir?: string;
  };
}

export interface ConfigManager {
  getConfigDir(): string;
  listConfigs(): string[];
  saveConfig(config: JenkinsConfig): void;
  loadConfig(name: string): JenkinsConfig | null;
  deleteConfig(name: string): boolean;
  getCurrentConfig(): string | null;
  setCurrentConfig(name: string): boolean;
  getActiveConfig(): JenkinsConfig | null;
}

class ConfigManagerImpl implements ConfigManager {
  private readonly configDir: string;
  private readonly currentConfigFile: string;

  constructor() {
    this.configDir = join(homedir(), ".butler-ci-cli", "configs");
    this.currentConfigFile = join(homedir(), ".butler-ci-cli", "current-config.txt");
    this.ensureConfigDir();
  }

  private ensureConfigDir(): void {
    if (!existsSync(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true });
    }
    
    const currentConfigDir = dirname(this.currentConfigFile);
    if (!existsSync(currentConfigDir)) {
      mkdirSync(currentConfigDir, { recursive: true });
    }
  }

  getConfigDir(): string {
    return this.configDir;
  }

  listConfigs(): string[] {
    try {
      return readdirSync(this.configDir)
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
    } catch (error) {
      return [];
    }
  }

  saveConfig(config: JenkinsConfig): void {
    const configPath = join(this.configDir, `${config.name}.json`);
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  }

  loadConfig(name: string): JenkinsConfig | null {
    const configPath = join(this.configDir, `${name}.json`);
    
    if (!existsSync(configPath)) {
      return null;
    }

    try {
      const content = readFileSync(configPath, 'utf8');
      return JSON.parse(content) as JenkinsConfig;
    } catch (error) {
      logger.error(formatters.error(msg.config.store.loadFailed({ name, error: String(error) })));
      return null;
    }
  }

  deleteConfig(name: string): boolean {
    const configPath = join(this.configDir, `${name}.json`);
    
    if (!existsSync(configPath)) {
      return false;
    }

    try {
      unlinkSync(configPath);
      
      // Si es la configuración actual, limpiar la referencia
      const currentConfig = this.getCurrentConfig();
      if (currentConfig === name) {
        this.clearCurrentConfig();
      }
      
      return true;
    } catch (error) {
      logger.error(formatters.error(msg.config.store.deleteFailed({ name, error: String(error) })));
      return false;
    }
  }

  getCurrentConfig(): string | null {
    if (!existsSync(this.currentConfigFile)) {
      return null;
    }

    try {
      const content = readFileSync(this.currentConfigFile, 'utf8').trim();
      return content || null;
    } catch (error) {
      return null;
    }
  }

  setCurrentConfig(name: string): boolean {
    const config = this.loadConfig(name);
    if (!config) {
      return false;
    }

    try {
      writeFileSync(this.currentConfigFile, name, 'utf8');
      return true;
    } catch (error) {
      logger.error(formatters.error(msg.config.store.setCurrentFailed({ name, error: String(error) })));
      return false;
    }
  }

  private clearCurrentConfig(): void {
    try {
      if (existsSync(this.currentConfigFile)) {
        unlinkSync(this.currentConfigFile);
      }
    } catch (error) {
      logger.error(formatters.error(msg.config.store.clearCurrentFailed({ error: String(error) })));
    }
  }

  getActiveConfig(): JenkinsConfig | null {
    const currentConfigName = this.getCurrentConfig();
    if (!currentConfigName) {
      return null;
    }

    return this.loadConfig(currentConfigName);
  }
}

// Singleton instance
export const configManager: ConfigManager = new ConfigManagerImpl();

// Helper function to get active Jenkins configuration
export function getJenkinsConfig(): JenkinsConfig | null {
  // Primero intentar cargar desde archivos de configuración
  const config = configManager.getActiveConfig();
  
  if (config) {
    return config;
  }

  // Fallback a variables de entorno para compatibilidad
  const envUrl = process.env.JENKINS_URL;
  const envUser = process.env.JENKINS_USER;
  const envToken = process.env.JENKINS_TOKEN;

  if (envUrl && envUser && envToken) {
    return {
      name: 'env-fallback',
      url: envUrl,
      username: envUser,
      token: envToken,
      description: msg.config.store.envFallback()
    };
  }

  return null;
}