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

  // Escape key listener & background scroll lock
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting && !isUploading) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen, isSubmitting, isUploading, onClose])

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
      className="v-modal-overlay"
      onClick={onClose}
    >
      <div
        className="v-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="v-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: '#EFF6FF',
              color: '#1E40AF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Utensils size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                {isEditing ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h3>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                Outlet: <span style={{ fontWeight: 600, color: '#334155' }}>{outletId}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748B',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="menu-item-form" onSubmit={handleSubmit(onSubmit)} className="v-modal-body">
          {/* Duplicate Name Warning */}
          {isDuplicateName && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              fontSize: '12px',
              color: '#92400E'
            }}>
              <AlertTriangle size={16} style={{ color: '#D97706', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Notice:</strong> An item named "{currentName.trim()}" already exists in this outlet. You may still save it, but ensure customers can distinguish them.
              </div>
            </div>
          )}

          {/* Photo Section */}
          <div className="v-form-group">
            <label className="v-form-label">
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
              <div style={{
                position: 'relative',
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundColor: '#0F172A',
                border: '1px solid #E2E8F0',
                aspectRatio: '4 / 3',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: 'environment', width: 1280, height: 960 }}
                  onUserMediaError={() => {
                    setWebcamError('Camera access denied or unavailable. Please choose from gallery.')
                    setShowWebcam(false)
                  }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  right: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  backgroundColor: 'rgba(15, 23, 42, 0.75)',
                  backdropFilter: 'blur(4px)',
                  padding: '8px 12px',
                  borderRadius: '10px'
                }}>
                  <button
                    type="button"
                    onClick={() => setShowWebcam(false)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#334155',
                      color: '#F8FAFC',
                      fontSize: '12px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCaptureWebcam}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#1E40AF',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Camera size={14} />
                    Capture Photo
                  </button>
                </div>
              </div>
            ) : previewUrl ? (
              <div style={{
                position: 'relative',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                aspectRatio: '4 / 3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img
                  src={previewUrl}
                  alt={currentName || 'Item photo preview'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={() => {
                    setPreviewUrl('')
                    setImageError('Unable to load photo preview.')
                  }}
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(15, 23, 42, 0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '8px'
                }}>
                  <button
                    type="button"
                    onClick={handleTakePhotoClick}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#FFFFFF',
                      color: '#0F172A',
                      fontSize: '12px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <RefreshCw size={12} />
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#FFFFFF',
                      color: '#0F172A',
                      fontSize: '12px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Upload size={12} />
                    Gallery
                  </button>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#DC2626',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Trash2 size={12} />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                borderRadius: '12px',
                border: '1.5px dashed #CBD5E1',
                backgroundColor: '#F8FAFC',
                padding: '20px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: '#EFF6FF',
                  color: '#1E40AF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Camera size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Add Live Photo or Choose File</div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>
                    Cropped to 4:3, resized to 1200px, compressed WebP &lt;200KB
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={handleTakePhotoClick}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#1E40AF',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Camera size={14} />
                    Take Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      color: '#334155',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Upload size={14} />
                    Choose from Gallery
                  </button>
                </div>
              </div>
            )}

            {/* Error or Notice messages */}
            {webcamError && (
              <div style={{
                padding: '10px 14px',
                backgroundColor: '#FFF1F2',
                border: '1px solid #FECDD3',
                borderRadius: '10px',
                fontSize: '12px',
                color: '#9F1239',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px'
              }}>
                <span>{webcamError}</span>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  style={{ fontWeight: 600, textDecoration: 'underline', border: 'none', background: 'transparent', cursor: 'pointer', color: '#9F1239' }}
                >
                  Open Gallery
                </button>
              </div>
            )}

            {imageError && (
              <p style={{ fontSize: '12px', color: '#DC2626', fontWeight: 600, margin: '4px 0 0 0' }}>{imageError}</p>
            )}

            {/* Upload progress */}
            {isUploading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#475569' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Loader2 size={12} className="animate-spin" style={{ color: '#1E40AF' }} />
                    Processing and uploading image...
                  </span>
                  <span style={{ fontWeight: 700 }}>{uploadProgress}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      backgroundColor: '#1E40AF',
                      transition: 'width 0.2s ease',
                      width: `${uploadProgress}%`
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Name */}
          <div className="v-form-group">
            <label className="v-form-label">
              Item Name <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Masala Dosa"
              {...register('name')}
              className="v-form-input"
            />
            {errors.name && (
              <p style={{ fontSize: '12px', color: '#DC2626', fontWeight: 600, margin: '2px 0 0 0' }}>{errors.name.message}</p>
            )}
          </div>

          {/* Price & Category */}
          <div className="v-form-grid-2">
            <div className="v-form-group">
              <label className="v-form-label">
                Price (₹) <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="number"
                step="1"
                placeholder="20"
                {...register('price')}
                className="v-form-input tabular-nums"
                style={{ fontWeight: 600 }}
              />
              {errors.price && (
                <p style={{ fontSize: '12px', color: '#DC2626', fontWeight: 600, margin: '2px 0 0 0' }}>{errors.price.message}</p>
              )}
            </div>

            <div className="v-form-group">
              <label className="v-form-label">
                Category <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select
                {...register('category')}
                className="v-form-select"
              >
                <option value="snacks">Snacks</option>
                <option value="meals">Meals</option>
                <option value="beverages">Beverages</option>
                <option value="desserts">Desserts</option>
                <option value="breakfast">Breakfast</option>
              </select>
              {errors.category && (
                <p style={{ fontSize: '12px', color: '#DC2626', fontWeight: 600, margin: '2px 0 0 0' }}>{errors.category.message}</p>
              )}
            </div>
          </div>

          {/* Dietary Type & Stock */}
          <div className="v-form-grid-2">
            <div className="v-form-group">
              <label className="v-form-label">
                Dietary Preference
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <label className={`v-dietary-pill ${watch('is_veg') === true ? 'active-veg' : ''}`}>
                  <input
                    type="radio"
                    value="true"
                    {...register('is_veg')}
                    checked={watch('is_veg') === true}
                    onChange={() => setValue('is_veg', true)}
                    style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                  />
                  <span style={{ width: '8px', height: '8px', borderRadius: '999px', backgroundColor: '#10B981', display: 'inline-block' }} />
                  <span>Pure Veg</span>
                </label>
                <label className={`v-dietary-pill ${watch('is_veg') === false ? 'active-nonveg' : ''}`}>
                  <input
                    type="radio"
                    value="false"
                    {...register('is_veg')}
                    checked={watch('is_veg') === false}
                    onChange={() => setValue('is_veg', false)}
                    style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                  />
                  <span style={{ width: '8px', height: '8px', borderRadius: '999px', backgroundColor: '#F43F5E', display: 'inline-block' }} />
                  <span>Non-Veg</span>
                </label>
              </div>
            </div>

            <div className="v-form-group">
              <label className="v-form-label">
                Current Stock Qty
              </label>
              <input
                type="number"
                min="0"
                step="1"
                {...register('stock_qty')}
                className="v-form-input tabular-nums"
                style={{ fontWeight: 600 }}
              />
              {errors.stock_qty && (
                <p style={{ fontSize: '12px', color: '#DC2626', fontWeight: 600, margin: '2px 0 0 0' }}>{errors.stock_qty.message}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="v-form-group">
            <label className="v-form-label">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Crispy, fresh, served with mint chutney..."
              {...register('description')}
              className="v-form-textarea"
              style={{ resize: 'none' }}
            />
          </div>

          {/* Availability Window */}
          <div className="v-form-grid-2">
            <div className="v-form-group">
              <label className="v-form-label">
                Available From (Optional)
              </label>
              <input
                type="time"
                {...register('available_from')}
                className="v-form-input"
              />
            </div>
            <div className="v-form-group">
              <label className="v-form-label">
                Available To (Optional)
              </label>
              <input
                type="time"
                {...register('available_to')}
                className="v-form-input"
              />
            </div>
          </div>

          {/* Available Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderRadius: '12px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0'
          }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Active Availability</div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>Enable item for ordering by campus customers</div>
            </div>
            <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                {...register('available')}
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
              />
              <div style={{
                width: '46px',
                height: '26px',
                backgroundColor: watch('available') ? '#10B981' : '#CBD5E1',
                borderRadius: '999px',
                position: 'relative',
                transition: 'background-color 0.2s ease'
              }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '999px',
                  position: 'absolute',
                  top: '3px',
                  left: watch('available') ? '23px' : '3px',
                  transition: 'left 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
              </div>
            </label>
          </div>
        </form>

        {/* Pinned Footer Actions */}
        <div className="v-modal-footer">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isUploading}
            className="v-btn-cancel"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="menu-item-form"
            disabled={isSubmitting || isUploading}
            className="v-btn-submit"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                {isEditing ? 'Update Menu Item' : 'Add to Menu'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
