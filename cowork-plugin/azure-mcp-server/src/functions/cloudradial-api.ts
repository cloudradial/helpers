import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL =
  process.env.CLOUDRADIAL_BASE_URL || "https://api.us.cloudradial.com";

function getAuthHeader(): string {
  const pub = process.env.CLOUDRADIAL_PUBLIC_KEY || "";
  const priv = process.env.CLOUDRADIAL_PRIVATE_KEY || "";
  if (!pub || !priv) {
    throw new Error(
      "Missing CLOUDRADIAL_PUBLIC_KEY or CLOUDRADIAL_PRIVATE_KEY in App Settings."
    );
  }
  return "Basic " + Buffer.from(`${pub}:${priv}`).toString("base64");
}

// ---------------------------------------------------------------------------
// Resource type → API path mappings
// ---------------------------------------------------------------------------

interface ResourceConfig {
  odataPath: string;       // GET list/count path
  itemPath: string;        // GET/POST/PUT/PATCH/DELETE single-item path
  idParam: string;         // URL parameter name for the primary ID
}

const RESOURCE_MAP: Record<string, ResourceConfig> = {
  company:                    { odataPath: "company",                itemPath: "company",                idParam: "id" },
  user:                       { odataPath: "user",                   itemPath: "user",                   idParam: "id" },
  article:                    { odataPath: "article",                itemPath: "article",                idParam: "articleId" },
  endpoint:                   { odataPath: "endpoint",               itemPath: "endpoint/id",            idParam: "endpointId" },
  catalog:                    { odataPath: "catalog",                itemPath: "catalog",                idParam: "id" },
  catalog_question:           { odataPath: "catalogquestion",        itemPath: "catalogquestion",        idParam: "id" },
  assessment:                 { odataPath: "assessment",             itemPath: "",                       idParam: "" },  // No get-by-ID
  feedback:                   { odataPath: "feedback",               itemPath: "feedback",               idParam: "id" },
  service:                    { odataPath: "service",                itemPath: "service",                idParam: "id" },
  service_install:            { odataPath: "serviceinstall",         itemPath: "serviceinstall",         idParam: "" },  // Composite key
  domain:                     { odataPath: "domain",                 itemPath: "domain",                 idParam: "id" },
  course:                     { odataPath: "course",                 itemPath: "course",                 idParam: "id" },
  course_enrollment:          { odataPath: "courseenrollment",       itemPath: "courseenrollment",       idParam: "id" },
  course_lesson:              { odataPath: "courselesson",           itemPath: "courselesson",           idParam: "courseLessonId" },
  menu:                       { odataPath: "menu",                   itemPath: "menu",                   idParam: "menuId" },
  product:                    { odataPath: "product",                itemPath: "product",                idParam: "id" },
  archive_item:               { odataPath: "archiveitem",            itemPath: "archiveitem",            idParam: "" },  // Composite key
  certificate:                { odataPath: "certificate",            itemPath: "certificate",            idParam: "id" },
  company_group:              { odataPath: "companygroup",           itemPath: "companygroup",           idParam: "companyGroupId" },
  quickstart:                 { odataPath: "quickstart",             itemPath: "quickstart",             idParam: "quickstartId" },
  flexible_asset:             { odataPath: "flexibleasset",          itemPath: "flexible-asset",         idParam: "id" },
  flexible_asset_type:        { odataPath: "flexibleassettype",      itemPath: "flexible-asset-type",    idParam: "id" },
  flexible_asset_field:       { odataPath: "flexibleassetfield",     itemPath: "flexible-asset-field",   idParam: "id" },
  endpoint_application:       { odataPath: "endpointapplication",    itemPath: "endpointapplication",    idParam: "id" },
  endpoint_custom_property:   { odataPath: "endpointcustomproperty", itemPath: "",                       idParam: "" },  // Complex paths
  media:                      { odataPath: "media",                  itemPath: "media",                  idParam: "id" },
  token:                      { odataPath: "token",                  itemPath: "token",                  idParam: "tokenName" },
};

// ---------------------------------------------------------------------------
// Helper: call CloudRadial API
// ---------------------------------------------------------------------------

