#!/usr/bin/env tsx

import { spawn, exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Get port from environment variable, default to 3000
const PORT = process.env.PORT || process.env.NEXT_PORT || "3000";
const URL = `http://localhost:${PORT}`;

interface Display {
  width: number;
  height: number;
  x: number;
  y: number;
}

// Function to get display information on different platforms
async function getDisplays(): Promise<Display[]> {
  const platform = process.platform;

  try {
    if (platform === "darwin") {
      // macOS - use system_profiler
      const { stdout } = await execAsync(
        "system_profiler SPDisplaysDataType -json"
      );
      const data = JSON.parse(stdout);
      return data.SPDisplaysDataType.map((display: any, index: number) => ({
        width: parseInt(
          display.spdisplays_resolution?.split(" x ")[0] || "1920"
        ),
        height: parseInt(
          display.spdisplays_resolution?.split(" x ")[1] || "1080"
        ),
        x: index * 1920, // Approximate positioning
        y: 0,
      }));
    } else if (platform === "linux") {
      // Linux - use xrandr
      const { stdout } = await execAsync('xrandr --query | grep " connected"');
      const lines = stdout
        .split("\n")
        .filter((line) => line.includes("connected"));
      return lines.map((line, index) => {
        const match = line.match(/(\d+)x(\d+)\+(\d+)\+(\d+)/);
        if (match) {
          return {
            width: parseInt(match[1]),
            height: parseInt(match[2]),
            x: parseInt(match[3]),
            y: parseInt(match[4]),
          };
        }
        return { width: 1920, height: 1080, x: index * 1920, y: 0 };
      });
    } else if (platform === "win32") {
      // Windows - use PowerShell
      const { stdout } = await execAsync(
        'powershell "Get-WmiObject -Class Win32_VideoController | Select-Object CurrentHorizontalResolution, CurrentVerticalResolution"'
      );
      const lines = stdout
        .split("\n")
        .filter((line) => line.includes("Current"));
      return lines.map((line, index) => ({
        width: 1920, // Windows detection is more complex, using defaults
        height: 1080,
        x: index * 1920,
        y: 0,
      }));
    }
  } catch (error) {
    console.warn("Could not detect displays, assuming single monitor");
  }

  return [{ width: 1920, height: 1080, x: 0, y: 0 }];
}

// Function to get default browser info
async function getDefaultBrowser(): Promise<string | null> {
  const platform = process.platform;

  try {
    if (platform === "win32") {
      // Windows - query registry for default browser
      const { stdout } = await execAsync(
        'reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice" /v ProgId'
      );
      const match = stdout.match(/ProgId\s+REG_SZ\s+(.+)/);
      if (match) {
        const progId = match[1].trim();
        // Common browser ProgIds
        const browserMap: { [key: string]: string } = {
          MSEdgeHTM: "msedge",
          ChromeHTML: "chrome",
          FirefoxHTML: "firefox",
          SafariHTML: "safari",
          OperaStable: "opera",
        };
        return browserMap[progId] || null;
      }
    } else if (platform === "darwin") {
      // macOS - use system preferences
      const { stdout } = await execAsync(
        'defaults read ~/Library/Preferences/com.apple.LaunchServices/com.apple.launchservices.secure | grep -A 1 -B 1 "https" | grep -o "bundle.*" | head -1'
      );
      if (stdout.includes("edge")) return "Microsoft Edge";
      if (stdout.includes("chrome")) return "Google Chrome";
      if (stdout.includes("firefox")) return "Firefox";
      if (stdout.includes("safari")) return "Safari";
    } else if (platform === "linux") {
      // Linux - check xdg-settings
      const { stdout } = await execAsync(
        "xdg-settings get default-web-browser"
      );
      const browser = stdout.trim().toLowerCase();
      if (browser.includes("edge")) return "microsoft-edge";
      if (browser.includes("chrome")) return "google-chrome";
      if (browser.includes("firefox")) return "firefox";
    }
  } catch (error) {
    // Fallback to default system behavior
  }

  return null;
}

// Function to open browser on specific display
async function openBrowser(url: string, display?: Display) {
  const platform = process.platform;
  let command: string;
  let args: string[] = [];

  if (platform === "darwin") {
    // macOS - use default browser
    command = "open";
    args = [url];
  } else if (platform === "linux") {
    // Linux - use default browser
    command = "xdg-open";
    args = [url];
  } else if (platform === "win32") {
    // Windows - use default browser
    command = "cmd";
    args = ["/c", "start", "", url]; // Empty string after 'start' uses default browser
  } else {
    // Fallback
    command = "xdg-open";
    args = [url];
  }

  return spawn(command, args, {
    detached: true,
    stdio: "ignore",
    shell: platform === "win32",
  });
}

// Function to find the correct command for the platform
function getNextCommand(): { command: string; args: string[] } {
  const platform = process.platform;
  const isWindows = platform === "win32";

  // Try different command variations
  const commands = [
    // Try npx first
    {
      command: isWindows ? "npx.cmd" : "npx",
      args: ["next", "dev", "-p", PORT],
    },
    // Try npm run dev (if package.json has dev script)
    { command: isWindows ? "npm.cmd" : "npm", args: ["run", "dev"] },
    // Try yarn dev
    { command: isWindows ? "yarn.cmd" : "yarn", args: ["dev"] },
    // Try direct next command
    { command: isWindows ? "next.cmd" : "next", args: ["dev", "-p", PORT] },
  ];

  return commands[0]; // Start with npx, we'll handle fallbacks in main()
}

// Function to check if a command exists
async function commandExists(command: string): Promise<boolean> {
  try {
    const platform = process.platform;
    const cmd = platform === "win32" ? "where" : "which";
    await execAsync(`${cmd} ${command}`);
    return true;
  } catch {
    return false;
  }
}

// Function to wait for server to be ready
function waitForServer(url: string, timeout = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = async () => {
      try {
        const response = await fetch(url);
        if (response.status === 200) {
          resolve();
          return;
        }
      } catch (error) {
        // Server not ready yet
      }

      if (Date.now() - startTime > timeout) {
        reject(new Error(`Server did not start within ${timeout}ms`));
        return;
      }

      setTimeout(check, 500);
    };

    check();
  });
}

