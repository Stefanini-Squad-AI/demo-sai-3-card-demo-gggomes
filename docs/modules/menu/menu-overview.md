# 📋 MENU - Sistema de Menús

**Module ID**: MENU  
**Versión**: 1.0  
**Última actualización**: 2026-02-11  
**Propósito**: Orquestar la navegación principal del back-office y el menú administrativo, controlando el acceso a funciones según el rol y manteniendo la experiencia del Mainframe con atajos y validaciones ligeras.

---

## 📋 Visión general y contexto

El módulo **MENU** entrega dos pantallas (`MainMenuPage` y `AdminMenuPage`) que se nutren de datos locales (`app/data/menuData.ts`) y muestran las opciones compatibles con el rol a través del componente `MenuScreen`. Ambas rutas están protegidas por `ProtectedRoute` (que levanta `validateToken`, `useSecureSession` y redirige automáticamente si el rol no corresponde), por lo que la responsabilidad del módulo es garantizar que el usuario autenticado aterrice siempre en el menú adecuado, pueda seleccionar una opción y salir con los atajos conocidos (F3/Esc).

### Responsabilidades principales
- Cargar `getMainMenuData` o `getAdminMenuData` según el rol y exponer los `MenuOption`
- Validar estado de autenticación/rol antes de mostrar cualquier menú (`ProtectedRoute`, `useMenu`, `useAppSelector`)
- Presentar la interfaz `MenuScreen` con `SystemHeader` (program/transaction id, fecha/hora, botones Home/Logout), las tarjetas de opciones con chips numerados y la entrada manual de selección
- Encapsular la navegación (`useNavigate`) y la interacción del teclado en `useMenu` (selección, exit, home, logout)
- Mantener la experiencia de menú similar a la del mainframe: se llama `handleOptionSelect` al pulsar Enter con un dígito válido y `handleExit` cierra la sesión o reusa el mismo `logoutUser`

---

## 🏗️ Arquitectura y componentes clave

**Stack**: React 18 + TypeScript + Vite, MUI 5 (Container, Paper, List, Chip, Button, Alert, Divider), React Router DOM 6, Redux Toolkit (estado de auth), `SystemHeader` + `logoutUser`.

### Componentes principales
1. `MainMenuPage.tsx` – Carga `getMainMenuData`, verifica `isAuthenticated` y muestra `MenuScreen` compartiendo `menuData` y el hook `useMenu`.
2. `AdminMenuPage.tsx` – Igual que `MainMenuPage`, pero sólo permite usuarios `role==='admin'` (redirecciona al menú principal de lo contrario) y carga `getAdminMenuData` con opciones administradas.
3. `MenuScreen.tsx` – UI principal: lista de `MenuOption` con chips numerados, indicador `ArrowForwardIos`, input manual limitado a dos dígitos, alert de errores, estilos con `SystemHeader` y gradient, manejadores `handleKeyDown` para F3/Escape y `ListItemButton` deshabilitados cuando `option.disabled`/`loading`.
4. `useMenu.ts` – Hook que simula validación con `setTimeout(300)` al seleccionar una opción, navega a la ruta configurada (`option.path`), maneja acciones (`option.action`) y expone helpers `handleExit`, `handleHome`, `handleLogout`, `clearError`.
5. `menuData.ts` – Fuente de verdad para los dos menús; define `transactionId`, `programName`, `userRole` y cada `MenuOption` (id, label, description, path, `adminOnly`).
6. `types/menu.ts` – Interfaces `MenuData`/`MenuOption` utilizadas por los componentes y los datos.
7. `ProtectedRoute.tsx` – Garantiza token válido, sesión activa y rol correcto antes de montar las páginas de menú.
8. `SystemHeader.tsx` – Presenta la cabecera global con chips del transaction/program id, fecha/hora y botones Home/Logout que reusan `navigate('/menu/*')` y `logoutUser`.

