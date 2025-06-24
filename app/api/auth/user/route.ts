import { type NextRequest, NextResponse } from "next/server"

// GET /api/auth/user - Get authenticated user
export async function GET(request: NextRequest) {
  try {
    // In a real app, you would:
    // 1. Verify authentication using Laravel Sanctum
    // 2. Return the authenticated user

    // For demo purposes, check for a mock token in cookies or headers
    const authHeader = request.headers.get("Authorization")
    const hasMockToken =
      authHeader?.includes("mock-token") || request.cookies.get("token")?.value === "mock-token-12345"

    if (hasMockToken) {
      return NextResponse.json({
        id: "1",
        name: "Demo User",
        email: "demo@example.com",
      })
    }

    // No authenticated user
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 })
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
  }
}
