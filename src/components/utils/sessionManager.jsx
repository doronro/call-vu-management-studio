// Fix the session manager code
import { useState, useCallback, useEffect } from 'react';

export function useSessionManager() {
  const [messages, setMessages] = useState([]);
  
  // Load messages from storage on component mount
  useEffect(() => {
    try {
      const storedMessages = localStorage.getItem('chat_messages');
      if (storedMessages) {
        setMessages(JSON.parse(storedMessages));
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  }, []);
  
  // Add a new message to the chat
  const addMessage = useCallback((text, sender) => {
    const newMessage = {
      id: Date.now(),
      text,
      sender,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prevMessages => {
      const updatedMessages = [...prevMessages, newMessage];
      // Store in localStorage
      try {
        localStorage.setItem('chat_messages', JSON.stringify(updatedMessages));
      } catch (error) {
        console.error("Error saving messages:", error);
      }
      return updatedMessages;
    });
  }, []);
  
  // Get all messages
  const getMessages = useCallback(() => {
    return messages;
  }, [messages]);
  
  return {
    addMessage,
    getMessages
  };
}
export const createSession = (formSchema) => {
  try {
    const sessionId = `form_${Date.now()}`;
    
    // Create session data object
    const sessionData = {
      sessionId,
      originalSchema: formSchema,
      currentSchema: formSchema,
      formData: {},
      blockVisibility: {},
      fieldVisibility: {},
      fieldValues: {}
    };
    
    // Store in local storage
    localStorage.setItem(`session_${sessionId}`, JSON.stringify(sessionData));
    
    return sessionId;
  } catch (error) {
    console.error("Error creating session:", error);
    return null;
  }
};

export const updateSession = (sessionId, updates) => {
  try {
    if (!sessionId) return false;
    
    const sessionStr = localStorage.getItem(`session_${sessionId}`);
    if (!sessionStr) return false;
    
    const session = JSON.parse(sessionStr);
    const updatedSession = { ...session, ...updates };
    
    localStorage.setItem(`session_${sessionId}`, JSON.stringify(updatedSession));
    return true;
  } catch (error) {
    console.error("Error updating session:", error);
    return false;
  }
};

export const getSession = (sessionId) => {
  try {
    if (!sessionId) return null;
    
    const sessionStr = localStorage.getItem(`session_${sessionId}`);
    if (!sessionStr) return null;
    
    return JSON.parse(sessionStr);
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
};

export const processRules = (session, fieldId, newValue) => {
  try {
    if (!session || !session.currentSchema) return null;
    
    const updatedSession = { ...session };
    
    // Update form data
    updatedSession.formData = {
      ...updatedSession.formData,
      [fieldId]: newValue
    };
    
    // Process visibility rules
    if (updatedSession.currentSchema.form?.newRules) {
      updatedSession.currentSchema.form.newRules.forEach(rule => {
        if (rule?.type === "visibility" && rule?.condition) {
          const { when, is } = rule.condition;
          
          if (when === fieldId) {
            const conditionMet = Array.isArray(is) 
              ? is.includes(newValue)
              : newValue === is;
            
            if (rule.actions) {
              rule.actions.forEach(action => {
                const { elementIdentifier, action: actionType } = action;
                if (!elementIdentifier) return;
                
                const isVisible = actionType === 'show' ? conditionMet : !conditionMet;
                
                if (elementIdentifier.startsWith('block_')) {
                  updatedSession.blockVisibility = {
                    ...updatedSession.blockVisibility,
                    [elementIdentifier]: isVisible
                  };
                } else {
                  updatedSession.fieldVisibility = {
                    ...updatedSession.fieldVisibility,
                    [elementIdentifier]: isVisible
                  };
                }
              });
            }
          }
        }
      });
    }
    
    return updatedSession;
  } catch (error) {
    console.error("Error processing rules:", error);
    return null;
  }
};