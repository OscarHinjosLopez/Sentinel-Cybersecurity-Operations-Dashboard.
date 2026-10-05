# Sprint 9 — medición y revisión

## Protocolo reproducible

Medición local del 3 de octubre de 2026, Windows, Node 24.21.0, Angular 22.2.1, producción optimizada. Lighthouse 13.5.0 y Chromium 153.0.8010.12; tres procesos independientes por versión, con Login seguido de Dashboard mediante navegación completa autenticada. Se usan medianas por métrica, sin redondear los datos originales del [registro JSON](performance-results.json).

Mismo servidor `http://127.0.0.1:4400`, gzip, cache HTTP `no-store`, viewport 1440 × 900, DPR 1, perfil Lighthouse desktop Dense 4G simulado: RTT 40 ms, throughput 10 240 Kbps, CPU ×1. El user agent emulado es el template desktop de Lighthouse (Chrome 136/macOS); el motor realmente ejecutado es Chromium 153. No se confunde ese template con la versión instalada. `disableStorageReset: true` conserva el token de sesión de la autenticación real; cada repetición arranca un navegador nuevo. La medición de Dashboard verifica una página autenticada, no una redirección a Login.

Lighthouse queda como auditoría local; no es un gate CI sujeto a ruido de CPU/red. Para repetir:

```bash
npm run build
npm run preview:production
# En otra terminal; instalación del navegador solo la primera vez:
npx playwright install chromium
npm exec --yes --package=lighthouse@13.5.0 -- node scripts/lighthouse-audit.mjs after
```

El auditor genera JSON/HTML por repetición y un resumen en `performance-reports/` (ignorado por Git). Lighthouse se obtiene del cache temporal de npm, sin añadirlo a las dependencias del producto. Detener el preview con Ctrl+C.

## BEFORE / AFTER

Tamaños decimales kB; transferencias **estimadas por Angular**, distintas del gzip real del preview/report.

| Bundle                        | Antes raw / transfer  | Después raw / transfer |
| ----------------------------- | --------------------- | ---------------------- |
| Inicial                       | 497,63 / 128,81 kB    | 355,71 / 99,71 kB      |
| Dashboard, componente de ruta | 593,31 / 172,11 kB    | 21,13 / 6,00 kB        |
| Motor de gráficos, diferido   | incluido en Dashboard | 573,38 / 166,83 kB     |
| Threats                       | 20,23 / 5,64 kB       | 20,27 / 5,63 kB        |
| Devices                       | 22,04 / 5,98 kB       | 22,08 / 5,98 kB        |
| Shell                         | 84,72 / 17,48 kB      | 85,59 / 17,70 kB       |

Inicial: −28,5 % raw. Dashboard + motor suman 594,51 kB después: la mejora consiste en sacar el motor de la ruta crítica y evitar instanciar gráficos fuera del viewport, **no** en eliminar su coste. El crecimiento de Shell corresponde al foco de navegación y la dimensión mínima del indicador; las variaciones mínimas de los chunks de listas reflejan redistribución de código compartido.

| Página / métrica                                       | Antes (mediana) | Después (mediana) |
| ------------------------------------------------------ | --------------- | ----------------- |
| Login Performance / Accessibility / Best Practices     | 100 / 100 / 100 | 100 / 100 / 100   |
| Login FCP                                              | 524 ms          | 524 ms            |
| Login LCP                                              | 686 ms          | 640 ms            |
| Login CLS / TBT                                        | 0 / 0 ms        | 0 / 0 ms          |
| Dashboard Performance / Accessibility / Best Practices | 99 / 100 / 100  | 100 / 100 / 100   |
| Dashboard FCP                                          | 647 ms          | 542 ms            |
| Dashboard LCP                                          | 889 ms          | 681 ms            |
| Dashboard CLS                                          | 0,001259        | 0,001259          |
| Dashboard TBT                                          | 4 ms            | 0 ms              |

