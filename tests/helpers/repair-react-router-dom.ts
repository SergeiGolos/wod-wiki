/**
 * repair-react-router-dom — test-only mock-leak repair.
 *
 * `useJournalZipProcessor.test.ts` registers a partial
 * `mock.module('react-router-dom')` (useNavigate / useParams / useLocation
 * stubs) that leaks process-wide when test files share a bun process: unlisted
 * exports merge with the real module, so `MemoryRouter` still works but
 * `useLocation` / `useNavigate` return the zip stubs.
 *
 * Importing this module FIRST (before any `react-router-dom` import) re-registers
 * the real implementation — sourced from the untouched `react-router` package,
 * which `react-router-dom` re-exports — so downstream imports bind to the real
 * router. A static import cannot express this ordering inside the test file
 * itself (all static imports evaluate before the file body, where the
 * `mock.module` call would live), hence the separate module.
 */
import { mock } from 'bun:test'
import * as actualRouter from 'react-router'

mock.module('react-router-dom', () => ({ ...actualRouter }))
