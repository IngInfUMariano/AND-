import { useState, useEffect, useMemo, useRef, useId } from 'react'
import {
    DollarSign, ShoppingCart, Package, Users, AlertTriangle, ArrowRightLeft, TrendingUp,
    Activity, Clock, CheckCircle2, FileText, RefreshCw, Filter, X, ArrowUpRight,
    ArrowDownRight, Minus, XCircle, Truck, Receipt, Boxes, Building2, PackageX,
    Wallet, Flame, Store, Tag, Trash2, ShieldCheck, Layers, PieChart, BarChart3, Briefcase, LayoutDashboard
} from 'lucide-react'
import toast from 'react-hot-toast'

import { useAuth } from '@/context/AuthContext'
import { inventarioService } from '@/services/inventario.service'
import { clienteService } from '@/services/cliente.service'
import { productoService } from '@/services/producto.service'
import { proveedorService } from '@/services/proveedor.service'
import { empleadoService } from '@/services/empleado.service'
import { catalogoService } from '@/services/catalogo.service'

const UMBRAL_STOCK_BAJO = 5
const COBRADOS = ['COMPLETADO', 'ENTREGADO', 'PAGADO', 'FACTURADO', 'CERRADO']
const PENDIENTES = ['PENDIENTE', 'PROCESANDO', 'EN_ESPERA']
const TRASLADO_CERRADO = ['RECIBIDO', 'ANULADO', 'CANCELADO', 'RECHAZADO']
const PALETA = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16']
const COLOR_ESTADO = {
    COMPLETADO: '#10b981', ENTREGADO: '#059669', PENDIENTE: '#f59e0b', PROCESANDO: '#3b82f6',
    ANULADO: '#ef4444', RECHAZADO: '#f43f5e', RECIBIDO: '#10b981', EN_TRANSITO: '#3b82f6',
    DESPACHADO: '#3b82f6', CANCELADO: '#94a3b8', REGISTRADO: '#94a3b8'
}
const ESTADOS_BASE = ['PENDIENTE', 'PROCESANDO', 'COMPLETADO', 'ENTREGADO', 'ANULADO']
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const RANGOS = [
    ['hoy', 'Hoy'], ['7d', 'Últimos 7 días'], ['30d', 'Últimos 30 días'], ['90d', 'Últimos 90 días'],
    ['mes', 'Este mes'], ['12m', 'Últimos 12 meses'], ['personalizado', 'Personalizado']
]
const ETIQUETA_RANGO = Object.fromEntries(RANGOS)
const FILTROS_INICIALES = { rango: '30d', desde: '', hasta: '', agrupar: 'auto', sucursal: '', estado: '', categoria: '' }
const METRICAS = {
    ingresos: { nombre: 'Ingresos', tipo: 'linea', moneda: true, color: '#10b981' },
    brutas: { nombre: 'Ventas brutas', tipo: 'linea', moneda: true, color: '#8b5cf6' },
    pedidos: { nombre: 'Pedidos', tipo: 'barra', moneda: false, color: '#3b82f6' },
    ticket: { nombre: 'Ticket promedio', tipo: 'linea', moneda: true, color: '#f59e0b' }
}

const reqOpts = { page: 1, limit: 1000 }
const PETICIONES = {
    pedidos: () => inventarioService.listarPedidos(reqOpts),
    existencias: () => inventarioService.listar(reqOpts),
    movimientos: () => inventarioService.obtenerKardex(reqOpts),
    traslados: () => inventarioService.listarTraslados({ page: 1, limit: 300 }),
    sucursales: () => inventarioService.listarSucursales(),
    clientes: () => clienteService.listarClientes({ page: 1, limit: 500 }),
    pendientes: () => clienteService.listarPendientes({ page: 1, limit: 500 }),
    categorias: () => catalogoService.listar('categorias', { page: 1, limit: 200 }),
    productos: () => productoService.listarProductos({ page: 1, limit: 500 }),
    proveedores: () => proveedorService.listarProveedores({ page: 1, limit: 500 }),
    empleados: () => empleadoService.listarEmpleados({ page: 1, limit: 500 })
}
const NECESARIAS = {
    admin: Object.keys(PETICIONES),
    bodega: ['pedidos', 'existencias', 'movimientos', 'traslados', 'sucursales', 'categorias', 'clientes'],
    vendedor: ['pedidos', 'clientes', 'sucursales', 'existencias']
}
// Datos de apoyo (solo sirven para traducir ids a nombres): si el rol no tiene permiso, no se muestra alerta
const OPCIONALES = { admin: [], bodega: ['clientes'], vendedor: ['existencias'] }
const NOMBRE_DATASET = {
    pedidos: 'pedidos', existencias: 'existencias', movimientos: 'movimientos', traslados: 'traslados',
    sucursales: 'sucursales', clientes: 'clientes', pendientes: 'clientes pendientes', categorias: 'categorías',
    productos: 'productos', proveedores: 'proveedores', empleados: 'empleados'
}

const safeNumber = (val) => (Number.isFinite(Number(val)) ? Number(val) : 0)
const normalizar = (val) => String(val ?? '').toUpperCase()
const formatQ = (val) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(safeNumber(val))
const formatNum = (val) => new Intl.NumberFormat('es-GT', { maximumFractionDigits: 0 }).format(safeNumber(val))
const formatPct = (val) => `${safeNumber(val).toFixed(1)}%`
const formatQCorto = (v) => {
    const n = safeNumber(v)
    if (Math.abs(n) >= 1000000) return `Q${(n / 1000000).toLocaleString('es-GT', { maximumFractionDigits: 1 })}M`
    if (Math.abs(n) >= 1000) return `Q${(n / 1000).toLocaleString('es-GT', { maximumFractionDigits: 1 })}k`
    return `Q${Math.round(n)}`
}
const formatNumCorto = (v) => {
    const n = safeNumber(v)
    if (Math.abs(n) >= 1000) return `${(n / 1000).toLocaleString('es-GT', { maximumFractionDigits: 1 })}k`
    return String(Math.round(n * 10) / 10)
}
const suma = (lista, fn) => lista.reduce((s, x) => s + safeNumber(fn(x)), 0)
const colorEstado = (e, i = 0) => COLOR_ESTADO[e] || PALETA[i % PALETA.length]

const aFecha = (v) => {
    if (!v) return null
    const parseable = typeof v === 'string' ? v.replace(' ', 'T') : v
    const d = new Date(parseable)
    return Number.isNaN(d.getTime()) ? null : d
}
const inicioDia = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const finDia = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }
const sumarDias = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const claveLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const desdeInput = (v) => {
    if (!v) return null
    const d = new Date(`${v}T00:00:00`)
    return Number.isNaN(d.getTime()) ? null : d
}

const extraerData = (res) => {
    if (!res || res.status !== 'fulfilled') return []
    const v = res.value
    for (const c of [v, v?.rows, v?.data, v?.data?.rows, v?.data?.datos, v?.datos, v?.items, v?.results]) {
        if (Array.isArray(c)) return c
    }
    return []
}
const extraerTotal = (res) => {
    if (!res || res.status !== 'fulfilled') return 0
    const v = res.value
    const total = [v?.count, v?.total, v?.data?.count, v?.data?.total, v?.meta?.total]
        .map(Number).find((n) => Number.isFinite(n) && n >= 0)
    return total ?? extraerData(res).length
}

const calcularRango = (f) => {
    const hoy = new Date()
    let desde
    let hasta = finDia(hoy)
    switch (f.rango) {
        case 'hoy': desde = inicioDia(hoy); break
        case '7d': desde = inicioDia(sumarDias(hoy, -6)); break
        case '90d': desde = inicioDia(sumarDias(hoy, -89)); break
        case '12m': desde = inicioDia(sumarDias(hoy, -364)); break
        case 'mes': desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1); break
        case 'personalizado': {
            desde = desdeInput(f.desde) || inicioDia(sumarDias(hoy, -29))
            const h = desdeInput(f.hasta)
            if (h) hasta = finDia(h)
            if (desde > hasta) { const t = desde; desde = inicioDia(hasta); hasta = finDia(t) }
            break
        }
        default: desde = inicioDia(sumarDias(hoy, -29))
    }
    const dias = Math.max(1, Math.round((inicioDia(hasta) - inicioDia(desde)) / 86400000) + 1)
    const prevHasta = finDia(sumarDias(desde, -1))
    const prevDesde = inicioDia(sumarDias(desde, -dias))
    return { desde, hasta, dias, prevDesde, prevHasta }
}

const agrupacionEfectiva = (elegida, dias) => {
    let a = elegida
    if (a === 'auto') a = dias <= 31 ? 'dia' : dias <= 120 ? 'semana' : 'mes'
    if (a === 'dia' && dias > 366) a = 'semana'
    if (a === 'dia' && dias <= 1) a = 'hora'
    return a
}
const pad2 = (n) => String(n).padStart(2, '0')
const claveMes = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
const claveBucket = (fecha, agr) => {
    if (agr === 'hora') return `${claveLocal(fecha)}T${pad2(fecha.getHours())}`
    if (agr === 'mes') return claveMes(fecha)
    if (agr === 'semana') return claveLocal(sumarDias(inicioDia(fecha), -((fecha.getDay() + 6) % 7)))
    return claveLocal(fecha)
}
const capitalizar = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const nombreMes = (d) => capitalizar(d.toLocaleDateString('es-GT', { month: 'long', year: 'numeric' }))

const etiquetasBucket = (fecha, agr, dias) => {
    const mes = { mesClave: claveMes(fecha), mesNombre: nombreMes(fecha) }
    if (agr === 'hora') {
        const dia = capitalizar(fecha.toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long' }))
        return { name: `${pad2(fecha.getHours())}h`, etiqueta: `${dia}, ${pad2(fecha.getHours())}:00`, ...mes }
    }
    if (agr === 'mes') {
        return { name: fecha.toLocaleDateString('es-GT', { month: 'short', year: '2-digit' }), etiqueta: nombreMes(fecha), ...mes }
    }
    if (agr === 'semana') {
        const ini = sumarDias(inicioDia(fecha), -((fecha.getDay() + 6) % 7))
        return {
            name: ini.toLocaleDateString('es-GT', { day: 'numeric', month: 'short' }),
            etiqueta: `Semana del ${ini.toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' })}`,
            mesClave: claveMes(ini), mesNombre: nombreMes(ini)
        }
    }
    return {
        name: dias <= 7 ? fecha.toLocaleDateString('es-GT', { weekday: 'short' }) : String(fecha.getDate()),
        etiqueta: capitalizar(fecha.toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })),
        ...mes
    }
}
const crearBuckets = (desde, hasta, agr, dias) => {
    const out = []
    const vistos = new Set()
    let cur = inicioDia(desde)
    let guardia = 0
    while (cur <= hasta && guardia < 4000) {
        const clave = claveBucket(cur, agr)
        if (!vistos.has(clave)) {
            vistos.add(clave)
            out.push({ clave, ...etiquetasBucket(cur, agr, dias) })
        }
        if (agr === 'hora') { cur = new Date(cur); cur.setHours(cur.getHours() + 1) } else cur = sumarDias(cur, 1)
        guardia++
    }
    return out
}

