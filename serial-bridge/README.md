# Serial Bridge

This folder contains the Python bridge used to read micro:bit serial messages and post them to the Volcano API.

## Local setup

Install the two Python dependencies into the local `libs` folder:

```powershell
py -m pip install --target .\libs pyserial requests
```

## Run

```powershell
python microbit_bridge.py --port "COM9"
```

The script expects micro:bit messages in the form:

```text
from|to|message
```

Example:

```text
A|B|Alive
```

## Copy to another PC

Copy these items together:

1. `microbit_bridge.py`
2. `libs/`
3. `requirements.txt`

The `libs/` folder is ignored by git so the downloaded packages stay local.