### Flujo de navegación

```mermaid
flowchart TB
    ProtectedRoute --> MainMenuPage
    ProtectedRoute --> AdminMenuPage
    MainMenuPage --> MenuScreen
    AdminMenuPage --> MenuScreen
    MenuScreen --> useMenu
    useMenu -->|navigate(option.path)| Router[React Router]
    useMenu -->|dispatch(logoutUser)| AuthState
    MenuScreen --> SystemHeader
    SystemHeader -->|Home/Logout| useMenu
```

---

## 📊 Modelos de datos

```typescript
export interface MenuOption {
  id: string;
  label: string;
  description?: string;
  path?: string;
  action?: string;
  disabled?: boolean;
  requiredRole?: 'admin' | 'back-office' | 'both';
  adminOnly?: boolean;
}

export interface MenuData {
  title: string;
  subtitle?: string;
  transactionId: string;
  programName: string;
  userRole: 'admin' | 'back-office';
  options: MenuOption[];
}
```

El hook `useMenu` usa `MenuOption.path` para llamar a `navigate`, `option.action` para tipos especiales (aunque actualmente sólo se loggea) y `disabled`/`adminOnly` para bloquear accesos.

---

## 🔐 Reglas de negocio

1. El menú principal (`/menu/main`) está disponible para cualquier rol autenticado; el menú admin sólo se monta si `user.role === 'admin'` y redirige automáticamente a `/menu/main` si no es así.
2. Los menús se cargan desde `menuData.ts` y respetan la propiedad `adminOnly`, `disabled` y el orden de opciones heredado del mainframe.
3. La UI obliga a ingresar números de uno o dos dígitos que correspondan al índice (el `TextField` acepta sólo `/^\d{0,2}$/`).
4. Las opciones deshabilitadas o en carga (`loading`) no disparan `handleOptionSelect` y no generan `navigate`.
5. `handleKeyDown` intercepta F3 y Escape para llamar al callback `onExit`; si no se provee, `onExit` ejecuta `logoutUser` y envía al login.
6. El header muestra `transactionId`/`programName` (`CC00` + `COMEN01` para main, `CADM` + `COADM01` para admin), fecha y hora actual, y botones Home/Logout que reutilizan el mismo hook.
7. La navegación no hace llamadas HTTP reales; se simula un retardo de 300ms antes de ejecutar `navigate` para mantener el `loading` activo.

---

## 🎯 Plantillas de User Stories

1. **Acceso guiado:** Como operador back-office, quiero ver un menú con tarjetas numeradas con mis funciones permitidas para navegar rápidamente sin memorizar rutas.
2. **Seguridad administrativa:** Como administrador, quiero entrar al menú administrativo únicamente si estoy logueado como admin y que cada opción explícite que es de seguridad.
3. **Salida rápida:** Como usuario, quiero cerrar sesión con F3/Escape desde el menú para terminar la sesión sin moverme de la página.
4. **Ruta directa:** Como operador, quiero ingresar el número de opción y pulsar Enter para ir directo a `/accounts/view` sin usar el mouse.

---

## ✅ Criterios de aceptación repetibles

- **Autenticación:** Si el token no existe o ya expiró, `ProtectedRoute` redirige a `/login` antes de montar cualquier menú.
- **Validación de rol:** `AdminMenuPage` rehúye a `/menu/main` cuando `user.role !== 'admin'` y muestra `MenuScreen` sólo dentro de `ProtectedRoute` con `requiredRole="admin"`.
- **Teclas:** F3/Escape llaman a `handleExit`; el botón `F3 - Exit` en `MenuScreen` despliega un `Button` que ejecuta el mismo flujo de logout.
- **Selección:** El TextField acepta sólo hasta 2 dígitos y `handleSubmit` sólo invoca `onOptionSelect` cuando el índice existe y la opción no está `disabled`.
- **Navegación:** Al seleccionar una opción, se muestra el spinner (`loading`) durante ~300ms antes de realizar `navigate(option.path)`.
- **Errores:** Si `handleOptionSelect` lanza una excepción, se renderiza un `<Alert severity="error">` con el mensaje y se permite reintentar.