async function callApi(
  method: string,
  path: string,
  query?: Record<string, string>,
  body?: unknown
): Promise<{ status: number; data: unknown }> {
  const url = new URL(path, BASE_URL);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, v);
    }
  }

  const headers: Record<string, string> = {
    Authorization: getAuthHeader(),
    Accept: "application/json",
  };

  const init: RequestInit = { method, headers };

  if (body && ["POST", "PUT", "PATCH"].includes(method)) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  const resp = await fetch(url.toString(), init);

  // Handle $count (returns plain text number)
  const contentType = resp.headers.get("content-type") || "";
  let data: unknown;
  if (contentType.includes("application/json")) {
    data = await resp.json();
  } else {
    const text = await resp.text();
    // Try to parse as number (for $count)
    const num = Number(text);
    data = isNaN(num) ? text : num;
  }

  return { status: resp.status, data };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function param(request: HttpRequest, name: string): string {
  return request.query.get(name) || "";
}

function jsonError(
  message: string,
  status: number = 400
): HttpResponseInit {
  return {
    status,
    jsonBody: { error: true, message, status },
  };
}

// ---------------------------------------------------------------------------
// Operation handlers
// ---------------------------------------------------------------------------

async function searchCompanies(request: HttpRequest): Promise<HttpResponseInit> {
  const name = param(request, "name");
  if (!name) return jsonError("Missing required parameter: name");

  const filter = `contains(tolower(name), '${name.toLowerCase().replace(/'/g, "''")}')`;
  const result = await callApi("GET", "/v2/odata/company", {
    $filter: filter,
    $select: "companyId,name,psaIdentifier,endpointCount",
    $top: "50",
  });

  return { status: result.status, jsonBody: result.data };
}

async function companyOverview(request: HttpRequest): Promise<HttpResponseInit> {
  const companyId = param(request, "company_id");
  if (!companyId) return jsonError("Missing required parameter: company_id");

  // Fetch company, users, endpoints, articles, and feedback in parallel
  const [company, users, endpoints, articles, feedback] = await Promise.all([
    callApi("GET", `/v2/company/${companyId}`),
    callApi("GET", "/v2/odata/user/$count", { $filter: `companyId eq ${companyId}` }),
    callApi("GET", "/v2/odata/endpoint/$count", { $filter: `companyId eq ${companyId}` }),
    callApi("GET", "/v2/odata/article", {
      $filter: `companyId eq ${companyId}`,
      $orderby: "dateCreated desc",
      $top: "5",
    }),
    callApi("GET", "/v2/odata/feedback", {
      $filter: `companyId eq ${companyId}`,
      $orderby: "dateCreated desc",
      $top: "5",
    }),
  ]);

  if (company.status !== 200) {
    return { status: company.status, jsonBody: company.data };
  }

  return {
    jsonBody: {
      company: company.data,
      counts: {
        userCount: users.data,
        endpointCount: endpoints.data,
      },
      recentArticles: articles.data,
      recentFeedback: feedback.data,
    },
  };
}

async function listResources(request: HttpRequest): Promise<HttpResponseInit> {
  const resourceType = param(request, "resource_type");
  const config = RESOURCE_MAP[resourceType];
  if (!config) return jsonError(`Unknown resource_type: ${resourceType}. Valid types: ${Object.keys(RESOURCE_MAP).join(", ")}`);

  const query: Record<string, string> = {};
  for (const key of ["$filter", "$select", "$orderby", "$top", "$skip", "$expand", "$search"]) {
    const val = param(request, key) || param(request, key.substring(1)); // Accept with or without $
    if (val) query[key] = val;
  }

  const result = await callApi("GET", `/v2/odata/${config.odataPath}`, query);
  return { status: result.status, jsonBody: result.data };
}

async function countResources(request: HttpRequest): Promise<HttpResponseInit> {
  const resourceType = param(request, "resource_type");
  const config = RESOURCE_MAP[resourceType];
  if (!config) return jsonError(`Unknown resource_type: ${resourceType}`);

  const query: Record<string, string> = {};
  const filter = param(request, "filter") || param(request, "$filter");
  if (filter) query["$filter"] = filter;

  const result = await callApi("GET", `/v2/odata/${config.odataPath}/$count`, query);
  return { status: result.status, jsonBody: { count: result.data } };
}

