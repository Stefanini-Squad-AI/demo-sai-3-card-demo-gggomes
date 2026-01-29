# 💸 TRANSACTION - Transaction Module

**Module ID**: TRANSACTION  
**Versión**: 1.0  
**Última actualización**: 2026-02-14  
**Propósito**: Registrar transacciones manuales, navegar el historial y generar reportes operativos que se integren con los APIs reales del backend.

---

## 📋 Visión general del módulo

El módulo **TRANSACTION** articula cuatro experiencias críticas: agregar una transacción con validaciones COBOL-style, listar resultados paginados, ver el detalle completo y emitir reportes (mensual/año/rango). Se apoya en `SystemHeader` para mantener el mismo layout de los módulos de cuenta/tarjeta y en componentes MUI típicos (Cards, Grid, Table, Chips).

### Responsabilidades principales
- Registrar una transacción con doble paso de confirmación (`handleSubmit` -> `confirmation` Y/N) y validaciones sincronizadas con el backend Spring Boot (`transactionTypeCode` 1-2 dígitos, `transactionAmount` en rango ±99,999,999.99, fechas en ISO, merchantId numérico, etc.).
- Listar movimientos con paginado controlado por `firstTransactionId`/`lastTransactionId` y shortcuts F7/F8 para avanzar/regresar, seleccionando un registro por acción `'S'` para abrir el detalle.
- Navegar desde el listado al detalle y viceversa, almacenando el `transactionId` seleccionado y permitiendo limpiar/blanquear la pantalla o volver al menú principal.
- Generar reportes en `Dialog` que muestran `TransactionReportTable` con totalizadores por cuenta, permiten descargar un TXT que simula el viejo “reporte físico” y disparar impresión con `window.print()`.

---

## 🏗️ Arquitectura y componentes clave

**Tecnologías**: React 18, TypeScript, MUI 5, React Router DOM 6, custom hook `useMutation` + `apiClient`, MSW para mocks locales.

### Componentes principales
1. **TransactionAddScreen.tsx** – Pantalla de formulario extendido con secciones para identificación, detalles financieros y merchant data. Incluye paneles de ayuda/desarrollador (`testData`, `validationHelp`, `requestPreview`), shortcuts (F3: salir, F4: limpiar, F5: copiar último) y un paso de confirmación antes de enviar `POST /transactions`.
2. **TransactionListScreen.tsx** – Tabla con columnas `Sel`, `Transaction ID`, `Date`, `Description`, `Amount`. Usa `TextField` de selección para escribir `'S'` y `IconButton` para navegar con `useTransactionList`. Maneja `Enter` para buscar, `F7/F8` para paginar y `F3` para salir.
3. **TransactionViewScreen.tsx** – Formulario simple para recuperar un `transactionId`, renderizado en `Card`s con íconos y `MoneyIcon`. Tiene botones `F4 = Clear`, `F5 = Browse Tran.` y `F3 = Back`.
4. **TransactionReportsScreen.tsx & TransactionReportTable.tsx** – Interface guiado por `RadioGroup` (monthly/yearly/custom), validaciones de fecha + confirmación obligatoria, y diálogo posterior con tabla detallada (columna `AMOUNT` con colores, account totals, grand total). `TransactionReportTable` formatea currency/date con utilidades de `~/utils`.
5. **Hooks `useTransactionAdd/List/View/Reports`** – Centralizan lógica: campos, validaciones (`isNaN`, regex), navegación, estados de loading, errores, `handleInitialLoad` y `handleTransactionSelect`. Todos usan `useMutation` y `apiClient` para hablar con los endpoints reales.

### Flujo resumido (Mermaid)
```mermaid
flowchart TB
  subgraph UI
    TA[TransactionAddScreen] --> TA_Hook[useTransactionAdd]
    TL[TransactionListScreen] --> TL_Hook[useTransactionList]
    TV[TransactionViewScreen] --> TV_Hook[useTransactionView]
    TR[TransactionReportsScreen] --> TR_Hook[useTransactionReports]
  end
  subgraph API
    API_Add[POST /transactions]
    API_List[POST /transactions/list /next-page /previous-page]
    API_View[GET /transaction-view/search / POST /transaction/clear]
    API_Reports[/v1/reports/transactions/{monthly|yearly|custom}/]
  end
  TA_Hook --> API_Add
  TL_Hook --> API_List
  TV_Hook --> API_View
  TR_Hook --> API_Reports
```

### Dependencias internas
- **SystemHeader** y utilidades visuales (`LoadingSpinner`, `alpha(theme)`) reutilizadas por los cuatro screens.
- **Hooks** se apoyan en `useNavigate` para regresar al menú o saltar pantallas.
- **apiClient + useMutation** (en `app/hooks/useApi.ts`) manejan axios/config de base y uniforman logs/errores.
- **Datos de prueba**: `testTransactions` en `TransactionAddScreen` y `selectionInputs` en la lista se combinan con `app/mocks/transaction*Handlers.ts` y `validate-mocks.sh`.

