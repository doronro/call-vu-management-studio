import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InvokeLLM } from "@/api/integrations";

export default function KnowledgeBaseInput({ onQuestion, onAnswer, onClose }) {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!question.trim()) return;
    
    setError(null);
    setIsLoading(true);
    
    try {
      // Trigger the onQuestion callback first
      onQuestion(question);
      
      // Now call the LLM
      const response = await InvokeLLM({
        prompt: `Answer this customer question about a digital form process: "${question}"
                Provide a helpful, concise answer assuming you are a customer service assistant for an organization that offers digital forms and processes.
                If you don't know the answer, provide a general helpful response about digital forms.`,
        add_context_from_internet: true
      });
      
      // Check if response is valid
      if (response) {
        onAnswer(typeof response === 'string' ? response : JSON.stringify(response));
      } else {
        throw new Error("Received empty response from AI");
      }
    } catch (error) {
      console.error("Error getting answer:", error);
      setError("Sorry, I couldn't get an answer right now. Please try again later.");
      onAnswer("I'm sorry, I couldn't retrieve an answer at this moment. Please try again or contact support if the issue persists.");
    } finally {
      setIsLoading(false);
      setQuestion('');
    }
  };
  
  return (
    <div className="p-4 bg-white rounded-lg shadow-lg max-w-md w-full">
      <div className="mb-4">
        <h3 className="text-lg font-medium mb-2">Ask a Question</h3>
        <p className="text-sm text-gray-500">
          Get help with any questions you have about digital forms and processes.
        </p>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Type your question..."
          disabled={isLoading}
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading || !question.trim()}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
      
      <div className="flex justify-end mt-4">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}