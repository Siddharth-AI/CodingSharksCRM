'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Select } from '@/components/ui';
import { MessageTemplate, TemplateType } from '@/types';
import { useUpdateTemplateMutation } from '@/store/api';
import { useAppSelector } from '@/hooks/redux';
import { selectCourses } from '@/store/slices/coursesSlice';
import { MediaUpload } from './MediaUpload';
import { WhatsAppTextarea, renderWhatsAppText } from './WhatsAppTextarea';

// ─── All auto-filled variables (server fills these from DB / env) ─────────────
const AUTO_FILL_GROUPS = [
  {
    label: 'Lead',
    color: 'green',
    vars: [
      { key: 'name',            desc: 'Full name' },
      { key: 'first_name',      desc: 'First name' },
      { key: 'email',           desc: 'Email address' },
      { key: 'mobile',          desc: 'Mobile number' },
      { key: 'course_interest', desc: 'Interested course name' },
      { key: 'inquiry_date',    desc: 'Date of inquiry' },
    ],
  },
  {
    label: 'Course',
    color: 'blue',
    vars: [
      { key: 'course_name',        desc: 'Course name' },
      { key: 'course_price',       desc: 'Course price (₹)' },
      { key: 'course_duration',    desc: 'Duration' },
      { key: 'course_description', desc: 'Description' },
      { key: 'course_category',    desc: 'Category' },
    ],
  },
  {
    label: 'System',
    color: 'gray',
    vars: [
      { key: 'company_name',   desc: 'Company name' },
      { key: 'support_phone',  desc: 'Support phone' },
      { key: 'support_email',  desc: 'Support email' },
      { key: 'website',        desc: 'Website URL' },
      { key: 'current_date',   desc: "Today's date" },
      { key: 'current_day',    desc: "Today's day" },
      { key: 'business_hours', desc: 'Business hours (11AM–8PM)' },
    ],
  },
];

const AUTO_FILL_KEYS = new Set(
  AUTO_FILL_GROUPS.flatMap(g => g.vars.map(v => v.key))
);

const GROUP_COLORS: Record<string, string> = {
  green: 'bg-green-100 text-green-800 border-green-200',
  blue:  'bg-blue-100  text-blue-800  border-blue-200',
  gray:  'bg-gray-100  text-gray-700  border-gray-200',
};

function extractVars(content: string): string[] {
  return [...new Set((content.match(/\{\{(\w+)\}\}/g) || []).map(m => m.slice(2, -2)))];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  template: MessageTemplate;
  onSuccess?: () => void;
}

