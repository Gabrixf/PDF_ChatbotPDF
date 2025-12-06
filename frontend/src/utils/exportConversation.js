/**
 * Export conversation as Markdown
 * @param {Object} session - Session object with messages and metadata
 * @returns {string} Markdown formatted conversation
 */
export function exportAsMarkdown(session) {
    const { name, messages, pdfName, createdAt } = session;

    const date = new Date(createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    let markdown = `# Chat with ${pdfName || name}\n\n`;
    markdown += `**Date:** ${date}\n`;
    markdown += `**Messages:** ${messages.length}\n\n`;
    markdown += `---\n\n`;

    messages.forEach((msg, index) => {
        const sender = msg.sender === 'user' ? 'You' : 'AI';
        markdown += `**${sender}:** ${msg.content}\n\n`;
    });

    markdown += `---\n\n`;
    markdown += `*Exported from PDF Chatbot*\n`;

    return markdown;
}

/**
 * Export conversation as plain text
 * @param {Object} session - Session object with messages and metadata
 * @returns {string} Plain text formatted conversation
 */
export function exportAsText(session) {
    const { name, messages, pdfName, createdAt } = session;

    const date = new Date(createdAt).toLocaleString();

    let text = `Chat with ${pdfName || name}\n`;
    text += `Date: ${date}\n`;
    text += `Messages: ${messages.length}\n\n`;
    text += `${'='.repeat(50)}\n\n`;

    messages.forEach((msg, index) => {
        const sender = msg.sender === 'user' ? 'You' : 'AI';
        text += `[${sender}]\n${msg.content}\n\n`;
    });

    text += `${'='.repeat(50)}\n`;
    text += `Exported from PDF Chatbot\n`;

    return text;
}

/**
 * Export conversation as JSON
 * @param {Object} session - Session object to export
 * @returns {string} JSON formatted string
 */
export function exportAsJSON(session) {
    return JSON.stringify(session, null, 2);
}

/**
 * Trigger browser download for file content
 * @param {string} content - File content
 * @param {string} filename - Output filename
 * @param {string} mimeType - MIME type (e.g., 'text/plain')
 */
export function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/** Export and download conversation as Markdown */
export function downloadAsMarkdown(session) {
    const markdown = exportAsMarkdown(session);
    const filename = `${sanitizeFilename(session.pdfName || session.name)}_chat.md`;
    downloadFile(markdown, filename, 'text/markdown');
}

/** Export and download conversation as plain text */
export function downloadAsText(session) {
    const text = exportAsText(session);
    const filename = `${sanitizeFilename(session.pdfName || session.name)}_chat.txt`;
    downloadFile(text, filename, 'text/plain');
}

/** Export and download conversation as JSON */
export function downloadAsJSON(session) {
    const json = exportAsJSON(session);
    const filename = `${sanitizeFilename(session.pdfName || session.name)}_chat.json`;
    downloadFile(json, filename, 'application/json');
}

/**
 * Sanitize filename by removing invalid characters
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename safe for download
 */
function sanitizeFilename(filename) {
    return filename
        .replace(/[^a-z0-9_\-\.]/gi, '_')
        .replace(/_{2,}/g, '_')
        .substring(0, 100);
}
