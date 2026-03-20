import { LeadFilters, PaginationState, Lead, LeadStage } from '@/types';

/**
 * Build query parameters for lead filtering and pagination
 */
export const buildLeadQueryParams = (
  filters?: LeadFilters,
  pagination?: Partial<PaginationState>
): Record<string, string> => {
  const params: Record<string, string> = {};

  // Add pagination parameters
  if (pagination?.page) {
    params.page = pagination.page.toString();
  }
  if (pagination?.limit) {
    params.limit = pagination.limit.toString();
  }

  // Add filter parameters
  if (filters) {
    if (filters.stage) {
      params.stage = filters.stage;
    }
    if (filters.courseInterest) {
      params.courseInterest = filters.courseInterest;
    }
    if (filters.source) {
      params.source = filters.source;
    }
    if (filters.dateFrom) {
      params.dateFrom = filters.dateFrom.toISOString();
    }
    if (filters.dateTo) {
      params.dateTo = filters.dateTo.toISOString();
    }
    if (filters.search) {
      params.search = filters.search;
    }
  }

  return params;
};

/**
 * Filter leads based on search criteria (client-side filtering)
 */
export const filterLeads = (leads: Lead[], filters: LeadFilters): Lead[] => {
  return leads.filter(lead => {
    // Stage filter
    if (filters.stage && lead.stage !== filters.stage) {
      return false;
    }

    // Course interest filter
    if (filters.courseInterest && !lead.courseInterest.toLowerCase().includes(filters.courseInterest.toLowerCase())) {
      return false;
    }

    // Source filter
    if (filters.source && lead.source !== filters.source) {
      return false;
    }

    // Date range filter
    if (filters.dateFrom && new Date(lead.createdAt) < filters.dateFrom) {
      return false;
    }
    if (filters.dateTo && new Date(lead.createdAt) > filters.dateTo) {
      return false;
    }

    // Search filter (name, email, mobile)
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const searchableFields = [
        lead.name.toLowerCase(),
        lead.email.toLowerCase(),
        lead.mobile.toLowerCase(),
        lead.courseInterest.toLowerCase(),
      ];
      
      if (!searchableFields.some(field => field.includes(searchTerm))) {
        return false;
      }
    }

    return true;
  });
};

/**
 * Sort leads by specified criteria
 */
export const sortLeads = (
  leads: Lead[], 
  sortBy: keyof Lead = 'createdAt', 
  sortOrder: 'asc' | 'desc' = 'desc'
): Lead[] => {
  return [...leads].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];

    // Handle date sorting
    if (aValue instanceof Date && bValue instanceof Date) {
      return sortOrder === 'asc' 
        ? aValue.getTime() - bValue.getTime()
        : bValue.getTime() - aValue.getTime();
    }

    // Handle string sorting
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    // Handle number sorting
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }

    return 0;
  });
};

/**
 * Paginate leads array
 */
export const paginateLeads = (
  leads: Lead[], 
  page: number = 1, 
  limit: number = 10
): { data: Lead[]; pagination: PaginationState } => {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedData = leads.slice(startIndex, endIndex);

  return {
    data: paginatedData,
    pagination: {
      page,
      limit,
      total: leads.length,
      totalPages: Math.ceil(leads.length / limit),
    },
  };
};

/**
 * Group leads by stage for Kanban board
 */
export const groupLeadsByStage = (leads: Lead[]): Record<LeadStage, Lead[]> => {
  const grouped: Record<LeadStage, Lead[]> = {
    [LeadStage.NEW]: [],
    [LeadStage.CONTACTED]: [],
    [LeadStage.INTERESTED]: [],
    [LeadStage.CONVERTED]: [],
  };

  leads.forEach(lead => {
    grouped[lead.stage].push(lead);
  });

  return grouped;
};

/**
 * Calculate lead statistics
 */
