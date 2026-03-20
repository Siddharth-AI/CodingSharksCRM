import { Lead, LeadStage, ActivityType } from '@/types';
import { 
  validateStageTransition, 
  createStageChangeActivity,
  getAutomationTriggers 
} from '@/utils/stageTransitionUtils';
import { supabase } from '@/lib/supabase';

/**
 * Service for handling lead stage transitions with business rules and automation
 */
export class StageTransitionService {
  /**
   * Execute a stage transition with validation and automation
   */
  static async executeStageTransition(
    leadId: string,
    newStage: LeadStage,
    userId: string,
    options: {
      skipValidation?: boolean;
      skipAutomation?: boolean;
      notes?: string;
    } = {}
  ): Promise<{
    success: boolean;
    lead?: Lead;
    errors: string[];
    warnings: string[];
    automationTriggered: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let automationTriggered: string[] = [];

    try {
      // Get current lead data
      const { data: leadData, error: fetchError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (fetchError || !leadData) {
        errors.push('Lead not found');
        return { success: false, errors, warnings, automationTriggered };
      }

      const currentLead: Lead = {
        id: leadData.id,
        name: leadData.name,
        email: leadData.email,
        mobile: leadData.mobile,
        courseInterest: leadData.course_interest,
        stage: leadData.stage as LeadStage,
        source: leadData.source,
        createdAt: new Date(leadData.created_at),
        updatedAt: new Date(leadData.updated_at),
        lastContactedAt: leadData.last_contacted_at ? new Date(leadData.last_contacted_at) : undefined,
        notes: leadData.notes,
      };

      // Skip if already in target stage
      if (currentLead.stage === newStage) {
        warnings.push('Lead is already in the target stage');
        return { success: true, lead: currentLead, errors, warnings, automationTriggered };
      }

      // Validate transition if not skipped
      if (!options.skipValidation) {
        const validation = validateStageTransition(currentLead, newStage);
        
        if (!validation.isValid) {
          errors.push(...validation.errors);
          return { success: false, errors, warnings: validation.warnings, automationTriggered };
        }
        
        warnings.push(...validation.warnings);
      }

      // Prepare update object
      const updateObject: any = {
        stage: newStage,
        updated_at: new Date().toISOString(),
      };

      // Update last contacted time if moving to CONTACTED stage
      if (newStage === LeadStage.CONTACTED) {
        updateObject.last_contacted_at = new Date().toISOString();
      }

      // Update lead in database
      const { data: updatedData, error: updateError } = await supabase
        .from('leads')
        .update(updateObject)
        .eq('id', leadId)
        .select()
        .single();

      if (updateError) {
        errors.push('Failed to update lead stage');
        return { success: false, errors, warnings, automationTriggered };
      }

      const updatedLead: Lead = {
        id: updatedData.id,
        name: updatedData.name,
        email: updatedData.email,
        mobile: updatedData.mobile,
        courseInterest: updatedData.course_interest,
        stage: updatedData.stage as LeadStage,
        source: updatedData.source,
        createdAt: new Date(updatedData.created_at),
        updatedAt: new Date(updatedData.updated_at),
        lastContactedAt: updatedData.last_contacted_at ? new Date(updatedData.last_contacted_at) : undefined,
        notes: updatedData.notes,
      };

      // Create activity log
      const activity = createStageChangeActivity(currentLead, currentLead.stage, newStage, userId);
      
      // Add notes if provided
      if (options.notes) {
        (activity.metadata as Record<string, unknown>).notes = options.notes;
      }

      await supabase
        .from('activities')
        .insert(activity);

      // Trigger automation if not skipped
      if (!options.skipAutomation) {
        automationTriggered = await this.triggerStageAutomation(
          updatedLead,
          currentLead.stage,
          newStage,
          userId
        );
      }

      return {
        success: true,
        lead: updatedLead,
        errors,
        warnings,
        automationTriggered,
      };

    } catch (error) {
      console.error('Stage transition error:', error);
      errors.push('An unexpected error occurred during stage transition');
      return { success: false, errors, warnings, automationTriggered };
    }
  }

  /**
   * Trigger automation workflows for stage transitions
   */
  private static async triggerStageAutomation(
    lead: Lead,
    fromStage: LeadStage,
    toStage: LeadStage,
    userId: string
  ): Promise<string[]> {
    const triggers = getAutomationTriggers(fromStage, toStage);
    const triggeredActions: string[] = [];

    for (const trigger of triggers) {
      try {
        switch (trigger) {
          case 'welcome_message':
            await this.triggerWelcomeMessage(lead, userId);
            triggeredActions.push('Welcome message sent');
            break;

          case 'first_contact_activity':
            await this.logFirstContactActivity(lead, userId);
            triggeredActions.push('First contact activity logged');
            break;

          case 'interest_confirmation':
            await this.triggerInterestConfirmation(lead, userId);
            triggeredActions.push('Interest confirmation message sent');
            break;

          case 'interest_nurturing':
            await this.triggerInterestNurturing(lead, userId);
            triggeredActions.push('Interest nurturing sequence started');
            break;

          case 'follow_up_sequence':
            await this.triggerFollowUpSequence(lead, userId);
            triggeredActions.push('Follow-up sequence scheduled');
            break;

          case 'conversion_celebration':
            await this.triggerConversionCelebration(lead, userId);
            triggeredActions.push('Conversion celebration message sent');
            break;

          case 'onboarding_sequence':
            await this.triggerOnboardingSequence(lead, userId);
            triggeredActions.push('Onboarding sequence started');
            break;

          case 'payment_follow_up':
            await this.triggerPaymentFollowUp(lead, userId);
            triggeredActions.push('Payment follow-up scheduled');
            break;

          default:
            console.warn(`Unknown automation trigger: ${trigger}`);
        }
      } catch (error) {
        console.error(`Failed to trigger automation: ${trigger}`, error);
      }
    }

    return triggeredActions;
  }

  /**
   * Trigger welcome message automation
   */
  private static async triggerWelcomeMessage(lead: Lead, userId: string): Promise<void> {
    // This will be implemented when we create the WhatsApp automation system
    // For now, we'll just log the intent
    
    await supabase
      .from('activities')
      .insert({
        lead_id: lead.id,
        type: ActivityType.MESSAGE_SENT,
        description: 'Welcome message automation triggered',
        metadata: {
          automationType: 'welcome_message',
          courseInterest: lead.courseInterest,
          triggerReason: 'stage_transition',
        },
        created_by: userId,
        created_at: new Date().toISOString(),
      });
  }

  /**
   * Log first contact activity
   */
  private static async logFirstContactActivity(lead: Lead, userId: string): Promise<void> {
    await supabase
      .from('activities')
      .insert({
        lead_id: lead.id,
        type: ActivityType.LEAD_UPDATED,
        description: 'First contact milestone reached',
        metadata: {
          milestone: 'first_contact',
          previousStage: LeadStage.NEW,
          currentStage: LeadStage.CONTACTED,
        },
        created_by: userId,
        created_at: new Date().toISOString(),
      });
  }

  /**
   * Trigger interest confirmation automation
   */
  private static async triggerInterestConfirmation(lead: Lead, userId: string): Promise<void> {
    await supabase
      .from('activities')
      .insert({
        lead_id: lead.id,
        type: ActivityType.MESSAGE_SENT,
        description: 'Interest confirmation message automation triggered',
        metadata: {
          automationType: 'interest_confirmation',
          courseInterest: lead.courseInterest,
          triggerReason: 'stage_transition',
        },
        created_by: userId,
        created_at: new Date().toISOString(),
      });
  }

  /**
   * Trigger interest nurturing automation
   */
  private static async triggerInterestNurturing(lead: Lead, userId: string): Promise<void> {
    await supabase
      .from('activities')
      .insert({
        lead_id: lead.id,
        type: ActivityType.MESSAGE_SENT,
        description: 'Interest nurturing sequence started',
        metadata: {
          automationType: 'interest_nurturing',
          courseInterest: lead.courseInterest,
          sequenceType: 'nurturing',
        },
        created_by: userId,
        created_at: new Date().toISOString(),
      });
  }

  /**
   * Trigger follow-up sequence automation
   */
  private static async triggerFollowUpSequence(lead: Lead, userId: string): Promise<void> {
    // Schedule follow-up messages for the next 7 days (1-day intervals)
    const followUpDates = [];
    for (let i = 1; i <= 7; i++) {
      const followUpDate = new Date();
      followUpDate.setDate(followUpDate.getDate() + i);
      followUpDates.push(followUpDate);
    }

    await supabase
      .from('activities')
      .insert({
        lead_id: lead.id,
        type: ActivityType.MESSAGE_SENT,
        description: 'Follow-up sequence scheduled',
        metadata: {
          automationType: 'follow_up_sequence',
          courseInterest: lead.courseInterest,
          scheduledDates: followUpDates,
          sequenceLength: 7,
        },
        created_by: userId,
        created_at: new Date().toISOString(),
      });
  }

  /**
   * Trigger conversion celebration automation
   */
  private static async triggerConversionCelebration(lead: Lead, userId: string): Promise<void> {
    await supabase
      .from('activities')
      .insert({
        lead_id: lead.id,
        type: ActivityType.MESSAGE_SENT,
        description: 'Conversion celebration message sent',
        metadata: {
          automationType: 'conversion_celebration',
          courseInterest: lead.courseInterest,
          conversionDate: new Date().toISOString(),
        },
        created_by: userId,
        created_at: new Date().toISOString(),
      });
  }

  /**
   * Trigger onboarding sequence automation
   */
  private static async triggerOnboardingSequence(lead: Lead, userId: string): Promise<void> {
    await supabase
      .from('activities')
      .insert({
        lead_id: lead.id,
        type: ActivityType.MESSAGE_SENT,
        description: 'Onboarding sequence started',
        metadata: {
          automationType: 'onboarding_sequence',
          courseInterest: lead.courseInterest,
          onboardingStartDate: new Date().toISOString(),
        },
        created_by: userId,
        created_at: new Date().toISOString(),
      });
  }

  /**
   * Trigger payment follow-up automation
   */
  private static async triggerPaymentFollowUp(lead: Lead, userId: string): Promise<void> {
    await supabase
      .from('activities')
      .insert({
        lead_id: lead.id,
        type: ActivityType.MESSAGE_SENT,
        description: 'Payment follow-up scheduled',
        metadata: {
          automationType: 'payment_follow_up',
          courseInterest: lead.courseInterest,
          followUpType: 'payment_reminder',
        },
        created_by: userId,
        created_at: new Date().toISOString(),
      });
  }

  /**
   * Bulk stage transition for multiple leads
   */
  static async bulkStageTransition(
    leadIds: string[],
    newStage: LeadStage,
    userId: string,
    options: {
      skipValidation?: boolean;
      skipAutomation?: boolean;
      notes?: string;
    } = {}
  ): Promise<{
    success: boolean;
    results: Array<{
      leadId: string;
      success: boolean;
      errors: string[];
      warnings: string[];
    }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  }> {
    const results = [];
    let successful = 0;
    let failed = 0;

    for (const leadId of leadIds) {
      const result = await this.executeStageTransition(leadId, newStage, userId, options);
      
      results.push({
        leadId,
        success: result.success,
        errors: result.errors,
        warnings: result.warnings,
      });

      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    }

    return {
      success: failed === 0,
      results,
      summary: {
        total: leadIds.length,
        successful,
        failed,
      },
    };
  }
}