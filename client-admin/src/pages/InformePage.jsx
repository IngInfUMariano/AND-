import { useState, useEffect, useCallback, useMemo } from 'react'
import {
    BarChart3, Search, Calendar, Building2, Package,
    ArrowRightLeft, FileText, TrendingUp, RefreshCw, FilterX,
    FileSpreadsheet, Users, Briefcase, ShoppingCart, AlertTriangle, Box,
    DollarSign, Activity
} from 'lucide-react'
import toast from 'react-hot-toast'

// Servicios
import { inventarioService } from '@/services/inventario.service'
import { clienteService } from '@/services/cliente.service'
import { proveedorService } from '@/services/proveedor.service'
import { productoService } from '@/services/producto.service'
import { empleadoService } from '@/services/empleado.service'

const safeNumber = (val) => (isNaN(Number(val)) ? 0 : Number(val))
const formatQ = (val) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(safeNumber(val))

const ESTADOS_EXCLUIDOS = ['ANULADO', 'CANCELADO', 'RECHAZADO']

const CATEGORIAS_REPORTES = [
    {
        grupo: "Operaciones e Inventario",
        reportes: [
            { id: 'INVENTARIO', nombre: 'Existencias Actuales', icono: Package, desc: 'Stock físico y valorizado', requiereSucursal: true, requiereFechas: false },
            { id: 'MOVIMIENTOS', nombre: 'Kardex General', icono: TrendingUp, desc: 'Entradas, salidas y traslados', requiereSucursal: true, requiereFechas: true },
            { id: 'MERMAS', nombre: 'Mermas y Pérdidas', icono: AlertTriangle, desc: 'Productos dañados o extraviados', requiereSucursal: true, requiereFechas: true },
        ]
    },
    {
        grupo: "Documentos y Transacciones",
        reportes: [
            { id: 'PEDIDOS', nombre: 'Pedidos / Ventas', icono: ShoppingCart, desc: 'Órdenes de clientes (Precios Congelados)', requiereSucursal: true, requiereFechas: true },
            { id: 'COMPROBANTES', nombre: 'Comprobantes Internos', icono: FileText, desc: 'Recibos de emisión y control', requiereSucursal: true, requiereFechas: true },
            { id: 'TRASLADOS', nombre: 'Traslados de Mercancía', icono: ArrowRightLeft, desc: 'Auditoría de envíos entre tiendas', requiereSucursal: true, requiereFechas: true },
        ]
    },
    {
        grupo: "Directorios y Catálogo",
        reportes: [
            { id: 'PRODUCTOS', nombre: 'Catálogo de Productos', icono: Box, desc: 'Maestro de artículos', requiereSucursal: false, requiereFechas: false },
            { id: 'CLIENTES', nombre: 'Directorio de Clientes', icono: Users, desc: 'Cartera y estados de crédito', requiereSucursal: false, requiereFechas: false },
            { id: 'PROVEEDORES', nombre: 'Proveedores', icono: Briefcase, desc: 'Contactos y suministros', requiereSucursal: false, requiereFechas: false },
            { id: 'EMPLEADOS', nombre: 'Plantilla de Empleados', icono: Users, desc: 'Personal por sucursal', requiereSucursal: true, requiereFechas: false },
        ]
    }
]

