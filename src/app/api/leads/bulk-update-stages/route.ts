import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { bulkUpdateStagesSchema } from '@/models/lead';
import { authenticateApiRequest } from '@/middleware/authMiddleware';
import { handleApiError } from '@/utils/apiErrorHandling';
import { Lead, LeadStage, LeadSource } from '@/types';

/**
 * POST /api/leads/bulk-update-stages - Bulk update lead stages (for Kanban operations)
 */
export async function POST(request: NextRequest) {
  try {
    // Apply authentication middleware
    const authResult = await authenticateApiRequest(request);
    if (!authResult.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate input data
    const { error, value } = bulkUpdateStagesSchema.validate(body);
    if (error) {
      return NextResponse.json(
        { success: false, error: error.details[0].message },
        { status: 400 }
      );
    }

    const { updates } = value;

    // Get all leads to be updated
    const leadIds = updates.map((update: any) => update.id);
    const { data: existingLeads, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .in('id', leadIds);

    if (fetchError) {
      console.error('Database error:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch leads' },
        { status: 500 }
      );
    }

    // Check if all leads exist
    if (existingLeads.length !== leadIds.length) {
      const foundIds = existingLeads.map(lead => lead.id);
      const missingIds = leadIds.filter((id: string) => !foundIds.includes(id));
      return NextResponse.json(
        { success: false, error: `Leads not found: ${missingIds.join(', ')}` },
        { status: 404 }
      );
    }

    // Prepare bulk update operations
    const updatePromises = updates.map(async (update: any) => {
      const existingLead = existingLeads.find(lead => lead.id === update.id);
      
      // Skip if stage is not changing
      if (existingLead.stage === update.stage) {
        return existingLead;
      }

      // Prepare update object
      const updateObject: any = {
        stage: update.stage,
        updated_at: new Date().toISOString(),
      };

      // Update last contacted time if stage changes to CONTACTED
      if (update.stage === LeadStage.CONTACTED) {
        updateObject.last_contacted_at = new Date().toISOString();
      }

      // Update lead
      const { data, error: updateError } = await supabase
        .from('leads')
        .update(updateObject)
        .eq('id', update.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update lead ${update.id}: ${updateError.message}`);
      }

      // Log activity
      await supabase
        .from('activities')
        .insert({
          lead_id: update.id,
          type: 'stage_changed',
          description: `Stage changed from ${existingLead.stage} to ${update.stage} (bulk update)`,
          metadata: {
            previousStage: existingLead.stage,
            newStage: update.stage,
            bulkUpdate: true,
            changedBy: authResult.user!.id,
          },
          created_by: authResult.user!.id,
          created_at: new Date().toISOString(),
        });

      return data;
    });

    // Execute all updates
    const updatedLeadsData = await Promise.all(updatePromises);

    // Transform data to match Lead interface
    const updatedLeads: Lead[] = updatedLeadsData.map(data => ({
      id: data.id,
      name: data.name,
      email: data.email,
      mobile: data.mobile,
      courseInterest: data.course_interest,
      stage: data.stage as LeadStage,
      source: data.source as LeadSource,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      lastContactedAt: data.last_contacted_at ? new Date(data.last_contacted_at) : undefined,
      notes: data.notes,
    }));

    return NextResponse.json({
      success: true,
      data: updatedLeads,
      message: `Successfully updated ${updatedLeads.length} lead stages`,
    });

  } catch (error) {
    return handleApiError(error);
  }
}