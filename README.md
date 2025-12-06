# PDF Chatbot

A full-stack application for conversing with PDF documents using OpenAI's GPT-4o. Upload PDFs and ask questions about their content through an intuitive chat interface.

## Features

- PDF upload and text extraction
- Real-time streaming chat responses
- Multi-session conversation management
- Bilingual support (English/Spanish)
- Export conversations (Markdown, Text, JSON)
- Session persistence via localStorage

## Requirements

- Node.js 18+
- Python 3.9+
- OpenAI API key

## Installation

### Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
echo "OPENAI_API_KEY=your_key_here" > .env
```

### Frontend

```bash
cd frontend
npm install
```

## Running

Start both servers in separate terminals:

```bash
# Backend (port 8001)
cd backend
uvicorn src.main:app --reload --host 127.0.0.1 --port 8001

# Frontend (port 5173)
cd frontend
npm run dev
```

Access the application at `http://localhost:5173`

## Architecture

### Backend (FastAPI)
- **main.py** - API endpoints, SSE streaming, session management
- **routes.py** - Additional route handlers (placeholder endpoints)

Key endpoints:
- `POST /upload_pdf/` - Upload and extract PDF text
- `GET /chat_stream` - SSE streaming chat with session support
- `POST /chat` - Non-streaming chat endpoint
- `GET /health` - Health check

### Frontend (React + Vite)
- **App.jsx** - Main application shell
- **ChatWindow.jsx** - Chat interface with SSE handling
- **FileUploader.jsx** - PDF upload component
- **ConversationSidebar.jsx** - Session list and management

Utilities:
- **sessionManager.js** - CRUD operations for chat sessions
- **exportConversation.js** - Export to multiple formats
- **useLocalStorage.js** - React hook for localStorage sync

### Data Flow

1. User uploads PDF → Backend extracts text → Stored in memory
2. User sends message → Frontend establishes SSE connection
3. Backend streams GPT-4o response → Frontend displays in real-time
4. Conversation saved to localStorage → Persists across sessions

### Session Structure

```javascript
{
  id: "session_1234567890_abc123",
  name: "document.pdf",
  messages: [
    { sender: "user", content: "..." },
    { sender: "ai", content: "..." }
  ],
  pdfName: "document.pdf",
  createdAt: "2025-01-07T10:30:00.000Z",
  updatedAt: "2025-01-07T10:35:00.000Z"
}
```

## Configuration

### AI Model
Edit `backend/src/main.py` (lines 95, 162):
```python
model="gpt-4o"  # Options: gpt-4o, gpt-4-turbo, gpt-3.5-turbo
```

### CORS
Edit `backend/src/main.py` (line 25):
```python
allow_origins=["http://localhost:5173", ...]
```

## Project Structure

```
Chat-bot-PDF-Readerv2/
├── backend/
│   ├── src/
│   │   ├── main.py
│   │   └── routes.py
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── App.jsx
│   │   │   ├── ChatWindow.jsx
│   │   │   ├── FileUploader.jsx
│   │   │   └── ConversationSidebar.jsx
│   │   ├── hooks/
│   │   │   └── useLocalStorage.js
│   │   ├── utils/
│   │   │   ├── sessionManager.js
│   │   │   └── exportConversation.js
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Troubleshooting

**"API Key invalid"**
- Verify `.env` file contains valid OpenAI API key
- Check key format starts with `sk-`

**"PDF upload fails"**
- Ensure file is valid PDF format
- Check backend console for detailed errors

**"Messages not saving"**
- Check browser localStorage isn't full
- Clear localStorage: `localStorage.clear()`

## License

MIT
