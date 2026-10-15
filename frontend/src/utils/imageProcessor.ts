/**
 * V Foods Image Processing Utility
 * Resizes, crops to 4:3, strips metadata, and compresses to WebP under ~200KB
 */

export interface ProcessedImageResult {
  blob: Blob
  previewUrl: string
  sizeBytes: number
  width: number
  height: number
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

export async function processMenuImage(
  fileOrBlob: File | Blob,
  targetRatio: number = 4 / 3,
  maxDimension: number = 1200,
  targetMaxSizeBytes: number = 200 * 1024 // ~200KB
): Promise<ProcessedImageResult> {
  // 1. Validation
  if (fileOrBlob.type && !ALLOWED_TYPES.includes(fileOrBlob.type.toLowerCase())) {
    throw new Error('Unsupported image format. Please use JPEG, PNG, or WebP.')
  }

  // 2. Load into HTML Image element
  const objectUrl = URL.createObjectURL(fileOrBlob)
  const img = new Image()

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Failed to load image for processing.'))
    img.src = objectUrl
  })

  // 3. Compute 4:3 Center Crop
  const origW = img.naturalWidth || img.width
  const origH = img.naturalHeight || img.height

  let cropW = origW
  let cropH = origW / targetRatio

  if (cropH > origH) {
    cropH = origH
    cropW = origH * targetRatio
  }

  const cropX = Math.max(0, (origW - cropW) / 2)
  const cropY = Math.max(0, (origH - cropH) / 2)

  // 4. Compute target output dimensions (scaling down if > maxDimension)
  let outW = cropW
  let outH = cropH

  if (outW > maxDimension) {
    const scale = maxDimension / outW
    outW = maxDimension
    outH = Math.round(cropH * scale)
  }

  if (outH > maxDimension) {
    const scale = maxDimension / outH
    outH = maxDimension
    outW = Math.round(cropW * scale)
  }

  // 5. Draw on canvas
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(outW)
  canvas.height = Math.round(outH)
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    URL.revokeObjectURL(objectUrl)
    throw new Error('Canvas 2D context unavailable.')
  }

  // Fill canvas with white background before drawing
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Draw cropped image (drawing to canvas strips EXIF / GPS metadata)
  ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height)
  URL.revokeObjectURL(objectUrl)

  // 6. Progressive WebP compression targeting <200KB
  let quality = 0.82
  let blob: Blob | null = null

  // Function to convert canvas to blob
  const toBlobPromise = (q: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b)
          else reject(new Error('Failed to encode image to WebP'))
        },
        'image/webp',
        q
      )
    })
  }

  blob = await toBlobPromise(quality)

  // If size > targetMaxSizeBytes, lower quality gradually
  while (blob.size > targetMaxSizeBytes && quality > 0.4) {
    quality -= 0.12
    blob = await toBlobPromise(quality)
  }

  const previewUrl = URL.createObjectURL(blob)

  return {
    blob,
    previewUrl,
    sizeBytes: blob.size,
    width: canvas.width,
    height: canvas.height
  }
}
