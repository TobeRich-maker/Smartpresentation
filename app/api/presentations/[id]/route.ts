import { type NextRequest, NextResponse } from "next/server"

// GET /api/presentations/[id] - Get a specific presentation
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    // In a real app, you would:
    // 1. Verify authentication using Laravel Sanctum
    // 2. Fetch the specific presentation from your Laravel backend

    // For demo purposes, return mock data
    return NextResponse.json({
      id,
      title: "Sample Presentation",
      slides: [
        {
          id: "1",
          type: "text",
          title: "Welcome to Smart Presentation",
          content:
            "<p>Use hand gestures to control your presentation:</p><ul><li>Swipe left/right to navigate slides</li><li>Point with your index finger for laser pointer</li><li>Open palm to play videos</li><li>Closed fist to pause videos</li></ul>",
        },
        {
          id: "2",
          type: "image",
          title: "Gesture Controls",
          content: "/placeholder.svg?height=720&width=1280",
        },
        {
          id: "3",
          type: "video",
          title: "Demo Video",
          content: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
        },
        {
          id: "4",
          type: "text",
          title: "Key Features",
          content:
            "<ul><li>Real-time hand tracking with MediaPipe</li><li>Virtual laser pointer</li><li>Media controls with gestures</li><li>Accessibility features</li><li>Integration with Laravel backend</li></ul>",
        },
        {
          id: "5",
          type: "image",
          title: "Thank You!",
          content: "/placeholder.svg?height=720&width=1280",
        },
      ],
      created_at: "2023-05-10T14:30:00Z",
      updated_at: "2023-05-11T09:15:00Z",
    })
  } catch (error) {
    console.error(`Error fetching presentation ${params.id}:`, error)
    return NextResponse.json({ error: "Failed to fetch presentation" }, { status: 500 })
  }
}

// PUT /api/presentations/[id] - Update a presentation
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const body = await request.json()

    // In a real app, you would:
    // 1. Verify authentication using Laravel Sanctum
    // 2. Update the presentation in your Laravel backend

    // For demo purposes, return mock data
    return NextResponse.json({
      id,
      title: body.title || "Updated Presentation",
      slides: body.slides || [],
      created_at: "2023-05-10T14:30:00Z",
      updated_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error(`Error updating presentation ${params.id}:`, error)
    return NextResponse.json({ error: "Failed to update presentation" }, { status: 500 })
  }
}

// DELETE /api/presentations/[id] - Delete a presentation
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    // In a real app, you would:
    // 1. Verify authentication using Laravel Sanctum
    // 2. Delete the presentation from your Laravel backend

    // For demo purposes, return success
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`Error deleting presentation ${params.id}:`, error)
    return NextResponse.json({ error: "Failed to delete presentation" }, { status: 500 })
  }
}
