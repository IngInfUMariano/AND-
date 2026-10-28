// @ts-check
const { test, expect } = require('@playwright/test')

// ─── Credenciales del seed ────────────────────────────────────────────────────
const ADMIN    = { email: 'admin@inventa.gt',      password: 'Admin123!'    }
const BODEGA   = { email: 'bodega@inventa.gt',      password: 'Bodega123!'   }
const VENDEDOR = { email: 'vendedor1@inventa.gt',   password: 'Vendedor123!' }

// ─── Helper: autenticación programática ──────────────────────────────────────
// Evita la race condition React 18 (setUsuario + navigate en el mismo tick)
// inyectando el token directamente en localStorage antes de cargar la app.
async function loginAs(page, { email, password }) {
  const resp = await page.request.post('http://localhost:3000/api/auth/interno', {
    data: { email, password },
  })
  const body = await resp.json()
  const token = body.data.token

  await page.goto('/login')
  await page.evaluate((t) => localStorage.setItem('token', t), token)

  // AuthProvider lee el token del localStorage en el montaje
  await page.goto('/dashboard')
  await expect(page.locator('aside')).toBeVisible({ timeout: 12_000 })
}

// Helper: espera a que desaparezca cualquier spinner de carga
async function waitForNoSpinner(page, timeout = 12_000) {
  await page.waitForFunction(
    () => !document.querySelector('[class*="animate-spin"]'),
    { timeout }
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOQUE 1 — AUTENTICACIÓN
// ══════════════════════════════════════════════════════════════════════════════
test.describe('Autenticación', () => {
  test('login con credenciales correctas muestra el dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', ADMIN.email)
    await page.fill('input[type="password"]', ADMIN.password)
    await page.click('button[type="submit"]')
    await expect(page.locator('aside')).toBeVisible({ timeout: 15_000 })
  })

  test('login con contraseña incorrecta muestra toast de error', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', ADMIN.email)
    await page.fill('input[type="password"]', 'WrongPass999!')
    await page.click('button[type="submit"]')
    await expect(
      page.getByText(/contraseña|credenciales|inválid|incorrecta|error/i).first()
    ).toBeVisible({ timeout: 5_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('formulario valida campos vacíos sin llamar al servidor', async ({ page }) => {
    await page.goto('/login')
    await page.click('button[type="submit"]')
    await expect(page.getByText('El correo es obligatorio')).toBeVisible()
    await expect(page.getByText('La contraseña es obligatoria')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('ruta protegida sin sesión redirige a /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('logout limpia la sesión y redirige a /login', async ({ page }) => {
    await loginAs(page, ADMIN)
    await page.click('button:has-text("Cerrar sesión")')
    await expect(page).toHaveURL(/\/login/)
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// BLOQUE 2 — DASHBOARD Y LAYOUT
// ══════════════════════════════════════════════════════════════════════════════
test.describe('Dashboard y Layout', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN)
  })

  test('muestra el saludo de bienvenida', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Bienvenido' })).toBeVisible()
  })

  test('muestra el perfil del usuario autenticado', async ({ page }) => {
    await expect(page.locator('aside').getByText('ADMIN')).toBeVisible()
  })

  test('sidebar muestra el logo INVENTA', async ({ page }) => {
    // Scoped to the brand <div> to avoid matching the "Inventario" group label
    await expect(page.locator('aside div').getByText('INVENTA', { exact: true })).toBeVisible()
  })

  test('sidebar muestra los grupos de menú del ADMIN', async ({ page }) => {
    const sidebar = page.locator('aside')
    // Target <p> group-label tags specifically to avoid substring / NavLink conflicts
    await expect(sidebar.locator('p').filter({ hasText: /^Inventario$/ })).toBeVisible()
    await expect(sidebar.locator('p').filter({ hasText: /^Pedidos$/ })).toBeVisible()
    await expect(sidebar.locator('p').filter({ hasText: /^Pagos$/ })).toBeVisible()
    await expect(sidebar.locator('p').filter({ hasText: /^Terceros$/ })).toBeVisible()
  })

  test('navegar a /referencia desde el sidebar funciona', async ({ page }) => {
    await page.click('aside a[href="/referencia"]')
    await expect(page).toHaveURL('/referencia')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// BLOQUE 3 — CONTROL DE ROLES (RBAC)
// ══════════════════════════════════════════════════════════════════════════════
test.describe('Control de roles (RBAC)', () => {
  test('ADMIN ve el grupo Catálogo en el sidebar', async ({ page }) => {
    await loginAs(page, ADMIN)
    await expect(
      page.locator('aside').locator('p').filter({ hasText: /^Catálogo$/ })
    ).toBeVisible()
  })

  test('BODEGUERO NO ve el grupo Catálogo', async ({ page }) => {
    await loginAs(page, BODEGA)
    await expect(
      page.locator('aside').locator('p').filter({ hasText: /^Catálogo$/ })
    ).not.toBeVisible()
  })

  test('VENDEDOR NO ve el grupo Inventario', async ({ page }) => {
    await loginAs(page, VENDEDOR)
    await expect(
      page.locator('aside').locator('p').filter({ hasText: /^Inventario$/ })
    ).not.toBeVisible()
  })

  test('BODEGUERO ve el grupo Inventario', async ({ page }) => {
    await loginAs(page, BODEGA)
    await expect(
      page.locator('aside').locator('p').filter({ hasText: /^Inventario$/ })
    ).toBeVisible()
  })

  test('/403 muestra mensaje de acceso denegado', async ({ page }) => {
    await loginAs(page, ADMIN)
    await page.goto('/403')
    await expect(page.getByText('403 - Acceso Denegado')).toBeVisible()
  })

  test('módulos en desarrollo muestran placeholder correcto', async ({ page }) => {
    await loginAs(page, ADMIN)
    await page.goto('/transacciones')
    await waitForNoSpinner(page)
    await expect(page.getByRole('heading', { name: 'Transacciones' })).toBeVisible()
    await expect(
      page.getByText('Esta sección se encuentra actualmente en desarrollo.')
    ).toBeVisible()
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// BLOQUE 4 — INVENTARIO / EXISTENCIAS
// ══════════════════════════════════════════════════════════════════════════════
test.describe('Inventario / Existencias', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN)
    await page.goto('/existencias')
  })

  test('la página carga sin error visible', async ({ page }) => {
    await waitForNoSpinner(page)
    await expect(page.getByText(/error al cargar|500|Network Error/i).first()).not.toBeVisible()
  })

  test('muestra tabla de inventario', async ({ page }) => {
    await waitForNoSpinner(page)
    const tabla = page.locator('table')
    expect(await tabla.count()).toBeGreaterThan(0)
  })

  test('campo de búsqueda acepta texto', async ({ page }) => {
    const searchInput = page.locator(
      'input[placeholder*="Buscar"], input[type="search"], input[placeholder*="buscar"], input[placeholder*="Filtrar"]'
    ).first()
    await expect(searchInput).toBeVisible()
    await searchInput.fill('camisa')
    await expect(searchInput).toHaveValue('camisa')
  })

  test('botón de refresco existe y es clickeable', async ({ page }) => {
    const refreshBtn = page.getByRole('button', { name: /refrescar|actualizar|refresh/i }).first()
    await expect(refreshBtn).toBeVisible()
    await refreshBtn.click()
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// BLOQUE 5 — TRASLADOS
// ══════════════════════════════════════════════════════════════════════════════
test.describe('Traslados', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN)
    await page.goto('/traslados')
  })

  test('muestra el título "Solicitudes y Gestión de Traslados"', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Solicitudes y Gestión de Traslados/i })
    ).toBeVisible()
  })

  test('la tabla o empty-state carga sin errores', async ({ page }) => {
    await waitForNoSpinner(page)
    const tabla = page.locator('table')
    const emptyMsg = page.getByText(/no hay traslados|sin traslados|no existen/i)
    const hayTabla = await tabla.count()
    const hayEmpty = await emptyMsg.count()
    expect(hayTabla + hayEmpty).toBeGreaterThan(0)
  })

  test('botón "Solicitar Traslado" abre el modal de creación', async ({ page }) => {
    await page.getByRole('button', { name: /Solicitar Traslado/i }).click()
    await expect(page.getByText('Crear Solicitud de Traslado')).toBeVisible()
  })

  test('modal de traslado se puede cerrar con el botón X', async ({ page }) => {
    await page.getByRole('button', { name: /Solicitar Traslado/i }).click()
    await expect(page.getByText('Crear Solicitud de Traslado')).toBeVisible()
    await page.locator('button[title="Cerrar"], button.text-muted-foreground').last().click()
    await expect(page.getByText('Crear Solicitud de Traslado')).not.toBeVisible({ timeout: 3_000 })
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// BLOQUE 6 — MERMAS
// ══════════════════════════════════════════════════════════════════════════════
test.describe('Mermas y Pérdidas', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN)
    await page.goto('/mermas')
  })

  test('muestra el título "Control y Clasificación de Mermas"', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Control y Clasificación de Mermas/i })
    ).toBeVisible()
  })

  test('tabs "Por Resolver" e "Historial" son visibles', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Por Resolver/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Historial de Mermas/i })).toBeVisible()
  })

  test('cambiar a pestaña Historial carga sin errores', async ({ page }) => {
    await page.getByRole('button', { name: /Historial de Mermas/i }).click()
    await waitForNoSpinner(page)
    await expect(page.getByText(/Error 500|Network Error/i)).not.toBeVisible()
  })

  test('botón "Registrar Merma Directa" abre el modal', async ({ page }) => {
    await page.getByRole('button', { name: /Registrar Merma Directa/i }).click()
    await expect(page.getByText('Registrar Merma Directa en Inventario')).toBeVisible()
  })

  test('modal de merma tiene campos requeridos', async ({ page }) => {
    await page.getByRole('button', { name: /Registrar Merma Directa/i }).click()
    await expect(page.locator('form select').first()).toBeVisible()
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// BLOQUE 7 — PEDIDOS INTERNOS
// ══════════════════════════════════════════════════════════════════════════════
test.describe('Módulo de Pedidos Internos', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN)
    await page.goto('/pedidos')
  })

  test('muestra el título "Módulo de Salidas y Despachos"', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Módulo de Salidas y Despachos/i })
    ).toBeVisible()
  })

  test('tab "Salida de Pedidos" está activa por defecto', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Salida de Pedidos/i })).toBeVisible()
    await waitForNoSpinner(page)
    await expect(page.getByText(/Error 500|Network Error/i)).not.toBeVisible()
  })

  test('tab "Despachos de Traslados" es clickeable y carga', async ({ page }) => {
    await page.getByRole('button', { name: /Despachos de Traslados/i }).click()
    await waitForNoSpinner(page)
    await expect(page.getByText(/Error 500|Network Error/i)).not.toBeVisible()
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// BLOQUE 8 — DESPACHOS Y RECEPCIONES
// ══════════════════════════════════════════════════════════════════════════════
test.describe('Despachos y Recepciones', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN)
  })

  test('/despachos carga la página sin error', async ({ page }) => {
    await page.goto('/despachos')
    await waitForNoSpinner(page)
    await expect(page.getByText(/Error 500|Network Error/i)).not.toBeVisible()
  })

  test('/recepciones carga la página sin error', async ({ page }) => {
    await page.goto('/recepciones')
    await waitForNoSpinner(page)
    await expect(page.getByText(/Error 500|Network Error/i)).not.toBeVisible()
  })

  test('select de sucursal en /despachos tiene opciones', async ({ page }) => {
    await page.goto('/despachos')
    await waitForNoSpinner(page)
    const sucursalSelect = page.locator('select').first()
    if (await sucursalSelect.count() > 0) {
      const options = await sucursalSelect.locator('option').count()
      expect(options).toBeGreaterThan(0)
    }
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// BLOQUE 9 — MÓDULOS EN DESARROLLO (placeholders reales)
// Solo /transacciones y /reportes usan ModuloEnDesarrollo en App.jsx.
// El resto (/productos, /proveedores, /comprobantes) son páginas implementadas.
// ══════════════════════════════════════════════════════════════════════════════
const PLACEHOLDERS = [
  ['/transacciones', 'Transacciones'],
  ['/reportes',      'Reportes'],
]

test.describe('Módulos en desarrollo', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN)
  })

  for (const [ruta, titulo] of PLACEHOLDERS) {
    test(`${ruta} muestra el placeholder correcto`, async ({ page }) => {
      await page.goto(ruta)
      await waitForNoSpinner(page)
      await expect(page.getByRole('heading', { name: titulo })).toBeVisible()
      await expect(
        page.getByText('Esta sección se encuentra actualmente en desarrollo.')
      ).toBeVisible()
    })
  }
})
