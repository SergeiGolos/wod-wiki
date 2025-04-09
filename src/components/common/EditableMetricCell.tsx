import { MetricValue, RuntimeMetricEdit } from '@/core/timer.types';
import React, { useState, useEffect, useRef } from 'react';

export type MetricType = 'repetitions' | 'resistance' | 'distance'; // Export type

interface EditableMetricCellProps {
  blockKey: string;
  index: number;
  initialValue?: MetricValue;
  metricType: MetricType;
  onSave: (update: RuntimeMetricEdit) => void; // Placeholder for saving logic
  validate?: (newValue: MetricValue, oldValue?: MetricValue) => boolean; // Pass metricType to validation
}

export function createMetricValidation(units: string[]) {
  return (newValue: MetricValue, oldValue?: MetricValue) => {
    if (!newValue.value || newValue.value < 0) {
      return false;
    }

    if (units.length > 0 && !units.includes(newValue.unit)) {
      return false;
    }

    return true;
  };
}

const EditableMetricCell: React.FC<EditableMetricCellProps> = ({
  blockKey,
  index,
  initialValue,
  metricType,
  onSave,
  validate = () => true, // Default validation passes
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState<string>(String(initialValue?.value || ''));
  const [error, setError] = useState<boolean>(false); // State for validation error
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset internal state if initialValue prop changes externally
  useEffect(() => {
    setCurrentValue(String(initialValue?.value || ''));
    setIsEditing(false);
    setError(false); // Reset error on external change
  }, [initialValue]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select(); // Select text for easy replacement
    }
  }, [isEditing]);
  
  const regex = /(\d+)([a-zA-Z\s]*)?/; // Removed 'g' flag
  const handleAttemptSave = () => {
    const parsed = currentValue.match(regex);
    const value = Number(parsed?.[1]); // Use group 1 for value
    const unit = parsed?.[2]?.trim() || ''; // Use group 2 for unit
    const newValue:  MetricValue = { value, unit: unit || initialValue?.unit || '' };             
    
    if (value && !validate(newValue, initialValue)) {     
      console.warn('Validation failed for:' + currentValue, newValue);
      setError(true); // Set error state
      return;
    }

    setError(false); // Clear error on successful validation      
    onSave({ blockKey, index, metricType, newValue, createdAt: new Date() });
    setIsEditing(false);  
  };

  const handleCancel = () => {
    setCurrentValue(String(initialValue?.value));
    setIsEditing(false);
    setError(false); // Clear error on cancel
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent potential form submission if nested
        handleAttemptSave();
    } else if (event.key === 'Escape') {
      handleCancel();
    }
  };

  const handleBlur = () => {
    // Use timeout to allow other events like Enter/Escape's keydown handlers to potentially
    // change state before the blur action is finalized.
    setTimeout(() => {
        // Check if the component is still mounted and in editing mode
        // and if an error hasn't just been set (which means validation failed)
         if (inputRef.current && isEditing && !error) {
             // Re-validate on blur before saving, in case focus is lost without Enter/Escape
             handleAttemptSave();
         } else if (inputRef.current && isEditing && error) {
             // If there's an error, keep the input focused (or at least visible)
             // For simplicity, we just don't call setIsEditing(false)
             // Re-focusing can be jarring, so let's rely on the error style.
             // inputRef.current?.focus(); // Optional: force focus back
         }
    }, 150); // Slightly longer timeout might be needed
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setCurrentValue(e.target.value);
      if (error) {
          setError(false); // Clear error as soon as user types again
      }
  }

  const inputClassName = `w-full px-1 py-0 border rounded bg-white text-black text-right ${
      error ? 'border-red-500' : 'border-blue-500' // Conditional border for error
  }`;

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type={'text'}
        value={currentValue}
        onChange={handleChange} // Use new handler
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={inputClassName} // Use dynamic class name
        aria-invalid={error} // Accessibility hint
      />
    );
  }

  return (
    <span onClick={() => setIsEditing(true)} className="cursor-pointer hover:bg-gray-200 px-1 rounded w-full block text-right min-h-[1.5em]"> {/* Ensure minimum height */}
      {`${initialValue?.value || '-'}${initialValue?.unit || ''}`}
    </span>
  );
};

export default EditableMetricCell;
