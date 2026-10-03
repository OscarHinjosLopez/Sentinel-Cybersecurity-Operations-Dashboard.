# Sentinel — Cybersecurity Operations Dashboard

Frontend para una aplicación empresarial de operaciones de ciberseguridad (SOC). Incluye los Sprints **0 — Foundation**, **1 — Design System + Application Shell**, **2 — Authentication + RBAC**, **3 — SOC Dashboard**, **4 — Threat Management**, **5 — Device Inventory** y **6 — Real-time + WebSockets**. Dashboard, amenazas y dispositivos utilizan datos ficticios y un stream simulado; Audit y Settings siguen siendo placeholders.

## Stack

- Angular 22 y TypeScript 6 con `strict` y `strictTemplates`.
- Componentes standalone y Angular zoneless, activado por defecto en Angular 22; sin Zone.js.
- Angular Signals para tema, autenticación, dashboard, amenazas y dispositivos; RxJS para los contratos de acceso a datos mock.
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

| Componente        | API                                                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `Icon`            | `name: IconName`; SVG local y decorativo. El control padre aporta el nombre accesible.                                           |
| `Breadcrumbs`     | Lee `data.breadcrumb` de las rutas y admite jerarquías futuras.                                                                  |
| `PageHeader`      | `title` requerido; `description` e `icon` opcionales; slot `[page-header-actions]`.                                              |
| `SeverityBadge`   | `severity: 'critical' \| 'high' \| 'medium' \| 'low'`; siempre incluye texto.                                                    |
| `StatusIndicator` | Estados de dispositivos y amenazas: online, offline, isolated, inactive, open, investigating, resolved, false-positive y active. |
| `EmptyState`      | `title`, `description`, `icon` opcional; slot `[empty-state-actions]`.                                                           |
| `Skeleton`        | `variant: 'line' \| 'card'`, `label` accesible; placeholder estático, sin peticiones simuladas.                                  |
| `NotFound`        | Página lazy para la wildcard con enlace de vuelta al dashboard.                                                                  |

Las páginas usan PageHeader y reutilizan EmptyState, SeverityBadge, StatusIndicator y Skeleton cuando corresponde. Dashboard, Threats y Devices muestran datos mock identificados como demo; Audit y Settings mantienen su preview sin datos operativos.

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

Return URL acepta `/dashboard`, `/threats`, `/threats/THR-00001`, `/devices`, `/devices/DEV-00142` (IDs de cinco dígitos), `/audit` y `/settings`, con query/fragment opcionales. Rechaza hosts externos, esquemas, backslashes, outlets y destinos no admitidos. Tras el login, los guards vuelven a comprobar el permiso del destino.

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

La aplicación incluye autenticación y RBAC frontend mock, dashboard SOC, gestión de amenazas e inventario de demostración y realtime simulado. No incluye backend, JWT real, API real ni conexión WebSocket real.

## SOC Dashboard — Sprint 3

`features/dashboard` contiene los modelos estrictos, `data-access`, componentes `ui` y `dashboard.routes.ts`. La página permanece en la raíz de la feature para evitar una carpeta adicional con un solo componente.

`DashboardRepository` es un contrato Observable inyectado mediante `DASHBOARD_REPOSITORY`. El provider de la ruta utiliza `MockDashboardRepository`, con 650 ms de latencia y rangos `24h`, `7d` y `30d`. Las fixtures son deterministas para un rango y una fecha dados. Severidades, vectores y países suman el total de detecciones; las amenazas abiertas son un inventario distinto del volumen detectado durante el periodo. Los IPs de ejemplo usan bloques reservados para documentación.

`DashboardStore` usa Signals y computed para gestionar rango, datos, loading, error, última actualización y totales. Cambiar el rango cancela la solicitud anterior; una versión de solicitud evita sobrescrituras antiguas. Refresh conserva el contenido mientras carga. No hay polling ni actualizaciones en tiempo real.

Los cuatro KPIs comparten `KpiCard`. La semántica de tendencias depende de si conviene aumentar o reducir la métrica. Security Score muestra Excellent (90+), Good (75+), Needs attention (50+) o Critical. La protección de dispositivos se calcula a partir del numerador y denominador.

Las gráficas siguen los tokens del tema, observan el tamaño del contenedor con ResizeObserver y liberan instancias y observadores al destruirse. Respetan reduced motion. Activity y vectors ofrecen datos textuales desplegables; severity muestra counts y porcentajes. El mapa SVG es un esquema original local, sin datos geográficos de terceros ni servicios externos; sus siluetas son orientativas, no fronteras precisas. Los hotspots y sus conteos son ficticios y tienen una lista equivalente.

