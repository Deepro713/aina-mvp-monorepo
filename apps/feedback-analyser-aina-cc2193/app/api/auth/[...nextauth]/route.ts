import { NextResponse } from "next/server";

// Sign-in was removed (auth: none). Old Auth.js URLs get a clear 404. This route can be deleted.
const gone = () =>
  NextResponse.json({ error: { code: "not_found", message: "Sign-in is not used by this app." } }, { status: 404 });

export const GET = gone;
export const POST = gone;
