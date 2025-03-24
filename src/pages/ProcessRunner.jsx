
import React, { useState, useEffect } from 'react';
import { Process } from '@/api/entities';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpCircle, Loader2, ChevronLeft, MessageSquare, Mic, User } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import KnowledgeBaseButton from "../components/chat/KnowledgeBaseButton";
import KnowledgeBaseInput from "../components/chat/KnowledgeBaseInput";

export default function ProcessRunner() {
  const [process, setProcess] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
  const [currentTab, setCurrentTab] = useState("chat");
  
  useEffect(() => {
    const loadProcess = async () => {
      try {
        console.log("ProcessRunner: Page loaded");
        
        const urlParams = new URLSearchParams(window.location.search);
        const processId = urlParams.get('id');
        
        console.log("ProcessRunner: Process ID from URL:", processId);
        
        if (!processId) {
          console.error("No process ID provided in URL");
          setError("No process ID provided");
          setIsLoading(false);
          return;
        }
        
        console.log("ProcessRunner: Fetching process with ID:", processId);
        
        const processes = await Process.filter({ id: processId });
        console.log("ProcessRunner: Fetched processes:", processes);
        
        if (processes.length === 0) {
          console.error("Process not found with ID:", processId);
          setError("Process not found");
          setIsLoading(false);
          return;
        }
        
        setProcess(processes[0]);
      } catch (error) {
        console.error("Error loading process:", error);
        setError("Failed to load process data");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProcess();
  }, []);
  
  const handleKnowledgeBaseToggle = () => {
    setShowKnowledgeBase(!showKnowledgeBase);
  };
  
  const handleKnowledgeBaseQuestion = (question) => {
    console.log("Knowledge base question:", question);
  };
  
  const handleKnowledgeBaseAnswer = (answer) => {
    console.log("Knowledge base answer:", answer);
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-10 flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto py-10">
        <Link
          to={createPageUrl('Dashboard')}
          className="inline-flex items-center mb-6 text-blue-600 hover:text-blue-800"
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Link>
        
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <p className="text-red-700">{error}</p>
          <p className="text-red-700 mt-2">Please return to the dashboard and try again.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-6">
        <Link
          to={createPageUrl('Dashboard')}
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-2">{process?.name || "Process"}</h1>
      <p className="text-gray-500 mb-6">{process?.description || ""}</p>
      
      <Tabs defaultValue="chat" className="w-full mb-8" onValueChange={setCurrentTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto mb-6">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span>Chat</span>
          </TabsTrigger>
          <TabsTrigger value="voice" className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            <span>Voice</span>
          </TabsTrigger>
          <TabsTrigger value="avatar" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Avatar</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="chat">
          <Card>
            <CardHeader>
              <CardTitle>Chat Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Start a conversation-based form completion experience with text-based interaction.
              </p>
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link to={`${createPageUrl('FormChat')}?processId=${process?.id}`}>
                  Start Chat
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="voice">
          <Card>
            <CardHeader>
              <CardTitle>Voice Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Complete the form using voice commands and speech recognition for a hands-free experience.
              </p>
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link to={`${createPageUrl('FormChat')}?processId=${process?.id}`}>
                  Start Voice Mode
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="avatar">
          <Card>
            <CardHeader>
              <CardTitle>Avatar Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Complete the form with an interactive avatar guiding you through the process.
              </p>
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link to={`${createPageUrl('FormChat')}?processId=${process?.id}`}>
                  Start Avatar Mode
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="fixed right-6 bottom-6 z-10">
        <KnowledgeBaseButton 
          onClick={handleKnowledgeBaseToggle}
          isActive={showKnowledgeBase}
        />
      </div>
      
      {showKnowledgeBase && (
        <div className="fixed right-6 bottom-20 z-20 animate-fade-in">
          <KnowledgeBaseInput
            onQuestion={handleKnowledgeBaseQuestion}
            onAnswer={handleKnowledgeBaseAnswer}
            onClose={() => setShowKnowledgeBase(false)}
          />
        </div>
      )}
    </div>
  );
}
