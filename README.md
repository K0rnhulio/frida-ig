# Instagram Anti-Detection Frida Script

This repository contains a Frida script designed to bypass various anti-detection measures and perform spoofing within the Instagram Android application.

## Features

*   **ICCID & IMSI Spoofing**: Modifies responses from `TelephonyManager`, `SubscriptionManager`, and `SubscriptionInfo` to return custom SIM identifiers.
*   **Frida Detection Bypass**:
    *   Intercepts string comparisons (`String.equals`, `String.contains`, `kotlin.jvm.internal.Intrinsics.areEqual`) to prevent detection of Frida-related keywords.
    *   Dynamically inspects and modifies component names that might reveal Frida's presence.
*   **Artifact Hiding**:
    *   Renames Frida-related thread names (`frida`, `gum-js-loop`, `gmain`).
    *   Filters lines from `/proc/self/maps` and other sensitive files if they contain Frida keywords.
    *   Makes `File.exists()` return `false` for paths associated with Frida or common system integrity checks.
*   **Root Detection Bypass**:
    *   Hooks `Runtime.exec()` and `ProcessBuilder.start()` to prevent execution of common root-checking commands (e.g., `su`, `busybox`), causing them to throw an `IOException`.
*   **Debugger Detection Bypass**:
    *   Forces `android.os.Debug.isDebuggerConnected()` to always return `false`.

## Usage

1.  Ensure you have Frida installed and set up on your testing device/emulator and host machine.
2.  Run the script against the Instagram application process:
    ```bash
    frida -U -f com.instagram.android -l instagram_frida_bypass.js --no-pause
    ```
    *(Replace `com.instagram.android` with the correct package name if different, and ensure `instagram_frida_bypass.js` is in your current directory or provide the full path.)*
3.  Monitor the Frida console for log messages indicating intercepted calls and actions.

## Disclaimer

This script is intended for educational and research purposes only. Modifying applications or bypassing security measures may violate terms of service. Use responsibly and at your own risk.