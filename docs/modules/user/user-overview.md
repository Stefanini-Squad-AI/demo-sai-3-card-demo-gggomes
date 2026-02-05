# 👤 USER - User Module

**Module ID**: USER  
**Versión**: 1.0  
**Última actualización**: 2026-02-05  
**Propósito**: Administrar usuarios del sistema (back-office y admin) con búsquedas, alta, edición y baja alineadas a las teclas históricas del mainframe.

---

## 📋 Visión general y contexto

El módulo **USER** centraliza los cuatro flujos de seguridad que aparecen en el menú administrativo: listado con selección por teclas (CF: F7/F8 para paginar, Enter para procesar) y pantallas transaccionales para agregar, actualizar y eliminar usuarios.  
Las páginas son accesibles desde el menú admin y fuerzan `selectCurrentUser().role === 'admin'` antes de renderizar `UserAddPage`, `UserUpdatePage` y `UserDeletePage`.

### Responsabilidades clave
1. Listar usuarios (pantalla `UserListScreen`) con atajos de teclado, selección `Select` con valores `U`/`D` y navegación controlada a las pantallas de edición/baja.
2. Alta de usuarios (`UserAddScreen`) con validaciones del mainframe (campos obligatorios, `userId` y `password` en mayúsculas hasta 8 caracteres, `userType` A/U) y atajos `F3`/`F4`/`F12`.
3. Actualización (`UserUpdateScreen`) que primero busca el usuario (`fetchUser`), carga datos en formularios responsive y exige `hasChanges()` antes del guardado (`F5`, `F3`).
4. Eliminación (`UserDeleteScreen`) que muestra datos en solo lectura y abre un diálogo de confirmación antes de llamar a `UserApiAdapter.deleteUser`.

---

## 🏗️ Stack técnico y componentes clave

- **Frontend**: React 18 + TypeScript + Vite + Material-UI 5 (Container, Grid, Paper, Table, Select, Chip, Dialog).  
- **Routing**: React Router DOM mantiene `/admin/users/list`, `/admin/users/add`, `/admin/users/update`, `/admin/users/delete`. Las páginas depositan `LoadingSpinner` mientras `useUser*` carga.
- **Patrones**: `SystemHeader` con `transactionId` (CU00/CU01/CU02/CU03) y `useMutation`/`useApi` para unificar carga/errores.
- **Hooks**: `useUserList`, `useUserAdd`, `useUserUpdate`, `useUserDelete` encapsulan validaciones, lógica de navegación (`useNavigate`), detección de cambios y llamadas a `UserApiAdapter` o a los endpoints MSW según `VITE_USE_MOCKS`.
- **Servicios**: `apiClient` (base `/api`) y `UserApiAdapter` traducen el frontend al backend real y exponen adaptadores para listados (`/users/list`, `/users/previous-page`, `/users/next-page`), selección (`/users/process-selection`) y CRUD (`/users`, `/users/{userId}`).

### Flujo arquitectónico (Mermaid)
```mermaid
graph TD
    List[UserListScreen]
    Add[UserAddScreen]
    Update[UserUpdateScreen]
    Delete[UserDeleteScreen]
    HookList[useUserList]
    HookAdd[useUserAdd]
    HookUpdate[useUserUpdate]
    HookDelete[useUserDelete]
    Adapter[UserApiAdapter]
    API[/api/users/.. endpoints]
    MSW[MSW handlers]

    List --> HookList
    Add --> HookAdd
    Update --> HookUpdate
    Delete --> HookDelete
    HookList -->|GET/POST| Adapter
    HookAdd -->|POST| Adapter
    HookUpdate -->|GET/PUT| Adapter
    HookDelete -->|GET/DELETE| Adapter
    Adapter --> API
    MSW --> Adapter
    HookList --> MSW
```

---

## 🔗 APIs públicas (producción y mocking)

| Método | Endpoint | Uso principal | Notas |
| --- | --- | --- | --- |
| GET | `/api/users/security?page=&limit=&searchUserId=` | Lista paginada + búsqueda en modo MSW | Consumido cuando `VITE_USE_MOCKS` = `true`, emula `userListHandlers`. |
| GET | `/api/users/list?startUserId=&pageNumber=&direction=` | Lista paginada real (adapter) | `UserApiAdapter.getUserList` transforma la respuesta del backend. |
| POST | `/api/users/process-selection` | Validaciones de acción (listado → view/edit/delete) | Devuelve `redirectUrl` y mensaje, usado por `useUserList.handleUserAction`. |
| GET | `/api/users/security/:userId` | Obtiene usuario (MSW) | Permitido por `userUpdateHandlers` y reutilizado por `useUserDelete`. |
| GET | `/api/users/{userId}` | Obtiene usuario real (adapter) | Llamado por `UserApiAdapter.getUserById`. |
| POST | `/api/users/add` | Creación mock | `useUserAdd` usa este endpoint cuando activa mocks; el handler ejecuta validaciones tipo COBOL. |
| POST | `/api/users` | Creación real | `UserApiAdapter.createUser` envía DTO compatible con Spring Boot. |
| PUT | `/api/users/{userId}` | Actualización | `UserApiAdapter.updateUser` garantiza respuestas con `message` y `success`. |
| DELETE | `/api/users/{userId}` | Eliminación | `UserApiAdapter.deleteUser` devuelve mensaje y flag `success`. |
| GET | `/api/users/previous-page` & `/api/users/next-page` | Paginación bidireccional del backend | Permitido para mantener consistencia con el mainframe; implementados por el adaptador aunque MSW no los usa. |

