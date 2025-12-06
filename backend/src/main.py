from fastapi import HTTPException
from openai import AuthenticationError, RateLimitError
from fastapi import FastAPI, UploadFile, File, HTTPException
from sse_starlette.sse import EventSourceResponse
import PyPDF2
from typing import Optional
import os
from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel
import asyncio
import json
from fastapi.middleware.cors import CORSMiddleware

# Initialize FastAPI application
app = FastAPI()

# Global state for PDF text and conversation sessions
pdf_text: Optional[str] = None
sessions_history = {}  # {session_id: [{"role": "user/assistant", "content": "..."}]}

# Configure CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)



@app.post("/upload_pdf/")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload a PDF file and extract its text content."""
    global pdf_text
    if file.content_type != "application/pdf":
        return {"error": "The file must be a PDF."}

    pdf_text = await read_pdf(file)
    return {"message": "PDF uploaded and text extracted successfully."}


async def read_pdf(file: UploadFile) -> str:
    """Extract text from all pages of a PDF file."""
    reader = PyPDF2.PdfReader(file.file)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text


@app.get("/get_pdf_text/")
def get_pdf_text():
    """Retrieve the currently loaded PDF text."""
    return {"pdf_text": pdf_text}



class Message(BaseModel):
    user_message: str

conversation_history = []


@app.post("/chat")
async def chat(message: Message):
    """
    Non-streaming chat endpoint that answers questions based on PDF content.
    Maintains conversation history for context.
    """
    try:
        if not pdf_text:
            raise HTTPException(status_code=400, detail="You must upload a PDF before chatting.")

        prompt = message.user_message
        full_prompt = f"PDF Context:\n{pdf_text}\n\nUser Question: {prompt}"

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are an assistant that responds solely based on the content of the uploaded PDF."},
                {"role": "user", "content": full_prompt}
            ]
        )

        result = response.choices[0].message.content
        conversation_history.append({"user": prompt, "ai": result})

        return {"response": result, "history": conversation_history}

    except AuthenticationError:
        raise HTTPException(status_code=401, detail="Your API Key is invalid or unauthorized.")
    except RateLimitError:
        raise HTTPException(status_code=429, detail="Usage limit exceeded. Please try again in a few minutes.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error querying the model: {str(e)}")
    


@app.get("/chat_stream")
async def chat_stream(message: str, session_id: Optional[str] = None, language: str = "en"):
    """
    Server-Sent Events (SSE) streaming endpoint for real-time chat responses.
    Supports session-based conversation history and multi-language responses.
    """
    async def event_generator():
        try:
            print(f"DEBUG: Starting event_generator for message: {message}, session: {session_id}, language: {language}")
            print(f"DEBUG: pdf_text exists: {pdf_text is not None}")

            if not pdf_text:
                print("DEBUG: No PDF text, sending friendly message")
                if language == "es":
                    error_msg = "¡Hola! Estoy aquí para ayudarte con cualquier pregunta sobre PDFs. ¡Por favor sube un PDF para comenzar! 📄"
                else:
                    error_msg = "Hi! I'm here to help with any PDF questions you may have. Please upload a PDF to get started! 📄"
                yield {"data": json.dumps({"type": "error", "content": error_msg})}
                return

            # Initialize session history if needed
            if session_id not in sessions_history:
                sessions_history[session_id] = []

            # Retrieve last 10 messages for context (token limit consideration)
            conversation_history = sessions_history[session_id][-10:] if session_id else []

            # Build system message with language preference
            if language == "es":
                system_content = f"Eres un asistente que responde con base en el contenido del PDF cargado. IMPORTANTE: Responde siempre en español. Contexto del PDF:\n{pdf_text}"
            else:
                system_content = f"You are an assistant that answers based on the content of the uploaded PDF. IMPORTANT: Always respond in English. PDF Context:\n{pdf_text}"

            # Construct messages array for OpenAI API
            messages = [
                {"role": "system", "content": system_content}
            ]
            messages.extend(conversation_history)
            messages.append({"role": "user", "content": message})

            print("DEBUG: About to create stream with context")

            try:
                stream = client.chat.completions.create(
                    model="gpt-4o",
                    messages=messages,
                    stream=True
                )
                print(f"DEBUG: Stream created: {stream}")
            except AuthenticationError:
                yield {"data": json.dumps({"type": "error", "content": "Invalid or unauthorized API Key."})}
                return

            except RateLimitError:
                yield {"data": json.dumps({"type": "error", "content": "Usage limit exceeded. Please try again later."})}
                return

            except Exception as e:
                yield {"data": json.dumps({"type": "error", "content": f"Error starting streaming: {str(e)}"})}
                return

            print("DEBUG: Entering stream context")

            full_ai_response = ""

            with stream:
                print("DEBUG: Inside stream context, starting loop")
                chunk_count = 0
                for chunk in stream:
                    chunk_count += 1
                    print(f"DEBUG: Chunk #{chunk_count}, type: {type(chunk)}")
                    print(f"DEBUG: Chunk content: {chunk}")

                    # Process streaming chunks from OpenAI
                    if hasattr(chunk, 'choices') and len(chunk.choices) > 0:
                        delta = chunk.choices[0].delta
                        print(f"DEBUG: Delta: {delta}")
                        if hasattr(delta, 'content') and delta.content:
                            content = delta.content
                            full_ai_response += content
                            print(f"DEBUG: Sending content: {content}")
                            yield {"data": json.dumps({"type": "content", "content": content})}

                    await asyncio.sleep(0.05)

                print(f"DEBUG: Loop finished, processed {chunk_count} chunks")

            # Persist conversation to session history
            if session_id:
                sessions_history[session_id].append({"role": "user", "content": message})
                sessions_history[session_id].append({"role": "assistant", "content": full_ai_response})
                print(f"DEBUG: Saved conversation to session {session_id}")

            print("DEBUG: Sending done event")
            yield {"data": json.dumps({"type": "done"})}

        except Exception as e:
            yield {"data": json.dumps({"type": "error", "content": f"Unexpected error: {str(e)}"})}

    return EventSourceResponse(event_generator())


@app.get("/health")
def health_check():
    """Health check endpoint for monitoring service availability."""
    return {"status": "healthy"}