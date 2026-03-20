import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { WhatsAppMessage, MessageStatus } from '@/types';

interface MessagesState {
  items: WhatsAppMessage[];
  isLoading: boolean;
  error: string | null;
  filters: {
    leadId?: string;
    status?: MessageStatus;
    dateFrom?: Date;
    dateTo?: Date;
  };
  sendingQueue: string[]; // Message IDs being sent
  retryQueue: string[]; // Message IDs pending retry
  // Workflow-related state
  scheduledMessages: Array<{
    id: string;
    leadId: string;
    templateId?: string;
    content: string;
    scheduledAt: Date;
    status: 'pending' | 'sent' | 'failed' | 'cancelled';
    workflowType: 'welcome' | 'follow_up' | 'nurturing' | 'conversion' | 'custom';
    sequenceNumber?: number;
    totalInSequence?: number;
  }>;
  workflowStats: {
    totalScheduled: number;
    totalSent: number;
    totalFailed: number;
    byWorkflowType: Record<string, { scheduled: number; sent: number; failed: number }>;
    averageDeliveryTime: number;
  } | null;
  isProcessingWorkflows: boolean;
}

const initialState: MessagesState = {
  items: [],
  isLoading: false,
  error: null,
  filters: {},
  sendingQueue: [],
  retryQueue: [],
  scheduledMessages: [],
  workflowStats: null,
  isProcessingWorkflows: false,
};

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setMessages: (state, action: PayloadAction<WhatsAppMessage[]>) => {
      state.items = action.payload;
    },
    addMessage: (state, action: PayloadAction<WhatsAppMessage>) => {
      state.items.unshift(action.payload);
    },
    updateMessage: (state, action: PayloadAction<WhatsAppMessage>) => {
      const index = state.items.findIndex(message => message.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
    updateMessageStatus: (state, action: PayloadAction<{ id: string; status: MessageStatus; timestamp?: Date; errorMessage?: string }>) => {
      const { id, status, timestamp, errorMessage } = action.payload;
      const message = state.items.find(m => m.id === id);
      if (message) {
        message.status = status;
        if (timestamp) {
          switch (status) {
            case MessageStatus.SENT:
              message.sentAt = timestamp;
              break;
            case MessageStatus.DELIVERED:
              message.deliveredAt = timestamp;
              break;
            case MessageStatus.READ:
              message.readAt = timestamp;
              break;
          }
        }
        if (errorMessage) {
          message.errorMessage = errorMessage;
        }
      }
      // Remove from queues when status changes
      state.sendingQueue = state.sendingQueue.filter(msgId => msgId !== id);
      state.retryQueue = state.retryQueue.filter(msgId => msgId !== id);
    },
    removeMessage: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(message => message.id !== action.payload);
    },
    clearMessages: (state) => {
      state.items = [];
    },
    setFilters: (state, action: PayloadAction<MessagesState['filters']>) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    // Queue management
    addToSendingQueue: (state, action: PayloadAction<string>) => {
      if (!state.sendingQueue.includes(action.payload)) {
        state.sendingQueue.push(action.payload);
      }
    },
    removeFromSendingQueue: (state, action: PayloadAction<string>) => {
      state.sendingQueue = state.sendingQueue.filter(id => id !== action.payload);
    },
    addToRetryQueue: (state, action: PayloadAction<string>) => {
      if (!state.retryQueue.includes(action.payload)) {
        state.retryQueue.push(action.payload);
      }
    },
    removeFromRetryQueue: (state, action: PayloadAction<string>) => {
      state.retryQueue = state.retryQueue.filter(id => id !== action.payload);
    },
    incrementRetryCount: (state, action: PayloadAction<string>) => {
      const message = state.items.find(m => m.id === action.payload);
      if (message) {
        message.retryCount += 1;
      }
    },
    // Workflow management
    setScheduledMessages: (state, action: PayloadAction<MessagesState['scheduledMessages']>) => {
      state.scheduledMessages = action.payload;
    },
    addScheduledMessage: (state, action: PayloadAction<MessagesState['scheduledMessages'][0]>) => {
      state.scheduledMessages.push(action.payload);
    },
    updateScheduledMessage: (state, action: PayloadAction<MessagesState['scheduledMessages'][0]>) => {
      const index = state.scheduledMessages.findIndex(msg => msg.id === action.payload.id);
      if (index !== -1) {
        state.scheduledMessages[index] = action.payload;
      }
    },
    removeScheduledMessage: (state, action: PayloadAction<string>) => {
      state.scheduledMessages = state.scheduledMessages.filter(msg => msg.id !== action.payload);
    },
    clearScheduledMessages: (state) => {
      state.scheduledMessages = [];
    },
    setWorkflowStats: (state, action: PayloadAction<MessagesState['workflowStats']>) => {
      state.workflowStats = action.payload;
    },
    setProcessingWorkflows: (state, action: PayloadAction<boolean>) => {
      state.isProcessingWorkflows = action.payload;
    },
  },
});

