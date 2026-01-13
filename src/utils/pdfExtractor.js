/**
 * pdfExtractor.js
 * Extrae texto de archivos PDF usando pdf.js
 * Para que AL-E pueda leer PDFs en el chat
 */

import * as pdfjsLib from 'pdfjs-dist';

// Configurar worker de pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Extrae texto completo de un archivo PDF
 * @param {File} file - Archivo PDF
 * @returns {Promise<string>} Texto extraído
 */
export async function extractPdfText(file) {
  try {
    console.log('[PDF] 📄 Extrayendo texto de:', file.name);
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    
    console.log('[PDF] 📖 Total de páginas:', pdf.numPages);
    
    let fullText = '';
    
    // Extraer texto de todas las páginas
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item) => item.str)
        .join(' ');
      
      fullText += `\n--- Página ${pageNum} ---\n${pageText}\n`;
      
      console.log(`[PDF] ✅ Página ${pageNum}/${pdf.numPages} extraída (${pageText.length} caracteres)`);
    }
    
    console.log('[PDF] ✅ Extracción completa:', fullText.length, 'caracteres totales');
    return fullText.trim();
    
  } catch (error) {
    console.error('[PDF] ❌ Error extrayendo texto:', error);
    throw new Error(`No se pudo leer el PDF: ${error.message}`);
  }
}

/**
 * Extrae texto de archivo de texto plano
 * @param {File} file - Archivo de texto
 * @returns {Promise<string>} Texto extraído
 */
export async function extractTextFile(file) {
  try {
    console.log('[TEXT] 📝 Leyendo archivo de texto:', file.name);
    const text = await file.text();
    console.log('[TEXT] ✅ Leído:', text.length, 'caracteres');
    return text;
  } catch (error) {
    console.error('[TEXT] ❌ Error leyendo archivo:', error);
    throw new Error(`No se pudo leer el archivo de texto: ${error.message}`);
  }
}

/**
 * Procesa cualquier tipo de archivo adjunto
 * @param {File} file - Archivo a procesar
 * @returns {Promise<string>} Texto formateado para incluir en el mensaje
 */
export async function processAttachment(file) {
  const fileType = file.type;
  const fileName = file.name;
  const fileSize = (file.size / 1024).toFixed(2); // KB
  
  console.log('[ATTACHMENT] 📎 Procesando:', fileName, `(${fileSize} KB)`);
  
  try {
    // PDF
    if (fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
      const text = await extractPdfText(file);
      return `[DOCUMENTO PDF: ${fileName} (${fileSize} KB)]\n\n${text}`;
    }
    
    // Texto plano
    if (
      fileType.startsWith('text/') || 
      fileName.match(/\.(txt|md|csv|json|log)$/i)
    ) {
      const text = await extractTextFile(file);
      return `[ARCHIVO DE TEXTO: ${fileName} (${fileSize} KB)]\n\n${text}`;
    }
    
    // Código fuente
    if (fileName.match(/\.(js|jsx|ts|tsx|py|java|cpp|c|html|css|sql|sh)$/i)) {
      const text = await extractTextFile(file);
      return `[CÓDIGO FUENTE: ${fileName} (${fileSize} KB)]\n\n\`\`\`\n${text}\n\`\`\``;
    }
    
    // Imágenes (placeholder - requiere OCR en backend)
    if (fileType.startsWith('image/')) {
      return `[IMAGEN: ${fileName} (${fileSize} KB)]\n(Nota: Para análisis de imágenes, usar endpoint /api/files/ingest en Core)`;
    }
    
    // Otros formatos
    return `[ARCHIVO: ${fileName}]\nTipo: ${fileType}\nTamaño: ${fileSize} KB\n(Formato no soportado para extracción automática de texto)`;
    
  } catch (error) {
    console.error('[ATTACHMENT] ❌ Error procesando archivo:', error);
    return `[ERROR procesando ${fileName}: ${error.message}]`;
  }
}

/**
 * Valida si un archivo es procesable
 * @param {File} file - Archivo a validar
 * @returns {Object} { valid: boolean, message: string }
 */
export function validateFile(file) {
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (file.size > maxSize) {
    return {
      valid: false,
      message: `Archivo demasiado grande (${(file.size / 1024 / 1024).toFixed(2)} MB). Máximo: 10MB`,
    };
  }
  
  const supportedExtensions = /\.(pdf|txt|md|csv|json|log|js|jsx|ts|tsx|py|java|cpp|c|html|css|sql|sh|png|jpg|jpeg)$/i;
  
  if (!supportedExtensions.test(file.name)) {
    return {
      valid: false,
      message: `Formato no soportado: ${file.name}`,
    };
  }
  
  return { valid: true, message: 'OK' };
}
