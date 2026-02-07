// lib/cloudinaryService.ts
// Servicio para subir imágenes a Cloudinary

// ================================
// CONFIGURACIÓN CLOUDINARY
// ================================
const CLOUDINARY_CLOUD_NAME = 'dvpnkr2i9';
const CLOUDINARY_UPLOAD_PRESET = 'odihna_preset';

// URLs de API de Cloudinary
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

export interface CloudinaryUploadResult {
    success: boolean;
    url?: string;
    publicId?: string;
    error?: string;
}

/**
 * Sube una imagen a Cloudinary
 * @param imageUri - URI local de la imagen (desde ImagePicker)
 * @param folder - Carpeta donde guardar (properties, avatars, etc.)
 * @returns URL pública de la imagen optimizada
 */
export async function uploadImageToCloudinary(
    imageUri: string,
    folder: string = 'properties'
): Promise<CloudinaryUploadResult> {
    try {
        console.log('☁️ Subiendo imagen a Cloudinary...');

        // Crear FormData para el upload
        const formData = new FormData();

        // Obtener el nombre del archivo
        const filename = imageUri.split('/').pop() || 'image.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        // Agregar la imagen
        formData.append('file', {
            uri: imageUri,
            name: filename,
            type: type,
        } as any);

        // Agregar configuración de Cloudinary
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('folder', `odihna/${folder}`);

        // Hacer el upload
        const response = await fetch(CLOUDINARY_UPLOAD_URL, {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'multipart/form-data',
            },
        });

        const result = await response.json();

        if (result.secure_url) {
            console.log('✅ Imagen subida exitosamente:', result.secure_url);
            return {
                success: true,
                url: result.secure_url,
                publicId: result.public_id,
            };
        } else {
            console.error('❌ Error de Cloudinary:', result.error?.message || 'Error desconocido');
            return {
                success: false,
                error: result.error?.message || 'Error al subir imagen',
            };
        }
    } catch (error) {
        console.error('❌ Error subiendo a Cloudinary:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error de conexión',
        };
    }
}

/**
 * Sube múltiples imágenes a Cloudinary
 * @param imageUris - Array de URIs locales
 * @param folder - Carpeta destino
 * @returns Array de URLs públicas
 */
export async function uploadMultipleImages(
    imageUris: string[],
    folder: string = 'properties'
): Promise<string[]> {
    const uploadedUrls: string[] = [];

    for (let i = 0; i < imageUris.length; i++) {
        const uri = imageUris[i];
        console.log(`📤 Subiendo imagen ${i + 1}/${imageUris.length}...`);

        const result = await uploadImageToCloudinary(uri, folder);

        if (result.success && result.url) {
            uploadedUrls.push(result.url);
        } else {
            console.warn(`⚠️ No se pudo subir imagen ${i + 1}: ${result.error}`);
        }
    }

    return uploadedUrls;
}

/**
 * Obtiene una URL optimizada de Cloudinary con transformaciones
 * @param url - URL original de Cloudinary
 * @param width - Ancho deseado (opcional)
 * @param quality - Calidad (auto, low, medium, high)
 */
export function getOptimizedUrl(
    url: string,
    width?: number,
    quality: 'auto' | 'low' | 'eco' | 'good' | 'best' = 'auto'
): string {
    // Si no es una URL de Cloudinary, retornar como está
    if (!url.includes('cloudinary.com')) {
        return url;
    }

    // Construir transformaciones
    const transformations: string[] = [];

    // Formato automático (WebP para navegadores compatibles)
    transformations.push('f_auto');

    // Calidad
    transformations.push(`q_${quality}`);

    // Ancho si se especifica
    if (width) {
        transformations.push(`w_${width}`);
        transformations.push('c_limit'); // No agrandar si es más pequeña
    }

    // Insertar transformaciones en la URL
    const transformString = transformations.join(',');
    return url.replace('/upload/', `/upload/${transformString}/`);
}

/**
 * Verifica si el servicio de Cloudinary está configurado
 */
export function isCloudinaryConfigured(): boolean {
    const cloudName: string = CLOUDINARY_CLOUD_NAME;
    return cloudName !== 'TU_CLOUD_NAME_AQUI' && cloudName.length > 0;
}
