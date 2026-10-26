import { useRef, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import MenuOverlay from '@/components/MenuOverlay'
import { useIsMobile } from '@/hooks/useIsMobile'

const MONO    = { fontFamily: "'IBM Plex Mono', monospace" }
const DISPLAY = { fontFamily: "'EB Garamond', Georgia, serif", fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.18em' }

function useInView(threshold = 0.1) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true) },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, visible]
}

function useScrollProgress() {
  const ref = useRef(null)
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const fn = () => {
      const el = ref.current
      if (!el) return
      const rect  = el.getBoundingClientRect()
      const total = rect.height - window.innerHeight
      setProgress(Math.max(0, Math.min(1, -rect.top / Math.max(1, total))))
    }
    window.addEventListener('scroll', fn, { passive: true })
    fn()
    return () => window.removeEventListener('scroll', fn)
  }, [])
  return [ref, progress]
}

function Reveal({ children, delay = 0, dy = 28 }) {
  const [ref, visible] = useInView()
  return (
    <div
      ref={ref}
      style={{
        opacity:   visible ? 1 : 0,
        transform: visible ? 'none' : `translateY(${dy}px)`,
        transition: `opacity 0.85s ease ${delay}s, transform 0.85s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  )
}

function FashionImg({ src, alt, delay = 0, className = '', curtainColor = '#111', style: extra = {} }) {
  const [ref, visible] = useInView(0.06)
  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`} style={extra}>
      <img
        src={src} alt={alt}
        className="w-full h-full object-cover block"
        style={{
          filter: 'grayscale(100%) brightness(0.72)',
          transform: visible ? 'scale(1)' : 'scale(1.06)',
          transition: `transform 1.5s cubic-bezier(0.25,0.46,0.45,0.94) ${delay + 0.08}s`,
        }}
      />
      <div
        style={{
          position: 'absolute', inset: 0,
          background: curtainColor,
          transformOrigin: 'right',
          transform: visible ? 'scaleX(0)' : 'scaleX(1)',
          transition: `transform 1s cubic-bezier(0.77,0,0.175,1) ${delay}s`,
        }}
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   NAVBAR — permanece centrada mientras S3 esté debajo del viewport.
   progress=0: S3 está a 1.5vh abajo. progress=1: S3 llega al tope
   (=fin exacto de S2). El panel blanco aparece solo en territorio blanco.
   ═══════════════════════════════════════════════════════════════ */
function NavHeader({ progress, onOpenMenu }) {
  const formed     = progress >= 0.96
  const NAV_H      = 64
  const vh         = typeof window !== 'undefined' ? window.innerHeight : 800
  const translateY = Math.max(0, (vh / 2 - NAV_H / 2) * (1 - progress))
  const andSize    = 2.0 - 0.88 * progress         // 2rem → 1.12rem
  const barW       = Math.max(0, 52 * (1 - Math.min(1, progress * 2.2)))
  const color      = formed ? '#0a0a0a' : '#ffffff'

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, transform: `translateY(${translateY}px)` }}>
      {/* Panel blanco — aparece solo cuando formado */}
      <div style={{
        position: 'absolute', inset: 0,
        background: '#fafafa',
        opacity: formed ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }} />

      <div className="relative flex items-center justify-between px-7"
        style={{ height: `${NAV_H}px`, color, transition: 'color 0.2s ease' }}>
        <button
          onClick={onOpenMenu}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            ...MONO, fontSize: '11px', lineHeight: '1.55', letterSpacing: '0.15em',
            color: 'inherit', transition: 'opacity 0.18s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.5'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          -ME<br />NU-
        </button>
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: `${barW}px`, height: '1px', background: color, opacity: 0.5, flexShrink: 0, transition: 'background 0.2s ease' }} />
          <h1 style={{ ...DISPLAY, fontSize: `${andSize}rem`, lineHeight: 1, whiteSpace: 'nowrap', transition: 'font-size 0.45s ease' }}>
            And&
          </h1>
        </div>
        <NavUser color={color} />
      </div>

      <div style={{ height: '1px', background: '#0a0a0a', opacity: formed ? 0.09 : 0, transition: 'opacity 0.2s ease' }} />
    </div>
  )
}

