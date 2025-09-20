#!/usr/bin/env node

import fs from "fs";
import { execSync } from "child_process";
import readline from "readline";

// Types
interface Colors {
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  reset: string;
  bright: string;
}

interface DefaultValues {
  [key: string]: string;
}

interface Task {
  id: string;
  name: string;
  description: string;
  action: () => Promise<void>;
}

// Colors for console output
const colors: Colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m",
  bright: "\x1b[1m",
};

// Logging utilities
const log = (message: string, color: keyof Colors = "reset"): void => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const logStep = (step: string, message: string): void => {
  log(
    `\n${colors.bright}[${step}]${colors.reset} ${colors.cyan}${message}${colors.reset}`
  );
};

const logSuccess = (message: string): void => {
  log(`✅ ${message}`, "green");
};

const logWarning = (message: string): void => {
  log(`⚠️  ${message}`, "yellow");
};

const logError = (message: string): void => {
  log(`❌ ${message}`, "red");
};

// Enhanced environment schema parsing
class EnvSchemaParser {
  private static readonly ENV_FILE_PATHS = [
    "env.ts",
    "src/lib/env.ts",
    "src/env.ts",
    "lib/env.ts",
  ];

  static findEnvFile(): string | null {
    return this.ENV_FILE_PATHS.find(fs.existsSync) || null;
  }

  static parseEnvSchema(): string[] | null {
    const envFilePath = this.findEnvFile();

    if (!envFilePath) {
      logWarning("env.ts file not found. Using default environment variables.");
      return null;
    }

    try {
      const envContent = fs.readFileSync(envFilePath, "utf8");
      const envVars = new Set<string>();

      // Enhanced parsing patterns
      const patterns = [
        // Server variables in object notation
        /server:\s*{([^}]+)}/s,
        // Client variables in object notation
        /client:\s*{([^}]+)}/s,
        // Direct NEXT_PUBLIC_ variables
        /NEXT_PUBLIC_\w+/g,
        // Process.env references
        /process\.env\.(\w+)/g,
        // z.string() with variable names
        /(\w+):\s*z\./g,
      ];

      patterns.forEach((pattern) => {
        const matches = envContent.match(pattern);
        if (matches) {
          if (pattern.source.includes("process.env")) {
            matches.forEach((match) => {
              const varName = match.replace("process.env.", "");
              envVars.add(varName);
            });
          } else if (pattern.source.includes("NEXT_PUBLIC_")) {
            matches.forEach((varName) => envVars.add(varName));
          } else {
            // Handle object content
            const content = matches[1] || matches[0];
            const varMatches = content.match(/(\w+):/g);
            varMatches?.forEach((match) => {
              const varName = match.replace(":", "");
              if (varName !== "server" && varName !== "client") {
                envVars.add(varName);
              }
            });
          }
        }
      });

      logSuccess(`Found env.ts at: ${envFilePath}`);
      log(`Detected ${envVars.size} environment variables`, "blue");

      return Array.from(envVars);
    } catch (error) {
      logError(`Failed to parse env.ts: ${(error as Error).message}`);
      return null;
    }
  }
}

// Environment file generator
class EnvFileGenerator {
  static generateEnvContent(
    envVars: string[],
    isExample = false
  ): string | null {
    if (!envVars || envVars.length === 0) {
      return null;
    }

    const header = isExample
      ? "# Copy this file to .env and fill in your values\n# Generated from env.ts schema\n\n"
      : "# Environment Variables\n# Generated from env.ts schema\n# Fill in the values for your application\n\n";

    let content = header;
    const categorized = new Set<string>();

    // Default values for common environment variables
    const defaultValues: DefaultValues = {
      DATABASE_URL: "file:./Database.sqlite",
      SECRET_KEY: "123456",
      NODE_ENV: "development",
      PORT: "3000",
      NEXTAUTH_SECRET: "your-nextauth-secret-here",
      NEXTAUTH_URL: "http://localhost:3000",
    };

    // add default values for missing variables
    envVars.forEach((varName) => {
      if (!defaultValues[varName]) {
        defaultValues[varName] = "";
      }
    });

    envVars.forEach((varName) => {
      const defaultValue = defaultValues[varName] || "";
      const envVar = `${varName}=${defaultValue}\n`;
      if (!categorized.has(varName)) {
        content += `\n# ${varName}\n`;
        categorized.add(varName);
      }
      content += envVar;
    });

    return content;
  }
}

