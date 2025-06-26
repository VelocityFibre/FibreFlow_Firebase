import chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';

interface Environment {
  projectId: string;
  projectName: string;
  serviceAccountFile: string;
  webUrl: string;
  consoleUrl: string;
  color: string;
  emoji: string;
}

export class EnvironmentManager {
  private static currentEnvFile = path.join(__dirname, '../../.current-env');
  private static environments: Record<string, Environment>;
  
  static async load(): Promise<void> {
    const envPath = path.join(__dirname, '../../config/environments.json');
    const data = await fs.readFile(envPath, 'utf-8');
    this.environments = JSON.parse(data);
  }
  
  static async getCurrentEnvironment(): Promise<string> {
    try {
      const current = await fs.readFile(this.currentEnvFile, 'utf-8');
      return current.trim();
    } catch {
      // Default to test if no environment set
      await this.setEnvironment('test');
      return 'test';
    }
  }
  
  static async setEnvironment(env: 'test' | 'prod'): Promise<void> {
    if (!this.environments) await this.load();
    
    if (!this.environments[env]) {
      throw new Error(`Unknown environment: ${env}`);
    }
    
    await fs.writeFile(this.currentEnvFile, env);
    console.log(chalk.green(`✅ Switched to ${env.toUpperCase()} environment`));
  }
  
  static async getConfig(): Promise<Environment> {
    if (!this.environments) await this.load();
    
    const currentEnv = await this.getCurrentEnvironment();
    return this.environments[currentEnv];
  }
  
  static async displayCurrent(): Promise<void> {
    const env = await this.getCurrentEnvironment();
    const config = await this.getConfig();
    
    const colorFn = env === 'prod' ? chalk.bgRed : chalk.bgYellow;
    
    console.log('\n' + colorFn.black.bold(` ${config.emoji} ${config.projectName} `));
    console.log(chalk.gray('Project ID:'), config.projectId);
    console.log(chalk.gray('Console:'), chalk.blue.underline(config.consoleUrl));
    console.log();
  }
  
  static async confirmProduction(): Promise<boolean> {
    const env = await this.getCurrentEnvironment();
    
    if (env === 'prod') {
      console.log(chalk.red.bold('\n⚠️  WARNING: You are about to modify PRODUCTION data!\n'));
      
      // Show 5-second countdown
      for (let i = 5; i > 0; i--) {
        process.stdout.write(chalk.red(`Proceeding in ${i} seconds... (Ctrl+C to cancel)\r`));
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      console.log('\n');
      
      return true;
    }
    
    return true;
  }
}