import { supabase } from '../lib/supabase'

export const BUCKET_NAME = 'menu-images'

/**
 * Uploads a processed WebP image blob to Supabase Storage under `menu-images/{outletId}/{timestamp}_{random}.webp`
 * Returns the public URL.
 */
export async function uploadMenuImage(
  outletId: string,
  blob: Blob,
  onProgress?: (percent: number) => void
): Promise<string> {
  if (!outletId) {
    throw new Error('Outlet ID is required for image upload.')
  }

  const safeOutlet = outletId.replace(/[^a-zA-Z0-9_-]/g, '_')
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 9)
  const filePath = `${safeOutlet}/${timestamp}_${randomStr}.webp`

  if (onProgress) onProgress(30)

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, blob, {
      contentType: 'image/webp',
      cacheControl: '31536000',
      upsert: false
    })

  if (error) {
    throw new Error(`Image upload failed: ${error.message}`)
  }

  if (onProgress) onProgress(90)

  const { data: publicData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path)

  if (onProgress) onProgress(100)

  return publicData.publicUrl
}

/**
 * Deletes an old image from Supabase Storage given its public URL or path
 * Should only be called AFTER the database update succeeds!
 */
export async function deleteMenuImage(publicUrlOrPath: string): Promise<void> {
  if (!publicUrlOrPath) return

  try {
    let storagePath = publicUrlOrPath

    // If it's a full public URL, extract the relative path inside the bucket
    if (publicUrlOrPath.includes(`/${BUCKET_NAME}/`)) {
      const parts = publicUrlOrPath.split(`/${BUCKET_NAME}/`)
      if (parts.length > 1) {
        storagePath = decodeURIComponent(parts[1].split('?')[0])
      }
    }

    if (storagePath) {
      await supabase.storage.from(BUCKET_NAME).remove([storagePath])
    }
  } catch (err) {
    console.warn('Failed to delete old menu image from storage:', err)
  }
}
