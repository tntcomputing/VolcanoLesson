import { app, type HttpRequest, type HttpResponseInit } from "@azure/functions";

import { getLogEntries } from "../lib/logStore.js";

export async function getLog(_request: HttpRequest): Promise<HttpResponseInit> {
  try {
    const entries = await getLogEntries();

    return {
      status: 200,
      headers: {
        "cache-control": "no-store"
      },
      jsonBody: {
        entries,
        count: entries.length
      }
    };
  } catch (error) {
    return {
      status: 500,
      jsonBody: {
        error: "Unable to read the log.",
        details: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

app.http("getLog", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "GetLog",
  handler: getLog
});