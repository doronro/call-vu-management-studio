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
  const messagesEndRef = useRef(null);
  const { addMessage, getMessages } = useSessionManager();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const processId = searchParams.get('processId');
    const mode = searchParams.get('mode') || 'chat';
    
    console.log("URL Parameters:", { processId, mode });
    console.log("Setting interaction mode to:", mode);
    setInteractionMode(mode);
    
    if (processId) {
      console.log("Starting to load process:", processId);
      loadProcess(processId, mode);
    } else {
      console.error("No process ID provided");
      setLoading(false);
      setInitializing(false);
    }
    
    // Initialize with a welcome message
    addMessage('Welcome to the form chat! I\'ll help you fill out this form.', 'bot');
  }, [location.search]);

  useEffect(() => {
    setMessages(getMessages());
  }, [getMessages]);

  useEffect(() => {
    // Scroll to bottom of messages
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const loadProcess = async (processId, mode) => {
    try {
      setLoading(true);
      console.log("Loading process with ID:", processId, "in mode:", mode);
      
      // First try to get the process directly by ID
      let processes = [];
      try {
        processes = await Process.filter({ id: processId });
        console.log("Process filter result:", processes);
      } catch (error) {
        console.error("Error in Process.filter:", error);
        // Try to get all processes and filter manually
        try {
          const allProcesses = await Process.list();
          console.log("All processes:", allProcesses);
          processes = allProcesses.filter(p => p.id === processId);
          console.log("Filtered processes:", processes);
        } catch (listError) {
          console.error("Error in Process.list:", listError);
        }
      }
      
      if (processes.length === 0) {
        console.error("Process not found, trying to get all processes");
        try {
          const allProcesses = await Process.list();
          console.log("All available processes:", allProcesses);
          
          if (allProcesses.length > 0) {
            // Use the first process as fallback
            const fallbackProcess = allProcesses[0];
            setProcessName(fallbackProcess.name || "Form Process");
            console.log("Using fallback process:", fallbackProcess);
            
            if (fallbackProcess.formSchemaId || fallbackProcess.formAsset) {
              const formId = fallbackProcess.formSchemaId || fallbackProcess.formAsset;
              console.log("Loading form schema with ID:", formId);
              loadForm(formId, mode);
            } else {
              console.error("No form schema associated with fallback process");
              setLoading(false);
              setInitializing(false);
            }
          } else {
            console.error("No processes available");
            setLoading(false);
            setInitializing(false);
          }
        } catch (error) {
          console.error("Error getting all processes:", error);
          setLoading(false);
          setInitializing(false);
        }
        return;
      }
      
      const process = processes[0];
      setProcessName(process.name || "Form Process");
      
      // Check for formSchemaId or formAsset
      const formId = process.formSchemaId || process.formAsset;
      if (formId) {
        console.log("Loading form schema with ID:", formId);
        loadForm(formId, mode);
      } else {
        console.error("No form schema associated with this process");
        setLoading(false);
        setInitializing(false);
      }
      
      // Create a new session for this process
      const newSessionId = `session_${Date.now()}`;
      setSessionId(newSessionId);
      
      try {
        console.log("Creating new session:", {
          sessionId: newSessionId,
          processId: processId,
          mode: mode,
          startTime: new Date().toISOString()
        });
        
        await Session.create({
          sessionId: newSessionId,
          processId: processId,
          mode: mode,
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
      setLoading(false);
      setInitializing(false);
    }
  };

  const loadForm = async (formId, mode) => {
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
              
              // Use the form parser to parse the CVUF file
              const parsedForm = parseFormSchema(formData);
              console.log("Parsed form schema:", parsedForm);
              
              // Initialize the form with the parsed schema
              initializeFormFromParsedSchema(parsedForm);
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
              
              // Use the form parser to parse the CVUF file
              const parsedForm = parseFormSchema(formData);
              console.log("Parsed form schema:", parsedForm);
              
              // Initialize the form with the parsed schema
              initializeFormFromParsedSchema(parsedForm);
              return;
            } else {
              console.error("Failed to load form data from file:", response.status);
            }
          } catch (error) {
            console.error("Error loading form data from file:", error);
          }
          
          // If loading the actual file failed, create a mock schema as fallback
          // but only if we're not in chat or voice mode
          if (mode !== 'chat' && mode !== 'voice') {
            const mockSchema = createMockFormSchema(formId.name);
            console.log("Created mock form schema:", mockSchema);
            initializeForm(mockSchema);
            return;
          } else {
            // For chat or voice mode, we need to use the actual CVUF file
            console.error("Failed to load CVUF file for chat/voice mode");
            toast({
              title: "Error",
              description: "Failed to load the form for chat/voice mode. Please try again or contact support.",
              variant: "destructive"
            });
            setLoading(false);
            setInitializing(false);
            return;
          }
        }
        
        // If we can't extract a usable ID, try to get all form schemas
        try {
          const allFormSchemas = await FormSchema.list();
          console.log("All available form schemas:", allFormSchemas);
          
          if (allFormSchemas.length > 0) {
            // Use the first form schema as fallback
            const fallbackSchema = allFormSchemas[0];
            console.log("Using fallback form schema:", fallbackSchema);
            initializeForm(fallbackSchema);
          } else {
            console.error("No form schemas available");
            // Create a generic form schema as last resort
            const genericSchema = createGenericFormSchema();
            console.log("Created generic form schema:", genericSchema);
            initializeForm(genericSchema);
          }
        } catch (error) {
          console.error("Error getting all form schemas:", error);
          // Create a generic form schema as last resort
          const genericSchema = createGenericFormSchema();
          console.log("Created generic form schema:", genericSchema);
          initializeForm(genericSchema);
        }
        return;
      }
      
      // If formId is a string, try to get the form schema directly
      try {
        const formSchemas = await FormSchema.filter({ id: formId });
        console.log("Form schema filter result:", formSchemas);
        
        if (formSchemas.length > 0) {
          const schema = formSchemas[0];
          console.log("Found form schema:", schema);
          initializeForm(schema);
        } else {
          console.error("Form schema not found with ID:", formId);
          // Create a generic form schema as fallback
          const genericSchema = createGenericFormSchema();
          console.log("Created generic form schema:", genericSchema);
          initializeForm(genericSchema);
        }
      } catch (error) {
        console.error("Error getting form schema:", error);
        // Create a generic form schema as fallback
        const genericSchema = createGenericFormSchema();
        console.log("Created generic form schema:", genericSchema);
        initializeForm(genericSchema);
      }
    } catch (error) {
      console.error("Error loading form:", error);
      setLoading(false);
      setInitializing(false);
    }
  };

  const initializeFormFromParsedSchema = (parsedSchema) => {
    try {
      console.log("Initializing form from parsed schema:", parsedSchema);
      
      if (!parsedSchema || !parsedSchema.steps) {
        console.error("Invalid parsed schema");
        setLoading(false);
        setInitializing(false);
        return;
      }
      
      // Set the form schema
      setFormSchema(parsedSchema);
      
      // Set the sections based on steps
      setSections(parsedSchema.steps);
      
      // Set the current section to the first one
      if (parsedSchema.steps.length > 0) {
        setCurrentSection(parsedSchema.steps[0]);
      }
      
      // Initialize form data
      const initialFormData = {};
      if (parsedSchema.fields) {
        parsedSchema.fields.forEach(field => {
          initialFormData[field.id] = '';
        });
      }
      setFormData(initialFormData);
      
      setLoading(false);
      setInitializing(false);
    } catch (error) {
      console.error("Error initializing form from parsed schema:", error);
      setLoading(false);
      setInitializing(false);
    }
  };

  const initializeForm = (schema) => {
    try {
      console.log("Initializing form with schema:", schema);
      
      if (!schema) {
        console.error("Invalid schema");
        setLoading(false);
        setInitializing(false);
        return;
      }
      
      // Set the form schema
      setFormSchema(schema);
      
      // Extract sections from the schema
      let extractedSections = [];
      if (schema.sections) {
        extractedSections = schema.sections;
      } else if (schema.form && schema.form.sections) {
        extractedSections = schema.form.sections;
      } else if (schema.form && schema.form.steps) {
        // Convert steps to sections
        extractedSections = schema.form.steps.map(step => ({
          id: step.identifier || `section_${step.stepName}`,
          name: step.stepName || 'Section',
          fields: []
        }));
      }
      
      // Set the sections
      setSections(extractedSections);
      
      // Set the current section to the first one
      if (extractedSections.length > 0) {
        setCurrentSection(extractedSections[0]);
      }
      
      // Initialize form data
      const initialFormData = {};
      if (schema.fields) {
        schema.fields.forEach(field => {
          initialFormData[field.id] = '';
        });
      }
      setFormData(initialFormData);
      
      setLoading(false);
      setInitializing(false);
    } catch (error) {
      console.error("Error initializing form:", error);
      setLoading(false);
      setInitializing(false);
    }
  };

  const handleInputChange = (e) => {
    setUserInput(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    
    // Add user message
    addMessage(userInput, 'user');
    
    // Process user input
    processUserInput(userInput);
    
    // Clear input
    setUserInput('');
  };

  const processUserInput = (input) => {
    // Simple bot response for now
    setTimeout(() => {
      addMessage("I've received your input. Let me process that for you.", 'bot');
    }, 500);
  };

  const handleFieldChange = (fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSectionChange = (sectionId) => {
    const section = sections.find(s => s.id === sectionId);
    if (section) {
      setCurrentSection(section);
    }
  };

  const handleFormSubmit = async () => {
    try {
      setLoading(true);
      
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

  // Create a mock form schema based on the file name
  const createMockFormSchema = (fileName) => {
    // Extract a readable name from the file name
    let formName = fileName.replace(/[_\-.]/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Check if it's a Financial Charge Dispute form
    if (fileName.toLowerCase().includes('financial') && fileName.toLowerCase().includes('charge') && fileName.toLowerCase().includes('dispute')) {
      return {
        id: 'financial-charge-dispute',
        name: 'Financial Charge Dispute Form',
        description: 'Form for disputing financial charges',
        sections: [
          {
            id: 'dispute_information',
            name: 'Dispute Information',
            fields: [
              { id: 'account_number', name: 'Account Number', type: 'text', required: true },
              { id: 'transaction_date', name: 'Transaction Date', type: 'date', required: true },
              { id: 'transaction_amount', name: 'Transaction Amount', type: 'number', required: true },
              { id: 'merchant_name', name: 'Merchant Name', type: 'text', required: true }
            ]
          },
          {
            id: 'dispute_reason',
            name: 'Dispute Reason',
            fields: [
              { id: 'dispute_type', name: 'Dispute Type', type: 'select', options: ['Unauthorized Charge', 'Duplicate Charge', 'Incorrect Amount', 'Service Not Received', 'Other'], required: true },
              { id: 'dispute_description', name: 'Dispute Description', type: 'textarea', required: true },
              { id: 'contacted_merchant', name: 'Have you contacted the merchant?', type: 'radio', options: ['Yes', 'No'], required: true }
            ]
          },
          {
            id: 'supporting_documents',
            name: 'Supporting Documents',
            fields: [
              { id: 'has_receipt', name: 'Do you have a receipt?', type: 'radio', options: ['Yes', 'No'], required: true },
              { id: 'has_correspondence', name: 'Do you have correspondence with the merchant?', type: 'radio', options: ['Yes', 'No'], required: true },
              { id: 'additional_comments', name: 'Additional Comments', type: 'textarea', required: false }
            ]
          },
          {
            id: 'confirmation',
            name: 'Confirmation',
            fields: [
              { id: 'confirm_accurate', name: 'I confirm that the information provided is accurate', type: 'checkbox', required: true },
              { id: 'signature', name: 'Signature', type: 'text', required: true }
            ]
          }
        ]
      };
    }
    
    // Generic form for other file names
    return {
      id: 'generic-form',
      name: formName || 'Form',
      description: 'Form generated from file',
      sections: [
        {
          id: 'personal_information',
          name: 'Personal Information',
          fields: [
            { id: 'full_name', name: 'Full Name', type: 'text', required: true },
            { id: 'email', name: 'Email Address', type: 'email', required: true },
            { id: 'phone', name: 'Phone Number', type: 'tel', required: false }
          ]
        },
        {
          id: 'form_details',
          name: 'Form Details',
          fields: [
            { id: 'subject', name: 'Subject', type: 'text', required: true },
            { id: 'message', name: 'Message', type: 'textarea', required: true },
            { id: 'priority', name: 'Priority', type: 'select', options: ['Low', 'Medium', 'High'], required: true }
          ]
        }
      ]
    };
  };

  // Create a generic form schema as a last resort
  const createGenericFormSchema = () => {
    return {
      id: 'generic-form',
      name: 'Generic Form',
      description: 'A generic form for data collection',
      sections: [
        {
          id: 'personal_information',
          name: 'Personal Information',
          fields: [
            { id: 'full_name', name: 'Full Name', type: 'text', required: true },
            { id: 'email', name: 'Email Address', type: 'email', required: true },
            { id: 'phone', name: 'Phone Number', type: 'tel', required: false },
            { id: 'date_of_birth', name: 'Date of Birth', type: 'date', required: false }
          ]
        },
        {
          id: 'contact_preferences',
          name: 'Contact Preferences',
          fields: [
            { id: 'preferred_contact', name: 'Preferred Contact Method', type: 'select', options: ['Email', 'Phone', 'Mail'], required: true },
            { id: 'receive_updates', name: 'Would you like to receive updates?', type: 'radio', options: ['Yes', 'No'], required: true }
          ]
        },
        {
          id: 'additional_information',
          name: 'Additional Information',
          fields: [
            { id: 'comments', name: 'Comments', type: 'textarea', required: false },
            { id: 'terms_accepted', name: 'I accept the terms and conditions', type: 'checkbox', required: true }
          ]
        }
      ]
    };
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
            <CardTitle>{processName}</CardTitle>
            <CardDescription>
              {interactionMode === 'chat' ? 'Chat Mode' : 'Voice Mode'}
            </CardDescription>
          </CardHeader>
        </Card>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="h-[60vh] overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={cn(
                  "flex max-w-[80%] rounded-lg p-4",
                  msg.sender === 'user' 
                    ? "bg-blue-600 text-white ml-auto" 
                    : "bg-gray-200 text-gray-800"
                )}
              >
                {msg.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-4 border-t">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={userInput}
                onChange={handleInputChange}
                placeholder="Type your message..."
                className="flex-1"
              />
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={loading}
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
          <CardTitle>{formSchema?.name || 'Form'}</CardTitle>
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
                onClick={() => handleSectionChange(section.id)}
              >
                <span className="mr-2">{index + 1}.</span>
                {section.name}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="md:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>{currentSection?.name || 'Section'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {currentSection?.fields?.map(field => (
                  <div key={field.id} className="space-y-2">
                    <Label htmlFor={field.id}>
                      {field.name}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    
                    {field.type === 'textarea' ? (
                      <Textarea
                        id={field.id}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        required={field.required}
                      />
                    ) : field.type === 'select' ? (
                      <select
                        id={field.id}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        required={field.required}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="">Select an option</option>
                        {field.options?.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : field.type === 'radio' ? (
                      <div className="space-y-2">
                        {field.options?.map(option => (
                          <div key={option} className="flex items-center">
                            <input
                              type="radio"
                              id={`${field.id}_${option}`}
                              name={field.id}
                              value={option}
                              checked={formData[field.id] === option}
                              onChange={() => handleFieldChange(field.id, option)}
                              required={field.required}
                              className="mr-2"
                            />
                            <Label htmlFor={`${field.id}_${option}`}>{option}</Label>
                          </div>
                        ))}
                      </div>
                    ) : field.type === 'checkbox' ? (
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={field.id}
                          checked={!!formData[field.id]}
                          onChange={(e) => handleFieldChange(field.id, e.target.checked)}
                          required={field.required}
                          className="mr-2"
                        />
                        <Label htmlFor={field.id}>{field.name}</Label>
                      </div>
                    ) : (
                      <Input
                        id={field.id}
                        type={field.type === 'email' ? 'email' : field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        required={field.required}
                      />
                    )}
                  </div>
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
                  onClick={handleFormSubmit}
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
