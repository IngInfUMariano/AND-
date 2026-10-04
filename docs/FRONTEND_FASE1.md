# Frontend — Fase 1: Infraestructura base

## Objetivo de la fase

Levantar lo mínimo para que el equipo pueda trabajar en paralelo: dos apps React
corriendo, autenticación funcionando de punta a punta contra la API real, y las
abstracciones base (cliente HTTP, contexto de auth, rutas protegidas, layouts)
listas para que cada módulo se construya encima.

**Hito de cierre:** un usuario ADMIN puede iniciar sesión con el seed, ver el
layout del portal y cerrar sesión. Cuando eso funcione, la fase está completa.

---

## Estructura de carpetas

```
ProyectoFinal/
├── src/               ← backend (Express + Sequelize)
├── client-tienda/     ← React — tienda pública (CLIENTE)
└── client-admin/      ← React — portal interno (ADMIN, GERENTE, BODEGUERO, VENDEDOR)
```

Cada app es un proyecto Vite independiente creado con:

```bash
npm create vite@latest client-tienda -- --template react
npm create vite@latest client-admin  -- --template react
```

---

## Stack por app

| Librería | client-tienda | client-admin | Motivo |
|---|---|---|---|
| vite + react | ✓ | ✓ | Dev rápido, HMR |
| react-router-dom | ✓ | ✓ | Routing del lado cliente |
| axios | ✓ | ✓ | Interceptores para JWT y errores |
| tailwindcss | ✓ | ✓ | Utilidades CSS, pareja natural de shadcn |
| shadcn/ui | ✓ | ✓ | Componentes propios (copy-paste), no una librería externa |
| react-hook-form | ✓ | ✓ | Formularios sin re-renders innecesarios |
| react-hot-toast | ✓ | ✓ | Notificaciones globales |
| @stripe/react-stripe-js | ✓ | — | Solo tienda necesita el formulario de pago |
| recharts | — | ✓ | Solo admin tiene reportes con gráficas |

**Por qué shadcn/ui sobre Mantine:** los componentes se copian al proyecto y son
código propio — se pueden modificar sin workarounds. Mantine trae su propio sistema
de estilos que convive mal con Tailwind cuando se personaliza.

**Por qué Axios sobre fetch:** los interceptores para inyectar el Bearer token y
manejar globalmente 401/403/422 son más limpios con Axios. Con fetch se necesita
un wrapper manual que termina siendo más código.

---

## CORS y proxy de desarrollo

El backend usa `app.use(cors())` sin restricciones de origen (válido para
desarrollo). En producción deberá restringirse con `CORS_ORIGINS`.

Para desarrollo se usa el **proxy de Vite** en lugar de confiar en el CORS abierto:

```js
// vite.config.js (igual en ambas apps)
export default defineConfig({
  server: {
    proxy: {
      "/api": "http://localhost:3000"
    }
  }
})
```

Beneficio: el navegador nunca hace una petición cross-origin en dev. El patrón
se traduce directamente a producción (nginx hace el mismo proxy). No hay que
tocar variables de entorno del backend para desarrollo.

---

## Separación de sesiones (por qué dos apps, no una)

El backend rechaza con `403` cualquier request donde el campo `app` del JWT no
coincida con el endpoint. Un token de tienda falla en el portal y viceversa.
Una sola app React con lógica condicional replicaría esa separación en el
cliente sin ningún beneficio. Dos apps = un token, un contexto, sin ambigüedad.

Campos del JWT payload:

| Campo | Descripción |
|---|---|
| `id` | ID del usuario |
| `perfil` | `ADMIN`, `GERENTE`, `BODEGUERO`, `VENDEDOR`, `CLIENTE` |
| `sucursal_id` | Sucursal asignada (null para CLIENTE) |
| `tipo_cliente` | `MINORISTA`, `MAYORISTA` o null |
| `app` | `"interno"` o `"tienda"` |

`sucursal_id` en el token evita llamadas extras para BODEGUERO y VENDEDOR, que
solo ven datos de su sucursal.

---

## Almacenamiento del token

| App | Storage | Razón |
|---|---|---|
| client-tienda | `localStorage` | JWT de 30 días; el cliente quiere seguir logueado entre sesiones |
| client-admin | `localStorage` | JWT de 8h; el tiempo de expiración ya maneja el riesgo de seguridad |

El interceptor de Axios limpia el storage y redirige al login cuando el servidor
devuelve 401 (token expirado o inválido).

---

## AuthContext

Ambas apps tienen su propio `AuthContext`. Comportamiento:

1. Al montar, decodifica el token del localStorage con `jwt-decode` y lo pone
   en el estado **de forma síncrona** — sin llamada a la API, sin flash de
   loading.
2. En background, llama a `GET /api/auth/me` para validar que el token sigue
   siendo válido en el servidor.
