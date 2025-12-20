/**
 * Global Console Override for Production
 *
 * This module disables all console output in production builds for performance.
 *
 * Import this at the very top of App.tsx to ensure console logs don't
 * impact performance in production builds.
 *
 * Usage:
 *   import './src/utils/disableConsole'; // at the top of App.tsx
 */

if (!__DEV__) {
  // Store original console methods (in case we need them for debugging)
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug,
    trace: console.trace,
  };

  // Override all console methods with no-ops in production
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.trace = () => {};

  // Expose a way to re-enable console if needed for debugging
  // Usage: (global as any).__enableConsole()
  (global as any).__enableConsole = () => {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.info = originalConsole.info;
    console.debug = originalConsole.debug;
    console.trace = originalConsole.trace;
    console.log('✅ Console re-enabled for debugging');
  };

  // Silent indicator that console has been disabled
  (global as any).__consoleDisabled = true;
}
