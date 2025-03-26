/**
 * Local session storage utility functions
 * Provides fallback storage for session data when the base44 API is unavailable
 */

/**
 * Get all sessions from local storage
 * @returns {Array} Array of session objects
 */
export const getLocalSessions = () => {
  try {
    const sessionsJson = localStorage.getItem('local_sessions');
    if (!sessionsJson) return [];
    
    const sessions = JSON.parse(sessionsJson);
    return Array.isArray(sessions) ? sessions : [];
  } catch (error) {
    console.error("Error retrieving sessions from local storage:", error);
    return [];
  }
};

/**
 * Save a session to local storage
 * @param {Object} sessionData - The session data to save
 */
export const saveLocalSession = (sessionData) => {
  try {
    if (!sessionData || !sessionData.sessionId) {
      console.error("Cannot save session without sessionId");
      return;
    }
    
    const sessions = getLocalSessions();
    
    // Check if session already exists
    const existingIndex = sessions.findIndex(s => s.sessionId === sessionData.sessionId);
    
    if (existingIndex >= 0) {
      // Update existing session
      sessions[existingIndex] = { ...sessions[existingIndex], ...sessionData };
    } else {
      // Add new session
      sessions.push(sessionData);
    }
    
    localStorage.setItem('local_sessions', JSON.stringify(sessions));
    console.log("Session saved to local storage:", sessionData);
  } catch (error) {
    console.error("Error saving session to local storage:", error);
  }
};

/**
 * Get sessions filtered by process ID
 * @param {string} processId - The process ID to filter by
 * @returns {Array} Array of filtered session objects
 */
export const getLocalSessionsByProcessId = (processId) => {
  if (!processId) return [];
  
  try {
    const sessions = getLocalSessions();
    return sessions.filter(session => session.processId === processId);
  } catch (error) {
    console.error("Error filtering sessions by process ID:", error);
    return [];
  }
};

/**
 * Update a session in local storage
 * @param {string} sessionId - The ID of the session to update
 * @param {Object} updates - The updates to apply to the session
 * @returns {boolean} Success status
 */
export const updateLocalSession = (sessionId, updates) => {
  try {
    if (!sessionId) return false;
    
    const sessions = getLocalSessions();
    const sessionIndex = sessions.findIndex(s => s.sessionId === sessionId);
    
    if (sessionIndex === -1) return false;
    
    sessions[sessionIndex] = { ...sessions[sessionIndex], ...updates };
    localStorage.setItem('local_sessions', JSON.stringify(sessions));
    
    return true;
  } catch (error) {
    console.error("Error updating session in local storage:", error);
    return false;
  }
};

/**
 * Delete a session from local storage
 * @param {string} sessionId - The ID of the session to delete
 * @returns {boolean} Success status
 */
export const deleteLocalSession = (sessionId) => {
  try {
    if (!sessionId) return false;
    
    const sessions = getLocalSessions();
    const filteredSessions = sessions.filter(s => s.sessionId !== sessionId);
    
    if (filteredSessions.length === sessions.length) return false;
    
    localStorage.setItem('local_sessions', JSON.stringify(filteredSessions));
    return true;
  } catch (error) {
    console.error("Error deleting session from local storage:", error);
    return false;
  }
};
