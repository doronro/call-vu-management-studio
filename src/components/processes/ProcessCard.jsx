import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Trash2, FileText, Settings } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function ProcessCard({ process, onDelete }) {
  const formattedDate = process.createdDate ? new Date(process.createdDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }) : 'N/A';
  
  const hasFormAsset = !!process.formAsset;
  const hasKnowledgeBase = process.knowledgebaseAssets && process.knowledgebaseAssets.length > 0;
  const hasDocumentation = process.documentationAssets && process.documentationAssets.length > 0;
  const hasDataAssets = process.dataAssets && process.dataAssets.length > 0;

  const handleNavigation = (path) => {
    // Simple navigation that works in both environments
    window.location.href = path;
  };
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
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
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            )}
            <CardTitle className="text-lg">{process.name}</CardTitle>
          </div>
          
          <Button 
            size="icon"
            variant="ghost"
            className="rounded-full h-8 w-8 bg-blue-600 hover:bg-blue-700 text-white"
            disabled={!hasFormAsset}
            onClick={() => hasFormAsset && handleNavigation(`/ProcessRunner?id=${process.id}`)}
          >
            <Play className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="text-sm text-gray-500">
        {process.description && (
          <p className="mb-2">{process.description}</p>
        )}
        
        <div className="flex flex-wrap gap-2 mt-3">
          {hasFormAsset && (
            <Badge variant="outline" className="bg-green-50">Form</Badge>
          )}
          {hasKnowledgeBase && (
            <Badge variant="outline" className="bg-blue-50">Knowledge Base</Badge>
          )}
          {hasDataAssets && (
            <Badge variant="outline" className="bg-amber-50">Data Assets</Badge>
          )}
          {hasDocumentation && (
            <Badge variant="outline" className="bg-purple-50">Documentation</Badge>
          )}
        </div>
        
        <p className="text-xs mt-3 text-gray-400">Created: {formattedDate}</p>
      </CardContent>
      
      <CardFooter className="pt-2 flex justify-between gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => onDelete(process.id)}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
        
        <Button 
          size="sm"
          variant="outline"
          onClick={() => handleNavigation(`/ProcessDetail?id=${process.id}`)}
        >
          <Settings className="h-4 w-4 mr-1" />
          Manage Process
        </Button>
      </CardFooter>
    </Card>
  );
}