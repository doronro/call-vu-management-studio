import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2, Volume, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SimpleVoice = ({ onTextRecognized, textToSpeak, autoSpeak = false }) => {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState(null);
  const [supported, setSupported] = useState({
    speechRecognition: false,
    speechSynthesis: false
  });
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const currentUtteranceRef = useRef(null);
  
  // Initialize speech recognition and synthesis
  useEffect(() => {
    // Check for browser support
    const hasSpeechRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    const hasSpeechSynthesis = 'speechSynthesis' in window;
    
    setSupported({
      speechRecognition: hasSpeechRecognition,
      speechSynthesis: hasSpeechSynthesis
    });
    
    if (hasSpeechRecognition) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript && onTextRecognized) {
          onTextRecognized(transcript);
        }
        setListening(false);
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError(`Recognition error: ${event.error}`);
        setListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setListening(false);
      };
    }
    
    if (hasSpeechSynthesis) {
      synthRef.current = window.speechSynthesis;
    }
    
    // Cleanup function
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (err) {
          console.error("Error aborting recognition:", err);
        }
      }
      
      if (synthRef.current && currentUtteranceRef.current) {
        try {
          synthRef.current.cancel();
        } catch (err) {
          console.error("Error cancelling speech:", err);
        }
      }
    };
  }, [onTextRecognized]);
  
  // Auto-speak effect
  useEffect(() => {
    if (autoSpeak && textToSpeak && !speaking && supported.speechSynthesis) {
      speakText(textToSpeak);
    }
  }, [textToSpeak, autoSpeak, speaking, supported.speechSynthesis]);
  
  const toggleListening = () => {
    if (!supported.speechRecognition) {
      setError("Speech recognition is not supported in your browser.");
      return;
    }
    
    if (listening) {
      try {
        recognitionRef.current.abort();
        setListening(false);
      } catch (err) {
        console.error("Error stopping recognition:", err);
      }
    } else {
      setError(null);
      try {
        recognitionRef.current.start();
        setListening(true);
      } catch (err) {
        console.error("Error starting recognition:", err);
        setError("Could not start recognition. Try refreshing the page.");
      }
    }
  };
  
  const speakText = (text) => {
    if (!supported.speechSynthesis || !text) return;
    
    try {
      // Cancel any ongoing speech
      synthRef.current.cancel();
      
      // Create a new utterance
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      // Set voices (try to use a more natural voice if available)
      const voices = synthRef.current.getVoices();
      if (voices.length > 0) {
        // Try to find a female voice
        const femaleVoice = voices.find(voice => 
          voice.name.includes('female') || 
          voice.name.includes('Samantha') || 
          voice.name.includes('Google UK English Female')
        );
        
        if (femaleVoice) {
          utterance.voice = femaleVoice;
        }
      }
      
      // Set event handlers
      utterance.onstart = () => {
        setSpeaking(true);
      };
      
      utterance.onend = () => {
        setSpeaking(false);
        currentUtteranceRef.current = null;
      };
      
      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event);
        setSpeaking(false);
        currentUtteranceRef.current = null;
      };
      
      // Keep reference to current utterance
      currentUtteranceRef.current = utterance;
      
      // Speak
      synthRef.current.speak(utterance);
    } catch (err) {
      console.error("Error speaking text:", err);
      setSpeaking(false);
    }
  };
  
  const stopSpeaking = () => {
    if (!supported.speechSynthesis) return;
    
    try {
      synthRef.current.cancel();
      setSpeaking(false);
    } catch (err) {
      console.error("Error stopping speech:", err);
    }
  };
  
  return (
    <div className="flex flex-col items-center space-y-4">
      {error && (
        <Alert variant="destructive" className="mb-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="flex justify-center items-center space-x-4">
        {/* Speak button */}
        {supported.speechSynthesis && textToSpeak && (
          <Button
            onClick={speaking ? stopSpeaking : () => speakText(textToSpeak)}
            className={`bg-indigo-600 hover:bg-indigo-700 ${speaking ? 'animate-pulse' : ''}`}
            size="sm"
          >
            {speaking ? (
              <Volume2 className="h-4 w-4 mr-2" />
            ) : (
              <Volume className="h-4 w-4 mr-2" />
            )}
            {speaking ? 'Stop Speaking' : 'Speak Question'}
          </Button>
        )}
        
        {/* Record button */}
        {supported.speechRecognition && (
          <Button
            onClick={toggleListening}
            className={`${listening ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} ${listening ? 'animate-pulse' : ''}`}
            size="sm"
          >
            {listening ? (
              <MicOff className="h-4 w-4 mr-2" />
            ) : (
              <Mic className="h-4 w-4 mr-2" />
            )}
            {listening ? 'Stop Listening' : 'Start Speaking'}
          </Button>
        )}
      </div>
      
      {listening && (
        <div className="text-sm text-gray-500 animate-pulse">
          Listening...
        </div>
      )}
    </div>
  );
};

export default SimpleVoice;