async function getResource(request: HttpRequest): Promise<HttpResponseInit> {
  const resourceType = param(request, "resource_type");
  const config = RESOURCE_MAP[resourceType];
  if (!config) return jsonError(`Unknown resource_type: ${resourceType}`);

  const id = param(request, "id");

  // Handle special cases
  if (resourceType === "archive_item") {
    const archiveId = param(request, "archive_id");
    if (!archiveId || !id) return jsonError("archive_item requires both archive_id and id");
    const result = await callApi("GET", `/v2/archiveitem/${archiveId}/${id}`);
    return { status: result.status, jsonBody: result.data };
  }

  if (resourceType === "service_install") {
    const endpointId = param(request, "endpoint_id");
    const serviceId = param(request, "service_id");
    if (!endpointId || !serviceId)
      return jsonError("service_install requires endpoint_id and service_id");
    const result = await callApi("GET", `/v2/serviceinstall/${endpointId}/${serviceId}`);
    return { status: result.status, jsonBody: result.data };
  }

  if (!config.itemPath) return jsonError(`get_resource is not supported for ${resourceType}`);
  if (!id) return jsonError("Missing required parameter: id");

  const result = await callApi("GET", `/v2/${config.itemPath}/${id}`);
  return { status: result.status, jsonBody: result.data };
}

async function createResource(
  request: HttpRequest
): Promise<HttpResponseInit> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid JSON body");
  }

  const resourceType = (body.resource_type as string) || param(request, "resource_type");
  const config = RESOURCE_MAP[resourceType];
  if (!config) return jsonError(`Unknown resource_type: ${resourceType}`);
  if (!config.itemPath) return jsonError(`create is not supported for ${resourceType}`);

  const data = body.data || body;
  // Remove our meta-fields from the data sent to CloudRadial
  const cleanData = { ...(data as Record<string, unknown>) };
  delete cleanData.resource_type;
  delete cleanData.data;

  const result = await callApi("POST", `/v2/${config.itemPath}`, undefined, cleanData);
  return { status: result.status, jsonBody: result.data };
}

async function updateResource(
  request: HttpRequest
): Promise<HttpResponseInit> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid JSON body");
  }

  const resourceType = (body.resource_type as string) || param(request, "resource_type");
  const config = RESOURCE_MAP[resourceType];
  if (!config) return jsonError(`Unknown resource_type: ${resourceType}`);
  if (!config.itemPath) return jsonError(`update is not supported for ${resourceType}`);

  const id = (body.id as string) || param(request, "id");
  if (!id) return jsonError("Missing required parameter: id");

  const method = ((body.method as string) || "PUT").toUpperCase();
  if (!["PUT", "PATCH"].includes(method))
    return jsonError("method must be PUT or PATCH");

  const data = body.data || {};
  const cleanData = { ...(data as Record<string, unknown>) };

  // Handle special composite-key resources
  let path: string;
  if (resourceType === "archive_item") {
    const archiveId = (body.archive_id as string) || param(request, "archive_id");
    if (!archiveId) return jsonError("archive_item update requires archive_id");
    path = `/v2/archiveitem/${archiveId}/${id}`;
  } else if (resourceType === "service_install") {
    const endpointId = (body.endpoint_id as string) || param(request, "endpoint_id");
    if (!endpointId) return jsonError("service_install update requires endpoint_id (and id = serviceId)");
    path = `/v2/serviceinstall/${endpointId}/${id}`;
  } else {
    path = `/v2/${config.itemPath}/${id}`;
  }

  const result = await callApi(method, path, undefined, cleanData);
  return { status: result.status, jsonBody: result.data };
}

async function deleteResource(
  request: HttpRequest
): Promise<HttpResponseInit> {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    // Body is optional for delete — fall back to query params
  }

  const resourceType = (body.resource_type as string) || param(request, "resource_type");
  const config = RESOURCE_MAP[resourceType];
  if (!config) return jsonError(`Unknown resource_type: ${resourceType}`);
  if (!config.itemPath) return jsonError(`delete is not supported for ${resourceType}`);

  const id = (body.id as string) || param(request, "id");
  if (!id) return jsonError("Missing required parameter: id");

  // Handle special composite-key resources
  let path: string;
  if (resourceType === "archive_item") {
    const archiveId = (body.archive_id as string) || param(request, "archive_id");
    if (!archiveId) return jsonError("archive_item delete requires archive_id");
    path = `/v2/archiveitem/${archiveId}/${id}`;
  } else if (resourceType === "service_install") {
    const endpointId = (body.endpoint_id as string) || param(request, "endpoint_id");
    if (!endpointId) return jsonError("service_install delete requires endpoint_id (and id = serviceId)");
    path = `/v2/serviceinstall/${endpointId}/${id}`;
  } else {
    path = `/v2/${config.itemPath}/${id}`;
  }

  const result = await callApi("DELETE", path);
  return { status: result.status, jsonBody: result.data || { deleted: true } };
}

