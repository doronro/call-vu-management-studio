import React from 'react';
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Trash2, Download } from "lucide-react";

export default function AssetCard({ asset, onDelete, icon }) {
  if (!asset) return null;
  
  const { name, url, size, uploadDate } = asset;
  
  // Format date with a fallback
  const formattedDate = uploadDate ? 
    formatDistanceToNow(new Date(uploadDate), { addSuffix: true }) : 
    "Recently";
  
  // Format file size with a simple function since the utility might not be available
  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return "Unknown size";
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const formattedSize = formatFileSize(size);
  
  return (
    <div className="flex items-center p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors">
      <div className="mr-3">
        {icon}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{name}</p>
        <p className="text-xs text-gray-500">
          {formattedSize} • Uploaded {formattedDate}
        </p>
      </div>
      
      <div className="flex gap-2">
        <Button 
          variant="ghost" 
          size="icon"
          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50" 
          onClick={() => window.open(url, '_blank')}
        >
          <Download className="h-4 w-4" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon"
          className="text-red-500 hover:text-red-700 hover:bg-red-50" 
          onClick={() => {
            if (typeof onDelete === 'function') {
              onDelete();
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}