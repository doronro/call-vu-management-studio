import React, { useState, useEffect } from 'react';
import { Process } from '@/api/entities';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createPageUrl } from '@/utils';
import { useNavigate, Link } from 'react-router-dom';
import { 
  MessageSquare, 
  Mic, 
  User, 
  Loader2, 
  ArrowRight,
  Building2 
} from "lucide-react";

export default function Home() {
  const [processes, setProcesses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [currentTab, setCurrentTab] = useState("chat");
  const navigate = useNavigate();

  useEffect(() => {
    const loadProcesses = async () => {
      try {
        const processList = await Process.list();
        console.log("Loaded processes:", processList);
        setProcesses(processList.filter(p => !!p.formAsset));
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading processes:', error);
        setIsLoading(false);
      }
    };
    
    loadProcesses();
  }, []);

  const handleProcessSelect = (process) => {
    console.log("Selected process:", process);
    setSelectedProcess(process);
  };

  const handleStartSession = () => {
    if (!selectedProcess) {
      console.log("No process selected");
      return;
    }

    try {
      console.log("Starting session with:", {
        processId: selectedProcess.id,
        mode: currentTab,
        processName: selectedProcess.name
      });

      const params = new URLSearchParams({
        processId: selectedProcess.id,
        mode: currentTab
      });

      // Try direct window.location.href navigation as a fallback
      window.location.href = `/FormChat?${params.toString()}`;
      
      // The navigate function should work, but we're using window.location.href as a fallback
      // navigate(`/FormChat?${params.toString()}`);
    } catch (error) {
      console.error("Navigation error:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-10 px-4">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold">Digital Processes Portal</h1>
        <p className="text-gray-500 mt-2">Select a process and interaction mode to begin</p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        <div>
          <h2 className="text-xl font-semibold mb-4">1. Select a Process</h2>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="max-h-[400px] overflow-y-auto p-1">
              {processes.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <p className="text-gray-500">No available processes with forms found</p>
                </div>
              ) : (
                <div className="space-y-2 p-2">
                  {processes.map((process) => (
                    <Card 
                      key={process.id}
                      className={`hover:shadow-md transition-shadow cursor-pointer ${
                        selectedProcess?.id === process.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => handleProcessSelect(process)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          {process.logoUrl ? (
                            <div className="h-10 w-10 rounded overflow-hidden">
                              <img 
                                src={process.logoUrl} 
                                alt={process.name} 
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-blue-600" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-medium">{process.name}</h3>
                            {process.description && (
                              <p className="text-sm text-gray-500 line-clamp-1">{process.description}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">2. Choose Interaction Mode</h2>
          <Tabs defaultValue="chat" className="w-full" onValueChange={setCurrentTab}>
            <TabsList className="grid grid-cols-3 w-full mb-6">
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
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <div className="mt-6">
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
              disabled={!selectedProcess}
              onClick={handleStartSession}
            >
              Start Session <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            {selectedProcess && (
              <div className="mt-2 text-sm text-gray-500 text-center">
                Selected: {selectedProcess.name} ({currentTab} mode)
              </div>
            )}
            
            {/* Alternative direct link approach */}
            {selectedProcess && (
              <div className="mt-4">
                <Link 
                  to={`/FormChat?processId=${selectedProcess.id}&mode=${currentTab}`}
                  className="block w-full text-center text-sm text-blue-600 hover:underline"
                >
                  Alternative: Click here to start session
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
