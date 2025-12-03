import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const execAsync = promisify(exec);

const CONFIG = {
  kindleHost: process.env.KINDLE_HOST || '',
  kindleUser: process.env.KINDLE_USER || 'root',
  kindlePassword: process.env.KINDLE_PASSWORD || '',
  kindleDir: process.env.KINDLE_DIR || '/mnt/us/dashboards',
  kindleScript: process.env.KINDLE_SCRIPT || '/mnt/us/rotate-display.sh',
  serverUrl: 'http://localhost:3000',
  serverPort: 3000,
  screenshotsDir: 'screenshots',
  serverStartTimeout: 30000,
  captureDelay: 3000,
};

// Helper to build SSH/SCP commands with password support
function buildSSHCommand(command) {
  if (CONFIG.kindlePassword) {
    return `sshpass -p '${CONFIG.kindlePassword}' ${command}`;
  }
  return command;
}

let devServerProcess = null;

// Helper to execute shell commands
async function runCommand(command, description) {
  console.log(`\n▶ ${description}...`);
  try {
    const { stdout, stderr } = await execAsync(command);
    if (stdout) console.log(stdout.trim());
    if (stderr) console.error(stderr.trim());
    console.log(`✓ ${description} completed`);
    return true;
  } catch (error) {
    console.error(`✗ ${description} failed:`, error.message);
    return false;
  }
}

// Check if dev server is already running
async function checkServerRunning() {
  try {
    const response = await fetch(CONFIG.serverUrl);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Start dev server
async function startDevServer() {
  console.log('\n▶ Starting Vite dev server...');

  return new Promise((resolve, reject) => {
    devServerProcess = spawn('npm', ['run', 'dev'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    let output = '';

    devServerProcess.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes('Local:') || output.includes('localhost')) {
        console.log('✓ Dev server started');
        resolve();
      }
    });

    devServerProcess.stderr.on('data', (data) => {
      const message = data.toString();
      if (message.includes('EADDRINUSE')) {
        console.log('✓ Dev server already running');
        devServerProcess.kill();
        devServerProcess = null;
        resolve();
      }
    });

    devServerProcess.on('error', (error) => {
      console.error('✗ Failed to start dev server:', error.message);
      reject(error);
    });

    // Timeout
    setTimeout(() => {
      if (devServerProcess) {
        console.log('⚠ Server start timeout, checking if it\'s running...');
        checkServerRunning().then(running => {
          if (running) {
            resolve();
          } else {
            reject(new Error('Server failed to start within timeout'));
          }
        });
      }
    }, CONFIG.serverStartTimeout);
  });
}

// Stop dev server
function stopDevServer() {
  if (devServerProcess) {
    console.log('\n▶ Stopping dev server...');
    devServerProcess.kill();
    devServerProcess = null;
    console.log('✓ Dev server stopped');
  }
}

// Wait for server to be ready
async function waitForServer() {
  console.log('\n▶ Waiting for server to be ready...');
  const maxAttempts = 30;
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(CONFIG.serverUrl);
      if (response.ok) {
        console.log('✓ Server is ready');
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }

  throw new Error('Server failed to become ready');
}

// Main deployment flow
async function deploy() {
  console.log('═══════════════════════════════════════════');
  console.log('  Kindle Dashboard Deployment');
  console.log('═══════════════════════════════════════════');

  // Validate Kindle configuration
  if (!CONFIG.kindleHost) {
    console.error('\n✗ Error: KINDLE_HOST not set in .env file');
    console.error('Add: KINDLE_HOST=192.168.1.xxx');
    process.exit(1);
  }

  let serverWasStarted = false;

  try {
    // Step 1: Fetch calendar data
    const fetchSuccess = await runCommand(
      'tsx scripts/fetch-calendar.ts',
      'Step 1/7: Fetching calendar data'
    );
    if (!fetchSuccess) {
      console.log('⚠ Calendar fetch failed, continuing with existing data...');
    }

    // Step 2: Start dev server (if not already running)
    console.log('\n▶ Step 2/7: Starting dev server...');
    const alreadyRunning = await checkServerRunning();

    if (alreadyRunning) {
      console.log('✓ Dev server already running');
    } else {
      await startDevServer();
      serverWasStarted = true;
      await waitForServer();
    }

    // Small delay to ensure everything is loaded
    console.log(`\n▶ Waiting ${CONFIG.captureDelay}ms for content to settle...`);
    await new Promise(resolve => setTimeout(resolve, CONFIG.captureDelay));

    // Step 3: Clean local screenshots folder
    const cleanLocalSuccess = await runCommand(
      `rm -f ${CONFIG.screenshotsDir}/*.png`,
      'Step 3/7: Cleaning local screenshots folder'
    );
    if (!cleanLocalSuccess) {
      console.log('⚠ Failed to clean local screenshots, continuing anyway...');
    }

    // Step 4: Capture screenshots
    const captureSuccess = await runCommand(
      'tsx scripts/capture.ts',
      'Step 4/7: Capturing screenshots'
    );
    if (!captureSuccess) {
      throw new Error('Screenshot capture failed');
    }

    // Step 5: Clean old screenshots from Kindle
    const cleanCommand = buildSSHCommand(
      `ssh -o StrictHostKeyChecking=no ${CONFIG.kindleUser}@${CONFIG.kindleHost} "/usr/sbin/mntroot rw && rm -f ${CONFIG.kindleDir}/\\*.png && /usr/sbin/mntroot ro"`
    );
    const cleanSuccess = await runCommand(
      cleanCommand,
      'Step 5/7: Cleaning old screenshots from Kindle'
    );
    if (!cleanSuccess) {
      console.log('⚠ Failed to clean old screenshots, continuing anyway...');
    }

    // Step 6: Transfer screenshots to Kindle
    const scpCommand = buildSSHCommand(
      `scp -o StrictHostKeyChecking=no ${CONFIG.screenshotsDir}/*.png ${CONFIG.kindleUser}@${CONFIG.kindleHost}:${CONFIG.kindleDir}/`
    );
    const transferSuccess = await runCommand(
      scpCommand,
      'Step 6/7: Transferring screenshots to Kindle'
    );
    if (!transferSuccess) {
      throw new Error('Screenshot transfer failed');
    }

    // Step 7: Trigger rotation on Kindle
    const sshCommand = buildSSHCommand(
      `ssh -o StrictHostKeyChecking=no ${CONFIG.kindleUser}@${CONFIG.kindleHost} "${CONFIG.kindleScript}"`
    );
    const rotateSuccess = await runCommand(
      sshCommand,
      'Step 7/7: Triggering display rotation on Kindle'
    );
    if (!rotateSuccess) {
      console.log('⚠ Rotation trigger failed, but screenshots were transferred');
    }

    console.log('\n═══════════════════════════════════════════');
    console.log('  ✓ Deployment completed successfully!');
    console.log('═══════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n═══════════════════════════════════════════');
    console.error('  ✗ Deployment failed');
    console.error('═══════════════════════════════════════════');
    console.error(`\nError: ${error.message}\n`);
    process.exit(1);
  } finally {
    // Clean up: stop dev server if we started it
    if (serverWasStarted) {
      stopDevServer();
    }
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\nDeployment interrupted by user');
  stopDevServer();
  process.exit(0);
});

deploy();
