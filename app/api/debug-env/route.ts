// app/api/debug-env/route.ts
export async function GET() {
  return Response.json({
    value: process.env.DEBUG_ENV_SOURCE,
  });
}
