import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

export default function ChatInput({ value, onChange, onSubmit, placeholder = "Type your answer..." }) {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="flex gap-2 p-4 border-t">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        className="flex-1"
      />
      <Button onClick={onSubmit} className="bg-blue-600 hover:bg-blue-700">
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}