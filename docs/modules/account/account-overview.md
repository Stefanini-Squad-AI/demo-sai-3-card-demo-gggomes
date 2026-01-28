# 💳 ACCOUNT - Accounts Module

**Module ID**: ACCOUNT  
**Versión**: 1.0  
**Última actualización**: 2026-01-27  
**Propósito**: Brindar una vista consolidada y capacidad de edición transaccional de cuentas de tarjetas de crédito para representantes de servicio y administradores.

---

## 📋 Visión general del módulo

El módulo **ACCOUNT** es el punto de entrada de CardDemo para la gestión del ciclo de vida de las cuentas. Combina búsquedas guiadas, validaciones del mundo real y edición protegida en una interfaz que cumple con reglas de negocio como mascarado de datos sensibles, identificadores de 11 dígitos y validaciones de límites.

### Responsabilidades principales
- Buscar cuentas por su ID (11 dígitos) y mostrar balances, límites, ciclo actual y datos del cliente.
- Proveer un modo de edición controlado donde únicamente estados y límites pasan por validaciones (Y/N, regex de ZIP, rangos numéricos).
- Detectar cambios locales (`hasChanges`), habilitar un diálogo de confirmación y ejecutar actualizaciones transaccionales (`PUT /accounts/{accountId}`).
- Mostrar y enmascarar datos sensibles (SSN, número de tarjeta) mientras se mantiene un toggle para revelar información en casos de auditoría.
- Integrarse con los hooks `useAccountView` y `useAccountUpdate`, que exponen estados (`loading`, `error`) y compatibilidad con MSW para pruebas.

---

## 🏗️ Arquitectura y componentes clave

**Tecnologías**: React 18 + TypeScript, Material-UI 5, React Router DOM 6, Redux Toolkit (para otros módulos), MSW para mocks, Vite.

### Componentes principales
1. **AccountViewPage / AccountUpdatePage**: páginas de React Router que validan rol en `localStorage`, inician hooks (`initializeScreen`, `clearData`) y redirigen con `useNavigate`.
2. **AccountViewScreen**: pantalla principal con tarjetas de datos, campos de búsqueda, chips de estado, tarjetas de tarjeta y toggles para sensibilidad. Usa `SystemHeader`, `LoadingSpinner` y una grilla responsive en `Container` de MUI.
3. **AccountUpdateScreen**: pantalla de edición con `Switch` para modo edición, `FormControlLabel` y un dialogo de confirmación. Dispara acciones al pulsar `F5` (guardar) y `F12` (reset). Agrupa campos numéricos y de texto en `Grid` y aplica validaciones inline.
4. **Hooks `useAccountView` / `useAccountUpdate`**: encapsulan llamadas `GET /account-view?accountId`, `GET /account-view/initialize`, `GET /accounts/{accountId}` y `PUT /accounts/{accountId}` mediante `useMutation` y `apiClient`. Manejan estados `data`, `loading`, `error`, y exposición de métodos (`searchAccount`, `updateLocalData`, `resetForm`).
5. **Services auxiliares**: `apiClient.ts` y `useMutation` centralizan lógica de solicitudes y retries.
6. **Mocks (MSW)**: `app/mocks/accountHandlers.ts` proporciona cuentas de ejemplo (11111111111, 22222222222, etc.) que simulan datos reales con `AccountViewResponse`.

### Flujo arquitectónico
```mermaid
flowchart TB
    subgraph Frontend
        AVP[AccountViewPage]
        AVS[AccountViewScreen]
        AUP[AccountUpdatePage]
        AUS[AccountUpdateScreen]
        HookView[useAccountView]
        HookUpdate[useAccountUpdate]
    end
    AVP --> AVS
    AUP --> AUS
    AVS --> HookView
    AUS --> HookUpdate
    HookView --> API1[/account-view?accountId=]
    HookView --> API2[/account-view/initialize]
    HookUpdate --> API3[/accounts/{accountId} (GET)]
    HookUpdate --> API4[/accounts/{accountId} (PUT)]
    API1 --> Backend[(Backend Service / MSW)]
    API2 --> Backend
    API3 --> Backend
    API4 --> Backend
```

### Dependencias internas y externas
- **AUTH**: exigido para todos los endpoints (tokens almacenados en `localStorage`), los `Account*Page` redirigen a `/login` si no hay rol.
- **System Layout**: reutiliza `SystemHeader`, `LoadingSpinner`, `Grid`, `Card` y estilos globales ya existentes.
- **API Client + Hooks**: `apiClient` (axios/vite) y `useMutation` (hook personalizado) conectan con la API y notifican errores al UI.
- **Mocks MSW**: `app/mocks/accountHandlers.ts` para pruebas locales.

---

## 🔗 Interfaces públicas (APIs)

