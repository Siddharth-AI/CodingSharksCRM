'use client';

import React, { useState } from 'react';
import { Modal, Button, Input, Select } from '@/components/ui';
import { useCreateLeadMutation, useGetCoursesQuery } from '@/store/api';
import { CreateLeadRequest, LeadSource } from '@/types';

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateLeadModal({ isOpen, onClose, onSuccess }: CreateLeadModalProps) {
  const [createLead, { isLoading }] = useCreateLeadMutation();
  const { data: coursesData } = useGetCoursesQuery();
  
  const [formData, setFormData] = useState<CreateLeadRequest>({
    name: '',
    email: '',
    mobile: '',
    courseInterest: '',
    source: LeadSource.WEBSITE,
    notes: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const courses = coursesData?.data || [];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!/^[+]?[\d\s-()]{10,}$/.test(formData.mobile)) {
      newErrors.mobile = 'Please enter a valid mobile number';
    }

    if (!formData.courseInterest) {
      newErrors.courseInterest = 'Please select a course';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const result = await createLead(formData).unwrap();
      
      if (result.success) {
        // Reset form
        setFormData({
          name: '',
          email: '',
          mobile: '',
          courseInterest: '',
          source: LeadSource.WEBSITE,
          notes: '',
        });
        setErrors({});
        
        // Call success callback and close modal
        onSuccess?.();
        onClose();
      }
    } catch (error: any) {
      console.error('Failed to create lead:', error);
      console.error('Form data sent:', formData);
      setErrors({ submit: error?.data?.error || error?.message || 'Failed to create lead' });
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      mobile: '',
      courseInterest: '',
      source: LeadSource.WEBSITE,
      notes: '',
    });
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Lead"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
            {errors.submit}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Full Name"
            placeholder="Enter full name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            required
          />

          <Input
            label="Email"
            type="email"
            placeholder="Enter email address"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Mobile Number"
            placeholder="+91 9876543210"
            value={formData.mobile}
            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
            error={errors.mobile}
            required
          />

          <Select
            label="Course Interest"
            options={[
              { value: '', label: 'Select a course' },
              ...courses.map(course => ({
                value: course.id,
                label: course.name
              }))
            ]}
            value={formData.courseInterest}
            onChange={(e) => setFormData({ ...formData, courseInterest: e.target.value })}
            error={errors.courseInterest}
            required
          />
        </div>

        <Select
          label="Lead Source"
          options={[
            { value: LeadSource.WEBSITE, label: 'Website' },
            { value: LeadSource.REFERRAL, label: 'Referral' },
            { value: LeadSource.SOCIAL_MEDIA, label: 'Social Media' },
            { value: LeadSource.ADVERTISEMENT, label: 'Advertisement' },
            { value: LeadSource.WALK_IN, label: 'Walk-in' },
          ]}
          value={formData.source}
          onChange={(e) => setFormData({ ...formData, source: e.target.value as LeadSource })}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={3}
            placeholder="Add any additional notes..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
          >
            Create Lead
          </Button>
        </div>
      </form>
    </Modal>
  );
}