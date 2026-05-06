import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createLeadSchema, formatMobileNumber } from '@/models/lead';
import { sendAutoWelcomeMessage } from '@/services/autoWelcomeService';
import { whatsappService } from '@/services/whatsappService';
import { Lead, LeadStage, LeadSource } from '@/types';

/**
 * POST /api/public/leads
 * External endpoint for creating leads from outside the CRM (e.g. CodingShark website).
 *
 * Auth: x-api-key header — must match EXTERNAL_API_KEY env var (no JWT required).
 *
 * Body: { name, email, mobile, courseInterest (UUID), notes? }
 * Source is always set to 'website' for leads from external forms.
 */
export async function POST(request: NextRequest) {
  try {
    // ── API key auth ─────────────────────────────────────────────────────────
    const apiKey = request.headers.get('x-api-key');
    const expectedKey = process.env.EXTERNAL_API_KEY;

    if (!expectedKey) {
      console.error('EXTERNAL_API_KEY env var is not set');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (!apiKey || apiKey !== expectedKey) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    // ── Validate body ─────────────────────────────────────────────────────────
    const body = await request.json();

    const { error: validationError, value } = createLeadSchema.validate(body);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError.details[0].message },
        { status: 400 }
      );
    }

    const formattedMobile = formatMobileNumber(value.mobile);

    // ── Dedup check by mobile ────────────────────────────────────────────────
    const { data: existingLead } = await supabaseAdmin
      .from('leads')
      .select('id, name, email, mobile, course_interest, stage, source, notes, created_at, updated_at')
      .eq('mobile', formattedMobile)
      .maybeSingle();

    // ── Existing lead: log touch only, no insert, no welcome ────────────────
    if (existingLead) {
      await supabaseAdmin.from('activities').insert({
        lead_id:     existingLead.id,
        type:        'lead_touch',
        description: `Repeat submit via external form: ${value.name} (${value.email})`,
        metadata:    {
          source: 'codingshark_website',
          courseInterest: value.courseInterest,
          submittedName: value.name,
          submittedEmail: value.email.toLowerCase(),
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
          userAgent: request.headers.get('user-agent') || null,
        },
        created_at:  new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        data:    { leadId: existingLead.id, isNewLead: false },
        message: 'Lead already exists',
        error:   null,
      }, { status: 200 });
    }

    // ── Insert new lead ───────────────────────────────────────────────────────
    const { data, error: insertError } = await supabaseAdmin
      .from('leads')
      .insert({
        name:            value.name,
        email:           value.email.toLowerCase(),
        mobile:          formattedMobile,
        course_interest: value.courseInterest,
        source:          LeadSource.WEBSITE,       // always 'website' for external forms
        stage:           LeadStage.NEW,
        notes:           value.notes || null,
        created_at:      new Date().toISOString(),
        updated_at:      new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Public lead insert error:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to create lead' },
        { status: 500 }
      );
    }

    const newLead: Lead = {
      id:              data.id,
      name:            data.name,
      email:           data.email,
      mobile:          data.mobile,
      courseInterest:  data.course_interest,
      stage:           data.stage as LeadStage,
      source:          data.source as LeadSource,
      createdAt:       new Date(data.created_at),
      updatedAt:       new Date(data.updated_at),
      notes:           data.notes,
    };

    // ── Log activity ──────────────────────────────────────────────────────────
    await supabaseAdmin.from('activities').insert({
      lead_id:     newLead.id,
      type:        'lead_created',
      description: `Lead created via external form: ${newLead.name} (${newLead.email})`,
      metadata:    { source: 'codingshark_website', courseInterest: newLead.courseInterest },
      created_at:  new Date().toISOString(),
    });

    // ── Auto-welcome + owner notification — only for NEW leads ───────────────
    await Promise.allSettled([
      sendAutoWelcomeMessage(newLead).catch(err =>
        console.error('Auto-welcome failed for external lead', newLead.id, ':', err?.message || err)
      ),
      notifyOwner(newLead).catch(err =>
        console.error('Owner notification failed for lead', newLead.id, ':', err?.message || err)
      ),
    ]);

    return NextResponse.json({
      success: true,
      data:    { leadId: newLead.id, isNewLead: true },
      message: 'Lead created successfully',
      error:   null,
    }, { status: 201 });

  } catch (err) {
    console.error('Public lead creation error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Send a WhatsApp notification to the owner when a new lead comes in from the website.
 * Fire-and-forget — never throws.
 */
async function notifyOwner(lead: Lead): Promise<void> {
  const ownerNumber = process.env.OWNER_WHATSAPP_NUMBER;
  if (!ownerNumber) return;

  // Fetch course name
  let courseName = 'Not specified';
  if (lead.courseInterest) {
    const { data: courseData } = await supabaseAdmin
      .from('courses')
      .select('name')
      .eq('id', lead.courseInterest)
      .single();
    if (courseData?.name) courseName = courseData.name;
  }

  const message = [
    `🔔 *New Lead — CodingShark Website*`,
    ``,
    `*Name:* ${lead.name}`,
    `*Mobile:* ${lead.mobile}`,
    `*Course:* ${courseName}`,
    lead.notes ? `*Notes:* ${lead.notes}` : null,
  ].filter(Boolean).join('\n');

  await whatsappService.sendTextMessage(ownerNumber, message, {});
}
