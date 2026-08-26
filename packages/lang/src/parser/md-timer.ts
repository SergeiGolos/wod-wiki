import { IScript, WhiteboardScript } from './WhiteboardScript';
import { parseScript } from './parseScript';

/**
 * Headless parser facade using the Lezer parser with 0 DOM / EditorState overhead.
 */
export class MdTimerRuntime {
  /**
   * Parse WhiteboardScript source into a {@link WhiteboardScript}, running the
   * Dialect Stack on every statement.
   *
   * @param sport - The block's `:sport` fence suffix (` ```log:climbing `).
   */
  read(inputText: string, sport?: string): IScript {
    return parseScript(inputText, { sport });
  }

  /**
   * Parse without running the Dialect Stack. Used by the parser test harness
   * which applies its own Dialect set. Production consumers should use {@link read}.
   */
  readWithoutDialects(inputText: string): IScript {
    return parseScript(inputText, { withoutDialects: true });
  }
}
