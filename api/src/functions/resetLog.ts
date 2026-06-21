import { app, type HttpRequest, type HttpResponseInit } from "@azure/functions";

import { clearLogEntries } from "../lib/logStore.js";

export async function resetLog(_request: HttpRequest): Promise<HttpResponseInit> {
  try {
    await clearLogEntries();

    return {
      status: 200,
      jsonBody: {
        ok: true,
        message: "Log cleared."
      }
    };
  } catch (error) {
    return {
      status: 500,
      jsonBody: {
        error: "Unable to clear the log.",
        details: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

app.http("resetLog", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "ResetLog",
  handler: resetLog
});