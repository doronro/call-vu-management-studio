import React, { useState, useEffect, useRef } from 'react';
import { FormContext } from '@/api/entities';
import { FormSchema } from '@/api/entities';
import { Process } from '@/api/entities'; // Add Process import
import { Session } from '@/api/entities';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload } from "lucide-react";
import ChatMessage from '../components/chat/ChatMessage';
import FormField from '../components/chat/FormField';
import SummaryTable from '../components/chat/SummaryTable';
import SignaturePad from '../components/form/SignaturePad';
import { createSession, updateSession, getSession, processRules } from '@/components/utils/sessionManager';
import Avatar from '../components/chat/Avatar';
import SimpleVoice from '../components/chat/SimpleVoice';
import KnowledgeBaseButton from '../components/chat/KnowledgeBaseButton'; 
import KnowledgeBaseInput from '../components/chat/KnowledgeBaseInput'; 

const createLocalSession = (schema) => {
  const sessionId = `form_${Date.now()}`;
  const sessionData = {
    sessionId,
    schema,
    formData: {},
    blockVisibility: {},
    fieldVisibility: {},
  };
  try {
    localStorage.setItem(`form_session_${sessionId}`, JSON.stringify(sessionData));
    return sessionId;
  } catch (error) {
    console.error("Error saving session:", error);
    return null;
  }
};

