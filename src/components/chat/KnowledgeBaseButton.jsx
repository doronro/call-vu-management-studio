import React from 'react';
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";

export default function KnowledgeBaseButton({ onClick, isActive }) {
  return (
    <Button
      onClick={onClick}
      variant={isActive ? "default" : "secondary"}
      size="icon"
      className={`rounded-full shadow-lg ${isActive ? 'bg-blue-600 hover:bg-blue-700' : 'bg-white hover:bg-gray-100'}`}
    >
      <HelpCircle className={`h-5 w-5 ${isActive ? 'text-white' : 'text-blue-600'}`} />
    </Button>
  );
}