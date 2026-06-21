import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";

import { appendLogEntry } from "../lib/logStore.js";

interface LogLocationBody {
  LocationID?: string;
  Message?: string;
  locationId?: string;
  message?: string;
}

export async function logLocation(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const body = (await request.json()) as LogLocationBody;
    const locationId = (body.LocationID ?? body.locationId ?? "").trim();
    const message = (body.Message ?? body.message ?? "").trim();

    if (!locationId || !message) {
      return {
        status: 400,
        jsonBody: {
          error: "LocationID and Message are required."
        }
      };
    }

    const entry = await appendLogEntry(locationId, message);
    context.log(`Logged entry for ${locationId}`);

    return {
      status: 201,
      jsonBody: {
        ok: true,
        entry
      }
    };
  } catch (error) {
    return {
      status: 500,
      jsonBody: {
        error: "Unable to write the log entry.",
        details: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

app.http("logLocation", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "LogLocation",
  handler: logLocation
});