---

## ⚡ Presupuestos de rendimiento y readiness

- **Latency simulada:** `useMenu` rinde un `setTimeout` de 300ms para emular validación remota, así que las historias deben contemplar esa espera (p95 ~350ms).
- **Carga mental:** El número máximo de opciones es 10 en el menú principal, por lo que se mantiene un layout single-column con chips <code>ListItemButton</code> y `ListItemIcon` para facilitar la lectura.
- **Conectividad:** No existen APIs de menú, por lo que desplegar nuevas opciones sólo requiere editar `menuData.ts` (sin redeploy de backend).
- **Estado:** `loading` se mantiene true en `useMenu` mientras se procesa la opción; las pantallas se apoyan en los estados `loading`/`error` del hook para bloquear acciones.

---

## 🚨 Riesgos y mitigaciones

1. **Menús acoplados a código Front:** No hay backend para las opciones; cambiar `menuData.ts` es la única forma. Mitigación: centralizar opciones y exportar `MenuData` para tests/infra.
2. **Falta de auditoría de navegación:** No hay trazas de qué opción seleccionó cada usuario. Mitigación: agregar un middleware que registre `option.id` antes del `navigate`.
3. **Dependencia de teclas:** `handleKeyDown` sólo dispara con F3/Escape si `Box` tiene `tabIndex={-1}`; si se elimina, la UX se degrada. Mitigación: documentar la necesidad en el patrón.
4. **Admin hardcode:** Los IDs `programName` y `transactionId` vienen del mock `menuData.ts`; si migramos a backend, hay que mapearlos.

---

## 🧪 Pruebas y mocks

- No hay `MSW` ni llamadas HTTP; el único archivo necesario para probar este módulo es `app/data/menuData.ts` y sus hooks.
- Las pruebas manuales consisten en cambiar el rol (`set user.role` en `authSlice` o en `localStorage`) y verificar que la navegación respeta `adminOnly`.
- `useMenu` registra logs (`console.log('Option selected:', option.label)`), lo que facilita verificar que `handleOptionSelect` se disparó.
- `MenuScreen` está cubierto indirectamente por los mismos mocks de autenticación usados para otros módulos (Redux + login). No se requieren fixtures adicionales.

---

## 🧭 Referencias cruzadas

- Documentación extendida del módulo: [`docs/site/modules/menu/index.html`](../site/modules/menu/index.html)
- Blueprint rápido: [`modules/menu/menu-overview.md`](../../modules/menu/menu-overview.md)
- Código clave: `app/pages/MainMenuPage.tsx`, `app/pages/AdminMenuPage.tsx`, `app/components/menu/MenuScreen.tsx`, `app/hooks/useMenu.ts`, `app/data/menuData.ts`, `app/types/menu.ts`, `app/components/auth/ProtectedRoute.tsx`, `app/components/layout/SystemHeader.tsx`.
- Ruta desde el login: `app/App.tsx` redirige a `/menu/main` o `/menu/admin` en `SmartRedirect`.

---

## 📝 Próximos pasos recomendados

1. Externalizar `menuData.ts` a `/api/menu` para permitir configuraciones dinámicas sin redeploy.
2. Registrar telemetría de opción seleccionada y tiempo de respuesta (usando `useMenu` como único lugar para instrumentar la llamada).
3. Integrar i18n en los textos dentro de `MenuScreen` (chips, botones, placeholders de `TextField`).
4. Agregar pruebas end-to-end que validen los flujos de F3/Escape y la navegación numérica.

---

**Actualización del sistema**: 2026-02-11 · Precisión estimada: 95%+ sobre el código actual del módulo MENU.
