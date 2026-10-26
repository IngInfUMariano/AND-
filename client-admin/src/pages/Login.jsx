import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()

  const onSubmit = async ({ email, password }) => {
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      const mensaje = err.response?.data?.error?.mensaje ?? 'Error al iniciar sesión'
      toast.error(mensaje)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Panel izquierdo — editorial */}
      <div className="hidden lg:flex w-[45%] flex-col justify-between bg-foreground text-background p-12">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-40">
          Portal de gestión
        </span>
        <h1
          style={{ fontFamily: "'EB Garamond', serif" }}
          className="text-[clamp(5rem,8vw,7rem)] font-normal leading-[0.9] tracking-[0.06em] uppercase"
        >
          AND&
        </h1>
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-40">
          {new Date().getFullYear()}
        </span>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 bg-background">
        <div className="w-full max-w-xs space-y-10">
          <div className="lg:hidden">
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
              AND&
            </span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-6">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
                  Correo
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  className="w-full border-0 border-b border-border bg-transparent px-0 py-2 font-mono text-sm focus:outline-none focus:border-foreground transition-colors"
                  {...register('email', { required: 'El correo es obligatorio' })}
                />
                {errors.email && (
                  <p className="mt-1 font-mono text-[10px] text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
                  Contraseña
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  className="w-full border-0 border-b border-border bg-transparent px-0 py-2 font-mono text-sm focus:outline-none focus:border-foreground transition-colors"
                  {...register('password', { required: 'La contraseña es obligatoria' })}
                />
                {errors.password && (
                  <p className="mt-1 font-mono text-[10px] text-destructive">{errors.password.message}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-foreground text-background py-4 font-mono text-[11px] uppercase tracking-[0.3em] hover:opacity-75 disabled:opacity-50 transition-opacity"
            >
              {isSubmitting ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
