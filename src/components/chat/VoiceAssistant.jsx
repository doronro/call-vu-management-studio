import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function VoiceAssistant({ 
  onSpeechRecognized, 
  text, 
  autoSpeak = false, 
  onSpeakingStart, 
  onSpeakingEnd,
  isListening = false,
  onStartListening,
  onStopListening
}) {
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  
  // Setup and cleanup speech recognition
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error("Speech recognition not supported");
      setError("Speech recognition not supported in this browser");
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';
    
    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      console.log("Recognized speech:", transcript);
      onSpeechRecognized(transcript);
    };
    
    recognitionRef.current.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setError(`Recognition error: ${event.error}`);
      setListening(false);
      if (onStopListening) onStopListening();
    };
    
    recognitionRef.current.onend = () => {
      console.log("Recognition ended");
      if (listening) {
        setListening(false);
        if (onStopListening) onStopListening();
      }
    };
    
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [onSpeechRecognized, onStopListening]);
  
  // Handle text-to-speech when text changes
  useEffect(() => {
    if (autoSpeak && text && !speaking) {
      speakText(text);
    }
  }, [text, autoSpeak]);
  
  // Handle listening state changes from parent
  useEffect(() => {
    if (isListening !== listening) {
      if (isListening) {
        startListening();
      } else {
        stopListening();
      }
    }
  }, [isListening]);
  
  // Start listening
  const startListening = () => {
    if (!recognitionRef.current) return;
    
    try {
      recognitionRef.current.start();
      setListening(true);
      setError(null);
      console.log("Started listening");
      if (onStartListening) onStartListening();
    } catch (e) {
      console.error("Error starting recognition:", e);
      setError("Could not start listening");
    }
  };
  
  // Stop listening
  const stopListening = () => {
    if (!recognitionRef.current) return;
    
    try {
      recognitionRef.current.stop();
      setListening(false);
      console.log("Stopped listening");
      if (onStopListening) onStopListening();
    } catch (e) {
      console.error("Error stopping recognition:", e);
    }
  };
  
  // Speak text using the Web Speech API
  const speakText = (textToSpeak) => {
    if (!('speechSynthesis' in window)) {
      console.error("Speech synthesis not supported");
      return;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    if (!textToSpeak) return;
    
    // Remove HTML tags
    const cleanText = textToSpeak.replace(/<[^>]*>?/gm, '');
    console.log("Speaking text:", cleanText);
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    utterance.onstart = () => {
      setSpeaking(true);
      console.log("Started speaking");
      if (onSpeakingStart) onSpeakingStart();
    };
    
    utterance.onend = () => {
      setSpeaking(false);
      console.log("Finished speaking");
      if (onSpeakingEnd) onSpeakingEnd();
    };
    
    window.speechSynthesis.speak(utterance);
  };
  
  const handleMicClick = () => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  };
  
  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative w-full max-w-md mx-auto">
        {speaking && (
          <div className="absolute top-0 right-0">
            <div className="flex items-center space-x-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
              <Volume2 className="h-3 w-3" />
              <span>Speaking...</span>
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 text-red-800 px-3 py-2 rounded-md text-sm my-2">
            {error}
          </div>
        )}
        
        <Button
          onClick={handleMicClick}
          className={`mt-4 mx-auto ${listening ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}
          size="lg"
          type="button"
        >
          {listening ? (
            <>
              <MicOff className="mr-2 h-5 w-5" />
              Stop Listening
            </>
          ) : (
            <>
              <Mic className="mr-2 h-5 w-5" />
              Start Listening
            </>
          )}
        </Button>
      </div>
    </div>
  );
}