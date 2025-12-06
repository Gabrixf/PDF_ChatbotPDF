import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
    getActiveSession,
    getSession,
    updateSession,
    createSession,
    addSession,
    setActiveSession,
} from "../utils/sessionManager";
import { downloadAsMarkdown, downloadAsText, downloadAsJSON } from "../utils/exportConversation";

const API_BASE = "http://127.0.0.1:8001";

export default function ChatWindow({ currentPdfName, onSessionChange, activeSessionId, onRefreshSidebar }) {
    const [sessionId, setSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [typing, setTyping] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [language, setLanguage] = useState("en");
    const esRef = useRef(null);
    const bottomRef = useRef(null);

    // Initialize or restore session on mount
    useEffect(() => {
        const activeSession = getActiveSession();
        if (activeSession) {
            setSessionId(activeSession.id);
            setMessages(activeSession.messages || []);
        } else {
            const newSession = createSession(currentPdfName);
            addSession(newSession);
            setSessionId(newSession.id);
            if (onSessionChange) {
                onSessionChange(newSession.id);
            }
        }
    }, []);

    // Handle session switching from sidebar
    useEffect(() => {
        if (activeSessionId && activeSessionId !== sessionId) {
            loadSession(activeSessionId);
        }
    }, [activeSessionId]);

    const loadSession = (newSessionId) => {
        if (esRef.current) {
            esRef.current.close();
        }

        const session = getSession(newSessionId);
        if (session) {
            setSessionId(newSessionId);
            setMessages(session.messages || []);
            setTyping(false);
            setInput("");
        }
    };

    // Persist messages to session storage
    useEffect(() => {
        if (sessionId && messages.length > 0) {
            updateSession(sessionId, { messages });
            if (onRefreshSidebar) {
                onRefreshSidebar();
            }
        }
    }, [messages, sessionId]);

    // Update session name when PDF changes
    useEffect(() => {
        if (sessionId && currentPdfName) {
            updateSession(sessionId, { pdfName: currentPdfName, name: currentPdfName });
        }
    }, [currentPdfName, sessionId]);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, typing]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (esRef.current) {
                esRef.current.close();
            }
        };
    }, []);

    const send = () => {
        const text = input.trim();
        if (!text) return;

        if (esRef.current) {
            esRef.current.close();
        }

        setMessages((p) => [
            ...p,
            { sender: "user", content: text }
        ]);
        setInput("");
        setTyping(true);
        const url = new URL(`${API_BASE}/chat_stream`);
        url.searchParams.append('message', text);
        url.searchParams.append('language', language);
        if (sessionId) {
            url.searchParams.append('session_id', sessionId);
        }

        const es = new EventSource(url.toString());
        esRef.current = es;

        let isFirstChunk = true;

        es.onmessage = (ev) => {
            try {
                const data = JSON.parse(ev.data);
                if (data.type === "content") {
                    if (isFirstChunk) {
                        setTyping(false);
                        setMessages((prevMessages) => [
                            ...prevMessages,
                            { sender: "ai", content: data.content }
                        ]);
                        isFirstChunk = false;
                    } else {
                        // Append to last AI message
                        setMessages((prevMessages) => {
                            const newMessages = [...prevMessages];
                            const lastIndex = newMessages.length - 1;
                            if (newMessages[lastIndex] && newMessages[lastIndex].sender === "ai") {
                                newMessages[lastIndex] = {
                                    ...newMessages[lastIndex],
                                    content: newMessages[lastIndex].content + data.content
                                };
                            }
                            return newMessages;
                        });
                    }
                } else if (data.type === "done") {
                    setTyping(false);
                    es.close();
                } else if (data.type === "error") {
                    setTyping(false);
                    if (isFirstChunk) {
                        setMessages((prevMessages) => [
                            ...prevMessages,
                            { sender: "ai", content: `[Error] ${data.content}` }
                        ]);
                        isFirstChunk = false;
                    } else {
                        setMessages((prevMessages) => {
                            const newMessages = [...prevMessages];
                            const lastIndex = newMessages.length - 1;
                            if (newMessages[lastIndex] && newMessages[lastIndex].sender === "ai") {
                                newMessages[lastIndex] = {
                                    ...newMessages[lastIndex],
                                    content: newMessages[lastIndex].content + `\n[Error] ${data.content}`
                                };
                            }
                            return newMessages;
                        });
                    }
                    es.close();
                }
            } catch (e) {
                console.error("Parse error:", e);
                setTyping(false);
                es.close();
            }
        };

        es.onerror = (err) => {
            console.error("EventSource error:", err);
            setTyping(false);
            es.close();
        };
    };

    const reset = () => {
        setMessages([]);
        setTyping(false);
        esRef.current?.close();
        if (sessionId) {
            updateSession(sessionId, { messages: [] });
            if (onRefreshSidebar) {
                onRefreshSidebar();
            }
        }
    };

    const startNewChat = () => {
        const newSession = createSession(currentPdfName);
        addSession(newSession);
        setSessionId(newSession.id);
        setMessages([]);
        setTyping(false);
        esRef.current?.close();
        if (onSessionChange) {
            onSessionChange(newSession.id);
        }
        if (onRefreshSidebar) {
            onRefreshSidebar();
        }
    };

    const handleExport = (format) => {
        const activeSession = getActiveSession();
        if (!activeSession) return;

        switch (format) {
            case 'markdown':
                downloadAsMarkdown(activeSession);
                break;
            case 'text':
                downloadAsText(activeSession);
                break;
            case 'json':
                downloadAsJSON(activeSession);
                break;
        }
        setShowExportMenu(false);
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <div className="flex gap-2 items-center">
                    <button
                        onClick={startNewChat}
                        className="px-3 py-1.5 rounded-lg text-sm bg-blue-600 hover:bg-blue-500 transition font-medium"
                    >
                        + New Chat
                    </button>
                    {/* Language Toggle */}
                    <div className="flex items-center gap-1 border border-white/15 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setLanguage("en")}
                            className={`px-3 py-1.5 text-xs font-medium transition ${
                                language === "en"
                                    ? "bg-blue-600 text-white"
                                    : "bg-transparent text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            EN
                        </button>
                        <button
                            onClick={() => setLanguage("es")}
                            className={`px-3 py-1.5 text-xs font-medium transition ${
                                language === "es"
                                    ? "bg-blue-600 text-white"
                                    : "bg-transparent text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            ES
                        </button>
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            disabled={messages.length === 0}
                            className="px-3 py-1.5 rounded-lg text-sm border border-white/15 hover:bg-white/5 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Export
                        </button>
                        {showExportMenu && (
                            <div className="absolute right-0 mt-2 w-40 bg-slate-800 border border-white/15 rounded-lg shadow-lg overflow-hidden z-10">
                                <button
                                    onClick={() => handleExport('markdown')}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-white/5 transition"
                                >
                                    Markdown (.md)
                                </button>
                                <button
                                    onClick={() => handleExport('text')}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-white/5 transition"
                                >
                                    Text (.txt)
                                </button>
                                <button
                                    onClick={() => handleExport('json')}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-white/5 transition"
                                >
                                    JSON (.json)
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={reset}
                        className="px-3 py-1.5 rounded-lg text-sm border border-white/15 hover:bg-white/5 transition"
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="h-[480px] overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                {messages.map((m, i) => (
                    <Bubble key={`msg-${i}-${m.sender}`} sender={m.sender} text={m.content} />
                ))}
                {typing && <TypingBubble />}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex items-center gap-3">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                    placeholder="Write your question about the PDF…"
                    className="flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    onClick={send}
                    className="rounded-full px-5 py-3 bg-blue-600 hover:bg-blue-500 transition font-medium"
                >
                    Send
                </button>
            </div>
        </div>
    );
}