---

## 🔌 APIs públicas

| Método | Endpoint | Comportamiento principal |
| --- | --- | --- |
| `POST` | `/transactions` | Alta de transacción. Requiere confirmación `Y`, convierte campos y fechas a las estructuras del backend, responde con `transactionId`, `message` y `success`. |
| `POST` | `/transactions/list` | Consulta inicial (page 1) y filtrado por `transactionId`. |
| `POST` | `/transactions/next-page` | Solicita la siguiente página usando `lastTransactionId`. |
| `POST` | `/transactions/previous-page` | Solicita la página anterior usando `firstTransactionId`. |
| `GET` | `/transaction-view/search?transactionId=:id` | Devuelve `TransactionViewResponse` con timestamps, merchant info y mensajes de cabecera. |
| `POST` | `/transaction/clear` | Reestablece pantalla de detalle (limpia campos y headers). |
| `POST` | `/v1/reports/transactions/monthly` | Reporte del mes actual (requiere `confirmed: true`). |
| `POST` | `/v1/reports/transactions/yearly` | Reporte del año actual. |
| `POST` | `/v1/reports/transactions/custom` | Reporte personalizado con `startDate`, `endDate` y confirmación. |

Los hooks de transacción son los únicos consumidores de estos endpoints y exponen `loading`, `error`, `handleSubmit`, `handleSearch`, `handleReportTypeSelect`, etc.

---

## 📊 Modelos de datos clave

```typescript
interface TransactionAddRequest { accountId?: string; cardNumber?: string; transactionTypeCode: string; transactionCategoryCode: string; transactionSource: string; transactionDescription: string; transactionAmount: string; originalDate: string; processDate: string; merchantId: string; merchantName: string; merchantCity: string; merchantZip: string; confirmation: 'Y' | 'N' | '' }
interface TransactionAddResponse { transactionId: string | null; message: string; success: boolean }

interface TransactionItem { transactionId: string; date: string; description: string; amount: number }
interface TransactionListResponse { transactions: TransactionItem[]; currentPage: number; hasNextPage: boolean; hasPreviousPage: boolean; firstTransactionId?: string; lastTransactionId?: string; errorMessage?: string }

interface TransactionViewResponse { transactionId?: string; cardNumber?: string; transactionTypeCode?: string; transactionCategoryCode?: string; transactionSource?: string; transactionAmount?: string; transactionDescription?: string; originalTimestamp?: string; processedTimestamp?: string; merchantId?: string; merchantName?: string; merchantCity?: string; merchantZip?: string; errorMessage?: string }

interface ReportData { reportType: string; startDate: string; endDate: string; accountGroups: AccountGroup[]; grandTotal: number; totalTransactionCount: number; accountCount: number }
interface AccountGroup { accountId: number; cardNumber: string; transactions: Transaction[]; accountTotal: number; transactionCount: number }
interface Transaction { transactionId: string; cardNumber: string; typeCode: string; typeDescription: string; categoryCode: number; categoryDescription: string; source: string; amount: number; processedTimestamp: string }
```

Las definiciones completas residen en `app/types/transactionAdd.ts`, `app/types/transactionList.ts`, `app/types/transactionView.ts` y `app/types/transactionReports.ts`.

---

## 🔐 Reglas de negocio
1. `accountId` (11 dígitos) o `cardNumber` (16 dígitos) es obligatorio para crear transacciones; no se permiten ambos vacíos.
2. `transactionTypeCode` debe ser numérico de 1-2 dígitos y `transactionCategoryCode` de 1-4; fallar cualquiera bloquea el super submit.
3. `transactionAmount` se valida contra `isNaN` y el rango ±99,999,999.99 (todos los montos se renderizan con el formato de moneda en UI).
4. `originalDate` y `processDate` deben proveerse en formato `YYYY-MM-DD` y se convierten a ISO antes de enviarse al backend.
5. Campos del comerciante (`merchantId`, `merchantName`, `merchantCity`, `merchantZip`) son obligatorios; el ID debe ser numérico.
6. Cada envío requiere `confirmation` (`Y` en mayúsculas/minúsculas) para disparar el `POST /transactions`.
7. Las búsquedas de transacciones (`TransactionList`, `TransactionView`) sólo aceptan IDs numéricos, se limpian errores tras cada intento y el listado replica el comportamiento de COBOL con `S` como único selector válido.
8. Reportes mensuales/anuarios requieren confirmación y, para rangos personalizados, `startDate` ≤ `endDate`; la interfaz bloquea la generación hasta que todas las validaciones pasan.

---