async function userLookup(request: HttpRequest): Promise<HttpResponseInit> {
  const email = param(request, "email");
  const name = param(request, "name");
  const companyId = param(request, "company_id");
  const top = param(request, "top") || "20";

  const filters: string[] = [];
  if (email) filters.push(`contains(tolower(email), '${email.toLowerCase().replace(/'/g, "''")}')`);
  if (name) {
    const safeName = name.toLowerCase().replace(/'/g, "''");
    filters.push(`(contains(tolower(firstName), '${safeName}') or contains(tolower(lastName), '${safeName}'))`);
  }
  if (companyId) filters.push(`companyId eq ${companyId}`);

  if (filters.length === 0)
    return jsonError("At least one of email, name, or company_id is required");

  const result = await callApi("GET", "/v2/odata/user", {
    $filter: filters.join(" and "),
    $top: top,
  });
  return { status: result.status, jsonBody: result.data };
}

async function manageTokens(request: HttpRequest): Promise<HttpResponseInit> {
  const action = param(request, "action");

  switch (action) {
    case "list": {
      const result = await callApi("GET", "/v2/token");
      return { status: result.status, jsonBody: result.data };
    }
    case "get": {
      const tokenId = param(request, "token_id");
      if (!tokenId) return jsonError("Missing token_id for get action");
      const result = await callApi("GET", `/v2/token/${tokenId}`);
      return { status: result.status, jsonBody: result.data };
    }
    case "create": {
      let body: unknown;
      try { body = await request.json(); } catch { return jsonError("Invalid JSON body for token creation"); }
      const data = (body as Record<string, unknown>).data || body;
      const result = await callApi("POST", "/v2/token", undefined, data);
      return { status: result.status, jsonBody: result.data };
    }
    case "revoke": {
      const tokenId = param(request, "token_id");
      if (!tokenId) return jsonError("Missing token_id for revoke action");
      const result = await callApi("DELETE", `/v2/token/${tokenId}`);
      return { status: result.status, jsonBody: result.data || { revoked: true } };
    }
    default:
      return jsonError('Missing or invalid action. Use: list, get, create, revoke');
  }
}

async function rawApiCall(request: HttpRequest): Promise<HttpResponseInit> {
  const method = (param(request, "method") || "GET").toUpperCase();
  const path = param(request, "path");
  if (!path) return jsonError("Missing required parameter: path");

  let query: Record<string, string> | undefined;
  const queryParam = param(request, "query");
  if (queryParam) {
    try { query = JSON.parse(queryParam); } catch { return jsonError("Invalid JSON in query parameter"); }
  }

  let body: unknown;
  if (["POST", "PUT", "PATCH"].includes(method)) {
    const bodyParam = param(request, "body");
    if (bodyParam) {
      try { body = JSON.parse(bodyParam); } catch { return jsonError("Invalid JSON in body parameter"); }
    } else {
      try { body = await request.json(); } catch { /* no body is fine for some calls */ }
    }
  }

  const result = await callApi(method, path, query, body);
  return { status: result.status, jsonBody: result.data };
}

// ---------------------------------------------------------------------------
// Operation dispatcher
// ---------------------------------------------------------------------------

const OPERATIONS: Record<
  string,
  (req: HttpRequest) => Promise<HttpResponseInit>
> = {
  search_companies: searchCompanies,
  company_overview: companyOverview,
  list_resources: listResources,
  count_resources: countResources,
  get_resource: getResource,
  create_resource: createResource,
  update_resource: updateResource,
  delete_resource: deleteResource,
  user_lookup: userLookup,
  manage_tokens: manageTokens,
  raw_api_call: rawApiCall,
};

async function cloudradialHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  // Add CORS headers for Chrome JS fetch() calls
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Handle preflight
  if (request.method === "OPTIONS") {
    return { status: 204, headers: corsHeaders };
  }

  try {
    const operation = request.params.operation;
    if (!operation || !OPERATIONS[operation]) {
      return {
        ...jsonError(
          `Unknown operation: ${operation}. Available: ${Object.keys(OPERATIONS).join(", ")}`,
          404
        ),
        headers: corsHeaders,
      };
    }

    context.log(`CloudRadial API: ${request.method} ${operation}`);
    const result = await OPERATIONS[operation](request);
    return { ...result, headers: { ...corsHeaders, ...(result.headers || {}) } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    context.error("CloudRadial API error:", message);
    return {
      ...jsonError(message, 500),
      headers: corsHeaders,
    };
  }
}

// ---------------------------------------------------------------------------
// Register the function
// ---------------------------------------------------------------------------

app.http("cloudradial", {
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  authLevel: "function",
  route: "cloudradial/{operation}",
  handler: cloudradialHandler,
});
