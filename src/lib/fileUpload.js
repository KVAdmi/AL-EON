import { supabase } from './supabase';

/**
 * Sube un archivo a Supabase Storage
 * @param {File} file - Archivo a subir
 * @param {string} userId - ID del usuario
 * @returns {Promise<{url: string, path: string}>} URL pública del archivo
 */
export async function uploadFile(file, userId) {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    // Subir a Supabase Storage (bucket: user-files)
    const { data, error } = await supabase.storage
      .from('user-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw error;
    }

    // Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('user-files')
      .getPublicUrl(filePath);

    return {
      url: publicUrl,
      path: filePath,
      name: file.name,
      type: file.type,
      size: file.size
    };
  } catch (error) {
    console.error('Error subiendo archivo:', error);
    throw new Error(`No se pudo subir el archivo: ${error.message}`);
  }
}

/**
 * Sube múltiples archivos
 * @param {File[]} files - Archivos a subir
 * @param {string} userId - ID del usuario
 * @returns {Promise<Array>} URLs de los archivos subidos
 */
export async function uploadFiles(files, userId) {
  const uploadPromises = files.map(file => uploadFile(file, userId));
  return Promise.all(uploadPromises);
}

/**
 * Elimina un archivo de Supabase Storage
 * @param {string} filePath - Path del archivo en storage
 */
export async function deleteFile(filePath) {
  try {
    const { error } = await supabase.storage
      .from('user-files')
      .remove([filePath]);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error eliminando archivo:', error);
    throw error;
  }
}
