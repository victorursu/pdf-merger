import { NextResponse } from 'next/server'

export async function GET() {
  const serviceUrl = process.env.NEXT_PUBLIC_DIVIDER_TEXT_SERVICE

  if (!serviceUrl) {
    return NextResponse.json(
      { error: 'Divider text service URL is not configured' },
      { status: 500 }
    )
  }

  try {
    const response = await fetch(serviceUrl, {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    // Validate response structure
    if (!data || !Array.isArray(data.items)) {
      return NextResponse.json(
        { error: 'Invalid response format: expected an object with an "items" array' },
        { status: 500 }
      )
    }

    // Return the data with CORS headers
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    console.error('Error fetching divider texts:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      { error: `Failed to fetch divider texts: ${errorMessage}` },
      { status: 500 }
    )
  }
}