const variacion = (actual, previo) => {
    if (previo > 0) return ((actual - previo) / previo) * 100
    return actual > 0 ? null : 0
}

const crearEscala = (maxValor, minimo = 4, divisiones = 4) => {
    const max = Math.max(safeNumber(maxValor), minimo)
    const bruto = max / divisiones
    const magnitud = Math.pow(10, Math.floor(Math.log10(bruto || 1)))
    const norm = bruto / magnitud
    const paso = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * magnitud
    const cuenta = Math.max(1, Math.ceil(max / paso - 1e-9))
    const ticks = Array.from({ length: cuenta + 1 }, (_, i) => i * paso)
    return { ticks, tope: ticks[ticks.length - 1] }
}

const textoValido = (v) => (typeof v === 'string' && v.trim() ? v.trim() : '')

// Nombre legible de un cliente/empleado/usuario: busca en el objeto y en los anidados (persona, usuario...)
const nombreCliente = (c) => {
    if (!c) return ''
    if (typeof c === 'string') return textoValido(c)
    if (typeof c !== 'object') return ''
    const fuentes = [c, c.persona, c.usuario, c.user].filter((x) => x && typeof x === 'object')
    for (const f of fuentes) {
        const compuesto = [f.nombres ?? f.nombre ?? f.primer_nombre, f.apellidos ?? f.apellido ?? f.primer_apellido]
            .map(textoValido).filter(Boolean).join(' ')
        const n = textoValido(f.nombre_completo) || textoValido(f.razon_social) || textoValido(f.nombre_comercial) || compuesto
        if (n) return n
    }
    // Sin nombre: lo más útil para un administrador es un dato de contacto, no un id
    for (const f of fuentes) {
        const alt = textoValido(f.email) || textoValido(f.correo) || (f.nit ? `NIT ${f.nit}` : '') || textoValido(f.telefono)
        if (alt) return alt
    }
    return ''
}

// El token JWT se guarda al iniciar sesión (ver api.js): sirve de respaldo si el usuario del contexto viene sin nombre
const leerPayloadToken = () => {
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token')
        const parte = token ? token.split('.')[1] : null
        if (!parte) return null
        const b64 = parte.replace(/-/g, '+').replace(/_/g, '/')
        const json = decodeURIComponent(atob(b64).split('').map((ch) => `%${`00${ch.charCodeAt(0).toString(16)}`.slice(-2)}`).join(''))
        const payload = JSON.parse(json)
        return payload && typeof payload === 'object' ? payload : null
    } catch {
        return null
    }
}

const nombreVisibleUsuario = (usr) => {
    if (typeof usr === 'string' && usr.trim()) return usr.trim()
    const payload = leerPayloadToken()
    const fuentes = [usr, usr?.user, usr?.usuario, usr?.empleado, usr?.persona, usr?.data, payload, payload?.user, payload?.usuario]
        .filter((f) => f && typeof f === 'object')
    for (const f of fuentes) {
        const compuesto = [f.nombres ?? f.nombre ?? f.primer_nombre, f.apellidos ?? f.apellido ?? f.primer_apellido]
            .map(textoValido).filter(Boolean).join(' ')
        const n = textoValido(f.nombre_completo) || textoValido(f.nombreCompleto) || textoValido(f.full_name) ||
            textoValido(f.fullName) || textoValido(f.displayName) || textoValido(f.name) || compuesto
        if (n) return n
    }
    for (const f of fuentes) {
        const alt = textoValido(f.username) || textoValido(f.user_name) || textoValido(f.email) || textoValido(f.correo) ||
            textoValido(f.correo_electronico) || textoValido(f.mail) || (textoValido(f.sub).includes('@') ? textoValido(f.sub) : '')
        if (alt) return alt
    }
    return 'Usuario'
}

const nombreProducto = (o, ctx) => {
    const varId = o?.variante_id ?? o?.variante?.id
    const prodId = o?.producto_id ?? o?.variante?.producto_id ?? o?.producto?.id
    return (
        o?.variante?.producto?.nombre || o?.producto?.nombre || o?.nombre_producto || o?.producto_nombre ||
        (varId != null ? ctx?.mapaVar?.[String(varId)] : '') ||
        (prodId != null ? ctx?.mapaProd?.[String(prodId)] : '') ||
        o?.nombre || o?.descripcion || o?.variante?.nombre || o?.variante?.sku || 'Producto sin nombre'
    )
}

const normalizarPedido = (p, ctx) => {
    const sucId = p.sucursal_id ?? p.sucursal?.id
    const cliId = p.cliente_id ?? p.cliente?.id
    const items = [p.detalles, p.items, p.pedido_detalles, p.pedidoDetalles, p.lineas].find(Array.isArray) || []
    return {
        id: p.id,
        ref: p.correlativo || p.numero || p.codigo || '',
        estado: normalizar(p.estado) || 'REGISTRADO',
        total: safeNumber(p.total ?? p.monto_total ?? p.total_pedido),
        fecha: aFecha(p.createdAt ?? p.created_at ?? p.fecha),
        sucursalId: sucId != null ? String(sucId) : '',
        sucursalNombre: p.sucursal?.nombre,
        clienteId: cliId != null ? String(cliId) : '',
        cliente: nombreCliente(p.cliente) || textoValido(p.cliente_nombre) || textoValido(p.nombre_cliente) ||
            (cliId != null ? ctx?.mapaCli?.[String(cliId)] : '') ||
            (cliId != null ? 'Cliente sin nombre' : 'Consumidor final'),
        vendedorIds: [p.vendedor_id, p.empleado_id, p.usuario_id, p.created_by, p.vendedor?.id, p.empleado?.id, p.usuario?.id]
            .filter((v) => v != null).map(String),
        items: items.filter(Boolean).map((d) => {
            const cantidad = safeNumber(d.cantidad)
            return {
                nombre: nombreProducto(d, ctx),
                cantidad,
                subtotal: safeNumber(d.subtotal ?? d.total ?? cantidad * safeNumber(d.precio_unitario ?? d.precio))
            }
        })
    }
}

const normalizarExistencia = (e, mapaCat, ctx) => {
    const qty = safeNumber(e.cantidad_fisica ?? e.cantidad)
    const costo = safeNumber(e.costo_promedio ?? e.variante?.costo_promedio)
    const minRaw = safeNumber(e.stock_minimo ?? e.variante?.stock_minimo ?? e.variante?.producto?.stock_minimo)
    const catId = e.variante?.producto?.categoria_id ?? e.producto?.categoria_id ?? e.categoria_id ?? e.variante?.producto?.categoria?.id
    const sucId = e.sucursal_id ?? e.sucursal?.id
    return {
        nombre: nombreProducto(e, ctx),
        detalle: [e.variante?.talla?.nombre, e.variante?.color?.nombre].filter(Boolean).join(' · '),
        qty,
        min: minRaw > 0 ? minRaw : UMBRAL_STOCK_BAJO,
        valor: qty * costo,
        sucursalId: sucId != null ? String(sucId) : '',
        sucursalNombre: e.sucursal?.nombre,
        categoriaId: catId != null ? String(catId) : '',
        categoria: e.variante?.producto?.categoria?.nombre ?? (catId != null ? mapaCat[String(catId)] : undefined) ?? 'Sin categoría'
    }
}

const normalizarMovimiento = (m, ctx) => {
    const tipo = normalizar(m.tipo)
    const sucId = m.sucursal_id ?? m.sucursal?.id
    return {
        tipo,
        nombre: nombreProducto(m, ctx),
        cantidad: safeNumber(m.cantidad),
        costo: safeNumber(m.costo_unitario ?? m.variante?.costo_promedio),
        fecha: aFecha(m.fecha ?? m.createdAt ?? m.created_at),
        sucursalId: sucId != null ? String(sucId) : '',
        motivo: m.motivo || 'Sin motivo',
        esEntrada: tipo.startsWith('ENTRADA'),
        esSalida: tipo.startsWith('SALIDA'),
        esMerma: tipo.includes('MERMA'),
        esCompra: tipo === 'ENTRADA_COMPRA'
    }
}

const normalizarTraslado = (t) => {
    const o = t.sucursal_origen_id ?? t.origen_id ?? t.sucursal_origen?.id ?? t.origen?.id
    const d = t.sucursal_destino_id ?? t.destino_id ?? t.sucursal_destino?.id ?? t.destino?.id
    return {
        id: t.id,
        ref: t.correlativo || t.numero || t.codigo || '',
        estado: normalizar(t.estado) || 'REGISTRADO',
        fecha: aFecha(t.createdAt ?? t.created_at ?? t.fecha),
        origenId: o != null ? String(o) : '',
        destinoId: d != null ? String(d) : '',
        origenNombre: t.sucursal_origen?.nombre ?? t.origen?.nombre,
        destinoNombre: t.sucursal_destino?.nombre ?? t.destino?.nombre
    }
}

function useAncho() {
    const ref = useRef(null)
    const [ancho, setAncho] = useState(0)
    useEffect(() => {
        const el = ref.current
        if (!el) return undefined
        const medir = () => setAncho(el.clientWidth)
        medir()
        if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', medir)
            return () => window.removeEventListener('resize', medir)
        }
        const ro = new ResizeObserver(medir)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])
    return [ref, ancho]
}

function SinDatos({ texto = 'Sin datos para los filtros seleccionados', altura = 120 }) {
    return (
        <div className="flex items-center justify-center text-center text-xs text-muted-foreground" style={{ minHeight: altura }}>
            {texto}
        </div>
    )
}

function Tarjeta({ titulo, icono: Icono, children, className = '', derecha }) {
    return (
        <section className={`bg-card border rounded-2xl p-4 md:p-6 shadow-sm flex flex-col min-w-0 w-full ${className}`}>
            <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    {Icono && <Icono size={16} className="text-primary" />}
                    {titulo}
                </h3>
                {derecha}
            </div>
            {children}
        </section>
    )
}

