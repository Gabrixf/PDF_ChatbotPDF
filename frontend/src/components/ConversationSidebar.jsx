import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
    getAllSessions,
    deleteSession,
    setActiveSession,
    createSession,
    addSession,
    updateSession,
} from "../utils/sessionManager";
import { downloadAsMarkdown, downloadAsText, downloadAsJSON } from "../utils/exportConversation";

export default function ConversationSidebar({ currentPdfName, onSessionSelect, activeSessionId, refreshTrigger }) {
    const [sessions, setSessions] = useState([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [showMenu, setShowMenu] = useState(null);
    const [editingSession, setEditingSession] = useState(null);
    const [editName, setEditName] = useState("");

    // Load sessions on mount, when activeSessionId changes, or when refreshTrigger changes
    useEffect(() => {
        loadSessions();
    }, [activeSessionId, refreshTrigger]);

    const loadSessions = () => {
        const { sessions: loadedSessions } = getAllSessions();
        // Sort by most recently updated
        const sorted = loadedSessions.sort((a, b) =>
            new Date(b.updatedAt) - new Date(a.updatedAt)
        );
        setSessions(sorted);
    };

    const handleSelectSession = (sessionId) => {
        setActiveSession(sessionId);
        onSessionSelect(sessionId);
    };

    const handleDeleteSession = (sessionId, e) => {
        e.stopPropagation(); // Prevent selecting the session when clicking delete
        setShowDeleteConfirm(sessionId);
    };

    const confirmDelete = (sessionId, e) => {
        e.stopPropagation();
        const newActiveId = deleteSession(sessionId);
        loadSessions();
        setShowDeleteConfirm(null);

        // If we deleted the active session, switch to the new active one
        if (sessionId === activeSessionId && newActiveId) {
            onSessionSelect(newActiveId);
        }
    };

    const cancelDelete = (e) => {
        e.stopPropagation();
        setShowDeleteConfirm(null);
    };

    const handleNewChat = () => {
        const newSession = createSession(currentPdfName);
        addSession(newSession);
        loadSessions();
        handleSelectSession(newSession.id);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getPreviewText = (messages) => {
        if (!messages || messages.length === 0) return "No messages yet";
        const lastMessage = messages[messages.length - 1];
        const preview = lastMessage.content.substring(0, 60);
        return preview.length < lastMessage.content.length ? `${preview}...` : preview;
    };

    const handleMenuToggle = (sessionId, e) => {
        e.stopPropagation();
        setShowMenu(showMenu === sessionId ? null : sessionId);
    };

    const handleRename = (session, e) => {
        e.stopPropagation();
        setEditingSession(session.id);
        setEditName(session.name);
        setShowMenu(null);
    };

    const saveRename = (sessionId, e) => {
        e.stopPropagation();
        if (editName.trim()) {
            updateSession(sessionId, { name: editName.trim() });
            loadSessions();
        }
        setEditingSession(null);
        setEditName("");
    };

    const cancelRename = (e) => {
        e.stopPropagation();
        setEditingSession(null);
        setEditName("");
    };

    const handleExportSession = (session, format, e) => {
        e.stopPropagation();
        switch (format) {
            case 'markdown':
                downloadAsMarkdown(session);
                break;
            case 'text':
                downloadAsText(session);
                break;
            case 'json':
                downloadAsJSON(session);
                break;
        }
        setShowMenu(null);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium">Conversations</h2>
                <button
                    onClick={handleNewChat}
                    className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition"
                    title="New Chat"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto space-y-2">
                {sessions.length === 0 ? (
                    <div className="text-center text-slate-400 text-sm py-8">
                        <p>No conversations yet</p>
                        <p className="mt-2">Upload a PDF and start chatting!</p>
                    </div>
                ) : (
                    sessions.map((session) => (
                        <div
                            key={session.id}
                            onClick={() => handleSelectSession(session.id)}
                            className={`relative group p-3 rounded-lg border transition cursor-pointer ${
                                session.id === activeSessionId
                                    ? "bg-blue-600/20 border-blue-500/50"
                                    : "bg-white/5 border-white/10 hover:bg-white/10"
                            }`}
                        >
                            {/* Session Name */}
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    {editingSession === session.id ? (
                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveRename(session.id, e);
                                                    if (e.key === 'Escape') cancelRename(e);
                                                }}
                                                className="flex-1 px-2 py-1 text-sm bg-white/10 border border-white/20 rounded focus:outline-none focus:border-blue-500"
                                                autoFocus
                                            />
                                            <button
                                                onClick={(e) => saveRename(session.id, e)}
                                                className="p-1 hover:bg-green-600/20 rounded"
                                                title="Save"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={cancelRename}
                                                className="p-1 hover:bg-red-600/20 rounded"
                                                title="Cancel"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <h3 className="text-sm font-medium truncate">
                                                {session.name || "Untitled Chat"}
                                            </h3>
                                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                                                {getPreviewText(session.messages)}
                                            </p>
                                        </>
                                    )}
                                </div>

                                {/* Menu Button */}
                                <div className="relative">
                                    <button
                                        onClick={(e) => handleMenuToggle(session.id, e)}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition"
                                        title="Options"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                        </svg>
                                    </button>

                                    {/* Dropdown Menu */}
                                    {showMenu === session.id && (
                                        <div
                                            className="absolute right-0 mt-1 w-40 bg-slate-800 border border-white/15 rounded-lg shadow-lg overflow-hidden z-20"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button
                                                onClick={(e) => handleRename(session, e)}
                                                className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 transition flex items-center gap-2"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                </svg>
                                                Rename
                                            </button>
                                            <div className="border-t border-white/10" />
                                            <button
                                                onClick={(e) => handleExportSession(session, 'markdown', e)}
                                                className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 transition"
                                            >
                                                Export as Markdown
                                            </button>
                                            <button
                                                onClick={(e) => handleExportSession(session, 'text', e)}
                                                className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 transition"
                                            >
                                                Export as Text
                                            </button>
                                            <button
                                                onClick={(e) => handleExportSession(session, 'json', e)}
                                                className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 transition"
                                            >
                                                Export as JSON
                                            </button>
                                            <div className="border-t border-white/10" />
                                            <button
                                                onClick={(e) => { handleDeleteSession(session.id, e); setShowMenu(null); }}
                                                className="w-full px-3 py-2 text-left text-sm hover:bg-red-600/20 text-red-400 transition flex items-center gap-2"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                                Delete
                                            </button>
                                        </div>
                                    )}

                                    {/* Delete Confirmation */}
                                    {showDeleteConfirm === session.id && (
                                        <div className="absolute right-0 mt-1 p-3 bg-slate-800 border border-red-500/50 rounded-lg shadow-lg z-20 min-w-[200px]">
                                            <p className="text-sm mb-2">Delete this conversation?</p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={(e) => confirmDelete(session.id, e)}
                                                    className="flex-1 px-2 py-1 text-xs bg-red-600 hover:bg-red-500 rounded transition"
                                                >
                                                    Delete
                                                </button>
                                                <button
                                                    onClick={cancelDelete}
                                                    className="flex-1 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded transition"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Metadata */}
                            {editingSession !== session.id && (
                                <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                                    <span>{session.messages?.length || 0} messages</span>
                                    <span>•</span>
                                    <span>{formatDate(session.updatedAt)}</span>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Footer Stats */}
            {sessions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10 text-xs text-slate-400 text-center">
                    {sessions.length} conversation{sessions.length !== 1 ? 's' : ''} saved
                </div>
            )}
        </div>
    );
}

ConversationSidebar.propTypes = {
    currentPdfName: PropTypes.string,
    onSessionSelect: PropTypes.func.isRequired,
    activeSessionId: PropTypes.string,
    refreshTrigger: PropTypes.number,
};
