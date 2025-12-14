import { describe, it, expect, vi } from 'vitest';
import { Command } from 'commander';
import { setupJobsCommands } from '../src/commands/jobs';
import { setupConfigCommands } from '../src/commands/config';
import { createDeprecatedAlias } from '../src/utils/deprecatedCommands';
import { logger } from '../src/utils/logger';

describe('Command Structure', () => {
  describe('Jobs Commands', () => {
    it('should setup jobs command with all subcommands', () => {
      const program = new Command();
      setupJobsCommands(program);
      
      const jobsCommand = program.commands.find(cmd => cmd.name() === 'jobs');
      expect(jobsCommand).toBeDefined();
      expect(jobsCommand?.description()).toBe('Gestionar y consultar información de jobs de Jenkins');
      
      const subcommands = jobsCommand?.commands.map(cmd => cmd.name()) || [];
      expect(subcommands).toContain('info');
      expect(subcommands).toContain('params');
      expect(subcommands).toContain('steps');
      expect(subcommands).toContain('last-build');
      expect(subcommands).toContain('build');
      expect(subcommands).toContain('list-builds');
      expect(subcommands).toContain('logs');
    });

    it('should have correct description for jobs info subcommand', () => {
      const program = new Command();
      setupJobsCommands(program);
      
      const jobsCommand = program.commands.find(cmd => cmd.name() === 'jobs');
      const infoCommand = jobsCommand?.commands.find(cmd => cmd.name() === 'info');
      
      expect(infoCommand).toBeDefined();
      expect(infoCommand?.description()).toBe('Obtener información detallada de un job');
    });

    it('should have correct description for jobs params subcommand', () => {
      const program = new Command();
      setupJobsCommands(program);
      
      const jobsCommand = program.commands.find(cmd => cmd.name() === 'jobs');
      const paramsCommand = jobsCommand?.commands.find(cmd => cmd.name() === 'params');
      
      expect(paramsCommand).toBeDefined();
      expect(paramsCommand?.description()).toBe('Mostrar los parámetros requeridos por un job');
    });

    it('should have correct description for jobs steps subcommand', () => {
      const program = new Command();
      setupJobsCommands(program);
      
      const jobsCommand = program.commands.find(cmd => cmd.name() === 'jobs');
      const stepsCommand = jobsCommand?.commands.find(cmd => cmd.name() === 'steps');
      
      expect(stepsCommand).toBeDefined();
      expect(stepsCommand?.description()).toBe('Mostrar los pasos (steps) de un build específico');
    });

    it('should have correct description for jobs last-build subcommand', () => {
      const program = new Command();
      setupJobsCommands(program);
      
      const jobsCommand = program.commands.find(cmd => cmd.name() === 'jobs');
      const lastBuildCommand = jobsCommand?.commands.find(cmd => cmd.name() === 'last-build');
      
      expect(lastBuildCommand).toBeDefined();
      expect(lastBuildCommand?.description()).toBe('Obtener información del último build de un job');
    });

    it('should have correct description for jobs build subcommand', () => {
      const program = new Command();
      setupJobsCommands(program);
      
      const jobsCommand = program.commands.find(cmd => cmd.name() === 'jobs');
      const buildCommand = jobsCommand?.commands.find(cmd => cmd.name() === 'build');
      
      expect(buildCommand).toBeDefined();
      expect(buildCommand?.description()).toBe('Ejecutar un build de forma asistida');
    });

    it('should have correct description for jobs list-builds subcommand', () => {
      const program = new Command();
      setupJobsCommands(program);
      
      const jobsCommand = program.commands.find(cmd => cmd.name() === 'jobs');
      const listBuildsCommand = jobsCommand?.commands.find(cmd => cmd.name() === 'list-builds');
      
      expect(listBuildsCommand).toBeDefined();
      expect(listBuildsCommand?.description()).toBe('Listar builds de un job con opciones de filtrado y paginación');
    });

    it('should have correct description for jobs logs subcommand', () => {
      const program = new Command();
      setupJobsCommands(program);
      
      const jobsCommand = program.commands.find(cmd => cmd.name() === 'jobs');
      const logsCommand = jobsCommand?.commands.find(cmd => cmd.name() === 'logs');
      
      expect(logsCommand).toBeDefined();
      expect(logsCommand?.description()).toBe('Ver logs de un build específico');
    });
  });

  describe('Config Commands', () => {
    it('should setup config command with all subcommands', () => {
      const program = new Command();
      setupConfigCommands(program);
      
      const configCommand = program.commands.find(cmd => cmd.name() === 'config');
      expect(configCommand).toBeDefined();
      expect(configCommand?.description()).toBe('Gestionar configuraciones de Jenkins');
      
      const subcommands = configCommand?.commands.map(cmd => cmd.name()) || [];
      expect(subcommands).toContain('create');
      expect(subcommands).toContain('list');
      expect(subcommands).toContain('use');
      expect(subcommands).toContain('delete');
      expect(subcommands).toContain('current');
      expect(subcommands).toContain('edit');
    });
  });

  describe('Deprecated Command Aliases', () => {
    it('should register deprecated command alias', () => {
      const program = new Command();
      const mockAction = vi.fn();
      
      createDeprecatedAlias(
        program,
        'test-command',
        'new test-command',
        mockAction,
        {
          args: [{ name: '<arg>', description: 'Test argument' }],
          description: 'Test description'
        }
      );
      
      const command = program.commands.find(cmd => cmd.name() === 'test-command');
      expect(command).toBeDefined();
      expect(command?.description()).toBe('Test description');
    });

    it('should register deprecated command with correct arguments', () => {
      const program = new Command();
      const mockAction = vi.fn();
      
      createDeprecatedAlias(
        program,
        'old-command',
        'new-command',
        mockAction,
        {
          args: [{ name: '<jobName>', description: 'Job name' }]
        }
      );
      
      const command = program.commands.find(cmd => cmd.name() === 'old-command');
      expect(command).toBeDefined();
      
      // Verify the command has an action handler registered
      expect(command?._actionHandler).toBeDefined();
    });

    it('should register deprecated command with multiple arguments', () => {
      const program = new Command();
      const mockAction = vi.fn();
      
      createDeprecatedAlias(
        program,
        'multi-arg-command',
        'new multi-arg-command',
        mockAction,
        {
          args: [
            { name: '<arg1>', description: 'First argument' },
            { name: '<arg2>', description: 'Second argument' }
          ]
        }
      );
      
      const command = program.commands.find(cmd => cmd.name() === 'multi-arg-command');
      expect(command).toBeDefined();
      expect(command?._actionHandler).toBeDefined();
    });

    it('should handle commands with options', () => {
      const program = new Command();
      const mockAction = vi.fn();
      
      createDeprecatedAlias(
        program,
        'command-with-options',
        'new command-with-options',
        mockAction,
        {
          args: [{ name: '<jobName>', description: 'Job name' }],
          options: [
            { flags: '--status <status>', description: 'Filter by status' },
            { flags: '--limit <number>', description: 'Limit results', parser: parseInt, defaultValue: 50 }
          ]
        }
      );
      
      const command = program.commands.find(cmd => cmd.name() === 'command-with-options');
      expect(command).toBeDefined();
      
      // Verify options are registered
      const options = command?.options.map(opt => opt.flags);
      expect(options).toContain('--status <status>');
      expect(options).toContain('--limit <number>');
    });

    it('should support commands with both short and long option flags', () => {
      const program = new Command();
      const mockAction = vi.fn();
      
      createDeprecatedAlias(
        program,
        'command-with-flags',
        'new command-with-flags',
        mockAction,
        {
          options: [
            { flags: '-d, --download', description: 'Download flag' },
            { flags: '-v, --verbose', description: 'Verbose flag' }
          ]
        }
      );
      
      const command = program.commands.find(cmd => cmd.name() === 'command-with-flags');
      expect(command).toBeDefined();
      
      const options = command?.options.map(opt => opt.flags);
      expect(options).toContain('-d, --download');
      expect(options).toContain('-v, --verbose');
    });
  });
});
