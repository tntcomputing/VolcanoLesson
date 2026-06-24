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

import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "libs"))

import argparse
import json
import sys
import time
from dataclasses import dataclass
from typing import Optional

import requests
import serial
from serial.tools import list_ports

if sys.platform == "win32":
    import msvcrt
else:
    msvcrt = None


@dataclass
class ParsedMessage:
    sender: str
    receiver: str
    message: str


@dataclass
class PortCandidate:
    device: str
    description: str
    manufacturer: str
    hwid: str


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


def looks_like_message(line: str) -> bool:
    return parse_line(line) is not None


def list_candidate_ports() -> list[PortCandidate]:
    candidates: list[PortCandidate] = []

    for port in list_ports.comports():
        description = port.description or ""
        manufacturer = port.manufacturer or ""
        hwid = port.hwid or ""
        haystack = " ".join([description, manufacturer, hwid]).lower()

        if "bluetooth" in haystack:
            continue

        candidates.append(
            PortCandidate(
                device=port.device,
                description=description,
                manufacturer=manufacturer,
                hwid=hwid,
            )
        )

    return candidates


def probe_port(device: str, baud: int, timeout: float, attempts: int = 6) -> bool:
    try:
        with serial.Serial(device, baud, timeout=timeout) as ser:
            ser.reset_input_buffer()
            for _ in range(attempts):
                raw = ser.readline()
                if not raw:
                    continue

                line = raw.decode("utf-8", errors="replace").strip()
                if line and looks_like_message(line):
                    return True
    except Exception:
        return False

    return False


def choose_port(candidates: list[PortCandidate], baud: int, timeout: float) -> Optional[str]:
    if not candidates:
        return None

    if len(candidates) == 1:
        return candidates[0].device

    likely_devices = [
        candidate.device
        for candidate in candidates
        if probe_port(candidate.device, baud, timeout)
    ]

    if len(likely_devices) == 1:
        return likely_devices[0]

    print("Available serial ports:")
    for index, candidate in enumerate(candidates, start=1):
        details = " - ".join(filter(None, [candidate.description, candidate.manufacturer]))
        if details:
            print(f"  {index}. {candidate.device} ({details})")
        else:
            print(f"  {index}. {candidate.device}")

    try:
        choice = input("Select port number: ").strip()
    except EOFError:
        return None

    if not choice.isdigit():
        return None

    selected_index = int(choice) - 1
    if selected_index < 0 or selected_index >= len(candidates):
        return None

    return candidates[selected_index].device


def main() -> int:
    parser = argparse.ArgumentParser(description="Bridge micro:bit serial messages to Volcano API")
    parser.add_argument("--port", help="Serial port, e.g. COM5. If omitted, the script will try to detect it.")
    parser.add_argument("--baud", type=int, default=115200, help="Serial baud rate (default: 115200)")
    parser.add_argument(
        "--api-base-url",
        default="https://volcanolesson-b6eccdg8dqe7gbhx.uksouth-01.azurewebsites.net/api",
        help="API base URL (default: https://volcanolesson-b6eccdg8dqe7gbhx.uksouth-01.azurewebsites.net/api)",
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

    api_base_url = args.api_base_url.strip()
    if api_base_url.startswith("http://") and "azurewebsites.net" in api_base_url:
        # Azure Functions typically enforces HTTPS; avoid POST redirect behavior that can break requests.
        api_base_url = "https://" + api_base_url[len("http://"):]

    port = args.port
    if not port:
        candidates = list_candidate_ports()
        port = choose_port(candidates, args.baud, args.serial_timeout)
        if not port:
            print("[ERR] Unable to detect a serial port automatically.")
            if candidates:
                print("Use --port COMx to choose one explicitly.")
            else:
                print("No serial ports were found.")
            return 1

    print("Starting micro:bit serial bridge")
    print(f"Port: {port}, baud: {args.baud}")
    print(f"API:  {api_base_url}")
    print_help()

    try:
        ser = serial.Serial(port, args.baud, timeout=args.serial_timeout)
    except Exception as exc:
        print(f"[ERR] Unable to open serial port {port}: {exc}")
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
                    reset_log(api_base_url, args.http_timeout)
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
                    post_log(api_base_url, parsed, args.http_timeout)
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
