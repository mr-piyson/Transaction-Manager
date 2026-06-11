import { z } from 'zod';
import { createEnv } from '@t3-oss/env-core';

export const env = createEnv({
  server: {
    DATABASE_URL: z.string(),
    DATABASE_PROVIDER: z.enum(['sqlite', 'postgresql', 'mysql']),
    BETTER_AUTH_SECRET: z.string(),
    NODE_ENV: z.enum(['development', 'production']).optional(),
  },
  runtimeEnv: process.env,
    onValidationError: (error: any) => {  
    console.error('\x1b[31m%s\x1b[0m', '❌ Invalid Environment Variables:');

    error.issues.forEach((issue: any) => {
      const varName = issue.path[0]?.toString() || 'UNKNOWN';
      let errorMessage = issue.message;

      // Handle type mismatches (Expected vs Received)
      if ('expected' in issue && 'received' in issue) {
        errorMessage = `Expected ${issue.expected}, but received ${issue.received}`;
      }

      // Output format: NAME="current_val" -> Error detail
      console.log(
        '  \x1b[1m\x1b[31m%s\x1b[0m \x1b[90m->\x1b[0m \x1b[33m%s\x1b[0m',
        varName.padEnd(20), // Aligns the arrows
        errorMessage,
      );
    });

    console.log('\n\x1b[41m\x1b[37m%s\x1b[0m', ' FATAL: Fix your .env file to continue. ');
    process.exit(1);
  },

  onInvalidAccess(variable) {
    console.error('\x1b[31m%s\x1b[0m \x1b[1m%s\x1b[0m', '❌ Invalid access to:', variable);
    process.exit(1);
  },
});