export const EditTemplateModal: React.FC<Props> = ({ isOpen, onClose, template, onSuccess }) => {
  const [updateTemplate, { isLoading }] = useUpdateTemplateMutation();
  const courses = useAppSelector(selectCourses);

  const [formData, setFormData] = useState({
    name:     template.name,
    content:  template.content,
    type:     template.type,
    isActive: template.isActive,
  });
  const [variableDefaults, setVariableDefaults] = useState<Record<string, string>>(
    template.variableDefaults || {}
  );
  const [mediaImageUrl, setMediaImageUrl] = useState<string | undefined>(template.mediaImageUrl);
  const [mediaVideoUrl, setMediaVideoUrl] = useState<string | undefined>(template.mediaVideoUrl);
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [showVarPanel, setShowVarPanel] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name:     template.name,
        content:  template.content,
        type:     template.type,
        isActive: template.isActive,
      });
      setVariableDefaults(template.variableDefaults || {});
      setMediaImageUrl(template.mediaImageUrl);
      setMediaVideoUrl(template.mediaVideoUrl);
      setErrors({});
    }
  }, [isOpen, template]);

  const detectedVars = useMemo(() => extractVars(formData.content), [formData.content]);
  const customVars   = detectedVars.filter(v => !AUTO_FILL_KEYS.has(v));
  const autoVars     = detectedVars.filter(v =>  AUTO_FILL_KEYS.has(v));

  const insertVar = (key: string) => {
    setFormData(f => ({ ...f, content: f.content + `{{${key}}}` }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.name.trim()) e.name = 'Template name is required';
    if (!formData.content.trim()) e.content = 'Template content is required';
    if (formData.content.length > 4096) e.content = 'Content must be less than 4096 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await updateTemplate({
        id: template.id,
        data: {
          name:             formData.name,
          content:          formData.content,
          type:             formData.type,
          isActive:         formData.isActive,
          variables:        detectedVars,
          variableDefaults,
          mediaImageUrl:    mediaImageUrl || null,
          mediaVideoUrl:    mediaVideoUrl || null,
        },
      }).unwrap();
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const e = err as { data?: { error?: string } };
      setErrors({ submit: e?.data?.error || 'Failed to update template' });
    }
  };

  // Live preview
  const preview = useMemo(() => {
    return formData.content.replace(/\{\{(\w+)\}\}/g, (_, v) => {
      if (variableDefaults[v]) return variableDefaults[v];
      if (AUTO_FILL_KEYS.has(v)) return `[${v}]`;
      return `{{${v}}}`;
    });
  }, [formData.content, variableDefaults]);

  const selectedCourse = courses.find(c => c.id === template.courseId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Message Template" size="xl">
      <form onSubmit={handleSubmit} className="flex gap-4 h-full">

        {/* ── Left: Form ── */}
        <div className="flex-1 space-y-4 min-w-0">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm">
              {errors.submit}
            </div>
          )}

          {/* Course info (read-only) */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            <p className="text-sm text-blue-700">
              <strong>Course:</strong> {selectedCourse?.name || template.courseId}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-300' : 'border-gray-300'}`}
                placeholder="e.g. Python Welcome Message"
                value={formData.name}
                onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>
            <Select
              label="Template Type"
              options={[
                { value: TemplateType.WELCOME,          label: 'Welcome' },
                { value: TemplateType.FOLLOW_UP_DAY_1,  label: 'Follow-up Day 1' },
                { value: TemplateType.FOLLOW_UP_DAY_2,  label: 'Follow-up Day 2' },
                { value: TemplateType.FOLLOW_UP_DAY_3,  label: 'Follow-up Day 3' },
                { value: TemplateType.CUSTOM,            label: 'Custom' },
              ]}
              value={formData.type}
              onChange={e => setFormData(f => ({ ...f, type: e.target.value as TemplateType }))}
            />
          </div>

          {/* Content */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">
                Message Content <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-gray-400">{formData.content.length}/4096</span>
            </div>
            <WhatsAppTextarea
              value={formData.content}
              onChange={v => setFormData(f => ({ ...f, content: v }))}
              placeholder="Type message here. Use toolbar for formatting. Click any variable on the right to insert it."
              rows={7}
              error={!!errors.content}
            />
            {errors.content && <p className="mt-1 text-xs text-red-600">{errors.content}</p>}
          </div>

          {/* Detected vars summary */}
          {detectedVars.length > 0 && (
            <div className="space-y-2">
              {autoVars.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Auto-filled variables (no input needed at send time):</p>
                  <div className="flex flex-wrap gap-1">
                    {autoVars.map(v => (
                      <span key={v} className="px-2 py-0.5 text-xs bg-green-50 text-green-700 border border-green-200 rounded-full">
                        {`{{${v}}}`} ✓
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {customVars.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Custom variables — set optional default values:</p>
                  <div className="space-y-2">
                    {customVars.map(v => (
                      <div key={v} className="flex items-center gap-2">
                        <span className="px-2 py-1 text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded font-mono shrink-0">
                          {`{{${v}}}`}
                        </span>
                        <input
                          type="text"
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                          placeholder={`Default value for ${v} (optional)`}
                          value={variableDefaults[v] || ''}
                          onChange={e => setVariableDefaults(d => ({ ...d, [v]: e.target.value }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Media Attachments */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <MediaUpload
              label="Image Attachment"
              type="image"
              currentUrl={mediaImageUrl}
              onUpload={setMediaImageUrl}
              onRemove={() => setMediaImageUrl(undefined)}
              disabled={isLoading}
            />
            <MediaUpload
              label="Video Attachment"
              type="video"
              currentUrl={mediaVideoUrl}
              onUpload={setMediaVideoUrl}
              onRemove={() => setMediaVideoUrl(undefined)}
              disabled={isLoading}
            />
          </div>

          {/* Preview */}
          {formData.content && (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-2">Preview (WhatsApp formatting applied):</p>
              <div
                className="text-sm text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderWhatsAppText(preview) }}
              />
            </div>
          )}

          {/* Active toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={e => setFormData(f => ({ ...f, isActive: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Template is active</span>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>Update Template</Button>
          </div>
        </div>

        {/* ── Right: Variable Cheatsheet ── */}
        <div className="w-56 shrink-0 border-l border-gray-200 pl-4">
          <button
            type="button"
            className="flex items-center justify-between w-full text-xs font-semibold text-gray-600 mb-2"
            onClick={() => setShowVarPanel(v => !v)}
          >
            <span>Available Variables</span>
            <span>{showVarPanel ? '▲' : '▼'}</span>
          </button>
          {showVarPanel && (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {AUTO_FILL_GROUPS.map(group => (
                <div key={group.label}>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">{group.label}</p>
                  <div className="space-y-1">
                    {group.vars.map(v => (
                      <button
                        key={v.key}
                        type="button"
                        title={v.desc}
                        onClick={() => insertVar(v.key)}
                        className={`w-full text-left px-2 py-1 text-[11px] border rounded hover:opacity-80 transition-opacity font-mono truncate ${GROUP_COLORS[group.color]}`}
                      >
                        {`{{${v.key}}}`}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Custom</p>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Type any <span className="font-mono bg-orange-50 text-orange-700 px-1 rounded">{`{{your_var}}`}</span> in the content — it will appear above as a custom variable where you can set a default value.
                </p>
              </div>
            </div>
          )}
        </div>

      </form>
    </Modal>
  );
};
