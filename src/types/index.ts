// Core Domain Types
export interface Lead {
  id: string;
  name: string;
  email: string;
  mobile: string;
  courseInterest: string;
  stage: LeadStage;
  source: LeadSource;
  createdAt: Date;
  updatedAt: Date;
  lastContactedAt?: Date;
  notes?: string;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  duration: string;
  price?: number;
  courseType: CourseType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageTemplate {
  id: string;
  courseId: string;
  type: TemplateType;
  name: string;
  content: string;
  variables: string[];                          // all variable names used in content
  variableDefaults: Record<string, string>;     // custom var → default value
  mediaImageUrl?: string;                       // Cloudinary image URL (optional)
  mediaVideoUrl?: string;                       // Cloudinary video URL (optional)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WhatsAppMessage {
  id: string;
  leadId: string;
  templateId?: string;
  content: string;
  status: MessageStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  errorMessage?: string;
  retryCount: number;
  createdAt: Date;
  mediaImageUrl?: string;
  mediaVideoUrl?: string;
}

export interface Activity {
  id: string;
  leadId: string;
  type: ActivityType;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  performedBy: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Enum Types
export enum LeadStage {
  NEW = 'new',
  CONTACTED = 'contacted',
  INTERESTED = 'interested',
  CONVERTED = 'converted'
}

export enum LeadSource {
  WEBSITE = 'website',
  REFERRAL = 'referral',
  SOCIAL_MEDIA = 'social_media',
  ADVERTISEMENT = 'advertisement',
  WALK_IN = 'walk_in'
}

export enum CourseType {
  REGULAR = 'regular',
  WORKSHOP = 'workshop'
}

export enum TemplateType {
  WELCOME = 'welcome',
  FOLLOW_UP_DAY_1 = 'follow_up_day_1',
  FOLLOW_UP_DAY_2 = 'follow_up_day_2',
  FOLLOW_UP_DAY_3 = 'follow_up_day_3',
  CUSTOM = 'custom'
}

export enum MessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

export enum ActivityType {
  LEAD_CREATED = 'lead_created',
  STAGE_CHANGED = 'stage_changed',
  MESSAGE_SENT = 'message_sent',
  NOTE_ADDED = 'note_added',
  LEAD_UPDATED = 'lead_updated',
  MESSAGE_DELIVERED = 'message_delivered',
  MESSAGE_READ = 'message_read',
  MESSAGE_FAILED = 'message_failed',
  CALL_MADE = 'call_made',
  EMAIL_SENT = 'email_sent',
  MEETING_SCHEDULED = 'meeting_scheduled',
  FOLLOW_UP_SCHEDULED = 'follow_up_scheduled',
  WORKFLOW_TRIGGERED = 'workflow_triggered'
}

// Request/Response Types
export interface CreateLeadRequest {
  name: string;
  email: string;
  mobile: string;
  courseInterest: string;
  source: LeadSource;
  notes?: string;
}

export interface UpdateLeadRequest {
  name?: string;
  email?: string;
  mobile?: string;
  courseInterest?: string;
  stage?: LeadStage;
  notes?: string;
}

export interface CreateCourseRequest {
  name: string;
  description: string;
  duration: string;
  price?: number;
  courseType?: CourseType;
}

export interface UpdateCourseRequest {
  name?: string;
  description?: string;
  duration?: string;
  price?: number;
  courseType?: CourseType;
  isActive?: boolean;
}

export interface CreateMessageTemplateRequest {
  courseId: string;
  type: TemplateType;
  name: string;
  content: string;
  variables: string[];
  variableDefaults?: Record<string, string>;
  mediaImageUrl?: string;
  mediaVideoUrl?: string;
}

export interface UpdateMessageTemplateRequest {
  name?: string;
  content?: string;
  variables?: string[];
  variableDefaults?: Record<string, string>;
  type?: TemplateType;
  isActive?: boolean;
  mediaImageUrl?: string | null;
  mediaVideoUrl?: string | null;
}

export interface CreateMessageRequest {
  leadId: string;
  templateId?: string;
  content: string;
}

// Filter and Pagination Types
export interface LeadFilters {
  stage?: LeadStage;
  courseInterest?: string;
  source?: LeadSource;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationState;
}

// Dashboard and Analytics Types
export interface DashboardStats {
  totalLeads: number;
  newLeads: number;
  contactedLeads: number;
  interestedLeads: number;
  convertedLeads: number;
  conversionRate: number;
  byStage: Record<string, number>;
  bySource: Record<string, number>;
  byCourse: Record<string, number>;
  averageTimeToConversion: number;
  totalMessages: number;
  sentMessages: number;
  deliveredMessages: number;
  failedMessages: number;
  messageDeliveryRate: number;
  totalActivities: number;
}

export interface ConversionData {
  stage: LeadStage;
  count: number;
  percentage: number;
  dropoffRate: number;
  conversionRate: number;
}

export interface TrendData {
  date: string;
  newLeads: number;
  convertedLeads: number;
  conversionRate: number;
  messagesSent: number;
  messagesDelivered: number;
  deliveryRate: number;
}

export interface DateRange {
  from: string;  // ISO 8601 string
  to: string;    // ISO 8601 string
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
  details?: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
  value: any;
}

// WhatsApp API Types
export interface WhatsAppResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

// UI State Types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export interface ModalState {
  isOpen: boolean;
  type?: string;
  data?: any;
}

// Authentication Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: AdminUser;
  token?: string;
  expiresAt?: string;  // ISO 8601 string
  error?: string;
}

export interface LogoutRequest {
  token: string;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

export interface AuthResponse {
  user: AdminUser;
  token: string;
  expiresAt: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp?: number; // Make exp optional since jwt.sign() will set it
}

export interface AuthState {
  user: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface CreateAdminUserRequest {
  email: string;
  name: string;
  password: string;
}

export interface UpdateAdminUserRequest {
  name?: string;
  email?: string;
  password?: string;
  isActive?: boolean;
}

export interface PasswordHashResult {
  hash: string;
  salt: string;
}

export interface TokenValidationResult {
  isValid: boolean;
  payload?: JWTPayload;
  error?: string;
}