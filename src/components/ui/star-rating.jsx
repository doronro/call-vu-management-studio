import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StarRating({ maxScale = 5, onChange, value }) {
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(value || 0);

  const handleStarClick = (rating) => {
    setSelectedRating(rating);
  };

  const handleStarHover = (rating) => {
    setHoverRating(rating);
  };

  const handleMouseLeave = () => {
    setHoverRating(0);
  };

  const handleSubmit = () => {
    if (selectedRating > 0) {
      onChange(selectedRating);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div 
        className="flex gap-1"
        onMouseLeave={handleMouseLeave}
      >
        {Array.from({ length: maxScale }, (_, i) => i + 1).map((rating) => (
          <div
            key={rating}
            onClick={() => handleStarClick(rating)}
            onMouseEnter={() => handleStarHover(rating)}
            className="cursor-pointer transition-all duration-200"
          >
            <Star 
              className={`w-8 h-8 ${
                (hoverRating || selectedRating) >= rating 
                  ? 'fill-yellow-400 text-yellow-400' 
                  : 'text-gray-300'
              }`} 
            />
          </div>
        ))}
      </div>
      
      <div className="text-sm text-center mt-1">
        {selectedRating > 0 ? `You selected ${selectedRating} out of ${maxScale} stars` : 'Please select a rating'}
      </div>
      
      <Button 
        onClick={handleSubmit}
        disabled={selectedRating === 0}
        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white"
      >
        Submit Rating
      </Button>
    </div>
  );
}