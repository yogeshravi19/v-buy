import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { X, Image as ImageIcon, Utensils } from 'lucide-react'
import { toast } from '../ui/toast'
import { Button } from '../ui/button'

const menuItemSchema = z.object({
  name: z.string().trim().min(2, { message: 'Item name must be at least 2 characters long' }),
  price: z.coerce.number().positive({ message: 'Price must be greater than zero' }),
  category: z.string().min(1, { message: 'Please select a category' }),
  is_veg: z.boolean(),
  stock_qty: z.coerce.number().int().min(0, { message: 'Stock count cannot be negative' }),
  image_url: z.string().optional()
})

export function MenuItemFormDialog({
  isOpen,
  onClose,
  initialData = null,
  onSave
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = Boolean(initialData?.id)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name: '',
      price: 20,
      category: 'snacks',
      is_veg: true,
      stock_qty: 25,
      image_url: ''
    }
  })

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          name: initialData.name || '',
          price: initialData.price || 20,
          category: initialData.category || 'snacks',
          is_veg: initialData.is_veg ?? true,
          stock_qty: initialData.stock_qty ?? 25,
          image_url: initialData.image_url || ''
        })
      } else {
        reset({
          name: '',
          price: 20,
          category: 'snacks',
          is_veg: true,
          stock_qty: 25,
          image_url: ''
        })
      }
    }
  }, [isOpen, initialData, reset])

  const imageUrl = watch('image_url')

  if (!isOpen) return null

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true)
      await onSave({
        ...data,
        id: initialData?.id
      })
      toast.success(isEditing ? `"${data.name}" updated successfully` : `"${data.name}" added to menu`)
      onClose()
    } catch (err) {
      toast.error('Unable to save menu item. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Utensils size={18} className="text-blue-700" />
            <h3 className="text-base font-semibold text-slate-900">
              {isEditing ? 'Edit Menu Item' : 'Add New Menu Item'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Item Name
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
                Price (₹)
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
                Category
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
                    onChange={() => reset({ ...watch(), is_veg: true })}
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
                    onChange={() => reset({ ...watch(), is_veg: false })}
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

          {/* Photo URL & Preview */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Photo URL (Optional)
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="url"
                placeholder="https://..."
                {...register('image_url')}
                className="flex-1 h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
              />
              <div className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                ) : (
                  <ImageIcon size={16} className="text-slate-400" />
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Item' : 'Add Item'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
