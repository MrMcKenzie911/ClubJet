import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  // Simply acknowledge the auth state change
  // The client already handles the session, and cookies are automatically synced
  // We don't need to call setSession on the server as it causes infinite loops
  
  const { event } = await req.json();
  
  // Log for debugging but don't manipulate session
  console.log(`Auth event: ${event}`);
  
  return NextResponse.json({ ok: true });
}

