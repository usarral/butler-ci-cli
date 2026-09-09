/**
 * Iconos de la CLI y detección del soporte del terminal.
 *
 * Hay dos problemas distintos detrás de "los iconos se ven mal en PowerShell":
 *
 * 1. **Codificación.** El logger escribía directamente al descriptor 1 (vía
 *    sonic-boom, el destino por defecto de pino-pretty). En Windows eso salta
 *    la conversión a UTF-16 que hace Node para la consola, así que los bytes
 *    UTF-8 se interpretan con la página de códigos activa (850/437) y `📊`
 *    aparece como `≡ƒôè` y `configuración` como `configuraci├│n`. Se arregla en
 *    `logger.ts` escribiendo por `process.stdout`; ninguna fuente, ni una Nerd
 *    Font, puede arreglar bytes mal interpretados.
 *
 * 2. **Renderizado.** Aun con la codificación correcta, la consola clásica
 *    (conhost) dibuja los emoji con anchos inconsistentes y rompe la
 *    alineación de los árboles y tablas. Por eso aquí hay un juego ASCII que se
 *    usa automáticamente en terminales antiguos de Windows.
 *
 * Se puede forzar con `BUTLER_ICONS=emoji|ascii` (o `auto`, el valor por
 * defecto).
 */

export type IconMode = 'emoji' | 'ascii';

/** Nombres de icono disponibles. */
export type IconName = keyof typeof EMOJI_ICONS;

/** Juego con emoji, para terminales modernos. */
const EMOJI_ICONS = {
  // Semánticos / prefijos de línea
  search: '🔍',
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  idea: '💡',
  rocket: '🚀',
  folder: '📁',
  file: '📄',
  download: '📥',
  gear: '⚙️',
  building: '🔨',
  logs: '📋',
  list: '📊',
  chart: '📈',
  user: '👤',
  location: '📍',
  description: '📝',
  target: '🎯',
  key: '🔑',
  branch: '🌿',
  upstream: '⬆️',
  construction: '🏗️',
  clock: '⏰',

  // Estados
  running: '🔄',
  disabled: '⚪',
  aborted: '🚫',
  skipped: '⏭️',
  paused: '⏸️',
  unstable: '⚠',

  // Marcas y viñetas
  check: '✓',
  cross: '✗',
  crossHeavy: '⊗',
  bullet: '•',
  circle: '🔹',
  dotActive: '●',
  dotInactive: '○',
  arrow: '→',

  // Separadores
  separator: '━',
  rule: '─',
} as const;

/**
 * Juego ASCII puro: seguro bajo cualquier página de códigos y de ancho fijo,
 * así que no descuadra árboles ni tablas.
 */
const ASCII_ICONS: Record<IconName, string> = {
  search: '[?]',
  success: '[ok]',
  error: '[x]',
  warning: '[!]',
  info: '[i]',
  idea: '[*]',
  rocket: '[>]',
  folder: '[/]',
  file: '[f]',
  download: '[v]',
  gear: '[~]',
  building: '[b]',
  logs: '[=]',
  list: '[#]',
  chart: '[#]',
  user: '[u]',
  location: '[@]',
  description: '[n]',
  target: '[>]',
  key: '[k]',
  branch: '[y]',
  upstream: '[^]',
  construction: '[b]',
  clock: '[t]',

  running: '~',
  disabled: '-',
  aborted: '!',
  skipped: '>',
  paused: '=',
  unstable: '!',

  check: 'v',
  cross: 'x',
  crossHeavy: 'x',
  bullet: '*',
  circle: '-',
  dotActive: '*',
  dotInactive: 'o',
  arrow: '->',

  separator: '-',
  rule: '-',
};

/**
 * Decide el juego de iconos a partir del entorno.
 *
 * Fuera de Windows se asume soporte completo. En Windows solo se usan emoji
 * cuando el terminal se identifica como moderno (Windows Terminal, VS Code,
 * ConEmu, o un terminal tipo Unix como Git Bash, que define `TERM`); la consola
 * clásica no define ninguna de esas variables.
 */
export function resolveIconMode(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform
): IconMode {
  const forced = env.BUTLER_ICONS?.trim().toLowerCase();
  if (forced === 'emoji' || forced === 'ascii') return forced;

  if (platform !== 'win32') return 'emoji';

  const modernWindowsTerminal =
    Boolean(env.WT_SESSION) ||
    Boolean(env.TERM_PROGRAM) ||
    env.ConEmuANSI === 'ON' ||
    Boolean(env.TERM);

  return modernWindowsTerminal ? 'emoji' : 'ascii';
}

/** Construye el juego de iconos correspondiente a un modo. */
export function buildIcons(mode: IconMode): Record<IconName, string> {
  return mode === 'ascii' ? { ...ASCII_ICONS } : { ...EMOJI_ICONS };
}

/** Modo activo, resuelto una sola vez al arrancar. */
export const iconMode: IconMode = resolveIconMode();

/** Iconos activos. */
export const icons: Record<IconName, string> = buildIcons(iconMode);

/** Línea separadora del ancho indicado con el carácter del juego activo. */
export function separatorLine(length = 80): string {
  return icons.separator.repeat(length);
}
