export function sanitizeFileName(name: string): string {
    return name
        .replace(/[/\\:*?"<>|]/g, '_')  // replace illegal characters with _
        .replace(/\s+/g, '-')              // replace spaces with dashes
        .replace(/[^a-zA-Z0-9ñáéíóúüÑÁÉÍÓÚÜ._-]/g, '_') // replace other special characters with _
        .replace(/_+/g, '_')               // replace multiple _ with a single one
        .replace(/^[._-]+|[._-]+$/g, '')   // remove dots/dashes at the start/end
        .toLowerCase()
        || 'gemini-code';
}

export function getFileName(extension: string): string {
    const titleElement = document.querySelector('h2.title-text');
    const rawTitle = titleElement?.textContent?.trim() || 'gemini-code';
    const filename = sanitizeFileName(rawTitle);
    return `${filename}.${extension}`;
}

export function downloadBlob(code: string, filename: string, mimeType: string) {
    const blob = new Blob([code], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}