import React, { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export default function SignaturePad({ onSubmit }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const ctx = useRef(null);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set canvas dimensions
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Get canvas context
    ctx.current = canvas.getContext('2d');
    if (ctx.current) {
      ctx.current.lineWidth = 2;
      ctx.current.strokeStyle = '#000';
      ctx.current.lineJoin = 'round';
      ctx.current.lineCap = 'round';
    }
    
    // Clear canvas
    clearCanvas();
    
    // Handle window resize
    const handleResize = () => {
      const newWidth = canvas.offsetWidth;
      const newHeight = canvas.offsetHeight;
      
      // Save current drawing
      const imageData = ctx.current.getImageData(0, 0, canvas.width, canvas.height);
      
      // Resize canvas
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      // Restore context properties
      ctx.current.lineWidth = 2;
      ctx.current.strokeStyle = '#000';
      ctx.current.lineJoin = 'round';
      ctx.current.lineCap = 'round';
      
      // Restore drawing
      ctx.current.putImageData(imageData, 0, 0);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const clearCanvas = () => {
    if (!ctx.current || !canvasRef.current) return;
    
    ctx.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasSignature(false);
  };

  const getPosition = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Handle touch events
    if (event.touches && event.touches[0]) {
      return {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top
      };
    }
    
    // Handle mouse events
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  };

  const startDrawing = (event) => {
    setIsDrawing(true);
    lastPos.current = getPosition(event);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setHasSignature(true);
    }
  };

  const draw = (event) => {
    if (!isDrawing || !ctx.current) return;
    
    const currentPos = getPosition(event);
    
    ctx.current.beginPath();
    ctx.current.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.current.lineTo(currentPos.x, currentPos.y);
    ctx.current.stroke();
    
    lastPos.current = currentPos;
  };

  const handleSubmit = () => {
    if (!canvasRef.current) return;
    
    // Convert canvas to base64 image data
    const signatureData = canvasRef.current.toDataURL('image/png');
    onSubmit(signatureData);
  };

  return (
    <div className="flex flex-col items-center">
      <div 
        className="w-full border border-gray-300 rounded-md bg-white mb-4 relative"
        style={{ height: '200px' }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400">
            Sign here
          </div>
        )}
      </div>
      
      <div className="flex justify-center gap-4 w-full">
        <Button 
          variant="outline" 
          type="button" 
          onClick={clearCanvas}
          className="flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Clear
        </Button>
        
        <Button 
          type="button" 
          onClick={handleSubmit} 
          disabled={!hasSignature}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Submit Signature
        </Button>
      </div>
    </div>
  );
}