import React, { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  X,
  Camera,
  Upload,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Utensils,
  Clock,
  Loader2,
  CheckCircle2
} from 'lucide-react'
import Webcam from 'react-webcam'
import { Button } from '../ui/button'
import { processMenuImage } from '../../utils/imageProcessor'
import { uploadMenuImage, deleteMenuImage } from '../../utils/menuStorage'

const menuItemSchema = z.object({
  name: z.string().trim().min(2, { message: 'Item name must be at least 2 characters long' }),
  price: z.coerce.number().positive({ message: 'Price must be greater than zero' }),
  category: z.string().min(1, { message: 'Please select a category' }),
  is_veg: z.boolean(),
  description: z.string().optional(),
  available_from: z.string().optional(),
  available_to: z.string().optional(),
  stock_qty: z.coerce.number().int().min(0, { message: 'Stock count cannot be negative' }),
  available: z.boolean(),
  image_url: z.string().optional()
})

export function MenuItemFormDialog({
  isOpen,
  onClose,
  initialData = null,
  existingItems = [],
  outletId = 'outlet-1',
  onSave
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [imageError, setImageError] = useState(null)
  const [showWebcam, setShowWebcam] = useState(false)
  const [webcamError, setWebcamError] = useState(null)
  const [pendingBlob, setPendingBlob] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [oldPhotoUrlToDelete, setOldPhotoUrlToDelete] = useState(null)

  const isEditing = Boolean(initialData?.id)
  const galleryInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const webcamRef = useRef(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name: '',
      price: 20,
      category: 'snacks',
      is_veg: true,
      description: '',
      available_from: '',
      available_to: '',
      stock_qty: 25,
      available: true,
      image_url: ''
    }
  })

  const currentName = watch('name')
  const currentImageUrl = watch('image_url')

  // Check for duplicate name in outlet
  const isDuplicateName = React.useMemo(() => {
    if (!currentName || !currentName.trim()) return false
    const trimmed = currentName.trim().toLowerCase()
    return existingItems.some(
      (item) => item.name?.trim().toLowerCase() === trimmed && item.id !== initialData?.id
    )
  }, [currentName, existingItems, initialData])

  useEffect(() => {
    if (isOpen) {
      setImageError(null)
      setShowWebcam(false)
      setWebcamError(null)
      setPendingBlob(null)
      setOldPhotoUrlToDelete(null)
      setUploadProgress(0)

      if (initialData) {
        reset({
          name: initialData.name || '',
          price: initialData.price || 20,
          category: initialData.category || 'snacks',
          is_veg: initialData.is_veg ?? true,
          description: initialData.description || '',
          available_from: initialData.available_from || '',
          available_to: initialData.available_to || '',
          stock_qty: initialData.stock_qty ?? 25,
          available: initialData.available ?? true,
          image_url: initialData.image_url || ''
        })
        setPreviewUrl(initialData.image_url || '')
      } else {
        reset({
          name: '',
          price: 20,
          category: 'snacks',
          is_veg: true,
          description: '',
          available_from: '',
          available_to: '',
          stock_qty: 25,
          available: true,
          image_url: ''
        })
        setPreviewUrl('')
      }
    }
  }, [isOpen, initialData, reset])

  if (!isOpen) return null

  // Handle selected file (camera or gallery)
  const handleImageFile = async (file) => {
    if (!file) return
    setImageError(null)
    setWebcamError(null)
    setShowWebcam(false)

    try {
      setIsUploading(true)
      setUploadProgress(15)

      // Client-side crop, resize to ~1200px, EXIF orientation fix, WebP compress <200KB
      const processed = await processMenuImage(file)
      setUploadProgress(60)

      setPendingBlob(processed.blob)
      setPreviewUrl(processed.previewUrl)

      // If replacing an existing photo, mark old photo for deletion upon successful save
      if (initialData?.image_url && !oldPhotoUrlToDelete) {
        setOldPhotoUrlToDelete(initialData.image_url)
      }
    } catch (err) {
      console.error('Image processing error:', err)
      setImageError(err.message || 'Failed to process image. Please try another photo.')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  // Handle live webcam capture
  const handleCaptureWebcam = async () => {
    if (!webcamRef.current) return
    try {
      const screenshot = webcamRef.current.getScreenshot()
      if (!screenshot) {
        throw new Error('Failed to capture photo from webcam.')
      }

      // Convert base64 to blob
      const res = await fetch(screenshot)
      const blob = await res.blob()
      await handleImageFile(blob)
      setShowWebcam(false)
    } catch (err) {
      setWebcamError('Unable to capture webcam image. Please choose from gallery.')
    }
  }

  // Handle click on Take Photo button
  const handleTakePhotoClick = () => {
    // If mobile device (touch-enabled), use native camera capture attribute
    const isMobile =
      typeof navigator !== 'undefined' &&
      (navigator.maxTouchPoints > 0 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent))

    if (isMobile && cameraInputRef.current) {
      cameraInputRef.current.click()
    } else {
      // On desktop, open live webcam view
      setShowWebcam(true)
      setWebcamError(null)
    }
  }

  // Handle photo removal
  const handleRemovePhoto = () => {
    if (previewUrl && initialData?.image_url && !oldPhotoUrlToDelete) {
      setOldPhotoUrlToDelete(initialData.image_url)
    }
    setPreviewUrl('')
    setPendingBlob(null)
    setValue('image_url', '')
    setShowWebcam(false)
  }

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true)
      let finalImageUrl = data.image_url || ''

      // If user uploaded a new photo blob, upload to Supabase Storage first
      if (pendingBlob) {
        setIsUploading(true)
        setUploadProgress(30)
        finalImageUrl = await uploadMenuImage(outletId, pendingBlob, (p) => setUploadProgress(p))
      }

      // Save item to database
      await onSave({
        ...data,
        image_url: finalImageUrl || null,
        description: data.description || null,
        available_from: data.available_from || null,
        available_to: data.available_to || null,
        id: initialData?.id
      })

      // If photo was replaced or removed, delete the old file only AFTER database update succeeds
      if (oldPhotoUrlToDelete && oldPhotoUrlToDelete !== finalImageUrl) {
        await deleteMenuImage(oldPhotoUrlToDelete)
      }

      onClose()
    } catch (err) {
      console.error('Menu item save error:', err)
      setImageError('Failed to save menu item. Please try again.')
    } finally {
      setIsSubmitting(false)
      setIsUploading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-[2px] animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Utensils size={16} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                {isEditing ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h3>
              <p className="text-[11px] text-slate-500">
                Outlet: <span className="font-semibold text-slate-700">{outletId}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="menu-item-form" onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Duplicate Name Warning */}
          {isDuplicateName && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 animate-in fade-in">
              <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Notice:</strong> An item named "{currentName.trim()}" already exists in this outlet. You may still save it, but ensure customers can distinguish them.
              </div>
            </div>
          )}

          {/* Photo Section */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Item Photo
            </label>

            {/* Hidden file inputs */}
            <input
              type="file"
              ref={galleryInputRef}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleImageFile(e.target.files[0])
              }}
            />
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleImageFile(e.target.files[0])
              }}
            />

            {/* Photo Preview or Live Webcam */}
            {showWebcam ? (
              <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-200 aspect-[4/3] flex flex-col items-center justify-center">
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: 'environment', width: 1280, height: 960 }}
                  onUserMediaError={() => {
                    setWebcamError('Camera access denied or unavailable. Please choose from gallery.')
                    setShowWebcam(false)
                  }}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-3 inset-x-3 flex items-center justify-between gap-2 bg-slate-900/70 backdrop-blur-sm p-2 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setShowWebcam(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCaptureWebcam}
                    className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 flex items-center gap-1.5"
                  >
                    <Camera size={13} />
                    Capture Photo
                  </button>
                </div>
              </div>
            ) : previewUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-[4/3] flex items-center justify-center group">
                <img
                  src={previewUrl}
                  alt={currentName || 'Item photo preview'}
                  className="w-full h-full object-cover"
                  onError={() => {
                    setPreviewUrl('')
                    setImageError('Unable to load photo preview.')
                  }}
                />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                  <button
                    type="button"
                    onClick={handleTakePhotoClick}
                    className="px-2.5 py-1.5 rounded-lg bg-white/95 text-slate-800 text-xs font-semibold shadow hover:bg-white flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw size={12} />
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-lg bg-white/95 text-slate-800 text-xs font-semibold shadow hover:bg-white flex items-center gap-1.5 transition-colors"
                  >
                    <Upload size={12} />
                    Gallery
                  </button>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold shadow hover:bg-rose-700 flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 size={12} />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Camera size={22} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Add Live Photo or Choose File</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Cropped to 4:3, resized to 1200px, compressed WebP &lt;200KB
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <button
                    type="button"
                    onClick={handleTakePhotoClick}
                    className="px-3 py-1.5 rounded-xl bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Camera size={13} />
                    Take Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Upload size={13} />
                    Choose from Gallery
                  </button>
                </div>
              </div>
            )}

            {/* Error or Notice messages */}
            {webcamError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between gap-2">
                <span>{webcamError}</span>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="font-semibold underline shrink-0"
                >
                  Open Gallery
                </button>
              </div>
            )}

            {imageError && (
              <p className="text-xs text-rose-600 font-medium">{imageError}</p>
            )}

            {/* Upload progress */}
            {isUploading && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Loader2 size={12} className="animate-spin text-blue-700" />
                    Processing and uploading image...
                  </span>
                  <span className="font-bold">{uploadProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-700 transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Item Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Masala Dosa"
              {...register('name')}
              className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>
            )}
          </div>

          {/* Price & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Price (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="1"
                placeholder="20"
                {...register('price')}
                className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl tabular-nums focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
              />
              {errors.price && (
                <p className="mt-1 text-xs text-rose-600">{errors.price.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                {...register('category')}
                className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
              >
                <option value="snacks">Snacks</option>
                <option value="meals">Meals</option>
                <option value="beverages">Beverages</option>
                <option value="desserts">Desserts</option>
                <option value="breakfast">Breakfast</option>
              </select>
              {errors.category && (
                <p className="mt-1 text-xs text-rose-600">{errors.category.message}</p>
              )}
            </div>
          </div>

          {/* Dietary Type & Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dietary Preference
              </label>
              <div className="flex gap-2">
                <label className="flex-1 flex items-center justify-center gap-1.5 h-10 px-2 rounded-xl border border-slate-200 text-xs font-medium cursor-pointer has-[:checked]:bg-emerald-50 has-[:checked]:border-emerald-300 has-[:checked]:text-emerald-800 transition-colors">
                  <input
                    type="radio"
                    value="true"
                    {...register('is_veg')}
                    checked={watch('is_veg') === true}
                    onChange={() => setValue('is_veg', true)}
                    className="sr-only"
                  />
                  <span>Veg</span>
                </label>
                <label className="flex-1 flex items-center justify-center gap-1.5 h-10 px-2 rounded-xl border border-slate-200 text-xs font-medium cursor-pointer has-[:checked]:bg-rose-50 has-[:checked]:border-rose-300 has-[:checked]:text-rose-800 transition-colors">
                  <input
                    type="radio"
                    value="false"
                    {...register('is_veg')}
                    checked={watch('is_veg') === false}
                    onChange={() => setValue('is_veg', false)}
                    className="sr-only"
                  />
                  <span>Non-Veg</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Stock Qty
              </label>
              <input
                type="number"
                min="0"
                step="1"
                {...register('stock_qty')}
                className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl tabular-nums focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
              />
              {errors.stock_qty && (
                <p className="mt-1 text-xs text-rose-600">{errors.stock_qty.message}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Crispy, fresh, served with mint chutney..."
              {...register('description')}
              className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white transition-colors resize-none"
            />
          </div>

          {/* Availability Window */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Available From (Optional)
              </label>
              <input
                type="time"
                {...register('available_from')}
                className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Available To (Optional)
              </label>
              <input
                type="time"
                {...register('available_to')}
                className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Available Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <div className="text-xs font-bold text-slate-900">Active Availability</div>
              <div className="text-[11px] text-slate-500">Enable item for ordering by users</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                {...register('available')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </form>

        {/* Pinned Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-slate-100 bg-slate-50 shrink-0">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting || isUploading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="menu-item-form"
            variant="primary"
            disabled={isSubmitting || isUploading}
            className="bg-blue-700 hover:bg-blue-800 text-white"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <Loader2 size={13} className="animate-spin" />
                Saving...
              </span>
            ) : isEditing ? (
              'Update Item'
            ) : (
              'Add Item'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
