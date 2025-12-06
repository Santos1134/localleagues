export async function GET() {
  return Response.json({
    status: 'success',
    message: 'API is working!',
    timestamp: new Date().toISOString()
  })
}
