# Guía de integración Stripe Elements — INVENTA (frontend)

Esta guía es para quien implemente el formulario de pago en el frontend.
La API usa **Stripe Payment Intents** con **Stripe Elements**: el número de
tarjeta NUNCA pasa por nuestros servidores. Stripe lo maneja directamente.

---

## 1. Llave pública

La llave pública (publishable key) identifica tu cuenta Stripe ante el navegador.
Es la única llave que puede estar en el código del frontend.

```
pk_test_...   ← para desarrollo (sandbox)
pk_live_...   ← para producción
```

La encontrarás en `STRIPE_PUBLISHABLE_KEY` del archivo `.env` del backend.
El backend no la expone por API: el frontend la recibe como variable de entorno
de su propio build (por ejemplo `VITE_STRIPE_KEY` o `NEXT_PUBLIC_STRIPE_KEY`).

> **NUNCA pongas la `STRIPE_SECRET_KEY` en el frontend.** Esa llave permite
> crear cargos reales y debe estar solo en el servidor.

---

## 2. Flujo general

```
Frontend                       Backend (nuestra API)          Stripe
   │                                   │                          │
   │── POST /api/pagos/intencion ──────►│                          │
   │   { pedido_id }                   │── create PaymentIntent ──►│
   │                                   │◄─ { id, client_secret } ──│
   │◄── { client_secret, monto } ──────│                          │
   │                                   │                          │
   │ (monta Stripe Elements con        │                          │
   │  client_secret)                   │                          │
   │                                   │                          │
   │── stripe.confirmPayment() ────────────────────────────────────►│
   │   (tarjeta viaja directo a Stripe,│                          │
   │   nunca pasa por nuestro backend) │                          │
   │                                   │                          │
   │                                   │◄── webhook: payment_intent│
   │                                   │    .succeeded ────────────│
   │                                   │ (aquí confirmamos pedido) │
   │                                   │                          │
   │── GET /api/pedidos/:id ───────────►│                          │
   │◄── pedido.estado = "PAGADO" ──────│                          │
```

---

## 3. Instalación de Stripe.js

```bash
npm install @stripe/stripe-js
```

O desde CDN (sin bundler):
```html
<script src="https://js.stripe.com/v3/"></script>
```

> Stripe recomienda cargar `stripe.js` desde su CDN oficial, nunca auto-hospedar.
> Esto permite que Stripe detecte comportamiento fraudulento.

---

## 4. Código de ejemplo

### 4.1 Inicializar Stripe

```js
import { loadStripe } from "@stripe/stripe-js";

// La llave pública viene de la variable de entorno del BUILD del frontend
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
```

### 4.2 Obtener el client_secret

Después de que el usuario elige pagar en línea, llama a tu API:

```js
const iniciarPago = async (pedidoId) => {
  const res = await fetch("/api/pagos/intencion", {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${token}`,   // token JWT del usuario
    },
    body: JSON.stringify({ pedido_id: pedidoId }),
  });

  if (!res.ok) throw new Error("Error al crear la intención de pago");
  const { data } = await res.json();
  return data; // { client_secret, monto }
};
```

### 4.3 Montar Stripe Elements

```jsx
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

// Componente raíz — recibe el client_secret
function PagoWrapper({ clientSecret }) {
  const stripe = await stripePromise;
  return (
    <Elements stripe={stripe} options={{ clientSecret }}>
      <FormularioPago />
    </Elements>
  );
}

// Formulario de pago
function FormularioPago() {
  const stripe   = useStripe();
  const elements = useElements();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // URL a la que Stripe redirige después del pago (para métodos con redirección)
        return_url: `${window.location.origin}/mis-pedidos`,
      },
    });

    if (error) {
      // Mostrar error al usuario (tarjeta rechazada, fondos insuficientes, etc.)
      console.error(error.message);
    }
    // Si no hay error, Stripe redirige automáticamente a return_url.
    // El estado real del pedido se actualiza por webhook, no por esta redirección.
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />   {/* ← Stripe monta aquí los campos de tarjeta */}
      <button type="submit" disabled={!stripe}>Pagar</button>
    </form>
  );
}
```

> `PaymentElement` es el componente recomendado: muestra los campos de tarjeta
> de forma segura (iframe de Stripe), adapta el formulario a la moneda y el
> país, y soporta múltiples métodos de pago sin código extra.

---

## 5. Confirmar el estado del pedido

**No confíes en la redirección de return_url para confirmar el pago.**
La redirección puede fallar si el usuario cierra el navegador o pierde conexión.

El estado real del pedido se actualiza únicamente cuando nuestro backend
recibe el webhook `payment_intent.succeeded` de Stripe. Después de la
redirección, consulta el estado del pedido:

```js
const verificarPedido = async (pedidoId) => {
  const res = await fetch(`/api/pedidos/${pedidoId}`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  const { data } = await res.json();
  return data.estado; // "PAGADO", "PENDIENTE_PAGO", etc.
};
```

Si el estado es `PENDIENTE_PAGO`, el webhook aún no llegó. Puedes hacer
polling cada 2–3 segundos durante unos 10 segundos antes de mostrar el
resultado definitivo.

---

## 6. Manejo de errores comunes

| Error de Stripe | Qué mostrarle al usuario |
|-----------------|--------------------------|
| `card_declined` | "Tu tarjeta fue rechazada. Intenta con otra." |
| `insufficient_funds` | "Fondos insuficientes. Verifica tu saldo." |
| `expired_card` | "Tu tarjeta está vencida." |
| `incorrect_cvc` | "El código de seguridad es incorrecto." |
| `processing_error` | "Error temporal. Intenta de nuevo en unos momentos." |

La descripción legible está en `error.message` devuelto por `stripe.confirmPayment()`.

---

## 7. Modo sandbox — tarjetas de prueba

Para probar sin fondos reales, usa estas tarjetas de Stripe:

| Tarjeta | Número | CVC | Fecha |
|---------|--------|-----|-------|
| Pago exitoso | `4242 4242 4242 4242` | Cualquiera | Fecha futura |
| Pago rechazado | `4000 0000 0000 0002` | Cualquiera | Fecha futura |
| Requiere autenticación (3D Secure) | `4000 0025 0000 3155` | Cualquiera | Fecha futura |

El CVV puede ser cualquier número de 3 dígitos y la fecha de expiración
cualquier mes/año en el futuro.

---

## 8. Referencia rápida de endpoints

| Método | Ruta | Qué hace |
|--------|------|----------|
| `GET` | `/api/pagos/formas-pago/:pedidoId` | Devuelve formas disponibles para el pedido |
| `POST` | `/api/pagos/intencion` | Crea PaymentIntent; devuelve `client_secret` |
| `GET` | `/api/pedidos/:id` | Consulta estado del pedido después del pago |

El frontend no llama al webhook — ese endpoint es para Stripe exclusivamente.