## ⚡ Patrones y aceleradores de implementación
- **Hooks centralizados**: `useTransactionAdd/List/View/Reports` contienen toda la lógica (validación, transformación, navegación, pintado de errores), permitiendo que los componentes mantengan sólo layout y llamadas a `handleX`.
- **SystemHeader + MUI**: los `transactionId`/`programName` (`CT02`, `CT00`, `CT01`, `CR00`) están sincronizados con los COBOL legacy; el uso consistente de `Box`, `Grid`, `Paper`, `Stack` mantiene la experiencia homogénea.
- **Reportes reproducibles**: `TransactionReportTable` ofrece `Download TXT`, `Print` y totales agrupados por cuenta; el formato monoespaciado replica el reporte legacy.
- **Shortcuts de teclado**: F3 (salir), F4 (clear), F5 (copy last o browse), F7/F8 (páginar) están implementados en los screens para emular la interfaz de línea de comandos que esperaban los operadores.
- **Modo desarrollo**: `import.meta.env.DEV` habilita paneles de `testData`, `validationHelp` y `requestPreview`, acelerando debugging sin tocar el backend.
- **Mocks y validaciones**: `app/mocks/transaction*Handlers.ts` junto con el script `validate-mocks.sh` garantizan que los datos de prueba (p. ej. cuentas 11111111111, 222...) sigan los formatos esperados antes de cualquier release.

---

## 🎯 Plantillas de User Stories específicas
1. Como operador de back-office, quiero ingresar manualmente una transacción con confirmación para corregir un cargo incorrecto y disponer del `transactionId` que me entrega el backend.
2. Como auditor, quiero buscar transacciones por ID, activar pagination con F7/F8 y seleccionar con `'S'` para revisar el historial completo de un movimiento.
3. Como analista, quiero ver los detalles amplios de una transacción (montos, timestamps, merchant info) sin tener que volver a escribir el ID manualmente.
4. Como controlador financiero, quiero generar reportes mensuales, anuales o por rango personalizado, confirmar la operación y descargar/print el reporte consolidado.

---

## ✅ Criterios de aceptación recurrentes
- `TransactionAddScreen` no dispara el `POST /transactions` hasta que todos los campos obligatorios pasan las validaciones y el usuario escribe `Y` en el paso de confirmación.
- En el listado, el paginado sólo avanza/retrocede si `hasNextPage/hasPreviousPage` lo permiten y los botones F7/F8 están deshabilitados momentáneamente mientras se carga la respuesta.
- `TransactionViewScreen` informa errores de la API tanto en el campo `searchTransactionId` como en el `Alert` global y permite volver a la lista o limpiar (F4) sin recargar la ruta.
- `TransactionReportsScreen` bloquea la generación si falta tipo de reporte, las fechas son inválidas o la confirmación es `'N'`; el diálogo resultante muestra el `TransactionReportTable` con totales.

---

## 🧪 Pruebas, mocks y datos de soporte
- MSW expone `transactionAddHandlers`, `transactionListHandlers`, `transactionViewHandlers` y `transactionReportsHandlers` en `app/mocks`.
- `validate-mocks.sh` y los fixtures del módulo (`app/mocks/transactionReportHandlers.ts`) se ejecutan en pipelines para asegurar que los `transactionId` y montos cumplen patrones definidos.
- Los paneles de desarrollo (`testTransactions`, `commonCategories`, chips de quick fill) permiten recrear escenarios reales sin llamar a APIs externas.

---

## 🚨 Riesgos identificados y mitigaciones
1. **Confirmación manual**: ingresar `Y/N` basado en texto puede provocar errores de usuario; mitigación: reforzar el helper UI (chips y helper text) y considerar un toggle (Sí/No) más visual.
2. **No hay auditoría**: la acción de agregar transacciones no registra quién la ejecuta; plan: registrar la sesión/usuario antes de persistir en el backend real.
3. **Reporte como TXT**: la descarga simula un PDF con texto plano; si los stakeholders exigen PDF real, hay que integrar un servicio extra (e.g., jsPDF o backend generando PDF).
4. **Copy Last transacción no está implementado**: el botón F5 sólo muestra un warning; se debe exponer un endpoint que devuelva los datos de la última transacción antes de habilitarlo.

---

## 📈 Métricas y readiness
- **Presupuesto de latencia**: lista/consulta/visualización en < 500ms (P95) en MSW, alta de transacción < 1s y reporte < 2s visualizados con `loading` y `Alerts`.
- **Capacidad**: el reporte puede manejar decenas de cuentas (agrupadas por `accountGroups`) y cientos de transacciones sin paginación gracias a la tabla con `max-height` y `sticky header`.
- **Disponibilidad**: todo el módulo depende de tokens/de credenciales en `localStorage` (manejado por `useSecureSession`) y redirige a `/menu/main` si falta información.

---

## 📝 Próximos pasos recomendados
1. Implementar la funcionalidad real de “Copy Last Transaction” con un endpoint `GET /transactions/latest` para agilizar reportes de corrección.
2. Integrar generación de reportes en PDF o Excel para que el `Download TXT` sea opcional y cumpla requisitos de auditoría.
3. Añadir telemetría en los hooks (`logLatency(feature, payload)`) para medir cuánto tardan las mutaciones y alimentar alertas de performance.
4. Desarrollar auditoría/bitácora para cada alta de transacción antes de exponer este módulo a entornos productivos.

