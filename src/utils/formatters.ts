import chalk from 'chalk';
import { icons } from './icons';

/**
 * Utilidades para formateo y presentación de datos
 */

export const formatters = {
  /**
   * Formatea un encabezado con color
   */
  header: (text: string): string => chalk.bold.blue(text),

  /**
   * Formatea un título de sección
   */
  title: (text: string): string => chalk.bold(text),

  /**
   * Formatea texto de éxito
   */
  success: (text: string): string => chalk.green(text),

  /**
   * Formatea texto de error
   */
  error: (text: string): string => chalk.red(text),

  /**
   * Formatea texto de advertencia
   */
  warning: (text: string): string => chalk.yellow(text),

  /**
   * Formatea texto de información
   */
  info: (text: string): string => chalk.cyan(text),

  /**
   * Formatea texto secundario/gris
   */
  secondary: (text: string): string => chalk.gray(text),

  /**
   * Formatea texto atenuado/dim
   */
  dim: (text: string): string => chalk.gray(text),

  /**
   * Formatea texto en negrita
   */
  bold: (text: string): string => chalk.bold(text),

  /**
   * Formatea un valor destacado
   */
  highlight: (text: string): string => chalk.bold.cyan(text),

  /**
   * Formatea un campo con su valor
   */
  field: (label: string, value: string | undefined, emptyText = '-'): string => {
    return `${chalk.bold(label)} ${value || chalk.gray(emptyText)}`;
  },

  /**
   * Formatea un separador
   */
  separator: (char = icons.separator, length = 80): string => chalk.blue(char.repeat(length)),

  /**
   * Formatea una URL
   */
  url: (url: string): string => chalk.underline.cyan(url),

  /**
   * Formatea un nombre de job
   */
  jobName: (name: string): string => chalk.cyan(name),

  /**
   * Formatea un número de build
   */
  buildNumber: (num: number | string): string => chalk.yellow(`#${num}`),

  /**
   * Formatea una duración
   */
  duration: (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  },

  /**
   * Formatea una fecha
   */
  date: (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  },

  /**
   * Formatea un timestamp a fecha legible
   * Alias de date() para compatibilidad
   */
  timestamp: (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  },

  /**
   * Formatea el estado de un build con color e icono
   */
  buildStatus: (status: string): string => {
    switch (status) {
      case 'SUCCESS':
        return chalk.green(`${icons.check} SUCCESS`);
      case 'FAILURE':
        return chalk.red(`${icons.cross} FAILURE`);
      case 'UNSTABLE':
        return chalk.yellow(`${icons.unstable} UNSTABLE`);
      case 'ABORTED':
        return chalk.gray(`${icons.crossHeavy} ABORTED`);
      default:
        return chalk.gray(`? ${status}`);
    }
  },

  /**
   * Formatea un booleano como Sí/No con color
   */
  boolean: (value: boolean, yesText = 'Sí', noText = 'No'): string => {
    return value ? chalk.green(yesText) : chalk.red(noText);
  },

  /**
   * Formatea un valor por defecto de parámetro
   */
  defaultValue: (value: any): string => {
    if (typeof value === 'boolean') {
      return value ? chalk.green('true') : chalk.red('false');
    }
    return chalk.yellow(String(value));
  },
};

/**
 * Clase para construir tablas simples
 */
export class TableBuilder {
  private rows: Array<[string, string]> = [];

  add(label: string, value: string | undefined, emptyText = '-'): this {
    this.rows.push([label, value || chalk.gray(emptyText)]);
    return this;
  }

  build(): string {
    return this.rows.map(([label, value]) => 
      `${chalk.bold(label)} ${value}`
    ).join('\n');
  }
}

/**
 * Imprime un encabezado de sección
 */
export function printHeader(text: string): void {
  console.log('\n' + formatters.header(text));
  console.log(formatters.separator('='));
}

/**
 * Imprime un separador simple
 */
export function printSeparator(char = icons.separator): void {
  console.log(formatters.separator(char));
}

/**
 * Imprime una línea vacía
 */
export function printNewLine(): void {
  console.log();
}
