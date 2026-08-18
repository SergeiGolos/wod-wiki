#!/usr/bin/env bun
/**
 * `wod` CLI entrypoint
 */

import { cliMain } from '../src/cli/runner';

const exitCode = await cliMain(process.argv.slice(2));
process.exitCode = exitCode;
