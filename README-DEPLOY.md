# Cómo publicar Campo de Girasoles

Esta es la checklist del día que subas la web a un hosting real. Todos los cambios de código ya están hechos; solo hay que configurar el entorno.

## 1. Hosting

**Requisitos mínimos:**
- Hosting estático que sirva `dist/` (Netlify, Cloudflare Pages, Vercel, GitHub Pages)
- PHP habilitado **solo si** quieres usar `enviar.php` para procesar el formulario
- HTTPS (Let's Encrypt gratuito en la mayoría de hostings)

**Si subes a Netlify, Cloudflare Pages o Vercel (estático puro):**
1. Ejecuta `node build.mjs` (genera `dist/`)
2. Sube la carpeta `dist/` completa
3. Crea registro DNS apuntando `campogirasoles.org` al hosting
4. Activa HTTPS forzado en el panel del hosting
5. El formulario NO funcionará con `enviar.php`. Ver punto 3.

## 2. Formulario de contacto

El formulario ya está configurado para **los dos escenarios** gracias a un fallback en `navegacion.js`:

### Opción A — Netlify Forms (recomendado, hosting estático) ✅ ya listo
El `<form>` de `src/contacto.html` ya tiene:
- `data-netlify="true"` para que Netlify detecte el form en build-time
- `netlify-honeypot="bot-field"` para anti-spam
- `<input type="hidden" name="form-name" value="contacto">` (obligatorio para Netlify)
- `action="/gracias.html"` para redirigir tras el envío

Cuando subas `dist/` a Netlify:
1. Entra en Site settings → Forms → Form notifications
2. Añade `campodegirasoles70@gmail.com` como destino de los mensajes
3. Prueba enviando un mensaje → debe llegar al correo

El JS carga `/csrf.php` por si acaso; si no responde (Netlify es estático, no hay PHP), el form se envía sin token y Netlify Forms gestionan el anti-spam con el honeypot. **No hace falta tocar nada.**

### Opción B — hosting con PHP (Hostinger, SiteGround, OVH)
Si migras a PHP y prefieres `enviar.php`:
1. Quita `data-netlify="true"`, `netlify-honeypot="bot-field"` y `<input type="hidden" name="form-name" value="contacto">` de `src/contacto.html`
2. Cambia `action="/gracias.html"` por `action="/enviar.php"`
3. Verifica que el hosting tenga `mail()` habilitado y sesiones PHP (para el CSRF)
4. Si no llega el correo, pide relay SMTP (AuthSMTP, SendGrid, Mailgun) y reescribe `enviar.php` con PHPMailer
5. Ejecuta `node build.mjs` y sube `dist/`

**En ambos casos:** el `<form>` ya tiene `novalidate` + validación JS accesible con `aria-invalid` y `role="alert"`. No hace falta tocar nada de eso.

## 3. Botón de donación PayPal

La card "Dona" de `src/contacto.html` ya tiene un placeholder visible (botón mailto + texto de "próximamente"). Cuando tengas la cuenta PayPal lista:

1. Entra en https://www.paypal.com/donate/buttons/
2. Crea un botón "Donar" con el email `campodegirasoles70@gmail.com`
3. Copia el código HTML que PayPal te da
4. Abre `src/contacto.html`, busca el `<div class="paypal-placeholder">` dentro de la card "Dona"

Sustituye el contenido de `paypal-placeholder` (el botón mailto + el `<small class="dona-pending">`) por el código de PayPal que te dio.

5. Ejecuta `node build.mjs` y sube el `dist/`

## 4. Analytics (cuando lo decidas)

El snippet está comentado en `_partials/header.html`. Tienes dos opciones ya preparadas:

**Plausible (recomendado, cookieless):**
1. Crea cuenta en https://plausible.io
2. Registra el dominio `campogirasoles.org`
3. Quita los `<!--` y `-->` alrededor del bloque Plausible en `_partials/header.html`
4. Verifica el ID que te dieron

**Google Analytics 4:**
1. Crea propiedad en https://analytics.google.com (GA4)
2. Toma el ID `G-XXXXXXXXXX`
3. Quita los comentarios alrededor del bloque GA4 en `_partials/header.html`
4. Reemplaza `G-XXXXXXX` por tu ID real
5. Añade banner de consentimiento de cookies (obligatorio en UE)

## 5. Fotos y logo

- Las fotos ya están optimizadas en WebP (carpeta `dist/assets/photos/*.webp`)
- El logo PNG original está en `assets/logo.png`
- Si creas un logo SVG, sustituye la línea `<img src="/assets/logo.png">` del partial `_partials/header.html` por `assets/logo.svg` con un `onerror` que caiga al PNG como respaldo

## 6. Verificación final

Antes de anunciar la web:

- [ ] Abre `https://campogirasoles.org` en modo incógnito
- [ ] Navega las 6 páginas (inicio, problema, proyecto, equipo, blog, contacto)
- [ ] Prueba el formulario con un email tuyo → confirma que llega a `campodegirasoles70@gmail.com`
- [ ] Abre en móvil (iPhone + Android) → hero no se solapa con texto
- [ ] Audita con Lighthouse: Performance > 90, Accessibility > 95, SEO > 95
- [ ] Google Search Console: añade la propiedad, envía el sitemap `https://campogirasoles.org/sitemap.xml`
- [ ] Comparte en redes: prueba el link → comprueba que el `og:image` se vea correctamente

## Comandos

| Acción | Comando |
|---|---|
| Build (genera `dist/`) | `node build.mjs` |
| Local preview | `node server.mjs` → http://localhost:4321 |
| Watch mode | `node build.mjs --watch` |

---

Hecho con cuidado para la infancia cubana. Jugar es crecer. Crear es florecer.
