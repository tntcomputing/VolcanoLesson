#!/usr/bin/env python3
"""Serial bridge for micro:bit messages to Volcano API.

Expected serial line format:
from|to|message

Behavior:
- Sends POST /LogLocation with LocationID=from and Message=message
- Keyboard command: r -> POST /ResetLog
- Keyboard command: q -> quit
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from dataclasses import dataclass
from typing import Optional

import requests
import serial

if sys.platform == "win32":
    import msvcrt
else:
    msvcrt = None


@dataclass
class ParsedMessage:
    sender: str
    receiver: str
    message: str


def parse_line(line: str) -> Optional[ParsedMessage]:
    parts = line.split("|", 2)
    if len(parts) != 3:
        return None

    sender = parts[0].strip()
    receiver = parts[1].strip()
    message = parts[2].strip()

    if not sender or not message:
        return None

    return ParsedMessage(sender=sender, receiver=receiver, message=message)


def post_log(api_base_url: str, parsed: ParsedMessage, timeout: float) -> bool:
    url = f"{api_base_url.rstrip('/')}/LogLocation"
    payload = {
        "LocationID": parsed.sender,
        "Message": parsed.message,
    }

    response = requests.post(url, json=payload, timeout=timeout)
    if response.ok:
        print(f"[OK] Logged from '{parsed.sender}' to '{parsed.receiver}': {parsed.message}")
        return True

    print(f"[ERR] LogLocation failed: HTTP {response.status_code} {response.text}")
    return False


def reset_log(api_base_url: str, timeout: float) -> bool:
    url = f"{api_base_url.rstrip('/')}/ResetLog"
    response = requests.post(url, timeout=timeout)

    if response.ok:
        print("[OK] Log reset.")
        return True

    print(f"[ERR] ResetLog failed: HTTP {response.status_code} {response.text}")
    return False


def print_help() -> None:
    print("Commands: [r] reset log, [h] help, [q] quit")


def get_keypress() -> Optional[str]:
    if not msvcrt:
        return None

    if not msvcrt.kbhit():
        return None

    key = msvcrt.getwch()
    return key.lower()


def main() -> int:
    parser = argparse.ArgumentParser(description="Bridge micro:bit serial messages to Volcano API")
    parser.add_argument("--port", required=True, help="Serial port, e.g. COM5")
    parser.add_argument("--baud", type=int, default=115200, help="Serial baud rate (default: 115200)")
    parser.add_argument(
        "--api-base-url",
        default="http://127.0.0.1:7071/api",
        help="API base URL (default: http://127.0.0.1:7071/api)",
    )
    parser.add_argument(
        "--serial-timeout",
        type=float,
        default=0.5,
        help="Serial read timeout in seconds (default: 0.5)",
    )
    parser.add_argument(
        "--http-timeout",
        type=float,
        default=5.0,
        help="HTTP timeout in seconds (default: 5.0)",
    )
    args = parser.parse_args()

    print("Starting micro:bit serial bridge")
    print(f"Port: {args.port}, baud: {args.baud}")
    print(f"API:  {args.api_base_url}")
    print_help()

    try:
        ser = serial.Serial(args.port, args.baud, timeout=args.serial_timeout)
    except Exception as exc:
        print(f"[ERR] Unable to open serial port {args.port}: {exc}")
        return 1

    with ser:
        print("[OK] Serial connection opened.")
        while True:
            key = get_keypress()
            if key == "q":
                print("Exiting.")
                break
            if key == "h":
                print_help()
            if key == "r":
                try:
                    reset_log(args.api_base_url, args.http_timeout)
                except Exception as exc:
                    print(f"[ERR] Reset request failed: {exc}")

            try:
                raw = ser.readline()
                if not raw:
                    continue

                line = raw.decode("utf-8", errors="replace").strip()
                if not line:
                    continue

                parsed = parse_line(line)
                if not parsed:
                    print(f"[WARN] Ignoring malformed line: {json.dumps(line)}")
                    continue

                try:
                    post_log(args.api_base_url, parsed, args.http_timeout)
                except Exception as exc:
                    print(f"[ERR] Log request failed: {exc}")
            except KeyboardInterrupt:
                print("Exiting.")
                break
            except Exception as exc:
                print(f"[ERR] Serial read loop error: {exc}")
                time.sleep(0.25)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
