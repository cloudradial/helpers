#!/usr/bin/env node

/**
 * CloudRadial UCP Portal MCP Server
 *
 * Wraps the CloudRadial API V2 (https://api.us.cloudradial.com)
 * using HTTP Basic auth (public key / private key).
 *
 * Exposes tools for managing companies, users, articles, endpoints,
 * catalogs, assessments, feedback, services, courses, and more.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ── Config ──────────────────────────────────────────────────────────────────
const BASE_URL = process.env.CLOUDRADIAL_BASE_URL || "https://api.us.cloudradial.com";
const PUBLIC_KEY = process.env.CLOUDRADIAL_PUBLIC_KEY || "";
const PRIVATE_KEY = process.env.CLOUDRADIAL_PRIVATE_KEY || "";

if (!PUBLIC_KEY || !PRIVATE_KEY) {
  console.error("ERROR: CLOUDRADIAL_PUBLIC_KEY and CLOUDRADIAL_PRIVATE_KEY env vars are required.");
  process.exit(1);
}

const AUTH_HEADER = "Basic " + Buffer.from(`${PUBLIC_KEY}:${PRIVATE_KEY}`).toString("base64");

// ── HTTP helpers ────────────────────────────────────────────────────────────
async function apiRequest(method, path, { query, body } = {}) {
  let url = `${BASE_URL}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    }
    const qs = params.toString();
    if (qs) url += (url.includes("?") ? "&" : "?") + qs;
  }

  const opts = {
    method,
    headers: {
      Authorization: AUTH_HEADER,
      Accept: "application/json",
    },
  };

  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    opts.headers["Content-Type"] = method === "PATCH" ? "application/json-patch+json" : "application/json";
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url, opts);
  const text = await res.text();

  if (!res.ok) {
    return { error: true, status: res.status, statusText: res.statusText, body: text };
  }

  try {
    return JSON.parse(text);
  } catch {
    return text || { success: true };
  }
}

// ── Resource registry ───────────────────────────────────────────────────────
// Each resource: { singular, plural, odataPath, itemPath, idParam, idType }
const RESOURCES = {
  company:                { singular: "company",                plural: "companies",                  odataPath: "/v2/odata/company",             itemPath: "/v2/company/{id}",                        idParam: "id",         idType: "number" },
  user:                   { singular: "user",                   plural: "users",                      odataPath: "/v2/odata/user",                itemPath: "/v2/user/{id}",                           idParam: "id",         idType: "string" },
  article:                { singular: "article",                plural: "articles",                   odataPath: "/v2/odata/article",             itemPath: "/v2/article/{id}",                        idParam: "id",         idType: "number" },
  endpoint:               { singular: "endpoint",               plural: "endpoints",                  odataPath: "/v2/odata/endpoint",            itemPath: "/v2/endpoint/{id}",                       idParam: "id",         idType: "number" },
  catalog:                { singular: "catalog",                plural: "catalogs",                   odataPath: "/v2/odata/catalog",             itemPath: "/v2/catalog/{id}",                        idParam: "id",         idType: "number" },
  catalog_question:       { singular: "catalog question",       plural: "catalog questions",          odataPath: "/v2/odata/catalogquestion",     itemPath: "/v2/catalogquestion/{id}",                idParam: "id",         idType: "number" },
  assessment:             { singular: "assessment",             plural: "assessments",                odataPath: "/v2/odata/assessment",          itemPath: null,                                      idParam: null,         idType: null },
  feedback:               { singular: "feedback",               plural: "feedback",                   odataPath: "/v2/odata/feedback",            itemPath: "/v2/feedback/{id}",                       idParam: "id",         idType: "number" },
  service:                { singular: "service",                plural: "services",                   odataPath: "/v2/odata/service",             itemPath: "/v2/service/{id}",                        idParam: "id",         idType: "number" },
  service_install:        { singular: "service install",        plural: "service installs",           odataPath: "/v2/odata/serviceinstall",      itemPath: "/v2/serviceinstall/{id}",                 idParam: "id",         idType: "number" },
  domain:                 { singular: "domain",                 plural: "domains",                    odataPath: "/v2/odata/domain",              itemPath: "/v2/domain/{id}",                         idParam: "id",         idType: "number" },
  course:                 { singular: "course",                 plural: "courses",                    odataPath: "/v2/odata/course",              itemPath: "/v2/course/{id}",                         idParam: "id",         idType: "number" },
  course_enrollment:      { singular: "course enrollment",      plural: "course enrollments",         odataPath: "/v2/odata/courseenrollment",    itemPath: "/v2/courseenrollment/{id}",                idParam: "id",         idType: "number" },
  course_lesson:          { singular: "course lesson",          plural: "course lessons",             odataPath: "/v2/odata/courselesson",        itemPath: "/v2/courselesson/{id}",                   idParam: "id",         idType: "number" },
  menu:                   { singular: "menu",                   plural: "menus",                      odataPath: "/v2/odata/menu",                itemPath: "/v2/menu/{id}",                           idParam: "id",         idType: "number" },
  product:                { singular: "product",                plural: "products",                   odataPath: "/v2/odata/product",             itemPath: "/v2/product/{id}",                        idParam: "id",         idType: "number" },
  archive_item:           { singular: "archive item",           plural: "archive items",              odataPath: "/v2/odata/archiveitem",         itemPath: "/v2/archiveitem/{archiveId}/{itemId}",    idParam: "composite",  idType: "composite" },
  certificate:            { singular: "certificate",            plural: "certificates",               odataPath: "/v2/odata/certificate",         itemPath: "/v2/certificate/{id}",                    idParam: "id",         idType: "number" },
  company_group:          { singular: "company group",          plural: "company groups",             odataPath: "/v2/odata/companygroup",        itemPath: "/v2/companygroup/{id}",                   idParam: "id",         idType: "number" },
  quickstart:             { singular: "quickstart",             plural: "quickstarts",                odataPath: "/v2/odata/quickstart",          itemPath: "/v2/quickstart/{id}",                     idParam: "id",         idType: "number" },
  flexible_asset:         { singular: "flexible asset",         plural: "flexible assets",            odataPath: "/v2/odata/flexibleasset",       itemPath: "/v2/flexibleasset/{id}",                  idParam: "id",         idType: "number" },
  flexible_asset_type:    { singular: "flexible asset type",    plural: "flexible asset types",       odataPath: "/v2/odata/flexibleassettype",   itemPath: "/v2/flexibleassettype/{id}",              idParam: "id",         idType: "number" },
  flexible_asset_field:   { singular: "flexible asset field",   plural: "flexible asset fields",      odataPath: "/v2/odata/flexibleassetfield",  itemPath: null,                                      idParam: null,         idType: null },
  endpoint_application:   { singular: "endpoint application",   plural: "endpoint applications",      odataPath: "/v2/odata/endpointapplication", itemPath: "/v2/endpointapplication/{id}",             idParam: "id",         idType: "number" },
  endpoint_custom_property: { singular: "endpoint custom property", plural: "endpoint custom properties", odataPath: "/v2/odata/endpointcustomproperty", itemPath: "/v2/endpointcustomproperty/{id}",  idParam: "id",         idType: "number" },
  media:                  { singular: "media",                  plural: "media",                      odataPath: "/v2/odata/media",               itemPath: "/v2/media/{id}",                          idParam: "id",         idType: "number" },
  token:                  { singular: "token",                  plural: "tokens",                     odataPath: "/v2/odata/token",               itemPath: "/v2/token/{id}",                          idParam: "id",         idType: "number" },
};

const RESOURCE_NAMES = Object.keys(RESOURCES);

// ── MCP Server ──────────────────────────────────────────────────────────────
const server = new McpServer({
  name: "cloudradial-ucp",
  version: "0.1.0",
  description: "CloudRadial UCP Portal API — manage companies, users, articles, endpoints, and more.",
});

// ── Tool: list_resources ────────────────────────────────────────────────────
server.tool(
  "list_resources",
  `List resources from CloudRadial. Supports OData query parameters for filtering, sorting, pagination, and field selection.

Available resource types: ${RESOURCE_NAMES.join(", ")}

OData examples:
  - $filter: "name eq 'Acme Corp'" or "companyId eq 42"
  - $select: "name,companyId,endpointCount"
  - $orderby: "name asc" or "companyId desc"
  - $top: 10 (limit results)
  - $skip: 20 (offset for pagination)
  - $expand: "endpoints" (include related entities)`,
  {
    resource_type: z.enum(RESOURCE_NAMES).describe("The type of resource to list"),
    filter: z.string().optional().describe("OData $filter expression (e.g., \"companyId eq 42\")"),
    select: z.string().optional().describe("OData $select — comma-separated field names"),
    orderby: z.string().optional().describe("OData $orderby (e.g., \"name asc\")"),
    top: z.number().optional().describe("OData $top — max number of results"),
    skip: z.number().optional().describe("OData $skip — offset for pagination"),
    expand: z.string().optional().describe("OData $expand — include related entities"),
    search: z.string().optional().describe("OData $search — free-text search"),
  },
  async ({ resource_type, filter, select, orderby, top, skip, expand, search }) => {
    const res = RESOURCES[resource_type];
    const query = {};
    if (filter) query["$filter"] = filter;
    if (select) query["$select"] = select;
    if (orderby) query["$orderby"] = orderby;
    if (top) query["$top"] = String(top);
    if (skip) query["$skip"] = String(skip);
    if (expand) query["$expand"] = expand;
    if (search) query["$search"] = search;

    const result = await apiRequest("GET", res.odataPath, { query });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ── Tool: count_resources ───────────────────────────────────────────────────
server.tool(
  "count_resources",
  "Get the count of resources, optionally filtered. Returns a number.",
  {
    resource_type: z.enum(RESOURCE_NAMES).describe("The type of resource to count"),
    filter: z.string().optional().describe("OData $filter expression"),
  },
  async ({ resource_type, filter }) => {
    const res = RESOURCES[resource_type];
    const query = {};
    if (filter) query["$filter"] = filter;
    const result = await apiRequest("GET", res.odataPath + "/$count", { query });
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// ── Tool: get_resource ──────────────────────────────────────────────────────
server.tool(
  "get_resource",
  "Get a single resource by its ID. For archive items, provide both archive_id and item_id.",
  {
    resource_type: z.enum(RESOURCE_NAMES).describe("The type of resource"),
    id: z.union([z.string(), z.number()]).describe("The resource ID"),
    archive_id: z.union([z.string(), z.number()]).optional().describe("Archive ID (only for archive_item type)"),
  },
  async ({ resource_type, id, archive_id }) => {
    const res = RESOURCES[resource_type];
    if (!res.itemPath) {
      return { content: [{ type: "text", text: `Error: get by ID is not supported for ${resource_type}` }] };
    }
    let path = res.itemPath;
    if (res.idType === "composite") {
      path = path.replace("{archiveId}", String(archive_id)).replace("{itemId}", String(id));
    } else {
      path = path.replace("{id}", String(id));
    }
    const result = await apiRequest("GET", path);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ── Tool: create_resource ───────────────────────────────────────────────────
server.tool(
  "create_resource",
  `Create a new resource in CloudRadial. Pass the resource data as a JSON object.

Key resource creation fields:
  - company: { name (required), partnerId, psaKey, psaIdentifier, territory, accountManager }
  - article: { title, body, companyId, menuItemId, isPublished }
  - user: { email, firstName, lastName, companyId, department, title }
  - catalog: { name, description, companyId }
  - endpoint: { name, companyId, operatingSystem, manufacturer, model }
  - service: { name, description, companyId }
  - domain: { name, companyId }`,
  {
    resource_type: z.enum(RESOURCE_NAMES).describe("The type of resource to create"),
    data: z.record(z.any()).describe("JSON object with the resource fields"),
  },
  async ({ resource_type, data }) => {
    const resourceKey = resource_type.replace(/_/g, "");
    const result = await apiRequest("POST", `/v2/${resourceKey}`, { body: data });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ── Tool: update_resource ───────────────────────────────────────────────────
server.tool(
  "update_resource",
  "Fully update (PUT) or partially update (PATCH) a resource by ID.",
  {
    resource_type: z.enum(RESOURCE_NAMES).describe("The type of resource to update"),
    id: z.union([z.string(), z.number()]).describe("The resource ID"),
    data: z.record(z.any()).describe("JSON object with fields to update"),
    method: z.enum(["PUT", "PATCH"]).default("PUT").describe("PUT for full replace, PATCH for partial update"),
    archive_id: z.union([z.string(), z.number()]).optional().describe("Archive ID (only for archive_item)"),
  },
  async ({ resource_type, id, data, method, archive_id }) => {
    const res = RESOURCES[resource_type];
    if (!res.itemPath) {
      return { content: [{ type: "text", text: `Error: update is not supported for ${resource_type}` }] };
    }
    let path = res.itemPath;
    if (res.idType === "composite") {
      path = path.replace("{archiveId}", String(archive_id)).replace("{itemId}", String(id));
    } else {
      path = path.replace("{id}", String(id));
    }
    const result = await apiRequest(method, path, { body: data });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ── Tool: delete_resource ───────────────────────────────────────────────────
server.tool(
  "delete_resource",
  "Delete a resource by ID.",
  {
    resource_type: z.enum(RESOURCE_NAMES).describe("The type of resource to delete"),
    id: z.union([z.string(), z.number()]).describe("The resource ID"),
    archive_id: z.union([z.string(), z.number()]).optional().describe("Archive ID (only for archive_item)"),
  },
  async ({ resource_type, id, archive_id }) => {
    const res = RESOURCES[resource_type];
    if (!res.itemPath) {
      return { content: [{ type: "text", text: `Error: delete is not supported for ${resource_type}` }] };
    }
    let path = res.itemPath;
    if (res.idType === "composite") {
      path = path.replace("{archiveId}", String(archive_id)).replace("{itemId}", String(id));
    } else {
      path = path.replace("{id}", String(id));
    }
    const result = await apiRequest("DELETE", path);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ── Tool: company_overview ──────────────────────────────────────────────────
server.tool(
  "company_overview",
  "Get a comprehensive overview of a company: details, user count, endpoint count, and recent articles. Great for preparing for partner meetings.",
  {
    company_id: z.number().describe("The company ID"),
  },
  async ({ company_id }) => {
    const [company, users, endpoints, articles, feedback] = await Promise.all([
      apiRequest("GET", `/v2/company/${company_id}`),
      apiRequest("GET", "/v2/odata/user/$count", { query: { "$filter": `companyId eq ${company_id}` } }),
      apiRequest("GET", "/v2/odata/endpoint/$count", { query: { "$filter": `companyId eq ${company_id}` } }),
      apiRequest("GET", "/v2/odata/article", { query: { "$filter": `companyId eq ${company_id}`, "$top": "5", "$orderby": "articleId desc", "$select": "articleId,title,isPublished" } }),
      apiRequest("GET", "/v2/odata/feedback", { query: { "$filter": `companyId eq ${company_id}`, "$top": "5", "$orderby": "feedbackId desc" } }),
    ]);

    const overview = {
      company,
      stats: {
        userCount: users,
        endpointCount: endpoints,
      },
      recentArticles: articles,
      recentFeedback: feedback,
    };

    return { content: [{ type: "text", text: JSON.stringify(overview, null, 2) }] };
  }
);

// ── Tool: search_companies ──────────────────────────────────────────────────
server.tool(
  "search_companies",
  "Search for companies by name. Quick way to find a partner/client.",
  {
    name: z.string().describe("Company name or partial name to search for"),
  },
  async ({ name }) => {
    const result = await apiRequest("GET", "/v2/odata/company", {
      query: { "$filter": `contains(tolower(name), '${name.toLowerCase().replace(/'/g, "''")}')`, "$select": "companyId,name,psaIdentifier,endpointCount", "$top": "20" },
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ── Tool: user_lookup ───────────────────────────────────────────────────────
server.tool(
  "user_lookup",
  "Look up users by email, name, or company. Useful for finding specific portal users.",
  {
    email: z.string().optional().describe("Email address to search for"),
    name: z.string().optional().describe("First or last name to search for"),
    company_id: z.number().optional().describe("Company ID to filter users by"),
    top: z.number().optional().default(20).describe("Max results"),
  },
  async ({ email, name, company_id, top }) => {
    const filters = [];
    if (email) filters.push(`contains(tolower(email), '${email.toLowerCase().replace(/'/g, "''")}')`);
    if (name) filters.push(`(contains(tolower(firstName), '${name.toLowerCase().replace(/'/g, "''")}') or contains(tolower(lastName), '${name.toLowerCase().replace(/'/g, "''")}'))`);
    if (company_id) filters.push(`companyId eq ${company_id}`);

    const query = { "$top": String(top || 20) };
    if (filters.length) query["$filter"] = filters.join(" and ");

    const result = await apiRequest("GET", "/v2/odata/user", { query });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ── Tool: manage_tokens ─────────────────────────────────────────────────────
server.tool(
  "manage_tokens",
  "List or create API tokens. Useful for managing partner API access.",
  {
    action: z.enum(["list", "create", "get", "revoke"]).describe("Action to perform"),
    token_id: z.number().optional().describe("Token ID (for get/revoke)"),
    data: z.record(z.any()).optional().describe("Token data (for create)"),
  },
  async ({ action, token_id, data }) => {
    let result;
    switch (action) {
      case "list":
        result = await apiRequest("GET", "/v2/odata/token");
        break;
      case "create":
        result = await apiRequest("POST", "/v2/token", { body: data || {} });
        break;
      case "get":
        result = await apiRequest("GET", `/v2/token/${token_id}`);
        break;
      case "revoke":
        result = await apiRequest("DELETE", `/v2/token/${token_id}`);
        break;
    }
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ── Tool: raw_api_call ──────────────────────────────────────────────────────
server.tool(
  "raw_api_call",
  "Make a raw API call to any CloudRadial V2 endpoint. Use for endpoints not covered by other tools, or for advanced use cases.",
  {
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).describe("HTTP method"),
    path: z.string().describe("API path (e.g., /v2/odata/company or /v2/company/123)"),
    query: z.record(z.string()).optional().describe("Query parameters as key-value pairs"),
    body: z.record(z.any()).optional().describe("Request body (for POST/PUT/PATCH)"),
  },
  async ({ method, path, query, body }) => {
    const result = await apiRequest(method, path, { query, body });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ── Start ───────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
