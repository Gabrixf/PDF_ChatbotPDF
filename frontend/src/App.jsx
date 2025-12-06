import { useState } from "react";
import FileUploader from "./components/FileUploader";
import ChatWindow from "./components/ChatWindow";
import ConversationSidebar from "./components/ConversationSidebar";

export default function App() {
  const [currentPdfName, setCurrentPdfName] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handlePdfUploaded = (filename) => {
    setCurrentPdfName(filename);
  };

  const handleSessionSelect = (sessionId) => {
    setActiveSessionId(sessionId);
  };

  const handleRefreshSidebar = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-black text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur bg-white/5 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
            PDF <span className="text-blue-400">Chatbot</span>
          </h1>
          <a
            href="#"
            className="rounded-lg px-3 py-1.5 border border-white/15 hover:bg-white/5 transition text-sm"
          >
            Ayuda
          </a>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Conversations Sidebar */}
          <aside className="lg:col-span-3">
            <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-5 shadow-[0_10px_30px_rgba(0,0,0,.25)] h-[calc(100vh-8rem)] sticky top-24">
              <ConversationSidebar
                currentPdfName={currentPdfName}
                onSessionSelect={handleSessionSelect}
                activeSessionId={activeSessionId}
                refreshTrigger={refreshTrigger}
              />
            </div>
          </aside>

          {/* Chat */}
          <section className="lg:col-span-6">
            <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-5 shadow-[0_10px_30px_rgba(0,0,0,.25)]">
              <h2 className="text-lg font-medium mb-4">Chat</h2>
              <ChatWindow
                currentPdfName={currentPdfName}
                onSessionChange={handleSessionSelect}
                activeSessionId={activeSessionId}
                onRefreshSidebar={handleRefreshSidebar}
              />
            </div>
          </section>

          {/* Uploader + tips */}
          <aside className="lg:col-span-3 space-y-6">
            <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-5 shadow-[0_10px_30px_rgba(0,0,0,.25)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium">Current PDF</h2>
                {currentPdfName && (
                  <button
                    onClick={() => setCurrentPdfName(null)}
                    className="px-2 py-1 text-xs border border-white/15 hover:bg-red-600/20 hover:border-red-500/50 rounded transition text-red-400"
                    title="Clear PDF"
                  >
                    Clear
                  </button>
                )}
              </div>
              {currentPdfName ? (
                <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{currentPdfName}</p>
                      <p className="text-xs text-slate-400 mt-1">Active document</p>
                    </div>
                  </div>
                </div>
              ) : null}
              <FileUploader onPdfUploaded={handlePdfUploaded} currentPdfName={currentPdfName} />
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-5">
              <h3 className="font-medium mb-2">Consejos</h3>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>• Pide un resumen por secciones.</li>
                <li>• Pregunta por definiciones clave.</li>
                <li>• Usa “resume en 5 puntos”.</li>
              </ul>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}