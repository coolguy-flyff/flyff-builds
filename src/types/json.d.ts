/**
 * Generated game-data tables are imported as `unknown` and validated with zod at load time
 * (src/data/index.ts). This keeps tsc from inferring literal types for ~400 KB of JSON.
 */
declare module '*.json' {
  const value: unknown;
  export default value;
}