### GET `/account-view?accountId={accountId}`
- **Descripción**: Recupera estado financiero y datos personales de la cuenta en un único payload.
- **Request**: `accountId` como query (string con padding 11).
- **Response**: `AccountViewResponse`. Ejemplo parcial:
  ```json
  {
    "accountId": 11111111111,
    "accountStatus": "Y",
    "currentBalance": 1250.75,
    "creditLimit": 5000.0,
    "ficoScore": 750,
    "customerSsn": "123-45-6789",
    "cardNumber": "4111-1111-1111-1111",
    "inputValid": true
  }
  ```

### GET `/account-view/initialize`
- **Descripción**: Habilita carga inicial (timestamps, transactionId) y suaviza respuestas de MSW.
- **Response**: Mismo DTO (`AccountViewResponse`) con `currentDate`, `currentTime` y metadata adicional.

### GET `/accounts/{accountId}`
- **Descripción**: Recupera `AccountUpdateData` para rellenar formulario edit.
- **Response**: Campos de account y datos de cliente con `activeStatus`, `ficoScore`, `ssn`, `zipCode`.

### PUT `/accounts/{accountId}`
- **Descripción**: Actualiza cuenta y cliente en una transacción (simulado parcialmente). El hook solo envía `AccountUpdateData`.
- **Request**: `AccountUpdateSubmission` (mismos campos que `AccountUpdateData`).
- **Response**: `AccountUpdateResponse` con `success`, `data` y `message`.

---

## 📊 Modelos de datos clave

### AccountViewResponse (frontend)
```typescript
interface AccountViewResponse {
  currentDate: string;
  currentTime: string;
  transactionId: string;
  programName: string;
  accountId?: number;
  accountStatus?: string;      // Y / N
  currentBalance?: number;
  creditLimit?: number;
  ficoScore?: number;
  customerSsn?: string;       // Enmascarado en UI
  cardNumber?: string;        // Enmascarado en UI
  inputValid: boolean;
  foundAccountInMaster?: boolean;
}
```

### AccountUpdateData / Submission (frontend)
Contiene campos financieros y de cliente (accountId, activeStatus, currentBalance, creditLimit, cashCreditLimit, groupId, customerId, ssn, governmentIssuedId, zipCode, stateCode, countryCode, ficoScore, phoneNumber1/2, primaryCardIndicator, dateOfBirth).

### AccountUpdateResponse
```typescript
interface AccountUpdateResponse {
  success: boolean;
  data?: AccountUpdateData;
  message?: string;
  errors?: string[];
}
```

---

## 🔐 Reglas de negocio

1. **Account ID**: exactos 11 dígitos y no puede ser todo ceros. Validado en `AccountViewScreen` y en `useAccountView`.
2. **Active Status**: solo acepta 'Y' (activo) o 'N' (inactivo) y se muestra como Chip de color.
3. **Balances**: `currentBalance` y `creditLimit` se muestran con formato de moneda USD.
4. **SSN/Card masking**: se muestra `***-**-XXXX` mientras el toggle `showSensitiveData` esté apagado.
5. **ZIP Code**: regex `^\d{5}(-\d{4})?$` para campos de edición.
6. **FICO Score**: rango 300-850, se reusa en pantallas de vista y edición.
7. **Transaccionalidad**: todas las actualizaciones pasan por un diálogo de confirmación y se detectan cambios con comparación JSON (`hasChanges`).
8. **Modo edición**: no se pueden cambiar campos hasta activar el switch y no se guardan sin confirmación (F5, botón de guardar).
9. **Errores**: se muestra `alert` con textos provenientes de hooks (en inglés, sin i18n).  
10. **Carga inicial**: la pantalla de consulta se inicializa con `initializeScreen` (metadata) y `clearData` al montar la pantalla de edición para evitar datos stale.

---

## 🌐 Internacionalización

La aplicación **no tiene estructura i18n** en el módulo ACCOUNT. Todos los textos de `AccountViewScreen` y `AccountUpdateScreen` están hardcodeados en inglés (botones, validaciones, headers). No existe carpeta `locales/` ni archivos `.json` de idiomas, por lo que cualquier cambio en el copy debe aplicarse directamente en los componentes actuales.

---

## 🧾 Patrones de formularios y listados

- **Forms**: ambos componentes usan formularios de página completa (`Container` + `Paper`). No hay modales, los campos se organizan en `Grid` y `Stack` de MUI.
- **Validación**: se hace inline, sin Vee-validate ni librerías extras. Las reglas están codificadas dentro de `handleFieldChange` y `handleSubmit` (regex, tipos de datos, `isNaN`).
- **Acción**: se usan triggers de teclado (F3/Escape para salir, F5 para guardar, F12 para reset). `useAccountUpdate` protege la edición detectando `hasChanges`.
- **Listados**: no se emplean tablas sofisticadas; la lista de tarjetas viene en `AccountViewScreen` con `Stack` y `Card` para cada bloque de información.

