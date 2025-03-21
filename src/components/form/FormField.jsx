// Ensure the FormField component properly updates when values change
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StarRating from "../form/StarRating";

export default function FormField({ field, value, onChange, onInputChange, onSkip, validationError }) {
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null);
  const [localValue, setLocalValue] = useState(value || '');
  
  // Update local value when prop value changes
  useEffect(() => {
    setLocalValue(value || '');
    if (field.type === 'dateinput' && value) {
      setSelectedDate(new Date(value));
    }
  }, [value, field]);
  
  if (!field) return null;
  
  const handleLocalChange = (newValue) => {
    setLocalValue(newValue);
    onInputChange(newValue);
  };
  
  const renderField = () => {
    // ... existing field rendering code ...
  };
  
  return (
    <div className="w-full">
      <div className="mb-1 flex justify-between items-center">
        <label className="block text-sm font-medium text-gray-700">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {onSkip && (
          <Button 
            type="button" 
            variant="ghost" 
            onClick={onSkip}
            className="text-xs px-2 py-1 h-auto"
          >
            Skip
          </Button>
        )}
      </div>
      
      {renderField()}
      
      {validationError && (
        <p className="text-sm text-red-500 mt-1">{validationError}</p>
      )}
      
      <div className="flex justify-end mt-4 gap-2">
        <Button 
          type="button" 
          onClick={() => onChange(localValue)} 
          className="bg-blue-600 hover:bg-blue-700"
          disabled={field.required && !localValue}
        >
          Submit
        </Button>
      </div>
    </div>
  );
}