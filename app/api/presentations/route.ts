import { type NextRequest, NextResponse } from "next/server"

// GET /api/presentations - Get all presentations for the authenticated user
export async function GET(request: NextRequest) {
  try {
    // In a real app, you would:
    // 1. Verify authentication using Laravel Sanctum
    // 2. Fetch presentations from your Laravel backend

    // For demo purposes, return mock data
    return NextResponse.json({
      presentations: [
        {
          id: "1",
          title: "Introduction to Smart Presentations",
          slides: 5,
          created_at: "2023-05-10T14:30:00Z",
          updated_at: "2023-05-11T09:15:00Z",
        },
        {
          id: "2",
          title: "Gesture Control Systems",
          slides: 8,
          created_at: "2023-05-05T10:20:00Z",
          updated_at: "2023-05-09T16:45:00Z",
        },
      ],
    })
  } catch (error) {
    console.error("Error fetching presentations:", error)
    return NextResponse.json({ error: "Failed to fetch presentations" }, { status: 500 })
  }
}

// POST /api/presentations - Create a new presentation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request
    if (!body.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    // In a real app, you would:
    // 1. Verify authentication using Laravel Sanctum
    // 2. Create a new presentation in your Laravel backend

    // For demo purposes, return mock data
    return NextResponse.json(
      {
        id: "3",
        title: body.title,
        slides: body.slides || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error creating presentation:", error)
    return NextResponse.json({ error: "Failed to create presentation" }, { status: 500 })
  }
}
