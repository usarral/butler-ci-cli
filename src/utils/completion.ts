import { Command, Option } from "commander";
import { configManager, getJenkinsConfig } from "./config";
import { loadJobs } from "./storage";
import { deprecatedAliases } from "./deprecatedCommands";

export type Shell = "bash" | "zsh" | "fish";
export const SHELLS: Shell[] = ["bash", "zsh", "fish"];

/** Nombres de argumento (en la definición de los comandos) cuyo valor es un job de Jenkins. */
const JOB_ARGS = new Set(["jobName", "jobs"]);

/** Quita comillas iniciales y backslashes: lo que el usuario ha escrito, tal como lo ve la shell. */
function unquote(word: string): { text: string; quoted: boolean } {
  if (word.startsWith('"') || word.startsWith("'")) return { text: word.slice(1), quoted: true };
  return { text: word.replace(/\\(.)/g, "$1"), quoted: false };
}

function escapeForBash(value: string): string {
  return value.replace(/[^A-Za-z0-9_\-./:@%+=,]/g, "\\$&");
}

function findOption(cmd: Command, flag: string): Option | undefined {
  const all = [...cmd.options, ...(cmd.parent ? findGlobalOptions(cmd) : [])];
  return all.find(o => o.long === flag || o.short === flag);
}

function findGlobalOptions(cmd: Command): readonly Option[] {
  const out: Option[] = [];
  for (let c = cmd.parent; c; c = c.parent) out.push(...c.options);
  return out;
}

function findSubcommand(cmd: Command, name: string): Command | undefined {
  return cmd.commands.find(c => c.name() === name || c.aliases().includes(name));
}

function visibleSubcommands(cmd: Command): Command[] {
  return cmd
    .createHelp()
    .visibleCommands(cmd)
    .filter(c => c.name() !== "help" && !deprecatedAliases.has(c));
}

/**
 * Candidatos para jobs, estilo ruta: ofrece carpeta a carpeta (las carpetas acaban en "/")
 * para no volcar cientos de nombres de golpe en Jenkins grandes.
 */
export function jobCandidates(jobs: string[], prefix: string): string[] {
  const dir = prefix.slice(0, prefix.lastIndexOf("/") + 1);
  const found = new Set<string>();
  for (const job of jobs) {
    if (!job.startsWith(prefix)) continue;
    const rest = job.slice(dir.length);
    const slash = rest.indexOf("/");
    found.add(slash === -1 ? job : `${dir}${rest.slice(0, slash)}/`);
  }
  return [...found].sort();
}

/** Nombre del entorno activo, el mismo que usa `fetch-jobs` para guardar la caché. */
function activeEnvironment(): string | undefined {
  return getJenkinsConfig()?.name;
}

/**
 * Calcula los candidatos de autocompletado.
 * `words` son los argumentos escritos tras el nombre del programa; el último es la palabra actual (puede ser "").
 */
export function complete(program: Command, words: string[], shell: Shell): string[] {
  const { text: cur, quoted } = unquote(words[words.length - 1] ?? "");
  const before = words.slice(0, -1);

  let cmd = program;
  const positionals: string[] = [];
  let expectsValue = false;

  for (let i = 0; i < before.length; i++) {
    const word = unquote(before[i]).text;
    if (word === "--") continue;
    if (word.startsWith("-")) {
      const [flag, inlineValue] = word.split(/=(.*)/s, 2);
      const opt = findOption(cmd, flag);
      if (opt?.required && inlineValue === undefined) {
        if (i === before.length - 1) expectsValue = true;
        else i++; // se come el valor de la opción
      }
    } else if (positionals.length === 0 && findSubcommand(cmd, word)) {
      cmd = findSubcommand(cmd, word)!;
    } else {
      positionals.push(word);
    }
  }

  // El valor de una opción (--params, -f ...) lo rellena la shell (ficheros, etc.).
  if (expectsValue) return [];

  const finish = (values: string[]) => {
    const matching = values.filter(v => v.startsWith(cur));
    return shell === "bash" && !quoted ? matching.map(escapeForBash) : matching;
  };

  if (cur.startsWith("-")) {
    const opts = [...cmd.options, ...findGlobalOptions(cmd)]
      .filter(o => !o.hidden)
      .map(o => o.long)
      .filter((l): l is string => Boolean(l));
    return finish([...new Set([...opts, "--help"])].sort());
  }

  const subcommands = visibleSubcommands(cmd);
  if (subcommands.length > 0 && positionals.length === 0) {
    return finish(subcommands.map(c => c.name()));
  }

  const args = cmd.registeredArguments;
  const lastArg = args[args.length - 1];
  const arg = args[positionals.length] ?? (lastArg?.variadic ? lastArg : undefined);
  if (!arg) return [];

  if (JOB_ARGS.has(arg.name())) {
    const environment = activeEnvironment();
    return environment ? finish(jobCandidates(loadJobs(environment), cur)) : [];
  }

  if (cmd.parent?.name() === "config" && arg.name() === "name") {
    return finish(configManager.listConfigs().sort());
  }

  return [];
}

const PROGRAM = "butler-ci-cli";

export function completionScript(shell: Shell): string {
  switch (shell) {
    case "bash":
      return `# bash completion for ${PROGRAM}
_butler_ci_cli() {
  local IFS=$'\\n'
  COMPREPLY=( $(${PROGRAM} __complete --shell bash -- "\${COMP_WORDS[@]:1:COMP_CWORD}" 2>/dev/null) )
  # Una carpeta de jobs ("folder/") no lleva espacio detrás para poder seguir escribiendo.
  if [[ \${#COMPREPLY[@]} -eq 1 && "\${COMPREPLY[0]}" == */ ]]; then
    compopt -o nospace
  fi
}
complete -o default -F _butler_ci_cli ${PROGRAM}
`;
    case "zsh":
      return `#compdef ${PROGRAM}
_butler_ci_cli() {
  local -a candidates folders others
  candidates=("\${(@f)$(${PROGRAM} __complete --shell zsh -- "\${(@)words[2,CURRENT]}" 2>/dev/null)}")
  candidates=("\${(@)candidates:#}")
  folders=("\${(@M)candidates:#*/}")
  others=("\${(@)candidates:#*/}")
  (( \${#folders} )) && compadd -S '' -- "\${folders[@]}"
  (( \${#others} )) && compadd -- "\${others[@]}"
  return 0
}
compdef _butler_ci_cli ${PROGRAM}
`;
    case "fish":
      return `# fish completion for ${PROGRAM}
function __butler_ci_cli_complete
    set -l tokens (commandline -opc) (commandline -ct)
    ${PROGRAM} __complete --shell fish -- $tokens[2..-1] 2>/dev/null
end
complete -c ${PROGRAM} -f -a '(__butler_ci_cli_complete)'
`;
  }
}
