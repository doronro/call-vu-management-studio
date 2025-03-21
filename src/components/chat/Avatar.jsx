import React, { useEffect, useRef } from 'react';

const Avatar = ({ speaking = false }) => {
  const avatarRef = useRef(null);
  
  return (
    <div 
      ref={avatarRef} 
      className={`w-24 h-24 md:w-32 md:h-32 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg ${
        speaking ? 'animate-pulse' : ''
      }`}
    >
      <div className="relative w-full h-full">
        {/* Face */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-full flex items-center justify-center">
            {/* Eyes */}
            <div className="flex space-x-4 relative -top-1">
              <div className={`w-2 h-3 md:w-3 md:h-4 bg-blue-900 rounded-full ${speaking ? 'animate-blink' : ''}`}></div>
              <div className={`w-2 h-3 md:w-3 md:h-4 bg-blue-900 rounded-full ${speaking ? 'animate-blink' : ''}`}></div>
            </div>
            
            {/* Mouth */}
            <div 
              className={`absolute w-8 h-2 md:w-10 md:h-3 bg-blue-900 rounded-full bottom-3 md:bottom-4 ${
                speaking ? 'animate-talk h-3 md:h-4' : ''
              }`}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Avatar;