export default function InformesPage() {
    const [reporteActivo, setReporteActivo] = useState(CATEGORIAS_REPORTES[0].reportes[0])
    const [datosBrutos, setDatosBrutos] = useState([])
    const [sucursales, setSucursales] = useState([])
    const [cargando, setCargando] = useState(false)

    // Filtros de Interfaz
    const [filtroSucursal, setFiltroSucursal] = useState('TODAS')
    const [fechaDesde, setFechaDesde] = useState('')
    const [fechaHasta, setFechaHasta] = useState('')
    const [busqueda, setBusqueda] = useState('')

    // Carga inicial de sucursales
    useEffect(() => {
        let activo = true
        const cargarSucursales = async () => {
            try {
                const res = await inventarioService.listarSucursales()
                if (activo) setSucursales(Array.isArray(res) ? res : (res?.data || res?.datos || []))
            } catch (err) {
                console.error('Error al obtener sucursales:', err)
            }
        }
        cargarSucursales()
        return () => { activo = false }
    }, [])

    const parseDateToBackend = (str) => {
        if (!str || str.trim() === '' || str.length < 10) return undefined
        const parts = str.split('/')
        if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`
        return str
    }

    const cargarDatos = useCallback(async () => {
        setCargando(true)
        setDatosBrutos([])
        try {
            const params = { page: 1, limit: 1000 }

            if (reporteActivo.requiereFechas) {
                const fDesde = parseDateToBackend(fechaDesde)
                const fHasta = parseDateToBackend(fechaHasta)
                if (fDesde) params.fecha_desde = fDesde
                if (fHasta) params.fecha_hasta = fHasta
            }

            let res = null
            switch (reporteActivo.id) {
                case 'INVENTARIO': res = await inventarioService.listar(params); break;
                case 'MOVIMIENTOS': res = await inventarioService.obtenerKardex(params); break;
                case 'MERMAS': res = await inventarioService.listarMermas(params); break;
                case 'PEDIDOS': res = await inventarioService.listarPedidos(params); break;
                case 'COMPROBANTES': res = await inventarioService.listarComprobantes(params); break;
                case 'TRASLADOS': res = await inventarioService.listarTraslados(params); break;
                case 'PRODUCTOS': res = await productoService.listarProductos(params); break;
                case 'CLIENTES': res = await clienteService.listarClientes(params); break;
                case 'PROVEEDORES': res = await proveedorService.listarProveedores(params); break;
                case 'EMPLEADOS': res = await empleadoService.listarEmpleados(params); break;
                default: throw new Error("Reporte no configurado");
            }

            const dataArray = Array.isArray(res) ? res : (res?.rows || res?.data?.rows || res?.data?.datos || res?.datos || res?.data || [])
            setDatosBrutos(dataArray)

            if (dataArray.length === 0) toast('No se encontraron registros en la base de datos.', { icon: 'ℹ️' })

        } catch (err) {
            console.error(`Error al cargar ${reporteActivo.id}:`, err)
            toast.error('Error del servidor al obtener datos.')
        } finally {
            setCargando(false)
        }
    }, [reporteActivo, fechaDesde, fechaHasta])

    useEffect(() => {
        setBusqueda('')
        setFiltroSucursal('TODAS')
        cargarDatos()
    }, [reporteActivo])

    // --- MOTOR DE FILTRADO EN TIEMPO REAL ---
    const datosFiltrados = useMemo(() => {
        let filtrados = [...datosBrutos]

        if (reporteActivo.requiereSucursal && filtroSucursal !== 'TODAS') {
            const idBuscada = String(filtroSucursal)
            filtrados = filtrados.filter(d => {
                const idItem = String(d.sucursal_id || d.sucursal?.id || d.sucursalOrigen?.id || d.sucursal_origen_id || d.sucursalDestino?.id || '')
                return idItem === idBuscada
            })
        }

        if (busqueda.trim() !== '') {
            const termino = busqueda.toLowerCase().trim()
            filtrados = filtrados.filter(d => JSON.stringify(d).toLowerCase().includes(termino))
        }

        return filtrados
    }, [datosBrutos, busqueda, filtroSucursal, reporteActivo])

    const handleFechaInput = (valor, setter) => {
        const numeros = valor.replace(/\D/g, '')
        let form = ''
        if (numeros.length > 0) {
            form = numeros.substring(0, 2)
            if (numeros.length > 2) form += '/' + numeros.substring(2, 4)
            if (numeros.length > 4) form += '/' + numeros.substring(4, 8)
        }
        setter(form)
    }

    const resetFiltros = () => {
        setBusqueda(''); setFiltroSucursal('TODAS'); setFechaDesde(''); setFechaHasta('');
    }

    // --- EXPORTACIÓN CSV ESTANDARIZADA CON PRECIOS HISTÓRICOS ---
    const exportarCSV = () => {
        if (datosFiltrados.length === 0) return toast.error('No hay datos filtrados para exportar')
        const escapeCSV = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`
        let headers = [], rows = []

        switch (reporteActivo.id) {
            case 'INVENTARIO':
                headers = ['Sucursal', 'SKU', 'Producto', 'Atributos', 'Stock Fisico', 'Costo Promedio', 'Valor Total']
                rows = datosFiltrados.map(d => [escapeCSV(d.sucursal?.nombre), escapeCSV(d.variante?.sku), escapeCSV(d.variante?.producto?.nombre), escapeCSV(`${d.variante?.talla?.codigo || ''} ${d.variante?.color?.nombre || ''}`.trim()), safeNumber(d.cantidad_fisica ?? d.cantidad), safeNumber(d.costo_promedio ?? d.variante?.costo_promedio), safeNumber((d.cantidad_fisica ?? d.cantidad) * (d.costo_promedio ?? d.variante?.costo_promedio))])
                break;
            case 'MOVIMIENTOS':
            case 'MERMAS':
                headers = ['Fecha', 'Sucursal', 'Producto', 'SKU', 'Tipo Movimiento', 'Cantidad', 'Saldo Resultante', 'Motivo']
                rows = datosFiltrados.map(d => [escapeCSV(new Date(d.createdAt || d.fecha).toLocaleString()), escapeCSV(d.sucursal?.nombre), escapeCSV(d.variante?.producto?.nombre), escapeCSV(d.variante?.sku), escapeCSV(d.tipo_movimiento || d.tipo), safeNumber(d.cantidad), safeNumber(d.saldo_resultante || d.saldo), escapeCSV(d.motivo || d.comprobante?.numero)])
                break;
            case 'PEDIDOS':
                headers = ['Fecha', 'Correlativo', 'Cliente', 'Estado', 'Total Pedido (Q)']
                rows = datosFiltrados.map(d => [
                    escapeCSV(new Date(d.createdAt || d.fecha).toLocaleString()),
                    escapeCSV(d.correlativo || d.numero || `#${d.id}`),
                    escapeCSV(d.cliente?.nombre || 'Consumidor Final'),
                    escapeCSV(d.estado),
                    safeNumber(d.total)
                ])
                break;
            case 'COMPROBANTES':
                headers = ['Fecha', 'Numero', 'Tipo', 'Sucursal', 'Estado', 'Tercero', 'Total']
                rows = datosFiltrados.map(d => [escapeCSV(new Date(d.createdAt).toLocaleString()), escapeCSV(d.numero), escapeCSV(`${d.tipo} - ${d.subtipo}`), escapeCSV(d.sucursal?.nombre), escapeCSV(d.estado || (d.anulado ? 'ANULADO' : 'EMITIDO')), escapeCSV(d.cliente?.nombre || d.proveedor?.nombre || 'Interno'), safeNumber(d.total)])
                break;
            case 'TRASLADOS':
                headers = ['Fecha', 'Numero', 'Origen', 'Destino', 'Estado', 'Despachado Por']
                rows = datosFiltrados.map(d => [escapeCSV(new Date(d.createdAt).toLocaleString()), escapeCSV(d.numero), escapeCSV(d.sucursalOrigen?.nombre), escapeCSV(d.sucursalDestino?.nombre), escapeCSV(d.estado), escapeCSV(d.despachador?.email)])
                break;
            case 'PRODUCTOS':
                headers = ['ID', 'SKU', 'Producto', 'Categoría', 'Marca', 'Precio Minorista', 'Precio Mayorista', 'Estado']
                rows = datosFiltrados.map(d => [
                    escapeCSV(d.id),
                    escapeCSV(d.sku || d.codigo),
                    escapeCSV(d.nombre),
                    escapeCSV(d.categoria?.nombre),
                    escapeCSV(d.marca?.nombre),
                    safeNumber(d.precio_minorista ?? d.precio_venta ?? d.precio ?? 0),
                    safeNumber(d.precio_mayorista ?? d.precio_base ?? d.costo ?? 0),
                    escapeCSV(d.activo ? 'ACTIVO' : 'INACTIVO')
                ])
                break;
            case 'CLIENTES':
                headers = ['ID', 'Cliente', 'NIT/CUI', 'Email', 'Telefono', 'Estado']
                rows = datosFiltrados.map(d => [escapeCSV(d.id), escapeCSV(d.nombre || d.razon_social), escapeCSV(d.nit || d.cui), escapeCSV(d.email), escapeCSV(d.telefono), escapeCSV(d.estado_credito || (d.activo ? 'ACTIVO' : 'INACTIVO'))])
                break;
            case 'PROVEEDORES':
                headers = ['ID', 'Proveedor', 'NIT', 'Email', 'Telefono', 'Estado']
                rows = datosFiltrados.map(d => [escapeCSV(d.id), escapeCSV(d.nombre_comercial || d.razon_social || d.empresa || d.nombre), escapeCSV(d.nit), escapeCSV(d.email || d.correo), escapeCSV(d.telefono), escapeCSV(d.activo ? 'ACTIVO' : 'INACTIVO')])
                break;
            case 'EMPLEADOS':
                headers = ['ID / Codigo', 'Nombre', 'Email', 'Rol', 'Sucursal', 'Activo']
                rows = datosFiltrados.map(d => [escapeCSV(d.codigo || d.dpi || d.id), escapeCSV(`${d.nombres || d.nombre} ${d.apellidos || ''}`.trim()), escapeCSV(d.usuario?.email || d.email), escapeCSV(d.usuario?.rol || d.puesto || d.rol), escapeCSV(d.sucursal?.nombre || 'General'), escapeCSV(d.activo ? 'SI' : 'NO')])
                break;
            default:
                headers = ['Datos']
                rows = datosFiltrados.map(d => [escapeCSV(JSON.stringify(d))])
        }

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement('a')
        link.setAttribute('href', encodedUri)
        link.setAttribute('download', `Reporte_${reporteActivo.id}_${new Date().toISOString().slice(0, 10)}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    // --- CÁLCULO DE KPIs CORREGIDO (EXCLUYE VENTAS ANULADAS) ---
    const kpis = useMemo(() => {
        if (datosFiltrados.length === 0) return null

        if (reporteActivo.id === 'INVENTARIO') {
            const totalStock = datosFiltrados.reduce((acc, d) => acc + safeNumber(d.cantidad_fisica ?? d.cantidad), 0)
            const valorTotal = datosFiltrados.reduce((acc, d) => acc + (safeNumber(d.cantidad_fisica ?? d.cantidad) * safeNumber(d.costo_promedio ?? d.variante?.costo_promedio)), 0)
            return [
                { label: 'Total de SKUs', valor: datosFiltrados.length, icono: Box, color: 'text-blue-600', bg: 'bg-blue-500/10' },
                { label: 'Unidades Físicas', valor: totalStock, icono: Package, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
                { label: 'Valorización Total', valor: formatQ(valorTotal), icono: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-500/10' }
            ]
        }
        if (reporteActivo.id === 'PEDIDOS') {
            const pedidosValidos = datosFiltrados.filter(d => !ESTADOS_EXCLUIDOS.includes(d.estado?.toUpperCase()))
            const totalVentas = pedidosValidos.reduce((acc, d) => acc + safeNumber(d.total), 0)
            const completados = datosFiltrados.filter(d => ['COMPLETADO', 'ENTREGADO', 'PAGADO'].includes(d.estado?.toUpperCase())).length
            
            return [
                { label: 'Pedidos Filtrados', valor: datosFiltrados.length, icono: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-500/10' },
                { label: 'Pedidos Exitosos', valor: completados, icono: Activity, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
                { label: 'Total Ingresos Reales', valor: formatQ(totalVentas), icono: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-500/10' }
            ]
        }
        if (reporteActivo.id === 'COMPROBANTES') {
            const emitidos = datosFiltrados.filter(d => d.estado !== 'ANULADO').length
            const valorGasto = datosFiltrados.reduce((acc, d) => d.estado !== 'ANULADO' ? acc + safeNumber(d.total) : acc, 0)
            return [
                { label: 'Emitidos (Activos)', valor: emitidos, icono: FileText, color: 'text-blue-600', bg: 'bg-blue-500/10' },
                { label: 'Anulados', valor: datosFiltrados.length - emitidos, icono: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-500/10' },
                { label: 'Total Transaccionado', valor: formatQ(valorGasto), icono: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-500/10' }
            ]
        }
        if (['PRODUCTOS', 'CLIENTES', 'PROVEEDORES', 'EMPLEADOS'].includes(reporteActivo.id)) {
            const activos = datosFiltrados.filter(d => d.activo || d.estado === 'ACTIVO' || d.estado_credito === 'APROBADO').length
            return [
                { label: 'Total Registros', valor: datosFiltrados.length, icono: Users, color: 'text-blue-600', bg: 'bg-blue-500/10' },
                { label: 'Activos / Aprobados', valor: activos, icono: Activity, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
                { label: 'Inactivos', valor: datosFiltrados.length - activos, icono: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-500/10' }
            ]
        }
        return [
            { label: 'Total Resultados', valor: datosFiltrados.length, icono: Activity, color: 'text-blue-600', bg: 'bg-blue-500/10' }
        ]
    }, [datosFiltrados, reporteActivo])

    // --- TABLAS ESTANDARIZADAS ---
    const renderTablaDinamica = () => {
        const WrapTable = ({ headers, children }) => (
            <div className="overflow-x-auto bg-card text-sm">
                <table className="w-full text-left">
                    <thead className="bg-muted/60 border-y text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        <tr>{headers.map((h, i) => <th key={i} className={`px-4 py-3 ${h.align || ''}`}>{h.label}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y text-xs">{children}</tbody>
                </table>
            </div>
        )
        const Badge = ({ text, type = 'default' }) => {
            const colors = {
                success: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
                danger: 'bg-destructive/10 text-destructive border-destructive/30',
                warning: 'bg-amber-500/10 text-amber-700 border-amber-200',
                info: 'bg-blue-500/10 text-blue-700 border-blue-200',
                default: 'bg-muted text-muted-foreground border-border'
            }
            return <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${colors[type]}`}>{text}</span>
        }

        if (reporteActivo.id === 'INVENTARIO') {
            return (
                <WrapTable headers={[{ label: 'SKU / Producto' }, { label: 'Sucursal' }, { label: 'Stock', align: 'text-center' }, { label: 'Costo Und.', align: 'text-right' }, { label: 'Valor Total', align: 'text-right' }]}>
                    {datosFiltrados.slice(0, 100).map(d => (
                        <tr key={d.id} className="hover:bg-muted/20">
                            <td className="px-4 py-3">
                                <div className="font-bold text-foreground">{d.variante?.producto?.nombre || d.producto?.nombre}</div>
                                <div className="font-mono text-[10px] text-muted-foreground">SKU: {d.variante?.sku || d.sku || '-'} • {d.variante?.talla?.codigo} {d.variante?.color?.nombre}</div>
                            </td>
                            <td className="px-4 py-3 font-medium">{d.sucursal?.nombre || 'General'}</td>
                            <td className="px-4 py-3 text-center font-bold">{safeNumber(d.cantidad_fisica ?? d.cantidad)} u.</td>
                            <td className="px-4 py-3 text-right">{formatQ(d.costo_promedio ?? d.variante?.costo_promedio)}</td>
                            <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatQ(safeNumber((d.cantidad_fisica ?? d.cantidad) * (d.costo_promedio ?? d.variante?.costo_promedio)))}</td>
                        </tr>
                    ))}
                </WrapTable>
            )
        }

        if (reporteActivo.id === 'MOVIMIENTOS' || reporteActivo.id === 'MERMAS') {
            return (
                <WrapTable headers={[{ label: 'Fecha' }, { label: 'Sucursal' }, { label: 'Producto / SKU' }, { label: 'Movimiento' }, { label: 'Cant.', align: 'text-center' }, { label: 'Saldo', align: 'text-center' }]}>
                    {datosFiltrados.slice(0, 100).map(d => (
                        <tr key={d.id} className="hover:bg-muted/20">
                            <td className="px-4 py-3 whitespace-nowrap">{new Date(d.createdAt || d.fecha).toLocaleString()}</td>
                            <td className="px-4 py-3">{d.sucursal?.nombre}</td>
                            <td className="px-4 py-3">
                                <div className="font-semibold">{d.variante?.producto?.nombre}</div>
                                <div className="font-mono text-[10px] text-muted-foreground">SKU: {d.variante?.sku}</div>
                            </td>
                            <td className="px-4 py-3">
                                <Badge text={d.tipo_movimiento || d.tipo} type={(d.tipo || '').includes('ENTRADA') ? 'success' : 'danger'} />
                                <div className="text-[10px] mt-1 text-muted-foreground truncate max-w-[150px]" title={d.motivo || d.comprobante?.numero}>{d.motivo || d.comprobante?.numero}</div>
                            </td>
                            <td className="px-4 py-3 text-center font-bold">{safeNumber(d.cantidad)}</td>
                            <td className="px-4 py-3 text-center text-muted-foreground font-mono font-medium">{safeNumber(d.saldo_resultante || d.saldo)}</td>
                        </tr>
                    ))}
                </WrapTable>
            )
        }

        if (reporteActivo.id === 'PEDIDOS') {
            return (
                <WrapTable headers={[{ label: 'Documento' }, { label: 'Fecha' }, { label: 'Cliente / Canal' }, { label: 'Estado', align: 'text-center' }, { label: 'Total', align: 'text-right' }]}>
                    {datosFiltrados.slice(0, 100).map(d => {
                        const esAnulado = ESTADOS_EXCLUIDOS.includes(d.estado?.toUpperCase())
                        return (
                            <tr key={d.id} className={`hover:bg-muted/20 ${esAnulado ? 'opacity-60 bg-rose-500/5' : ''}`}>
                                <td className="px-4 py-3 font-bold text-primary">{d.correlativo || d.numero || `#${d.id}`}</td>
                                <td className="px-4 py-3 text-muted-foreground">{new Date(d.createdAt || d.fecha).toLocaleString()}</td>
                                <td className="px-4 py-3">
                                    <div className="font-medium text-foreground">{d.cliente?.nombre || 'Consumidor Final'}</div>
                                    <div className="text-[10px] text-muted-foreground">{d.canal || 'TIENDA'}</div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <Badge text={d.estado || 'PENDIENTE'} type={esAnulado ? 'danger' : (d.estado === 'COMPLETADO' || d.estado === 'ENTREGADO' || d.estado === 'PAGADO') ? 'success' : 'info'} />
                                </td>
                                <td className={`px-4 py-3 text-right font-bold ${esAnulado ? 'line-through text-rose-600' : 'text-foreground'}`}>
                                    {formatQ(d.total)}
                                </td>
                            </tr>
                        )
                    })}
                </WrapTable>
            )
        }

        if (reporteActivo.id === 'COMPROBANTES') {
            return (
                <WrapTable headers={[{ label: 'N° Comprobante' }, { label: 'Fecha' }, { label: 'Concepto / Tipo' }, { label: 'Sucursal' }, { label: 'Estado', align: 'text-center' }, { label: 'Total', align: 'text-right' }]}>
                    {datosFiltrados.slice(0, 100).map(d => {
                        const estado = d.estado || (d.anulado ? 'ANULADO' : 'EMITIDO');
                        return (
                            <tr key={d.id} className="hover:bg-muted/20">
                                <td className="px-4 py-3 font-bold">{d.numero || `#${d.id}`}</td>
                                <td className="px-4 py-3 text-muted-foreground">{new Date(d.createdAt).toLocaleString()}</td>
                                <td className="px-4 py-3 font-medium">{d.tipo} - {d.subtipo}</td>
                                <td className="px-4 py-3 text-muted-foreground">{d.sucursal?.nombre || 'General'}</td>
                                <td className="px-4 py-3 text-center"><Badge text={estado} type={estado === 'ANULADO' ? 'danger' : 'success'} /></td>
                                <td className="px-4 py-3 text-right font-bold">{formatQ(d.total)}</td>
                            </tr>
                        )
                    })}
                </WrapTable>
            )
        }

        if (reporteActivo.id === 'TRASLADOS') {
            return (
                <WrapTable headers={[{ label: 'Traslado N°' }, { label: 'Fecha Despacho' }, { label: 'Origen' }, { label: 'Destino' }, { label: 'Estado', align: 'text-center' }, { label: 'Usuario' }]}>
                    {datosFiltrados.slice(0, 100).map(d => (
                        <tr key={d.id} className="hover:bg-muted/20">
                            <td className="px-4 py-3 font-bold">{d.numero}</td>
                            <td className="px-4 py-3 text-muted-foreground">{new Date(d.createdAt).toLocaleString()}</td>
                            <td className="px-4 py-3 font-medium">{d.sucursalOrigen?.nombre || d.sucursal_origen?.nombre}</td>
                            <td className="px-4 py-3 font-medium">{d.sucursalDestino?.nombre || d.sucursal_destino?.nombre}</td>
                            <td className="px-4 py-3 text-center">
                                <Badge text={d.estado} type={d.estado === 'RECIBIDO' ? 'success' : d.estado === 'PENDIENTE' ? 'warning' : 'info'} />
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{d.despachador?.email || d.despachador?.nombre || '-'}</td>
                        </tr>
                    ))}
                </WrapTable>
            )
        }

        if (reporteActivo.id === 'PRODUCTOS') {
            return (
                <WrapTable headers={[
                    { label: 'Producto / SKU' },
                    { label: 'Categoría / Marca' },
                    { label: 'Precio Minorista', align: 'text-right' },
                    { label: 'Precio Mayorista', align: 'text-right' },
                    { label: 'Estado', align: 'text-center' }
                ]}>
                    {datosFiltrados.slice(0, 100).map(d => {
                        const precioMinorista = d.precio_minorista ?? d.precio_venta ?? d.precio ?? 0;
                        const precioMayorista = d.precio_mayorista ?? d.precio_base ?? d.costo ?? 0;

                        return (
                            <tr key={d.id} className="hover:bg-muted/20">
                                <td className="px-4 py-3">
                                    <div className="font-bold text-foreground">{d.nombre}</div>
                                    <div className="font-mono text-[10px] text-muted-foreground">SKU: {d.sku || d.codigo || 'N/A'}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="font-medium text-foreground">{d.categoria?.nombre || 'General'}</div>
                                    <div className="text-[10px] text-muted-foreground">{d.marca?.nombre || 'Sin marca'}</div>
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-foreground">
                                    {formatQ(precioMinorista)}
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-emerald-600">
                                    {formatQ(precioMayorista)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <Badge text={d.activo ? 'ACTIVO' : 'INACTIVO'} type={d.activo ? 'success' : 'danger'} />
                                </td>
                            </tr>
                        )
                    })}
                </WrapTable>
            )
        }

        if (reporteActivo.id === 'CLIENTES') {
            return (
                <WrapTable headers={[{ label: 'Cliente' }, { label: 'NIT / Documento' }, { label: 'Contacto' }, { label: 'Estado', align: 'text-center' }]}>
                    {datosFiltrados.slice(0, 100).map(d => (
                        <tr key={d.id} className="hover:bg-muted/20">
                            <td className="px-4 py-3 font-bold text-foreground">{d.nombre || d.razon_social}</td>
                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{d.nit || d.cui || 'C/F'}</td>
                            <td className="px-4 py-3">
                                <div className="font-medium text-foreground">{d.email || 'Sin correo'}</div>
                                <div className="text-[10px] text-muted-foreground">{d.telefono || 'Sin teléfono'}</div>
                            </td>
                            <td className="px-4 py-3 text-center">
                                <Badge text={d.estado_credito || (d.activo ? 'ACTIVO' : 'INACTIVO')} type={(d.estado_credito === 'APROBADO' || d.activo) ? 'success' : 'warning'} />
                            </td>
                        </tr>
                    ))}
                </WrapTable>
            )
        }

        if (reporteActivo.id === 'PROVEEDORES') {
            return (
                <WrapTable headers={[{ label: 'Proveedor / Empresa' }, { label: 'NIT' }, { label: 'Contacto' }, { label: 'Estado', align: 'text-center' }]}>
                    {datosFiltrados.slice(0, 100).map(d => (
                        <tr key={d.id} className="hover:bg-muted/20">
                            <td className="px-4 py-3 font-bold text-foreground">
                                {d.nombre_comercial || d.razon_social || d.empresa || d.nombre || 'Sin nombre'}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{d.nit || 'N/A'}</td>
                            <td className="px-4 py-3">
                                <div className="font-medium text-foreground">{d.email || d.correo || 'Sin correo'}</div>
                                <div className="text-[10px] text-muted-foreground">{d.telefono || 'Sin teléfono'}</div>
                            </td>
                            <td className="px-4 py-3 text-center">
                                <Badge text={d.activo ? 'ACTIVO' : 'INACTIVO'} type={d.activo ? 'success' : 'danger'} />
                            </td>
                        </tr>
                    ))}
                </WrapTable>
            )
        }

        if (reporteActivo.id === 'EMPLEADOS') {
            return (
                <WrapTable headers={[{ label: 'Código / DPI' }, { label: 'Empleado' }, { label: 'Puesto / Rol' }, { label: 'Sucursal' }, { label: 'Estado', align: 'text-center' }]}>
                    {datosFiltrados.slice(0, 100).map(d => (
                        <tr key={d.id} className="hover:bg-muted/20">
                            <td className="px-4 py-3 font-mono text-muted-foreground">{d.codigo || d.dpi || d.id}</td>
                            <td className="px-4 py-3">
                                <div className="font-bold text-foreground">{d.nombres || d.nombre} {d.apellidos || ''}</div>
                                <div className="text-[10px] text-muted-foreground">{d.usuario?.email || d.email}</div>
                            </td>
                            <td className="px-4 py-3"><Badge text={d.puesto || d.usuario?.rol || d.rol || 'EMPLEADO'} type="info" /></td>
                            <td className="px-4 py-3">{d.sucursal?.nombre || 'General'}</td>
                            <td className="px-4 py-3 text-center"><Badge text={d.activo ? 'ACTIVO' : 'INACTIVO'} type={d.activo ? 'success' : 'danger'} /></td>
                        </tr>
                    ))}
                </WrapTable>
            )
        }
    }

    return (
        <div className="flex flex-col gap-6 p-6 max-w-[1600px] mx-auto min-h-screen" translate="no">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <BarChart3 className="text-primary" /> Analítica y Reportes
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Módulo ejecutivo de información centralizada.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={cargarDatos} disabled={cargando} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-primary/90 shadow transition-colors disabled:opacity-50">
                        <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} /> Procesar Datos
                    </button>
                    <button onClick={exportarCSV} disabled={datosFiltrados.length === 0 || cargando} className="inline-flex items-center gap-2 border bg-card text-emerald-600 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-50 transition-colors shadow-sm disabled:opacity-50">
                        <FileSpreadsheet size={15} /> Exportar Reporte
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                <div className="w-full lg:w-72 flex flex-col gap-6">
                    {CATEGORIAS_REPORTES.map((categoria, idx) => (
                        <div key={idx}>
                            <h3 className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider mb-2.5 ml-1">
                                {categoria.grupo}
                            </h3>
                            <div className="flex flex-col gap-1.5">
                                {categoria.reportes.map(rep => {
                                    const activo = reporteActivo.id === rep.id
                                    const Icono = rep.icono
                                    return (
                                        <button key={rep.id} onClick={() => setReporteActivo(rep)} className={`flex items-start gap-3 text-left p-3.5 rounded-xl transition-all border ${activo ? 'bg-primary/5 text-primary font-semibold border-primary/40 shadow-sm' : 'bg-card border-transparent hover:border-primary/20 hover:bg-muted/50 text-foreground'}`}>
                                            <Icono size={18} className={`mt-0.5 ${activo ? 'text-primary' : 'text-muted-foreground'}`} />
                                            <div>
                                                <div className="text-sm">{rep.nombre}</div>
                                                <div className="text-[11px] text-muted-foreground font-normal leading-tight mt-0.5">{rep.desc}</div>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex-1 flex flex-col gap-5">
                    <div className="bg-card border rounded-2xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        <div className="relative md:col-span-4">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input type="text" placeholder={`Filtrar en ${reporteActivo.nombre}...`} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full rounded-xl border bg-background pl-10 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary transition-all" />
                        </div>
                        <div className="relative md:col-span-3">
                            <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <select value={filtroSucursal} onChange={(e) => setFiltroSucursal(e.target.value)} disabled={!reporteActivo.requiereSucursal} className="w-full rounded-xl border bg-background pl-10 pr-3 py-2 text-xs font-medium outline-none disabled:opacity-40 cursor-pointer">
                                <option value="TODAS">Todas las Sucursales</option>
                                {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                        </div>
                        <div className={`md:col-span-4 flex items-center justify-center gap-2 bg-muted/40 border rounded-xl px-3 py-1.5 ${!reporteActivo.requiereFechas && 'opacity-40 pointer-events-none'}`}>
                            <Calendar size={14} className="text-muted-foreground shrink-0" />
                            <input type="text" placeholder="DD/MM/AAAA" value={fechaDesde} onChange={(e) => handleFechaInput(e.target.value, setFechaDesde)} maxLength={10} className="w-full bg-transparent text-center text-xs font-medium outline-none placeholder:text-muted-foreground/60" />
                            <span className="text-muted-foreground text-xs font-bold">-</span>
                            <input type="text" placeholder="DD/MM/AAAA" value={fechaHasta} onChange={(e) => handleFechaInput(e.target.value, setFechaHasta)} maxLength={10} className="w-full bg-transparent text-center text-xs font-medium outline-none placeholder:text-muted-foreground/60" />
                        </div>
                        <div className="md:col-span-1 flex justify-end">
                            <button onClick={resetFiltros} className="p-2 border rounded-xl hover:bg-muted text-muted-foreground transition-colors"><FilterX size={16} /></button>
                        </div>
                    </div>

                    {!cargando && kpis && datosFiltrados.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {kpis.map((kpi, idx) => (
                                <div key={idx} className="bg-card border rounded-2xl p-4 shadow-sm flex items-center gap-4">
                                    <div className={`p-3 rounded-xl ${kpi.bg} ${kpi.color}`}>
                                        <kpi.icono size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">{kpi.label}</p>
                                        <p className="text-2xl font-black text-foreground">{kpi.valor}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex-1 rounded-2xl shadow-sm border bg-card flex flex-col overflow-hidden">
                        {cargando ? (
                            <div className="flex-1 min-h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                                <RefreshCw size={40} className="animate-spin mb-4 text-primary" />
                                <p className="text-sm font-medium">Extrayendo datos corporativos...</p>
                            </div>
                        ) : datosFiltrados.length === 0 ? (
                            <div className="flex-1 min-h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                                <BarChart3 size={56} className="mb-4 opacity-20" />
                                <p className="text-sm font-medium">No se encontraron datos que coincidan con los filtros.</p>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-auto max-h-[600px] custom-scrollbar">
                                {renderTablaDinamica()}
                            </div>
                        )}
                        {datosFiltrados.length > 100 && !cargando && (
                            <div className="p-3 text-center bg-muted/30 text-muted-foreground text-xs font-medium border-t">
                                Mostrando los primeros 100 resultados en pantalla. Exporte a CSV para ver el reporte completo.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}