ChatWindow.propTypes = {
    currentPdfName: PropTypes.string,
    onSessionChange: PropTypes.func,
    activeSessionId: PropTypes.string,
    onRefreshSidebar: PropTypes.func,
};

function Bubble({ sender, text }) {
    const isUser = sender === "user";
    return (
        <div className={`flex items-start gap-2 ${isUser ? "justify-end" : ""}`}>
            {!isUser && <Avatar who="ai" />}
            <div
                className={`max-w-[80%] px-4 py-2 rounded-2xl whitespace-pre-wrap shadow ${isUser
                    ? "bg-blue-600 text-white rounded-br-md"
                    : "bg-white/10 text-slate-100 rounded-bl-md border border-white/10"
                    }`}
            >
                {text}
            </div>
            {isUser && <Avatar who="user" />}
        </div>
    );
}

Bubble.propTypes = {
    sender: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
};

function Avatar({ who }) {
    const base =
        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold";

    return who === "user" ? (
        <div className={`${base} bg-blue-600 text-white`}>You</div>
    ) : (
        <div className={`${base} bg-white/10 text-slate-200 border border-white/10`}>
            AI
        </div>
    );
}

Avatar.propTypes = {
    who: PropTypes.oneOf(["user", "ai"]).isRequired,
};

function TypingBubble() {
    return (
        <div className="flex items-start gap-2">
            <Avatar who="ai" />
            <div className="px-4 py-2 rounded-2xl bg-white/10 border border-white/10">
                <span className="inline-block animate-pulse mr-1">●</span>
                <span className="inline-block animate-pulse mr-1" style={{ animationDelay: ".15s" }}>
                    ●
                </span>
                <span className="inline-block animate-pulse" style={{ animationDelay: ".3s" }}>
                    ●
                </span>
            </div>
        </div>
    );
}