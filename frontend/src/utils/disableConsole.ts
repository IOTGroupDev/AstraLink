/**
 * Global Console Override
 *
 * This module disables all console output for performance optimization.
 *
 * IMPORTANT: Console is disabled in ALL modes (dev & production).
 * To re-enable for debugging, run in console: __enableConsole()
 *
 * Usage:
 *   import './src/utils/disableConsole'; // at the top of App.tsx
 */

// Store original console methods for potential re-enabling
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug,
  trace: console.trace,
};

// Override all console methods with no-ops
console.log = () => {};
console.warn = () => {};
console.error = () => {};
console.info = () => {};
console.debug = () => {};
console.trace = () => {};

// Expose a way to re-enable console if needed for debugging
// Usage in browser/debugger console: __enableConsole()
(global as any).__enableConsole = () => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;
  console.trace = originalConsole.trace;
  originalConsole.log('✅ Console re-enabled for debugging');
};

// Global flag to indicate console has been disabled
(global as any).__consoleDisabled = true;

