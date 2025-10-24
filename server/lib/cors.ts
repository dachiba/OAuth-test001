import { NextResponse } from "next/server";
import { isOriginAllowed } from "@/lib/clients";

const ALLOWED_HEADERS = "Authorization, Content-Type";
const ALLOWED_METHODS = "GET, POST, OPTIONS";

function setCorsHeaders(response: NextResponse, origin: string | null) {
  if (origin && isOriginAllowed(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
    response.headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
    response.headers.append("Vary", "Origin");
  }
  return response;
}

export function jsonWithCors<T>(body: T, origin: string | null, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  return setCorsHeaders(res, origin);
}

export function createCorsPreflight(origin: string | null) {
  const res = new NextResponse(null, { status: 204 });
  if (origin && isOriginAllowed(origin)) {
    res.headers.set("Access-Control-Max-Age", "86400");
  }
  return setCorsHeaders(res, origin);
}
