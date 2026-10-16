import { useState, useRef } from 'react'
import api from '@/services/api'

/**
 * Sube una imagen a Cloudinary (vía el backend) y llama a onSubida(imagenRecord)
 * cuando el upload termina.
 *
 * Props:
 *   productoId   — id del producto al que pertenece la imagen (requerido)
 *   colorId      — id del color (opcional)
 *   esPrincipal  — boolean, si es la imagen principal del producto
 *   orden        — número de orden
 *   onSubida     — callback(imagenRecord) cuando se completa el upload
 *   onError      — callback(mensajeError) opcional
 */
export default function ImageUploader({
  productoId,
  colorId     = null,
  esPrincipal = false,
  orden       = 0,
  onSubida,
  onError,
}) {
  const [preview,   setPreview]   = useState(null)
  const [subiendo,  setSubiendo]  = useState(false)
  const [progreso,  setProgreso]  = useState(0)
  const inputRef = useRef(null)

  const handleArchivo = async (archivo) => {
    if (!archivo) return

    // Preview local inmediato
    setPreview(URL.createObjectURL(archivo))
    setSubiendo(true)
    setProgreso(0)

    try {
      const form = new FormData()
      form.append('imagen',       archivo)
      form.append('producto_id',  productoId)
      form.append('es_principal', String(esPrincipal))
      form.append('orden',        String(orden))
      if (colorId) form.append('color_id', colorId)

      const res = await api.post('/imagen-productos/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgreso(Math.round((e.loaded * 100) / e.total))
        },
      })

      onSubida?.(res.data.data)
    } catch (err) {
      const msg = err.response?.data?.error?.mensaje ?? 'Error al subir la imagen'
      onError?.(msg)
      setPreview(null)
    } finally {
      setSubiendo(false)
      setProgreso(0)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const archivo = e.dataTransfer.files[0]
    if (archivo) handleArchivo(archivo)
  }

  return (
    <div className="space-y-2">
      <div
        onClick={() => !subiendo && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={`
          relative flex flex-col items-center justify-center gap-2
          rounded-lg border-2 border-dashed transition-colors cursor-pointer
          ${subiendo ? 'border-primary/40 bg-primary/5 cursor-default' : 'border-border hover:border-primary/60 hover:bg-muted/40'}
          ${preview ? 'h-48' : 'h-32 py-6'}
        `}
      >
        {preview ? (
          <img
            src={preview}
            alt="preview"
            className="h-full w-full object-contain rounded-md"
          />
        ) : (
          <>
            <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-muted-foreground">
              Arrastra una imagen o <span className="text-primary font-medium">haz clic para seleccionar</span>
            </p>
            <p className="text-xs text-muted-foreground">JPG, PNG, WEBP — máx. 5 MB</p>
          </>
        )}

        {/* Overlay de progreso */}
        {subiendo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-background/80">
            <div className="h-1.5 w-2/3 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-200"
                style={{ width: `${progreso}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Subiendo {progreso}%</p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleArchivo(e.target.files?.[0])}
      />
    </div>
  )
}
