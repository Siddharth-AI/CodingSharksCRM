import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';

interface MediaAsset {
  id: string;
  type: 'image' | 'video';
  url: string;
  public_id: string;
  file_name: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  created_at: string;
}

/**
 * GET /api/media/list - List all uploaded media assets
 * Query params:
 *   - type: 'image' | 'video' (optional, filter by type)
 *   - limit: number (default: 50, max: 200)
 *   - offset: number (default: 0, for pagination)
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const authResult = await authenticateApiRequest(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'image' | 'video' | null;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validate type filter
    if (type && !['image', 'video'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'type must be "image" or "video"' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabaseAdmin
      .from('media_assets')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Filter by type if provided
    if (type) {
      query = query.eq('type', type);
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      data: data as MediaAsset[],
      pagination: {
        limit,
        offset,
        total: count || 0,
      },
    });

  } catch (error) {
    return handleApiError(error, 'Failed to fetch media list');
  }
}