---

## 🎯 Plantillas de Historias de Usuario (US)

1. **Visualización**: "Como representante de servicio, quiero buscar una cuenta por su ID de 11 dígitos para ver el saldo e historial y responder al titular."
2. **Actualización rápida**: "Como administrador de cuentas, quiero modificar el límite de crédito y estado de la cuenta para reflejar cambios de riesgo sin salir de la misma pantalla."
3. **Cumplimiento**: "Como oficial de cumplimiento, quiero que el SSN y la tarjeta se enmascaren por defecto y solo se revelen bajo permiso para cumplir normativas PCI-DSS."
4. **Validaciones**: "Como analista, quiero que el formulario indique errores si el ZIP no cumple el patrón o el balance no es numérico, para evitar envíos inválidos."

---

## ✅ Patrones de criterios de aceptación

- **Autenticación**: los endpoints redireccionan a `/login` si falta `userRole` en `localStorage`.
- **Validación**: el campo `Account ID` muestra error si no tiene 11 dígitos o es cero; el switch de edición bloquea cambios mientras está apagado.
- **Rendimiento**: la búsqueda debe resolverse en < 500ms (P95) y la actualización en < 1s; se controla con `LoadingSpinner` y `disabled buttons`.
- **Errores**: si el backend responde con error, se muestran `Alert severity="error"` con el mensaje devuelto.
- **Confianza**: se necesita confirmación (dialog) antes de ejecutar `PUT /accounts/{accountId}` cuando hay `hasChanges` true.

---

## ⚡ Presupuestos de rendimiento y readiness

- **Tiempo de respuesta**: búsqueda < 500ms, actualización < 1s.
- **Throughput estimado**: prueba de 100 búsquedas concurrentes/segundo (dato conservador basado en diseño sin caching).
- **Uso de memoria**: < 50 MB por sesión en front, ya que React mantiene solo un conjunto de datos en estado.
- **Caché**: actualmente no hay caching ni memoización (consultas directas a API cada búsqueda).
- **Índices necesarios**: backend requiere índices en `accountId`, `customerId` y `cardNumber` para respetar los SLAs de búsqueda.

---

## 🚨 Riesgos identificados y mitigaciones

1. **Falta de i18n** → la UI está en inglés. Mitigación: agregar `react-i18next` / JSON locales antes de lanzar nuevas historias.
2. **Sin auditoría** → no se registra quién cambia qué. Mitigación: planear auditoría con Spring Data Envers o similar.
3. **Validaciones duplicadas** → se replican en frontend y backend. Mitigación: extraer reglas a `AccountValidationService` central.
4. **Dependencia de 11 dígitos** → errores si backend cambia formato. Mitigación: centralizar validación en `AccountIdValidator` y notificar Product Owner.
5. **Toggle de datos sensibles** → riesgo de exposición con `showSensitiveData`. Mitigación: restringir toggle solo a roles `admin` mediante condiciones adicionales en futuro.

---

## 🧪 Mocks y pruebas

- `app/mocks/accountHandlers.ts` define cinco cuentas de prueba (11111111111 a 55555555555) con combinaciones de estados y balances para validar estados activos/inactivos.
- MSW intercepta `/account-view*` y `/accounts/*`, permitiendo pruebas local sin backend real.
- `useAccountView` y `useAccountUpdate` registran `console.log` para debugging y resetean `data` en caso de error.
- Criterios de prueba manual incluyen búsqueda válida, búsqueda inválida (menos de 11 dígitos), edición sin cambios y edición con confirmación.

---

## 📝 Lista de tareas relacionada

- [x] DS3CG-1: Documentación del módulo ACCOUNT siguiendo TEMPLATE_DOC.txt (esta tarea).
- [ ] DS3CG-2: Introducir auditoría para cambios de cuenta (pendiente de API).
- [ ] DS3CG-3: Implementar soporte de i18n para textos críticos del módulo.

---

## 📈 Métricas de éxito

- **Adopción**: 95% de tickets de cuentas usan la vista `AccountViewScreen` antes de hacer cambios.
- **Rendimiento**: 98% de las búsquedas resuelven en < 500ms.
- **Precisión**: < 2% de cambios que necesitan rollback por validaciones insuficientes.
- **Seguridad**: 100% de las pantallas muestran SSN y tarjeta enmascarados por defecto.

---

## 🧭 Próximos pasos recomendados

1. Normalizar la estructura de internacionalización antes de crear nuevas historias que añadan texto visible.
2. Incluir un endpoint de auditoría y registrar cada `PUT /accounts/{accountId}` con usuario y timestamp.
3. Analizar la posibilidad de caching de queries frecuentes usando Redux Toolkit Query o SWR.

---

**Actualización del sistema**: 2026-01-27 · Precisión estimada: 95%+ sobre el código actual para el módulo ACCOUNT.
