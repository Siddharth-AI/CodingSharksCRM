import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { fetchMedia, MetaApiError } from '@/lib/meta-whatsapp';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const authResult = await authenticateApiRequest(request);
  if (!authResult.isAuthenticated) {
    return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });
  }

  const { mediaId } = await params;
  if (!/^\d{5,30}$/.test(mediaId)) {
    return NextResponse.json({ success: false, error: 'Invalid media ID' }, { status: 400 });
  }

  const { data: owner } = await supabaseAdmin
    .from('whatsapp_messages')
    .select('id')
    .eq('media_id', mediaId)
    .limit(1);

  if (!owner || owner.length === 0) {
    return NextResponse.json({ success: false, error: 'Media not found' }, { status: 404 });
  }

  try {
    const { buffer, mimeType } = await fetchMedia(mediaId);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    const status = err instanceof MetaApiError && err.status === 404 ? 404 : 502;
    return NextResponse.json(
      { success: false, error: status === 404 ? 'Media has expired on WhatsApp' : 'Failed to load media' },
      { status }
    );
  }
}
