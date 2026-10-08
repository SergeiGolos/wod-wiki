# Cast TV Testing — Laboratory TV

Reference for any agent testing the cast receiver/sender against real hardware. Everything here was learned by debugging on the device; the gotchas cost hours the first time.

## Device facts

| Fact | Value |
|---|---|
| adb binary | `/tmp/wod-tv-adb/platform-tools/adb` (downloaded platform-tools, not on PATH) |
| TV serial (USB) | `27081HFDD78GFJ` |
| Device name | `Laboratory TV` (Eureka Dongle, Google TV) |
| Cast v2 port | `8009` (TLS) |
| DevTools socket | `@cast_shell_devtools_remote` — NOT `chrome_devtools_remote` (that's phones) |
| Production cast app | `38F01E0E` → `https://wod.wiki/receiver-rpc.html` |
| Dev cast app | `B8EC949E` → receiver URL edited in the Cast SDK console |
| Cast SDK console | `https://cast.google.com/publish` — drive it via the omp browser-relay |
| TV engine | Chrome 92, CAF receiver 3.0.0156 — the minimum syntax target for the receiver build |

**Firewall:** the workstation blocks all LAN inbound. URLs like `http://10.1.0.x:8123` can never load on the TV. The receiver must be served from an https:// origin (wod.wiki, a PR preview) or via `adb reverse` onto the TV's own loopback with the app registered at `http://127.0.0.1:...`.

## Golden rules

1. **Discover the IP; never hardcode it.** The TV's DHCP lease changes across reboots (`.94` → `.92` observed). "Connection refused" on 8009 while the service listens = stale IP, not a wedged cast service.
2. **Hold the session.** A pychromecast force-launch whose process exits leaves a zombie session: the page lives but later senders' custom-namespace messages route nowhere (sender sees `sendMessage OK`, receiver hears nothing). Launch scripts must stay alive for the whole test.
3. **Console URL edits need a device reboot.** Cast app-config changes reach the device slowly or never (25+ min, two saves, no propagation observed). After editing the dev app's receiver URL: save, reboot the TV, then relaunch.
4. **`Backdrop` (E8C28D3C) starting `FROM_LOCAL` = the device went idle.** No cast session is running; the previous app was stopped (check the line above for who sent STOP and why).
5. **The receiver answers WebRTC offers only while its page has a live session.** Verify with the DevTools recipe below before blaming the sender.

## Recipes

### Attach receiver DevTools

```bash
ADB=/tmp/wod-tv-adb/platform-tools/adb
$ADB -s 27081HFDD78GFJ forward tcp:9222 localabstract:cast_shell_devtools_remote
curl -s http://127.0.0.1:9222/json/list
```

Done when: `/json/list` shows a `page` target whose URL ends in `receiver-rpc.html`. If the list is empty, the receiver app is not running — launch it (below).

### Inspect the live receiver page

Attach CDP to the target's `webSocketDebuggerUrl` and `Runtime.evaluate`:

- Boot check: `!!(window.cast && cast.framework)` → `true`; `document.getElementById('root').innerText` shows `WOD.WIKI // CAST-READY`.
- Signaling check: the console shows `[ReceiverCastSignaling] Listening on urn:x-cast:com.wodwiki`.
- Console history is not replayable over CDP — to capture logs across a reload, wrap `console.log/error` into a `window.__buf` array via `Page.addScriptToEvaluateOnNewDocument`, then read `__buf` after the fact.

### Launch the receiver and hold the session

```bash
uv run --with pychromecast python -u - <<'PY'
import time
import pychromecast
from pychromecast.discovery import discover

services, browser = discover()
cast = next(c for c in [pychromecast.get_chromecast_from_cast_info(s, browser.zc) for s in services]
            if c.cast_info.friendly_name == 'Laboratory TV')
cast.wait()
print('TV at', cast.cast_info.host, 'cur_app=', cast.app_id, flush=True)
try:
    cast.start_app('38F01E0E', force_launch=True)
except Exception as e:
    print('launch ack timeout (launch usually still proceeds):', type(e).__name__, flush=True)
for _ in range(60):   # HOLD — do not exit
    time.sleep(10)
PY
```

Done when: the DevTools target exists and the boot check passes. Keep the process alive until the test ends.

### Device-side logs

```bash
$ADB -s 27081HFDD78GFJ logcat -d -b main -v brief -s cast_shell \
  | grep -iE "APP_STATE|Launching|Navigation|CastInit|Stop request|webrtc"
```

`APP_STATE_RUNNING` = receiver app healthy. `CastInitTimeout` after 60 s = the receiver page failed to boot (syntax error in the bundle — see the explainer in `docs/cast-tv-failure-explainer.html`). `Stop request from sender` = a sender explicitly ended it; the peer_addr tells you whose.

## Diagnosing the two classic failures

| Symptom | Cause | Check |
|---|---|---|
| TV spins forever, app aborts at 60 s with `CastInitTimeout` | Receiver bundle has ES2022+ syntax (class static blocks ship in the main vendor chunk) | Grep the built receiver JS for `static{`; it must be built only by `apps/playground/vite.receiver.config.ts` (`target: 'chrome92'`) |
| Sender: `TIMEOUT after 15000ms — sigState=have-local-offer` | Receiver never answered the offer | Rule 2 (zombie session), rule 5 (page not listening), or receiver URL unreachable (firewall) |
