import { Lead, LeadStage, ActivityType } from '@/types';

/**
 * Stage transition validation and business rules
 */

export interface StageTransitionRule {
  from: LeadStage;
  to: LeadStage;
  isAllowed: boolean;
  requiresConfirmation?: boolean;
  warningMessage?: string;
  automationTriggers?: string[];
}

/**
 * Define allowed stage transitions
 */
export const STAGE_TRANSITION_RULES: StageTransitionRule[] = [
  // From NEW
  {
    from: LeadStage.NEW,
    to: LeadStage.CONTACTED,
    isAllowed: true,
    automationTriggers: ['welcome_message', 'first_contact_activity'],
  },
  {
    from: LeadStage.NEW,
    to: LeadStage.INTERESTED,
    isAllowed: true,
    requiresConfirmation: true,
    warningMessage: 'Skipping the contacted stage. Are you sure the lead has been properly contacted?',
    automationTriggers: ['welcome_message', 'interest_confirmation'],
  },
  {
    from: LeadStage.NEW,
    to: LeadStage.CONVERTED,
    isAllowed: true,
    requiresConfirmation: true,
    warningMessage: 'Converting a lead directly from new stage. This is unusual. Are you sure?',
    automationTriggers: ['welcome_message', 'conversion_celebration'],
  },

  // From CONTACTED
  {
    from: LeadStage.CONTACTED,
    to: LeadStage.NEW,
    isAllowed: true,
    requiresConfirmation: true,
    warningMessage: 'Moving back to new stage will reset the contact status. Continue?',
  },
  {
    from: LeadStage.CONTACTED,
    to: LeadStage.INTERESTED,
    isAllowed: true,
    automationTriggers: ['interest_nurturing', 'follow_up_sequence'],
  },
  {
    from: LeadStage.CONTACTED,
    to: LeadStage.CONVERTED,
    isAllowed: true,
    automationTriggers: ['conversion_celebration', 'onboarding_sequence'],
  },

  // From INTERESTED
  {
    from: LeadStage.INTERESTED,
    to: LeadStage.NEW,
    isAllowed: true,
    requiresConfirmation: true,
    warningMessage: 'Moving an interested lead back to new stage. This will reset their progress.',
  },
  {
    from: LeadStage.INTERESTED,
    to: LeadStage.CONTACTED,
    isAllowed: true,
    requiresConfirmation: true,
    warningMessage: 'Moving back to contacted stage. The lead may need re-engagement.',
  },
  {
    from: LeadStage.INTERESTED,
    to: LeadStage.CONVERTED,
    isAllowed: true,
    automationTriggers: ['conversion_celebration', 'onboarding_sequence', 'payment_follow_up'],
  },

  // From CONVERTED
  {
    from: LeadStage.CONVERTED,
    to: LeadStage.NEW,
    isAllowed: false,
    warningMessage: 'Cannot move a converted lead back to new stage.',
  },
  {
    from: LeadStage.CONVERTED,
    to: LeadStage.CONTACTED,
    isAllowed: false,
    warningMessage: 'Cannot move a converted lead back to contacted stage.',
  },
  {
    from: LeadStage.CONVERTED,
    to: LeadStage.INTERESTED,
    isAllowed: false,
    warningMessage: 'Cannot move a converted lead back to interested stage.',
  },
];

/**
 * Check if a stage transition is allowed
 */
export const isStageTransitionAllowed = (from: LeadStage, to: LeadStage): boolean => {
  if (from === to) return true; // Same stage is always allowed
  
  const rule = STAGE_TRANSITION_RULES.find(r => r.from === from && r.to === to);
  return rule?.isAllowed ?? false;
};

/**
 * Get stage transition rule
 */
export const getStageTransitionRule = (from: LeadStage, to: LeadStage): StageTransitionRule | null => {
  return STAGE_TRANSITION_RULES.find(r => r.from === from && r.to === to) || null;
};

