import React, { useState, useEffect, useRef } from 'react';

export type MetricType = 'repetitions' | 'resistance' | 'distance'; // Export type

interface EditableMetricCellProps {
  initialValue: number | string;
  metricType: MetricType;
  onSave: (newValue: number | string) => void; // Placeholder for saving logic
  validate?: (newValue: number | string, metricType: MetricType) => boolean; // Pass metricType to validation
}

const EditableMetricCell: React.FC<EditableMetricCellProps> = ({
  initialValue,
  metricType,
  onSave,
  validate = () => true, // Default validation passes
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState<string>(String(initialValue));
  const [error, setError] = useState<boolean>(false); // State for validation error
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset internal state if initialValue prop changes externally
  useEffect(() => {
    setCurrentValue(String(initialValue));
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

  const handleAttemptSave = () => {
    // Basic type coercion attempt (can be refined)
    let newValue: number | string = currentValue;
     if (metricType === 'reps') {
        const parsedValue = parseInt(currentValue, 10);
        if (isNaN(parsedValue)) {
             console.warn('Invalid number format for reps');
             setError(true); // Set error for NaN on reps
             return; // Stop processing
        }
        newValue = parsedValue;
    }
    // For resistance/distance, keep as string for now, parsing happens higher up

    if (validate(newValue, metricType)) { // Pass metricType to validator
      setError(false); // Clear error on successful validation
      onSave(newValue);
      setIsEditing(false);
    } else {
      console.warn('Validation failed for:', newValue);
      setError(true); // Set error state
      // Do not setIsEditing(false) - keep input open
    }
  };

  const handleCancel = () => {
    setCurrentValue(String(initialValue));
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
        type={metricType === 'reps' ? 'number' : 'text'} // Use number type for reps
        value={currentValue}
        onChange={handleChange} // Use new handler
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={inputClassName} // Use dynamic class name
        min={metricType === 'reps' ? 0 : undefined} // Basic validation for reps
        aria-invalid={error} // Accessibility hint
      />
    );
  }

  return (
    <span onClick={() => setIsEditing(true)} className="cursor-pointer hover:bg-gray-200 px-1 rounded w-full block text-right min-h-[1.5em]"> {/* Ensure minimum height */}
      {initialValue}
    </span>
  );
};

export default EditableMetricCell;
