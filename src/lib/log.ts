// ANSI color codes with semantic naming
export const ANSI = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  black: "\x1b[30m",
  gray: "\x1b[90m",
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underline: "\x1b[4m",
} as const;

export type ColorKey = keyof typeof ANSI;

export interface LogSegment {
  message: any;
  color?: ColorKey;
}

/**
 * Flexible logging function that supports multiple input formats:
 * 1. log(message, color, message, color, ...) - alternating parameters
 * 2. log([{message, color}, {message, color}, ...]) - segment array
 * 3. log(message) - single message (like console.log)
 */
export function log(...args: any[]): void {
  if (args.length === 0) return;

  // If first argument is an array of LogSegments, use the old interface
  if (Array.isArray(args[0]) && args.length === 1) {
    const segments = args[0] as LogSegment[];
    logSegments(segments);
    return;
  }

  // If single argument that's not an array, log it normally
  if (args.length === 1) {
    console.log(args[0]);
    return;
  }

  // Parse alternating message, color, message, color... format
  const segments: LogSegment[] = [];

  for (let i = 0; i < args.length; i += 2) {
    const message = args[i];
    const color = args[i + 1] as ColorKey | undefined;

    // If we have a color parameter and it's a valid color key, use it
    if (color && color in ANSI) {
      segments.push({ message, color });
    } else {
      // If no valid color provided, add message without color
      segments.push({ message });
      // If we consumed a non-color as color, back up one step
      if (args[i + 1] !== undefined && !(args[i + 1] in ANSI)) {
        i -= 1;
      }
    }
  }

  logSegments(segments);
}

/**
 * Internal function to handle the actual logging of segments
 */
function logSegments(segments: LogSegment[]): void {
  if (!segments.length) return;

  const output = segments
    .map(({ message, color = "reset" }) => {
      const colorCode = ANSI[color] || ANSI.reset;
      return `${colorCode}${message}${ANSI.reset}`;
    })
    .join("");

  console.log(output);
}

// Alternative version if you want stricter typing for the alternating format
export function logColored(...args: (any | ColorKey)[]): void {
  const segments: LogSegment[] = [];

  for (let i = 0; i < args.length; i += 2) {
    const message = args[i];
    const color = args[i + 1] as ColorKey;

    segments.push({
      message,
      color: color && color in ANSI ? color : undefined,
    });
  }

  logSegments(segments);
}
