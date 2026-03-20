'use client';

import React, { useState } from 'react';
import { Modal, Button, Input } from '@/components/ui';
import { useCreateCourseMutation } from '@/store/api';
import { CourseType, CreateCourseRequest } from '@/types';

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateCourseModal({ isOpen, onClose, onSuccess }: CreateCourseModalProps) {
  const [createCourse, { isLoading }] = useCreateCourseMutation();
  
  const [formData, setFormData] = useState<CreateCourseRequest>({
    name: '',
    description: '',
    duration: '',
    courseType: CourseType.REGULAR,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Course name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.duration.trim()) {
      newErrors.duration = 'Duration is required';
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
      const result = await createCourse(formData).unwrap();
      
      if (result.success) {
        // Reset form
        setFormData({
          name: '',
          description: '',
          duration: '',
          courseType: CourseType.REGULAR,
        });
        setErrors({});

        // Call success callback and close modal
        onSuccess?.();
        onClose();
      }
    } catch (error: any) {
      console.error('Failed to create course:', error);
      setErrors({ submit: error?.data?.error || 'Failed to create course' });
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      duration: '',
      price: 0,
      courseType: CourseType.REGULAR,
    });
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Course"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
            {errors.submit}
          </div>
        )}

        <Input
          label="Course Name"
          placeholder="Enter course name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          error={errors.name}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
              errors.description ? 'border-red-300' : 'border-gray-300'
            }`}
            rows={4}
            placeholder="Enter course description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Course Type <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={formData.courseType}
            onChange={(e) => setFormData({ ...formData, courseType: e.target.value as CourseType })}
          >
            <option value={CourseType.REGULAR}>Regular Course</option>
            <option value={CourseType.WORKSHOP}>Workshop</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Duration"
            placeholder="e.g., 3 months"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            error={errors.duration}
            required
          />

          <Input
            label="Price (₹)"
            type="number"
            placeholder="Enter price (leave blank if free)"
            value={formData.price ?? ''}
            onChange={(e) => setFormData({ ...formData, price: e.target.value ? parseFloat(e.target.value) : undefined })}
            error={errors.price}
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
            Create Course
          </Button>
        </div>
      </form>
    </Modal>
  );
}