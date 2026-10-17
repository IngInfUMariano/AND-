import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'

const MONO    = { fontFamily: "'IBM Plex Mono', monospace" }
const DISPLAY = { fontFamily: "'EB Garamond', Georgia, serif", fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.18em' }

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
    <div style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>

      {/* Video de fondo */}
      <video
        autoPlay loop muted playsInline
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          filter: 'blur(10px) brightness(0.52)',
          transform: 'scale(1.08)',
        }}
      >
        <source src="/video/hero.mp4" type="video/mp4" />
      </video>

      {/* Overlay oscuro */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,10,0.42)' }} />

      {/* ── Contenido ── */}
      <div style={{
        position: 'relative', zIndex: 10,
        height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>

        {/* Volver */}
        <Link
          to="/"
          style={{
            position: 'absolute', top: '2rem', left: '2.5rem',
            ...MONO, fontSize: '10px', letterSpacing: '0.3em',
            color: 'rgba(255,255,255,0.4)', textDecoration: 'none',
            textTransform: 'uppercase',
          }}
        >
          ← volver
        </Link>

        {/* Marca */}
        <p style={{
          ...MONO, fontSize: '10px', letterSpacing: '0.48em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)',
          marginBottom: '0.6rem',
        }}>
          bienvenido
        </p>
        <h1 style={{
          ...DISPLAY, fontSize: 'clamp(3.2rem, 7vw, 5.5rem)',
          lineHeight: 0.9, letterSpacing: '0.06em',
          color: '#fff', marginBottom: '3rem',
        }}>
          AND&
        </h1>

        {/* Formulario */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{ width: '100%', maxWidth: '280px', display: 'flex', flexDirection: 'column', gap: '2rem' }}
        >

          {/* Correo */}
          <div>
            <label style={{
              ...MONO, fontSize: '10px', letterSpacing: '0.3em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)',
              display: 'block', marginBottom: '0.55rem',
            }}>
              correo
            </label>
            <input
              type="email"
              autoComplete="email"
              style={{
                ...MONO, fontSize: '13px', letterSpacing: '0.03em',
                width: '100%', background: 'transparent',
                border: 'none',
                borderBottom: `1px solid ${errors.email ? 'rgba(255,100,100,0.7)' : 'rgba(255,255,255,0.3)'}`,
                padding: '6px 0', outline: 'none',
                color: '#fff', boxSizing: 'border-box',
              }}
              {...register('email', { required: 'El correo es obligatorio' })}
            />
            {errors.email && (
              <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.1em', color: 'rgba(255,120,120,0.85)', marginTop: '0.4rem' }}>
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Contraseña */}
          <div>
            <label style={{
              ...MONO, fontSize: '10px', letterSpacing: '0.3em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)',
              display: 'block', marginBottom: '0.55rem',
            }}>
              contraseña
            </label>
            <input
              type="password"
              autoComplete="current-password"
              style={{
                ...MONO, fontSize: '13px', letterSpacing: '0.03em',
                width: '100%', background: 'transparent',
                border: 'none',
                borderBottom: `1px solid ${errors.password ? 'rgba(255,100,100,0.7)' : 'rgba(255,255,255,0.3)'}`,
                padding: '6px 0', outline: 'none',
                color: '#fff', boxSizing: 'border-box',
              }}
              {...register('password', { required: 'La contraseña es obligatoria' })}
            />
            {errors.password && (
              <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.1em', color: 'rgba(255,120,120,0.85)', marginTop: '0.4rem' }}>
                {errors.password.message}
              </p>
            )}
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
              marginTop: '0.2rem',
            }}
          >
            {isSubmitting ? 'ingresando...' : 'ingresar'}
          </button>
        </form>

        <p style={{
          ...MONO, fontSize: '10px', letterSpacing: '0.16em',
          color: 'rgba(255,255,255,0.3)', marginTop: '2rem',
        }}>
          ¿No tienes cuenta?{' '}
          <Link
            to="/registro"
            style={{
              color: 'rgba(255,255,255,0.7)', textDecoration: 'none',
              borderBottom: '1px solid rgba(255,255,255,0.3)',
              paddingBottom: '1px',
            }}
          >
            regístrate
          </Link>
        </p>

      </div>
    </div>
  )
}
