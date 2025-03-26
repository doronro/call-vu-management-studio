import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Process, FormSchema, Session } from '../api/entities';
import { base44 } from '../api/base44Client';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { StarRating } from '../components/form/StarRating';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useToast } from '../components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { useSessionManager } from '../components/utils/sessionManager';
import { parseFormSchema } from '../components/utils/formParser';
import { cn } from '../lib/utils';
import ChatMessage from '../components/chat/ChatMessage';
import FormField from '../components/chat/FormField';
import SummaryTable from '../components/chat/SummaryTable';
import Avatar from '../components/chat/Avatar';
import SimpleVoice from '../components/chat/SimpleVoice';

export default function FormChat() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [processName, setProcessName] = useState('Form Process');
  const [formSchema, setFormSchema] = useState(null);
  const [sections, setSections] = useState([]);
  const [currentSection, setCurrentSection] = useState(null);
  const [formData, setFormData] = useState({});
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [interactionMode, setInteractionMode] = useState('form');
  const [fields, setFields] = useState([]);
  const [currentFieldIndex, setCurrentFieldIndex] = useState(-1);
  const [isTyping, setIsTyping] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [formTitle, setFormTitle] = useState("");
  const [formLoaded, setFormLoaded] = useState(false);
  const [visibilityRules, setVisibilityRules] = useState([]);
  const [updatingRules, setUpdatingRules] = useState([]);
  const [blockVisibility, setBlockVisibility] = useState({});
  const [fieldVisibility, setFieldVisibility] = useState({});
  const [globalVariables, setGlobalVariables] = useState({});
  const [processedSections, setProcessedSections] = useState({});
  const [answeredFields, setAnsweredFields] = useState({});
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [currentReadingText, setCurrentReadingText] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const lastBotMessageRef = useRef("");
  const speechSynthesisRef = useRef(null);
  const messagesEndRef = useRef(null);
  const bottomRef = useRef(null);
  const { addMessage, getMessages } = useSessionManager();

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
          setLoading(false);
          setInitializing(false);
          return;
        }

        setInteractionMode(mode);
        console.log("Set interaction mode to:", mode);

        const processes = await Process.filter({ id: processId });
        console.log("Found processes:", processes);

        if (processes.length > 0) {
          const process = processes[0];
          console.log("Selected process:", process);
          setProcessName(process.name);

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

          // Load the form schema
          if (process.formSchemaId || process.formAsset) {
            const formId = process.formSchemaId || process.formAsset;
            console.log("Loading form schema with ID:", formId);
            await loadFormSchema(formId, mode);
          } else {
            console.error("No form schema associated with this process");
            setLoading(false);
            setInitializing(false);
          }

        } else {
          console.error("Process not found:", processId);
          setLoading(false);
          setInitializing(false);
        }
      } catch (error) {
        console.error("Error in createNewSession:", error);
        setLoading(false);
        setInitializing(false);
      }
    };

    createNewSession();

    // Initialize with a welcome message for chat/voice modes
    if (interactionMode === 'chat' || interactionMode === 'voice') {
      addMessage('Welcome! I\'ll help you fill out this form. Let\'s get started.', 'bot');
    }
  }, []);

  useEffect(() => {
    setMessages(getMessages());
  }, [getMessages]);

  useEffect(() => {
    // Scroll to bottom of messages
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (interactionMode === 'voice') {
      setVoiceActive(true);
    }
  }, [interactionMode]);

  const loadFormSchema = async (formId, mode) => {
    try {
      setLoading(true);
      console.log("Loading form schema with ID:", formId, "in mode:", mode);
      
      // Check if formId is a complex object (like a file asset) instead of a simple string
      if (typeof formId === 'object' && formId !== null) {
        console.log("Form ID is a complex object:", formId);
        
        // If it's a file asset with a URL, try to load the actual CVUF file
        if (formId.url) {
          console.log("Form asset has URL:", formId.url);
          try {
            const response = await fetch(formId.url);
            if (response.ok) {
              const formData = await response.json();
              console.log("Successfully loaded form data from URL:", formData);
              
              // Process the CVUF data
              processFormSchema(formData);
              return;
            } else {
              console.error("Failed to load form data from URL:", response.status);
            }
          } catch (error) {
            console.error("Error loading form data from URL:", error);
          }
        }
        
        // Try to use a property of the object as the ID
        if (formId.name) {
          console.log("Using form asset name as ID:", formId.name);
          
          // Try to load the CVUF file by name
          try {
            // Construct a URL based on the file name
            const fileUrl = `/assets/forms/${formId.name}`;
            console.log("Attempting to load form from:", fileUrl);
            
            const response = await fetch(fileUrl);
            if (response.ok) {
              const formData = await response.json();
              console.log("Successfully loaded form data from file:", formData);
              
              // Process the CVUF data
              processFormSchema(formData);
              return;
            } else {
              console.error("Failed to load form data from file:", response.status);
            }
          } catch (error) {
            console.error("Error loading form data from file:", error);
          }
        }
      }
      
      // If formId is a string, try to get the form schema directly
      try {
        const formSchemas = await FormSchema.filter({ id: formId });
        console.log("Form schema filter result:", formSchemas);
        
        if (formSchemas.length > 0) {
          const schema = formSchemas[0];
          console.log("Found form schema:", schema);
          
          // If schema has a URL, try to load the actual CVUF file
          if (schema.url) {
            try {
              const response = await fetch(schema.url);
              if (response.ok) {
                const formData = await response.json();
                console.log("Successfully loaded form data from schema URL:", formData);
                
                // Process the CVUF data
                processFormSchema(formData);
                return;
              }
            } catch (error) {
              console.error("Error loading form data from schema URL:", error);
            }
          }
          
          // If schema has content, use it directly
          if (schema.content) {
            try {
              const formData = typeof schema.content === 'string' 
                ? JSON.parse(schema.content) 
                : schema.content;
              
              console.log("Using form data from schema content:", formData);
              
              // Process the CVUF data
              processFormSchema(formData);
              return;
            } catch (error) {
              console.error("Error processing schema content:", error);
            }
          }
        } else {
          console.error("Form schema not found with ID:", formId);
        }
      } catch (error) {
        console.error("Error getting form schema:", error);
      }
      
      // If we reach here, we couldn't load the form schema
      console.error("Failed to load form schema");
      setLoading(false);
      setInitializing(false);
      
    } catch (error) {
      console.error("Error loading form:", error);
      setLoading(false);
      setInitializing(false);
    }
  };

  const processFormSchema = (schemaData) => {
    try {
      console.log("Processing form schema:", schemaData);
      
      if (!schemaData || !schemaData.form) {
        console.error("Invalid schema format - missing 'form' property");
        setLoading(false);
        setInitializing(false);
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
      
      setFormTitle(schemaData.form.formName || schemaData.form.title || "Form");
      setFormLoaded(true);
      
      // Set the current field to the first visible field
      if (extractedFields.length > 0) {
        setCurrentFieldIndex(0);
        
        // For chat/voice modes, send the first question
        if (interactionMode === 'chat' || interactionMode === 'voice') {
          const firstField = extractedFields[0];
          if (firstField) {
            setTimeout(() => {
              const questionText = generateQuestionForField(firstField);
              addMessage(questionText, 'bot');
              
              if (interactionMode === 'voice') {
                setCurrentReadingText(questionText);
              }
            }, 1000);
          }
        }
      }
      
      setLoading(false);
      setInitializing(false);
    } catch (error) {
      console.error("Error processing form schema:", error);
      setLoading(false);
      setInitializing(false);
    }
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

  const generateQuestionForField = (field) => {
    if (!field) return "";

    // Skip paragraph fields in chat/voice mode
    if (field.type === "paragraph") {
      return field.properties?.text || field.properties?.editedParagraph || field.label || "";
    }

    let question = field.label || `Please provide ${field.id}`;
    
    // Add required indicator
    if (field.required) {
      question += " (required)";
    }

    // Add field-specific instructions
    switch (field.type) {
      case "radioinput":
      case "radio":
        if (field.properties?.items && Array.isArray(field.properties.items)) {
          question += "\nOptions:";
          field.properties.items.forEach((item, index) => {
            question += `\n${index + 1}. ${item.label}`;
          });
        }
        break;
      case "dropdowninput":
      case "select":
        if (field.properties?.items && Array.isArray(field.properties.items)) {
          question += "\nOptions:";
          field.properties.items.forEach((item, index) => {
            question += `\n${index + 1}. ${item.label}`;
          });
        }
        break;
      case "dateinput":
      case "date":
        question += " (Please provide a date in MM/DD/YYYY format)";
        break;
      case "signaturepad":
      case "signature":
        question += " (Please type 'sign' to open the signature pad)";
        break;
      default:
        break;
    }

    return question;
  };

  const getCurrentField = () => {
    if (currentFieldIndex < 0 || currentFieldIndex >= fields.length) {
      return null;
    }
    
    return fields[currentFieldIndex];
  };

  const moveToNextField = () => {
    let nextIndex = currentFieldIndex + 1;
    
    // Skip hidden fields and paragraph fields in chat/voice mode
    while (
      nextIndex < fields.length && 
      (fields[nextIndex].hidden || 
       !fieldVisibility[fields[nextIndex].id] ||
       (interactionMode !== 'form' && fields[nextIndex].type === 'paragraph'))
    ) {
      nextIndex++;
    }
    
    if (nextIndex < fields.length) {
      setCurrentFieldIndex(nextIndex);
      
      // For chat/voice modes, send the next question
      if (interactionMode === 'chat' || interactionMode === 'voice') {
        const nextField = fields[nextIndex];
        const questionText = generateQuestionForField(nextField);
        addMessage(questionText, 'bot');
        
        if (interactionMode === 'voice') {
          setCurrentReadingText(questionText);
        }
      }
    } else {
      // All fields completed
      handleFormCompletion();
    }
  };

  const handleFormResponse = (value, source = 'manual') => {
    const currentField = getCurrentField();
    if (!currentField) return;

    console.log(`Processing response for field ${currentField.id}:`, value, `(source: ${source})`);

    // Handle signature fields
    if ((currentField.type === 'signature' || currentField.type === 'signatureinput' ||
      currentField.type === 'signaturepad') && value === 'signature_requested') {
      // Handle signature request
      return;
    }

    const newFormData = { ...formData };
    newFormData[currentField.id] = value;
    setFormData(newFormData);

    // Mark field as answered
    setAnsweredFields(prev => ({
      ...prev,
      [currentField.id]: true
    }));

    // For chat/voice modes, add the user's response as a message
    if (interactionMode === 'chat' || interactionMode === 'voice') {
      let displayValue = value;
      
      // Format the display value based on field type
      if (currentField.type === 'radioinput' || currentField.type === 'radio') {
        if (currentField.properties?.items && Array.isArray(currentField.properties.items)) {
          const selectedItem = currentField.properties.items.find(item => item.value === value);
          if (selectedItem) {
            displayValue = selectedItem.label;
          }
        }
      }
      
      addMessage(String(displayValue), 'user');
    }

    // Process any updating rules
    if (updatingRules.length > 0) {
      // Process rules logic here
    }

    // Move to the next field
    moveToNextField();
  };

  const handleFormCompletion = async () => {
    try {
      setLoading(true);
      
      // For chat/voice modes, send a completion message
      if (interactionMode === 'chat' || interactionMode === 'voice') {
        addMessage("Thank you for completing the form! Your responses have been submitted.", 'bot');
        
        if (interactionMode === 'voice') {
          setCurrentReadingText("Thank you for completing the form! Your responses have been submitted.");
        }
      }
      
      // Update session with form data and completion status
      if (sessionId) {
        await Session.update(sessionId, {
          formData: formData,
          completed: true,
          endTime: new Date().toISOString()
        });
        
        console.log("Session updated with form data:", formData);
      }
      
      setCompleted(true);
      setShowRating(true);
      setLoading(false);
    } catch (error) {
      console.error("Error submitting form:", error);
      setLoading(false);
      
      toast({
        title: "Error",
        description: "There was a problem submitting the form. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleInputChange = (e) => {
    setUserInput(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    
    const currentField = getCurrentField();
    if (!currentField) return;
    
    // Process the user input based on the current field type
    let processedValue = userInput;
    
    if (currentField.type === 'radioinput' || currentField.type === 'radio') {
      if (currentField.properties?.items && Array.isArray(currentField.properties.items)) {
        // Check if input is a number (option index)
        const optionIndex = parseInt(userInput) - 1;
        if (!isNaN(optionIndex) && optionIndex >= 0 && optionIndex < currentField.properties.items.length) {
          processedValue = currentField.properties.items[optionIndex].value;
        } else {
          // Check if input matches any option label or value
          const matchedOption = currentField.properties.items.find(
            item => item.label.toLowerCase() === userInput.toLowerCase() || 
                   item.value.toLowerCase() === userInput.toLowerCase()
          );
          
          if (matchedOption) {
            processedValue = matchedOption.value;
          }
        }
      }
    } else if (currentField.type === 'signaturepad' || currentField.type === 'signature') {
      if (userInput.toLowerCase() === 'sign') {
        processedValue = 'signature_requested';
      }
    }
    
    // Handle the form response
    handleFormResponse(processedValue);
    
    // Clear input
    setUserInput('');
  };

  const handleSpeechRecognized = (text) => {
    if (!text || !text.trim()) return;
    
    setUserInput(text);
    
    // Auto-submit after voice recognition
    setTimeout(() => {
      const currentField = getCurrentField();
      if (!currentField) return;
      
      // Process the user input based on the current field type
      let processedValue = text;
      
      if (currentField.type === 'radioinput' || currentField.type === 'radio') {
        if (currentField.properties?.items && Array.isArray(currentField.properties.items)) {
          // Check if input is a number (option index)
          const optionIndex = parseInt(text) - 1;
          if (!isNaN(optionIndex) && optionIndex >= 0 && optionIndex < currentField.properties.items.length) {
            processedValue = currentField.properties.items[optionIndex].value;
          } else {
            // Check if input matches any option label or value
            const matchedOption = currentField.properties.items.find(
              item => item.label.toLowerCase() === text.toLowerCase() || 
                     item.value.toLowerCase() === text.toLowerCase()
            );
            
            if (matchedOption) {
              processedValue = matchedOption.value;
            }
          }
        }
      } else if (currentField.type === 'signaturepad' || currentField.type === 'signature') {
        if (text.toLowerCase() === 'sign') {
          processedValue = 'signature_requested';
        }
      }
      
      // Handle the form response
      handleFormResponse(processedValue, 'voice');
      
      // Clear input
      setUserInput('');
    }, 500);
  };

  const handleRatingSubmit = async () => {
    try {
      setLoading(true);
      
      // Update session with rating
      if (sessionId) {
        await Session.update(sessionId, {
          ratings: {
            overallExperience: userRating
          }
        });
        
        console.log("Session updated with rating:", userRating);
      }
      
      setLoading(false);
      
      // Navigate back to dashboard
      navigate('/');
    } catch (error) {
      console.error("Error submitting rating:", error);
      setLoading(false);
      
      toast({
        title: "Error",
        description: "There was a problem submitting your rating. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (loading && initializing) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  if (showRating) {
    return (
      <div className="container mx-auto py-10 px-4 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Thank You!</CardTitle>
            <CardDescription>Your form has been submitted successfully.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-4">How would you rate your experience?</h3>
                <StarRating 
                  value={userRating} 
                  onChange={setUserRating} 
                  size={8} 
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button 
              onClick={handleRatingSubmit}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Rating'
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (interactionMode === 'chat' || interactionMode === 'voice') {
    return (
      <div className="container mx-auto py-10 px-4 max-w-4xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{formTitle}</CardTitle>
            <CardDescription>
              {interactionMode === 'chat' ? 'Chat Mode' : 'Voice Mode'}
            </CardDescription>
          </CardHeader>
        </Card>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="h-[60vh] overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg, index) => (
              <ChatMessage 
                key={index}
                message={msg.text}
                sender={msg.sender}
                timestamp={msg.timestamp}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-4 border-t">
            {voiceActive ? (
              <div className="mb-4">
                <SimpleVoice
                  onTextRecognized={handleSpeechRecognized}
                  textToSpeak={currentReadingText}
                  autoSpeak={true}
                />
              </div>
            ) : null}
            
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={userInput}
                onChange={handleInputChange}
                placeholder="Type your response..."
                className="flex-1"
                disabled={loading || !formLoaded || completed}
              />
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={loading || !formLoaded || completed}
              >
                Send
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{formTitle}</CardTitle>
          <CardDescription>{formSchema?.description || ''}</CardDescription>
        </CardHeader>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <div className="space-y-2">
            {sections.map((section, index) => (
              <Button
                key={section.id}
                variant={currentSection?.id === section.id ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => setCurrentSection(section.id)}
              >
                <span className="mr-2">{index + 1}.</span>
                {section.id}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="md:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>{currentSection?.id || 'Form'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {fields
                  .filter(field => field.section === currentSection?.id && fieldVisibility[field.id])
                  .map(field => (
                    <FormField
                      key={field.id}
                      field={field}
                      value={formData[field.id] || ''}
                      onChange={(value) => handleFormResponse(value)}
                      error={validationError === field.id}
                    />
                  ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  const currentIndex = sections.findIndex(s => s.id === currentSection?.id);
                  if (currentIndex > 0) {
                    setCurrentSection(sections[currentIndex - 1]);
                  }
                }}
                disabled={sections.findIndex(s => s.id === currentSection?.id) === 0}
              >
                Previous
              </Button>
              
              {sections.findIndex(s => s.id === currentSection?.id) === sections.length - 1 ? (
                <Button 
                  onClick={handleFormCompletion}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Form'
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    const currentIndex = sections.findIndex(s => s.id === currentSection?.id);
                    if (currentIndex < sections.length - 1) {
                      setCurrentSection(sections[currentIndex + 1]);
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Next
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
