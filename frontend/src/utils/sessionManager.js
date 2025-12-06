/**
 * Session Manager - handles CRUD operations for chat sessions in localStorage
 */

/** Generate unique session ID using timestamp and random string */
export function generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/** Create new chat session with optional PDF name */
export function createSession(pdfName = null) {
    return {
        id: generateSessionId(),
        name: pdfName || 'New Chat',
        messages: [],
        pdfName: pdfName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}

/** Retrieve all sessions from localStorage */
export function getAllSessions() {
    try {
        const data = localStorage.getItem('chatSessions');
        if (!data) return { sessions: [], activeSessionId: null };
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading sessions:', error);
        return { sessions: [], activeSessionId: null };
    }
}

/** Persist sessions to localStorage */
export function saveSessions(sessions, activeSessionId) {
    try {
        localStorage.setItem('chatSessions', JSON.stringify({
            sessions,
            activeSessionId,
        }));
    } catch (error) {
        console.error('Error saving sessions:', error);
    }
}

/** Get specific session by ID */
export function getSession(sessionId) {
    const { sessions } = getAllSessions();
    return sessions.find(s => s.id === sessionId);
}

/** Get currently active session */
export function getActiveSession() {
    const { sessions, activeSessionId } = getAllSessions();
    if (!activeSessionId) return null;
    return sessions.find(s => s.id === activeSessionId);
}

/** Add new session to storage */
export function addSession(session) {
    const { sessions } = getAllSessions();
    const newSessions = [...sessions, session];
    saveSessions(newSessions, session.id);
    return session;
}

/** Update existing session with new data */
export function updateSession(sessionId, updates) {
    const { sessions, activeSessionId } = getAllSessions();
    const newSessions = sessions.map(s =>
        s.id === sessionId
            ? { ...s, ...updates, updatedAt: new Date().toISOString() }
            : s
    );
    saveSessions(newSessions, activeSessionId);
}

/** Delete session and return new active session ID */
export function deleteSession(sessionId) {
    const { sessions, activeSessionId } = getAllSessions();
    const newSessions = sessions.filter(s => s.id !== sessionId);
    const newActiveId = activeSessionId === sessionId
        ? (newSessions[0]?.id || null)
        : activeSessionId;
    saveSessions(newSessions, newActiveId);
    return newActiveId;
}

/** Set active session by ID */
export function setActiveSession(sessionId) {
    const { sessions } = getAllSessions();
    saveSessions(sessions, sessionId);
}

/** Append message to specific session */
export function addMessageToSession(sessionId, message) {
    const session = getSession(sessionId);
    if (!session) return;

    const updatedMessages = [...session.messages, message];
    updateSession(sessionId, { messages: updatedMessages });
}

/** Clear all sessions (for debugging/reset) */
export function clearAllSessions() {
    localStorage.removeItem('chatSessions');
}

/** Get total number of sessions */
export function getSessionCount() {
    const { sessions } = getAllSessions();
    return sessions.length;
}