function NavUser({ color }) {
  const { usuario } = useAuth()
  return (
    <Link
      to={usuario ? '/cuenta' : '/login'}
      style={{ ...MONO, fontSize: '11px', lineHeight: '1.55', letterSpacing: '0.15em', textAlign: 'right', color, transition: 'color 0.2s ease', textDecoration: 'none' }}
      className="hover:opacity-55 transition-opacity"
    >
      {usuario ? <>{usuario.nombre?.split(' ')[0]}<br />PERFIL</> : <>EN-<br />TRAR</>}
    </Link>
  )
}

/* ─────────────────────────────────────────────── */

const WHY_ITEMS = [
  {
    titulo: 'Elegancia',
    texto: 'Cada pieza es una declaración silenciosa. Seleccionamos prendas que transforman lo cotidiano en algo extraordinario.',
    img: 'https://picsum.photos/seed/elegance21/160/200',
  },
  {
    titulo: 'Calidad',
    texto: 'Materiales de primera selección y acabados impecables. Ropa que te acompaña durante años, no solo temporadas.',
    img: 'https://picsum.photos/seed/quality22/160/200',
  },
  {
    titulo: 'Exclusividad',
    texto: 'Colecciones limitadas para mujeres que entienden que el verdadero lujo reside en lo único e irrepetible.',
    img: 'https://picsum.photos/seed/exclusive23/160/200',
  },
  {
    titulo: 'Autenticidad',
    texto: 'Trabajamos con diseñadores que comparten nuestra visión: moda con alma, con historia y con propósito.',
    img: 'https://picsum.photos/seed/authentic24/160/200',
  },
]

