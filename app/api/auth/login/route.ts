import { type NextRequest, NextResponse } from "next/server"

// POST /api/auth/login - Login user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request
    if (!body.email || !body.password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // In a real app, you would:
    // 1. Forward this request to your Laravel backend
    // 2. Laravel would handle authentication and return a token

    // For demo purposes, simulate successful login
    if (body.email === "demo@example.com" && body.password === "password") {
      return NextResponse.json({
        user: {
          id: "1",
          name: "Demo User",
          email: "demo@example.com",
        },
        token: "mock-token-12345",
      })
    }

    // Simulate failed login
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
  }
}
