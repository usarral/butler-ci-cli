import pino from 'pino';
import pretty from 'pino-pretty';
import chalk from 'chalk';

/**
 * Logger de la CLI.
 *
 * La salida de esta herramienta es, en su mayor parte, contenido para el
 * usuario (árboles de jobs, resúmenes, tablas), no trazas de servidor. Por eso
 * el formato por defecto imprime el mensaje tal cual, sin el prefijo
 * `[hora] INFO:` delante.
 *
 * Para diagnóstico se puede recuperar la hora:
 *  - `LOG_LEVEL=debug` (o `trace`) activa las trazas y, con ellas, la hora.
 *  - `BUTLER_LOG_TIMESTAMPS=1` fuerza la hora en cualquier nivel.
 *
 * La hora se imprime en la zona horaria del sistema; pino-pretty la mostraba
 * en UTC, que era el origen del desfase.
 */

/** Etiquetas que sí merece la pena distinguir del contenido. */
const LEVEL_LABELS: Record<number, () => string> = {
  40: () => chalk.yellow('WARN'),
  50: () => chalk.red('ERROR'),
  60: () => chalk.bgRed.white('FATAL'),
};

/** Devuelve la hora local del sistema (HH:MM:SS) para un timestamp de pino. */
export function localTime(time: unknown, now: number = Date.now()): string {
  const date = new Date(typeof time === 'number' ? time : now);
  const safeDate = Number.isNaN(date.getTime()) ? new Date(now) : date;
  return safeDate.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * Construye la línea que se imprime: el mensaje tal cual, con prefijo solo
 * cuando aporta algo (hora bajo demanda, nivel a partir de `warn`).
 */
export function formatLogLine(
  log: Record<string, unknown>,
  messageKey: string,
  options: { showTimestamps: boolean }
): string {
  const raw = log[messageKey];
  const message = typeof raw === 'string' ? raw : String(raw ?? '');

  const prefix: string[] = [];
  if (options.showTimestamps) {
    prefix.push(chalk.gray(`[${localTime(log.time)}]`));
  }
  const label = LEVEL_LABELS[Number(log.level)];
  if (label) {
    prefix.push(`${label()}:`);
  }

  if (prefix.length === 0) return message;

  // Los saltos de línea iniciales separan bloques: van antes del prefijo.
  const leading = /^\n*/.exec(message)?.[0] ?? '';
  return `${leading}${prefix.join(' ')} ${message.slice(leading.length)}`;
}

const level = process.env.LOG_LEVEL || 'info';
const showTimestamps =
  process.env.BUTLER_LOG_TIMESTAMPS === '1' || level === 'debug' || level === 'trace';

const stream = pretty({
  // El color lo aplica `formatters` (chalk), que además respeta TTY y NO_COLOR.
  // Con `colorize: true`, pino-pretty pintaba el mensaje entero de cian y se
  // comía los colores por elemento.
  colorize: false,
  // El prefijo se construye en messageFormat para poder omitirlo por completo.
  ignore: 'pid,hostname,level,time',
  messageFormat: (log, messageKey) =>
    formatLogLine(log as Record<string, unknown>, messageKey, { showTimestamps }),
});

// pino-pretty como stream directo (no como transport en un worker): así la
// salida sale en orden con los console.log de los comandos y no se pierden
// líneas cuando el proceso termina.
const logger = pino({ level }, stream);

export { logger };