/**
 * Validate stage transition with business rules
 */
export const validateStageTransition = (
  lead: Lead, 
  newStage: LeadStage
): {
  isValid: boolean;
  rule?: StageTransitionRule;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const rule = getStageTransitionRule(lead.stage, newStage);
  
  if (!rule) {
    errors.push(`No transition rule defined from ${lead.stage} to ${newStage}`);
    return { isValid: false, errors, warnings };
  }
  
  if (!rule.isAllowed) {
    errors.push(rule.warningMessage || `Transition from ${lead.stage} to ${newStage} is not allowed`);
    return { isValid: false, rule, errors, warnings };
  }
  
  // Add warnings for transitions that require confirmation
  if (rule.requiresConfirmation && rule.warningMessage) {
    warnings.push(rule.warningMessage);
  }
  
  // Business rule validations
  
  // Check if lead has been contacted recently when moving to INTERESTED
  if (newStage === LeadStage.INTERESTED && lead.stage === LeadStage.NEW) {
    if (!lead.lastContactedAt) {
      warnings.push('Lead has not been contacted yet. Consider contacting them first.');
    }
  }
  
  // Check if enough time has passed since last contact
  if (newStage === LeadStage.CONVERTED) {
    const now = new Date();
    const createdAt = new Date(lead.createdAt);
    const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceCreation < 1) {
      warnings.push('Lead was created less than 1 hour ago. Quick conversion - please verify.');
    }
  }
  
  // Check for duplicate conversions (if lead was previously converted)
  // This would require checking activity history, which we'll implement later
  
  return {
    isValid: true,
    rule,
    errors,
    warnings,
  };
};

/**
 * Get next suggested stage for a lead
 */
export const getNextSuggestedStage = (lead: Lead): LeadStage | null => {
  const stageProgression: Record<LeadStage, LeadStage | null> = {
    [LeadStage.NEW]: LeadStage.CONTACTED,
    [LeadStage.CONTACTED]: LeadStage.INTERESTED,
    [LeadStage.INTERESTED]: LeadStage.CONVERTED,
    [LeadStage.CONVERTED]: null, // No next stage after conversion
  };
  
  return stageProgression[lead.stage];
};

/**
 * Get all possible next stages for a lead
 */
export const getPossibleNextStages = (currentStage: LeadStage): LeadStage[] => {
  return STAGE_TRANSITION_RULES
    .filter(rule => rule.from === currentStage && rule.isAllowed)
    .map(rule => rule.to);
};

/**
 * Calculate stage progression metrics
 */
export const calculateStageMetrics = (leads: Lead[]) => {
  const totalLeads = leads.length;
  if (totalLeads === 0) return null;
  
  const stageCount = leads.reduce((acc, lead) => {
    acc[lead.stage] = (acc[lead.stage] || 0) + 1;
    return acc;
  }, {} as Record<LeadStage, number>);
  
  const conversionRate = (stageCount[LeadStage.CONVERTED] || 0) / totalLeads;
  const contactRate = ((stageCount[LeadStage.CONTACTED] || 0) + 
                      (stageCount[LeadStage.INTERESTED] || 0) + 
                      (stageCount[LeadStage.CONVERTED] || 0)) / totalLeads;
  const interestRate = ((stageCount[LeadStage.INTERESTED] || 0) + 
                       (stageCount[LeadStage.CONVERTED] || 0)) / totalLeads;
  
  return {
    totalLeads,
    stageCount,
    conversionRate: Math.round(conversionRate * 10000) / 100, // 2 decimal places
    contactRate: Math.round(contactRate * 10000) / 100,
    interestRate: Math.round(interestRate * 10000) / 100,
    dropoffRates: {
      newToContacted: stageCount[LeadStage.NEW] / totalLeads,
      contactedToInterested: (stageCount[LeadStage.CONTACTED] || 0) / 
                            Math.max(totalLeads - (stageCount[LeadStage.NEW] || 0), 1),
      interestedToConverted: (stageCount[LeadStage.INTERESTED] || 0) / 
                            Math.max(totalLeads - (stageCount[LeadStage.NEW] || 0) - (stageCount[LeadStage.CONTACTED] || 0), 1),
    },
  };
};

