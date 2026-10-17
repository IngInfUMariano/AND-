import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '@/services/api'

const MONO    = { fontFamily: "'IBM Plex Mono', monospace" }
const DISPLAY = { fontFamily: "'EB Garamond', Georgia, serif", fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.18em' }

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

  const fieldStyle = (hasError) => ({
    ...MONO, fontSize: '13px', letterSpacing: '0.03em',
    width: '100%', background: 'transparent',
    border: 'none',
    borderBottom: `1px solid ${hasError ? 'rgba(255,100,100,0.7)' : 'rgba(255,255,255,0.3)'}`,
    padding: '6px 0', outline: 'none',
    color: '#fff', boxSizing: 'border-box',
  })

  const labelStyle = {
    ...MONO, fontSize: '10px', letterSpacing: '0.3em',
    textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)',
    display: 'block', marginBottom: '0.55rem',
  }

  const errorStyle = {
    ...MONO, fontSize: '10px', letterSpacing: '0.1em',
    color: 'rgba(255,120,120,0.85)', marginTop: '0.4rem',
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>

      {/* Video de fondo */}
      <video
        autoPlay loop muted playsInline
        style={{
          position: 'fixed', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          filter: 'blur(10px) brightness(0.52)',
          transform: 'scale(1.08)',
        }}
      >
        <source src="/video/hero.mp4" type="video/mp4" />
      </video>

      {/* Overlay */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,0.42)' }} />

      {/* Contenido */}
      <div style={{
        position: 'relative', zIndex: 10,
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '3rem 1.5rem',
      }}>

        {/* Volver */}
        <Link
          to="/login"
          style={{
            position: 'absolute', top: '2rem', left: '2.5rem',
            ...MONO, fontSize: '10px', letterSpacing: '0.3em',
            color: 'rgba(255,255,255,0.4)', textDecoration: 'none',
            textTransform: 'uppercase',
          }}
        >
          ← ingresar
        </Link>

        {/* Marca */}
        <p style={{
          ...MONO, fontSize: '10px', letterSpacing: '0.48em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)',
          marginBottom: '0.6rem',
        }}>
          nueva cuenta
        </p>
        <h1 style={{
          ...DISPLAY, fontSize: 'clamp(3rem, 7vw, 5rem)',
          lineHeight: 0.9, letterSpacing: '0.06em',
          color: '#fff', marginBottom: '3rem',
        }}>
          AND&
        </h1>

        {/* Formulario */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '1.8rem' }}
        >
          {/* Nombre */}
          <div>
            <label style={labelStyle}>nombre completo</label>
            <input
              style={fieldStyle(!!errors.nombre)}
              {...register('nombre', { required: 'El nombre es obligatorio' })}
            />
            {errors.nombre && <p style={errorStyle}>{errors.nombre.message}</p>}
          </div>

          {/* Correo */}
          <div>
            <label style={labelStyle}>correo</label>
            <input
              type="email"
              autoComplete="email"
              style={fieldStyle(!!errors.email)}
              {...register('email', { required: 'El correo es obligatorio' })}
            />
            {errors.email && <p style={errorStyle}>{errors.email.message}</p>}
          </div>

          {/* Teléfono */}
          <div>
            <label style={{ ...labelStyle, color: 'rgba(255,255,255,0.28)' }}>
              teléfono <span style={{ fontSize: '9px' }}>(opcional)</span>
            </label>
            <input
              type="tel"
              style={fieldStyle(false)}
              {...register('telefono')}
            />
          </div>

          {/* Contraseña */}
          <div>
            <label style={labelStyle}>contraseña</label>
            <input
              type="password"
              autoComplete="new-password"
              style={fieldStyle(!!errors.password)}
              {...register('password', {
                required: 'La contraseña es obligatoria',
                minLength: { value: 8, message: 'Mínimo 8 caracteres' },
              })}
            />
            {errors.password && <p style={errorStyle}>{errors.password.message}</p>}
          </div>

          {/* Confirmar */}
          <div>
            <label style={labelStyle}>confirmar contraseña</label>
            <input
              type="password"
              autoComplete="new-password"
              style={fieldStyle(!!errors.confirmar)}
              {...register('confirmar', {
                required: 'Confirma tu contraseña',
                validate: v => v === password || 'Las contraseñas no coinciden',
              })}
            />
            {errors.confirmar && <p style={errorStyle}>{errors.confirmar.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              ...MONO, fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase',
              background: isSubmitting ? 'rgba(255,255,255,0.12)' : '#fff',
              color: isSubmitting ? 'rgba(255,255,255,0.35)' : '#0a0a0a',
              border: 'none', padding: '13px',
              cursor: isSubmitting ? 'default' : 'pointer',
              transition: 'background 0.2s ease, color 0.2s ease',
              marginTop: '0.4rem',
            }}
          >
            {isSubmitting ? 'creando cuenta...' : 'crear cuenta'}
          </button>
        </form>

        <p style={{
          ...MONO, fontSize: '10px', letterSpacing: '0.16em',
          color: 'rgba(255,255,255,0.3)', marginTop: '2rem',
        }}>
          ¿Ya tienes cuenta?{' '}
          <Link
            to="/login"
            style={{
              color: 'rgba(255,255,255,0.7)', textDecoration: 'none',
              borderBottom: '1px solid rgba(255,255,255,0.3)', paddingBottom: '1px',
            }}
          >
            ingresar
          </Link>
        </p>

      </div>
    </div>
  )
}
