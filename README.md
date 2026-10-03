# Sentinel — Cybersecurity Operations Dashboard

Frontend para una aplicación empresarial de operaciones de ciberseguridad (SOC). Incluye **Sprint 0 — Foundation**, **Sprint 1 — Design System + Application Shell**, **Sprint 2 — Authentication + RBAC** y **Sprint 3 — SOC Dashboard**. El dashboard utiliza datos ficticios; las demás páginas del dominio siguen siendo placeholders.

## Stack

- Angular 22 y TypeScript 6 con `strict` y `strictTemplates`.
- Componentes standalone y Angular zoneless, activado por defecto en Angular 22; sin Zone.js.
- Angular Signals para tema, autenticación y dashboard; RxJS para los contratos de acceso a datos mock.
- Apache ECharts integrado directamente con renderer SVG y módulos específicos, cargado con el dashboard.
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

Abre http://localhost:4200. La raíz redirige a `/dashboard`. El sidebar filtra por permisos los enlaces a `/dashboard`, `/threats`, `/devices`, `/audit` y `/settings`. El dashboard y las demás páginas se cargan de forma lazy; las rutas desconocidas muestran una página 404 dentro del shell. El shell requiere una sesión demo. Sin sesión, las rutas protegidas redirigen a `/login` conservando un `returnUrl`.

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

Las pruebas incluyen login, restauración, logout, matriz RBAC, guards, returnUrl, frontera del interceptor y validaciones del formulario. También verifican las cinco rutas, la redirección de la raíz, el wildcard, la presencia del shell, navegación móvil, salto al contenido, persistencia y fallback de temas, severidades y composición de PageHeader.

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
│   │   ├── auth/              # Modelos, AuthService, storage y data-access
│   │   ├── config/
│   │   ├── guards/            # Auth, guest y permission guards
│   │   ├── http/
│   │   ├── interceptors/      # Bearer limitado a API interna
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
│   │   ├── auth/login/
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
│   ├── _tokens.scss
│   ├── _typography.scss
│   ├── _forms.scss
│   ├── _error-page.scss
│   └── _placeholder.scss
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
- Ayuda y Profile permanecen como previews deshabilitados. El menú de usuario muestra nombre, rol e iniciales de la sesión mock y permite Sign out.

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

## Autenticación y RBAC

**Authentication is mocked for portfolio/demo purposes.**

El login usa Reactive Forms con email required/formato y password required. Los inputs nativos tienen labels, `aria-invalid` y errores asociados mediante `aria-describedby`; los botones y tooltips usan Material. Permite mostrar contraseña, rellenar cuentas demo, ver loading y recibir un error genérico de credenciales. No hay register, recuperación de contraseña ni MFA.

### Cuentas demo

| Rol     | Nombre      | Email                  |
| ------- | ----------- | ---------------------- |
| Admin   | Alex Morgan | `admin@sentinel.dev`   |
| Analyst | Jordan Lee  | `analyst@sentinel.dev` |
| Viewer  | Taylor Reed | `viewer@sentinel.dev`  |

Contraseña de las tres cuentas: `Sentinel123!`. Son fixtures públicos y exclusivamente demo, nunca credenciales personales. El mock aplica una latencia de 350 ms. Los botones Demo accounts rellenan el formulario; no omiten el envío ni las validaciones.

### Contrato y estado

`core/auth/auth.models.ts` define User, UserRole, Permission, AuthSession, LoginCredentials y AuthResult. `AuthService` expone session, currentUser, isAuthenticated, isLoading e initialized mediante Signals/computed, y operaciones login, logout, restoreSession, hasRole y hasPermission.

`AUTH_API` es el contrato injectable de acceso a datos, con login y restoreSession. `app.config.ts` lo enlaza a MockAuthApi. Sustituir este provider por un adaptador REST permitirá conservar el store, guards y UI. No hay llamadas REST en la aplicación actual.

`SessionStorage` centraliza el almacenamiento bajo `sentinel-session`. Solo persiste el accessToken demo opaco, sin contraseña, perfil ni permisos. Durante la restauración el mock reconstruye el usuario a partir de sus fixtures; un token desconocido se descarta. `provideAppInitializer` espera a restoreSession antes de renderizar Angular y los guards esperan la misma inicialización. Si sessionStorage falla, la sesión funciona en memoria y se perderá al recargar. Logout borra estado/token y redirige a login; las respuestas pendientes no pueden recuperar una sesión cerrada.

### Permisos

La fuente de verdad es `core/auth/permissions.ts`. Usar hasPermission para decisiones de autorización; hasRole se reserva para necesidades explícitas de identidad.

| Permiso               | Admin | Analyst | Viewer |
| --------------------- | ----- | ------- | ------ |
| `dashboard:view`      | Sí    | Sí      | Sí     |
| `threats:view`        | Sí    | Sí      | Sí     |
| `threats:investigate` | Sí    | Sí      | No     |
| `devices:view`        | Sí    | Sí      | Sí     |
| `devices:manage`      | Sí    | No      | No     |
| `audit:view`          | Sí    | Sí      | No     |
| `settings:view`       | Sí    | No      | No     |

Las cinco rutas declaran `data.permission`. AuthGuard protege el shell y cada navegación hija; GuestGuard evita que una sesión autenticada vuelva a login; PermissionGuard redirige a `/forbidden` cuando falta el permiso. La sidebar filtra su fuente existente usando esos mismos permisos. Los permisos de investigate/manage quedan definidos sin implementar acciones del dominio.

