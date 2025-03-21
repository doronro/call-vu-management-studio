
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Upload } from "lucide-react";

export default function CreateProcessModal({ onCreate, onClose }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState("");
  const [formAsset, setFormAsset] = useState(null);
  const [knowledgebaseAssets, setKnowledgebaseAssets] = useState([]);
  const [documentationAssets, setDocumentationAssets] = useState([]);
  const [dataAssets, setDataAssets] = useState([]);

  const handleLogoChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    
    setLogo(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setNameError("Process name is required");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onCreate({
        name,
        description,
        logo,
        formAsset,
        knowledgebaseAssets,
        documentationAssets,
        dataAssets
      });
    } catch (error) {
      console.error("Error creating process:", error);
      alert("Failed to create process. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFileInput = (label, accept, onChange, multiple = false, value = null) => (
    <div 
      className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-500 transition-colors"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        if (multiple) {
          onChange({ target: { files } });
        } else {
          onChange({ target: { files: [files[0]] } });
        }
      }}
    >
      <div className="flex flex-col items-center gap-2">
        <Upload className="h-8 w-8 text-gray-400" />
        <p className="text-sm text-gray-600">{label}</p>
        <Input 
          type="file" 
          accept={accept}
          onChange={onChange}
          multiple={multiple}
          className="w-full"
        />
        {value && !multiple && (
          <p className="text-sm text-blue-600">File selected: {value.name}</p>
        )}
        {multiple && value?.length > 0 && (
          <p className="text-sm text-blue-600">{value.length} file(s) selected</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Create New Process</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Process Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameError("");
                  }}
                  placeholder="Enter process name"
                  className={nameError ? "border-red-500" : ""}
                />
                {nameError && (
                  <p className="text-red-500 text-sm mt-1">{nameError}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter a brief description"
                  rows={3}
                />
              </div>
              
              <div>
                <Label>Process Logo (Optional)</Label>
                <div className="mt-1">
                  {logoPreview ? (
                    <div className="relative inline-block">
                      <img 
                        src={logoPreview} 
                        alt="Logo preview" 
                        className="w-20 h-20 rounded object-cover border"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-gray-100"
                        onClick={() => {
                          setLogo(null);
                          setLogoPreview(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    renderFileInput(
                      "Click or drag to upload logo image",
                      "image/*",
                      handleLogoChange
                    )
                  )}
                </div>
              </div>

              <div>
                <Label>Form Asset (Optional)</Label>
                {renderFileInput(
                  "Click or drag to upload form schema",
                  ".json,.cvuf",
                  (e) => setFormAsset(e.target.files[0]),
                  false,
                  formAsset
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <Label>Knowledge Base Assets (Optional)</Label>
                {renderFileInput(
                  "Click or drag to upload knowledge base files",
                  ".pdf,.txt,.json",
                  (e) => setKnowledgebaseAssets(Array.from(e.target.files)),
                  true,
                  knowledgebaseAssets
                )}
              </div>

              <div>
                <Label>Documentation Assets (Optional)</Label>
                {renderFileInput(
                  "Click or drag to upload documentation",
                  ".pdf,.txt,.doc,.docx,.ppt,.pptx",
                  (e) => setDocumentationAssets(Array.from(e.target.files)),
                  true,
                  documentationAssets
                )}
              </div>

              <div>
                <Label>Data Assets (Optional)</Label>
                {renderFileInput(
                  "Click or drag to upload data files",
                  ".csv,.json,.xlsx",
                  (e) => setDataAssets(Array.from(e.target.files)),
                  true,
                  dataAssets
                )}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? "Creating..." : "Create Process"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
