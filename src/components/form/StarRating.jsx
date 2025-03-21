import React, { useState } from 'react';
import { Star } from 'lucide-react';

export default function StarRating({ maxScale = 5, onChange, value }) {
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(value || 0);

  const handleStarClick = (rating) => {
    setSelectedRating(rating);
    
    // Call onChange directly without any async delay
    if (onChange) {
      onChange(rating);
    }
  };

  const handleStarHover = (rating) => {
    setHoverRating(rating);
  };

  const handleMouseLeave = () => {
    setHoverRating(0);
  };

  return (
    <div className="flex flex-col items-center">
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
      
      {selectedRating > 0 && (
        <div className="text-sm text-center mt-2">
          {selectedRating} out of {maxScale} stars
        </div>
      )}
    </div>
  );
}