function GraficoCartesiano({ datos, series, formatoY, formatoValor, altura = 300, minimoEscala = 4 }) {
    const [ref, ancho] = useAncho()
    const [activo, setActivo] = useState(null)
    const [ocultas, setOcultas] = useState([])
    const uid = useId().replace(/[^a-zA-Z0-9]/g, '')

    const n = datos.length
    const visibles = series.filter((s) => !ocultas.includes(s.clave))
    const barras = visibles.filter((s) => s.tipo === 'barra')
    const lineas = visibles.filter((s) => s.tipo !== 'barra')

    let maxVal = 0;
    visibles.forEach((s) => {
        datos.forEach((d) => {
            const val = safeNumber(d[s.clave]);
            if (val > maxVal) maxVal = val;
        });
    });

    const { ticks, tope } = crearEscala(maxVal, minimoEscala)
    const etiquetasY = ticks.map((t) => formatoY(t))
    const margen = { top: 12, right: 14, bottom: 28, left: Math.max(...etiquetasY.map((e) => e.length), 1) * 6.5 + 14 }
    const w = Math.max(ancho - margen.left - margen.right, 0)
    const h = altura - margen.top - margen.bottom
    const banda = n > 0 ? w / n : 0
    const posX = (i) => margen.left + banda * (i + 0.5)
    const posY = (v) => margen.top + h - (safeNumber(v) / tope) * h
    const paso = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(w / 58))))

    const trazo = (clave) => {
        const pts = datos.map((d, i) => ({ x: posX(i), y: posY(d[clave]) }))
        const linea = pts.reduce((acc, p, i) => {
            if (i === 0) return `M ${p.x} ${p.y}`
            const q = pts[i - 1]
            const mx = (q.x + p.x) / 2
            return `${acc} C ${mx} ${q.y}, ${mx} ${p.y}, ${p.x} ${p.y}`
        }, '')
        const area = pts.length ? `${linea} L ${pts[pts.length - 1].x} ${margen.top + h} L ${pts[0].x} ${margen.top + h} Z` : ''
        return { pts, linea, area }
    }

    const indiceDesde = (e) => {
        const r = e.currentTarget.getBoundingClientRect()
        return Math.min(n - 1, Math.max(0, Math.floor((e.clientX - r.left) / (banda || 1))))
    }
    const alternar = (clave) =>
        setOcultas((o) => (o.includes(clave) ? o.filter((c) => c !== clave) : o.length >= series.length - 1 ? o : [...o, clave]))

    if (n === 0) return <SinDatos />

    const grupo = Math.min(banda * 0.72, 30 * Math.max(barras.length, 1) + 14)
    const anchoBarra = barras.length ? grupo / barras.length : 0
    const datoActivo = activo !== null ? datos[activo] : null

    return (
        <div className="w-full">
            {series.length > 1 && (
                <div className="flex flex-wrap gap-3 mb-3">
                    {series.map((s) => (
                        <button
                            key={s.clave} type="button" onClick={() => alternar(s.clave)}
                            className={`flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-opacity ${ocultas.includes(s.clave) ? 'opacity-40 line-through' : ''}`}
                            aria-pressed={!ocultas.includes(s.clave)}
                        >
                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                            {s.nombre}
                        </button>
                    ))}
                </div>
            )}
            <div ref={ref} className="relative w-full text-muted-foreground" style={{ height: altura }}>
                {ancho > 0 && (
                    <svg width={ancho} height={altura} role="img" aria-label="Gráfico" className="block overflow-visible">
                        <defs>
                            {lineas.filter((s) => s.area).map((s) => (
                                <linearGradient key={s.clave} id={`${uid}-${s.clave}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={s.color} stopOpacity="0.25" />
                                    <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                                </linearGradient>
                            ))}
                        </defs>

                        {ticks.map((t, i) => (
                            <g key={t}>
                                <line x1={margen.left} x2={margen.left + w} y1={posY(t)} y2={posY(t)} stroke="currentColor" strokeOpacity="0.15" strokeDasharray="3 3" />
                                <text x={margen.left - 8} y={posY(t) + 4} textAnchor="end" fontSize="11" fill="currentColor">{etiquetasY[i]}</text>
                            </g>
                        ))}

                        {datos.map((d, i) => (i % paso === 0 ? (
                            <text key={d.clave ?? i} x={posX(i)} y={altura - 8} textAnchor="middle" fontSize="11" fill="currentColor">{d.name}</text>
                        ) : null))}

                        {barras.map((s, j) => datos.map((d, i) => {
                            const v = safeNumber(d[s.clave])
                            if (v <= 0) return null
                            return (
                                <rect
                                    key={`${s.clave}-${d.clave ?? i}`}
                                    x={posX(i) - grupo / 2 + j * anchoBarra + 1} y={posY(v)}
                                    width={Math.max(anchoBarra - 2, 1)} height={Math.max(margen.top + h - posY(v), 0)} rx="3"
                                    fill={s.color} fillOpacity={activo === null || activo === i ? 1 : 0.45}
                                />
                            )
                        }))}

                        {lineas.map((s) => {
                            const { pts, linea, area } = trazo(s.clave)
                            return (
                                <g key={s.clave}>
                                    {s.area && <path d={area} fill={`url(#${uid}-${s.clave})`} />}
                                    <path d={linea} fill="none" stroke={s.color} strokeWidth={s.dash ? 2 : 3} strokeDasharray={s.dash ? '5 4' : undefined} strokeLinecap="round" strokeLinejoin="round" />
                                    {!s.dash && pts.map((p, i) => (n <= 45 || activo === i) && (
                                        <circle key={datos[i].clave ?? i} cx={p.x} cy={p.y} r={activo === i ? 6 : 4} fill={s.color} stroke="#fff" strokeWidth="2" />
                                    ))}
                                </g>
                            )
                        })}

                        {activo !== null && (
                            <line x1={posX(activo)} x2={posX(activo)} y1={margen.top} y2={margen.top + h} stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
                        )}

                        <rect
                            x={margen.left} y={margen.top} width={w} height={h} fill="transparent"
                            onPointerMove={(e) => setActivo(indiceDesde(e))}
                            onPointerDown={(e) => setActivo(indiceDesde(e))}
                            onPointerLeave={() => setActivo(null)}
                        />
                    </svg>
                )}

                {datoActivo && (
                    <div
                        className="pointer-events-none absolute z-10 min-w-[140px] rounded-xl border bg-card px-3 py-2 text-xs shadow-lg"
                        style={{ left: Math.min(Math.max(posX(activo), 90), Math.max(ancho - 90, 90)), top: margen.top, transform: 'translateX(-50%)' }}
                    >
                        <p className="font-semibold capitalize text-foreground mb-1">{datoActivo.etiqueta ?? datoActivo.name}</p>
                        {visibles.map((s) => (
                            <p key={s.clave} className="flex items-center justify-between gap-3 font-bold" style={{ color: s.color }}>
                                <span>{s.nombre}</span>
                                <span>{formatoValor(datoActivo[s.clave], s)}</span>
                            </p>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function Dona({ items, formatoValor = formatNum, centroTitulo, centroValor, activoId, onSeleccionar }) {
    const [hover, setHover] = useState(null)
    const lista = items.filter((i) => i.valor > 0)
    const total = lista.reduce((s, i) => s + i.valor, 0)
    if (total <= 0) return <SinDatos />
    const R = 56
    const C = 2 * Math.PI * R
    let acum = 0
    const enHover = lista.find((i) => i.id === hover)

    return (
        <div className="flex flex-col sm:flex-row lg:flex-col 2xl:flex-row items-center gap-4">
            <svg viewBox="0 0 160 160" className="h-40 w-40 shrink-0 text-muted-foreground" role="img" aria-label="Gráfico de dona">
                <circle cx="80" cy="80" r={R} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="22" />
                {lista.map((it) => {
                    const len = (it.valor / total) * C
                    const off = -acum
                    acum += len
                    const resaltado = activoId === it.id || hover === it.id
                    return (
                        <circle
                            key={it.id} cx="80" cy="80" r={R} fill="none" stroke={it.color}
                            strokeWidth={resaltado ? 27 : 22} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={off}
                            transform="rotate(-90 80 80)" opacity={activoId && activoId !== it.id ? 0.35 : 1}
                            className={onSeleccionar ? 'cursor-pointer transition-all' : 'transition-all'}
                            onMouseEnter={() => setHover(it.id)} onMouseLeave={() => setHover(null)}
                            onClick={() => onSeleccionar && onSeleccionar(it.id)}
                        />
                    )
                })}
                <text x="80" y="76" textAnchor="middle" fontSize="11" fill="currentColor">
                    {enHover ? enHover.etiqueta : centroTitulo}
                </text>
                <text x="80" y="95" textAnchor="middle" fontSize="16" fontWeight="800" className="fill-foreground">
                    {enHover ? formatPct((enHover.valor / total) * 100) : centroValor}
                </text>
            </svg>
            <ul className="flex-1 w-full min-w-0 flex flex-col gap-1">
                {lista.map((it) => (
                    <li key={it.id}>
                        <button
                            type="button" disabled={!onSeleccionar} onClick={() => onSeleccionar && onSeleccionar(it.id)}
                            onMouseEnter={() => setHover(it.id)} onMouseLeave={() => setHover(null)}
                            className={`w-full flex items-center gap-2 rounded-lg px-2 py-1 text-xs text-left transition-colors ${onSeleccionar ? 'hover:bg-muted/40' : ''} ${activoId === it.id ? 'bg-muted/60 font-bold' : ''}`}
                        >
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: it.color }} />
                            <span className="flex-1 truncate text-foreground">{it.etiqueta}</span>
                            <span className="font-bold text-foreground">{formatoValor(it.valor)}</span>
                            <span className="w-12 text-right text-muted-foreground">{formatPct((it.valor / total) * 100)}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    )
}

function BarrasH({ items, formato = formatNum, color = '#3b82f6', activoId, onSeleccionar, vacio }) {
    const lista = items.filter((i) => i.valor > 0)
    if (lista.length === 0) return <SinDatos texto={vacio} />
    const max = Math.max(...lista.map((i) => i.valor), 1)
    return (
        <ul className="flex flex-col gap-2.5">
            {lista.map((it, idx) => {
                const Fila = onSeleccionar ? 'button' : 'div'
                return (
                    <li key={it.id}>
                        <Fila
                            {...(onSeleccionar ? { type: 'button', onClick: () => onSeleccionar(it.id) } : {})}
                            className={`w-full text-left group ${activoId && activoId !== it.id ? 'opacity-45' : ''}`}
                            title={`${it.etiqueta}: ${formato(it.valor)}`}
                        >
                            <div className="flex items-center justify-between gap-2 text-xs mb-1">
                                <span className="truncate font-medium text-foreground">{it.etiqueta}</span>
                                <span className="font-bold text-foreground shrink-0">{formato(it.valor)}</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${Math.max((it.valor / max) * 100, 2)}%`, background: it.color || (idx === 0 ? color : color), opacity: idx === 0 ? 1 : 0.85 }} />
                            </div>
                        </Fila>
                    </li>
                )
            })}
        </ul>
    )
}

function MapaCalor({ matriz }) {
    const max = Math.max(0, ...matriz.flat())
    if (max <= 0) return <SinDatos />
    return (
        <div className="overflow-x-auto">
            <div className="min-w-[460px]">
                <div className="grid gap-[3px]" style={{ gridTemplateColumns: '34px repeat(24, minmax(0, 1fr))' }}>
                    <span />
                    {Array.from({ length: 24 }, (_, hh) => (
                        <span key={hh} className="text-[9px] text-center text-muted-foreground">{hh % 3 === 0 ? hh : ''}</span>
                    ))}
                    {matriz.map((fila, d) => (
                        <div key={DIAS_SEMANA[d]} className="contents">
                            <span className="text-[10px] font-semibold text-muted-foreground flex items-center">{DIAS_SEMANA[d]}</span>
                            {fila.map((v, hh) => (
                                <span
                                    key={hh} title={`${DIAS_SEMANA[d]} ${String(hh).padStart(2, '0')}:00 — ${v} pedido(s)`}
                                    className="h-5 rounded-[3px]"
                                    style={{ background: v > 0 ? `rgba(16,185,129,${0.15 + 0.85 * (v / max)})` : 'rgba(148,163,184,0.14)' }}
                                />
                            ))}
                        </div>
                    ))}
                </div>
                <div className="flex items-center justify-end gap-2 mt-3 text-[10px] text-muted-foreground">
                    Menos
                    {[0.15, 0.4, 0.65, 1].map((o) => <span key={o} className="h-3 w-5 rounded-[3px]" style={{ background: `rgba(16,185,129,${o})` }} />)}
                    Más
                </div>
            </div>
        </div>
    )
}

function Sparkline({ valores, color }) {
    if (!valores || valores.length < 2) return null
    const max = Math.max(...valores, 0)
    const min = Math.min(...valores, 0)
    const rango = max - min || 1
    const pts = valores.map((v, i) => `${(i / (valores.length - 1)) * 80},${26 - ((v - min) / rango) * 22}`).join(' ')
    return (
        <svg width="80" height="28" viewBox="0 0 80 28" aria-hidden="true" className="shrink-0">
            <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function Progreso({ etiqueta, valor, buenoSiAlto = true, detalle }) {
    const v = Math.min(100, Math.max(0, safeNumber(valor)))
    const bueno = buenoSiAlto ? v >= 80 : v <= 5
    const medio = buenoSiAlto ? v >= 50 : v <= 15
    const color = bueno ? '#10b981' : medio ? '#f59e0b' : '#ef4444'
    return (
        <div>
            <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-foreground">{etiqueta}</span>
                <span className="font-bold text-foreground">{formatPct(v)}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full transition-all" style={{ width: `${v}%`, background: color }} />
            </div>
            {detalle && <p className="text-[10px] text-muted-foreground mt-1">{detalle}</p>}
        </div>
    )
}

function Kpi({ titulo, valor, subtitulo, icono: Icono, color, bg, delta, buenoSiSube = true, spark, sparkColor }) {
    let chip = null
    if (delta !== undefined) {
        if (delta === null) {
            chip = <span className="text-[10px] font-bold text-blue-600 bg-blue-500/10 rounded px-1.5 py-0.5">Nuevo</span>
        } else {
            const cero = Math.abs(delta) < 0.05
            const bueno = (delta > 0) === buenoSiSube
            const Flecha = cero ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight
            chip = (
                <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold rounded px-1.5 py-0.5 ${cero ? 'text-muted-foreground bg-muted' : bueno ? 'text-emerald-700 bg-emerald-500/10' : 'text-rose-700 bg-rose-500/10'}`}>
                    <Flecha size={11} />{formatPct(Math.abs(delta))}
                </span>
            )
        }
    }
    return (
        <div className="bg-card border rounded-2xl p-5 shadow-sm flex items-center justify-between gap-3 min-w-0 h-full">
            <div className="min-w-0 flex-1">
                <p className="text-[10px] md:text-[11px] font-bold uppercase text-muted-foreground tracking-wider mb-1">{titulo}</p>
                <h3 className="text-2xl md:text-3xl lg:text-2xl 2xl:text-3xl font-black text-foreground mb-0.5 truncate" title={String(valor)}>{valor}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                    {chip}
                    <p className="text-[11px] md:text-xs text-muted-foreground">{subtitulo}</p>
                </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
                <div className={`p-3 rounded-xl ${bg} ${color}`}><Icono size={22} /></div>
                <Sparkline valores={spark} color={sparkColor || '#94a3b8'} />
            </div>
        </div>
    )
}

function EstadoChip({ estado }) {
    const error = ['ANULADO', 'RECHAZADO', 'CANCELADO'].includes(estado)
    const exito = ['COMPLETADO', 'ENTREGADO', 'RECIBIDO'].includes(estado)
    return (
        <span className={`px-2 py-0.5 rounded font-bold text-[9px] border ${error ? 'border-rose-200 bg-rose-500/10 text-rose-700' : exito ? 'border-emerald-200 bg-emerald-500/10 text-emerald-700' : 'border-blue-200 bg-blue-500/10 text-blue-700'}`}>
            {estado}
        </span>
    )
}

function Tabla({ columnas, filas, vacio = 'No hay registros para mostrar.' }) {
    if (filas.length === 0) return <SinDatos texto={vacio} />
    return (
        <div className="overflow-auto max-h-[340px] custom-scrollbar -mx-4 md:-mx-6">
            <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-muted/30 border-y text-[10px] font-bold text-muted-foreground uppercase tracking-wider sticky top-0 backdrop-blur-md">
                    <tr>
                        {columnas.map((c) => <th key={c.titulo} className={`px-4 py-3 ${c.alinear === 'right' ? 'text-right' : c.alinear === 'center' ? 'text-center' : ''}`}>{c.titulo}</th>)}
                    </tr>
                </thead>
                <tbody className="divide-y text-xs">
                    {filas.map((f, i) => (
                        <tr key={`${f.key ?? 'fila'}-${i}`} className="hover:bg-muted/20 transition-colors">
                            {columnas.map((c) => (
                                <td key={c.titulo} className={`px-4 py-3 ${c.alinear === 'right' ? 'text-right font-bold' : c.alinear === 'center' ? 'text-center' : ''} ${c.mono ? 'font-mono font-bold' : ''} text-foreground`}>
                                    {c.render(f)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function Campo({ etiqueta, children }) {
    return (
        <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {etiqueta}
            {children}
        </label>
    )
}
const CLASE_CONTROL = 'h-9 rounded-lg border bg-card px-2.5 text-xs font-medium normal-case tracking-normal text-foreground outline-none focus:ring-2 focus:ring-primary/30'

export default function DashboardPage() {
    const { usuario } = useAuth()

    const rolUsuario = normalizar(usuario?.perfil || usuario?.rol || 'ADMIN')

    const nombreUsuario = useMemo(() => nombreVisibleUsuario(usuario), [usuario])

    const esAdmin = rolUsuario === 'ADMIN' || rolUsuario === 'GERENTE'
    const esBodega = rolUsuario === 'BODEGUERO' || rolUsuario === 'BODEGA'
    const vista = esAdmin ? 'admin' : esBodega ? 'bodega' : 'vendedor'
    const claveUsuario = usuario ? String(usuario.id ?? usuario.email ?? 'u') : null
    const misIds = [usuario?.id, usuario?.empleado_id, usuario?.empleado?.id].filter((v) => v != null).map(String).join(',')

    const [datos, setDatos] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [fallidas, setFallidas] = useState([])
    const [recarga, setRecarga] = useState(0)
    const [actualizado, setActualizado] = useState(null)
    const [filtros, setFiltros] = useState(FILTROS_INICIALES)
    const [metrica, setMetrica] = useState('ingresos')
    const [seccion, setSeccion] = useState('resumen')

    // Si el usuario del contexto no trae nombre ni correo, se busca su ficha en empleados (solo coincidencias seguras)
    const nombreEmpleado = useMemo(() => {
        if (!datos?.empleados || !usuario || typeof usuario !== 'object') return ''
        const idEmp = usuario.empleado_id ?? usuario.empleado?.id
        const correo = textoValido(usuario.email) || textoValido(usuario.correo)
        const e = extraerData(datos.empleados).find((x) => x && (
            (idEmp != null && String(x.id) === String(idEmp)) ||
            (usuario.id != null && x.usuario_id != null && String(x.usuario_id) === String(usuario.id)) ||
            (correo && (x.email === correo || x.correo === correo))
        ))
        return e ? nombreCliente(e) : ''
    }, [datos, usuario])
    const nombreMostrado = nombreUsuario !== 'Usuario' ? nombreUsuario : (nombreEmpleado || 'Usuario')

    const setFiltro = (campo, valor) => setFiltros((f) => ({ ...f, [campo]: valor }))
    const alternarFiltro = (campo, valor) => setFiltros((f) => ({ ...f, [campo]: f[campo] === valor ? '' : valor }))

    useEffect(() => {
        if (!claveUsuario) return undefined
        let vivo = true
        const claves = NECESARIAS[vista]

        const cargar = async () => {
            setCargando(true)
            try {
                const res = await Promise.allSettled(claves.map((k) => Promise.resolve().then(() => PETICIONES[k]())))
                if (!vivo) return
                const crudo = {}
                const malas = []
                claves.forEach((k, i) => {
                    crudo[k] = res[i]
                    if (res[i].status === 'rejected') malas.push(k)
                })
                setDatos(crudo)
                setFallidas(malas)
                setActualizado(new Date())
                if (malas.length === claves.length) toast.error('No se pudo conectar con el servidor.')
            } catch (error) {
                console.error('Error en Dashboard:', error)
                if (vivo) toast.error('Hubo un problema al cargar los datos.')
            } finally {
                if (vivo) setCargando(false)
            }
        }
        cargar()
        return () => { vivo = false }
    }, [claveUsuario, vista, recarga])

    const base = useMemo(() => {
        if (!datos) return null
        const lista = (k) => extraerData(datos[k]).filter((x) => x && typeof x === 'object')

        // Catálogos id → nombre, para no mostrar ids internos
        const mapaVar = {}
        lista('existencias').forEach((e) => {
            const id = e.variante_id ?? e.variante?.id
            const nombre = e.variante?.producto?.nombre || e.producto?.nombre || e.nombre_producto
            if (id != null && nombre) mapaVar[String(id)] = nombre
        })
        const mapaProd = {}
        lista('productos').forEach((pr) => { if (pr.id != null && pr.nombre) mapaProd[String(pr.id)] = pr.nombre })
        const mapaCli = {}
        lista('clientes').forEach((c) => {
            const n = nombreCliente(c)
            if (n) [c.id, c.cliente_id, c.id_cliente].filter((v) => v != null).forEach((v) => { mapaCli[String(v)] = n })
        })
        const ctx = { mapaVar, mapaProd, mapaCli }

        const sucursales = lista('sucursales').map((s) => ({
            id: String(s.id ?? s.sucursal_id ?? ''),
            nombre: s.nombre ?? s.name ?? `Sucursal ${s.id ?? ''}`.trim()
        }))
        const mapaSuc = Object.fromEntries(sucursales.map((s) => [s.id, s.nombre]))
        const categorias = lista('categorias').map((c) => ({ id: String(c.id ?? ''), nombre: c.nombre ?? c.name ?? `Categoría ${c.id}` }))
        const mapaCat = Object.fromEntries(categorias.map((c) => [c.id, c.nombre]))
        const nombreSuc = (id, alt) => mapaSuc[id] || alt || (id ? `Sucursal ${id}` : 'Sin sucursal')

        let pedidos = lista('pedidos').map((p) => normalizarPedido(p, ctx))
        const ids = misIds ? misIds.split(',') : []
        const hayCampoVendedor = pedidos.some((p) => p.vendedorIds.length > 0)
        const filtradoPorVendedor = vista === 'vendedor' && hayCampoVendedor && ids.length > 0
        if (filtradoPorVendedor) pedidos = pedidos.filter((p) => p.vendedorIds.some((v) => ids.includes(v)))

        const estadosVistos = [...new Set(pedidos.map((p) => p.estado))]
        const clientes = lista('clientes')

        return {
            sucursales, categorias, nombreSuc, filtradoPorVendedor,
            pedidos,
            estados: [...new Set([...ESTADOS_BASE, ...estadosVistos])],
            existencias: lista('existencias').map((e) => normalizarExistencia(e, mapaCat, ctx)),
            movimientos: lista('movimientos').map((m) => normalizarMovimiento(m, ctx)),
            traslados: lista('traslados').map(normalizarTraslado),
            clientesFechas: clientes.map((c) => aFecha(c.createdAt ?? c.created_at)).filter(Boolean),
            totalClientes: extraerTotal(datos.clientes),
            totalPendientes: extraerTotal(datos.pendientes),
            totalProductos: extraerTotal(datos.productos),
            totalProveedores: extraerTotal(datos.proveedores),
            totalEmpleados: extraerTotal(datos.empleados)
        }
    }, [datos, vista, misIds])

    const rango = useMemo(() => calcularRango(filtros), [filtros.rango, filtros.desde, filtros.hasta])

    const an = useMemo(() => {
        if (!base) return null
        const { desde, hasta, dias, prevDesde, prevHasta } = rango
        const agr = agrupacionEfectiva(filtros.agrupar, dias)
        const buckets = crearBuckets(desde, hasta, agr, dias)
        const bIdx = new Map(buckets.map((b, i) => [b.clave, i]))
        const prevBuckets = crearBuckets(prevDesde, prevHasta, agr, dias)
        const pIdx = new Map(prevBuckets.map((b, i) => [b.clave, i]))

        const dentro = (f, a, b) => !!f && f >= a && f <= b
        const okSuc = (id) => !filtros.sucursal || id === filtros.sucursal
        const okEst = (e) => !filtros.estado || e === filtros.estado
        const okCat = (id) => !filtros.categoria || id === filtros.categoria
        const { nombreSuc } = base

        const pedRangoSuc = base.pedidos.filter((p) => dentro(p.fecha, desde, hasta) && okSuc(p.sucursalId))
        const pedRangoEst = base.pedidos.filter((p) => dentro(p.fecha, desde, hasta) && okEst(p.estado))
        const pedAct = pedRangoSuc.filter((p) => okEst(p.estado))
        const pedPrev = base.pedidos.filter((p) => dentro(p.fecha, prevDesde, prevHasta) && okSuc(p.sucursalId) && okEst(p.estado))

        const resumir = (lista) => {
            const cobrados = lista.filter((p) => COBRADOS.includes(p.estado))
            const activos = lista.filter((p) => p.estado !== 'ANULADO')
            const ingresos = suma(cobrados, (p) => p.total)
            return {
                total: lista.length, activos: activos.length, cobrados: cobrados.length, ingresos,
                brutas: suma(activos, (p) => p.total),
                ticket: cobrados.length ? ingresos / cobrados.length : 0,
                pendientes: lista.filter((p) => PENDIENTES.includes(p.estado)).length,
                anulados: lista.length - activos.length,
                tasaAnulacion: lista.length ? ((lista.length - activos.length) / lista.length) * 100 : 0,
                cumplimiento: activos.length ? (cobrados.length / activos.length) * 100 : 0
            }
        }
        const act = resumir(pedAct)
        const prev = resumir(pedPrev)

        const construirSerie = (lista, bks, mapa) => {
            const arr = bks.map(() => ({ ingresos: 0, pedidos: 0, brutas: 0, cobrados: 0 }))
            lista.forEach((p) => {
                const i = mapa.get(claveBucket(p.fecha, agr))
                if (i === undefined) return
                if (p.estado !== 'ANULADO') { arr[i].pedidos += 1; arr[i].brutas += p.total }
                if (COBRADOS.includes(p.estado)) { arr[i].ingresos += p.total; arr[i].cobrados += 1 }
            })
            return arr
        }
        const sAct = construirSerie(pedAct, buckets, bIdx)
        const sPrev = construirSerie(pedPrev, prevBuckets, pIdx)
        const tendencia = buckets.map((b, i) => {
            const a = sAct[i]
            const p = sPrev[i] || { ingresos: 0, pedidos: 0, brutas: 0, cobrados: 0 }
            return {
                ...b,
                ingresos: a.ingresos, brutas: a.brutas, pedidos: a.pedidos, ticket: a.cobrados ? a.ingresos / a.cobrados : 0,
                ingresos_prev: p.ingresos, brutas_prev: p.brutas, pedidos_prev: p.pedidos, ticket_prev: p.cobrados ? p.ingresos / p.cobrados : 0
            }
        })

        const mapaEstados = new Map()
        pedRangoSuc.forEach((p) => mapaEstados.set(p.estado, (mapaEstados.get(p.estado) || 0) + 1))
        const estados = [...mapaEstados.entries()].sort((a, b) => b[1] - a[1])
            .map(([e, v], i) => ({ id: e, etiqueta: e, valor: v, color: colorEstado(e, i) }))

        const mapaSucVentas = new Map()
        pedRangoEst.filter((p) => COBRADOS.includes(p.estado)).forEach((p) => {
            const m = mapaSucVentas.get(p.sucursalId) || { id: p.sucursalId, etiqueta: nombreSuc(p.sucursalId, p.sucursalNombre), valor: 0 }
            m.valor += p.total
            mapaSucVentas.set(p.sucursalId, m)
        })
        const ventasSucursal = [...mapaSucVentas.values()].sort((a, b) => b.valor - a.valor).slice(0, 8)

        const mapaProd = new Map()
        pedAct.filter((p) => p.estado !== 'ANULADO').forEach((p) => p.items.forEach((it) => {
            const m = mapaProd.get(it.nombre) || { id: it.nombre, etiqueta: it.nombre, valor: 0, unidades: 0 }
            m.valor += it.subtotal; m.unidades += it.cantidad
            mapaProd.set(it.nombre, m)
        }))
        let fuenteProductos = 'pedidos'
        if (mapaProd.size === 0) {
            fuenteProductos = 'movimientos'
            base.movimientos.filter((m) => m.tipo.includes('VENTA') && dentro(m.fecha, desde, hasta) && okSuc(m.sucursalId)).forEach((m) => {
                const x = mapaProd.get(m.nombre) || { id: m.nombre, etiqueta: m.nombre, valor: 0, unidades: 0 }
                x.valor += m.cantidad; x.unidades += m.cantidad
                mapaProd.set(m.nombre, x)
            })
        }
        const topProductos = [...mapaProd.values()].sort((a, b) => b.valor - a.valor).slice(0, 8)

        const mapaCli = new Map()
        // Las ventas sin cliente (consumidor final) no son un cliente identificable: no entran al ranking
        pedAct.filter((p) => COBRADOS.includes(p.estado) && (p.clienteId || p.cliente !== 'Consumidor final')).forEach((p) => {
            const m = mapaCli.get(p.clienteId || p.cliente) || { id: p.clienteId || p.cliente, etiqueta: p.cliente, valor: 0 }
            m.valor += p.total
            mapaCli.set(p.clienteId || p.cliente, m)
        })
        const topClientes = [...mapaCli.values()].sort((a, b) => b.valor - a.valor).slice(0, 8)

        const matriz = Array.from({ length: 7 }, () => Array(24).fill(0))
        const porDia = DIAS_SEMANA.map((d) => ({ name: d, clave: d, etiqueta: d, ingresos: 0, pedidos: 0 }))
        pedAct.filter((p) => p.estado !== 'ANULADO').forEach((p) => {
            const dw = (p.fecha.getDay() + 6) % 7
            matriz[dw][p.fecha.getHours()] += 1
            porDia[dw].pedidos += 1
            if (COBRADOS.includes(p.estado)) porDia[dw].ingresos += p.total
        })

        const movAct = base.movimientos.filter((m) => dentro(m.fecha, desde, hasta) && okSuc(m.sucursalId))
        const movPrev = base.movimientos.filter((m) => dentro(m.fecha, prevDesde, prevHasta) && okSuc(m.sucursalId))
        const serieMov = buckets.map((b) => ({ ...b, entradas: 0, salidas: 0 }))
        movAct.forEach((m) => {
            const i = bIdx.get(claveBucket(m.fecha, agr))
            if (i === undefined) return
            if (m.esEntrada) serieMov[i].entradas += m.cantidad
            else if (m.esSalida) serieMov[i].salidas += m.cantidad
        })
        const mermas = movAct.filter((m) => m.esMerma)
        const mermasPrev = movPrev.filter((m) => m.esMerma)
        const perdidaMermas = suma(mermas, (m) => m.cantidad * m.costo)
        const perdidaMermasPrev = suma(mermasPrev, (m) => m.cantidad * m.costo)
        const mapaMotivo = new Map()
        mermas.forEach((m) => {
            const x = mapaMotivo.get(m.motivo) || { id: m.motivo, etiqueta: m.motivo, valor: 0 }
            x.valor += m.cantidad
            mapaMotivo.set(m.motivo, x)
        })
        const mermasMotivo = [...mapaMotivo.values()].sort((a, b) => b.valor - a.valor).slice(0, 8)
        const compras = movAct.filter((m) => m.esCompra)
        const mov = {
            entradas: suma(movAct.filter((m) => m.esEntrada), (m) => m.cantidad),
            salidas: suma(movAct.filter((m) => m.esSalida), (m) => m.cantidad),
            mermasUnid: suma(mermas, (m) => m.cantidad),
            compras: suma(compras, (m) => m.cantidad * m.costo),
            comprasPrev: suma(movPrev.filter((m) => m.esCompra), (m) => m.cantidad * m.costo)
        }

        const exiAct = base.existencias.filter((e) => okSuc(e.sucursalId) && okCat(e.categoriaId))
        const criticos = exiAct.filter((e) => e.qty <= e.min).sort((a, b) => a.qty - b.qty)
        const inv = {
            unidades: suma(exiAct, (e) => e.qty), valor: suma(exiAct, (e) => e.valor), skus: exiAct.length,
            criticos: criticos.length, agotados: exiAct.filter((e) => e.qty <= 0).length,
            cobertura: exiAct.length ? ((exiAct.length - criticos.length) / exiAct.length) * 100 : 0
        }
        const mapaInvSuc = new Map()
        base.existencias.filter((e) => okCat(e.categoriaId)).forEach((e) => {
            const x = mapaInvSuc.get(e.sucursalId) || { id: e.sucursalId, etiqueta: nombreSuc(e.sucursalId, e.sucursalNombre), valor: 0 }
            x.valor += e.valor
            mapaInvSuc.set(e.sucursalId, x)
        })
        const invSucursal = [...mapaInvSuc.values()].sort((a, b) => b.valor - a.valor).slice(0, 8)
        const mapaInvCat = new Map()
        base.existencias.filter((e) => okSuc(e.sucursalId)).forEach((e) => {
            const x = mapaInvCat.get(e.categoriaId) || { id: e.categoriaId, etiqueta: e.categoria, valor: 0 }
            x.valor += e.valor
            mapaInvCat.set(e.categoriaId, x)
        })
        const invCategoria = [...mapaInvCat.values()].sort((a, b) => b.valor - a.valor).slice(0, 7).map((x, i) => ({ ...x, color: PALETA[i % PALETA.length] }))

        const trasAct = base.traslados.filter((t) => (!t.fecha || dentro(t.fecha, desde, hasta)) &&
            (!filtros.sucursal || t.origenId === filtros.sucursal || t.destinoId === filtros.sucursal))
        const mapaTras = new Map()
        trasAct.forEach((t) => mapaTras.set(t.estado, (mapaTras.get(t.estado) || 0) + 1))
        const trasEstados = [...mapaTras.entries()].sort((a, b) => b[1] - a[1]).map(([e, v], i) => ({ id: e, etiqueta: e, valor: v, color: colorEstado(e, i) }))
        const trasActivos = trasAct.filter((t) => !TRASLADO_CERRADO.includes(t.estado)).length
        const trasRecibidos = trasAct.filter((t) => t.estado === 'RECIBIDO').length

        const clientesNuevos = base.clientesFechas.filter((f) => dentro(f, desde, hasta)).length

        return {
            agr, buckets, tendencia, act, prev, estados, ventasSucursal, topProductos, fuenteProductos, topClientes,
            matriz, porDia, serieMov, mermasMotivo, perdidaMermas, perdidaMermasPrev, mov, inv, invSucursal, invCategoria,
            criticos, trasEstados, trasActivos, trasRecibidos, trasTotal: trasAct.length, clientesNuevos,
            pedidosRecientes: [...pedAct].sort((a, b) => b.fecha - a.fecha).slice(0, 8),
            porDespachar: pedAct.filter((p) => PENDIENTES.includes(p.estado)).sort((a, b) => a.fecha - b.fecha).slice(0, 8),
            trasladosRecientes: [...trasAct].sort((a, b) => (b.fecha?.getTime() || 0) - (a.fecha?.getTime() || 0)).slice(0, 8),
            nombreSuc
        }
    }, [base, rango, filtros])

    const hayFiltrosActivos = !!(filtros.sucursal || filtros.estado || filtros.categoria || filtros.rango !== '30d' || filtros.agrupar !== 'auto')
    const opcionesSucursal = useMemo(() => {
        if (!base) return []
        if (base.sucursales.length) return base.sucursales
        const ids = new Map()
        base.pedidos.forEach((p) => p.sucursalId && ids.set(p.sucursalId, p.sucursalNombre || `Sucursal ${p.sucursalId}`))
        base.existencias.forEach((e) => e.sucursalId && ids.set(e.sucursalId, e.sucursalNombre || `Sucursal ${e.sucursalId}`))
        return [...ids.entries()].map(([id, nombre]) => ({ id, nombre }))
    }, [base])

    const fechaHoy = new Date().toLocaleDateString('es-GT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const fallidasRelevantes = fallidas.filter((k) => !(OPCIONALES[vista] || []).includes(k)).map((k) => NOMBRE_DATASET[k] || k)
    const esMoneda = METRICAS[metrica].moneda
    const defMetrica = METRICAS[metrica]

    const encabezado = (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Hola, {nombreMostrado}</h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                    Panel de Control • <span className="font-semibold text-primary">{rolUsuario}</span> • {fechaHoy}
                </p>
            </div>
            <div className="flex items-center gap-3">
                {actualizado && (
                    <span className="text-[11px] text-muted-foreground hidden md:inline">
                        Actualizado {actualizado.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                )}
                <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">En Línea</span>
                </div>
            </div>
        </div>
    )

    if (!claveUsuario || (cargando && !an)) {
        return (
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto min-h-screen" translate="no">
                {encabezado}
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground h-[50vh]">
                    <Activity size={48} className="animate-pulse mb-4 text-primary opacity-50" />
                    <p className="text-sm font-medium">Sincronizando métricas en tiempo real...</p>
                </div>
            </div>
        )
    }

    if (!an) {
        return (
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto min-h-screen" translate="no">
                {encabezado}
                <div className="flex flex-col items-center justify-center gap-3 h-[40vh] text-muted-foreground">
                    <AlertTriangle size={40} className="text-amber-500" />
                    <p className="text-sm font-medium">No se pudieron cargar los datos.</p>
                    <button type="button" onClick={() => setRecarga((r) => r + 1)} className="h-9 rounded-lg border bg-card px-4 text-xs font-bold text-foreground hover:bg-muted/40">Reintentar</button>
                </div>
            </div>
        )
    }

    const t = an.tendencia
    const spark = (clave) => t.map((d) => d[clave])

    const barraFiltros = (
        <div className="bg-card border rounded-2xl p-4 shadow-sm flex flex-col gap-3" role="search" aria-label="Filtros del dashboard">
            <div className="flex flex-wrap items-end gap-3">
                <span className="hidden md:flex items-center gap-1.5 text-xs font-bold text-foreground pb-2"><Filter size={14} className="text-primary" />Filtros</span>
                <Campo etiqueta="Periodo">
                    <select aria-label="Periodo" className={CLASE_CONTROL} value={filtros.rango} onChange={(e) => setFiltro('rango', e.target.value)}>
                        {RANGOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                </Campo>
                {filtros.rango === 'personalizado' && (
                    <>
                        <Campo etiqueta="Desde">
                            <input aria-label="Desde" type="date" className={CLASE_CONTROL} value={filtros.desde} max={filtros.hasta || undefined} onChange={(e) => setFiltro('desde', e.target.value)} />
                        </Campo>
                        <Campo etiqueta="Hasta">
                            <input aria-label="Hasta" type="date" className={CLASE_CONTROL} value={filtros.hasta} min={filtros.desde || undefined} onChange={(e) => setFiltro('hasta', e.target.value)} />
                        </Campo>
                    </>
                )}
                <Campo etiqueta="Agrupar por">
                    <select aria-label="Agrupar por" className={CLASE_CONTROL} value={filtros.agrupar} onChange={(e) => setFiltro('agrupar', e.target.value)}>
                        <option value="auto">Automático</option>
                        <option value="dia">Día</option>
                        <option value="semana">Semana</option>
                        <option value="mes">Mes</option>
                    </select>
                </Campo>
                <Campo etiqueta="Sucursal">
                    <select aria-label="Sucursal" className={CLASE_CONTROL} value={filtros.sucursal} onChange={(e) => setFiltro('sucursal', e.target.value)}>
                        <option value="">Todas</option>
                        {opcionesSucursal.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                </Campo>
                {vista !== 'bodega' || base.pedidos.length > 0 ? (
                    <Campo etiqueta="Estado del pedido">
                        <select aria-label="Estado del pedido" className={CLASE_CONTROL} value={filtros.estado} onChange={(e) => setFiltro('estado', e.target.value)}>
                            <option value="">Todos</option>
                            {base.estados.map((e) => <option key={e} value={e}>{e}</option>)}
                        </select>
                    </Campo>
                ) : null}
                {vista !== 'vendedor' && base.categorias.length > 0 && (
                    <Campo etiqueta="Categoría (inventario)">
                        <select aria-label="Categoría" className={CLASE_CONTROL} value={filtros.categoria} onChange={(e) => setFiltro('categoria', e.target.value)}>
                            <option value="">Todas</option>
                            {base.categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                    </Campo>
                )}
                <div className="flex items-center gap-2 pb-0.5 ml-auto">
                    {hayFiltrosActivos && (
                        <button type="button" onClick={() => setFiltros(FILTROS_INICIALES)} className="h-9 inline-flex items-center gap-1.5 rounded-lg border px-3 text-xs font-bold text-foreground hover:bg-muted/40">
                            <X size={13} />Limpiar
                        </button>
                    )}
                    <button type="button" onClick={() => setRecarga((r) => r + 1)} disabled={cargando} aria-label="Actualizar datos" className="h-9 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-white hover:opacity-90 disabled:opacity-60">
                        <RefreshCw size={13} className={cargando ? 'animate-spin' : ''} />Actualizar
                    </button>
                </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
                Mostrando <span className="font-semibold text-foreground">{filtros.rango === 'personalizado' ? `${rango.desde.toLocaleDateString('es-GT')} – ${rango.hasta.toLocaleDateString('es-GT')}` : ETIQUETA_RANGO[filtros.rango]}</span>
                {filtros.sucursal && <> · <span className="font-semibold text-foreground">{an.nombreSuc(filtros.sucursal)}</span></>}
                {filtros.estado && <> · estado <span className="font-semibold text-foreground">{filtros.estado}</span></>}
                {filtros.categoria && <> · categoría <span className="font-semibold text-foreground">{base.categorias.find((c) => c.id === filtros.categoria)?.nombre}</span></>}
                {' '}· comparado con los {rango.dias} {rango.dias === 1 ? 'día' : 'días'} anteriores. Haz clic en las gráficas para filtrar.
            </p>
            {base.filtradoPorVendedor && <p className="text-[11px] text-muted-foreground">Solo se muestran los pedidos asignados a tu usuario.</p>}
        </div>
    )

    const avisoFallos = fallidasRelevantes.length > 0 && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-500/10 px-4 py-3 text-xs text-foreground">
            <span className="flex items-center gap-2"><AlertTriangle size={15} className="text-amber-600" />No se pudieron cargar: <b>{fallidasRelevantes.join(', ')}</b>. Las métricas relacionadas pueden verse incompletas.</span>
            <button type="button" onClick={() => setRecarga((r) => r + 1)} className="h-8 rounded-lg border bg-card px-3 font-bold hover:bg-muted/40">Reintentar</button>
        </div>
    )

    const bloqueTendencia = (
        <Tarjeta
            titulo={`${defMetrica.nombre} por ${an.agr === 'dia' ? 'día' : an.agr === 'semana' ? 'semana' : 'mes'}`} icono={TrendingUp}
            derecha={
                <select aria-label="Métrica del gráfico" className={CLASE_CONTROL} value={metrica} onChange={(e) => setMetrica(e.target.value)}>
                    {Object.entries(METRICAS).map(([k, m]) => <option key={k} value={k}>{m.nombre}</option>)}
                </select>
            }
        >
            <GraficoCartesiano
                datos={t}
                series={[
                    { clave: metrica, nombre: defMetrica.nombre, color: defMetrica.color, tipo: defMetrica.tipo, area: defMetrica.tipo === 'linea' },
                    { clave: `${metrica}_prev`, nombre: 'Periodo anterior', color: '#94a3b8', tipo: 'linea', dash: true }
                ]}
                formatoY={(v) => (esMoneda ? formatQCorto(v) : formatNumCorto(v))}
                formatoValor={(v) => (esMoneda ? formatQ(v) : formatNum(v))}
                minimoEscala={esMoneda ? 10 : 2}
            />
        </Tarjeta>
    )

    const bloqueEstados = (
        <Tarjeta titulo="Pedidos por estado" icono={PieChart}>
            <Dona items={an.estados} centroTitulo="Pedidos" centroValor={formatNum(an.estados.reduce((s, e) => s + e.valor, 0))} activoId={filtros.estado} onSeleccionar={(id) => alternarFiltro('estado', id)} />
        </Tarjeta>
    )

    const bloqueSucursales = (
        <Tarjeta titulo="Ingresos por sucursal" icono={Store}>
            <BarrasH items={an.ventasSucursal} formato={formatQ} color="#10b981" activoId={filtros.sucursal} onSeleccionar={(id) => alternarFiltro('sucursal', id)} />
        </Tarjeta>
    )

    const bloqueProductos = (
        <Tarjeta titulo={an.fuenteProductos === 'pedidos' ? 'Productos más vendidos (Q)' : 'Productos más vendidos (unid.)'} icono={Tag}>
            <BarrasH items={an.topProductos} formato={an.fuenteProductos === 'pedidos' ? formatQ : formatNum} color="#8b5cf6" vacio="Los pedidos no incluyen detalle de productos en este periodo" />
        </Tarjeta>
    )

    const bloqueClientes = (
        <Tarjeta titulo="Mejores clientes" icono={Users}>
            <BarrasH items={an.topClientes} formato={formatQ} color="#3b82f6" />
        </Tarjeta>
    )

    const bloqueCalor = (
        <Tarjeta titulo="Horas pico de pedidos" icono={Flame}>
            <MapaCalor matriz={an.matriz} />
        </Tarjeta>
    )

    const bloqueDiaSemana = (
        <Tarjeta titulo="Ingresos por día de la semana" icono={BarChart3}>
            <GraficoCartesiano datos={an.porDia} series={[{ clave: 'ingresos', nombre: 'Ingresos', color: '#10b981', tipo: 'barra' }]} formatoY={formatQCorto} formatoValor={formatQ} altura={240} minimoEscala={10} />
        </Tarjeta>
    )

    const bloqueSalud = (
        <Tarjeta titulo="Salud operativa" icono={ShieldCheck}>
            <div className="flex flex-col gap-4">
                <Progreso etiqueta="Cumplimiento de pedidos" valor={an.act.cumplimiento} detalle={`${an.act.cobrados} de ${an.act.activos} pedidos activos cobrados`} />
                <Progreso etiqueta="Tasa de anulación" valor={an.act.tasaAnulacion} buenoSiAlto={false} detalle={`${an.act.anulados} anulados de ${an.act.total}`} />
                {vista !== 'vendedor' && base.existencias.length > 0 && <Progreso etiqueta="Cobertura de stock" valor={an.inv.cobertura} detalle={`${an.inv.criticos} de ${an.inv.skus} SKUs bajo mínimo`} />}
                {an.trasTotal > 0 && <Progreso etiqueta="Traslados recibidos" valor={(an.trasRecibidos / an.trasTotal) * 100} detalle={`${an.trasRecibidos} de ${an.trasTotal} traslados`} />}
            </div>
        </Tarjeta>
    )

    const bloqueMovimientos = (
        <Tarjeta titulo="Entradas vs. salidas de inventario" icono={Boxes}>
            <GraficoCartesiano
                datos={an.serieMov}
                series={[
                    { clave: 'entradas', nombre: 'Entradas', color: '#10b981', tipo: 'barra' },
                    { clave: 'salidas', nombre: 'Salidas', color: '#f59e0b', tipo: 'barra' }
                ]}
                formatoY={formatNumCorto} formatoValor={(v) => `${formatNum(v)} unid.`}
            />
        </Tarjeta>
    )

    const bloqueMermas = (
        <Tarjeta titulo="Mermas por motivo (unid.)" icono={Trash2}>
            <BarrasH items={an.mermasMotivo} color="#ef4444" vacio="Sin mermas registradas en el periodo" />
        </Tarjeta>
    )

    const bloqueInvSucursal = (
        <Tarjeta titulo="Valor de inventario por sucursal" icono={Building2}>
            <BarrasH items={an.invSucursal} formato={formatQ} color="#6366f1" activoId={filtros.sucursal} onSeleccionar={(id) => alternarFiltro('sucursal', id)} />
        </Tarjeta>
    )

    const bloqueInvCategoria = (
        <Tarjeta titulo="Inventario por categoría" icono={Layers}>
            <Dona
                items={an.invCategoria} formatoValor={formatQCorto} centroTitulo="Valor" centroValor={formatQCorto(an.invCategoria.reduce((s, c) => s + c.valor, 0))}
                activoId={filtros.categoria} onSeleccionar={(id) => id && alternarFiltro('categoria', id)}
            />
        </Tarjeta>
    )

    const bloqueTraslados = (
        <Tarjeta titulo="Traslados por estado" icono={Truck}>
            <Dona items={an.trasEstados} centroTitulo="Traslados" centroValor={formatNum(an.trasTotal)} />
        </Tarjeta>
    )

    const columnasPedidos = [
        { titulo: 'Ref', mono: true, render: (f) => f.ref || '—' },
        { titulo: 'Cliente', render: (f) => <span className="inline-block max-w-[140px] truncate align-bottom">{f.cliente}</span> },
        { titulo: 'Estado', alinear: 'center', render: (f) => <EstadoChip estado={f.estado} /> },
        { titulo: 'Monto', alinear: 'right', render: (f) => formatQ(f.total) }
    ]
    const bloqueTablaPedidos = (
        <Tarjeta titulo="Transacciones recientes" icono={FileText}>
            <Tabla columnas={columnasPedidos} filas={an.pedidosRecientes.map((p) => ({ ...p, key: p.id }))} vacio="No hay pedidos para los filtros seleccionados." />
        </Tarjeta>
    )
    const bloqueTablaDespacho = (
        <Tarjeta titulo="Pedidos por despachar" icono={Clock}>
            <Tabla columnas={columnasPedidos} filas={an.porDespachar.map((p) => ({ ...p, key: p.id }))} vacio="No hay pedidos pendientes de despacho." />
        </Tarjeta>
    )
    const bloqueTablaCritico = (
        <Tarjeta titulo="Stock crítico" icono={PackageX}>
            <Tabla
                columnas={[
                    { titulo: 'Producto', render: (f) => <span className="inline-block max-w-[150px] truncate align-bottom" title={`${f.nombre} ${f.detalle}`}>{f.nombre}{f.detalle ? ` · ${f.detalle}` : ''}</span> },
                    { titulo: 'Sucursal', render: (f) => <span className="inline-block max-w-[90px] truncate align-bottom">{an.nombreSuc(f.sucursalId, f.sucursalNombre)}</span> },
                    { titulo: 'Stock', alinear: 'right', render: (f) => <span className={f.qty <= 0 ? 'text-rose-600' : 'text-amber-600'}>{formatNum(f.qty)}/{formatNum(f.min)}</span> }
                ]}
                filas={an.criticos.slice(0, 8).map((e, i) => ({ ...e, key: i }))} vacio="Ningún producto bajo el mínimo 🎉"
            />
        </Tarjeta>
    )
    const bloqueTablaTraslados = (
        <Tarjeta titulo="Traslados recientes" icono={ArrowRightLeft}>
            <Tabla
                columnas={[
                    { titulo: 'Ref', mono: true, render: (f) => f.ref || '—' },
                    { titulo: 'Ruta', render: (f) => `${an.nombreSuc(f.origenId, f.origenNombre)} → ${an.nombreSuc(f.destinoId, f.destinoNombre)}` },
                    { titulo: 'Estado', alinear: 'center', render: (f) => <EstadoChip estado={f.estado} /> }
                ]}
                filas={an.trasladosRecientes.map((x) => ({ ...x, key: x.id }))} vacio="No hay traslados en el periodo."
            />
        </Tarjeta>
    )
    const bloqueResumen = (
        <Tarjeta titulo="Resumen del negocio" icono={Briefcase}>
            <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                    ['Productos', base.totalProductos], ['Proveedores', base.totalProveedores],
                    ['Empleados', base.totalEmpleados], ['Sucursales', base.sucursales.length],
                    ['Clientes por aprobar', base.totalPendientes], ['Clientes nuevos', an.clientesNuevos]
                ].map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-muted/40 p-3">
                        <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{k}</dt>
                        <dd className="text-xl font-black text-foreground">{formatNum(v)}</dd>
                    </div>
                ))}
            </dl>
        </Tarjeta>
    )

    const kpiIngresos = { titulo: 'Ingresos', valor: formatQ(an.act.ingresos), subtitulo: `${an.act.cobrados} pedidos cobrados`, icono: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-500/10', delta: variacion(an.act.ingresos, an.prev.ingresos), spark: spark('ingresos'), sparkColor: '#10b981' }
    const kpiPedidos = { titulo: 'Pedidos', valor: formatNum(an.act.activos), subtitulo: `${an.act.total} registrados`, icono: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-500/10', delta: variacion(an.act.activos, an.prev.activos), spark: spark('pedidos'), sparkColor: '#3b82f6' }
    const kpiTicket = { titulo: 'Ticket promedio', valor: formatQ(an.act.ticket), subtitulo: 'Por pedido cobrado', icono: Receipt, color: 'text-amber-600', bg: 'bg-amber-500/10', delta: variacion(an.act.ticket, an.prev.ticket), spark: spark('ticket'), sparkColor: '#f59e0b' }
    const kpiClientes = { titulo: 'Clientes', valor: formatNum(base.totalClientes), subtitulo: base.totalPendientes ? `${formatNum(base.totalPendientes)} por aprobar` : `${formatNum(an.clientesNuevos)} nuevos`, icono: Users, color: 'text-violet-600', bg: 'bg-violet-500/10' }

    // ── Secciones: cada vista se divide en pestañas para no mostrar todo a la vez ──
    const kpi = {
        valorInventario: { titulo: 'Valor inventario', valor: formatQ(an.inv.valor), subtitulo: `${formatNum(an.inv.unidades)} unidades`, icono: Package, color: 'text-indigo-600', bg: 'bg-indigo-500/10' },
        cumplimiento: { titulo: 'Cumplimiento', valor: formatPct(an.act.cumplimiento), subtitulo: 'Cobrados / activos', icono: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-500/10', delta: variacion(an.act.cumplimiento, an.prev.cumplimiento) },
        perdidaMermas: { titulo: 'Pérdida por mermas', valor: formatQ(an.perdidaMermas), subtitulo: `${formatNum(an.mov.mermasUnid)} unidades`, icono: Trash2, color: 'text-rose-600', bg: 'bg-rose-500/10', delta: variacion(an.perdidaMermas, an.perdidaMermasPrev), buenoSiSube: false },
        stockCritico: { titulo: 'Stock crítico', valor: formatNum(an.inv.criticos), subtitulo: `${formatNum(an.inv.agotados)} agotados`, icono: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-500/10' },
        pendientes: { titulo: 'Pedidos pendientes', valor: formatNum(an.act.pendientes), subtitulo: 'Requieren atención', icono: Clock, color: 'text-blue-600', bg: 'bg-blue-500/10' },
        trasladosActivos: { titulo: 'Traslados activos', valor: formatNum(an.trasActivos), subtitulo: 'En ruta o pendientes', icono: ArrowRightLeft, color: 'text-amber-600', bg: 'bg-amber-500/10' },
        compras: { titulo: 'Compras del periodo', valor: formatQ(an.mov.compras), subtitulo: 'Entradas por compra', icono: Wallet, color: 'text-indigo-600', bg: 'bg-indigo-500/10', delta: variacion(an.mov.compras, an.mov.comprasPrev), buenoSiSube: false },
        anulacion: { titulo: 'Tasa de anulación', valor: formatPct(an.act.tasaAnulacion), subtitulo: `${an.act.anulados} anulados`, icono: XCircle, color: 'text-rose-600', bg: 'bg-rose-500/10', delta: variacion(an.act.tasaAnulacion, an.prev.tasaAnulacion), buenoSiSube: false },
        unidades: { titulo: 'Unidades físicas', valor: formatNum(an.inv.unidades), subtitulo: 'Stock total', icono: Package, color: 'text-blue-600', bg: 'bg-blue-500/10' },
        skus: { titulo: 'SKUs registrados', valor: formatNum(an.inv.skus), subtitulo: 'Variantes con existencia', icono: Boxes, color: 'text-indigo-600', bg: 'bg-indigo-500/10' },
        stockCriticoBodega: { titulo: 'Stock crítico', valor: formatNum(an.inv.criticos), subtitulo: `${formatNum(an.inv.agotados)} agotados`, icono: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-500/10' },
        aDespachar: { titulo: 'Pedidos a despachar', valor: formatNum(an.act.pendientes), subtitulo: 'Esperando salida', icono: Activity, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
        entradas: { titulo: 'Entradas del periodo', valor: formatNum(an.mov.entradas), subtitulo: 'Unidades ingresadas', icono: Boxes, color: 'text-emerald-600', bg: 'bg-emerald-500/10', spark: an.serieMov.map((d) => d.entradas), sparkColor: '#10b981' },
        salidas: { titulo: 'Salidas del periodo', valor: formatNum(an.mov.salidas), subtitulo: 'Unidades despachadas', icono: Truck, color: 'text-amber-600', bg: 'bg-amber-500/10', spark: an.serieMov.map((d) => d.salidas), sparkColor: '#f59e0b' },
        mermasUnid: { titulo: 'Mermas', valor: formatNum(an.mov.mermasUnid), subtitulo: formatQ(an.perdidaMermas), icono: Trash2, color: 'text-rose-600', bg: 'bg-rose-500/10', delta: variacion(an.perdidaMermas, an.perdidaMermasPrev), buenoSiSube: false },
        vPendientes: { titulo: 'Pendientes', valor: formatNum(an.act.pendientes), subtitulo: 'Órdenes no cerradas', icono: Clock, color: 'text-amber-600', bg: 'bg-amber-500/10' },
        vCompletados: { titulo: 'Completados', valor: formatNum(an.act.cobrados), subtitulo: 'Órdenes exitosas', icono: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-500/10', delta: variacion(an.act.cobrados, an.prev.cobrados) },
        vCierre: { titulo: 'Tasa de cierre', valor: formatPct(an.act.cumplimiento), subtitulo: 'Cobrados / activos', icono: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-500/10', delta: variacion(an.act.cumplimiento, an.prev.cumplimiento) },
        vAnulados: { titulo: 'Anulados', valor: formatNum(an.act.anulados), subtitulo: formatPct(an.act.tasaAnulacion), icono: XCircle, color: 'text-rose-600', bg: 'bg-rose-500/10', delta: variacion(an.act.anulados, an.prev.anulados), buenoSiSube: false }
    }

    // Cada fila suma 3 columnas: [bloque, columnas que ocupa]
    let secciones
    if (vista === 'admin') {
        secciones = [
            {
                id: 'resumen', nombre: 'Resumen', icono: LayoutDashboard, descripcion: 'Lo más importante del negocio de un vistazo',
                kpis: [kpiIngresos, kpiPedidos, kpiTicket, kpiClientes],
                filas: [[[bloqueTendencia, 2], [bloqueEstados, 1]], [[bloqueSalud, 1], [bloqueTablaPedidos, 2]], [[bloqueResumen, 3]]]
            },
            {
                id: 'ventas', nombre: 'Ventas', icono: TrendingUp, descripcion: 'Dónde se vende, qué se vende y quién compra',
                kpis: [kpi.cumplimiento, kpi.pendientes, kpi.anulacion],
                filas: [[[bloqueSucursales, 1], [bloqueProductos, 1], [bloqueClientes, 1]], [[bloqueCalor, 3]]]
            },
            {
                id: 'inventario', nombre: 'Inventario y traslados', icono: Package, badge: an.inv.criticos, descripcion: 'Existencias, movimientos, mermas y traslados entre sucursales',
                kpis: [kpi.valorInventario, kpi.stockCritico, kpi.perdidaMermas, kpi.compras, kpi.trasladosActivos],
                filas: [
                    [[bloqueMovimientos, 2], [bloqueMermas, 1]],
                    [[bloqueInvSucursal, 1], [bloqueInvCategoria, 1], [bloqueTraslados, 1]],
                    [[bloqueTablaCritico, 3]],
                    [[bloqueTablaTraslados, 3]]
                ]
            }
        ]
    } else if (vista === 'bodega') {
        secciones = [
            {
                id: 'resumen', nombre: 'Resumen', icono: LayoutDashboard, descripcion: 'Estado general de la bodega',
                kpis: [kpi.unidades, kpi.skus, kpi.stockCriticoBodega, kpi.trasladosActivos, kpi.aDespachar],
                filas: [[[bloqueMovimientos, 2], [bloqueSalud, 1]], [[bloqueTablaDespacho, 2], [bloqueEstados, 1]]]
            },
            {
                id: 'inventario', nombre: 'Inventario', icono: Package, badge: an.inv.criticos, descripcion: 'Entradas, salidas, mermas y valor de las existencias',
                kpis: [kpi.entradas, kpi.salidas, kpi.mermasUnid],
                filas: [[[bloqueInvSucursal, 1], [bloqueInvCategoria, 1], [bloqueMermas, 1]], [[bloqueTablaCritico, 3]]]
            },
            {
                id: 'traslados', nombre: 'Traslados', icono: Truck, badge: an.trasActivos, descripcion: 'Movimiento de mercadería entre sucursales',
                kpis: [],
                filas: [[[bloqueTraslados, 1], [bloqueTablaTraslados, 2]]]
            }
        ]
    } else {
        secciones = [
            {
                id: 'resumen', nombre: 'Resumen', icono: LayoutDashboard, descripcion: 'Tu desempeño de ventas',
                kpis: [{ ...kpiIngresos, titulo: 'Mis ventas' }, kpiPedidos, kpiTicket, kpiClientes],
                filas: [[[bloqueTendencia, 2], [bloqueEstados, 1]], [[bloqueSalud, 1], [bloqueTablaPedidos, 2]]]
            },
            {
                id: 'ventas', nombre: 'Mis ventas', icono: TrendingUp, descripcion: 'Detalle de tus productos, clientes y horarios',
                kpis: [kpi.vPendientes, kpi.vCompletados, kpi.vCierre, kpi.vAnulados],
                filas: [[[bloqueProductos, 1], [bloqueClientes, 1], [bloqueDiaSemana, 1]], [[bloqueCalor, 3]]]
            }
        ]
    }

    const activa = secciones.find((s) => s.id === seccion) || secciones[0]
    const claseKpis = (n) => (n >= 5 ? 'sm:grid-cols-2 lg:grid-cols-6 2xl:grid-cols-5' : n === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : n === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2')
    const claseKpiItem = (n, i) => (n >= 5 ? (i < 3 ? 'lg:col-span-2 2xl:col-span-1' : 'lg:col-span-3 2xl:col-span-1') : '')
    const claseColumnas = { 1: '', 2: 'lg:col-span-2', 3: 'lg:col-span-3' }

    return (
        <div className={`flex flex-col gap-6 p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto min-h-screen transition-opacity ${cargando ? 'opacity-70' : ''}`} translate="no">
            {encabezado}
            {barraFiltros}
            {avisoFallos}

            <nav role="tablist" aria-label="Secciones del dashboard" className="flex flex-wrap gap-2">
                {secciones.map((s) => {
                    const Icono = s.icono
                    const esActiva = s.id === activa.id
                    return (
                        <button
                            key={s.id} type="button" role="tab" data-seccion={s.id} aria-selected={esActiva}
                            onClick={() => setSeccion(s.id)}
                            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition-colors ${esActiva ? 'border-primary bg-primary text-white shadow-sm' : 'bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground'}`}
                        >
                            <Icono size={15} />
                            {s.nombre}
                            {s.badge > 0 && (
                                <span className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none ${esActiva ? 'bg-white/25 text-white' : 'bg-rose-500/10 text-rose-700'}`}>{formatNum(s.badge)}</span>
                            )}
                        </button>
                    )
                })}
            </nav>

            <div role="tabpanel" className="flex flex-col gap-6 md:gap-8">
                <div>
                    <h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground">{activa.nombre}</h2>
                    <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{activa.descripcion}</p>
                </div>

                {activa.kpis.length > 0 && (
                    <div className={`grid grid-cols-1 gap-4 md:gap-6 ${claseKpis(activa.kpis.length)}`}>
                        {activa.kpis.map((k, i) => (
                            <div key={k.titulo} className={`min-w-0 ${claseKpiItem(activa.kpis.length, i)}`}><Kpi {...k} /></div>
                        ))}
                    </div>
                )}

                {activa.filas.map((fila, i) => (
                    <div key={`${activa.id}-${i}`} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {fila.map(([bloque, columnas], j) => (
                            <div key={j} className={`flex min-w-0 ${claseColumnas[columnas] || ''}`}>{bloque}</div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}