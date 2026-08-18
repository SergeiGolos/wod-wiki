#!/usr/bin/env node
/**
 * wod CLI Entry Point
 *
 * Dispatches to cliMain(process.argv.slice(2)).
 * Supports execution under Bun directly (development / CI) and
 * as a compiled node binary after tsup bundle.
 */

import { cliMain } from '../cli/runner';

void (async () => {
  const exitCode = await cliMain(process.argv.slice(2));
  process.exitCode = exitCode;
})();
