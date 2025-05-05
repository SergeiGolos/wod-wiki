/**
 * Service for managing screen wake lock functionality
 * 
 * Uses the Web Wake Lock API to keep the device screen awake
 * https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API
 */
export class ScreenService {
  private wakeLock: WakeLockSentinel | null = null;
  
  /**
   * Check if the Wake Lock API is supported
   */
  isSupported(): boolean {
    return 'wakeLock' in navigator;
  }

  /**
   * Request a wake lock to keep the screen on
   * @returns Promise resolving to true if successful, false otherwise
   */
  async requestWakeLock(): Promise<boolean> {
    try {
      if (this.isSupported()) {
        this.wakeLock = await navigator.wakeLock.request('screen');
        return true;
      }
      return false;
    } catch (err) {
      console.error('Wake Lock API error:', err);
      return false;
    }
  }

  /**
   * Release the current wake lock
   * @returns Promise resolving to true if released, false if no lock was active
   */
  async releaseWakeLock(): Promise<boolean> {
    try {
      if (this.wakeLock) {
        await this.wakeLock.release();
        this.wakeLock = null;
        return true;
      }
      return false;
    } catch (err) {
      console.error('Wake Lock release error:', err);
      return false;
    }
  }
}
