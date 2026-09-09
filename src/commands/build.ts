import { getJobParameters, buildJob, getJobInfo } from "../utils/jenkinsFolder";
import { logger } from "../utils/logger";
import { msg } from "../utils/messages";
import { formatters } from "../utils/formatters";
import inquirer from "inquirer";

export async function build(jobName: string, options: { params?: string }) {
  try {
    logger.info(`${msg.icons.building} ${msg.info.preparingBuild(formatters.jobName(jobName))}\n`);
    
    // Verificar que el job existe y es ejecutable
    const jobInfo = await getJobInfo(jobName);
    
    if (!jobInfo.buildable) {
      logger.error(msg.errors.jobNotExecutable(jobName));
      process.exit(1);
    }
    
    // Obtener los parámetros del job
    const parameters = await getJobParameters(jobName);
    
    let buildParams: { [key: string]: any } = {};
    
    if (parameters.length > 0) {
      logger.info(formatters.info(`${msg.icons.logs} Este job requiere parámetros:\n`));
      
      // Si se pasaron parámetros por CLI
      if (options.params) {
        buildParams = parseCliParams(options.params);
        logger.info(formatters.success(`${msg.icons.check} ${msg.info.usingCliParams}\n`));
      } else {
        // Modo interactivo: preguntar por cada parámetro
        buildParams = await promptForParameters(parameters);
      }
    } else {
      logger.info(formatters.secondary(`${msg.icons.info}  Este job no requiere parámetros.\n`));
    }
    
    // Confirmar antes de ejecutar
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: msg.prompts.confirmBuild,
        default: true,
      },
    ]);
    
    if (!confirm) {
      logger.warn(`\n${msg.icons.aborted} ${msg.warnings.buildCancelled}`);
      return;
    }
    
    // Ejecutar el build
    logger.info(formatters.info(`\n${msg.icons.rocket} Iniciando build...\n`));
    const result = await buildJob(jobName, buildParams);
    
    logger.info(formatters.success(`${msg.icons.success} ${result.message}`));
    
    if (result.queueUrl) {
      logger.info(formatters.secondary(`${msg.icons.location} ${msg.labels.queueUrl}: ${result.queueUrl}`));
    }
    
    logger.info(formatters.info(`\n${msg.icons.idea} Puedes ver el estado del build en: ${formatters.url(jobInfo.url)}`));
    
  } catch (error: any) {
    logger.error(`${msg.icons.error} ${error.message}`);
    process.exit(1);
  }
}

/**
 * Solicita al usuario los valores para cada parámetro de forma interactiva
 */
async function promptForParameters(
  parameters: Array<{
    name: string;
    type: string;
    description?: string;
    defaultValue?: any;
    choices?: string[];
  }>
): Promise<{ [key: string]: any }> {
  const questions = parameters.map((param) => {
    const question: any = {
      name: param.name,
      message: param.description || param.name,
      default: param.defaultValue,
    };
    
    // Elegir el tipo de prompt según el tipo de parámetro
    switch (param.type) {
      case 'boolean':
        question.type = 'confirm';
        break;
      
      case 'choice':
        question.type = 'list';
        question.choices = param.choices || [];
        break;
      
      case 'password':
        question.type = 'password';
        break;
      
      case 'text':
        question.type = 'editor';
        break;
      
      default:
        question.type = 'input';
    }
    
    return question;
  });
  
  const answers = await inquirer.prompt(questions);
  return answers;
}

/**
 * Parsea parámetros pasados por CLI en formato key=value,key2=value2
 */
function parseCliParams(paramsString: string): { [key: string]: any } {
  const params: { [key: string]: any } = {};
  
  const pairs = paramsString.split(',');
  for (const pair of pairs) {
    const [key, ...valueParts] = pair.split('=');
    const value = valueParts.join('='); // Por si el valor contiene '='
    
    if (key && value !== undefined) {
      // Intentar convertir valores booleanos
      if (value.toLowerCase() === 'true') {
        params[key.trim()] = true;
      } else if (value.toLowerCase() === 'false') {
        params[key.trim()] = false;
      } else {
        params[key.trim()] = value.trim();
      }
    }
  }
  
  return params;
}