---

## 🧮 Modelos de datos clave

```typescript
interface UserSecurityData {
  userId: string;
  firstName: string;
  lastName: string;
  userType: 'A' | 'U' | 'R';
  createdDate?: string;
  lastLoginDate?: string;
  isActive?: boolean;
}

interface UserListResponse {
  users: UserSecurityData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface UserAddRequest {
  userId: string;
  firstName: string;
  lastName: string;
  password: string;
  userType: string;
}
```

Se complementan con `UserAddResponse`, `UserUpdateData`, `UserUpdateFormData`, `UserDeleteData` y `UserDeleteValidationErrors` en `app/types/`.

---

## 🔐 Reglas de negocio y validaciones

1. `userId` y `password` siempre se convierten a mayúsculas y se limitan a 8 caracteres (add/update).  
2. `userType` solo acepta `A` o `U`; el selector muestra chips con íconos `AdminPanelSettings` / `Person`.  
3. Solo usuarios admin pueden acceder a las pantallas de add/update/delete (`UserAddPage`/`UserUpdatePage`/`UserDeletePage` verifican `user.role === 'admin'`).  
4. `useUserUpdate` exige `hasChanges()` y `password.length === 8` antes de enviar el PUT, y muestra mensajes `Please modify to update ...` o `Password must be exactly 8 characters...`.  
5. `UserListScreen` solo procesa la primera selección (`U` o `D`), reinicia el estado de selección tras completar la acción y permite paginar con `F7`/`F8`.  
6. `UserDeleteScreen` abre un diálogo de confirmación y usa el handler MSW para prevenir eliminar al último admin.

---

## 🧾 Patrones de formularios y listados

- Todos los formularios usan `Container`/`Paper` + `Grid` o `Stack` de MUI con `SystemHeader` y `LoadingSpinner` para mantener consistencia visual.  
- La lista (`UserListScreen`) mezcla tabla con `Select` para acciones, chips de tipo y atajos de teclado (`Enter`, `F3`, `F4`, `F7`, `F8`).  
- Validadaciones inline (sin librería externa) se ejecutan en los hooks `useUserAdd`, `useUserUpdate`, `useUserDelete` replicando la lógica COBOL (no vacío, longitudes, `hasChanges`).  
- Los mensajes de alerta se muestran con `Alert` y se limpian al editar campos; `useUserList` expone `loading`/`error` para el spinner y la alerta.

---

## 🎯 Plantillas de User Stories específicas

1. Como administrador, quiero buscar un usuario por su ID (hasta 8 caracteres) y seleccionar `U` para prepararlo para actualización con `F5`, de modo que la pantalla muestre datos cargados y validaciones estrictas.  
2. Como administrador, quiero crear un usuario nuevo ingresando nombre, apellido, ID, contraseña y tipo, validando la longitud de `userId/password` y reutilizando el hook `useUserAdd`, para registrar credenciales sin salir del modal.  
3. Como administrador, quiero editar password/rol y recibir una alerta si no hay cambios (`hasChanges`), garantizando que el backend reciba solo diferencias reales.  
4. Como administrador, quiero eliminar usuarios después de confirmar el diálogo y evitar borrar al último admin, cumpliendo con las reglas de auditoría actuales.

---

## ✅ Criterios de aceptación recurrentes

- Autenticación: se redirige a `/login` si falta `selectIsAuthenticated`.  
- Validaciones: `User ID` y `Password` no pueden estar vacíos ni superar 8 caracteres; se muestra helper text (`'(8 Char)'`).  
- Atajos: `Enter` procesa la selección; `F3`/`F4`/`F5`/`F12` replican las teclas del mainframe en cada pantalla.  
- Navegación: tras guardar o eliminar, se navega a `/admin/users/list` (con delay en `handleSaveAndExit`).  
- Mensajes: el backend real (`UserApiAdapter`) devuelve `message` y `success`; los hooks muestran `Alert` con el texto recibido.

---

## ⚡ Presupuestos de performance y readiness

- Búsqueda/lista: resolver en < 500ms (MSW simula 300ms).  
- CRUD: operaciones add/update/delete apuntan a < 1s y muestran `LoadingSpinner`.  
- Cache: ninguna consulta se cachea, se confía en MSW/backend para throttling.  
- Riesgos: ausencia de i18n (textos hardcodeados), falta de auditoría y dependencia del token almacenado en `localStorage`.

---

## 🧪 Mocks y soporte local

- Handlers relevantes: `app/mocks/userListHandlers.ts`, `userAddHandlers.ts`, `userUpdateHandlers.ts`, `userDeleteHandlers.ts`.  
- El script `validate-mocks.sh` verifica la consistencia de usuarios (ID repetidos, counting).  
- `VITE_USE_MOCKS` activa las rutas `/api/users/security`, `/api/users/add`, `/api/users/security/:userId`, `/api/users/validate-action`.  
- `userListHandlers` simula paginación, búsqueda por prefijo y validaciones de selección/clase de usuario.

---

## 🧭 Referencias

- `docs/system-overview.md#-user---gestión-de-usuarios-del-sistema`  
- `docs/site/modules/user/index.html` (guía interactiva)  
- Código: `app/components/user/*`, `app/hooks/useUser*`, `app/services/userApi.ts`, `app/mocks/user*Handlers.ts`, `app/pages/User*.tsx`.  

**Precisión estimada**: 95%+ (basado en componentes/ hooks/ mocks actuales).
