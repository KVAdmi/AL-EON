/**
 * ImageGenerator - Componente para generar imágenes
 * 
 * CARACTERÍSTICAS:
 * - Comando /image o botón
 * - Generación con DALL-E
 * - Preview inline como artifact
 * - Descarga
 */

import React, { useState } from 'react';
import { Image as ImageIcon, Download, Loader2, AlertCircle } from 'lucide-react';
import { generateImage } from '@/services/imagesService';

export default function ImageGenerator({ sessionId, onImageGenerated }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerateImage = async (prompt) => {
    if (!prompt || !prompt.trim()) {
      setError('Necesitas escribir una descripción para la imagen');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateImage({
        prompt: prompt.trim(),
        size: '1024x1024',
        sessionId
      });

      onImageGenerated?.(result);
    } catch (err) {
      console.error('❌ Error generando imagen:', err);
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    isGenerating,
    error,
    generateImage: handleGenerateImage
  };
}

/**
 * ImageArtifact - Renderiza imagen generada como artifact
 */
export function ImageArtifact({ imageUrl, prompt, onDownload }) {
  const [isLoading, setIsLoading] = useState(true);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `al-eon-${Date.now()}.png`;
    link.click();
    onDownload?.();
  };

  return (
    <div className="max-w-2xl rounded-lg border border-gray-700 bg-gray-800/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <ImageIcon size={18} className="text-purple-400" />
          <span className="text-sm font-medium text-gray-300">Imagen Generada</span>
        </div>
        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm transition-colors"
        >
          <Download size={16} />
          <span>Descargar</span>
        </button>
      </div>

      {/* Imagen */}
      <div className="relative bg-gray-900">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 size={32} className="animate-spin text-purple-400" />
          </div>
        )}
        <img
          src={imageUrl}
          alt={prompt || 'Imagen generada'}
          className="w-full h-auto"
          onLoad={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
        />
      </div>

      {/* Footer con prompt */}
      {prompt && (
        <div className="px-4 py-3 border-t border-gray-700">
          <p className="text-xs text-gray-400 italic">
            "{prompt}"
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * ImageGeneratorButton - Botón para activar generación
 */
export function ImageGeneratorButton({ onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title="Generar imagen con IA"
    >
      <ImageIcon size={18} />
      <span>Generar Imagen</span>
    </button>
  );
}
