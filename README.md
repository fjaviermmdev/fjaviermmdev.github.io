# Portfolio de Javi

Portfolio personal de Francisco Javier Martínez Martínez, desarrollado con Astro y publicado en `fjaviermmdev.github.io`.

HTML estático en español (`/`) e inglés (`/en/`). Sin framework cliente, cookies ni analítica. Las traducciones se generan durante la compilación; la lectura y los CV no dependen de JavaScript.

## Desarrollo

```sh
pnpm install
pnpm dev
```

Requiere Node.js 22.12+ y pnpm 10.13.1 (declarado en `package.json`).

## Comandos

| Comando | Acción |
| --- | --- |
| `pnpm dev` | Inicia el servidor de desarrollo. |
| `pnpm build` | Genera la web estática en `dist/`. |
| `pnpm preview` | Sirve localmente la última compilación. |
| `pnpm check` | Valida Astro y TypeScript. |
| `pnpm test` | Prueba la compilación en Chromium y WebKit. |

Antes de las primeras pruebas: `pnpm exec playwright install chromium webkit`.
Ejecuta `pnpm build` antes de `pnpm test`; el servidor de pruebas usa el puerto exclusivo 43210 y rechaza una instancia existente.

La vista previa de Astro 7 se ejecuta en segundo plano. Consulta `pnpm astro preview status` y detenla con `pnpm astro preview stop`.

## Contenido

- `src/components/Portfolio.astro`: orden de las secciones, compartido por ambos idiomas.
- `src/components/`: textos bilingües, secciones e interacciones.
- `src/lib/i18n.ts`: rutas de idiomas, CV y metadatos.
- `src/styles/`: sistema visual y estilos responsive.
- `src/assets/`: fotografía original. Astro genera tamaños AVIF/WebP y JPEG de respaldo.
- `src/pages/`: páginas, 404 y generación de robots/sitemap a partir de `Astro.site`.
- `public/`: currículums, copia pública de la carta de recomendación y favicon. Nunca guardar aquí originales con datos personales o firmas.
- `tests/`: navegación, responsive, accesibilidad automática y funcionamiento sin JavaScript.
- `design/`: directrices visuales locales, excluidas del repositorio.

## Publicación

GitHub Actions valida tipos, compila y ejecuta las pruebas antes de publicar en GitHub Pages. Las pull requests ejecutan las mismas comprobaciones sin desplegar. El dominio canónico se configura en `astro.config.mjs`; no hay dominio personalizado ni `CNAME`.

## Contenido verificable

No añadir métricas, responsabilidades, certificaciones ni herramientas sin confirmación. Las tecnologías generales no implican uso en cada empresa. El dato aproximado del 46 % procede del CV y no es un benchmark público reproducible. Los proyectos de Odin son profesionales; Android es open source independiente; DELFI es participación universitaria.

La experiencia en Lynx recoge las APIs y paquetes propietarios de Python, ECS, Lambda, S3 y OpenSearch confirmados por el propietario. La referencia de Odin enlaza una copia para publicación sin DNI ni bloque de firma digital. El texto de la carta se conserva; el original firmado permanece fuera del repositorio. El extracto inglés está identificado como traducción.

Las herramientas completas usan un desplegable nativo, accesible sin JavaScript. Al imprimir con JavaScript se abren los desplegables y se restaura su estado después; esta mejora cubre el comportamiento de WebKit al imprimir contenido cerrado.

Consulta `docs/audit-2026-09.md` para el alcance y las limitaciones de la revisión.
