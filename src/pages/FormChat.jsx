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
  const [interactionMode, setInteractionMode] = useState('chat');
  const messagesEndRef = useRef(null);
  const { addMessage, getMessages } = useSessionManager();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const processId = searchParams.get('processId');
    const mode = searchParams.get('mode') || 'chat';
    
    console.log("URL Parameters:", { processId, mode });
    setInteractionMode(mode);
    
    if (processId) {
      console.log("Starting to load process:", processId);
      loadProcess(processId);
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

  const loadProcess = async (processId) => {
    try {
      setLoading(true);
      console.log("Loading process with ID:", processId);
      
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
              loadForm(formId);
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
        loadForm(formId);
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
      setLoading(false);
      setInitializing(false);
    }
  };

  const loadForm = async (formId) => {
    try {
      setLoading(true);
      console.log("Loading form schema with ID:", formId);
      
      // Check if formId is a complex object (like a file asset) instead of a simple string
      if (typeof formId === 'object' && formId !== null) {
        console.log("Form ID is a complex object:", formId);
        
        // Try to use a property of the object as the ID
        if (formId.name) {
          console.log("Using form asset name as ID:", formId.name);
          // Create a simple mock form schema based on the file name
          const mockSchema = createMockFormSchema(formId.name);
          console.log("Created mock form schema:", mockSchema);
          initializeForm(mockSchema);
          return;
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
      
      // If formId is a simple string, proceed with normal loading
      let formSchemas = [];
      try {
        formSchemas = await FormSchema.filter({ id: formId });
        console.log("Form schema filter result:", formSchemas);
      } catch (error) {
        console.error("Error in FormSchema.filter:", error);
        // Try to get all form schemas and filter manually
        try {
          const allFormSchemas = await FormSchema.list();
          console.log("All form schemas:", allFormSchemas);
          formSchemas = allFormSchemas.filter(f => f.id === formId);
          console.log("Filtered form schemas:", formSchemas);
        } catch (listError) {
          console.error("Error in FormSchema.list:", listError);
        }
      }
      
      if (formSchemas.length === 0) {
        console.error("Form schema not found, trying to get all form schemas");
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
      
      const schema = formSchemas[0];
      initializeForm(schema);
    } catch (error) {
      console.error("Error loading form:", error);
      // Create a generic form schema as last resort
      const genericSchema = createGenericFormSchema();
      console.log("Created generic form schema:", genericSchema);
      initializeForm(genericSchema);
    }
  };

  // Create a mock form schema based on a file name
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
              { id: 'confirm_accuracy', name: 'I confirm that the information provided is accurate', type: 'checkbox', required: true },
              { id: 'signature', name: 'Signature', type: 'text', required: true }
            ]
          }
        ]
      };
    }
    
    // Generic form based on the file name
    return {
      id: 'mock-form-' + Date.now(),
      name: formName || 'Form Process',
      description: 'Form generated from ' + fileName,
      sections: [
        {
          id: 'personal_information',
          name: 'Personal Information',
          fields: [
            { id: 'name', name: 'Full Name', type: 'text', required: true },
            { id: 'email', name: 'Email Address', type: 'email', required: true },
            { id: 'phone', name: 'Phone Number', type: 'text', required: false }
          ]
        },
        {
          id: 'request_details',
          name: 'Request Details',
          fields: [
            { id: 'request_type', name: 'Request Type', type: 'select', options: ['Information', 'Service', 'Support', 'Other'], required: true },
            { id: 'description', name: 'Description', type: 'textarea', required: true }
          ]
        },
        {
          id: 'confirmation',
          name: 'Confirmation',
          fields: [
            { id: 'terms', name: 'I agree to the terms and conditions', type: 'checkbox', required: true }
          ]
        }
      ]
    };
  };

  // Create a generic form schema as last resort
  const createGenericFormSchema = () => {
    return {
      id: 'generic-form-' + Date.now(),
      name: 'Customer Information Form',
      description: 'Basic customer information form',
      sections: [
        {
          id: 'personal_information',
          name: 'Personal Information',
          fields: [
            { id: 'name', name: 'Full Name', type: 'text', required: true },
            { id: 'email', name: 'Email Address', type: 'email', required: true },
            { id: 'phone', name: 'Phone Number', type: 'text', required: false }
          ]
        },
        {
          id: 'address',
          name: 'Address',
          fields: [
            { id: 'street', name: 'Street Address', type: 'text', required: true },
            { id: 'city', name: 'City', type: 'text', required: true },
            { id: 'state', name: 'State/Province', type: 'text', required: true },
            { id: 'zip', name: 'Zip/Postal Code', type: 'text', required: true },
            { id: 'country', name: 'Country', type: 'text', required: true }
          ]
        },
        {
          id: 'preferences',
          name: 'Preferences',
          fields: [
            { id: 'contact_method', name: 'Preferred Contact Method', type: 'select', options: ['Email', 'Phone', 'Mail'], required: true },
            { id: 'comments', name: 'Additional Comments', type: 'textarea', required: false }
          ]
        }
      ]
    };
  };

  const initializeForm = (schema) => {
    console.log("Initializing form with schema:", schema);
    setFormSchema(schema);
    
    // Extract sections from schema
    const schemaSections = schema.sections || [];
    setSections(schemaSections);
    
    // Initialize form data
    const initialData = {};
    schemaSections.forEach(section => {
      section.fields.forEach(field => {
        initialData[field.id] = '';
      });
    });
    setFormData(initialData);
    
    // Set initial section
    if (schemaSections.length > 0) {
      let introMessage = `I'll help you fill out the ${schema.name}.`;
      const firstSection = schemaSections[0]?.id;
      if (firstSection) {
        introMessage += ` Let's start with the ${firstSection} section.`;
        setCurrentSection(firstSection);
        addMessage(introMessage, "bot");
      }
    }
    
    setLoading(false);
    setInitializing(false);
  };

  const handleInputChange = (fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSendMessage = () => {
    if (!userInput.trim()) return;
    
    addMessage(userInput, "user");
    setUserInput('');
    
    // Simple bot response
    setTimeout(() => {
      addMessage("I've received your message. Let me help you with that.", "bot");
    }, 500);
  };

  const handleCompleteSection = () => {
    const currentSectionIndex = sections.findIndex(s => s.id === currentSection);
    if (currentSectionIndex < sections.length - 1) {
      const nextSection = sections[currentSectionIndex + 1].id;
      setCurrentSection(nextSection);
      addMessage(`Great! Let's move on to the ${nextSection} section.`, "bot");
    } else {
      handleCompleteForm();
    }
  };

  const handleCompleteForm = () => {
    setCompleted(true);
    setShowRating(true);
    addMessage("Thank you for completing the form! How would you rate your experience?", "bot");
    
    // Mark session as completed
    markSessionComplete(formData);
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

  const renderField = (field) => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <Input
            id={field.id}
            type={field.type}
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.required}
          />
        );
      case 'textarea':
        return (
          <Textarea
            id={field.id}
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.required}
          />
        );
      case 'select':
        return (
          <select
            id={field.id}
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.required}
            className="w-full p-2 border rounded"
          >
            <option value="">Select an option</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      case 'radio':
        return (
          <div className="flex flex-col space-y-2">
            {field.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={`${field.id}-${option}`}
                  name={field.id}
                  value={option}
                  checked={formData[field.id] === option}
                  onChange={() => handleInputChange(field.id, option)}
                  required={field.required}
                />
                <label htmlFor={`${field.id}-${option}`}>{option}</label>
              </div>
            ))}
          </div>
        );
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={field.id}
              checked={formData[field.id] === true}
              onChange={(e) => handleInputChange(field.id, e.target.checked)}
              required={field.required}
            />
            <label htmlFor={field.id}>{field.name}</label>
          </div>
        );
      case 'date':
        return (
          <Input
            id={field.id}
            type="date"
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.required}
          />
        );
      default:
        return (
          <Input
            id={field.id}
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.required}
          />
        );
    }
  };

  const renderCurrentSection = () => {
    const section = sections.find(s => s.id === currentSection);
    if (!section) return null;

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium">{section.name}</h3>
        {section.fields.map((field) => (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>{field.name}{field.required && <span className="text-red-500">*</span>}</Label>
            {renderField(field)}
          </div>
        ))}
        <Button onClick={handleCompleteSection}>
          {currentSection === sections[sections.length - 1]?.id ? 'Complete Form' : 'Next Section'}
        </Button>
      </div>
    );
  };

  const renderChatMessages = () => {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={cn(
              "max-w-[80%] rounded-lg p-3",
              msg.sender === "user"
                ? "bg-primary text-primary-foreground ml-auto"
                : "bg-muted"
            )}
          >
            {msg.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    );
  };

  const renderChatInput = () => {
    return (
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <Input
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type your message..."
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <Button onClick={handleSendMessage}>Send</Button>
        </div>
      </div>
    );
  };

  if (initializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Form Chat</h1>
        <p className="text-gray-500 mb-4">Initializing...</p>
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-primary text-primary-foreground p-4">
        <h1 className="text-2xl font-bold">{processName}</h1>
      </header>
      
      <main className="flex-1 flex">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading form...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex">
            {interactionMode === 'chat' ? (
              <div className="flex-1 flex flex-col">
                {renderChatMessages()}
                {!completed && renderChatInput()}
                {showRating && !userRating && (
                  <div className="p-4 border-t">
                    <p className="mb-2">Please rate your experience:</p>
                    <StarRating onRatingChange={handleRatingSubmit} />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 p-4 overflow-y-auto">
                <Tabs defaultValue={currentSection}>
                  <TabsList className="mb-4">
                    {sections.map((section) => (
                      <TabsTrigger
                        key={section.id}
                        value={section.id}
                        onClick={() => setCurrentSection(section.id)}
                      >
                        {section.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {sections.map((section) => (
                    <TabsContent key={section.id} value={section.id}>
                      <Card>
                        <CardHeader>
                          <CardTitle>{section.name}</CardTitle>
                          <CardDescription>Please fill out the fields below</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {section.fields.map((field) => (
                              <div key={field.id} className="space-y-2">
                                <Label htmlFor={field.id}>{field.name}{field.required && <span className="text-red-500">*</span>}</Label>
                                {renderField(field)}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Button onClick={handleCompleteSection}>
                            {section.id === sections[sections.length - 1]?.id ? 'Complete Form' : 'Next Section'}
                          </Button>
                        </CardFooter>
                      </Card>
                    </TabsContent>
                  ))}
                </Tabs>
                
                {completed && (
                  <div className="mt-8 p-4 border rounded-lg">
                    <h3 className="text-xl font-bold mb-4">Form Completed</h3>
                    <p className="mb-4">Thank you for completing the form!</p>
                    {!userRating && (
                      <div>
                        <p className="mb-2">Please rate your experience:</p>
                        <StarRating onRatingChange={handleRatingSubmit} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
