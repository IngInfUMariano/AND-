import { useState, useEffect } from 'react'
import { 
    DollarSign, ShoppingCart, Package, Users, AlertTriangle, 
    ArrowRightLeft, TrendingUp, Activity, Clock, CheckCircle2 
} from 'lucide-react'
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line 
} from 'recharts'

// Mock de autenticación (Aquí deberías importar tu hook real: const { user } = useAuth())
// Cámbialo a 'VENDEDOR' o 'BODEGA' para ver cómo cambia la interfaz
const MOCK_USER = {
    nombre: 'José Luis',
    rol: 'ADMIN', // Opciones sugeridas: 'ADMIN', 'VENDEDOR', 'BODEGA'
    sucursal: 'Sucursal Central'
}

const formatQ = (val) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(val || 0)

export default function DashboardPage() {
    // En producción, sustituye MOCK_USER por tu contexto de usuario real
    const user = MOCK_USER; 
    
    const [cargando, setCargando] = useState(true)
    const [estadisticas, setEstadisticas] = useState(null)

    // Simulador de carga de datos desde el Backend (Reemplazar con tus servicios)
    useEffect(() => {
        const fetchDashboardData = async () => {
            setCargando(true)
            try {
                // TODO: Aquí llamarías a tus servicios reales, ej:
                // const res = await dashboardService.getStatsPorRol(user.rol)
                
                // MOCK DE DATOS DEL BACKEND SEGÚN ROL:
                setTimeout(() => {
                    const mockData = {
                        ADMIN: {
                            kpis: [
                                { titulo: "Ventas del Día", valor: formatQ(12450.50), subtitulo: "+15% vs ayer", icono: DollarSign, color: "text-emerald-600", bg: "bg-emerald-500/10" },
                                { titulo: "Pedidos Activos", valor: "42", subtitulo: "12 por despachar", icono: ShoppingCart, color: "text-blue-600", bg: "bg-blue-500/10" },
                                { titulo: "Valor Inventario", valor: formatQ(285400), subtitulo: "En todas las sucursales", icono: Package, color: "text-indigo-600", bg: "bg-indigo-500/10" },
                                { titulo: "Clientes Registrados", valor: "1,204", subtitulo: "8 nuevos hoy", icono: Users, color: "text-violet-600", bg: "bg-violet-500/10" }
                            ],
                            graficoTitulo: "Evolución de Ingresos (Últimos 7 días)",
                            graficoDatos: [
                                { name: 'Lun', Ventas: 4000 }, { name: 'Mar', Ventas: 3000 }, { name: 'Mié', Ventas: 5000 },
                                { name: 'Jue', Ventas: 2780 }, { name: 'Vie', Ventas: 8900 }, { name: 'Sáb', Ventas: 12390 }, { name: 'Dom', Ventas: 3490 }
                            ]
                        },
                        VENDEDOR: {
                            kpis: [
                                { titulo: "Mis Ventas Hoy", valor: formatQ(3200), subtitulo: "Meta diaria: Q5,000", icono: DollarSign, color: "text-emerald-600", bg: "bg-emerald-500/10" },
                                { titulo: "Mis Pedidos Pendientes", valor: "5", subtitulo: "Requieren atención", icono: Clock, color: "text-amber-600", bg: "bg-amber-500/10" },
                                { titulo: "Pedidos Entregados", valor: "18", subtitulo: "Hoy", icono: CheckCircle2, color: "text-blue-600", bg: "bg-blue-500/10" },
                                { titulo: "Comisiones Estimadas", valor: formatQ(160), subtitulo: "Alcanzado al momento", icono: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-500/10" }
                            ],
                            graficoTitulo: "Mis Ventas Personales vs Meta",
                            graficoDatos: [
                                { name: 'Lun', Ventas: 1200 }, { name: 'Mar', Ventas: 2100 }, { name: 'Mié', Ventas: 800 },
                                { name: 'Jue', Ventas: 1600 }, { name: 'Vie', Ventas: 2400 }, { name: 'Sáb', Ventas: 3200 }, { name: 'Dom', Ventas: 0 }
                            ]
                        },
                        BODEGA: {
                            kpis: [
                                { titulo: "Productos Totales", valor: "8,450", subtitulo: "Unidades físicas", icono: Package, color: "text-blue-600", bg: "bg-blue-500/10" },
                                { titulo: "Alertas Stock Bajo", valor: "24", subtitulo: "SKUs críticos", icono: AlertTriangle, color: "text-rose-600", bg: "bg-rose-500/10" },
                                { titulo: "Traslados en Ruta", valor: "6", subtitulo: "Hacia sucursales", icono: ArrowRightLeft, color: "text-amber-600", bg: "bg-amber-500/10" },
                                { titulo: "Entradas Hoy", valor: "150", subtitulo: "Unidades recibidas", icono: Activity, color: "text-emerald-600", bg: "bg-emerald-500/10" }
                            ],
                            graficoTitulo: "Flujo de Inventario (Entradas vs Salidas)",
                            graficoDatos: [
                                { name: 'Lun', Movimientos: 400 }, { name: 'Mar', Movimientos: 300 }, { name: 'Mié', Movimientos: 200 },
                                { name: 'Jue', Movimientos: 278 }, { name: 'Vie', Movimientos: 189 }, { name: 'Sáb', Movimientos: 239 }, { name: 'Dom', Movimientos: 34 }
                            ]
                        }
                    }

                    // Datos de detalle universales para el ejemplo
                    const actividadReciente = [
                        { id: 1, desc: "Pedido #1042 completado", tiempo: "Hace 5 min", tipo: "success" },
                        { id: 2, desc: "Stock bajo en: Pantalón Cargo Táctico", tiempo: "Hace 12 min", tipo: "warning" },
                        { id: 3, desc: "Traslado #TR-004 recibido", tiempo: "Hace 1 hora", tipo: "info" },
                        { id: 4, desc: "Nueva merma registrada (Sucursal Zona 1)", tiempo: "Hace 2 horas", tipo: "danger" },
                        { id: 5, desc: "Cierre de caja matutino realizado", tiempo: "Hace 4 horas", tipo: "default" },
                    ]

                    setEstadisticas({ ...mockData[user.rol], actividadReciente })
                    setCargando(false)
                }, 800) // Simulación de red
            } catch (error) {
                console.error("Error al cargar dashboard", error)
                setCargando(false)
            }
        }
        fetchDashboardData()
    }, [user.rol])

    // --- RENDERIZADORES DE UI ---
    
    // Nivel 1: KPIs Principales (De izquierda a derecha por importancia)
    const renderKPIs = () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {estadisticas.kpis.map((kpi, idx) => (
                <div key={idx} className="bg-card border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">{kpi.titulo}</p>
                            <h3 className="text-3xl font-black text-foreground mt-1 mb-0.5">{kpi.valor}</h3>
                            <p className="text-xs text-muted-foreground">{kpi.subtitulo}</p>
                        </div>
                        <div className={`p-3 rounded-xl ${kpi.bg} ${kpi.color}`}>
                            <kpi.icono size={22} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )

    // Nivel 2: Contexto y Tendencias (Gráfico Izquierda, Listado Derecha)
    const renderMiddleSection = () => (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Izquierda: Gráfico Principal (Más amplio, muestra el cuadro completo) */}
            <div className="lg:col-span-2 bg-card border rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-foreground mb-4">{estadisticas.graficoTitulo}</h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        {user.rol === 'ADMIN' ? (
                            <LineChart data={estadisticas.graficoDatos}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} tickFormatter={(value) => `Q${value}`} />
                                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                <Line type="monotone" dataKey="Ventas" stroke="#10b981" strokeWidth={3} dot={{r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                            </LineChart>
                        ) : (
                            <BarChart data={estadisticas.graficoDatos}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                                <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                <Bar dataKey={user.rol === 'BODEGA' ? 'Movimientos' : 'Ventas'} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Derecha: Actividad Reciente (Más estrecho, detalle temporal) */}
            <div className="lg:col-span-1 bg-card border rounded-2xl p-5 shadow-sm flex flex-col">
                <h3 className="text-sm font-bold text-foreground mb-4">Registro de Actividad</h3>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="space-y-4">
                        {estadisticas.actividadReciente.map((act) => {
                            const colors = {
                                success: 'bg-emerald-500', warning: 'bg-amber-500', 
                                danger: 'bg-rose-500', info: 'bg-blue-500', default: 'bg-slate-400'
                            }
                            return (
                                <div key={act.id} className="flex gap-3 items-start relative">
                                    <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${colors[act.tipo]}`}></div>
                                    <div>
                                        <p className="text-sm text-foreground font-medium">{act.desc}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">{act.tiempo}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
                <button className="w-full mt-4 text-xs font-bold text-primary hover:underline text-center">
                    Ver registro completo
                </button>
            </div>
        </div>
    )

    // Nivel 3: Detalle Accionable (Tabla Inferior - Máximo Detalle)
    const renderBottomSection = () => (
        <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-muted/20 flex justify-between items-center">
                <h3 className="text-sm font-bold text-foreground">
                    {user.rol === 'ADMIN' ? 'Últimas Transacciones' : user.rol === 'VENDEDOR' ? 'Mis Últimos Pedidos' : 'Alertas de Inventario Crítico'}
                </h3>
            </div>
            <div className="overflow-x-auto text-sm">
                <table className="w-full text-left">
                    <thead className="bg-muted/10 border-b text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        <tr>
                            <th className="px-4 py-3">Identificador</th>
                            <th className="px-4 py-3">Detalle / Cliente</th>
                            <th className="px-4 py-3 text-center">Estado</th>
                            <th className="px-4 py-3 text-right">Monto / Stock</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y text-xs">
                        {/* Mock simple para la tabla de acción */}
                        <tr className="hover:bg-muted/20">
                            <td className="px-4 py-3 font-bold text-primary">#TRX-0982</td>
                            <td className="px-4 py-3 font-medium text-foreground">Cliente Final<br/><span className="text-[10px] text-muted-foreground font-normal">Mostrador principal</span></td>
                            <td className="px-4 py-3 text-center"><span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-emerald-500/10 text-emerald-700">COMPLETADO</span></td>
                            <td className="px-4 py-3 text-right font-bold text-foreground">Q 850.00</td>
                        </tr>
                        <tr className="hover:bg-muted/20">
                            <td className="px-4 py-3 font-bold text-primary">#TRX-0981</td>
                            <td className="px-4 py-3 font-medium text-foreground">Distribuidora Sur<br/><span className="text-[10px] text-muted-foreground font-normal">Canal B2B</span></td>
                            <td className="px-4 py-3 text-center"><span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-amber-500/10 text-amber-700">PENDIENTE PAGO</span></td>
                            <td className="px-4 py-3 text-right font-bold text-foreground">Q 4,200.00</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    )

    return (
        <div className="flex flex-col gap-2 p-6 max-w-[1600px] mx-auto min-h-screen" translate="no">
            
            {/* Header del Dashboard */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Hola, {user.nombre} 👋
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Panel de Control • <span className="font-semibold text-primary">{user.rol}</span> • {new Date().toLocaleDateString('es-GT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
            </div>

            {cargando ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground h-[60vh]">
                    <Activity size={48} className="animate-pulse mb-4 text-primary opacity-50" /> 
                    <p className="text-sm font-medium">Preparando tu espacio de trabajo...</p>
                </div>
            ) : (
                <>
                    {/* Nivel 1: KPIs */}
                    {renderKPIs()}

                    {/* Nivel 2: Gráficos y Actividad */}
                    {renderMiddleSection()}

                    {/* Nivel 3: Tabla de Detalles */}
                    {renderBottomSection()}
                </>
            )}
        </div>
    )
}