// Task implementations
class TaskManager {
  static async createEnvFiles(): Promise<void> {
    logStep("ENV", "Creating environment files from env.ts schema...");

    const envVars = EnvSchemaParser.parseEnvSchema();

    if (envVars && envVars.length > 0) {
      // Generate .env file
      const envContent = EnvFileGenerator.generateEnvContent(envVars, false);
      if (envContent) {
        if (!fs.existsSync(".env")) {
          fs.writeFileSync(".env", envContent);
          logSuccess("Created .env based on env.ts schema");
        } else {
          logWarning(".env already exists. Checking for missing variables...");

          const existingEnvContent = fs.readFileSync(".env", "utf8");
          const missingVars = envVars.filter(
            (varName) => !existingEnvContent.includes(varName)
          );

          if (missingVars.length > 0) {
            const missingEnvContent = EnvFileGenerator.generateEnvContent(
              missingVars,
              true
            );
            if (missingEnvContent) {
              fs.appendFileSync(".env", missingEnvContent);
              logSuccess("Added missing variables to .env");
            }
          }
        }
      }
    }
  }

  static async setupDatabase(): Promise<void> {
    logStep("DB", "Setting up database...");

    try {
      // Check if Prisma schema exists
      if (!fs.existsSync("prisma/schema.prisma")) {
        logWarning("Prisma schema not found. Initializing Prisma...");
        execSync("npx prisma init", { stdio: "inherit" });
      }

      // Generate Prisma client
      log("Generating Prisma client...", "blue");
      execSync("npx prisma generate", { stdio: "inherit" });

      // Push database schema
      log("Pushing database schema...", "blue");
      execSync("npx prisma db push", { stdio: "inherit" });

      // Run seed if seed file exists
      const seedFiles = ["prisma/seed.js", "prisma/seed.ts"];
      const seedFile = seedFiles.find(fs.existsSync);

      if (seedFile) {
        log("Running database seed...", "blue");
        try {
          execSync("npm run db:seed", { stdio: "inherit" });
        } catch {
          // Fallback to direct execution
          execSync(`node ${seedFile}`, { stdio: "inherit" });
        }
      }

      logSuccess("Database setup completed");
    } catch (error) {
      logError(`Database setup failed: ${(error as Error).message}`);
      logWarning("You may need to set up your database manually");
    }
  }

  static async installDependencies(): Promise<void> {
    logStep("DEPS", "Installing dependencies...");

    try {
      // Check if package-lock.json or yarn.lock exists
      const hasPackageLock = fs.existsSync("package-lock.json");
      const hasYarnLock = fs.existsSync("yarn.lock");
      const hasPnpmLock = fs.existsSync("pnpm-lock.yaml");
      const hasBun = fs.existsSync("bun.lock") || fs.existsSync("bun.lockb");

      let installCommand = "npm install";

      if (hasPnpmLock) {
        installCommand = "pnpm install";
      } else if (hasYarnLock) {
        installCommand = "yarn install";
      } else if (hasBun) {
        installCommand = "bun install";
      }

      log(`Running: ${installCommand}`, "blue");
      execSync(installCommand, { stdio: "inherit" });

      logSuccess("Dependencies installed successfully");
    } catch (error) {
      logError(`Dependency installation failed: ${(error as Error).message}`);
      throw error;
    }
  }

  static async setupGitHooks(): Promise<void> {
    logStep("GIT", "Setting up Git hooks...");

    try {
      // Check if husky is in dependencies
      if (fs.existsSync("package.json")) {
        const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
        const hasHusky =
          packageJson.devDependencies?.husky || packageJson.dependencies?.husky;

        if (hasHusky) {
          log("Setting up Husky...", "blue");
          execSync("npx husky install", { stdio: "inherit" });
          logSuccess("Git hooks configured with Husky");
        } else {
          logWarning(
            "Husky not found in dependencies. Skipping git hooks setup."
          );
        }
      }
    } catch (error) {
      logError(`Git hooks setup failed: ${(error as Error).message}`);
      logWarning("You may need to set up git hooks manually");
    }
  }
}

// Main execution
async function main() {
  log("\n🚀 Initializing development environment...", "cyan");

  try {
    TaskManager.installDependencies();
    TaskManager.createEnvFiles();
    TaskManager.setupDatabase();
  } catch (error) {
    logError(`Initialization failed: ${error}`);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    logError(`Script failed: ${error.message}`);
    process.exit(1);
  });
}