Dashboard LCP: −23,4 %. El candidato LCP observado es la descripción de PageHeader, no un gráfico: se beneficia de que ECharts deje de bloquear el componente de ruta. FCP de Login permanece esencialmente estable; no se interpreta su variación submilisegundo como regresión significativa. Los valores absolutos pequeños de TBT tienen ruido; no prueban mejoras de INP. Lighthouse es un laboratorio de escritorio en localhost, sin tráfico real ni usuarios: INP exige interacciones/mediciones de campo y estos resultados no se extrapolan a móviles o redes de producción.

## Análisis y decisiones

- Los metafiles muestran imports modulares de ECharts: Line, Pie y Bar; Grid, Tooltip, Legend, Aria y SVGRenderer. No se incorporan registros de mapas, grafos, scatter ni CanvasRenderer. El mapa de orígenes usa SVG nativo.
- Material/CDK Overlay y SnackBar estaban en bootstrap a través de App y GlobalErrorHandler, aunque Login no necesita feedback activo. FeedbackService carga el motor al pedir un mensaje, comparte la promesa y contiene fallos; se conservan politeness, throttling y mensajes seguros.
- Auth, Dashboard, Threats, Devices, Audit, Settings, detalles y diálogos conservan entradas lazy. El gate de producción inspecciona código emitido y rechaza dependencias de testing/bridge E2E y ECharts en inicial.
- `@defer (on viewport)` carga los tres gráficos sin prefetch. Cada placeholder/loading/error conserva 19 rem de altura. Los datos textuales siguen disponibles y un fallo de import muestra una alternativa legible. El mapa SVG ligero mantiene su renderizado habitual.
- Un microbenchmark en Chromium, 100 series de 30 fechas, midió 192,2 ms creando un Intl.DateTimeFormat por punto y 11,6 ms creando uno por serie. Se aplica esa reutilización. Es una medición aislada del formateo, no una promesa sobre la velocidad total del gráfico.
- ECharts conserva una instancia; actualiza opciones al cambiar datasets/rango/tema/motion, observa resize y desconecta/dispose al destruir. Las pruebas protegen que un cambio exclusivamente de KPIs no redibuje. Se conserva `notMerge: true` para reemplazar conjuntos coherentes de opciones sin restos de otro rango; no se añade una ruta incremental más compleja sin evidencia.
- Rendering revisado: stores/comandos derivados con computed, listas de entidades con track por id, arrays paginados 10/25/50, historial de notificaciones limitado a 100 y deduplicación acotada. Realtime, búsqueda y diálogos limpian suscripciones/timers. Las funciones de columnas y etiquetas son pequeñas; no se introducen caches ni virtual scroll sin coste observado.
- Generación mock aislada medida en Node 24, 20 repeticiones: 200 amenazas mediana 0,60 ms (máximo 1,91), 463 dispositivos 5,98 ms (máximo 14,51), tres resúmenes 0,08 ms (máximo 0,49). Es un diagnóstico sintético, no tiempo del navegador. Los traces Lighthouse no atribuyen tareas largas al generador; se mantiene el mecanismo centralizado existente para preservar coherencia realtime. El socket sigue autenticado y no se conecta en Login.
- CLS medido es bajo y estable; se reserva altura de gráficos y se mantienen skeletons de KPIs. No se añaden alturas rígidas a texto que pudiera crecer con zoom.

## Gates

La revisión del refresco de tablas detectó que la opacidad 0,65 aplicada al contenedor reducía el contraste efectivo de las descripciones muted a 2,60:1 (light) / 3,79:1 (dark). Se conserva el contraste original 5,11:1 / 7,13:1 durante la actualización, usando el cursor de progreso y el estado aria-busy existentes. Dos E2E calculan el contraste renderizado con la petición pendiente y reloj determinista.

Angular inicial: warning 400 kB / error 450 kB, endurecidos desde 500 kB / 1 MB con referencia 355,71 kB. Styles: se mantienen 4/8 kB. No se aumenta ningún presupuesto.