export default function Home() {
  const [navProgress, setNavProgress]   = useState(0)
  const [hoveredItem, setHoveredItem]   = useState(null)
  const [expandedItem, setExpandedItem] = useState(null)
  const [menuAbierto, setMenuAbierto]   = useState(false)
  const [parallaxRef, parallaxProgress] = useScrollProgress()
  const isMobile = useIsMobile()
  const s3Ref = useRef(null)

  /* Nav: se basa en la posición real de S3 — no en scrollY absoluto */
  useEffect(() => {
    const fn = () => {
      if (!s3Ref.current) return
      const rect = s3Ref.current.getBoundingClientRect()
      const vh   = window.innerHeight
      // 0 cuando S3 está a 1.5vh debajo, 1 cuando S3 toca el tope del viewport
      const p = Math.min(1, Math.max(0, 1 - rect.top / (vh * 1.5)))
      setNavProgress(p)
    }
    window.addEventListener('scroll', fn, { passive: true })
    fn()
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <>
      <NavHeader progress={navProgress} onOpenMenu={() => setMenuAbierto(true)} />
      <MenuOverlay open={menuAbierto} onClose={() => setMenuAbierto(false)} />

      {/* ══════════ SECCIONES OSCURAS ══════════ */}
      <div style={{ background: '#111', color: '#fff' }}>

        {/* S1 — Video */}
        <section className="relative h-screen overflow-hidden">
          <video autoPlay loop muted playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: 'brightness(0.55)' }}
          >
            <source src="/video/hero.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <span style={{ ...MONO, fontSize: '10px', letterSpacing: '0.22em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>scroll</span>
            <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.2)' }} />
          </div>
        </section>

        {/* S2 — Imagen estática */}
        <section className="relative h-screen overflow-hidden">
          <img
            src="https://picsum.photos/seed/womenelegant9/1400/900"
            alt="AND& Moda femenina"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: 'grayscale(100%) brightness(0.5)', objectPosition: 'center center' }}
          />
        </section>
      </div>

      {/* ══════════ SECCIONES CLARAS ══════════ */}
      <div style={{ background: '#fafafa', color: '#0a0a0a' }}>

        {/* S3 — Moda sin compromiso — ref para nav */}
        <section ref={s3Ref} style={{ padding: isMobile ? '5rem 0 4rem' : '10rem 0 8rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: 0, alignItems: 'start',
          }}>
            {/* Texto */}
            <div style={{ padding: isMobile ? '0 1.5rem 3rem' : '0 5rem 0 4rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <Reveal delay={0.05}>
                <span style={{ ...MONO, fontSize: '10px', letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.90)' }}>
                  Nuestra esencia
                </span>
              </Reveal>
              <Reveal delay={0.15}>
                <h2 style={{ ...DISPLAY, fontSize: isMobile ? '2.4rem' : '3.2rem', lineHeight: 0.93 }}>
                  Moda sin<br />Compromiso
                </h2>
              </Reveal>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <Reveal delay={0.28}>
                  <p style={{ ...MONO, fontSize: '13px', lineHeight: '2', color: 'rgba(10,10,10,0.82)', maxWidth: '340px' }}>
                    En <strong style={{ color: '#0a0a0a' }}>AND&</strong> creemos que cada mujer merece vestir con intención. No seguimos tendencias — las interpretamos, las adaptamos, las hacemos tuyas.
                  </p>
                </Reveal>
                <Reveal delay={0.4}>
                  <p style={{ ...MONO, fontSize: '13px', lineHeight: '2', color: 'rgba(10,10,10,0.82)', maxWidth: '340px' }}>
                    Cada pieza es una <strong style={{ color: '#0a0a0a' }}>declaración de identidad</strong>: elegante, atemporal y absolutamente femenina.
                  </p>
                </Reveal>
              </div>
              <Reveal delay={0.52}>
                <Link
                  to="/productos"
                  style={{ ...MONO, fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', borderBottom: '1px solid rgba(10,10,10,0.35)', paddingBottom: '2px', color: '#0a0a0a', display: 'inline-block', textDecoration: 'none' }}
                >
                  descubrir colección
                </Link>
              </Reveal>
            </div>

            {/* Imágenes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', height: isMobile ? '280px' : '520px' }}>
              <FashionImg src="/home-moda1.png" alt="Colección AND& — estilo" className="w-full h-full" curtainColor="#fafafa" />
              <FashionImg src="/home-moda2.png" alt="Colección AND& — detalle" delay={0.14} className="w-full h-full" curtainColor="#fafafa" />
            </div>
          </div>

          {/* ¿Por qué AND&? */}
          <div style={{ marginTop: isMobile ? '4rem' : '8rem', padding: isMobile ? '0 1.5rem' : '0 4rem' }}>
            <Reveal>
              <div style={{ paddingBottom: '12px', borderBottom: '1px solid rgba(10,10,10,0.1)' }}>
                <span style={{ ...DISPLAY, fontSize: '1rem' }}>¿Por qué And&?</span>
              </div>
            </Reveal>

            {isMobile ? (
              /* Mobile: accordion */
              <div>
                {WHY_ITEMS.map((item, i) => (
                  <div key={item.titulo} style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
                    <button
                      onClick={() => setExpandedItem(expandedItem === i ? null : i)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        width: '100%', padding: '16px 0', background: 'none', border: 'none', cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ ...DISPLAY, fontSize: '1.1rem' }}>{item.titulo}</span>
                      <span style={{ ...MONO, fontSize: '16px', color: 'rgba(10,10,10,0.4)', lineHeight: 1 }}>
                        {expandedItem === i ? '−' : '+'}
                      </span>
                    </button>
                    <div style={{
                      maxHeight: expandedItem === i ? '300px' : '0',
                      overflow: 'hidden',
                      transition: 'max-height 0.38s cubic-bezier(0.25,0.46,0.45,0.94)',
                    }}>
                      <div style={{ paddingBottom: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <p style={{ ...MONO, fontSize: '12px', lineHeight: '1.9', color: 'rgba(10,10,10,0.78)', flex: 1 }}>
                          {item.texto}
                        </p>
                        <img src={item.img} alt={item.titulo}
                          style={{ width: '64px', height: '80px', objectFit: 'cover', filter: 'grayscale(100%) brightness(0.72)', flexShrink: 0 }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Desktop: hover */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
                {WHY_ITEMS.map((item, i) => (
                  <div
                    key={item.titulo}
                    style={{ borderRight: i < 3 ? '1px solid rgba(10,10,10,0.08)' : 'none', position: 'relative' }}
                    onMouseEnter={() => setHoveredItem(i)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <div style={{ padding: '18px 20px', cursor: 'default' }}>
                      <span style={{ ...DISPLAY, fontSize: '1.15rem', opacity: hoveredItem !== null && hoveredItem !== i ? 0.22 : 1, transition: 'opacity 0.3s ease' }}>
                        {item.titulo}
                      </span>
                    </div>
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0,
                      background: '#fafafa',
                      borderTop: '1px solid rgba(10,10,10,0.08)',
                      borderBottom: '1px solid rgba(10,10,10,0.08)',
                      maxHeight: hoveredItem === i ? '240px' : '0',
                      overflow: 'hidden',
                      transition: 'max-height 0.42s cubic-bezier(0.25,0.46,0.45,0.94)',
                      zIndex: 20,
                    }}>
                      <div style={{ padding: '18px 20px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                        <p style={{ ...MONO, fontSize: '11px', lineHeight: '1.9', color: 'rgba(10,10,10,0.80)', flex: 1 }}>{item.texto}</p>
                        <img src={item.img} alt={item.titulo}
                          style={{ width: '76px', height: '96px', objectFit: 'cover', filter: 'grayscale(100%) brightness(0.72)', flexShrink: 0 }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* S4 — Diseñado para las que se atreven */}
        <section style={{ paddingTop: isMobile ? '4rem' : '8rem', paddingBottom: isMobile ? '4rem' : '8rem' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
              <FashionImg
                src="https://picsum.photos/seed/womenfw3/700/900"
                alt="Colección AND& I"
                className="aspect-[3/4] w-full"
                curtainColor="#fafafa"
              />
              {!isMobile && (
                <FashionImg
                  src="https://picsum.photos/seed/womenfw8/700/900"
                  alt="Colección AND& II"
                  delay={0.14}
                  className="aspect-[3/4] w-full"
                  curtainColor="#fafafa"
                />
              )}
            </div>
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center', zIndex: 10,
              pointerEvents: 'none',
              width: '100%',
            }}>
              <h2 style={{
                ...DISPLAY,
                fontSize: isMobile ? 'clamp(2rem, 9vw, 3rem)' : 'clamp(2.4rem, 5.5vw, 4.8rem)',
                lineHeight: 0.93, color: '#ffffff',
                textShadow: '0 2px 28px rgba(0,0,0,0.4)',
              }}>
                Diseñado para<br />las que se atreven
              </h2>
            </div>
          </div>
        </section>

        {/* S5 — parallax editorial */}
        {isMobile ? (
          /* Mobile: layout simple */
          <section style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ padding: '3rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <p style={{ ...MONO, fontSize: '13px', lineHeight: '2', color: 'rgba(10,10,10,0.76)' }}>
                Detrás de cada prenda hay una dedicación absoluta al detalle, al acabado y a la historia que esa pieza narra sobre quien la lleva.
              </p>
              <div style={{ width: '100%', height: '220px', overflow: 'hidden' }}>
                <video autoPlay loop muted playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%) brightness(0.7)', display: 'block' }}
                >
                  <source src="/video/home-mouth.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
            <div style={{ overflow: 'hidden', height: '70vw', minHeight: '260px' }}>
              <img src="/home-editorial.png" alt="AND& colección femenina"
                style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%) brightness(0.7)', display: 'block', objectPosition: 'center top' }}
              />
            </div>
          </section>
        ) : (
          /* Desktop: sticky parallax */
          <section ref={parallaxRef} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '200vh', gap: 0 }}>
            <div style={{ position: 'sticky', top: 0, height: '100vh', alignSelf: 'start', overflow: 'hidden' }}>
              <div style={{
                transform: `translateY(${parallaxProgress * (typeof window !== 'undefined' ? window.innerHeight * 0.55 : 450)}px)`,
                transition: 'transform 0.04s linear', willChange: 'transform',
                padding: '5rem 3.5rem', display: 'flex', flexDirection: 'column', gap: '3rem',
              }}>
                <p style={{ ...MONO, fontSize: '13px', lineHeight: '2', color: 'rgba(10,10,10,0.76)', maxWidth: '300px' }}>
                  Detrás de cada prenda hay una dedicación absoluta al detalle, al acabado y a la historia que esa pieza narra sobre quien la lleva.
                </p>
                <div style={{ width: '240px', height: '240px', overflow: 'hidden', flexShrink: 0 }}>
                  <video autoPlay loop muted playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%) brightness(0.7)', display: 'block' }}
                  >
                    <source src="/video/home-mouth.mp4" type="video/mp4" />
                  </video>
                </div>
              </div>
            </div>
            <div style={{ overflow: 'hidden' }}>
              <img src="/home-editorial.png" alt="AND& colección femenina"
                style={{ width: '100%', height: '100%', minHeight: '200vh', objectFit: 'cover', filter: 'grayscale(100%) brightness(0.7)', display: 'block', objectPosition: 'center top' }}
              />
            </div>
          </section>
        )}
      </div>

      {/* ══════════ CATÁLOGO — oscuro ══════════ */}
      <section style={{
        background: '#111', color: '#fff',
        minHeight: '80vh', padding: '9rem 2.5rem',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <Reveal>
          <span style={{ ...MONO, fontSize: '11px', letterSpacing: '0.45em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.68)', display: 'block', textAlign: 'center', marginBottom: '2.5rem' }}>
            catálogo
          </span>
        </Reveal>
        <Link to="/productos" style={{ display: 'block', lineHeight: 1, textDecoration: 'none' }} className="hover:opacity-70 transition-opacity duration-500">
          <div style={{ ...DISPLAY, fontSize: 'clamp(6rem,19vw,20rem)', lineHeight: 0.88, backgroundImage: 'linear-gradient(135deg,#666 0%,#fff 28%,#bbb 48%,#444 68%,#ddd 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>
            And&
          </div>
        </Link>
        <Reveal delay={0.22}>
          <span style={{ ...MONO, fontSize: '11px', letterSpacing: '0.45em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.68)', display: 'block', textAlign: 'center', marginTop: '2.5rem' }}>
            moda femenina de autor
          </span>
        </Reveal>
        <Link to="/productos" style={{ position: 'absolute', right: '28px', top: '50%', transform: 'translateY(-50%)', ...MONO, fontSize: '11px', letterSpacing: '0.28em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.42)', paddingBottom: '2px', color: '#fff', textDecoration: 'none' }}>
          discover
        </Link>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer style={{ background: '#fafafa', borderTop: '1px solid rgba(10,10,10,0.07)', padding: isMobile ? '2rem 1.5rem' : '2rem 2.5rem' }}>
        <div style={{
          maxWidth: '1152px', margin: '0 auto',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: isMobile ? 'flex-start' : 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: isMobile ? '1rem' : 0,
        }}>
          <span style={{ ...DISPLAY, fontSize: '1.35rem' }}>And&</span>
          <span style={{ ...MONO, fontSize: '10px', letterSpacing: '0.2em', color: 'rgba(10,10,10,0.2)' }}>{new Date().getFullYear()} · Todos los derechos reservados</span>
          <div style={{ display: 'flex', gap: '24px', ...MONO, fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            <Link to="/productos" style={{ color: 'rgba(10,10,10,0.65)', textDecoration: 'none' }}>Catálogo</Link>
            <Link to="/login"     style={{ color: 'rgba(10,10,10,0.65)', textDecoration: 'none' }}>Ingresar</Link>
          </div>
        </div>
      </footer>
    </>
  )
}
