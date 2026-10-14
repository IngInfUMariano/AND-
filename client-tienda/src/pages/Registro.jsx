import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '@/services/api'

export default function Registro() {
  const navigate = useNavigate()
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm()
  const password = watch('password')

  const onSubmit = async ({ nombre, email, password, telefono }) => {
    try {
      const { data } = await api.post('/auth/registro', { nombre, email, password, telefono: telefono || undefined })
      const { token } = data.data
      localStorage.setItem('token', token)
      toast.success('Cuenta creada. ¡Bienvenido!')
      navigate('/', { replace: true })
      window.location.reload()
    } catch (err) {
      const mensaje = err.response?.data?.error?.mensaje ?? 'Error al crear la cuenta'
      toast.error(mensaje)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold">Crear cuenta</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="underline">Ingresar</Link>
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Nombre completo</label>
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              {...register('nombre', { required: 'El nombre es obligatorio' })}
            />
            {errors.nombre && <p className="mt-1 text-xs text-destructive">{errors.nombre.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Correo</label>
            <input
              type="email"
              autoComplete="email"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              {...register('email', { required: 'El correo es obligatorio' })}
            />
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Contraseña</label>
            <input
              type="password"
              autoComplete="new-password"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              {...register('password', {
                required: 'La contraseña es obligatoria',
                minLength: { value: 8, message: 'Mínimo 8 caracteres' }
              })}
            />
            {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Confirmar contraseña</label>
            <input
              type="password"
              autoComplete="new-password"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              {...register('confirmar', {
                required: 'Confirma tu contraseña',
                validate: v => v === password || 'Las contraseñas no coinciden'
              })}
            />
            {errors.confirmar && <p className="mt-1 text-xs text-destructive">{errors.confirmar.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Teléfono <span className="text-muted-foreground">(opcional)</span></label>
            <input
              type="tel"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              {...register('telefono')}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>
      </div>
    </div>
  )
}
