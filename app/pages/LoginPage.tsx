import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  InputAdornment,
  IconButton,
  Stack,
  Divider,
  useTheme,
  alpha,
  Tooltip,
} from '@mui/material';
import {
  Person,
  Lock,
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  CreditCard,
  MenuBook, // ✅ NEW: Icon for documentation
} from '@mui/icons-material';
import { SystemHeader } from '~/components/layout/SystemHeader';
import { useAppDispatch, useAppSelector } from '~/store/hooks';
import { 
  loginUser, 
  selectAuthLoading, 
  selectAuthError, 
  clearError,
  selectIsAuthenticated,
  selectCurrentUser
} from '~/features/auth/authSlice';
import type { LoginCredentials } from '~/types';

const LOGIN_COPY = {
  systemHeaderTitle: 'CardDemo - Demo Application',
  systemHeaderSubtitle: 'Mainframe Modernization',
  heroTitle: 'NATIONAL RESERVE NOTE',
  heroSubtitle: 'REPUBLIC OF KICSLAND',
  heroNote: `+========================================+
|%%%%%%%  NATIONAL RESERVE NOTE  %%%%%%%|
|%(1)  REPUBLIC OF KICSLAND (1)%|
|%$$              ___       ********  $$%|
|%$    {x}       (o o)                 $%|
|%$     ******  (  V  )      ONE REAL     $%|
|%(1)          ---m-m---             (1)%|
|%%~~~~~~~~~~~ ONE REAL ~~~~~~~~~~~~~~~%%|
+========================================+`,
  intro: 'Enter your credentials and press ENTER to continue.',
  fieldLabels: {
    userId: 'User ID',
    password: 'Password',
  },
  helperMaxChars: 'MAX 8 characters',
  button: {
    default: 'Sign in (ENTER)',
    loading: 'Signing in...',
  },
  validation: {
    userIdRequired: 'Please enter your user ID.',
    userIdTooLong: 'User ID must be 8 characters or fewer.',
    passwordRequired: 'Please enter your password.',
    passwordTooLong: 'Password must be 8 characters or fewer.',
    fallback: 'Please correct the errors above.',
  },
  errorMessages: {
    invalidCredentials: 'Invalid credentials. Please try again.',
    userNotFound: 'User not found. Check your ID.',
    inputCheck: 'Please review your user ID and password.',
    network: 'A network error occurred. Check your connection.',
    fallback: 'An error occurred during authentication. Please try again.',
  },
  docTooltip: 'Open documentation',
  sampleLabel: 'Sample credentials:',
  sampleAdmin: 'Admin: ADMIN001 / PASSWORD',
  sampleBackOffice: 'Back-office user: USER001 / PASSWORD',
  shortcuts: 'ENTER = Sign in • F3 = Exit',
  redirectTitle: 'Redirecting...',
  redirectBody: 'You are already authenticated. Redirecting to the main menu.',
  exitConfirmation: 'Are you sure you want to exit the system?',
} as const;

