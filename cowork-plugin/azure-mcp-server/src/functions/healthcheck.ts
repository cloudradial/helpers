import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

/**
 * GET /api/healthcheck
 * Anonymous diagnostic endpoint — no function key required.
 * Returns config status (whether API keys are set) and the base URL.
 */
async function healthcheck(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const publicKey = process.env.CLOUDRADIAL_PUBLIC_KEY || "";
  const privateKey = process.env.CLOUDRADIAL_PRIVATE_KEY || "";
  const baseUrl = process.env.CLOUDRADIAL_BASE_URL || "https://api.us.cloudradial.com";

  const configured = publicKey.length > 0 && privateKey.length > 0;

  return {
    jsonBody: {
      status: configured ? "ok" : "missing_credentials",
      configured,
      baseUrl,
      timestamp: new Date().toISOString(),
      message: configured
        ? "CloudRadial API keys are configured. Ready to accept requests."
        : "CloudRadial API keys are not set. Add CLOUDRADIAL_PUBLIC_KEY and CLOUDRADIAL_PRIVATE_KEY to App Settings.",
    },
  };
}

app.http("healthcheck", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "healthcheck",
  handler: healthcheck,
});