export default function FormChat() {
  const [messages, setMessages] = useState([]);
  const [currentFieldIndex, setCurrentFieldIndex] = useState(-1);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);
  const [completed, setCompleted] = useState(false);
  const [currentSection, setCurrentSection] = useState("");
  const [currentInputValue, setCurrentInputValue] = useState('');
  const [validationError, setValidationError] = useState(null);
  const [formTitle, setFormTitle] = useState("");
  const [formLoaded, setFormLoaded] = useState(false);
  const [fields, setFields] = useState([]);
  const [sections, setSections] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [visibilityRules, setVisibilityRules] = useState([]);
  const [updatingRules, setUpdatingRules] = useState([]);
  const [blockVisibility, setBlockVisibility] = useState({});
  const fileInputRef = useRef(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [currentSignatureField, setCurrentSignatureField] = useState(null);
  const [fieldVisibility, setFieldVisibility] = useState({});
  const [globalVariables, setGlobalVariables] = useState({});
  const [processedSections, setProcessedSections] = useState({});
  const [answeredFields, setAnsweredFields] = useState({});
  const [interactionMode, setInteractionMode] = useState("chat");
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [currentReadingText, setCurrentReadingText] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const lastBotMessageRef = useRef("");
  const speechSynthesisRef = useRef(null);
  const [networkAvailable, setNetworkAvailable] = useState(true);
  const [useTextFallback, setUseTextFallback] = useState(false);
  const maxReconnectAttempts = 2;
  const [formSchema, setFormSchema] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [processId, setProcessId] = useState(null);
  const [processName, setProcessName] = useState("");
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
  const [knowledgeBaseQuery, setKnowledgeBaseQuery] = useState("");
  const [knowledgeBaseResults, setKnowledgeBaseResults] = useState([]);
  const [isSearchingKnowledgeBase, setIsSearchingKnowledgeBase] = useState(false);
  const [showRatingInput, setShowRatingInput] = useState(false);
  const [userRating, setUserRating] = useState(0);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const formId = urlParams.get('formId');
    const processIdParam = urlParams.get('processId');
    const modeParam = urlParams.get('mode');
    
    console.log("URL Parameters:", { formId, processId: processIdParam, mode: modeParam });
    
    if (processIdParam) {
      setProcessId(processIdParam);
      if (modeParam) {
        setInteractionMode(modeParam);
      }
      loadProcess(processIdParam);
    } else if (formId) {
      loadForm(formId);
    } else {
      loadDefaultForm();
    }
    
    return () => {
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const loadProcess = async (processId) => {
    try {
      setLoading(true);
      console.log("Loading process with ID:", processId);
      const processes = await Process.filter({ id: processId });
      console.log("Process filter result:", processes);
      
      if (processes.length === 0) {
        console.error("Process not found");
        return;
      }
      
      const process = processes[0];
      setProcessName(process.name || "Form Process");
      
      if (process.formSchemaId) {
        console.log("Loading form schema with ID:", process.formSchemaId);
        loadForm(process.formSchemaId);
      } else {
        console.error("No form schema associated with this process");
      }
      
      // Create a new session for this process
      const newSessionId = `session_${Date.now()}`;
      setSessionId(newSessionId);
      
      try {
        console.log("Creating new session:", {
          sessionId: newSessionId,
          processId: processId,
          mode: interactionMode,
          startTime: new Date().toISOString()
        });
        
        await Session.create({
          sessionId: newSessionId,
          processId: processId,
          mode: interactionMode,
          startTime: new Date().toISOString(),
          completed: false,
          formData: {}
        });
        
        console.log("Session created successfully");
      } catch (error) {
        console.error("Error creating session:", error);
      }
      
    } catch (error) {
      console.error("Error loading process:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadForm = async (formId) => {
    try {
      setLoading(true);
      console.log("Loading form schema with ID:", formId);
      const formSchemas = await FormSchema.filter({ id: formId });
      console.log("Form schema filter result:", formSchemas);
      
      if (formSchemas.length === 0) {
        console.error("Form schema not found");
        return;
      }
      
      const schema = formSchemas[0];
      initializeForm(schema);
    } catch (error) {
      console.error("Error loading form:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultForm = () => {
    // For demo purposes, load a default form
    fetch('/defaultForm.json')
      .then(response => response.json())
      .then(schema => {
        initializeForm(schema);
      })
      .catch(error => {
        console.error("Error loading default form:", error);
        setLoading(false);
      });
  };

  const trackQuestion = async (question, answer) => {
    try {
      if (!sessionId) return;
      
      const sessions = await Session.filter({ sessionId: sessionId });
      if (sessions.length === 0) return;

      const session = sessions[0];
      const questions = Array.isArray(session.questions) ? [...session.questions] : [];

      questions.push({
        question: question,
        answer: answer,
        timestamp: new Date().toISOString()
      });

      await Session.update(session.id, { questions });
    } catch (error) {
      console.error("Error tracking question:", error);
    }
  };

  const handleFormResponse = async (value, source = 'manual') => {
    const currentField = getCurrentField();
    if (!currentField) return;

    console.log(`Processing response for field ${currentField.id}:`, value, `(source: ${source})`);
    
    // Clear any previous validation errors
    setValidationError(null);
    
    // Validate the input if needed
    if (currentField.validation) {
      const isValid = validateInput(value, currentField.validation);
      if (!isValid) {
        const errorMessage = currentField.validation.errorMessage || "Invalid input. Please try again.";
        setValidationError(errorMessage);
        addMessage(errorMessage, "bot", "error");
        return;
      }
    }
    
    // Update form data
    const updatedFormData = { ...formData };
    updatedFormData[currentField.id] = value;
    setFormData(updatedFormData);
    
    // Mark this field as answered
    setAnsweredFields(prev => ({
      ...prev,
      [currentField.id]: true
    }));
    
    // Add user's response to chat
    let displayValue = value;
    
    // Format display value based on field type
    if (currentField.type === 'select' || currentField.type === 'dropdown') {
      const option = currentField.options?.find(opt => opt.value === value);
      if (option) {
        displayValue = option.label;
      }
    } else if (currentField.type === 'checkboxinput') {
      displayValue = value === true ? 'Yes' : 'No';
    } else if (currentField.type === 'ratinginput') {
      displayValue = `${value} stars`;
    } else if (currentField.type === 'signature' || currentField.type === 'signatureinput' || currentField.type === 'signaturepad') {
      displayValue = "Signature provided";
    }
    
    addMessage(displayValue, "user");
    
    // Process any rules that might be triggered by this response
    if (visibilityRules.length > 0) {
      processVisibilityRules(currentField.id, value);
    }
    
    // Move to the next field
    moveToNextField();
  };

  const moveToNextSection = async () => {
    const currentSectionIndex = sections.findIndex(section => section.id === currentSection);
    if (currentSectionIndex < sections.length - 1) {
      const nextSection = sections[currentSectionIndex + 1].id;
      setProcessedSections(prev => ({
        ...prev,
        [currentSection]: true
      }));
      navigateToSection(nextSection);
    } else {
      setCompleted(true);

      const summaryData = [];

      for (const field of fields) {
        if (field.type === 'paragraph' || field.type === 'smartbutton' ||
          field.type === 'separator' || field.type === 'divider') {
          continue;
        }

        if (!isFieldVisible(field)) {
          continue;
        }

        const value = formData[field.id];
        if (value === undefined || value === null || value === '') {
          continue;
        }

        let displayValue = value;
        let rawValue = value;

        if (field.type === 'select' || field.type === 'dropdown') {
          const option = field.options?.find(opt => opt.value === value);
          if (option) {
            displayValue = option.label;
          }
        } else if (field.type === 'checkboxinput') {
          displayValue = rawValue === true ? 'Yes' : 'No';
        } else if (field.type === 'dateinput' && displayValue !== "Not provided") {
          displayValue = formatDate(displayValue);
        } else if ((field.type === 'signatureinput' || field.type === 'signaturepad' || field.type === 'signature') && displayValue !== "Not provided") {
          displayValue = `<img src="${displayValue}" alt="Signature" style="max-width: 200px; height: auto;" />`;
        } else if (field.type === 'ratinginput' && rawValue !== undefined) {
          displayValue = `${rawValue} stars`;
        } else if (field.type === 'currencyinput' && displayValue !== "Not provided") {
          displayValue = `$${parseFloat(displayValue).toFixed(2)}`;
        }

        summaryData.push({
          label: field.label || field.id,
          value: displayValue,
          rawValue: rawValue,
          integrationId: field.integrationId || field.id
        });
      }

      addMessage("Thank you for completing the form. Here's a summary of your responses:", "bot");
      
      // Show the summary table
      addMessage(<SummaryTable data={summaryData} />, "bot", "summary");
      
      // Show rating input after form completion
      setShowRatingInput(true);
      addMessage("Please rate your experience with this form:", "bot");
      addMessage(<div className="flex justify-center w-full">
        <div className="rating-stars flex space-x-1">
          {[1, 2, 3, 4, 5].map(rating => (
            <button
              key={rating}
              className={`p-2 rounded-full ${userRating >= rating ? 'text-yellow-400' : 'text-gray-300'}`}
              onClick={() => handleRatingSubmit(rating)}
            >
              ★
            </button>
          ))}
        </div>
      </div>, "bot", "rating-input");

      // Mark the session as complete
      await markSessionComplete(formData);
    }
  };

  // Handle rating submission
  const handleRatingSubmit = async (rating) => {
    setUserRating(rating);
    
    try {
      if (!sessionId) return;
      
      const sessions = await Session.filter({ sessionId: sessionId });
      if (sessions.length === 0) return;
      
      const session = sessions[0];
      
      // Create ratings object with the structure expected by analytics
      const ratings = {
        overallExperience: rating,
        easeOfUse: rating,
        accuracy: rating,
        comments: ""
      };
      
      // Update session with ratings
      await Session.update(session.id, { ratings });
      
      addMessage(`Thank you for your rating of ${rating} stars!`, "bot");
      console.log("Session ratings updated successfully");
    } catch (error) {
      console.error("Error updating session ratings:", error);
    }
  };

  const markSessionComplete = async (formData) => {
    try {
      if (!sessionId) return;

      const sessions = await Session.filter({ sessionId: sessionId });
      if (sessions.length === 0) return;

      const session = sessions[0];

      await Session.update(session.id, {
        formData: formData,
        completed: true,
        endTime: new Date().toISOString()
      });

      console.log("Session marked as completed");

      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'SESSION_COMPLETED',
          sessionId: sessionId
        }, '*');
      }
    } catch (error) {
      console.error("Error marking session as completed:", error);
    }
  };

  const initializeForm = async (schema) => {
    setFormSchema(schema);
    setFormTitle(schema.title || "Form Chat");
    document.title = schema.title || "Form Chat";
    
    // Extract fields and sections
    const allFields = [];
    const formSections = [];
    
    if (schema.form && schema.form.sections) {
      schema.form.sections.forEach(section => {
        formSections.push({
          id: section.id,
          title: section.title || section.id,
          description: section.description || ""
        });
        
        if (section.fields && Array.isArray(section.fields)) {
          section.fields.forEach(field => {
            allFields.push({
              ...field,
              section: section.id
            });
          });
        }
      });
    }
    
    setFields(allFields);
    setSections(formSections);
    
    // Extract visibility rules
    if (schema.form && schema.form.rules) {
      setVisibilityRules(schema.form.rules.filter(rule => rule.type === "visibility"));
    }
    
    // Set form as loaded
    setFormLoaded(true);
    
    // Start the conversation
    let introMessage = schema.messages?.welcome || `Welcome to ${schema.title || "our form"}. I'll guide you through the process.`;
    const firstSection = sections[0]?.id;
    if (firstSection) {
      introMessage += ` Let's start with the ${firstSection} section.`;
      setCurrentSection(firstSection);
      addMessage(introMessage, "bot");

      if (sessionId) {
        try {
          const sessions = await Session.filter({ sessionId: sessionId });
          if (sessions.length > 0) {
            await Session.update(sessions[0].id, {
              startTime: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error("Error updating session start time:", error);
        }
      }

      const introTexts = [];
      let index = 0;
      
      // Add section description if available
      const sectionData = formSections.find(s => s.id === firstSection);
      if (sectionData && sectionData.description) {
        introTexts.push(sectionData.description);
      }
      
      // Schedule the intro texts to be displayed one after another
      const displayNextIntro = () => {
        if (index < introTexts.length) {
          addMessage(introTexts[index], "bot");
          index++;
          setTimeout(displayNextIntro, 1000);
        } else {
          // After all intro texts, ask the first question
          const firstFieldIndex = findFirstFieldInSection(firstSection);
          if (firstFieldIndex >= 0) {
            setCurrentFieldIndex(firstFieldIndex);
            setTimeout(() => askQuestion(firstFieldIndex), 500);
          }
        }
      };
      
      if (introTexts.length > 0) {
        displayNextIntro();
      } else {
        // If no intro texts, directly ask the first question
        const firstFieldIndex = findFirstFieldInSection(firstSection);
        if (firstFieldIndex >= 0) {
          setCurrentFieldIndex(firstFieldIndex);
          setTimeout(() => askQuestion(firstFieldIndex), 500);
        }
      }
    } else {
      addMessage(introMessage, "bot");
      addMessage("There are no sections defined in this form. Please contact the form administrator.", "bot", "error");
    }
  };

  const addMessage = (content, sender, type = "text") => {
    const newMessage = {
      id: Date.now(),
      content,
      sender,
      type,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    if (sender === "bot" && typeof content === "string") {
      lastBotMessageRef.current = content;
      
      if (voiceActive && !isSpeaking) {
        speakText(content);
      }
    }
  };

  const speakText = (text) => {
    if (!window.speechSynthesis) {
      console.error("Speech synthesis not supported");
      return;
    }
    
    // Cancel any ongoing speech
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Set a voice if available
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(voice => voice.lang.includes('en-'));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
    
    utterance.onstart = () => {
      setIsSpeaking(true);
      setCurrentReadingText(text);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      setCurrentReadingText("");
      speechSynthesisRef.current = null;
    };
    
    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event);
      setIsSpeaking(false);
      setCurrentReadingText("");
      speechSynthesisRef.current = null;
    };
    
    speechSynthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const askQuestion = (fieldIndex) => {
    if (fieldIndex < 0 || fieldIndex >= fields.length) return;
    
    const field = fields[fieldIndex];
    if (!field) return;
    
    // Skip non-input fields
    if (field.type === 'paragraph' || field.type === 'separator' || field.type === 'divider') {
      if (field.type === 'paragraph' && field.content) {
        addMessage(field.content, "bot");
      }
      moveToNextField();
      return;
    }
    
    // Skip fields that are not visible
    if (!isFieldVisible(field)) {
      moveToNextField();
      return;
    }
    
    // Prepare the question text
    let questionText = field.label || `Please provide ${field.id}`;
    
    // Add help text if available
    if (field.helpText) {
      questionText += ` (${field.helpText})`;
    }
    
    // Add the question to the chat
    setIsTyping(true);
    
    // Simulate typing effect
    setTimeout(() => {
      setIsTyping(false);
      addMessage(questionText, "bot");
      
      // For signature fields, show the signature pad
      if (field.type === 'signature' || field.type === 'signatureinput' || field.type === 'signaturepad') {
        setCurrentSignatureField(field);
        setShowSignaturePad(true);
      }
    }, 500);
  };

  const moveToNextField = () => {
    const currentField = getCurrentField();
    if (!currentField) return;
    
    const currentSectionId = currentField.section;
    let nextFieldIndex = currentFieldIndex + 1;
    
    // Find the next visible field in the current section
    while (nextFieldIndex < fields.length) {
      const nextField = fields[nextFieldIndex];
      
      // If we've moved to a different section, stop
      if (nextField.section !== currentSectionId) {
        break;
      }
      
      // Skip non-input fields
      if (nextField.type === 'paragraph' || nextField.type === 'separator' || nextField.type === 'divider') {
        if (nextField.type === 'paragraph' && nextField.content) {
          addMessage(nextField.content, "bot");
        }
        nextFieldIndex++;
        continue;
      }
      
      // Skip fields that are not visible
      if (!isFieldVisible(nextField)) {
        nextFieldIndex++;
        continue;
      }
      
      // Found a valid next field
      setCurrentFieldIndex(nextFieldIndex);
      askQuestion(nextFieldIndex);
      return;
    }
    
    // If we've reached the end of the section, move to the next section
    moveToNextSection();
  };

  const navigateToSection = (sectionName) => {
    setCurrentSection(sectionName);
    
    // Add section header message
    const sectionData = sections.find(s => s.id === sectionName);
    if (sectionData) {
      addMessage(`Now let's move to the ${sectionData.title || sectionName} section.`, "bot");
      
      // Add section description if available
      if (sectionData.description) {
        setTimeout(() => {
          addMessage(sectionData.description, "bot");
        }, 1000);
      }
    }
    
    // Find the first field in this section
    const firstFieldIndex = findFirstFieldInSection(sectionName);
    
    if (firstFieldIndex >= 0) {
      setCurrentFieldIndex(firstFieldIndex);
      setTimeout(() => askQuestion(firstFieldIndex), 1000);
    } else {
      const sectionIndex = sections.findIndex(s => s.id === sectionName);
      if (sectionIndex >= 0 && sectionIndex < sections.length - 1) {
        navigateToSection(sections[sectionIndex + 1].id);
      } else {
        setCurrentFieldIndex(-1);
        setCompleted(true);

        const summaryData = [];

        for (const field of fields) {
          if (field.type === 'paragraph' || field.type === 'smartbutton' ||
            field.type === 'separator' || field.type === 'divider') {
            continue;
          }

          if (!isFieldVisible(field)) {
            continue;
          }

          const value = formData[field.id];
          if (value === undefined || value === null || value === '') {
            continue;
          }

          let displayValue = value;
          let rawValue = value;

          if (field.type === 'select' || field.type === 'dropdown') {
            const option = field.options?.find(opt => opt.value === value);
            if (option) {
              displayValue = option.label;
            }
          } else if (field.type === 'checkboxinput') {
            displayValue = rawValue === true ? 'Yes' : 'No';
          } else if (field.type === 'dateinput' && displayValue !== "Not provided") {
            displayValue = formatDate(displayValue);
          } else if ((field.type === 'signatureinput' || field.type === 'signaturepad' || field.type === 'signature') && displayValue !== "Not provided") {
            displayValue = `<img src="${displayValue}" alt="Signature" style="max-width: 200px; height: auto;" />`;
          } else if (field.type === 'ratinginput' && rawValue !== undefined) {
            displayValue = `${rawValue} stars`;
          } else if (field.type === 'currencyinput' && displayValue !== "Not provided") {
            displayValue = `$${parseFloat(displayValue).toFixed(2)}`;
          }

          summaryData.push({
            label: field.label || field.id,
            value: displayValue,
            rawValue: rawValue,
            integrationId: field.integrationId || field.id
          });
        }

        addMessage("Thank you for completing the form. Here's a summary of your responses:", "bot");
        addMessage(<SummaryTable data={summaryData} />, "bot", "summary");
        
        // Show rating input after form completion
        setShowRatingInput(true);
        addMessage("Please rate your experience with this form:", "bot");
        addMessage(<div className="flex justify-center w-full">
          <div className="rating-stars flex space-x-1">
            {[1, 2, 3, 4, 5].map(rating => (
              <button
                key={rating}
                className={`p-2 rounded-full ${userRating >= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                onClick={() => handleRatingSubmit(rating)}
              >
                ★
              </button>
            ))}
          </div>
        </div>, "bot", "rating-input");
        
        // Mark the session as complete
        markSessionComplete(formData);
      }
    }
  };

  const findFirstFieldInSection = (sectionName) => {
    return fields.findIndex(field => 
      field.section === sectionName && 
      field.type !== 'paragraph' && 
      field.type !== 'separator' && 
      field.type !== 'divider' &&
      isFieldVisible(field)
    );
  };

  const getCurrentField = () => {
    if (currentFieldIndex >= 0 && currentFieldIndex < fields.length) {
      return fields[currentFieldIndex];
    }
    return null;
  };

  const isFieldVisible = (field) => {
    if (!field) return false;
    
    // Check if field has explicit visibility setting
    if (fieldVisibility[field.id] === false) {
      return false;
    }
    
    // Check if field's block has visibility setting
    if (field.blockId && blockVisibility[`block_${field.blockId}`] === false) {
      return false;
    }
    
    return true;
  };

  const processVisibilityRules = (fieldId, value) => {
    const relevantRules = visibilityRules.filter(rule => 
      rule.condition && rule.condition.when === fieldId
    );
    
    if (relevantRules.length === 0) return;
    
    const updatedBlockVisibility = { ...blockVisibility };
    const updatedFieldVisibility = { ...fieldVisibility };
    
    relevantRules.forEach(rule => {
      const { when, is } = rule.condition;
      
      const conditionMet = Array.isArray(is) 
        ? is.includes(value)
        : value === is;
      
      if (rule.actions) {
        rule.actions.forEach(action => {
          const { elementIdentifier, action: actionType } = action;
          if (!elementIdentifier) return;
          
          const isVisible = actionType === 'show' ? conditionMet : !conditionMet;
          
          if (elementIdentifier.startsWith('block_')) {
            updatedBlockVisibility[elementIdentifier] = isVisible;
          } else {
            updatedFieldVisibility[elementIdentifier] = isVisible;
          }
        });
      }
    });
    
    setBlockVisibility(updatedBlockVisibility);
    setFieldVisibility(updatedFieldVisibility);
  };

  const validateInput = (value, validation) => {
    if (!validation) return true;
    
    if (validation.required && (value === undefined || value === null || value === '')) {
      return false;
    }
    
    if (validation.pattern && value) {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        return false;
      }
    }
    
    if (validation.minLength && value && value.length < validation.minLength) {
      return false;
    }
    
    if (validation.maxLength && value && value.length > validation.maxLength) {
      return false;
    }
    
    return true;
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };

  const handleSignatureCapture = (signatureDataUrl) => {
    if (!currentSignatureField) return;
    
    setShowSignaturePad(false);
    handleFormResponse(signatureDataUrl);
  };

  const handleSignatureCancel = () => {
    setShowSignaturePad(false);
    moveToNextField();
  };

  const handleVoiceToggle = () => {
    setVoiceActive(!voiceActive);
    
    if (!voiceActive && lastBotMessageRef.current) {
      speakText(lastBotMessageRef.current);
    } else if (voiceActive && speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
      setIsSpeaking(false);
      setCurrentReadingText("");
    }
  };

  const handleVoiceInput = (transcript) => {
    const currentField = getCurrentField();
    if (!currentField) return;
    
    handleFormResponse(transcript, 'voice');
  };

  const handleKnowledgeBaseToggle = () => {
    setShowKnowledgeBase(!showKnowledgeBase);
  };

  const handleKnowledgeBaseSearch = async (query) => {
    setKnowledgeBaseQuery(query);
    setIsSearchingKnowledgeBase(true);
    
    try {
      // Simulate knowledge base search
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const results = [
        {
          title: "How to complete this form",
          content: "This form guides you through a series of questions. Simply answer each question and the system will guide you to the next appropriate question based on your responses."
        },
        {
          title: "What happens after submission",
          content: "After you submit this form, your responses will be reviewed by our team. You will receive a confirmation email with a reference number for your submission."
        },
        {
          title: "Contact support",
          content: "If you need assistance with this form, please contact our support team at support@example.com or call 1-800-555-1234 during business hours."
        }
      ];
      
      setKnowledgeBaseResults(results);
    } catch (error) {
      console.error("Error searching knowledge base:", error);
    } finally {
      setIsSearchingKnowledgeBase(false);
    }
  };

  const handleKnowledgeBaseResultClick = (result) => {
    addMessage(`I have a question about: ${result.title}`, "user");
    addMessage(result.content, "bot", "knowledge");
    trackQuestion(result.title, result.content);
    setShowKnowledgeBase(false);
  };

  const getSmartButtons = () => {
    const currentField = getCurrentField();
    if (!currentField || !currentField.smartButtons || !Array.isArray(currentField.smartButtons)) {
      return [];
    }
    
    return currentField.smartButtons;
  };

  const handleSmartButtonClick = (buttonValue) => {
    handleFormResponse(buttonValue);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const schema = JSON.parse(e.target.result);
        initializeForm(schema);
        setShowUploadModal(false);
      } catch (error) {
        console.error("Error parsing JSON:", error);
        alert("Invalid JSON file. Please upload a valid form schema.");
      }
    };
    reader.readAsText(file);
  };

  const handleJsonTextChange = (e) => {
    setJsonText(e.target.value);
  };

  const handleJsonSubmit = () => {
    try {
      const schema = JSON.parse(jsonText);
      initializeForm(schema);
      setShowUploadModal(false);
    } catch (error) {
      console.error("Error parsing JSON:", error);
      alert("Invalid JSON. Please check your input and try again.");
    }
  };

  if (!formLoaded || loading || completed || !getCurrentField()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-xl font-semibold text-center mb-4">{formTitle || "Form Chat"}</h1>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
          <p className="text-center mt-4 text-gray-600">
            {loading ? "Loading form..." : completed ? "Form completed" : "Initializing..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">{formTitle}</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleVoiceToggle}
            className={`${voiceActive ? 'bg-blue-100 text-blue-700' : ''}`}
          >
            {voiceActive ? 'Voice On' : 'Voice Off'}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowUploadModal(true)}
          >
            <Upload className="h-5 w-5" />
          </Button>
        </div>
      </header>
      
      {/* Main content */}
      <main className="flex-1 p-4 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          {/* Chat messages */}
          <div className="space-y-4 mb-4">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isReading={isSpeaking && currentReadingText === message.content}
              />
            ))}
            
            {isTyping && (
              <div className="flex items-start">
                <Avatar />
                <div className="ml-3 p-3 bg-white rounded-lg shadow-sm">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={bottomRef} />
          </div>
          
          {/* Input area */}
          {formLoaded && !loading && !completed && !getCurrentField() && (
            <div className="bg-white rounded-lg shadow-sm p-4 mt-4">
              <p className="text-center text-gray-600">
                Loading next question...
              </p>
            </div>
          )}
          
          {formLoaded && !loading && !completed && getCurrentField() && (
            <div className="bg-white rounded-lg shadow-sm p-4 mt-4">
              <FormField
                field={getCurrentField()}
                value={formData[getCurrentField().id]}
                onChange={handleFormResponse}
                error={validationError}
              />
              
              {/* Smart buttons */}
              {formLoaded && !loading && !completed && getSmartButtons().length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {getSmartButtons().map((button, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      onClick={() => handleSmartButtonClick(button.value)}
                    >
                      {button.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {completed && (
            <div className="bg-white rounded-lg shadow-sm p-4 mt-4">
              <p className="text-center text-gray-600">
                Form completed. Thank you for your responses.
              </p>
            </div>
          )}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white shadow-sm p-4 mt-auto">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {currentSection && (
              <span>
                Section: {sections.find(s => s.id === currentSection)?.title || currentSection}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Knowledge base button */}
            <KnowledgeBaseButton onClick={handleKnowledgeBaseToggle} />
            
            {/* Voice input button */}
            {voiceActive && (
              <SimpleVoice
                onResult={handleVoiceInput}
                onListeningChange={setVoiceListening}
                disabled={completed}
              />
            )}
          </div>
        </div>
      </footer>
      
      {/* Knowledge base panel */}
      {showKnowledgeBase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Knowledge Base</h2>
            </div>
            
            <div className="p-4">
              <KnowledgeBaseInput
                value={knowledgeBaseQuery}
                onChange={setKnowledgeBaseQuery}
                onSearch={handleKnowledgeBaseSearch}
                isSearching={isSearchingKnowledgeBase}
              />
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {knowledgeBaseResults.length > 0 ? (
                <div className="space-y-3">
                  {knowledgeBaseResults.map((result, index) => (
                    <div
                      key={index}
                      className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                      onClick={() => handleKnowledgeBaseResultClick(result)}
                    >
                      <h3 className="font-medium">{result.title}</h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{result.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500">
                  {isSearchingKnowledgeBase
                    ? "Searching..."
                    : knowledgeBaseQuery
                      ? "No results found. Try a different search term."
                      : "Enter a question to search the knowledge base."}
                </p>
              )}
            </div>
            
            <div className="p-4 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleKnowledgeBaseToggle}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Signature pad modal */}
      {showSignaturePad && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Signature</h2>
            </div>
            
            <SignaturePad
              onCapture={handleSignatureCapture}
              onCancel={handleSignatureCancel}
            />
          </div>
        </div>
      )}
      
      {/* Upload form schema modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Upload Form Schema</h2>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Upload JSON File
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <div className="- my-2 border-t"></div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Or Paste JSON
                </label>
                <textarea
                  value={jsonText}
                  onChange={handleJsonTextChange}
                  className="w-full p-2 border rounded-md h-40"
                  placeholder='{"title": "My Form", "form": {"sections": []}}'
                />
              </div>
            </div>
            
            <div className="p-4 border-t flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowUploadModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleJsonSubmit}>
                Load Form
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