export default function LoginPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  
  const isLoading = useAppSelector(selectAuthLoading);
  const authError = useAppSelector(selectAuthError);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectCurrentUser);

  const [formData, setFormData] = useState<LoginCredentials>({
    userId: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  const hasRedirected = useRef(false);

  // ✅ NEW: Function to open documentation
  const handleOpenDocs = useCallback(() => {
    // Open documentation in a new tab
    const docsUrl = `${window.location.origin}${import.meta.env.BASE_URL || '/'}docs/site/index.html`;
    window.open(docsUrl, '_blank', 'noopener,noreferrer');
  }, []);

  // ✅ FIX: Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user && !hasRedirected.current) {
      console.log('🔄 User already authenticated, redirecting...', { role: user.role });
      
      hasRedirected.current = true;
      
      // Determine destination from location.state or fallback default
      const from = location.state?.from?.pathname;
      
      // Redirect based on role
      const targetPath = from && from !== '/login' 
        ? from 
        : user.role === 'admin' 
          ? '/menu/admin' 
          : '/menu/main';
      
      console.log('🎯 Redirecting to:', targetPath);
      navigate(targetPath, { replace: true });
    }
  }, [isAuthenticated, user, navigate, location.state]);

  // Reset the flag when the user signs out
  useEffect(() => {
    if (!isAuthenticated) {
      hasRedirected.current = false;
    }
  }, [isAuthenticated]);

  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};

    if (!formData.userId.trim()) {
      errors.userId = LOGIN_COPY.validation.userIdRequired;
    } else if (formData.userId.length > 8) {
      errors.userId = LOGIN_COPY.validation.userIdTooLong;
    }

    if (!formData.password.trim()) {
      errors.password = LOGIN_COPY.validation.passwordRequired;
    } else if (formData.password.length > 8) {
      errors.password = LOGIN_COPY.validation.passwordTooLong;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const handleInputChange = useCallback((field: keyof LoginCredentials) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    
    if (value.length <= 8) {
      setFormData(prev => ({ ...prev, [field]: value.toUpperCase() }));
      
      if (fieldErrors[field]) {
        setFieldErrors(prev => ({ ...prev, [field]: '' }));
      }
      
      if (authError) {
        dispatch(clearError());
      }
    }
  }, [fieldErrors, authError, dispatch]);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      console.log('🔐 Attempting login with:', { userId: formData.userId });
      const result = await dispatch(loginUser(formData)).unwrap();
      console.log('✅ Login successful, result:', result);
      
    } catch (error) {
      console.error('❌ Login failed:', error);
    }
  }, [formData, validateForm, dispatch]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'F3' || event.key === 'Escape') {
      event.preventDefault();
      if (window.confirm(LOGIN_COPY.exitConfirmation)) {
        window.close();
      }
    }
  }, []);

  const handleAlertClose = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const getErrorMessage = (error: string) => {
    const errorMappings: Record<string, string> = {
      'Invalid credentials': LOGIN_COPY.errorMessages.invalidCredentials,
      'User not found': LOGIN_COPY.errorMessages.userNotFound,
      'Please check your input': LOGIN_COPY.errorMessages.inputCheck,
      'Network error occurred': LOGIN_COPY.errorMessages.network,
    };

    return (
      errorMappings[error] ||
      LOGIN_COPY.errorMessages.fallback
    );
  };

  // ✅ FIX: Do not render the form if already authenticated
    if (isAuthenticated && user) {
      return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" gutterBottom>
                {LOGIN_COPY.redirectTitle}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {LOGIN_COPY.redirectBody}
              </Typography>
            </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box onKeyDown={handleKeyDown} tabIndex={-1}>
        {/* ✅ UPDATED: SystemHeader with documentation button */}
        <Box sx={{ position: 'relative' }}>
            <SystemHeader
              transactionId="CC00"
              programName="COSGN00C"
              title={LOGIN_COPY.systemHeaderTitle}
              subtitle={LOGIN_COPY.systemHeaderSubtitle}
              showNavigation={false}
            />
          
          {/* ✅ NEW: Discreet documentation button in the header */}
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 10,
            }}
          >
              <Tooltip title={LOGIN_COPY.docTooltip} arrow>
              <IconButton
                onClick={handleOpenDocs}
                size="small"
                sx={{
                  color: 'text.secondary',
                  backgroundColor: alpha(theme.palette.background.paper, 0.8),
                  backdropFilter: 'blur(4px)',
                  border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    color: 'primary.main',
                    borderColor: 'primary.main',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                <MenuBook fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Paper
          elevation={3}
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)}, ${alpha(theme.palette.background.default, 0.1)})`,
          }}
        >
            <Box
              sx={{
                p: 4,
                textAlign: 'center',
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                color: 'white',
              }}
            >
              <CreditCard sx={{ fontSize: 48, mb: 2 }} />
              <Typography variant="h4" fontWeight={600} gutterBottom>
                {LOGIN_COPY.heroTitle}
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                {LOGIN_COPY.heroSubtitle}
              </Typography>

            {/* ✅ PRIMARY FIX: ASCII note with preserved spacing */}
            <Box
              sx={{
                mt: 2,
                p: 2,
                border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: 2,
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                lineHeight: 1.2,
                whiteSpace: 'pre',
                textAlign: 'center',
                overflow: 'auto',
                backgroundColor: 'rgba(0,0,0,0.1)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
{LOGIN_COPY.heroNote}
            </Box>
          </Box>

          {/* Rest of the component remains unchanged... */}
          <Box sx={{ p: 4 }}>
              <Typography
                variant="h6"
                color="primary.main"
                textAlign="center"
                gutterBottom
                sx={{ mb: 3 }}
              >
                {LOGIN_COPY.intro}
              </Typography>

            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{ maxWidth: 400, mx: 'auto' }}
            >
              <Stack spacing={3}>
                  <TextField
                  label={LOGIN_COPY.fieldLabels.userId}
                  value={formData.userId}
                  onChange={handleInputChange('userId')}
                  error={!!fieldErrors.userId}
                  helperText={fieldErrors.userId || LOGIN_COPY.helperMaxChars}
                  disabled={isLoading}
                  autoFocus
                  inputProps={{
                    maxLength: 8,
                    style: { textTransform: 'uppercase' },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person color="primary" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                />

                  <TextField
                  label={LOGIN_COPY.fieldLabels.password}
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  error={!!fieldErrors.password}
                  helperText={fieldErrors.password || LOGIN_COPY.helperMaxChars}
                  disabled={isLoading}
                  autoComplete="current-password"
                  inputProps={{
                    maxLength: 8,
                    style: { textTransform: 'uppercase' },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="primary" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          disabled={isLoading}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                />

                {(authError || Object.keys(fieldErrors).length > 0) && (
                  <>
                      {authError ? (
                      <Alert
                        severity="error"
                        onClose={handleAlertClose}
                        sx={{ borderRadius: 2 }}
                      >
                        {getErrorMessage(authError)}
                      </Alert>
                    ) : (
                      <Alert
                        severity="error"
                        sx={{ borderRadius: 2 }}
                      >
                        {LOGIN_COPY.validation.fallback}
                      </Alert>
                    )}
                  </>
                )}

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={isLoading}
                  startIcon={<LoginIcon />}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    fontWeight: 600,
                    fontSize: '1rem',
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    color: theme.palette.primary.contrastText,
                    border: 'none',
                    '&:hover': {
                      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.9)}, ${alpha(theme.palette.secondary.main, 0.9)})`,
                      boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}`,
                    },
                    '&:active': {
                      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.8)}, ${alpha(theme.palette.secondary.main, 0.8)})`,
                    },
                    '&:disabled': {
                      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.5)}, ${alpha(theme.palette.secondary.main, 0.5)})`,
                      color: alpha(theme.palette.primary.contrastText, 0.7),
                    },
                  }}
                >
                  {isLoading ? LOGIN_COPY.button.loading : LOGIN_COPY.button.default}
                </Button>
              </Stack>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {LOGIN_COPY.sampleLabel}
              </Typography>
              <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
                  <Typography variant="caption" sx={{ 
                    bgcolor: 'warning.main', 
                    color: 'warning.contrastText',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                  }}>
                    {LOGIN_COPY.sampleAdmin}
                  </Typography>
                  <Typography variant="caption" sx={{ 
                    bgcolor: 'success.main', 
                    color: 'success.contrastText',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                  }}>
                    {LOGIN_COPY.sampleBackOffice}
                  </Typography>
              </Stack>
            </Box>
          </Box>

          <Box
            sx={{
              p: 2,
              bgcolor: alpha(theme.palette.grey[100], 0.5),
              borderTop: `1px solid ${theme.palette.divider}`,
              textAlign: 'center',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {LOGIN_COPY.shortcuts}
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
