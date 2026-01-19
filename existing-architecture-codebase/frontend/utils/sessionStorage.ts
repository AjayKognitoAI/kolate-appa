/**
 * Session storage utility for managing copilot sessions in localStorage
 */

export interface StoredSession {
  session_id: string;
  user_id: string | null;
  created_at: string;
  title?: string;
  starred?: boolean; // added to match usage
}



const SESSIONS_KEY = "copilot_sessions";

/**
 * Get all stored sessions
 */
export const getStoredSessions = (): StoredSession[] => {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(SESSIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error reading sessions from localStorage:", error);
    return [];
  }
};

/**
 * Add a new session to storage
 */
export const addStoredSession = (session: StoredSession): void => {
  if (typeof window === "undefined") return;

  try {
    const sessions = getStoredSessions();
    // Check if session already exists
    const existingIndex = sessions.findIndex(s => s.session_id === session.session_id);

    if (existingIndex >= 0) {
      // Update existing session
      sessions[existingIndex] = { ...sessions[existingIndex], ...session };
    } else {
      // Add new session at the beginning
      sessions.unshift(session);
    }

    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error("Error saving session to localStorage:", error);
  }
};

/**
 * Update session title
 */
export const updateSessionTitle = (sessionId: string, title: string): void => {
  if (typeof window === "undefined") return;

  try {
    const sessions = getStoredSessions();
    const sessionIndex = sessions.findIndex(s => s.session_id === sessionId);

    if (sessionIndex >= 0) {
      sessions[sessionIndex].title = title;
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    }
  } catch (error) {
    console.error("Error updating session title:", error);
  }
};

/**
 * Toggle session starred status
 */
export const toggleSessionStarred = (sessionId: string): void => {
  if (typeof window === "undefined") return;

  try {
    const sessions = getStoredSessions();
    const sessionIndex = sessions.findIndex(s => s.session_id === sessionId);

    if (sessionIndex >= 0) {
      sessions[sessionIndex].starred = !sessions[sessionIndex].starred;
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    }
  } catch (error) {
    console.error("Error toggling session starred status:", error);
  }
};

/**
 * Remove a session from storage
 */
export const removeStoredSession = (sessionId: string): void => {
  if (typeof window === "undefined") return;

  try {
    const sessions = getStoredSessions();
    const filtered = sessions.filter(s => s.session_id !== sessionId);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error removing session from localStorage:", error);
  }
};

/**
 * Get a specific session by ID
 */
export const getStoredSession = (sessionId: string): StoredSession | null => {
  const sessions = getStoredSessions();
  return sessions.find(s => s.session_id === sessionId) || null;
};

/**
 * Clear all sessions
 */
export const clearStoredSessions = (): void => {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(SESSIONS_KEY);
  } catch (error) {
    console.error("Error clearing sessions from localStorage:", error);
  }
};
