import React, { useMemo } from 'react';

/**
 * REGLA AL-E: El usuario NUNCA ve JSON
 * El chat SOLO muestra texto conversacional
 */
export function renderMarkdown(content) {
  if (!content) return null;
  
  // ❌ PROTECCIÓN CRÍTICA 1: Si se pasa un objeto, extraer "answer"
  if (typeof content === 'object' && content !== null) {
    console.error('❌ CRÍTICO: Se intentó renderizar JSON en el chat:', content);
    
    // Intentar extraer respuesta legible
    const answer = content.answer || 
                   content.message || 
                   content.text ||
                   content.content ||
                   content.reply;
    
    if (answer && typeof answer === 'string') {
      console.warn('✅ Extrayendo texto del objeto (ESTO NO DEBERÍA PASAR):', answer);
      return <div className="whitespace-pre-wrap">{answer}</div>;
    }
    
    // Si no se puede extraer, mostrar error profesional
    console.error('❌ No se pudo extraer texto del objeto. Keys:', Object.keys(content));
    return (
      <div className="whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>
        [Error: respuesta inválida]
      </div>
    );
  }
  
  // ❌ PROTECCIÓN CRÍTICA 2: Si el string parece JSON, intentar parsearlo
  if (typeof content === 'string' && content.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(content);
      console.error('❌ CRÍTICO: String JSON detectado en el chat:', parsed);
      
      const answer = parsed.answer || 
                     parsed.message || 
                     parsed.text ||
                     parsed.content ||
                     parsed.reply;
      
      if (answer && typeof answer === 'string') {
        console.warn('✅ Extrayendo texto del JSON parseado:', answer);
        return <div className="whitespace-pre-wrap">{answer}</div>;
      }
    } catch (e) {
      // No es JSON válido, renderizar como texto normal
    }
  }
  
  // ✅ Caso normal: renderizar texto conversacional
  return <div className="whitespace-pre-wrap">{content}</div>;
}

export default function MarkdownRenderer({ content }) {
  const rendered = useMemo(() => renderMarkdown(content), [content]);
  return <div className="markdown-content">{rendered}</div>;
}
