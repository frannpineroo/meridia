import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

// Shared demo password for the whole app. On Vercel, /eve/v1 is routed to the
// eve service before Next.js, so agent/channels/eve.ts checks the same credentials.
export function proxy(request: NextRequest) {
  const username = process.env.DEMO_USERNAME;
  const password = process.env.DEMO_PASSWORD;

  if (!username || !password) {
    // Fail closed in production; leave local dev open when unset.
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    return new NextResponse("Auth is not configured.", { status: 503 });
  }

  if (isAuthorized(request.headers.get("authorization"), username, password)) {
    return NextResponse.next();
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Meridia", charset="UTF-8"' },
  });
}

function isAuthorized(header: string | null, username: string, password: string) {
  const encoded = header?.match(/^Basic\s+(.+)$/i)?.[1];
  if (!encoded) return false;
  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator === -1) return false;
  return (
    safeEqual(decoded.slice(0, separator), username) &&
    safeEqual(decoded.slice(separator + 1), password)
  );
}

// Hash first so both buffers have equal length for timingSafeEqual.
function safeEqual(a: string, b: string) {
  const hash = (value: string) => createHash("sha256").update(value.normalize("NFC")).digest();
  return timingSafeEqual(hash(a), hash(b));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