`npm run build` produce stats y ejecuta `scripts/check-bundles.mjs`: límites raw para Login 16 kB, Shell 100 kB, Dashboard 30 kB, Threats 25 kB, Devices 27 kB, Settings 40 kB, Audit 5 kB y gráficos 600 kB. El margen documentado permite cambios pequeños sin dejar crecer el motor o volver a incorporarlo en una ruta. El JSON de todos los chunks y gzip real queda en `dist/sentinel/bundle-report.json`. El job quality existente ya ejecuta build, por lo que esos gates funcionan en CI sin añadir Lighthouse CI.

En ventanas bajas, incluido el zoom real al 400 %, Notification Center reduce su margen superior y ajusta la altura disponible. El E2E exige al menos 80 px de contenido visible además de comprobar foco, límites del viewport y axe.

## Accesibilidad y alcance de la revisión

Diseñado y probado contra criterios WCAG 2.2 AA; no es una certificación ni una auditoría con lector de pantalla.

| Área                                          | Evidencia                                                                                                                                                                                                                                                            |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login, Dashboard, listas, detalles y Settings | Landmarks, heading principal, labels/descriptions, tablas con caption/scope/sort y alternativas de listas móviles; axe light/dark.                                                                                                                                   |
| Navegación y foco                             | Skip link y foco en main después de cambios de path; queries de filtros/paginación conservan el control activo. Main estable evita perder el foco al sustituir el heading de detalle tras cargar datos. Drawer móvil devuelve foco al destino al terminar de cerrar. |
| Teclado                                       | Flujo sin mouse: login, sidebar, amenazas, búsqueda/filtro, detalle, paleta, Settings/tema, notificaciones y logout. Menús se recorren con flechas; inputs conservan escritura normal. Sin tabindex positivo.                                                        |
| Diálogos                                      | Focus inicial/trap/Escape/restore de paleta, notificaciones, ayuda y confirmación; pruebas con zoom.                                                                                                                                                                 |
| Scroll                                        | Notification Center y ayuda permiten enfocar la región de contenido: la infracción scrollable-region-focusable encontrada al 400 % se corrige sin excepciones axe.                                                                                                   |
| Gráficos                                      | Descripción explícita se suministra a aria.label.description para impedir que ECharts la sustituya por un listado automático incompleto. Patrones/estilos de línea, textos, cifras y listas dan alternativas al color.                                               |
| Contraste                                     | Tokens compartidos light/dark; texto principal/secundario/muted, controles, badges, foco y etiquetas/tooltips de gráficos revisados. Bordes de formulario usan border-strong. Rejillas/bordes decorativos no son la única fuente de información.                     |
| Motion                                        | System sigue el sistema; Reduce elimina transiciones CSS y animación ECharts; Full es una elección explícita y persistente. Se prueban cambios del media query y el override.                                                                                        |
| Zoom                                          | Zoom real Chromium 200 % y 400 % mediante chrome.tabs.setZoom, no CSS zoom ni pinch. Perfil efímero con extensión exclusivamente de tests. Reflow 720/360 px, Login, rutas/detalles, navegación, búsqueda y diálogos sin scroll horizontal de página.                |
| Targets                                       | Botones de icono Material 48 px; controles principales 44 px, filtros y sort conservan superficies cómodas. Indicador realtime compacto tiene mínimo 24 × 24 px. Foco visible sin usar solo color para estado.                                                       |
| Anuncios                                      | Realtime/feedback polite; se conserva throttling de eventos críticos. Los datos del gráfico y cada entrada del historial no se anuncian automáticamente con assertive.                                                                                               |

Limitaciones: axe no evalúa toda la experiencia de lectores de pantalla, orden semántico percibido, daltonismo o todos los niveles de zoom. La revisión de contraste no incluye calibración de pantallas. Quedan recomendadas comprobaciones humanas con NVDA/VoiceOver en uso real. El servidor E2E desactiva prebundle/HMR/live reload después de observar una recarga durante login; no se cambia el servidor de desarrollo normal.