/**
 * Get automation triggers for a stage transition
 */
export const getAutomationTriggers = (from: LeadStage, to: LeadStage): string[] => {
  const rule = getStageTransitionRule(from, to);
  return rule?.automationTriggers || [];
};

/**
 * Create activity description for stage change
 */
export const createStageChangeActivity = (
  lead: Lead, 
  fromStage: LeadStage, 
  toStage: LeadStage,
  userId: string
) => {
  const stageNames = {
    [LeadStage.NEW]: 'New',
    [LeadStage.CONTACTED]: 'Contacted',
    [LeadStage.INTERESTED]: 'Interested',
    [LeadStage.CONVERTED]: 'Converted',
  };
  
  return {
    leadId: lead.id,
    type: ActivityType.STAGE_CHANGED,
    description: `Stage changed from ${stageNames[fromStage]} to ${stageNames[toStage]}`,
    metadata: {
      previousStage: fromStage,
      newStage: toStage,
      leadName: lead.name,
      leadEmail: lead.email,
      courseInterest: lead.courseInterest,
      transitionTime: new Date().toISOString(),
      automationTriggered: getAutomationTriggers(fromStage, toStage),
    },
    createdBy: userId,
    createdAt: new Date().toISOString(),
  };
};

/**
 * Get stage transition history for a lead (would require activity data)
 */
export const getStageTransitionHistory = (activities: any[]): Array<{
  from: LeadStage;
  to: LeadStage;
  timestamp: Date;
  duration?: number; // Time spent in previous stage (in hours)
}> => {
  const stageChanges = activities
    .filter(activity => activity.type === ActivityType.STAGE_CHANGED)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  
  const history: Array<{
    from: LeadStage;
    to: LeadStage;
    timestamp: Date;
    duration?: number;
  }> = [];
  
  for (let i = 0; i < stageChanges.length; i++) {
    const change = stageChanges[i];
    const previousChange = stageChanges[i - 1];
    
    let duration: number | undefined;
    if (previousChange) {
      const currentTime = new Date(change.createdAt).getTime();
      const previousTime = new Date(previousChange.createdAt).getTime();
      duration = (currentTime - previousTime) / (1000 * 60 * 60); // Convert to hours
    }
    
    history.push({
      from: change.metadata.previousStage,
      to: change.metadata.newStage,
      timestamp: new Date(change.createdAt),
      duration,
    });
  }
  
  return history;
};

/**
 * Get average time spent in each stage
 */
export const getAverageStageTime = (leads: Lead[], activities: any[]): Record<LeadStage, number> => {
  const stageTimes: Record<LeadStage, number[]> = {
    [LeadStage.NEW]: [],
    [LeadStage.CONTACTED]: [],
    [LeadStage.INTERESTED]: [],
    [LeadStage.CONVERTED]: [],
  };
  
  leads.forEach(lead => {
    const leadActivities = activities.filter(a => a.leadId === lead.id);
    const history = getStageTransitionHistory(leadActivities);
    
    history.forEach(transition => {
      if (transition.duration) {
        stageTimes[transition.from].push(transition.duration);
      }
    });
  });
  
  // Calculate averages
  const averages: Record<LeadStage, number> = {
    [LeadStage.NEW]: 0,
    [LeadStage.CONTACTED]: 0,
    [LeadStage.INTERESTED]: 0,
    [LeadStage.CONVERTED]: 0,
  };
  
  Object.entries(stageTimes).forEach(([stage, times]) => {
    if (times.length > 0) {
      averages[stage as LeadStage] = times.reduce((sum, time) => sum + time, 0) / times.length;
    }
  });
  
  return averages;
};