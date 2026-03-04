/**
 * Client-side PDF text extraction using PDF.js (pdfjs-dist).
 * Runs entirely in the browser — no server-side parsing needed.
 * This bypasses all serverless function timeouts and bundling issues.
 */

let workerConfigured = false

async function ensureWorker() {
    if (workerConfigured) return
    const pdfjsLib = await import('pdfjs-dist')
    // Use the CDN worker — avoids Vite bundling complexity for the worker binary
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
    workerConfigured = true
}

/**
 * Extracts all text content from a PDF File object.
 * Returns the full text or empty string if extraction fails.
 */
export async function extractPdfText(file: File): Promise<string> {
    await ensureWorker()
    const { getDocument } = await import('pdfjs-dist')

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await getDocument({ data: arrayBuffer }).promise

    const pageTexts: string[] = []
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((item: any) => item.str ?? '')
            .join(' ')
        pageTexts.push(pageText)
    }

    return pageTexts.join('\n').trim()
}