export const {
  setLoading,
  setError,
  setMessages,
  addMessage,
  updateMessage,
  updateMessageStatus,
  removeMessage,
  clearMessages,
  setFilters,
  clearFilters,
  addToSendingQueue,
  removeFromSendingQueue,
  addToRetryQueue,
  removeFromRetryQueue,
  incrementRetryCount,
  setScheduledMessages,
  addScheduledMessage,
  updateScheduledMessage,
  removeScheduledMessage,
  clearScheduledMessages,
  setWorkflowStats,
  setProcessingWorkflows,
} = messagesSlice.actions;

// Selectors
export const selectMessages = (state: { messages: MessagesState }) => state.messages.items;
export const selectMessagesLoading = (state: { messages: MessagesState }) => state.messages.isLoading;
export const selectMessagesError = (state: { messages: MessagesState }) => state.messages.error;
export const selectMessagesFilters = (state: { messages: MessagesState }) => state.messages.filters;
export const selectSendingQueue = (state: { messages: MessagesState }) => state.messages.sendingQueue;
export const selectRetryQueue = (state: { messages: MessagesState }) => state.messages.retryQueue;

// Computed selectors
export const selectMessagesByLead = (leadId: string) => (state: { messages: MessagesState }) =>
  state.messages.items.filter(message => message.leadId === leadId);

export const selectMessagesByStatus = (status: MessageStatus) => (state: { messages: MessagesState }) =>
  state.messages.items.filter(message => message.status === status);

export const selectFailedMessages = (state: { messages: MessagesState }) =>
  state.messages.items.filter(message => message.status === MessageStatus.FAILED);

export const selectPendingMessages = (state: { messages: MessagesState }) =>
  state.messages.items.filter(message => message.status === MessageStatus.PENDING);

export const selectMessageStats = (state: { messages: MessagesState }) => {
  const messages = state.messages.items;
  const total = messages.length;
  const sent = messages.filter(m => m.status === MessageStatus.SENT).length;
  const delivered = messages.filter(m => m.status === MessageStatus.DELIVERED).length;
  const failed = messages.filter(m => m.status === MessageStatus.FAILED).length;
  const pending = messages.filter(m => m.status === MessageStatus.PENDING).length;

  return {
    total,
    sent,
    delivered,
    failed,
    pending,
    deliveryRate: total > 0 ? (delivered / total) * 100 : 0,
    failureRate: total > 0 ? (failed / total) * 100 : 0,
  };
};

// Workflow selectors
export const selectScheduledMessages = (state: { messages: MessagesState }) => state.messages.scheduledMessages;
export const selectWorkflowStats = (state: { messages: MessagesState }) => state.messages.workflowStats;
export const selectIsProcessingWorkflows = (state: { messages: MessagesState }) => state.messages.isProcessingWorkflows;

export const selectScheduledMessagesByLead = (leadId: string) => (state: { messages: MessagesState }) =>
  state.messages.scheduledMessages.filter(msg => msg.leadId === leadId);

export const selectScheduledMessagesByWorkflowType = (workflowType: string) => (state: { messages: MessagesState }) =>
  state.messages.scheduledMessages.filter(msg => msg.workflowType === workflowType);

export const selectUpcomingScheduledMessages = (state: { messages: MessagesState }) => {
  const now = new Date();
  const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return state.messages.scheduledMessages.filter(msg => {
    const scheduledAt = new Date(msg.scheduledAt);
    return scheduledAt >= now && scheduledAt <= next24Hours && msg.status === 'pending';
  });
};

export default messagesSlice.reducer;