export const calculateLeadStats = (leads: Lead[]) => {
  const total = leads.length;
  const byStage = groupLeadsByStage(leads);
  const stageCount = Object.fromEntries(
    Object.entries(byStage).map(([stage, stageLeads]) => [stage, stageLeads.length])
  ) as Record<LeadStage, number>;

  const conversionRate = total > 0 
    ? (stageCount[LeadStage.CONVERTED] / total) * 100 
    : 0;

  const bySource = leads.reduce((acc, lead) => {
    acc[lead.source] = (acc[lead.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byCourse = leads.reduce((acc, lead) => {
    acc[lead.courseInterest] = (acc[lead.courseInterest] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    total,
    byStage: stageCount,
    bySource,
    byCourse,
    conversionRate: Math.round(conversionRate * 100) / 100, // Round to 2 decimal places
  };
};

/**
 * Get leads requiring follow-up (contacted but not progressed in 24 hours)
 */
export const getLeadsRequiringFollowUp = (leads: Lead[]): Lead[] => {
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  return leads.filter(lead => {
    return (
      lead.stage === LeadStage.CONTACTED &&
      lead.lastContactedAt &&
      new Date(lead.lastContactedAt) <= oneDayAgo
    );
  });
};

/**
 * Check for duplicate leads by mobile number
 */
export const findDuplicateLeads = (leads: Lead[], mobile: string): Lead[] => {
  return leads.filter(lead => lead.mobile === mobile);
};

/**
 * Format lead data for CSV export
 */
export const formatLeadsForExport = (leads: Lead[]): string => {
  const headers = [
    'ID',
    'Name',
    'Email',
    'Mobile',
    'Course Interest',
    'Stage',
    'Source',
    'Created At',
    'Last Contacted',
    'Notes'
  ];

  const csvRows = [
    headers.join(','),
    ...leads.map(lead => [
      lead.id,
      `"${lead.name}"`,
      lead.email,
      lead.mobile,
      `"${lead.courseInterest}"`,
      lead.stage,
      lead.source,
      new Date(lead.createdAt).toISOString(),
      lead.lastContactedAt ? new Date(lead.lastContactedAt).toISOString() : '',
      `"${(lead.notes || '').replace(/"/g, '""')}"` // Escape quotes in notes
    ].join(','))
  ];

  return csvRows.join('\n');
};

/**
 * Validate lead stage transition
 */
export const isValidStageTransition = (currentStage: LeadStage, newStage: LeadStage): boolean => {
  const validTransitions: Record<LeadStage, LeadStage[]> = {
    [LeadStage.NEW]: [LeadStage.CONTACTED, LeadStage.INTERESTED, LeadStage.CONVERTED],
    [LeadStage.CONTACTED]: [LeadStage.NEW, LeadStage.INTERESTED, LeadStage.CONVERTED],
    [LeadStage.INTERESTED]: [LeadStage.CONTACTED, LeadStage.CONVERTED],
    [LeadStage.CONVERTED]: [], // Converted leads cannot be moved back
  };

  return validTransitions[currentStage].includes(newStage);
};

/**
 * Get next suggested stage for a lead
 */
export const getNextSuggestedStage = (currentStage: LeadStage): LeadStage | null => {
  const stageProgression: Record<LeadStage, LeadStage | null> = {
    [LeadStage.NEW]: LeadStage.CONTACTED,
    [LeadStage.CONTACTED]: LeadStage.INTERESTED,
    [LeadStage.INTERESTED]: LeadStage.CONVERTED,
    [LeadStage.CONVERTED]: null,
  };

  return stageProgression[currentStage];
};

/**
 * Calculate time spent in current stage
 */
export const getTimeInCurrentStage = (lead: Lead): number => {
  const now = new Date();
  const stageChangeDate = lead.updatedAt || lead.createdAt;
  return now.getTime() - new Date(stageChangeDate).getTime();
};

/**
 * Format time duration in human readable format
 */
export const formatDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    return `${seconds} second${seconds > 1 ? 's' : ''}`;
  }
};