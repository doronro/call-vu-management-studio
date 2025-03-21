import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { Building2, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Layout({ children, currentPageName }) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const location = useLocation();
  
  // Don't show navigation on certain pages
  const isFormChat = location.pathname.includes('/FormChat');
  const isProcessRunner = location.pathname.includes('/ProcessRunner');
  
  if (isFormChat || isProcessRunner) {
    return <>{children}</>;
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b py-3 px-4 sticky top-0 z-10">
        <div className="container mx-auto flex justify-between items-center">
          <Link to={createPageUrl('Dashboard')} className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-600" />
            <span className="font-bold text-xl">Digital Processes Portal</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-4">
            <Tabs defaultValue={currentPageName === 'Analytics' ? 'analytics' : 'processes'} className="w-full">
              <TabsList>
                <TabsTrigger value="processes" asChild>
                  <Link to={createPageUrl('Dashboard')}>Processes</Link>
                </TabsTrigger>
                <TabsTrigger value="analytics" asChild>
                  <Link to={createPageUrl('Analytics')}>Analytics</Link>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </header>
      
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-white z-20 pt-16">
          <div className="px-4 py-2">
            <Button asChild variant="ghost" className="w-full justify-start" onClick={() => setIsMenuOpen(false)}>
              <Link to={createPageUrl('Dashboard')}>Processes</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full justify-start" onClick={() => setIsMenuOpen(false)}>
              <Link to={createPageUrl('Analytics')}>Analytics</Link>
            </Button>
          </div>
        </div>
      )}
      
      <main className="flex-1">
        {children}
      </main>
      
      <footer className="bg-white border-t py-6 px-4">
        <div className="container mx-auto text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} Digital Processes Portal. All rights reserved.
        </div>
      </footer>
    </div>
  );
}