/**
 * Script de prueba para Vercel Blob Storage
 * Ejecutar con: tsx src/scripts/test-blob-storage.ts
 */

import { uploadImage, deleteImage, isBase64Image, isImageUrl } from '../utils/blob-storage';

async function testBlobStorage() {
  console.log('🧪 Iniciando pruebas de Vercel Blob Storage...\n');

  // Test 1: Validación de base64
  console.log('Test 1: Validación de base64');
  const validBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=';
  console.log(`✓ Base64 con data URI válido: ${isBase64Image(validBase64)}`);
  
  const invalidBase64 = 'not-a-base64-string';
  console.log(`✓ String inválido detectado: ${!isBase64Image(invalidBase64)}`);

  // Test 2: Validación de URL
  console.log('\nTest 2: Validación de URL');
  const validUrl = 'https://example.com/image.jpg';
  console.log(`✓ URL válida: ${isImageUrl(validUrl)}`);
  
  const invalidUrl = 'not-a-url';
  console.log(`✓ String inválido detectado: ${!isImageUrl(invalidUrl)}`);

  // Test 3: Subir imagen (1x1 pixel PNG transparente)
  console.log('\nTest 3: Subida de imagen a Vercel Blob');
  try {
    // PNG transparente de 1x1 pixel en base64
    const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    const timestamp = Date.now();
    const imageUrl = await uploadImage(testImage, `test-image-${timestamp}.png`);
    
    console.log(`✓ Imagen subida exitosamente`);
    console.log(`  URL: ${imageUrl}`);

    // Test 4: Eliminar imagen
    console.log('\nTest 4: Eliminación de imagen');
    await deleteImage(imageUrl);
    console.log(`✓ Imagen eliminada exitosamente`);

  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
    console.error('\n⚠️  Verifica que BLOB_READ_WRITE_TOKEN esté configurado correctamente en .env');
    process.exit(1);
  }

  console.log('\n✅ Todas las pruebas completadas exitosamente!');
}

// Ejecutar pruebas
testBlobStorage().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
