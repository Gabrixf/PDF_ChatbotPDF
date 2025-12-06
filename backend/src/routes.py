from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional
import PyPDF2

router = APIRouter()

# In-memory storage for extracted PDF text
pdf_text: Optional[str] = None


class PDFRequest(BaseModel):
    file_path: str


@router.get("/")
def read_root():
    """API root endpoint returning welcome message."""
    return {"message": "Welcome to the PDF Reader Chat-bot API"}


@router.post("/pdf/read")
def read_pdf(request: PDFRequest):
    """Mock endpoint for PDF reading (placeholder)."""
    file_path = request.file_path
    return {"message": f"Reading PDF at {file_path}"}


@router.post("/pdf/convert")
def convert_pdf(request: PDFRequest):
    """Mock endpoint for PDF conversion (placeholder)."""
    file_path = request.file_path
    return {"message": f"Converting PDF at {file_path}"}


@router.get("/pdf/status/{task_id}")
def get_status(task_id: str):
    """Mock endpoint for task status checking (placeholder)."""
    return {"task_id": task_id, "status": "In progress"}


@router.post("/upload_pdf/")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Upload and extract text from a PDF file.
    Stores the extracted text in memory for chat queries.
    """
    global pdf_text

    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="The file must be a PDF.")

    try:
        reader = PyPDF2.PdfReader(file.file)
        text = []
        for page in reader.pages:
            page_text = page.extract_text() or ""
            text.append(page_text)
        pdf_text = "\n".join(text)
        return {"message": "PDF uploaded and text extracted successfully.", "chars": len(pdf_text)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not read the PDF: {e}")


@router.get("/get_pdf_text/")
def get_pdf_text():
    """Retrieve currently loaded PDF text (truncated to 1000 chars for preview)."""
    if not pdf_text:
        return {"pdf_text": None, "message": "No PDF uploaded"}
    return {"pdf_text": pdf_text[:1000] + ("..." if len(pdf_text) > 1000 else "")}