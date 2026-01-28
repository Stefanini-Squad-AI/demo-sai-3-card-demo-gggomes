# 💳 ACCOUNT - Accounts Module Overview

**Purpose**: Proveer acceso seguro a datos de cuentas y permitir ajustes controlados para representantes de servicio y administradores.

## Stack y composición
- React 18 + TypeScript + Vite
- Material UI 5 (Container, Paper, Grid, Card, TextField, Dialog, Chip, Switch)
- React Router DOM 6 para las páginas de vista y edición
- Hooks personalizados (`useAccountView`, `useAccountUpdate`) basados en `useMutation` y `apiClient`
- MSW (`app/mocks/accountHandlers.ts`) gestiona respuestas de prueba para `/account-view*` y `/accounts/*`

## Componentes principales
1. `AccountViewPage` / `AccountUpdatePage`: validan rol (`localStorage.userRole`) y dirigen la navegación.
2. `AccountViewScreen`: formulario de búsqueda, tarjetas informativas y toggle para datos sensibles.
3. `AccountUpdateScreen`: modo edición, validaciones inline (ZIP, Y/N, números), confirmación con dialog y teclas rápidas (F5 para guardar, F12 para reset).
4. Hooks `useAccountView` / `useAccountUpdate`: abstraen llamadas GET/PUT y exponen estados de carga/error.
5. `SystemHeader` y `LoadingSpinner`: componentes reutilizados en ambos screens.

## APIs documentados
| Método | Endpoint | Uso | Response | Request body |
| --- | --- | --- | --- | --- |
| GET | `/account-view?accountId={id}` | Consulta principal | `AccountViewResponse` | query string (11 dig) |
| GET | `/account-view/initialize` | Metadata inicial | `AccountViewResponse` | (none) |
| GET | `/accounts/{accountId}` | Carga para edición | `AccountUpdateData` | pathparam |
| PUT | `/accounts/{accountId}` | Persiste cambios | `AccountUpdateResponse` | `AccountUpdateSubmission`

## Data models relevantes
```typescript
interface AccountViewResponse {
  accountId?: number;
  accountStatus?: string;
  currentBalance?: number;
  creditLimit?: number;
  cashCreditLimit?: number;
  ficoScore?: number;
  customerSsn?: string;
  cardNumber?: string;
  inputValid: boolean;
}
```
```typescript
interface AccountUpdateData {
  accountId: number;
  activeStatus: string;
  currentBalance: number;
  zipCode: string;
  ssn: string;
  ficoScore: number;
  primaryCardIndicator: string;
  governmentIssuedId: string;
}
```

## Patrones y validaciones
- Account ID: 11 dígitos y no todo cero (`AccountViewScreen`).
- Active Status: valor `Y`/`N` con chip y switch para edición.
- ZIP code: regex `^\d{5}(-\d{4})?$` en `AccountUpdateScreen`.
- Validación numéricas: `isNaN` chequeos para límites.
- Modo edición: se habilita con un switch y se bloquea la edición hasta confirmar.
- Toggle `showSensitiveData`: enmascara SSN y tarjeta salvo que se active manualmente.

## Resultados esperados / objetivos de historia
- Atención al cliente: sprint de consulta en < 500ms y sin necesidad de múltiples páginas.
- Transformación de cuentas: guardados transaccionales con `hasChanges` + confirmación.
- Compliance: SSN y tarjeta enmascarados, solo visibles bajo permiso.

## Referencias adicionales
- Documentación completa: [`docs/modules/account/account-overview.md`](../../docs/modules/account/account-overview.md)
- Guía HTML interactiva: [`docs/site/modules/accounts/index.html`](../../docs/site/modules/accounts/index.html)

**Última actualización**: 2026-01-27
