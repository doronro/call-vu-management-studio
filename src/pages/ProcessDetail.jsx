
import React, { useState, useEffect, useRef } from 'react';
import { Process } from '@/api/entities';
import { UploadFile } from '@/api/integrations';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Tabs, TabsContent, TabsList, TabsTrigger 
} from "@/components/ui/tabs";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, Save, Upload, File, FileText, FileSpreadsheet,
  Trash2, AlertCircle, Loader2, FileUp, FileQuestion, BarChart
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import AssetCard from "@/components/processes/AssetCard";
import { Badge } from "@/components/ui/badge";

export default function ProcessDetail() {
  const [process, setProcess] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [activeTab, setActiveTab] = useState("form");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const fileInputRef = useRef(null);
  const formUploadRef = useRef(null);
  const knowledgebaseUploadRef = useRef(null);
  const dataUploadRef = useRef(null);
  const docUploadRef = useRef(null);

  const urlParams = new URLSearchParams(window.location.search);
  const processId = urlParams.get('id');

  useEffect(() => {
    if (processId) {
      loadProcess();
    }
  }, [processId]);

  const loadProcess = async () => {
    try {
      const processes = await Process.filter({id: processId});
      const processData = processes.length > 0 ? processes[0] : null;

      if (!processData) {
        setError("Process not found");
        return;
      }

      setProcess(processData);
      setName(processData.name || "");
      setDescription(processData.description || "");
      setLogoUrl(processData.logoUrl || "");
    } catch (error) {
      console.error("Error loading process:", error);
      setError("Failed to load process details");
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file for the logo');
      return;
    }

    setLogoFile(file);
    setLogoUrl(URL.createObjectURL(file));
  };

  const handleSaveDetails = async () => {
    if (!name.trim()) {
      setError("Process name is required");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      let updatedLogoUrl = logoUrl;

      if (logoFile) {
        const uploadResult = await UploadFile({ file: logoFile });
        updatedLogoUrl = uploadResult.file_url;
      }

      await Process.update(processId, {
        name,
        description,
        logoUrl: updatedLogoUrl
      });

      setSuccessMessage("Process details updated successfully");
      setTimeout(() => setSuccessMessage(null), 3000);

      await loadProcess();
    } catch (error) {
      console.error("Error saving process details:", error);
      setError("Failed to save process details");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e, category) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFileUpload(files[0], category);
    }
  };

  const handleFileSelect = async (e, category) => {
    const file = e.target.files[0];
    if (file) {
      await handleFileUpload(file, category);
    }
  };

  const handleFileUpload = async (file, category) => {
    if (category === "form" && !file.name.endsWith('.cvuf')) {
      setError("Form assets must be .cvuf files");
      return;
    }

    if (category === "knowledgebase" && !file.name.endsWith('.pdf')) {
      setError("Knowledge base assets must be PDF files");
      return;
    }

    if (category === "data" && !file.name.endsWith('.xlsx')) {
      setError("Data assets must be Excel (.xlsx) files");
      return;
    }

    if (category === "documentation" && !['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt'].some(ext => file.name.endsWith(ext))) {
      setError("Documentation assets must be PDF or Document files");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const uploadResult = await UploadFile({ file });

      const newAsset = {
        name: file.name,
        url: uploadResult.file_url,
        size: file.size,
        type: file.type,
        uploadDate: new Date().toISOString()
      };

      const updatedProcess = { ...process };

      if (category === "form") {
        updatedProcess.formAsset = newAsset;
      } else if (category === "knowledgebase") {
        updatedProcess.knowledgebaseAssets = updatedProcess.knowledgebaseAssets || [];
        updatedProcess.knowledgebaseAssets.push(newAsset);
      } else if (category === "data") {
        updatedProcess.dataAssets = updatedProcess.dataAssets || [];
        updatedProcess.dataAssets.push(newAsset);
      } else if (category === "documentation") {
        updatedProcess.documentationAssets = updatedProcess.documentationAssets || [];
        updatedProcess.documentationAssets.push(newAsset);
      }

      await Process.update(processId, updatedProcess);

      setSuccessMessage(`${category === "form" ? "Form" : category === "knowledgebase" ? "Knowledge base" : category === "data" ? "Data" : "Documentation"} asset uploaded successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);

      await loadProcess();
    } catch (error) {
      console.error("Error uploading file:", error);
      setError("Failed to upload file. Please try again.");
    } finally {
      setIsUploading(false);

      if (category === "form") formUploadRef.current.value = "";
      if (category === "knowledgebase") knowledgebaseUploadRef.current.value = "";
      if (category === "data") dataUploadRef.current.value = "";
      if (category === "documentation") docUploadRef.current.value = "";
    }
  };

  const handleDeleteAsset = async (category, assetIndex) => {
    if (!window.confirm("Are you sure you want to delete this asset?")) return;

    try {
      const updatedProcess = { ...process };

      if (category === "form") {
        updatedProcess.formAsset = null;
      } else if (category === "knowledgebase") {
        updatedProcess.knowledgebaseAssets.splice(assetIndex, 1);
      } else if (category === "data") {
        updatedProcess.dataAssets.splice(assetIndex, 1);
      } else if (category === "documentation") {
        updatedProcess.documentationAssets.splice(assetIndex, 1);
      }

      await Process.update(processId, updatedProcess);

      setSuccessMessage("Asset deleted successfully");
      setTimeout(() => setSuccessMessage(null), 3000);

      await loadProcess();
    } catch (error) {
      console.error("Error deleting asset:", error);
      setError("Failed to delete asset");
    }
  };

  const handleUploadDocumentation = async (files) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);

    try {
      const file = files[0];
      const uploadResult = await UploadFile({ file });
      
      await Process.update(process.id, {
        documentationAssets: [
          ...(process.documentationAssets || []),
          {
            name: file.name,
            url: uploadResult.file_url,
            size: file.size,
            type: file.type,
            uploadDate: new Date().toISOString()
          }
        ]
      });
      
      await loadProcess();
    } catch (error) {
      console.error("Error uploading documentation:", error);
      setError("Failed to upload documentation file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocumentation = async (index) => {
    if (!window.confirm("Are you sure you want to delete this documentation file?")) return;
    
    try {
      const updatedDocumentation = [...(process.documentationAssets || [])];
      updatedDocumentation.splice(index, 1);
      
      await Process.update(process.id, {
        documentationAssets: updatedDocumentation
      });
      
      await loadProcess();
    } catch (error) {
      console.error("Error deleting documentation:", error);
      setError("Failed to delete documentation file");
    }
  };

  const hasFormAsset = !!(process && process.formAsset);
  const hasKnowledgeBase = !!(process && process.knowledgebaseAssets && process.knowledgebaseAssets.length > 0);
  const hasDocumentation = !!(process && process.documentationAssets && process.documentationAssets.length > 0);
  const hasDataAssets = !!(process && process.dataAssets && process.dataAssets.length > 0);

  const renderAssetTags = () => {
    return (
      <div className="flex flex-wrap gap-2 mt-4">
        <Badge variant={hasFormAsset ? "default" : "outline"} className={hasFormAsset ? "bg-green-100 text-green-800" : ""}>
          Form {hasFormAsset ? "Ready" : "Missing"}
        </Badge>
        
        <Badge variant={hasKnowledgeBase ? "default" : "outline"} className={hasKnowledgeBase ? "bg-blue-100 text-blue-800" : ""}>
          Knowledge Base {hasKnowledgeBase ? `(${process.knowledgebaseAssets.length})` : "Missing"}
        </Badge>
        
        <Badge variant={hasDocumentation ? "default" : "outline"} className={hasDocumentation ? "bg-purple-100 text-purple-800" : ""}>
          Documentation {hasDocumentation ? `(${process.documentationAssets.length})` : "Missing"}
        </Badge>
        
        <Badge variant={hasDataAssets ? "default" : "outline"} className={hasDataAssets ? "bg-amber-100 text-amber-800" : ""}>
          Data Assets {hasDataAssets ? `(${process.dataAssets.length})` : "Missing"}
        </Badge>
      </div>
    );
  };

  if (!process && !error) {
    return (
      <div className="container mx-auto py-12 px-4 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center mb-6">
        <div>
          <Link 
            to={createPageUrl('Dashboard')}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold">{name}</h1>
          {renderAssetTags()}
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleSaveDetails} 
            disabled={!name.trim() || isSaving}
            className="gap-2"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
          <Button 
            asChild
            variant="outline" 
            className="gap-2"
          >
            <Link to={createPageUrl(`ProcessRunner?id=${processId}`)}>
              <FileUp className="h-4 w-4" />
              Run Process
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="gap-2"
          >
            <Link to={createPageUrl(`ProcessAnalytics?id=${processId}`)}>
              <BarChart className="h-4 w-4" />
              Analytics
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {successMessage && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <AlertTitle className="text-green-800">Success</AlertTitle>
          <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
        </Alert>
      )}
      
      <div className="bg-white rounded-lg shadow-md mb-6 p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div 
            className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center relative cursor-pointer"
            onClick={() => fileInputRef.current.click()}
          >
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Process logo" 
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <FileQuestion className="h-10 w-10 text-gray-400" />
            )}
            <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
              <Upload className="h-6 w-6 text-white" />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="hidden"
            />
          </div>
          
          <div className="flex-1">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Process Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter process name"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter process description"
                rows={2}
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end mt-4">
          <Button 
            onClick={handleSaveDetails}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Details
              </>
            )}
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">Process Assets</h2>
          <TabsList className="w-full border-b rounded-none justify-start">
            <TabsTrigger value="form" className="flex items-center gap-2">
              <File className="h-4 w-4" />
              Form
            </TabsTrigger>
            <TabsTrigger value="knowledgebase" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Knowledge Base
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Data
            </TabsTrigger>
            <TabsTrigger value="documentation" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documentation
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="form" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Form Asset</CardTitle>
              <CardDescription>
                Upload a .cvuf file containing the form schema. 
                This will be used when running the process.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {process?.formAsset ? (
                <div className="mb-6">
                  <AssetCard 
                    asset={process.formAsset} 
                    onDelete={() => handleDeleteAsset("form")}
                    icon={<File className="h-6 w-6" />}
                  />
                </div>
              ) : (
                <div 
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, "form")}
                >
                  <div className="flex flex-col items-center">
                    <FileUp className="h-10 w-10 text-gray-400 mb-3" />
                    <p className="text-gray-600 mb-3">
                      Drag and drop a .cvuf file here, or click to browse
                    </p>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => formUploadRef.current.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Select File
                        </>
                      )}
                    </Button>
                    <input
                      ref={formUploadRef}
                      type="file"
                      accept=".cvuf"
                      onChange={(e) => handleFileSelect(e, "form")}
                      className="hidden"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="knowledgebase" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Knowledge Base Assets</CardTitle>
              <CardDescription>
                Upload PDF files containing knowledge base information.
                These will be used to answer questions during the form conversation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {process?.knowledgebaseAssets?.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 mb-6">
                    {process.knowledgebaseAssets.map((asset, index) => (
                      <AssetCard 
                        key={index}
                        asset={asset} 
                        onDelete={() => handleDeleteAsset("knowledgebase", index)}
                        icon={<FileText className="h-6 w-6 text-red-500" />}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 italic mb-4">No knowledge base assets uploaded yet.</p>
                )}
                
                <div 
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, "knowledgebase")}
                >
                  <div className="flex flex-col items-center">
                    <FileUp className="h-10 w-10 text-gray-400 mb-3" />
                    <p className="text-gray-600 mb-3">
                      Drag and drop PDF files here, or click to browse
                    </p>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => knowledgebaseUploadRef.current.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Select File
                        </>
                      )}
                    </Button>
                    <input
                      ref={knowledgebaseUploadRef}
                      type="file"
                      accept=".pdf"
                      onChange={(e) => handleFileSelect(e, "knowledgebase")}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="data" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Data Assets</CardTitle>
              <CardDescription>
                Upload Excel (.xlsx) files containing data for this process.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {process?.dataAssets?.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 mb-6">
                    {process.dataAssets.map((asset, index) => (
                      <AssetCard 
                        key={index}
                        asset={asset} 
                        onDelete={() => handleDeleteAsset("data", index)}
                        icon={<FileSpreadsheet className="h-6 w-6 text-green-600" />}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 italic mb-4">No data assets uploaded yet.</p>
                )}
                
                <div 
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, "data")}
                >
                  <div className="flex flex-col items-center">
                    <FileUp className="h-10 w-10 text-gray-400 mb-3" />
                    <p className="text-gray-600 mb-3">
                      Drag and drop Excel (.xlsx) files here, or click to browse
                    </p>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => dataUploadRef.current.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Select File
                        </>
                      )}
                    </Button>
                    <input
                      ref={dataUploadRef}
                      type="file"
                      accept=".xlsx"
                      onChange={(e) => handleFileSelect(e, "data")}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentation" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Documentation Assets</CardTitle>
              <CardDescription>
                Upload documentation files such as PDFs, Word documents or presentations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {process?.documentationAssets?.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 mb-6">
                    {process.documentationAssets.map((asset, index) => (
                      <AssetCard 
                        key={index}
                        asset={asset} 
                        onDelete={() => handleDeleteDocumentation(index)}
                        icon={<FileText className="h-6 w-6 text-blue-600" />}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 italic mb-4">No documentation assets uploaded yet.</p>
                )}
                
                <div 
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, "documentation")}
                >
                  <div className="flex flex-col items-center">
                    <FileUp className="h-10 w-10 text-gray-400 mb-3" />
                    <p className="text-gray-600 mb-3">
                      Drag and drop documentation files here, or click to browse
                    </p>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => docUploadRef.current.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Select File
                        </>
                      )}
                    </Button>
                    <input
                      ref={docUploadRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                      onChange={(e) => handleUploadDocumentation(e.target.files)}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="mt-8 flex justify-end">
        <Button 
          asChild
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Link to={createPageUrl(`ProcessRunner?id=${processId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Run This Process
          </Link>
        </Button>
      </div>
    </div>
  );
}
