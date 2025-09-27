/* Minimal type declarations for swisseph native addon to satisfy TS/ESLint */
declare module 'swisseph' {
  // Exported API is CommonJS; use export = for compatibility with "import * as swisseph from 'swisseph'"
  const swisseph: any;
  export = swisseph;
}
