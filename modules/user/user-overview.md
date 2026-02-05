# 👤 USER - User Module Overview

**Module ID**: USER  
**Purpose**: Gestionar credenciales del back-office y administradores (lista, alta, edición, baja) preservando atajos F3/F4/F5/F12 del mainframe original.

## Stack y composición
- React 18 + TypeScript + Vite 5
- Material-UI 5 (Table, Select, Grid, Dialog, Alert)
- Hooks personalizados (`useUserList`, `useUserAdd`, `useUserUpdate`, `useUserDelete`) basados en `useApi`/`useMutation`
- Servicio `UserApiAdapter` para adaptar al backend real y `apiClient` con base `/api`
- MSW (`app/mocks/user*Handlers.ts`) simula lista, validaciones y CRUD

## Componentes clave
1. `UserListScreen.tsx`: tabla paginada con select `U/D`, chips de tipo y atajos de teclado para paginar y procesar selecciones.
2. `UserAddScreen.tsx`: formulario con validaciones inline, helper text `(8 Char)` y acciones `ENTER`/`F4`/`F3`/`F12`.
3. `UserUpdateScreen.tsx`: busca por ID (`fetchUser`), aplica `hasChanges` y habilita `F5`/`F3` para guardar.
4. `UserDeleteScreen.tsx`: muestra datos en solo lectura, solicita confirmación (Dialog) y evita eliminar al último admin.
5. `useUserList` / `useUser*` hooks: centralizan lógica de validación, navegación (`useNavigate('/admin/users/..')`), estado `loading/error` y `VITE_USE_MOCKS`.

## APIs documentados
- `/api/users/list`, `/api/users/previous-page`, `/api/users/next-page`: paginación del backend real
- `/api/users/process-selection`: determina si se navega a update o delete
- `/api/users/{userId}` (GET/PUT/DELETE): obtener, actualizar y borrar usuario
- `/api/users` (POST): crear usuario nuevo
- Rutas MSW: `/api/users/security`, `/api/users/validate-action`, `/api/users/add`, `/api/users/security/:userId`

## Modelos/claves
- `UserSecurityData` con `userId`, `firstName`, `lastName`, `userType` y fechas
- `UserAddRequest` / `UserAddResponse`
- `UserUpdateData`, `UserUpdateRequest`, `UserDeleteData`
- `UserListResponse` exhibe `pagination` (page, limit, hasNext/hasPrev)

## Patrones y validaciones
- `userId` y `password` en mayúsculas, max 8 caracteres
- `userType` solo `A` o `U`, visualizado con chips con íconos `AdminPanelSettings` y `Person`
- `useUserUpdate` exige cambios antes de PUT y muestra mensajes `Please modify to update ...`
- `UserListScreen` procesa solo la primera selección y limpia el `Select` tras `handleUserAction`
- `UserDeleteScreen` solicita confirmación y MSW evita eliminar al último admin

## Resultados esperados
- Lista reactiva con `loading` + `error`, `hasNext/hasPrev`, búsqueda por prefijo y `Select` para `U/D`
- Crear usuarios en pantalla única con validaciones y mensajes de éxito
- Editar solo si `hasChanges()` y mostrar `Alert` con el mensaje devuelto por `UserApiAdapter`
- Eliminar usuarios con confirmación y navegación posterior a `/admin/users/list`

## Referencias
- `docs/modules/user/user-overview.md` (guía extendida)
- `docs/site/modules/user/index.html` (guía interactiva)
- `app/components/user/*`, `app/hooks/useUser*`, `app/services/userApi.ts`, `app/mocks/user*Handlers.ts`

**Última actualización**: 2026-02-05