Return URL acepta únicamente `/dashboard`, `/threats`, `/devices`, `/audit` y `/settings`, con query/fragment opcionales. Rechaza hosts externos, esquemas, backslashes, outlets y destinos no admitidos. Tras el login, los guards vuelven a comprobar el permiso del destino.

### Interceptor preparado para REST

El interceptor funcional se registra mediante `provideHttpClient(withInterceptors(...))`. Solo añade Authorization Bearer si hay sesión y la URL es del mismo origen y pertenece a `/api` o a sus subrutas. `API_BASE_PATH` centraliza esa frontera. No modifica recursos estáticos, prefijos similares ni URLs externas; tampoco introduce peticiones artificiales.

### Límites de seguridad del demo

Los tokens son identificadores ficticios, no JWT firmados; no hay criptografía ni secretos. El mock y sus fixtures son manipulables desde el navegador. Guards, permisos y navegación frontend no sustituyen autorización del servidor.

sessionStorage es una decisión temporal para este portfolio, accesible a JavaScript y vulnerable ante XSS; no se presenta como una estrategia universalmente segura de producción. El futuro backend deberá autenticar, autorizar y validar sesiones/tokens. La estrategia de credenciales dependerá de su diseño; cookies HttpOnly/Secure son un mecanismo habitual para limitar la exposición de credenciales sensibles. No están implementadas aquí. Referencia: [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

### Verificación de autenticación

1. Anonymous: abrir dashboard/threats y comprobar login, sin shell visible.
2. Admin: acceder a las cinco rutas y comprobar identidad del menú.
3. Analyst: Settings oculto; acceso directo a settings devuelve 403.
4. Viewer: Audit/Settings ocultos; ambos accesos directos devuelven 403.
5. Return URL: abrir devices sin sesión, iniciar sesión y volver a devices.
6. Logout: comprobar borrado de sesión y que Back sigue protegido.
7. Recargar una ruta autenticada y comprobar restauración; probar también token inválido o storage bloqueado.
8. Login: revisar 375, 768 y 1440 px, ambos temas, Tab, labels, validaciones, foco del error y mostrar contraseña.

## Comprobación manual

1. Sin sesión, abrir `/dashboard` o `/threats` y comprobar `/login` sin contenido del shell. Iniciar sesión con una cuenta demo.
2. Navegar por los cinco enlaces y recargar una ruta directa.
3. Abrir `/una-ruta-inexistente`, comprobar la 404 y volver al dashboard.
4. Alternar el tema, recargar y comprobar persistencia; sin preferencia guardada, comprobar el tema del sistema.
5. Revisar 375, 768, 1024 y 1440 px, consola, Tab, foco visible y salto al contenido.
6. En móvil abrir el drawer, recorrerlo con Tab y cerrarlo mediante Escape, backdrop y navegación.

La aplicación incluye autenticación y RBAC frontend mock y un dashboard SOC de demostración. No incluye backend, JWT real, API real ni WebSockets.

## SOC Dashboard — Sprint 3

`features/dashboard` contiene los modelos estrictos, `data-access`, componentes `ui` y `dashboard.routes.ts`. La página permanece en la raíz de la feature para evitar una carpeta adicional con un solo componente.

`DashboardRepository` es un contrato Observable inyectado mediante `DASHBOARD_REPOSITORY`. El provider de la ruta utiliza `MockDashboardRepository`, con 650 ms de latencia y rangos `24h`, `7d` y `30d`. Las fixtures son deterministas para un rango y una fecha dados. Severidades, vectores y países suman el total de detecciones; las amenazas abiertas son un inventario distinto del volumen detectado durante el periodo. Los IPs de ejemplo usan bloques reservados para documentación.

`DashboardStore` usa Signals y computed para gestionar rango, datos, loading, error, última actualización y totales. Cambiar el rango cancela la solicitud anterior; una versión de solicitud evita sobrescrituras antiguas. Refresh conserva el contenido mientras carga. No hay polling ni actualizaciones en tiempo real.

Los cuatro KPIs comparten `KpiCard`. La semántica de tendencias depende de si conviene aumentar o reducir la métrica. Security Score muestra Excellent (90+), Good (75+), Needs attention (50+) o Critical. La protección de dispositivos se calcula a partir del numerador y denominador.

Las gráficas siguen los tokens del tema, observan el tamaño del contenedor con ResizeObserver y liberan instancias y observadores al destruirse. Respetan reduced motion. Activity y vectors ofrecen datos textuales desplegables; severity muestra counts y porcentajes. El mapa SVG es un esquema original local, sin datos geográficos de terceros ni servicios externos; sus siluetas son orientativas, no fronteras precisas. Los hotspots y sus conteos son ficticios y tienen una lista equivalente.

Para probar los estados sin controles de desarrollo visibles, los tests sustituyen `DASHBOARD_REPOSITORY` o configuran `DASHBOARD_MOCK_CONFIG` con `{ latency: 0, scenario: 'error' }` o `scenario: 'empty'`. El escenario por defecto es `success`. Loading usa Skeleton, vacío usa EmptyState y error ofrece Retry sin detalles internos.

Verificación del dashboard: cambiar los tres rangos, hacer refresh, abrir los datos textuales, navegar a View all threats y alternar light/dark a 375, 768, 1024 y 1440 px. Los tests cubren coherencia de datos, estados, retry, cancelación, destrucción y tendencias. ECharts utiliza licencia Apache-2.0; referencia de integración: [documentación oficial](https://echarts.apache.org/handbook/en/basics/import/).
