
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
  const [currentSchema, setCurrentSchema] = useState(null);
  const [processingVoiceInput, setProcessingVoiceInput] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [awaitingResponse, setAwaitingResponse] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
  const [knowledgeBaseQuestions, setKnowledgeBaseQuestions] = useState([]);

  const handleInputChange = (value) => {
    setCurrentInputValue(value);
    setValidationError(null);
  };

  const getSmartButtons = () => {
    if (!fields) return [];
    return fields.filter(field =>
      field.type === 'smartbutton' &&
      isFieldVisible(field) &&
      !answeredFields[field.id]
    );
  };

  const processFormSchema = () => {
    try {
      if (!jsonText) {
        console.error("No JSON text provided");
        return;
      }

      const schemaData = JSON.parse(jsonText);
      console.log("Processing schema:", schemaData);

      if (!schemaData.form) {
        console.error("Invalid schema format - missing 'form' property");
        return;
      }

      setFormSchema(schemaData);
      const {
        extractedFields,
        extractedSections,
        extractedVisibilityRules,
        extractedUpdatingRules,
        extractedGlobalVars,
        initialBlockVisibility,
        initialFieldVisibility
      } = extractDataFromSchema(schemaData);

      console.log(`Extracted ${extractedFields.length} fields and ${extractedSections.length} sections`);

      setFields(extractedFields);
      setSections(extractedSections);
      setVisibilityRules(extractedVisibilityRules);
      setUpdatingRules(extractedUpdatingRules);
      setGlobalVariables(extractedGlobalVars);
      setBlockVisibility(initialBlockVisibility);
      setFieldVisibility(initialFieldVisibility);

      setFormTitle(schemaData.form.formName || "Form");
      setFormLoaded(true);
      setShowUploadModal(false);

      const newSessionId = createLocalSession(schemaData);
      if (newSessionId) {
        setSessionId(newSessionId);
      }

      setTimeout(() => {
        startConversation();
      }, 100);

    } catch (error) {
      console.error("Error processing form schema:", error);
      alert("Error processing form schema. Please check the JSON format.");
    }
  };

  useEffect(() => {
    console.log("FormChat mounted");
    const url = new URL(window.location.href);
    console.log("Current URL:", url.toString());
    console.log("URL parameters:", Object.fromEntries(url.searchParams));

    const createNewSession = async () => {
      try {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log("Generated sessionId:", sessionId);
        setSessionId(sessionId);

        const urlParams = new URLSearchParams(window.location.search);
        const processId = urlParams.get('processId');
        const mode = urlParams.get('mode') || 'chat';

        console.log("URL Parameters:", {
          processId,
          mode
        });

        if (!processId) {
          console.error("No processId provided");
          return;
        }

        setInteractionMode(mode);
        console.log("Set interaction mode to:", mode);

        const processes = await Process.filter({ id: processId });
        console.log("Found processes:", processes);

        if (processes.length > 0) {
          const process = processes[0];
          console.log("Selected process:", process);
          setFormTitle(process.name);

          const sessionData = {
            sessionId: sessionId,
            processId: processId,
            mode: mode,
            startTime: new Date().toISOString(),
            completed: false,
            formData: {},
            questions: []
          };

          console.log("Creating session with data:", sessionData);
          await Session.create(sessionData);
          console.log("Session created successfully");

        } else {
          console.error("Process not found:", processId);
        }
      } catch (error) {
        console.error("Error in createNewSession:", error);
      }
    };

    createNewSession();
  }, []);

  const trackQuestion = async (question, answer) => {
    if (!sessionId) return;

    try {
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

    if ((currentField.type === 'signature' || currentField.type === 'signatureinput' ||
      currentField.type === 'signaturepad') && value === 'signature_requested') {
      handleSignatureClick(currentField);
      return;
    }

    const newFormData = { ...formData };
    newFormData[currentField.id] = value;
    if (currentField.integrationID) {
      newFormData[currentField.integrationID] = value;
    }
    setFormData(newFormData);

    setAnsweredFields(prev => ({
      ...prev,
      [currentField.id]: true
    }));

    const displayValue = getDisplayValue(currentField, value);
    if (displayValue) {
      addMessage(String(displayValue), "user");
    }

    await trackQuestion(currentField.label || currentField.id, String(displayValue));

    setCurrentInputValue('');

    await applyRules();

    const nextFieldIndex = findNextVisibleFieldIndex(currentFieldIndex);
    if (nextFieldIndex >= 0) {
      setCurrentFieldIndex(nextFieldIndex);
      setCurrentQuestionIndex(nextFieldIndex);
      setTimeout(() => {
        askQuestion(nextFieldIndex);
      }, 100);
    } else if (isSectionComplete()) {
      moveToNextSection();
    }

    setAwaitingResponse(false);
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

        let rawValue = formData[field.id];
        if (rawValue === undefined && field.integrationID) {
          rawValue = formData[field.integrationID];
        }

        let displayValue = rawValue !== undefined ? rawValue : "Not provided";

        if (field.type === 'dropdowninput' || field.type === 'radioinput') {
          if (field.properties && field.properties.items && rawValue !== undefined) {
            const selectedItem = field.properties.items.find(item => item && item.value === rawValue);
            if (selectedItem && selectedItem.label) {
              displayValue = selectedItem.label;
            }
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
          section: field.section,
          integrationID: field.integrationID || field.id,
          question: field.label,
          answer: displayValue
        });
      }

      setMessages(prev => [
        ...prev,
        { text: "Thank you for completing the form! Here's a summary of your responses:", type: "bot" },
        { type: "summary", data: summaryData }
      ]);

      if (sessionId) {
        await markSessionComplete(formData);
      }
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
          sessionId: sessionId,
          formData: formData
        }, '*');
      }
    } catch (error) {
      console.error("Error marking session as completed:", error);
    }
  };

  const startConversation = async () => {
    if (sections.length === 0 || fields.length === 0) {
      addMessage("No form content found. Please upload a valid form schema.", "bot");
      return;
    }

    setMessages([]);

    let introMessage = "Welcome! I'll help you complete this form.";

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
      while (index < fields.length) {
        const field = fields[index];
        if (field.section === firstSection &&
          isFieldVisible(field) &&
          field.type === 'paragraph') {
          const content = field.properties?.editedParagraph || field.properties?.text;
          if (content) {
            const processedContent = replacePlaceholders(content);
            if (processedContent) {
              introTexts.push(processedContent);
            }
          }
          index++;
        } else {
          break;
        }
      }

      if (introTexts.length > 0) {
        const combinedIntro = introTexts.join(' ');
        addMessage(combinedIntro, "bot");
      }

      const firstFieldIndex = fields.findIndex(field =>
        field.section === firstSection &&
        isFieldVisible(field) &&
        field.type !== 'paragraph' &&
        field.type !== 'separator' &&
        field.type !== 'divider'
      );

      if (firstFieldIndex >= 0) {
        setCurrentFieldIndex(firstFieldIndex);
        setTimeout(() => askQuestion(firstFieldIndex), 100);
      }
    }
  };

  const scrollToBottom = () => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const replacePlaceholders = (text) => {
    if (!text || typeof text !== 'string') return text;
    if (!text.includes('@#')) return text;

    console.log("Found text with placeholders:", text);

    const regex = /@#([^@#]+)@#/g;

    let allResolved = true;
    let placeholdersFound = false;

    const result = text.replace(regex, (match, variableName) => {
      placeholdersFound = true;
      console.log(`Looking for placeholder value: ${variableName}`);

      if (formData[variableName] !== undefined) {
        console.log(`Found value in formData: ${formData[variableName]}`);
        return formData[variableName];
      }

      const field = fields.find(f => f.integrationID === variableName);
      if (field && formData[field.id] !== undefined) {
        console.log(`Found value via field ${field.id}: ${formData[field.id]}`);
        return formData[field.id];
      }

      console.log(`No value found for ${variableName}`);
      allResolved = false;
      return match;
    });

    if (placeholdersFound && !allResolved) {
      console.log("Not all placeholders could be resolved, returning empty string");
      return "";
    }

    console.log("Final replaced text:", result);
    return result;
  };

  const addMessage = (text, type = "bot") => {
    if (!text) return;

    let processedText = text;
    if (type === "bot" && text.includes('@#')) {
      processedText = replacePlaceholders(text);
      if (!processedText) {
        console.log("Skipping message with unresolved placeholders:", text);
        return;
      }
    }

    const messageExists = messages.some(m =>
      m.text === processedText && m.type === type
    );

    if (messageExists) {
      console.log("Skipping duplicate message:", processedText);
      return;
    }

    console.log(`Adding message (${type}):`, processedText);
    setMessages(prev => [...prev, { text: processedText, type }]);
    setTimeout(scrollToBottom, 100);
  };

  const getCurrentField = () => {
    if (currentFieldIndex >= 0 && currentFieldIndex < fields.length) {
      return fields[currentFieldIndex];
    }
    return null;
  };

  const handleFieldSubmit = (value) => {
    handleFormResponse(value, 'manual');
  };

  const handleSignatureClick = (field) => {
    setCurrentSignatureField(field);
    setShowSignaturePad(true);
  };

  const handleSignatureSubmit = (signatureData) => {
    if (!currentSignatureField) return;

    setShowSignaturePad(false);

    setFormData(prev => ({
      ...prev,
      [currentSignatureField.id]: signatureData
    }));

    setAnsweredFields(prev => ({
      ...prev,
      [currentSignatureField.id]: true
    }));

    addMessage("Signature provided", "user");

    if (currentFieldIndex >= 0) {
      const nextFieldIndex = findNextVisibleFieldIndex(currentFieldIndex);

      if (nextFieldIndex >= 0) {
        setCurrentFieldIndex(nextFieldIndex);
        askQuestion(nextFieldIndex);
      } else if (isSectionComplete()) {
        moveToNextSection();
      }
    }

    setCurrentSignatureField(null);
  };

  const handleSignatureCancel = () => {
    setShowSignaturePad(false);
    setCurrentSignatureField(null);
  };

  const handleSpeechRecognized = (text) => {
    if (!text) return;
    setProcessingVoiceInput(true);

    console.log("Processing voice input:", text);

    const currentField = getCurrentField();
    if (!currentField) {
      console.error("No current field to process voice input for");
      setProcessingVoiceInput(false);
      return;
    }

    addMessage(text, "user");

    const normalizedText = text.trim().toLowerCase();

    let value = null;

    switch (currentField.type) {
      case 'radioinput':
      case 'dropdowninput': {
        const options = currentField.properties?.items || [];

        const numericPattern = /(?:number|option|choice)?\s*(\d+|one|two|three|four|five|first|second|third|fourth|fifth)/i;
        const numericMatch = normalizedText.match(numericPattern);

        if (numericMatch) {
          const matchText = numericMatch[1].toLowerCase();
          let index = -1;

          if (matchText === 'first' || matchText === 'one' || matchText === '1') index = 0;
          else if (matchText === 'second' || matchText === 'two' || matchText === '2') index = 1;
          else if (matchText === 'third' || matchText === 'three' || matchText === '3') index = 2;
          else if (matchText === 'fourth' || matchText === 'four' || matchText === '4') index = 3;
          else if (matchText === 'fifth' || matchText === 'five' || matchText === '5') index = 4;
          else {
            index = parseInt(matchText) - 1;
          }

          if (index >= 0 && index < options.length) {
            value = options[index].value;
            console.log(`Selected option by position: index ${index}, value: ${value}`);
          }
        }

        if (!value) {
          const amountPattern = /\$?(\d+\.?\d*)/;
          const amountMatch = normalizedText.match(amountPattern);

          if (amountMatch) {
            const amount = amountMatch[1];
            const matchingOption = options.find(opt =>
              opt.label.toLowerCase().includes(amount)
            );

            if (matchingOption) {
              value = matchingOption.value;
              console.log(`Selected option by amount: ${amount}, value: ${value}`);
            }
          }
        }

        if (!value) {
          for (const option of options) {
            const optionText = option.label.toLowerCase();

            const parts = optionText.split(' ');
            if (parts.length > 1) {
              const merchantParts = parts.slice(1, -1);

              for (const part of merchantParts) {
                if (part.length > 3 && normalizedText.includes(part.toLowerCase())) {
                  value = option.value;
                  console.log(`Selected option by merchant: ${part}, value: ${value}`);
                  break;
                }
              }

              if (value) break;
            }

            if (normalizedText.includes(optionText) || optionText.includes(normalizedText)) {
              value = option.value;
              console.log(`Selected option by text match: "${option.label}", value: ${value}`);
              break;
            }
          }
        }

        break;
      }

      case 'numberinput':
      case 'currencyinput': {
        const numberPattern = /(\d+\.?\d*|\d*\.\d+)/;
        const numberMatch = normalizedText.match(numberPattern);

        if (numberMatch) {
          value = numberMatch[1];
          console.log(`Extracted number: ${value}`);
        }
        break;
      }

      case 'textinput':
      default:
        value = text;
        break;
    }

    if (value !== null) {
      console.log(`Final value extracted: ${value}`);
      handleFormResponse(value, 'voice');
    } else {
      console.log("Could not extract a valid value from speech");
      addMessage("I couldn't understand that response. Please try again or use the form controls.", "bot");
    }

    setProcessingVoiceInput(false);
  };

  const askQuestion = (fieldIndex) => {
    if (fieldIndex >= 0 && fieldIndex < fields.length) {
      const field = fields[fieldIndex];
      setCurrentQuestion(field);
      setAwaitingResponse(true);

      if (field.type === 'paragraph') {
        const paragraphContent = field.properties?.editedParagraph || field.properties?.text || "";
        if (paragraphContent) {
          const processedContent = replacePlaceholders(paragraphContent);
          if (processedContent) {
            addMessage(processedContent, "bot");
            setCurrentReadingText(processedContent);
          }
        }

        const nextFieldIndex = findNextVisibleFieldIndex(fieldIndex);
        if (nextFieldIndex >= 0) {
          setCurrentFieldIndex(nextFieldIndex);
          setTimeout(() => askQuestion(nextFieldIndex), 100);
        } else if (isSectionComplete()) {
          moveToNextSection();
        }
        return;
      }

      let questionText = formatQuestion(field.label || "");

      if ((field.type === 'radioinput' || field.type === 'dropdowninput') &&
        field.properties?.items?.length > 0) {
        const options = field.properties.items.map((item, index) =>
          `${item.label}`
        ).join(', ');

        questionText += ` Please choose one of these options: ${options}`;
      }

      addMessage(questionText, "bot");
      setCurrentReadingText(questionText);
    }
  };

  const isFieldVisible = (field) => {
    if (!field) return false;
    if (field.hidden === true) return false;
    const blockIsVisible = blockVisibility[field.blockId] !== false;
    if (!blockIsVisible) return false;
    return fieldVisibility[field.id] !== false;
  };

  const formatQuestion = (question) => {
    if (!question) return "";
    if (/[.?!]$/.test(question.trim())) {
      return question;
    }
    return question + "?";
  };

  const validateField = (field, value) => {
    if (field.required && (value === undefined || value === null || value === "")) {
      setValidationError("This field is required");
      return false;
    }
    setValidationError(null);
    return true;
  };

  const findNextVisibleFieldIndex = (currentIndex) => {
    for (let i = currentIndex + 1; i < fields.length; i++) {
      if (isFieldVisible(fields[i]) &&
        fields[i].type !== 'separator' &&
        fields[i].type !== 'divider' &&
        !answeredFields[fields[i].id]) {
        return i;
      }
    }
    return -1;
  };

  const isSectionComplete = () => {
    if (!currentSection) return false;
    for (const field of fields) {
      if (field.section === currentSection &&
        isFieldVisible(field) &&
        field.type !== 'paragraph' &&
        field.type !== 'smartbutton' &&
        field.type !== 'separator' &&
        field.type !== 'divider' &&
        !answeredFields[field.id]) {
        return false;
      }
    }
    return true;
  };

  const navigateToSection = (sectionName) => {
    if (!sectionName) return;
    addMessage(`Let's move to the ${sectionName} section.`, "bot");

    const introTexts = [];
    let index = 0;
    let startIndex = fields.findIndex(field => field.section === sectionName);

    if (startIndex >= 0) {
      index = startIndex;
      while (index < fields.length) {
        const field = fields[index];
        if (field.section === sectionName &&
          isFieldVisible(field) &&
          field.type === 'paragraph') {
          const content = field.properties?.editedParagraph || field.properties?.text;
          if (content) {
            const processedContent = replacePlaceholders(content);
            if (processedContent) {
              introTexts.push(processedContent);
            }
          }
          index++;
        } else {
          break;
        }
      }
    }

    if (introTexts.length > 0) {
      const combinedIntro = introTexts.join(' ');
      addMessage(combinedIntro, "bot");
    }

    const firstFieldIndex = fields.findIndex(
      field => field.section === sectionName &&
      isFieldVisible(field) &&
      field.type !== 'paragraph' &&
      field.type !== 'smartbutton' &&
      field.type !== 'separator' &&
      field.type !== 'divider' &&
      !answeredFields[field.id]
    );

    if (firstFieldIndex >= 0) {
      setCurrentFieldIndex(firstFieldIndex);
      setTimeout(() => askQuestion(firstFieldIndex), 100);
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

          let rawValue = formData[field.id];
          if (rawValue === undefined && field.integrationID) {
            rawValue = formData[field.integrationID];
          }

          let displayValue = rawValue !== undefined ? rawValue : "Not provided";

          if (field.type === 'dropdowninput' || field.type === 'radioinput') {
            if (field.properties && field.properties.items && rawValue !== undefined) {
              const selectedItem = field.properties.items.find(item => item && item.value === rawValue);
              if (selectedItem && selectedItem.label) {
                displayValue = selectedItem.label;
              }
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
            section: field.section,
            integrationID: field.integrationID || field.id,
            question: field.label,
            answer: displayValue
          });
        }

        setMessages(prev => [
          ...prev,
          { text: "Thank you for completing the form! Here's a summary of your responses:", type: "bot" },
          { type: "summary", data: summaryData }
        ]);
      }
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonContent = e.target.result;
        setJsonText(jsonContent);
      } catch (error) {
        console.error("Error reading file:", error);
        alert("Failed to read the file");
      }
    };
    reader.readAsText(file);
  };

  const applyRules = () => {
    console.log("Applying rules...");
    applyVisibilityRules();
    applyUpdatingRules();
  };

  const applyVisibilityRules = () => {
    if (!visibilityRules || visibilityRules.length === 0) return;

    console.log(`Processing ${visibilityRules.length} visibility rules`);

    const newBlockVisibility = { ...blockVisibility };
    const newFieldVisibility = { ...fieldVisibility };

    visibilityRules.forEach(rule => {
      try {
        if (!rule.condition || !rule.condition.when || !rule.condition.is || !rule.actions) return;

        const { when: targetField, is: expectedValue } = rule.condition;
        const currentValue = formData[targetField];

        console.log(`Rule for ${targetField}: value is ${currentValue}, expecting ${expectedValue}`);

        let conditionMet = Array.isArray(expectedValue)
          ? expectedValue.includes(currentValue)
          : currentValue === expectedValue;

        console.log(`Condition met: ${conditionMet}`);

        rule.actions.forEach(action => {
          if (!action.elementIdentifier) return;

          const isBlock = !action.elementIdentifier.includes('field_');

          if (isBlock) {
            newBlockVisibility[action.elementIdentifier] = action.action === 'show' ? conditionMet : !conditionMet;
            console.log(`Setting block ${action.elementIdentifier} visibility to ${newBlockVisibility[action.elementIdentifier]}`);

            fields.forEach(field => {
              if (field.blockId === action.elementIdentifier) {
                newFieldVisibility[field.id] = newBlockVisibility[action.elementIdentifier];
                console.log(`Setting field ${field.id} visibility to ${newFieldVisibility[field.id]}`);
              }
            });
          } else {
            newFieldVisibility[action.elementIdentifier] = action.action === 'show' ? conditionMet : !conditionMet;
            console.log(`Setting field ${action.elementIdentifier} visibility to ${newFieldVisibility[action.elementIdentifier]}`);
          }
        });
      } catch (error) {
        console.error("Error processing visibility rule:", error);
      }
    });

    setBlockVisibility(newBlockVisibility);
    setFieldVisibility(newFieldVisibility);
  };

  const applyUpdatingRules = () => {
    if (!updatingRules || updatingRules.length === 0) return;

    updatingRules.forEach(rule => {
      try {
        if (!rule.condition || !rule.condition.when || !rule.condition.is || !rule.actions) return;

        const { when: targetField, is: expectedValue } = rule.condition;
        const currentValue = formData[targetField];

        let conditionMet = Array.isArray(expectedValue) ? expectedValue.includes(currentValue) : currentValue === expectedValue;

        if (conditionMet) {
          rule.actions.forEach(action => {
            if (!action.elementIdentifier || action.action !== 'update' || !action.properties) return;

            const fieldIndex = fields.findIndex(f => f.id === action.elementIdentifier);
            if (fieldIndex === -1) return;

            const updatedFields = [...fields];
            updatedFields[fieldIndex] = {
              ...updatedFields[fieldIndex],
              properties: {
                ...updatedFields[fieldIndex].properties,
                ...action.properties
              }
            };

            setFields(updatedFields);
          });
        }
      } catch (error) {
        console.error("Error processing updating rule:", error);
      }
    });
  };

  const getDisplayValue = (currentField, value) => {
    let displayValue = value;

    if (currentField.type === 'dropdowninput' || currentField.type === 'radioinput') {
      if (currentField.properties && currentField.properties.items) {
        const selectedItem = currentField.properties.items.find(item => item && item.value === value);
        if (selectedItem && selectedItem.label) {
          displayValue = selectedItem.label;
        }
      }
    } else if (currentField.type === 'checkboxinput') {
      displayValue = value === true ? 'Yes' : 'No';
    } else if (currentField.type === 'ratinginput') {
      displayValue = `${value} stars`;
    } else if (currentField.type === 'signature' || currentField.type === 'signatureinput' || currentField.type === 'signaturepad') {
      displayValue = "Signature provided";
    }

    return displayValue;
  };

  const extractDataFromSchema = (schema) => {
    console.log("Extracting schema data...");

    const extractedFields = [];
    const extractedSections = [];
    const extractedVisibilityRules = [];
    const extractedUpdatingRules = [];
    const extractedGlobalVars = {};
    const initialBlockVisibility = {};
    const initialFieldVisibility = {};

    try {
      if (schema && schema.form) {
        if (Array.isArray(schema.form.globalVariables)) {
          schema.form.globalVariables.forEach(variable => {
            if (variable && variable.integrationID) {
              extractedGlobalVars[variable.integrationID] = variable.value || '';
            }
          });
        }

        if (Array.isArray(schema.form.newRules)) {
          schema.form.newRules.forEach(rule => {
            if (rule && rule.type) {
              if (rule.type === "visibility") {
                extractedVisibilityRules.push(rule);
              } else if (rule.type === "updating") {
                extractedUpdatingRules.push(rule);
              }
            }
          });
        }

        if (Array.isArray(schema.form.steps)) {
          schema.form.steps.forEach((step, stepIndex) => {
            if (!step) return;

            const sectionName = step.stepName || `Section ${stepIndex + 1}`;
            const nextStep = stepIndex < schema.form.steps.length - 1
              ? (schema.form.steps[stepIndex + 1] ? schema.form.steps[stepIndex + 1].stepName : null)
              : null;

            extractedSections.push({
              id: sectionName,
              identifier: step.identifier || '',
              next: nextStep
            });

            if (!Array.isArray(step.blocks)) return;

            step.blocks.forEach(block => {
              if (!block) return;

              const isHidden = block.hidden === true || block.isHiddenInRuntime === true;
              initialBlockVisibility[block.identifier] = !isHidden;

              if (block.blockName && !isHidden) {
                extractedFields.push({
                  id: block.identifier + "_title",
                  label: block.blockName,
                  type: "paragraph",
                  required: false,
                  section: sectionName,
                  stepIdentifier: step.identifier || '',
                  integrationID: block.identifier + "_title",
                  blockId: block.identifier,
                  hidden: isHidden,
                  properties: {
                    text: block.blockName,
                    editedParagraph: block.blockName
                  }
                });
              }

              if (!Array.isArray(block.rows) || block.rows.length === 0) return;

              block.rows.forEach(row => {
                if (!row || !Array.isArray(row.fields)) return;

                row.fields.forEach(field => {
                  if (!field || !field.type || !field.identifier) return;

                  const fieldObj = {
                    id: field.identifier,
                    label: field.label || "",
                    type: field.type.toLowerCase(),
                    required: !!field.required,
                    section: sectionName,
                    stepIdentifier: step.identifier || '',
                    integrationID: field.integrationID || field.identifier,
                    blockId: block.identifier,
                    blockName: block.blockName || "",
                    hidden: isHidden || field.isHiddenInRuntime === true,
                    properties: field
                  };

                  extractedFields.push(fieldObj);
                  initialFieldVisibility[field.identifier] = !isHidden && !field.isHiddenInRuntime;
                });
              });
            });
          });
        }
      }

      console.log(`Extracted ${extractedFields.length} fields and ${extractedSections.length} sections`);

    } catch (error) {
      console.error("Error during schema extraction:", error);
    }

    return {
      extractedFields,
      extractedSections,
      extractedVisibilityRules,
      extractedUpdatingRules,
      extractedGlobalVars,
      initialBlockVisibility,
      initialFieldVisibility
    };
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  };

  const renderInputArea = () => {
    if (!formLoaded || loading || completed || !getCurrentField()) {
      return null;
    }

    const currentField = getCurrentField();

    if (voiceActive) {
      return (
        <div className="border-t bg-white p-4 sticky bottom-0">
          <div className="mb-4">
            <SimpleVoice
              onTextRecognized={handleSpeechRecognized}
              textToSpeak={currentReadingText}
              autoSpeak={true}
            />
          </div>

          {renderCurrentField()}
        </div>
      );
    }

    return (
      <div className="border-t bg-white p-4 sticky bottom-0">
        <ChatMessage message="" type="bot">
          {renderCurrentField()}
        </ChatMessage>
      </div>
    );
  };

  const renderCurrentField = () => {
    if (!fields || currentFieldIndex < 0 || currentFieldIndex >= fields.length) {
      return null;
    }

    const field = fields[currentFieldIndex];

    if (!field || !isFieldVisible(field)) {
      return null;
    }

    if (field.type === 'signature' || field.type === 'signatureinput' || field.type === 'signaturepad') {
      return (
        <SignaturePad
          onSubmit={(signatureData) => handleFormResponse(signatureData, 'manual')}
          onCancel={() => {
            if (field.required) {
              setValidationError("This field is required");
            } else {
              handleSkip();
            }
          }}
        />
      );
    }

    return (
      <FormField
        field={field}
        value={currentInputValue}
        onChange={handleFieldSubmit}
        onInputChange={handleInputChange}
        onSkip={!field.required ? handleSkip : null}
        validationError={validationError}
      />
    );
  };

  const handleSkip = () => {
    const currentField = getCurrentField();
    if (!currentField) return;

    console.log(`Skipping field ${currentField.id}`);

    setAnsweredFields(prev => ({
      ...prev,
      [currentField.id]: true
    }));

    addMessage("Skipped", "user");

    const nextFieldIndex = findNextVisibleFieldIndex(currentFieldIndex);
    if (nextFieldIndex >= 0) {
      setCurrentFieldIndex(nextFieldIndex);
      setCurrentQuestionIndex(nextFieldIndex);
      setTimeout(() => {
        askQuestion(nextFieldIndex);
      }, 100);
    } else if (isSectionComplete()) {
      moveToNextSection();
    }
  };

  const handleSmartButtonClick = (stepIdentifier) => {
    if (!stepIdentifier) return;

    const targetSection = sections.find(section => section.stepIdentifier === stepIdentifier);
    if (targetSection) {
      navigateToSection(targetSection.id);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="flex items-center gap-2 p-4 border-b">
        <Button variant="ghost" size="icon" disabled={loading}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{formTitle || "Form"}</h1>
          <p className="text-sm text-gray-500">
            {loading ? 'Loading form...' : formLoaded ? currentSection : 'Please upload a form schema'}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="gap-1 mr-2"
          onClick={() => setShowUploadModal(true)}
        >
          <Upload className="h-4 w-4" />
          Upload Schema
        </Button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-1">
            {!formLoaded && !showUploadModal && (
              <div className="flex flex-col items-center justify-center h-64">
                <p className="text-gray-500 mb-4">Welcome to the Form Assistant</p>
                <Button
                  onClick={() => setShowUploadModal(true)}
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Upload className="h-4 w-4" />
                  Upload Form Schema
                </Button>
              </div>
            )}

            {messages.map((message, index) => {
              if (message.type === "summary") {
                return (
                  <ChatMessage key={index} message="" type="bot">
                    <SummaryTable data={message.data} />
                  </ChatMessage>
                );
              }
              return (
                <ChatMessage
                  key={index}
                  message={message.text || ""}
                  type={message.type || "bot"}
                />
              );
            })}

            {formLoaded && !loading && !completed && getSmartButtons().length > 0 && (
              <ChatMessage message="You can navigate to:" type="bot">
                <div className="flex flex-wrap gap-2 mt-2">
                  {getSmartButtons().map(button => (
                    <Button
                      key={button.id}
                      onClick={() => handleSmartButtonClick(
                        button.properties?.selectedStep?.identifier || ""
                      )}
                      variant="outline"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {button.label || "Continue"}
                    </Button>
                  ))}
                </div>
              </ChatMessage>
            )}

            {isTyping && (
              <ChatMessage isTyping={true} type="bot" />
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {renderInputArea()}
      </div>

      {showSignaturePad && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Signature</h2>
            <SignaturePad onSubmit={handleSignatureSubmit} onCancel={handleSignatureCancel} />
          </div>
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Upload Form Schema</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2">
                Upload a JSON file containing the form schema, or paste the JSON content below.
              </p>
              <input
                type="file"
                accept=".json,.cvuf"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="w-full mb-2"
              />
              <p className="text-sm mb-2">Or paste JSON content:</p>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                className="w-full h-40 border rounded p-2 text-sm"
                placeholder='{"form": {...}}'
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowUploadModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={processFormSchema}
                disabled={!jsonText}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Process Schema
              </Button>
            </div>
          </div>
        </div>
      )}

      {interactionMode === 'avatar' && (
        <div className="fixed right-8 bottom-24 z-10">
          <div className="animate-fade-in">
            <Avatar speaking={isSpeaking} />
          </div>
        </div>
      )}

      <div className="fixed right-6 bottom-24 z-10">
        <KnowledgeBaseButton 
          onClick={() => setShowKnowledgeBase(!showKnowledgeBase)}
          isActive={showKnowledgeBase}
        />
      </div>

      {showKnowledgeBase && (
        <div className="fixed right-6 bottom-36 z-10 animate-fade-in">
          <KnowledgeBaseInput
            onQuestion={question => 
              setKnowledgeBaseQuestions(prev => [
                ...prev,
                { question, timestamp: new Date().toISOString() }
              ])}
            onAnswer={answer => answer && addMessage(answer, "bot")}
            onClose={() => setShowKnowledgeBase(false)}
          />
        </div>
      )}
    </div>
  );
}