// Main function
async function main() {
  // Find the best command to use
  const platform = process.platform;
  const isWindows = platform === "win32";

  // Try different commands in order of preference
  const commandOptions = [
    {
      name: "bun",
      command: "bun",
      args: ["run", "dev"],
    },
    {
      name: "npx",
      command: isWindows ? "npx.cmd" : "npx",
      args: ["next", "dev", "-p", PORT],
    },
    {
      name: "npm",
      command: isWindows ? "npm.cmd" : "npm",
      args: ["run", "dev"],
    },
    { name: "yarn", command: isWindows ? "yarn.cmd" : "yarn", args: ["dev"] },
    { name: "pnpm", command: isWindows ? "pnpm.cmd" : "pnpm", args: ["dev"] },
  ];

  let nextProcess;
  let commandUsed = "";

  // Try each command until one works
  for (const option of commandOptions) {
    console.log(`🔍 Trying ${option.name}...`);

    if (await commandExists(option.command)) {
      console.log(`✅ Found ${option.name}, starting server...`);

      try {
        nextProcess = spawn(option.command, option.args, {
          stdio: "inherit",
          env: { ...process.env, PORT },
          shell: isWindows, // Use shell on Windows
        });
        commandUsed = option.name;
        break;
      } catch (error) {
        console.log(`❌ Failed to start with ${option.name}:`, error);
        continue;
      }
    } else {
      console.log(`⚠️  ${option.name} not found`);
    }
  }

  if (!nextProcess) {
    console.error(
      "❌ Could not start Next.js server. Please ensure you have Node.js, npm, and Next.js installed."
    );
    console.error("💡 Try running one of these commands manually:");
    console.error("   npm install -g npx");
    console.error("   npm run dev");
    console.error("   npx next dev");
    process.exit(1);
  }

  // Handle process termination
  process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down...");
    nextProcess.kill("SIGINT");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    nextProcess.kill("SIGTERM");
    process.exit(0);
  });

  // Error handling for the Next.js process
  nextProcess.on("error", (error) => {
    console.error(`❌ ${commandUsed} process error:`, error);
    process.exit(1);
  });

  nextProcess.on("exit", (code) => {
    if (code !== 0) {
      console.error(`❌ ${commandUsed} process exited with code ${code}`);
      process.exit(code || 1);
    }
  });

  try {
    // Wait for server to be ready
    await waitForServer(URL);

    // Get available displays
    const displays = await getDisplays();

    // Open browser on second monitor if available, otherwise first monitor
    const targetDisplay = displays.length > 1 ? displays[1] : displays[0];
    const displayInfo =
      displays.length > 1
        ? `second monitor (${targetDisplay.width}x${targetDisplay.height} at ${targetDisplay.x},${targetDisplay.y})`
        : "primary monitor";

    console.log(`🌐 Opening browser on ${displayInfo}...`);
    await openBrowser(URL, targetDisplay);
  } catch (error) {
    console.error("❌ Error:", error);
    nextProcess.kill("SIGTERM");
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});
