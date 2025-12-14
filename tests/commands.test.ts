import { describe, it, expect } from 'vitest';
import { Command } from 'commander';
import { setupJobsCommands } from '../src/commands/jobs';
import { setupConfigCommands } from '../src/commands/config';

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
});
