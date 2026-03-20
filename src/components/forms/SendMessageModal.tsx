'use client';

import React, { useState, useMemo } from 'react';
import { Modal, Button, Input, Select } from '@/components/ui';
import { useSendMessageMutation, useGetLeadsQuery, useGetTemplatesQuery, useGetCoursesQuery } from '@/store/api';
import { renderWhatsAppText } from './WhatsAppTextarea';
import { CreateMessageRequest } from '@/types';

interface SendMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Variables that are auto-filled from lead / course / system data on the server.
// Users do NOT need to supply these manually.
const AUTO_FILLED_VARIABLES = new Set([
  // Lead
  'name', 'first_name', 'last_name', 'email', 'mobile', 'course_interest',
  'inquiry_date',
  // Course
  'course_name', 'course_description', 'course_duration', 'course_price',
  'course_category', 'course_status',
  // System / company
  'company_name', 'support_phone', 'support_email', 'website',
  'current_date', 'current_time', 'current_day', 'current_month', 'current_year',
  'business_hours', 'business_days', 'facebook_page', 'instagram_handle', 'linkedin_page',
  // Follow-up (computed)
  'follow_up_number', 'total_follow_ups', 'remaining_follow_ups',
  'seats_remaining', 'urgency_level', 'is_final_reminder',
]);

/** Extract all {{variable_name}} placeholders from a template string. */
function extractVariables(content: string): string[] {
  const matches = content.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map(m => m.slice(2, -2)))];
}

type FormData = CreateMessageRequest & {
  useTemplate: boolean;
  templateVariables: Record<string, string>;
};