Para probar los estados sin controles de desarrollo visibles, los tests sustituyen `DASHBOARD_REPOSITORY` o configuran `DASHBOARD_MOCK_CONFIG` con `{ latency: 0, scenario: 'error' }` o `scenario: 'empty'`. El escenario por defecto es `success`. Loading usa Skeleton, vacío usa EmptyState y error ofrece Retry sin detalles internos.

Verificación del dashboard: cambiar los tres rangos, hacer refresh, abrir los datos textuales, navegar a View all threats y alternar light/dark a 375, 768, 1024 y 1440 px. Los tests cubren coherencia de datos, estados, retry, cancelación, destrucción y tendencias. ECharts utiliza licencia Apache-2.0; referencia de integración: [documentación oficial](https://echarts.apache.org/handbook/en/basics/import/).

## Threat Management — Sprint 4

`features/threats` contiene modelos, repository y stores en `data-access`, el detalle en `pages`, confirmación en `ui`, reglas y serialización en `utils` y rutas lazy en `threats.routes.ts`. El listado permanece en la raíz de la feature. No se añaden dependencias.

`ThreatRepository` ofrece `list(query)`, `getById(id)` y `updateStatus(id, status)` mediante Observable y el token `THREAT_REPOSITORY`. `MockThreatRepository` genera 200 amenazas ficticias, deterministas para una fecha dada, con 450 ms de latencia. Filtra y ordena todo el conjunto antes de paginar. Los cambios reemplazan objetos inmutables y actualizan su timeline. Las mutaciones son locales/mock: se conservan al navegar entre lista y detalle durante la ejecución, se reinician al recargar y no afectan sistemas de seguridad reales. El dashboard utiliza un conjunto de demostración independiente.

La búsqueda cubre ID, título, source y target, con debounce de 300 ms y limpieza explícita. Los selectores filtran severidad, estado y vector; chips muestran y permiten retirar filtros activos. Se ordena por detección, prioridad de severidad, estado o confianza. Severity descendente coloca Critical primero. Status ascendente sigue Open → Investigating → Resolved → False positive. Paginación de 10, 25 (default) o 50 filas, con conteo y controles accesibles; filtros, búsqueda, orden y page size vuelven a página 1. Refresh conserva la consulta y muestra feedback.

Query params soportados: `search`, `severity`, `status`, `vector`, `page`, `pageSize`, `sort`, `direction`; también fechas ISO opcionales `from` y `to`. Severity/status/vector aceptan valores separados por comas desde la URL, representados como múltiples filtros y chips; los selectores de la interfaz eligen un valor cada vez. Valores desconocidos, páginas negativas/fraccionarias/excesivas, tamaños no admitidos y fechas inválidas se normalizan con reemplazo de URL. Los defaults válidos explícitos se conservan al cargar una URL. La recarga, enlaces copiados y Back/Forward restauran el estado visual. Una página positiva sin registros conserva su URL y ofrece First page.

```text
/threats?severity=critical&status=investigating&page=2
/threats?search=Identity&pageSize=10&sort=confidence&direction=desc
/threats/THR-00001
```

`ThreatListStore` usa Signals/computed para consulta, datos, total, loading, refreshing y error; cancela solicitudes antiguas y temporizadores pendientes cuando cambia el estado o se destruye. `ThreatDetailStore` carga directamente por ID, cancela cargas/mutaciones al cambiar de amenaza y bloquea doble envío. La tabla HTML semántica incluye `aria-sort` y enlaces de detalle; tablet reduce columnas secundarias y móvil presenta tarjetas con la misma fuente de datos. Back to threats conserva los filtros que acompañaban al enlace.

El detalle muestra contexto, descripción, indicadores técnicos sin enlaces externos y timeline local. Admin y Analyst pueden iniciar investigación; desde Investigating pueden resolver o marcar false positive. Open también permite false positive. Resolved y False positive son terminales en esta demo. Las reglas están centralizadas en `threat-rules.ts`; Resolve y False positive requieren Material Dialog, con foco inicial en Cancel y restauración al cerrar. Las acciones muestran loading, error local y Snackbar de éxito. Viewer tiene acceso de lectura y no puede mutar: tanto el store como el repository comprueban `threats:investigate`, incluso al completar una solicitud pendiente.

Loading utiliza Skeleton; errores de lista/detalle ofrecen Retry sin detalles internos; vacío general y sin coincidencias tienen mensajes distintos. Un ID desconocido muestra Threat not found con retorno al listado. Para tests internos, `THREAT_MOCK_CONFIG` permite `{ latency: 0, scenario: 'error' }` o `scenario: 'empty'`, sin botones de desarrollo visibles.

Verificación: probar búsqueda, cada filtro, chips, sort, tamaños de página y Next/Previous; recargar la primera URL del ejemplo y recorrer Back/Forward. Abrir un detalle directamente y un ID inexistente. Con Admin/Analyst iniciar investigación y confirmar/cancelar cierre; con Viewer comprobar solo lectura. Revisar listado, detalle y dialog a 375, 768, 1024 y 1440 px en light/dark. Los tests cubren repository, debounce, cancelación, stores, estados, query params, reglas, autorización y regresión de selects restaurados.

No hay acciones masivas, exportaciones, comentarios, asignaciones ni auditoría global. Sprint 6 añade actualizaciones automáticas mediante un transport mock; no existe servidor WebSocket.

## Device Inventory — Sprint 5

`features/devices` contiene modelos, repository, stores de lista y detalle, componentes de score/confirmación, reglas de postura y acciones, serialización de consulta y rutas lazy. Reutiliza SeverityBadge para la escala semántica de riesgo y StatusIndicator, ampliado con Isolated. Threats y Devices comparten estilos de listado acotados a `.record-list`; la clasificación del security score es una utilidad pura compartida con el dashboard.

`DeviceRepository` ofrece `list(query)`, `getById(id)`, `updateProtectionStatus(id, status)` y `runMockScan(id)` mediante el token `DEVICE_REPOSITORY`. `MockDeviceRepository` genera **463 endpoints deterministas**, con 500 ms de latencia. Incluye laptops, workstations, servers, mobile y virtual machines, cinco familias de OS, departamentos, propietarios, estados, riesgo y cobertura de protección. Las versiones de OS y software son fixtures ficticios, no datos actuales del equipo del usuario. IPs y dominios de ejemplo pertenecen a rangos de documentación.

La búsqueda cubre hostname, display name, owner, department e IP, con debounce de 300 ms. Los filtros de Status, Risk, Protection y OS family tienen chips eliminables y Clear all. El repository aplica filtros y sort antes de paginar; soporta hostname, risk, status, securityScore, lastSeenAt y lastScanAt. Risk descendente muestra Critical primero. Page sizes: 10, 25 por defecto y 50. Los cambios de búsqueda, filtros, ordenación o tamaño vuelven a página 1. El resumen representa **todo el conjunto que coincide con la consulta**, no solo la página visible: total, protected, at risk/unprotected, offline y critical risk.

Query params: `search`, `status`, `risk`, `protection`, `os`, `page`, `pageSize`, `sort`, `direction`. Se restauran al recargar, copiar URL y navegar con Back/Forward. Valores inválidos se normalizan con reemplazo de URL; defaults válidos explícitos se conservan. Una página positiva sin registros ofrece First page. Los enlaces de detalle y Back to devices conservan los filtros.

```text
/devices?risk=high&status=online&os=windows&page=2
/devices/DEV-00142
```

Stores con Signals/computed gestionan consulta, datos, summary, loading, error, postura y acciones. Cancelan solicitudes/temporizadores pendientes y descartan respuestas antiguas. Refresh conserva consulta y contenido mientras actualiza. El detalle carga por ID independientemente de la tabla y muestra información técnica, postura, hallazgos derivados, vulnerabilidades, software y actividad local. Desktop utiliza tabla semántica; tablet reduce columnas secundarias y móvil presenta tarjetas con la misma fuente de datos.

La clasificación del score es Excellent (90–100), Good (75–89), Needs attention (50–74) y Critical (0–49), siempre con texto. Findings derivan de vulnerabilidades abiertas críticas, antigüedad del scan, versión del agente y cobertura de protección. Counts de vulnerabilidades/software se derivan de sus colecciones. Hay 0–8 vulnerabilidades y 8–12 aplicaciones por endpoint; la lista de software permite búsqueda local. Los identificadores `DEMO-CVE-*` son explícitamente ficticios y no representan CVEs reales. Las vulnerabilidades se ordenan por CVSS descendente; scan no simula remediación.

Solo **Admin**, con `devices:manage`, puede ejecutar Run security scan, Isolate device y Restore device. Analyst y Viewer tienen acceso de lectura. UI, store y repository comprueban permiso; el repository lo vuelve a comprobar al completar la operación. Scan está disponible para Online/Isolated, actualiza lastScanAt y registra actividad mock. Isolate está disponible para estados distintos de Isolated; Restore solo para Isolated y lo devuelve a Online. Las reglas están centralizadas. `updateProtectionStatus` representa el cambio de contención (status), conservando la cobertura del agente (`protectionStatus`): aislar no implica desinstalar protección.

Isolate y Restore requieren Material Dialog, foco inicial en Cancel y restauración al cancelar. Las acciones bloquean doble envío y muestran loading, error local o Snackbar de éxito; después de mutar, el foco va a la región de acciones. Los cambios son **locales/mock**, persisten al navegar durante la misma ejecución y se reinician al recargar. No hay integración EDR/backend, scan real, aislamiento real, remote shell ni remediación.

Loading utiliza Skeleton. Lista y detalle ofrecen mensajes de error con Retry; EmptyState distingue No devices enrolled de No devices match your filters. Un ID desconocido muestra Device not found, sin redirección silenciosa. Para tests internos se puede sustituir `DEVICE_REPOSITORY` o configurar `DEVICE_MOCK_CONFIG` con `{ latency: 0, scenario: 'error' }` / `scenario: 'empty'`, sin controles de desarrollo visibles.

Verificación: buscar, combinar filtros, ordenar, cambiar página/tamaño; recargar el ejemplo de URL y recorrer Back/Forward. Abrir `/devices/DEV-00142` directamente y `/devices/DEV-99999` para not found. Con Admin ejecutar scan y confirmar/cancelar Isolate/Restore; con Analyst/Viewer comprobar solo lectura. Revisar inventario, postura, vulnerabilidades, software y dialogs a 375, 768, 1024 y 1440 px en light/dark. Los tests cubren repository, stores, debounce, concurrencia, URL, detalle, clasificación, findings y permisos.

## Real-time + WebSockets — Sprint 6

**El stream es simulado. No hay backend ni socket real.** No se añaden dependencias. `core/realtime` define el dominio, parser de `unknown`, token `REALTIME_TRANSPORT`, interfaz `RealtimeTransport`, `MockRealtimeTransport` y `RealtimeService`. Los componentes consumen Signals o eventos aceptados por el servicio; nunca manejan sockets directamente.

```text
MockRealtimeTransport → validación / deduplicación / orden → RealtimeService
                                                           ↓
                                   repositories → stores → Dashboard / Threats
                                                           ↓
                                               Header RealtimeStatus
```

La unión discriminada tiene cinco tipos, todos con `id`, `type`, `timestamp` ISO y `payload`:

| Tipo                     | Payload                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `threat.created`         | `threat` completo compatible con el modelo existente                                                                                  |
| `threat.updated`         | `threatId`, `changes` limitado a título, descripción, severidad, estado, confianza, origen y destino; `previous` con estado/severidad |
| `threat.resolved`        | `threatId`, `previous` con estado/severidad                                                                                           |
| `device.status.changed`  | `deviceId`, `previousStatus`, `status`                                                                                                |
| `security.score.changed` | `score` finito entre 0 y 100                                                                                                          |

`previous` permite calcular deltas de KPI para amenazas fuera del feed visible. Cuando el servicio conoce el estado más reciente, utiliza ese estado en lugar de metadatos anteriores del evento. El parser comprueba envelope, enums, IDs, patch keys, fechas, rangos numéricos y colecciones anidadas. Un evento inválido se descarta sin romper el stream.

El mock centraliza una secuencia determinista: tres altas, dos updates, una resolución, un cambio de dispositivo y un score por ciclo de ocho eventos. Emite **cada 8 segundos**, tras un handshake simulado de 150 ms. `MOCK_REALTIME_CONFIG` permite controlar tiempos en tests. Controles internos: `connect`, `disconnect`, `pause`, `resume`, `simulateDrop` y `emitForTesting`; no hay panel de desarrollo visible. IDs y secuencia continúan tras reconectar; timers/streams se limpian al destruir el transport.

`RealtimeService` es una única instancia de aplicación: Signals `connectionState`, `lastEventAt`, `reconnectAttempt`, `events`; Observable `events$`. La sesión de `AuthService` abre la conexión tras login/restauración. Navegar no crea conexiones. Logout desconecta, cancela retries y borra caches/feed/journal. Un disconnect explícito del servicio también evita retries. Una caída del transport inicia backoff **1, 2, 4, 8, 15, 15… segundos**, con un único timer y máximo estable de 15 s mientras la sesión siga activa. Recuperar conexión reinicia el contador. Se distinguen `disconnected`, `connecting`, `connected`, `reconnecting`, `error`; durante retries la UI muestra Reconnecting, y tras desconexión intencionada Offline. La caída conserva el contenido y permite navegar.

Se retienen **1000 IDs de eventos**, 1000 versiones/estados de entidades y 1000 IDs de altas; feed central de 20 y journal de replay de 500. Timestamps anteriores o iguales para la misma entidad se descartan. Las mutaciones locales registran su versión para evitar que un evento antiguo las revierta. La deduplicación es acotada, no garantiza detectar IDs arbitrariamente antiguos después de expulsarlos. El journal permite sincronizar respuestas pendientes; revisiones de snapshots evitan aplicar dos veces los deltas.

Los repositories mock se inicializan al arrancar, antes del primer evento, y reciben eventos antes que los stores. Conservan sus proyecciones mientras la aplicación se ejecuta. Dashboard mantiene agregados para los tres rangos, incluso al expulsar eventos del journal. Sus series parten de fixtures y las altas incrementan el último bucket, la distribución por severidad y el vector; no se inventa una geolocalización a partir de una IP. El mapa conserva sus datos ficticios. Las altas ajustan Active/Critical, updates/resoluciones ajustan deltas, y score modifica el KPI. Recent Threat Activity muestra **Live** en registros recibidos y retiene 15 entradas. Refresh y cambios de rango conservan los deltas. La proyección del dashboard se reinicia al desconectar intencionadamente.

Threats aplica eventos al repository y vuelve a consultar la consulta actual con `auditTime(100)` para agrupar bursts. Filtra y ordena el conjunto completo antes de paginar; preserva filtros/orden/query y total, y corrige una última página que queda vacía tras un evento. No inserta amenazas que incumplan filtros. El refresh live conserva las filas y no activa Skeleton. El detalle aplica patches directamente, sin nueva carga, ignora IDs ajenos y protege respuestas de carga/mutación anteriores. El repository conserva hasta 1000 amenazas y cada timeline live hasta 100 entradas. Device Inventory recibe cambios de estado en su repository para mantener coherencia en posteriores consultas; no añade auto refresh visual ni telemetría real.

`RealtimeStatus` aparece en header y dashboard: Live, Connecting, Reconnecting u Offline, con tooltip de última recepción y contador. El header móvil usa un indicador compacto con el mismo texto accesible y tooltip al enfocar. Se distingue conexión activa/reconexión por relleno/contorno además del color. No hay animación nueva. Connection status y snackbar crítico usan `polite`; el feed no anuncia cada evento. Solo altas Critical generan snackbar, como máximo uno cada 10 s. ECharts conserva sus instancias y solo actualiza datasets afectados o cambios de rango/tema; un score no redibuja las gráficas. Listeners y subscriptions de feature se destruyen al salir.

Para sustituir el mock, implementar `WebSocketRealtimeTransport` con la misma interfaz y cambiar el provider `REALTIME_TRANSPORT`. Los Observables deben sobrevivir a disconnect/reconnect y comunicar fallos por `connectionState$`. El adaptador futuro gestionará decodificación, socket y autenticación acordada con el backend. Este sprint no define un protocolo de autenticación, envía tokens ni incorpora secretos; la autorización real y la resincronización tras pérdidas de eventos corresponden al backend futuro. El mock reanuda la secuencia tras una caída; no simula entrega duradera de eventos perdidos ni persistencia entre recargas.

Tests: se mantienen los 240 anteriores y se añaden 57 (297 total). Cubren transporte y destrucción, los cinco eventos/invalid payloads, backoff y máximo, logout/relogin/restauración reales, deduplicación/orden/memoria, proyecciones KPI/feed, refresh concurrente, filtros/sort/paginación, detalle/mutaciones anteriores, coherencia de dispositivos y avisos críticos accesibles.

Verificación manual: arrancar con `npm start`, iniciar sesión y observar Live en `/dashboard`; esperar detecciones y snackbar Critical. En `/threats?severity=critical` solo entran altas compatibles. Abrir un detalle y emitir internamente un update del mismo ID; debe cambiar sin reload. `simulateDrop` muestra Reconnecting y mantiene datos hasta recuperar conexión. Repetir un `emitForTesting` con el mismo ID solo aplica una vez. Logout durante retry cancela la reconexión; login y recarga con sesión restaurada conectan una vez. Revisar las tres rutas y header a 375, 768, 1024 y 1440 px, light/dark, foco/tooltip, reduced motion y consola. **Sprint 7 no está implementado.**
