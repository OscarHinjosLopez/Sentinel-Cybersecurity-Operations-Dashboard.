# Sentinel — Cybersecurity Operations Dashboard

Base frontend para una futura aplicación empresarial de operaciones de ciberseguridad (SOC). Incluye **Sprint 0 — Foundation** y **Sprint 1 — Design System + Application Shell**: arquitectura, tooling, componentes UI reutilizables, shell responsive y temas persistentes.

## Stack

- Angular 22 y TypeScript 6 con `strict` y `strictTemplates`.
- Componentes standalone y Angular zoneless, activado por defecto en Angular 22; sin Zone.js.
- Angular Signals para el tema y RxJS disponible para futuros flujos asíncronos.
- Angular Material 22, Angular CDK 22 y SCSS.
- Vitest 5 con el builder oficial de Angular y jsdom.
- ESLint con angular-eslint/typescript-eslint y Prettier. eslint-config-prettier evita conflictos de formato.

## Requisitos

- Node.js `^22.22.3 || ^24.15.0 || >=26.0.0` compatible con Angular 22.
- npm 11 (el proyecto se generó con npm 11.19.0).

Consulta la [compatibilidad oficial de Angular](https://angular.dev/reference/versions).

## Instalación

```bash
npm ci
```

En PowerShell con ejecución de scripts restringida, utiliza `npm.cmd` en lugar de `npm`, sin modificar la política del sistema.

## Desarrollo

```bash
npm start
```

Abre http://localhost:4200. La raíz redirige a `/dashboard`. El sidebar contiene enlaces a `/dashboard`, `/threats`, `/devices`, `/audit` y `/settings`. Cada página es un placeholder cargado mediante `loadComponent`; las rutas desconocidas muestran una página 404 dentro del shell. No hay control de acceso en este sprint.

## Build

```bash
npm run build
```

Genera la aplicación cliente en `dist/sentinel/browser`. SSR está desactivado. El servidor de un futuro despliegue debe devolver `index.html` para las rutas de la SPA.

## Tests

```bash
npm test
npm test -- --run
npm test -- --watch
```

`scripts/test.mjs` traduce `--run` a `--watch=false`, la opción admitida por Angular CLI. `npm test` utiliza el comportamiento estándar del CLI: watch en terminal interactiva y ejecución única en entornos no interactivos.

Las pruebas verifican las cinco rutas, la redirección de la raíz, el wildcard, la presencia del shell, navegación móvil, salto al contenido, persistencia y fallback de temas, severidades y composición de PageHeader.

## Lint y formato

```bash
npm run lint
npm run format
npm run format:check
```

ESLint revisa TypeScript y templates, incluidos los inline, con reglas de accesibilidad. Prettier se encarga del formato.

## Arquitectura

```text
src/
├── app/
│   ├── core/
│   │   ├── auth/
│   │   ├── config/
│   │   ├── guards/
│   │   ├── http/
│   │   ├── interceptors/
│   │   └── services/          # ThemeService
│   ├── layout/
│   │   ├── shell/             # Header, sidebar y router outlet
│   │   ├── header/
│   │   └── sidebar/
│   ├── shared/
│   │   ├── ui/
│   │   ├── directives/
│   │   ├── pipes/
│   │   └── utils/
│   ├── features/
│   │   ├── dashboard/
│   │   ├── threats/
│   │   ├── devices/
│   │   ├── audit/
│   │   └── settings/
│   ├── app.config.ts
│   ├── app.routes.ts
│   └── app.ts
├── styles/
│   ├── _theme.scss
│   └── _tokens.scss
└── styles.scss
```

La arquitectura es feature-first y orientada a dominios. Cada feature mantiene su página y, en futuros sprints, su lógica de dominio. `core` aloja infraestructura global; `layout` la estructura de la aplicación; `shared` se reserva para elementos reutilizables sin dependencias de features. Los directorios vacíos se conservan con `.gitkeep`; no contienen implementaciones anticipadas.

## Sistema de diseño y temas

Los tokens se centralizan en `src/styles/_tokens.scss`: superficies, bordes, niveles de texto, colores semánticos y severidades; spacing de 4 a 48; radius sm/md/lg/xl; shadows sm/md/lg; y niveles tipográficos display, h1, h2, h3, body, body-small, caption y label. `_typography.scss` proporciona mixins y `_placeholder.scss` comparte los estilos de las páginas de ejemplo.

`ThemeService` sigue siendo responsable del tema mediante Signals. Al iniciar usa `sentinel-theme` de localStorage si contiene light/dark y, en su ausencia, `prefers-color-scheme`. Solo las elecciones explícitas se persisten; no se guarda ningún otro dato. Si el almacenamiento falla, el cambio de tema sigue funcionando.

`public/theme-init.js` aplica la misma resolución antes de cargar estilos y Angular para evitar un destello del tema incorrecto. El pequeño script de arranque y ThemeService deben mantener sincronizados la clave y el orden de resolución. `_theme.scss` integra Material 3 mediante sus APIs Sass públicas; CSS `light-dark()` sigue el `color-scheme` raíz. No se descargan iconos ni fuentes externas.

## Application shell

- Desktop (desde 1200 px): sidebar fija, header y contenido con scroll independiente.
- Tablet (768–1199 px): sidebar compacta, con labels accesibles y tooltips.
- Mobile (menos de 768 px): Material Sidenav en modo overlay, hamburger, backdrop, captura de foco y cierre con Escape, al navegar o al seleccionar la ruta actual.
- Una sola instancia de sidebar consume `layout/sidebar/navigation.ts` para todas las resoluciones.
- Breadcrumbs derivados de `data.breadcrumb` en el árbol del Router; los ancestros son enlaces y el último elemento indica la página actual.
- Ayuda y perfil son previews visuales con opciones deshabilitadas; no hay cuenta ni acciones de autenticación.

## Componentes UI reutilizables

Los componentes standalone se encuentran en `src/app/shared/ui/` y se importan directamente por archivo.

| Componente        | API                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| `Icon`            | `name: IconName`; SVG local y decorativo. El control padre aporta el nombre accesible.          |
| `Breadcrumbs`     | Lee `data.breadcrumb` de las rutas y admite jerarquías futuras.                                 |
| `PageHeader`      | `title` requerido; `description` e `icon` opcionales; slot `[page-header-actions]`.             |
| `SeverityBadge`   | `severity: 'critical' \| 'high' \| 'medium' \| 'low'`; siempre incluye texto.                   |
| `StatusIndicator` | `status: 'online' \| 'offline' \| 'investigating' \| 'resolved' \| 'active' \| 'inactive'`.     |
| `EmptyState`      | `title`, `description`, `icon` opcional; slot `[empty-state-actions]`.                          |
| `Skeleton`        | `variant: 'line' \| 'card'`, `label` accesible; placeholder estático, sin peticiones simuladas. |
| `NotFound`        | Página lazy para la wildcard con enlace de vuelta al dashboard.                                 |

Las cinco páginas usan PageHeader y EmptyState. Los textos identifican explícitamente el contenido como preview; no representan datos operativos. SeverityBadge, StatusIndicator y Skeleton están disponibles para composición sin añadir ejemplos que parezcan funcionalidad real.

Referencias: [Angular zoneless](https://angular.dev/guide/zoneless), [testing oficial](https://angular.dev/guide/testing) y [theming de Angular Material](https://github.com/angular/components/blob/main/guides/theming.md).

## Comprobación manual

1. Abrir `/` y comprobar la redirección a `/dashboard`.
2. Navegar por los cinco enlaces y recargar una ruta directa.
3. Abrir `/una-ruta-inexistente`, comprobar la 404 y volver al dashboard.
4. Alternar el tema, recargar y comprobar persistencia; sin preferencia guardada, comprobar el tema del sistema.
5. Revisar 375, 768, 1024 y 1440 px, consola, Tab, foco visible y salto al contenido.
6. En móvil abrir el drawer, recorrerlo con Tab y cerrarlo mediante Escape, backdrop y navegación.

La base todavía no incluye autenticación, JWT, RBAC, backend, API, WebSockets ni funcionalidades SOC. El shell se reserva para las futuras páginas autenticadas; actualmente es público.