export default function SendMessageModal({ isOpen, onClose, onSuccess }: SendMessageModalProps) {
  const [sendMessage, { isLoading }] = useSendMessageMutation();
  const { data: leadsData }     = useGetLeadsQuery({ page: 1, limit: 100 });
  const { data: templatesData } = useGetTemplatesQuery({ page: 1, limit: 100 });
  const { data: coursesData }   = useGetCoursesQuery();

  const [formData, setFormData] = useState<FormData>({
    leadId: '',
    templateId: '',
    content: '',
    useTemplate: false,
    templateVariables: {},
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const leads     = leadsData?.data     || [];
  const templates = templatesData?.data || [];
  const courses   = coursesData?.data   || [];

  const selectedTemplate = useMemo(
    () => templates.find(t => t.id === formData.templateId),
    [templates, formData.templateId]
  );

  // Variables in the selected template that the user must fill in manually
  const customVariables = useMemo<string[]>(() => {
    if (!selectedTemplate) return [];
    return extractVariables(selectedTemplate.content).filter(v => !AUTO_FILLED_VARIABLES.has(v));
  }, [selectedTemplate]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.leadId)                              newErrors.leadId    = 'Please select a lead';
    if (formData.useTemplate && !formData.templateId)  newErrors.templateId = 'Please select a template';
    if (!formData.useTemplate && !formData.content.trim()) newErrors.content = 'Message content is required';

    // Check custom variables are filled
    customVariables.forEach(v => {
      if (!formData.templateVariables[v]?.trim()) {
        newErrors[`var_${v}`] = `"${v}" is required`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const payload: Record<string, unknown> = {
        leadId: formData.leadId,
        useTemplate: formData.useTemplate,
        ...(formData.useTemplate
          ? { templateId: formData.templateId }
          : { content: formData.content }),
        ...(customVariables.length > 0 ? { templateVariables: formData.templateVariables } : {}),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await sendMessage(payload as any).unwrap();

      if (result.success) {
        resetForm();
        onSuccess?.();
        onClose();
      }
    } catch (error: unknown) {
      const err = error as { data?: { error?: string } };
      setErrors({ submit: err?.data?.error || 'Failed to send message' });
    }
  };

  const resetForm = () => {
    setFormData({ leadId: '', templateId: '', content: '', useTemplate: false, templateVariables: {} });
    setErrors({});
  };

  const handleClose = () => { resetForm(); onClose(); };

  const setVar = (key: string, value: string) =>
    setFormData(prev => ({ ...prev, templateVariables: { ...prev.templateVariables, [key]: value } }));

  // Live preview: replace variables with real lead/course/system values
  const previewContent = useMemo(() => {
    if (!selectedTemplate) return '';

    const selectedLead = leads.find(l => l.id === formData.leadId);
    const leadCourse   = selectedLead ? courses.find(c => c.id === selectedLead.courseInterest) : undefined;
    const now          = new Date();
    const DAY_NAMES    = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const MONTH_NAMES  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    const varMap: Record<string, string> = {};

    // Lead variables
    if (selectedLead) {
      const parts = selectedLead.name.trim().split(/\s+/);
      varMap['name']         = selectedLead.name;
      varMap['first_name']   = parts[0];
      varMap['last_name']    = parts.slice(1).join(' ');
      varMap['email']        = selectedLead.email;
      varMap['mobile']       = selectedLead.mobile;
      varMap['inquiry_date'] = new Date(selectedLead.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    // Course variables
    if (leadCourse) {
      varMap['course_interest']   = leadCourse.name;
      varMap['course_name']       = leadCourse.name;
      varMap['course_duration']   = leadCourse.duration || '';
      varMap['course_price']      = `₹${leadCourse.price?.toLocaleString('en-IN') || ''}`;
      varMap['course_description']= leadCourse.description || '';
    }

    // System variables
    varMap['current_date']  = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    varMap['current_day']   = DAY_NAMES[now.getDay()];
    varMap['current_month'] = MONTH_NAMES[now.getMonth()];
    varMap['current_year']  = now.getFullYear().toString();
    varMap['current_time']  = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    varMap['business_hours']= '11:00 AM - 8:00 PM';

    // User-entered custom variables override everything
    Object.assign(varMap, formData.templateVariables);

    return selectedTemplate.content.replace(/\{\{(\w+)\}\}/g, (_, v) =>
      varMap[v] !== undefined ? varMap[v] : `[${v}]`
    );
  }, [selectedTemplate, formData.leadId, formData.templateVariables, leads, courses]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Send WhatsApp Message" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">

        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
            {errors.submit}
          </div>
        )}

        {/* Lead selector */}
        <Select
          label="Select Lead"
          options={[
            { value: '', label: 'Choose a lead' },
            ...leads.map(l => ({ value: l.id, label: `${l.name} (${l.mobile})` })),
          ]}
          value={formData.leadId}
          onChange={e => setFormData({ ...formData, leadId: e.target.value })}
          error={errors.leadId}
          required
        />

        {/* Use template toggle */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="useTemplate"
            checked={formData.useTemplate}
            onChange={e =>
              setFormData({
                ...formData,
                useTemplate: e.target.checked,
                templateId: e.target.checked ? formData.templateId : '',
                content:    e.target.checked ? '' : formData.content,
                templateVariables: {},
              })
            }
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="useTemplate" className="text-sm font-medium text-gray-700">
            Use message template
          </label>
        </div>

        {formData.useTemplate ? (
          <>
            {/* Template selector */}
            <Select
              label="Select Template"
              options={[
                { value: '', label: 'Choose a template' },
                ...templates.map(t => ({ value: t.id, label: t.name })),
              ]}
              value={formData.templateId}
              onChange={e => setFormData({ ...formData, templateId: e.target.value, templateVariables: {} })}
              error={errors.templateId}
              required
            />

            {selectedTemplate && (
              <>
                {/* Custom variable input fields */}
                {customVariables.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-blue-900">
                      Fill in template variables
                    </h4>
                    <p className="text-xs text-blue-700">
                      These values will be inserted into the message. Lead, course, and system
                      variables are filled automatically.
                    </p>
                    {customVariables.map(v => (
                      <div key={v}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}{' '}
                          <span className="text-gray-400 font-normal">{`{{${v}}}`}</span>
                          <span className="text-red-500 ml-1">*</span>
                        </label>
                        <input
                          type="text"
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors[`var_${v}`] ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder={`Enter ${v.replace(/_/g, ' ')}`}
                          value={formData.templateVariables[v] || ''}
                          onChange={e => setVar(v, e.target.value)}
                        />
                        {errors[`var_${v}`] && (
                          <p className="mt-1 text-xs text-red-600">{errors[`var_${v}`]}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Template preview */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900">Preview</h4>
                    <span className="text-xs text-gray-500">
                      {formData.leadId ? 'Showing actual values for selected lead' : 'Select a lead to see real values'}
                    </span>
                  </div>
                  <div
                    className="text-sm text-gray-700 leading-relaxed bg-white border border-gray-200 rounded p-3"
                    dangerouslySetInnerHTML={{ __html: renderWhatsAppText(previewContent) }}
                  />
                </div>
              </>
            )}
          </>
        ) : (
          /* Free-text message */
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message Content <span className="text-red-500">*</span>
            </label>
            <textarea
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                errors.content ? 'border-red-300' : 'border-gray-300'
              }`}
              rows={6}
              placeholder="Type your message here..."
              value={formData.content}
              onChange={e => setFormData({ ...formData, content: e.target.value })}
              required={!formData.useTemplate}
            />
            {errors.content && <p className="mt-1 text-sm text-red-600">{errors.content}</p>}
            <p className="mt-1 text-xs text-gray-500">{formData.content.length}/4096 characters</p>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Send Message
          </Button>
        </div>
      </form>
    </Modal>
  );
}
