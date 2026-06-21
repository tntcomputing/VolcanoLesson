# Volcano Lesson

This workspace contains two projects:

- `api`: an Azure Functions API with `POST /LogLocation`, `POST /ResetLog`, and `GET /GetLog`
- `web`: a Vite + React site that shows a volcano map and polls the API for outpost status

## How it works

`/LogLocation` accepts a `LocationID` and `Message`, stores the entry in the shared Azure Functions storage account, and returns the saved record.

`/ResetLog` clears the stored log.

`/GetLog` returns the log as JSON so the web app can mark outposts green when a location has reported in.

## Local development

The local API now runs as a plain Node server on port `7071`, so you do not need Azurite just to test the app locally.

### API

1. Install dependencies in `api`.
2. Start the API from the `api` folder with `npm start`.
3. Once it is running, open `http://127.0.0.1:7071/api/GetLog` in your browser.

If that URL says it cannot be reached, the API host is not running yet.

### Web

1. Install dependencies in `web`.
2. Start Vite from the `web` folder.

The web app defaults to `/api` and the Vite dev server proxies that path to `http://127.0.0.1:7071`.

## Azure deployment

- Deploy `api` to Azure Functions on the Consumption plan.
- Deploy `web` to Azure Static Web Apps free tier.
- Reuse the Functions storage account for the log blob so no separate database is needed.
- Set `VITE_API_BASE_URL` to `/api` in the web app environment when deployed to Static Web Apps.

## API examples

```bash
POST /api/LogLocation
{ "LocationID": "NorthRidge", "Message": "Radio contact restored" }
```

```bash
GET /api/GetLog
```

## Python serial bridge (micro:bit)

This project includes a Python script that watches a serial port and forwards messages to the API.

Location: `serial-bridge/microbit_bridge.py`

Expected serial line format:

`from|to|message`

The script sends:

- `POST /LogLocation` with `LocationID=from` and `Message=message`
- `POST /ResetLog` when you press `r`

### Setup

1. Install Python packages:

```bash
cd serial-bridge
pip install -r requirements.txt
```

2. Run the bridge (replace `COM5` with your micro:bit serial port):

```bash
python microbit_bridge.py --port COM5 --baud 115200 --api-base-url http://127.0.0.1:7071/api
```

### Keyboard commands while running

- `r` reset log (`POST /ResetLog`)
- `h` show help
- `q` quit