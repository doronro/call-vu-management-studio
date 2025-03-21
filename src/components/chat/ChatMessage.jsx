import React from 'react';
import { Avatar } from "@/components/ui/avatar";
import { Bot, User } from "lucide-react";

export default function ChatMessage({ message, type = "bot", children, isTyping = false }) {
  // Helper function to combine class names
  const cn = (...classes) => classes.filter(Boolean).join(" ");
  
  return (
    <div className={cn(
      "flex gap-2 mb-1", 
      type === "user" ? "flex-row-reverse" : "",
      type === "bot-status" ? "opacity-70" : ""
    )}>
      <Avatar className={cn(
        "h-8 w-8 flex items-center justify-center",
        type === "user" ? "bg-blue-600" : "bg-gray-800"
      )}>
        {type === "user" ? (
          <User className="h-5 w-5 text-white" />
        ) : (
          <Bot className="h-5 w-5 text-white" />
        )}
      </Avatar>
      
      <div className={cn(
        "rounded-lg p-3 max-w-[85%]",
        type === "user" ? "bg-blue-600 text-white" : "bg-gray-100",
        type === "bot-status" ? "bg-gray-50" : ""
      )}>
        {isTyping ? (
          <div className="flex space-x-1 items-center">
            <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
            <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
            <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
          </div>
        ) : (
          <>
            {message && (
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: message }}></div>
            )}
            {children && (
              <div className="mt-2 w-full">
                {children}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}