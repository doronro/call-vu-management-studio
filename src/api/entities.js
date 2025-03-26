import { base44 } from './base44Client';
import { getLocalSessions, saveLocalSession, getLocalSessionsByProcessId } from './localSessionStorage';

// Original entities from base44
export const FormContext = base44.entities.FormContext;
export const FormSchema = base44.entities.FormSchema;
export const FormSession = base44.entities.FormSession;
export const Process = base44.entities.Process;

// Enhanced Session entity with local storage fallback
export const Session = {
  ...base44.entities.Session,
  
  // Override list method to include local storage data
  list: async () => {
    try {
      // Try to get sessions from base44
      const remoteSessions = await base44.entities.Session.list();
      console.log("Remote sessions retrieved:", remoteSessions);
      
      // Get sessions from local storage
      const localSessions = getLocalSessions();
      console.log("Local sessions retrieved:", localSessions);
      
      // Combine remote and local sessions
      const combinedSessions = [...remoteSessions, ...localSessions];
      console.log("Combined sessions:", combinedSessions);
      
      return combinedSessions;
    } catch (error) {
      console.error("Error in Session.list, falling back to local storage:", error);
      // Fallback to local storage only
      return getLocalSessions();
    }
  },
  
  // Override filter method to include local storage data
  filter: async (criteria) => {
    try {
      // Try to get filtered sessions from base44
      const remoteFilteredSessions = await base44.entities.Session.filter(criteria);
      console.log("Remote filtered sessions:", remoteFilteredSessions);
      
      // Get sessions from local storage and filter them
      const localSessions = getLocalSessions();
      const localFilteredSessions = localSessions.filter(session => {
        // Match all criteria properties
        return Object.keys(criteria).every(key => 
          session[key] === criteria[key]
        );
      });
      console.log("Local filtered sessions:", localFilteredSessions);
      
      // Combine remote and local filtered sessions
      const combinedFilteredSessions = [...remoteFilteredSessions, ...localFilteredSessions];
      console.log("Combined filtered sessions:", combinedFilteredSessions);
      
      return combinedFilteredSessions;
    } catch (error) {
      console.error("Error in Session.filter, falling back to local storage:", error);
      
      // Fallback to local storage only
      const localSessions = getLocalSessions();
      return localSessions.filter(session => {
        // Match all criteria properties
        return Object.keys(criteria).every(key => 
          session[key] === criteria[key]
        );
      });
    }
  },
  
  // Override create method to save to local storage
  create: async (sessionData) => {
    try {
      // Try to create session in base44
      const result = await base44.entities.Session.create(sessionData);
      console.log("Session created in remote storage:", result);
      
      // Also save to local storage as backup
      saveLocalSession(sessionData);
      
      return result;
    } catch (error) {
      console.error("Error in Session.create, saving to local storage only:", error);
      
      // Fallback to local storage only
      saveLocalSession(sessionData);
      return sessionData;
    }
  },
  
  // Override update method to update local storage
  update: async (sessionId, updates) => {
    try {
      // Try to update session in base44
      const result = await base44.entities.Session.update(sessionId, updates);
      console.log("Session updated in remote storage:", result);
      
      // Also update in local storage
      const localSessions = getLocalSessions();
      const updatedLocalSessions = localSessions.map(session => 
        session.sessionId === sessionId ? { ...session, ...updates } : session
      );
      localStorage.setItem('local_sessions', JSON.stringify(updatedLocalSessions));
      
      return result;
    } catch (error) {
      console.error("Error in Session.update, updating local storage only:", error);
      
      // Fallback to local storage only
      const localSessions = getLocalSessions();
      const updatedLocalSessions = localSessions.map(session => 
        session.sessionId === sessionId ? { ...session, ...updates } : session
      );
      localStorage.setItem('local_sessions', JSON.stringify(updatedLocalSessions));
      
      return { ...updates, sessionId };
    }
  }
};

// auth sdk:
