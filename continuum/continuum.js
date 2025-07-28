const { program } = require('commander');
const fs = require('fs');
const path = require('path');

const TASKS_DIR = path.join(__dirname, 'tasks');
const LOGS_DIR = path.join(__dirname, 'logs');
const REGISTRY_FILE = path.join(__dirname, 'continuum.json');

// Helper function to read the registry
function readRegistry() {
  if (!fs.existsSync(REGISTRY_FILE)) {
    return {};
  }
  const data = fs.readFileSync(REGISTRY_FILE, 'utf8');
  return JSON.parse(data);
}

// Helper function to write to the registry
function writeRegistry(registry) {
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2));
}

program
  .command('start <task_name> [description]')
  .description('Start a new task')
  .action((task_name, description) => {
    const registry = readRegistry();
    if (registry[task_name]) {
      console.log(`Task '${task_name}' already exists.`);
      return;
    }

    const taskFilePath = path.join(TASKS_DIR, `${task_name}.json`);
    const logFilePath = path.join(LOGS_DIR, `${task_name}.log.md`);

    const taskData = {
      name: task_name,
      description: description || '',
      status: 'active',
      createdAt: new Date().toISOString(),
      plan: [],
      resources: [],
    };

    fs.writeFileSync(taskFilePath, JSON.stringify(taskData, null, 2));
    fs.writeFileSync(logFilePath, `# Action Log for ${task_name}\n\n`);

    registry[task_name] = {
      description: description || '',
      status: 'active',
      createdAt: new Date().toISOString(),
      logFile: logFilePath,
    };

    writeRegistry(registry);
    console.log(`Started and activated task: ${task_name}`);
  });

program
  .command('log <task_name> [action_taken]')
  .description('Log an action for a task')
  .action((task_name, action_taken) => {
    const registry = readRegistry();
    if (!registry[task_name]) {
      console.log(`Task '${task_name}' not found.`);
      return;
    }

    const logFilePath = registry[task_name].logFile;
    const logEntry = `\n- ${new Date().toISOString()}: ${action_taken}\n`;

    fs.appendFileSync(logFilePath, logEntry);
    console.log(`Logged action for task: ${task_name}`);
  });

program
  .command('pause <task_name> [reason]')
  .description('Pause a task')
  .action((task_name, reason) => {
    const registry = readRegistry();
    if (!registry[task_name]) {
      console.log(`Task '${task_name}' not found.`);
      return;
    }

    registry[task_name].status = 'paused';
    writeRegistry(registry);

    const logFilePath = registry[task_name].logFile;
    const logEntry = `\n- ${new Date().toISOString()}: Paused - ${reason || 'No reason given'}\n`;
    fs.appendFileSync(logFilePath, logEntry);

    console.log(`Paused task: ${task_name}`);
  });

program
  .command('resume <task_name>')
  .description('Resume a task')
  .action((task_name) => {
    const registry = readRegistry();
    if (!registry[task_name]) {
      console.log(`Task '${task_name}' not found.`);
      return;
    }

    registry[task_name].status = 'active';
    writeRegistry(registry);

    const logFilePath = registry[task_name].logFile;
    const logContent = fs.readFileSync(logFilePath, 'utf8');
    const lastLog = logContent.trim().split('\n').pop();

    const logEntry = `\n- ${new Date().toISOString()}: Resumed task\n`;
    fs.appendFileSync(logFilePath, logEntry);

    console.log(`Resumed task: ${task_name}`);
    console.log(`Last action: ${lastLog}`);
  });

program
  .command('status')
  .description('Show the status of all tasks')
  .action(() => {
    const registry = readRegistry();
    if (Object.keys(registry).length === 0) {
      console.log('No tasks found.');
      return;
    }

    console.log('Current Task Statuses:');
    for (const task_name in registry) {
      const task = registry[task_name];
      console.log(`- ${task_name}: ${task.status} (Created: ${task.createdAt})`);
    }
  });

'''program
  .command('deploy <task_name>')
  .description('Deploy the application')
  .action((task_name) => {
    console.log(`Deploying task: ${task_name}`);
    // In a real scenario, you would execute your deploy script here.
    // e.g., const { exec } = require('child_process');
    // exec('sh ../deploy.sh', (error, stdout, stderr) => { ... });
  });

program
  .command('test <task_name>')
  .description('Run tests for the application')
  .action((task_name) => {
    console.log(`Testing task: ${task_name}`);
    // In a real scenario, you would execute your test script here.
  });

program
  .command('new-plan <plan_name>')
  .description('Create a new implementation plan')
  .action((plan_name) => {
    const planFilePath = path.join(LOGS_DIR, `${plan_name}.plan.md`);
    const planTemplate = `# Implementation Plan for ${plan_name}

## 1. Objective

## 2. Phases

### Phase 1: 

### Phase 2: 

## 3. Milestones

`;
    fs.writeFileSync(planFilePath, planTemplate);
    console.log(`Created new plan: ${plan_name}.plan.md`);
  });

program.parse(process.argv);''