3. Si `/me` devuelve 401, limpiar estado y redirigir a login.

API del contexto:

```js
const { usuario, login, logout, cargando } = useAuth();

// usuario tiene la forma del JWT payload:
// { id, perfil, sucursal_id, tipo_cliente, app }
```

---

## Cliente Axios (`src/services/api.js`)

El mismo archivo (duplicado) en ambas apps:

```js
import axios from "axios";

const api = axios.create({ baseURL: "/api" });

// Request: inyectar Bearer token si existe
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response: manejar errores globales
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const mensaje = error.response?.data?.error?.mensaje;

    if (status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    } else if (status === 403 || status === 422) {
      // Los componentes que llaman la API deben mostrar toast con `mensaje`
      // El interceptor lo re-lanza para que el componente lo maneje si quiere
    }
    // status 400: el componente del formulario lo maneja (mapea detalles a campos)
    // status 500: toast genérico en el componente o aquí si se prefiere global

    return Promise.reject(error);
  }
);

export default api;
```

---

## Manejo de errores del contrato

| HTTP | Qué hace el interceptor | Qué hace el componente |
|---|---|---|
| 401 | Limpia token + redirect a /login | — |
| 403 | Re-lanza | Toast con `error.mensaje` |
| 422 | Re-lanza | Toast con `error.mensaje` |
| 400 | Re-lanza | Mapea `error.detalles` a campos del form con `setError` de RHF |
| 404 | Re-lanza | Muestra mensaje inline o página NotFound |
| 500 | Re-lanza | Toast genérico "Error inesperado" |

Referencia del contrato: `docs/API.md` §9 Errores comunes.

---

## Rutas protegidas

### `ProtectedRoute`

Si no hay token (o es inválido): redirige a `/login`.

```jsx
const ProtectedRoute = ({ children }) => {
  const { usuario, cargando } = useAuth();
  if (cargando) return <Spinner />;
  if (!usuario) return <Navigate to="/login" replace />;
  return children;
};
```

### `RoleRoute`

Si el perfil del usuario no está en la lista permitida: redirige a `/403`.

```jsx
const RoleRoute = ({ roles, children }) => {
  const { usuario } = useAuth();
  if (!roles.includes(usuario?.perfil)) return <Navigate to="/403" replace />;
  return children;
};
```

Perfiles y acceso en el portal:

| Perfil | Acceso |
|---|---|
| ADMIN | Todo |
| GERENTE | Catálogo, inventario, pedidos, terceros, reportes — no config sistema |
| VENDEDOR | Clientes, pedidos, ver catálogo |
| BODEGUERO | Inventario, traslados, comprobantes |

La tienda solo tiene perfil CLIENTE. No necesita RoleRoute.

---

## Layouts

### client-admin

- Barra lateral fija con menú agrupado por módulo
- El menú se filtra según el perfil (`useAuth().usuario.perfil`)
- Área de contenido con `<Outlet />`
- Header con nombre de usuario, sucursal y botón de logout

### client-tienda

- Header con logo, buscador, ícono de carrito (badge con cantidad) y acceso a cuenta
- El carrito badge se actualiza con un contexto `CartContext` (Fase 2)
- Área de contenido con `<Outlet />`

---

## Orden de implementación

```
1. Scaffolding ambas apps + deps + proxy Vite
2. src/services/api.js  (axios + interceptores)
3. AuthContext + useAuth hook
4. ProtectedRoute + RoleRoute
5. Login page (react-hook-form, valida 401 y muestra error)
6. Layout admin (sidebar) + Layout tienda (header)
7. Ruta raíz → redirige al layout si hay sesión, a login si no
8. Verificar hito: ADMIN del seed → login → layout → logout
```

Pasos 2-4 son puramente lógica (sin UI visible), deben salir primero para que
el resto del equipo los use como base al construir pantallas.

---

## Lo que NO entra en Fase 1

- Componentes genéricos de tabla o modal: shadcn/ui ya los trae; crearlos cuando
  el primer módulo real los necesite.
- `recharts` y `@stripe/react-stripe-js`: instalar solo cuando empiece el módulo
  que los usa para no contaminar el bundle base.
- Código compartido entre las dos apps: el cliente Axios son ~30 líneas; duplicar
  es más simple que un workspace monorepo para un equipo que está aprendiendo React.
- Cualquier pantalla de módulo (catálogo, inventario, pedidos, etc.).

---

## Variables de entorno del frontend

Cada app necesita un `.env` propio:

```
# client-tienda/.env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

```
# client-admin/.env
# (vacío en Fase 1; recharts y otros no necesitan variables)
```

La URL base de la API va en el proxy de Vite en dev y en la config de nginx en
producción — no se necesita `VITE_API_URL`.
