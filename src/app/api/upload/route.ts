import { NextRequest, NextResponse } from 'next/server';
import { cloudinary } from '@/lib/cloudinary';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';

/**
 * POST /api/upload - Upload image or video to Cloudinary
 * Body: multipart/form-data  { file: File, type: 'image' | 'video' }
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = (formData.get('type') as string) || 'image';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate type
    if (!['image', 'video'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'type must be "image" or "video"' },
        { status: 400 }
      );
    }

    // Size limits: image 10MB, video 100MB
    const MAX_SIZE = type === 'video' ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: `File too large. Max size: ${type === 'video' ? '100MB' : '10MB'}` },
        { status: 400 }
      );
    }

    // Convert file to buffer for Cloudinary upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudinary
    const result = await new Promise<{ secure_url: string; public_id: string; resource_type: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: type as 'image' | 'video',
          folder: 'crm-whatsapp/templates',
          allowed_formats: type === 'image'
            ? ['jpg', 'jpeg', 'png', 'gif', 'webp']
            : ['mp4', 'mov', 'avi', 'mkv', '3gp'],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result as { secure_url: string; public_id: string; resource_type: string });
        }
      );
      uploadStream.end(buffer);
    });

    return NextResponse.json({
      success: true,
      data: {
        url:          result.secure_url,
        publicId:     result.public_id,
        resourceType: result.resource_type,
      },
    });

  } catch (error) {
    return handleApiError(error, 'Failed to upload file');
  }
}
