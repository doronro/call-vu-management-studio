
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Check } from "lucide-react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StarRating from "../form/StarRating";

export default function FormField({ field, value, onChange, onInputChange, onSkip, validationError }) {
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && onInputChange && e.target.value) {
      e.preventDefault();
      onChange(e.target.value);
    }
  };

  if (!field) return null;

  const renderField = () => {
    try {
      switch (field.type) {
        case 'textinput':
          return (
            <div className="flex flex-col space-y-2">
              <Input
                type="text"
                value={value || ''}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your answer..."
                className="mt-2"
                disabled={field.disabled}
              />
              <Button 
                onClick={() => onChange(value)}
                disabled={!value}
                size="sm"
                className="self-end"
              >
                <Check className="h-4 w-4 mr-1" /> Submit
              </Button>
            </div>
          );

        case 'textarea':
          return (
            <div className="flex flex-col space-y-2">
              <Textarea
                value={value || ''}
                onChange={(e) => onInputChange(e.target.value)}
                placeholder="Type your answer..."
                className="mt-2 h-24"
              />
              <Button 
                onClick={() => onChange(value)}
                disabled={!value}
                size="sm"
                className="self-end"
              >
                <Check className="h-4 w-4 mr-1" /> Submit
              </Button>
            </div>
          );

        case 'numberinput':
          return (
            <div className="flex flex-col space-y-2">
              <Input
                type="number"
                value={value || ''}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyPress={handleKeyPress}
                className="mt-2"
                placeholder="Enter a number..."
              />
              <Button 
                onClick={() => onChange(value)}
                disabled={!value}
                size="sm"
                className="self-end"
              >
                <Check className="h-4 w-4 mr-1" /> Submit
              </Button>
            </div>
          );

        case 'signature':
        case 'signatureinput':
        case 'signaturepad':
          return (
            <Button 
              onClick={() => onChange("signature_requested")}
              className="mt-2 bg-blue-600 hover:bg-blue-700"
            >
              Open Signature Pad
            </Button>
          );

        case 'currencyinput':
          return (
            <div className="flex flex-col space-y-2">
              <div className="relative mt-2">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                <Input
                  type="number"
                  value={value || ''}
                  onChange={(e) => onInputChange(e.target.value)}
                  onKeyPress={handleKeyPress}
                  step="0.01"
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
              <Button 
                onClick={() => onChange(value)}
                disabled={!value}
                size="sm"
                className="self-end"
              >
                <Check className="h-4 w-4 mr-1" /> Submit
              </Button>
            </div>
          );

        case 'radioinput':
          return (
            field.properties?.items && (
              <RadioGroup 
                value={value} 
                onValueChange={onChange}
                className="mt-3 space-y-2"
              >
                {field.properties.items.map((item, index) => (
                  <div key={`${field.id}-${index}`} className="flex items-start space-x-2">
                    <RadioGroupItem value={item.value} id={`${field.id}-${index}`} />
                    <Label htmlFor={`${field.id}-${index}`} className="leading-tight cursor-pointer">
                      {item.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )
          );

        case 'checkboxinput':
          return (
            <div className="flex items-center space-x-2 mt-3">
              <Checkbox
                id={field.id}
                checked={value === true}
                onCheckedChange={onChange}
              />
              <Label htmlFor={field.id}>
                {field.properties?.checkboxText || "Yes"}
              </Label>
            </div>
          );

        case 'dropdowninput':
          return (
            <Select value={value} onValueChange={onChange} className="mt-2">
              <SelectTrigger>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {field.properties?.items?.map((item, index) => (
                  <SelectItem key={`${field.id}-${index}`} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );

        case 'dateinput':
          return (
            <div className="mt-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={`w-full justify-start text-left font-normal ${
                      selectedDate ? "" : "text-muted-foreground"
                    }`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Select a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      if (date) {
                        const formattedDate = format(date, "yyyy-MM-dd");
                        onChange(formattedDate);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          );

        case 'ratinginput':
          return (
            <div className="mt-4 flex justify-center">
              <StarRating
                maxScale={field.properties?.maxScale || 5}
                onChange={onChange}
                value={value || 0}
              />
            </div>
          );

        default:
          return <p className="text-sm text-red-500">Unsupported field type: {field.type}</p>;
      }
    } catch (error) {
      console.error("Error rendering field:", error);
      return <p className="text-sm text-red-500">Error rendering field</p>;
    }
  };

  return (
    <div className="space-y-2">
      {field.label && <p className="font-medium">{field.label}</p>}
      {renderField()}
      {validationError && <p className="text-sm text-red-500">{validationError}</p>}
      {onSkip && !field.required && (
        <Button variant="ghost" size="sm" onClick={onSkip} className="mt-2">
          Skip this question
        </Button>
      )}
    </div>
  );
}
