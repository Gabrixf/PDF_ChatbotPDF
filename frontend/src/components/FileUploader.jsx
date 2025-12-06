import { useState } from "react";
import axios from "axios";
import PropTypes from "prop-types";

const API_BASE = "http://127.0.0.1:8001";

export default function FileUploader({ onUploadSuccess = () => {}, onPdfUploaded = () => {}, currentPdfName = null }) {
    const [file, setFile] = useState(null);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState("");

    const onDrop = (e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f && f.type === "application/pdf") setFile(f);
    };

    const upload = async () => {
        if (!file) return setMsg("Select a PDF first.");
        setBusy(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            await axios.post(`${API_BASE}/upload_pdf/`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setMsg("PDF uploaded successfully ✅");
            onUploadSuccess();
            onPdfUploaded(file.name);
        } catch {
            setMsg("Error uploading PDF ❌");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-4">
            <div
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                className="rounded-xl border-2 border-dashed border-white/15 bg-white/5 p-6 text-center"
            >
                <p className="mb-3 text-slate-300">Drag your file here or</p>
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition cursor-pointer">
                    <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                    📄 Select PDF
                </label>
                {file && (
                    <p className="mt-3 text-sm text-slate-300">
                        Selected: <span className="font-medium">{file.name}</span>
                    </p>
                )}
            </div>

            <button
                onClick={upload}
                disabled={busy || !file}
                className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-white/20 disabled:text-slate-400 transition py-2 font-medium"
            >
                {busy ? "Uploading…" : "Upload PDF"}
            </button>

            {msg && <p className="text-sm text-slate-300">{msg}</p>}
        </div>
    );
}

FileUploader.propTypes = {
    onUploadSuccess: PropTypes.func,
    onPdfUploaded: PropTypes.func,
    currentPdfName: PropTypes.string,
};