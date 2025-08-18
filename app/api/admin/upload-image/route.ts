import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { imageData, fileName, eventId } = await request.json();

    if (!imageData || !fileName) {
      return NextResponse.json(
        { success: false, error: 'Image data and file name are required' },
        { status: 400 }
      );
    }

    // Validate image data (should be base64)
    if (!imageData.startsWith('data:image/')) {
      return NextResponse.json(
        { success: false, error: 'Invalid image format' },
        { status: 400 }
      );
    }

    // Extract file extension
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Allowed: JPG, PNG, GIF, WebP' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const uniqueFileName = `event_${eventId || 'new'}_${timestamp}.${fileExtension}`;

    // Save image to backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    
    const response = await fetch(`${backendUrl}/admin/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageData,
        fileName: uniqueFileName,
        eventId
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Backend upload failed:', errorData);
      return NextResponse.json(
        { success: false, error: 'Failed to upload image to server' },
        { status: 500 }
      );
    }

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
      fileName: uniqueFileName
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 