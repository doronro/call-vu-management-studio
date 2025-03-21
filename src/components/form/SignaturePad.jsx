import React, { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";

const SignaturePad = ({ onSubmit, onCancel }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const context = canvas.getContext('2d');
    
    // Set canvas size to match parent width
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      const width = parent.offsetWidth;
      canvas.width = width;
      canvas.height = 200;
      
      // Set the background
      context.fillStyle = '#f9fafb';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      // Set line style
      context.lineWidth = 2.5;
      context.lineCap = 'round';
      context.strokeStyle = '#000';
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);
  
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const context = canvas.getContext('2d');
    
    const rect = canvas.getBoundingClientRect();
    let x, y;
    
    if (e.touches) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    
    context.beginPath();
    context.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };
  
  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const context = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    let x, y;
    
    if (e.touches) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
      
      // Prevent scrolling while drawing
      e.preventDefault();
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    
    context.lineTo(x, y);
    context.stroke();
  };
  
  const stopDrawing = () => {
    if (isDrawing) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const context = canvas.getContext('2d');
      context.closePath();
      setIsDrawing(false);
    }
  };
  
  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const context = canvas.getContext('2d');
    context.fillStyle = '#f9fafb';
    context.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };
  
  const handleSubmit = () => {
    if (!hasSignature) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const signatureData = canvas.toDataURL('image/png');
    if (onSubmit) {
      onSubmit(signatureData);
    }
  };
  
  return (
    <div className="signature-pad-container">
      <p className="text-sm text-gray-500 mb-2">
        Sign in the area below:
      </p>
      
      <div className="border border-gray-300 rounded-md bg-gray-50 mb-4">
        <canvas
          ref={canvasRef}
          className="cursor-crosshair touch-none select-none w-full h-[200px]"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      
      <div className="flex justify-between">
        <div>
          <Button 
            type="button" 
            variant="outline" 
            onClick={clear} 
            className="mr-2"
          >
            Clear
          </Button>
          
          {onCancel && (
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
        </div>
        
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
};

export default SignaturePad;