import React, { useState, useEffect } from 'react';
import { Process } from '@/api/entities';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProcessCard from '@/components/processes/ProcessCard';
import CreateProcessModal from '@/components/processes/CreateProcessModal';

export default function Dashboard() {
  const [processes, setProcesses] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProcesses();
  }, []);

  const loadProcesses = async () => {
    try {
      const processList = await Process.list();
      setProcesses(processList);
    } catch (error) {
      console.error('Error loading processes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProcess = async (processData) => {
    try {
      await Process.create({
        ...processData,
        createdDate: new Date().toISOString(),
      });
      setShowCreateModal(false);
      loadProcesses();
    } catch (error) {
      console.error('Error creating process:', error);
    }
  };

  const handleDeleteProcess = async (processId) => {
    if (!window.confirm('Are you sure you want to delete this process?')) return;

    try {
      await Process.delete(processId);
      loadProcesses();
    } catch (error) {
      console.error('Error deleting process:', error);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Digital Processes</h1>
          <p className="text-gray-600 mt-1">
            Manage and run your digital processes
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-4">
          <div className="flex items-center gap-2">
            <Button 
              variant="default"
              onClick={() => window.open('/', '_self')}
            >
              Processes
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.open('/Analytics', '_self')}
            >
              Analytics
            </Button>
          </div>

          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Process
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading processes...</p>
        </div>
      ) : processes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <div className="mb-4">
            <Plus className="h-12 w-12 text-gray-400 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No processes yet
          </h3>
          <p className="text-gray-600 mb-4">
            Create your first digital process to get started
          </p>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Process
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {processes.map((process) => (
            <ProcessCard
              key={process.id}
              process={process}
              onDelete={handleDeleteProcess}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateProcessModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateProcess}
        />
      )}
    </div>
  );
}