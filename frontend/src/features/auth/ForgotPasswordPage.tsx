import {
  ArrowLeft, BookOpen, Check, CheckCircle2, Circle, Clock3, Mail,
  RefreshCw, TrendingUp, TriangleAlert, UsersRound, type LucideIcon,
} from 'lucide-react';
import {
  useEffect, useMemo, useRef, useState,
  type FormEvent, type ReactNode, type RefObject,
} from 'react';
import { Link } from 'react-router-dom';

import { ApiError } from '@/lib/api/http-client';
import {
  confirmPasswordReset, requestPasswordReset, verifyPasswordReset,
} from './auth-api';
import { PasswordField } from './PasswordField';
import { PasswordResetCodeInput } from './PasswordResetCodeInput';
import { PasswordResetStepper, type PasswordResetStep } from './PasswordResetStepper';
import {
  evaluatePasswordPolicy, PASSWORD_MAXIMUM_CODE_POINTS, PASSWORD_MINIMUM_CODE_POINTS,
} from './password-policy';
import { calculatePasswordStrength, PASSWORD_STRENGTH_LABELS } from './password-strength';
import './auth-page.css';

const CODE_TTL_SECONDS = 300;
const GENERIC_REQUEST_MESSAGE = 'Si existe una cuenta asociada a este correo, recibirás un código de seguridad.';

interface RecoveryBenefit { icon: LucideIcon; firstLine: string; secondLine: string }
const RECOVERY_BENEFITS: readonly RecoveryBenefit[] = [
  { icon: BookOpen, firstLine: 'Aprende', secondLine: 'sin límites' },
  { icon: UsersRound, firstLine: 'Únete a una', secondLine: 'comunidad real' },
  { icon: TrendingUp, firstLine: 'Construye', secondLine: 'tu futuro' },
];

type FlowState = PasswordResetStep | 'success';
type TerminalCodeFailure = 'expired' | 'attempts-exceeded' | null;

interface RequestRateLimit {
  readonly deadline: number;
  readonly remainingSeconds: number;
}

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<FlowState>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(CODE_TTL_SECONDS);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [timerAnnouncement, setTimerAnnouncement] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [focusVersion, setFocusVersion] = useState(0);
  const [authorizationExpired, setAuthorizationExpired] = useState(false);
  const [terminalCodeFailure, setTerminalCodeFailure] = useState<TerminalCodeFailure>(null);
  const [requestRateLimit, setRequestRateLimit] = useState<RequestRateLimit | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const mountedRef = useRef(true);
  const controllersRef = useRef(new Set<AbortController>());
  const requestInFlightRef = useRef(false);
  const verifyInFlightRef = useRef(false);
  const confirmInFlightRef = useRef(false);
  const requestRateLimited = requestRateLimit !== null;
  const requestRateLimitDeadline = requestRateLimit?.deadline ?? null;

  useEffect(() => {
    const controllers = controllersRef.current;
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      for (const controller of controllers) controller.abort();
      controllers.clear();
    };
  }, []);

  useEffect(() => {
    if (step === 3 || step === 'success') headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (requestRateLimited) headingRef.current?.focus();
  }, [requestRateLimited]);

  useEffect(() => {
    if (deadline === null || step !== 2) return undefined;
    function updateTimer() {
      const seconds = Math.max(0, Math.ceil(((deadline as number) - Date.now()) / 1_000));
      setRemainingSeconds(seconds);
      if (seconds === 60) setTimerAnnouncement('El código está a punto de caducar.');
      if (seconds === 0) {
        setDeadline(null);
        setTimerAnnouncement(
          'El contador ha llegado a cero. Puedes intentar verificar el código.',
        );
      }
    }
    updateTimer();
    const interval = window.setInterval(updateTimer, 1_000);
    return () => window.clearInterval(interval);
  }, [deadline, step]);

  useEffect(() => {
    if (requestRateLimitDeadline === null) return undefined;
    const retryDeadline = requestRateLimitDeadline;

    function updateRetryTimer() {
      const seconds = Math.max(0, Math.ceil((retryDeadline - Date.now()) / 1_000));
      if (seconds === 0) {
        setRequestRateLimit(null);
        setError('');
        setTimerAnnouncement('Ya puedes solicitar un nuevo código.');
        return;
      }
      setRequestRateLimit((current) => current === null
        ? null
        : { ...current, remainingSeconds: seconds });
    }

    updateRetryTimer();
    const interval = window.setInterval(updateRetryTimer, 1_000);
    return () => window.clearInterval(interval);
  }, [requestRateLimitDeadline]);

  const passwordPolicy = useMemo(() => evaluatePasswordPolicy(newPassword), [newPassword]);
  const passwordsMatch = confirmation.length > 0 && newPassword === confirmation;
  const passwordStrength = useMemo(() => calculatePasswordStrength(newPassword), [newPassword]);
  const passwordCanSubmit = passwordPolicy.isValid && passwordsMatch;

  function beginCodeStep() {
    setCode('');
    setResetToken(null);
    setDeadline(Date.now() + CODE_TTL_SECONDS * 1_000);
    setRemainingSeconds(CODE_TTL_SECONDS);
    setTimerAnnouncement('');
    setTerminalCodeFailure(null);
    setError('');
    setNotice(GENERIC_REQUEST_MESSAGE);
    setStep(2);
    setFocusVersion((value) => value + 1);
  }

  function clearSensitiveState() {
    setCode('');
    setResetToken(null);
    setNewPassword('');
    setConfirmation('');
    setDeadline(null);
    setRemainingSeconds(CODE_TTL_SECONDS);
    setAuthorizationExpired(false);
    setTerminalCodeFailure(null);
  }

  function changeEmail() {
    clearSensitiveState();
    setStep(1);
    setNotice('');
    setError('');
    setTimerAnnouncement('');
  }

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestInFlightRef.current) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      setError('Introduce un correo electrónico válido.');
      return;
    }
    requestInFlightRef.current = true;
    setRequesting(true);
    setError('');
    setTimerAnnouncement('');
    const controller = createController(controllersRef.current);
    try {
      await requestPasswordReset({ email: normalizedEmail }, controller.signal);
      if (!mountedRef.current) return;
      setEmail(normalizedEmail);
      beginCodeStep();
    } catch (requestError) {
      if (!mountedRef.current || isAbortError(requestError)) return;
      if (requestError instanceof ApiError
        && requestError.status === 429
        && requestError.retryAfterSeconds !== null
        && requestError.retryAfterSeconds > 0) {
        setEmail(normalizedEmail);
        setRequestRateLimit({
          deadline: Date.now() + requestError.retryAfterSeconds * 1_000,
          remainingSeconds: requestError.retryAfterSeconds,
        });
        setError('');
      } else {
        setError(messageForRequestError(requestError));
      }
    } finally {
      controllersRef.current.delete(controller);
      requestInFlightRef.current = false;
      if (mountedRef.current) setRequesting(false);
    }
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (verifyInFlightRef.current || code.length !== 6) return;
    verifyInFlightRef.current = true;
    setVerifying(true);
    setError('');
    const controller = createController(controllersRef.current);
    try {
      const response = await verifyPasswordReset({ email, code }, controller.signal);
      if (!mountedRef.current) return;
      setResetToken(response.resetToken);
      setCode('');
      setDeadline(null);
      setNotice('');
      setStep(3);
    } catch (verifyError) {
      if (!mountedRef.current || isAbortError(verifyError)) return;
      if (verifyError instanceof ApiError && [
        'RESET_CODE_EXPIRED',
        'RESET_CODE_ATTEMPTS_EXCEEDED',
      ].includes(verifyError.code ?? '')) {
        setTerminalCodeFailure(verifyError.code === 'RESET_CODE_EXPIRED'
          ? 'expired'
          : 'attempts-exceeded');
        setDeadline(null);
        setRemainingSeconds(0);
        setTimerAnnouncement(verifyError.code === 'RESET_CODE_EXPIRED'
          ? 'El código ha caducado. Solicita uno nuevo.'
          : 'Has alcanzado el máximo de intentos. Solicita un nuevo código.');
      }
      setError(messageForVerifyError(verifyError));
    } finally {
      controllersRef.current.delete(controller);
      verifyInFlightRef.current = false;
      if (mountedRef.current) setVerifying(false);
    }
  }

  async function resendCode() {
    if (requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    setRequesting(true);
    setError('');
    const controller = createController(controllersRef.current);
    try {
      await requestPasswordReset({ email }, controller.signal);
      if (mountedRef.current) beginCodeStep();
    } catch (requestError) {
      if (mountedRef.current && !isAbortError(requestError)) setError(messageForRequestError(requestError));
    } finally {
      controllersRef.current.delete(controller);
      requestInFlightRef.current = false;
      if (mountedRef.current) setRequesting(false);
    }
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirmInFlightRef.current || resetToken === null || !passwordCanSubmit) return;
    confirmInFlightRef.current = true;
    setConfirming(true);
    setError('');
    const controller = createController(controllersRef.current);
    try {
      await confirmPasswordReset({ resetToken, newPassword: passwordPolicy.normalizedPassword }, controller.signal);
      if (!mountedRef.current) return;
      clearSensitiveState();
      setStep('success');
    } catch (confirmError) {
      if (!mountedRef.current || isAbortError(confirmError)) return;
      if (confirmError instanceof ApiError
        && ['RESET_TOKEN_EXPIRED', 'INVALID_RESET_TOKEN'].includes(confirmError.code ?? '')) {
        setAuthorizationExpired(true);
        setResetToken(null);
        setNewPassword('');
        setConfirmation('');
      }
      setError(messageForConfirmError(confirmError));
    } finally {
      controllersRef.current.delete(controller);
      confirmInFlightRef.current = false;
      if (mountedRef.current) setConfirming(false);
    }
  }

  const activeStep: PasswordResetStep = step === 'success' ? 3 : step;
  return (
    <main className="auth-page password-reset-page">
      <div className="password-reset-layout">
        <div className="password-reset-shell" data-rate-limited={requestRateLimited || undefined}>
          {requestRateLimited && <PasswordResetBrand />}
          <PasswordResetStepper activeStep={activeStep} complete={step === 'success'}
            emailLabel={requestRateLimited ? 'Email' : undefined} />
          <section className="password-reset-content" aria-labelledby="password-reset-title">
            {step === 1 && (requestRateLimit === null
              ? <EmailStep headingRef={headingRef} email={email} error={error} requesting={requesting}
                onEmailChange={(value) => { setEmail(value); setError(''); }} onSubmit={submitEmail} />
              : <RequestRateLimitStep headingRef={headingRef}
                remainingSeconds={requestRateLimit.remainingSeconds} />)}
            {step === 2 && <CodeStep email={email} code={code} error={error} notice={notice}
              remainingSeconds={remainingSeconds} requesting={requesting} verifying={verifying}
              verificationUnavailable={terminalCodeFailure !== null} focusVersion={focusVersion}
              onCodeChange={(value) => { setCode(value); setError(''); }}
              onSubmit={submitCode} onResend={() => { void resendCode(); }} onChangeEmail={changeEmail} />}
            {step === 3 && <PasswordStep headingRef={headingRef} newPassword={newPassword}
              confirmation={confirmation} error={error} confirming={confirming}
              authorizationExpired={authorizationExpired} passwordStrength={passwordStrength}
              hasMinimumLength={passwordPolicy.hasMinimumLength}
              hasMaximumLength={passwordPolicy.hasMaximumLength && passwordPolicy.hasValidEncoding}
              passwordsMatch={passwordsMatch} canSubmit={passwordCanSubmit} email={email}
              onPasswordChange={(value) => { setNewPassword(value); setError(''); }}
              onConfirmationChange={(value) => { setConfirmation(value); setError(''); }}
              onSubmit={submitPassword} onRestart={changeEmail} />}
            {step === 'success' && <SuccessStep headingRef={headingRef} />}
            <p className="sr-only" aria-live="polite">{timerAnnouncement}</p>
          </section>
          {!requestRateLimited && <RecoveryBenefits />}
        </div>
      </div>
    </main>
  );
}

function PasswordResetBrand() {
  return <header className="password-reset-brand">
    <span className="password-reset-brand__logo" aria-label="CodeGym">Code<span>Gym</span></span>
    <p>Practica. Aprende. Mejora.</p>
  </header>;
}

function RequestRateLimitStep({ headingRef, remainingSeconds }: {
  headingRef: RefObject<HTMLHeadingElement>;
  remainingSeconds: number;
}) {
  return <>
    <ResetHeader headingRef={headingRef} title="Recupera tu acceso"
      description="Introduce el correo asociado a tu cuenta. Te enviaremos un código de seguridad para restablecer tu contraseña." />
    <div className="password-reset-rate-limit" role="alert">
      <span className="password-reset-rate-limit__icon" aria-hidden="true">
        <TriangleAlert className="size-5" />
      </span>
      <div>
        <h2>Has alcanzado el límite de solicitudes</h2>
        <p>Por favor, espera antes de volver a intentar enviar el código.</p>
      </div>
    </div>
    <button type="button" className="password-reset-retry" disabled aria-disabled="true">
      <Clock3 className="size-5" aria-hidden="true" />
      <span aria-hidden="true">Reintentar en {formatTimer(remainingSeconds)}</span>
      <span className="sr-only">La solicitud de un nuevo código está temporalmente bloqueada.</span>
    </button>
    <p className="password-reset-rate-limit__help">
      Te avisaremos cuando puedas solicitar un nuevo código.
    </p>
    <Link to="/login" className="password-reset-back-link">
      Volver a iniciar sesión <span aria-hidden="true">→</span>
    </Link>
  </>;
}

interface EmailStepProps {
  headingRef: RefObject<HTMLHeadingElement>; email: string; error: string; requesting: boolean;
  onEmailChange: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}
function EmailStep({ headingRef, email, error, requesting, onEmailChange, onSubmit }: EmailStepProps) {
  return <>
    <ResetHeader headingRef={headingRef} title="Restablecer contraseña"
      description="Introduce el correo asociado a tu cuenta. Te enviaremos un código de seguridad para restablecer tu contraseña." />
    <form className="password-reset-form" aria-describedby="password-reset-description" noValidate onSubmit={onSubmit}>
      <div><label htmlFor="password-reset-email" className="auth-field-label">Correo electrónico</label>
        <div className="auth-input-shell"><Mail className="auth-input-icon" aria-hidden="true" />
          <input id="password-reset-email" name="email" type="email" autoComplete="email" required
            disabled={requesting} value={email} aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? 'password-reset-error' : undefined} className="auth-input"
            placeholder="carlos@correo.com" onChange={(event) => onEmailChange(event.target.value)} /></div>
        <ResetError error={error} /></div>
      <button type="submit" className="auth-primary-button" disabled={requesting}>{requesting ? 'Enviando…' : 'Enviar código'}</button>
    </form>
    <Link to="/login" className="password-reset-back-link">Volver a iniciar sesión <span aria-hidden="true">→</span></Link>
  </>;
}

interface CodeStepProps {
  email: string; code: string; error: string; notice: string; remainingSeconds: number;
  requesting: boolean; verifying: boolean; verificationUnavailable: boolean; focusVersion: number;
  onCodeChange: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onResend: () => void; onChangeEmail: () => void;
}
function CodeStep(props: CodeStepProps) {
  const expired = props.remainingSeconds === 0;
  return <>
    <ResetHeader title="Comprueba tu correo" description={`Hemos enviado un código de seguridad de 6 dígitos a ${maskEmail(props.email)}.`} />
    {props.notice && <p className="password-reset-notice" role="status">{props.notice}</p>}
    <form className="password-reset-form" onSubmit={props.onSubmit}>
      <PasswordResetCodeInput value={props.code}
        disabled={props.verifying || props.requesting || props.verificationUnavailable}
        invalid={Boolean(props.error)} describedBy={props.error ? 'password-reset-error' : undefined}
        focusVersion={props.focusVersion} onChange={props.onCodeChange} />
      <div className="password-reset-timer" aria-hidden="true"><Clock3 className="size-4" /><span>{formatTimer(props.remainingSeconds)}</span></div>
      <ResetError error={props.error} />
      <button type="submit" className="auth-primary-button"
        disabled={props.verifying || props.requesting || props.verificationUnavailable || props.code.length !== 6}>
        {props.verifying ? 'Verificando…' : 'Verificar código'}
      </button>
    </form>
    <div className="password-reset-actions">
      <button type="button" disabled={props.requesting || props.verifying} onClick={props.onResend}>
        <RefreshCw className="size-4" aria-hidden="true" />{props.requesting ? 'Enviando…' : expired ? 'Enviar un nuevo código' : 'Reenviar código'}
      </button>
      <button type="button" disabled={props.requesting || props.verifying} onClick={props.onChangeEmail}>
        <ArrowLeft className="size-4" aria-hidden="true" />Cambiar correo
      </button>
    </div>
  </>;
}

interface PasswordStepProps {
  headingRef: RefObject<HTMLHeadingElement>; newPassword: string; confirmation: string; error: string;
  confirming: boolean; authorizationExpired: boolean; passwordStrength: number; hasMinimumLength: boolean;
  hasMaximumLength: boolean; passwordsMatch: boolean; canSubmit: boolean; email: string;
  onPasswordChange: (value: string) => void; onConfirmationChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void; onRestart: () => void;
}
function PasswordStep(props: PasswordStepProps) {
  const mixedCase = /[a-z]/.test(props.newPassword) && /[A-Z]/.test(props.newPassword);
  const number = /\d/.test(props.newPassword);
  const symbol = /[^A-Za-z0-9]/.test(props.newPassword);
  const identity = props.email.split('@', 1)[0]?.toLowerCase() ?? '';
  const avoidsPersonal = props.newPassword.length > 0
    && (identity.length < 3 || !props.newPassword.toLowerCase().includes(identity));
  return <>
    <ResetHeader headingRef={props.headingRef} title="Crea una nueva contraseña"
      description="Elige una contraseña nueva para proteger tu cuenta." />
    <form className="password-reset-form" noValidate onSubmit={props.onSubmit}>
      <PasswordField id="password-reset-new-password" name="newPassword" label="Nueva contraseña"
        autoComplete="new-password" value={props.newPassword} disabled={props.confirming || props.authorizationExpired}
        invalid={props.newPassword.length > 0 && (!props.hasMinimumLength || !props.hasMaximumLength)}
        describedBy="password-reset-strength password-reset-guidance"
        onChange={(event) => props.onPasswordChange(event.target.value)} />
      <PasswordField id="password-reset-confirmation" name="confirmPassword" label="Confirmar nueva contraseña"
        autoComplete="new-password" value={props.confirmation} disabled={props.confirming || props.authorizationExpired}
        invalid={props.confirmation.length > 0 && !props.passwordsMatch} describedBy="password-reset-guidance"
        onChange={(event) => props.onConfirmationChange(event.target.value)} />
      <PasswordStrength value={props.newPassword} strength={props.passwordStrength} />
      <div id="password-reset-guidance" className="password-reset-guidance">
        <GuidanceList title="Requisitos">
          <GuidanceItem met={props.hasMinimumLength}>Al menos {PASSWORD_MINIMUM_CODE_POINTS} caracteres</GuidanceItem>
          <GuidanceItem met={props.hasMaximumLength}>Máximo {PASSWORD_MAXIMUM_CODE_POINTS} caracteres</GuidanceItem>
          <GuidanceItem met={props.passwordsMatch}>Las contraseñas coinciden</GuidanceItem>
        </GuidanceList>
        <GuidanceList title="Recomendado">
          <GuidanceItem met={mixedCase}>Combina mayúsculas y minúsculas</GuidanceItem>
          <GuidanceItem met={number}>Incluye números</GuidanceItem>
          <GuidanceItem met={symbol}>Incluye símbolos</GuidanceItem>
          <GuidanceItem met={avoidsPersonal}>Evita información personal</GuidanceItem>
        </GuidanceList>
      </div>
      <ResetError error={props.error} />
      {props.authorizationExpired
        ? <button type="button" className="auth-primary-button" onClick={props.onRestart}>Volver a empezar</button>
        : <button type="submit" className="auth-primary-button" disabled={props.confirming || !props.canSubmit}>
          {props.confirming ? 'Restableciendo…' : 'Restablecer contraseña'}</button>}
    </form>
  </>;
}

function SuccessStep({ headingRef }: { headingRef: RefObject<HTMLHeadingElement> }) {
  return <div className="password-reset-success" role="status">
    <span className="password-reset-success__icon" aria-hidden="true"><Check className="size-8" /></span>
    <ResetHeader headingRef={headingRef} title="Contraseña actualizada"
      description="Tu contraseña se ha restablecido correctamente. Por seguridad, las sesiones anteriores de tu cuenta se han cerrado." />
    <Link to="/login" className="auth-primary-button">Iniciar sesión</Link>
  </div>;
}

function ResetHeader({ headingRef, title, description }: {
  headingRef?: RefObject<HTMLHeadingElement>; title: string; description: string;
}) {
  return <header className="password-reset-header">
    <h1 ref={headingRef} id="password-reset-title" className="password-reset-title" tabIndex={-1}>{title}</h1>
    <p id="password-reset-description" className="password-reset-description">{description}</p>
  </header>;
}

function PasswordStrength({ value, strength }: { value: string; strength: number }) {
  return <div id="password-reset-strength" role="progressbar" aria-label="Fortaleza de la nueva contraseña"
    aria-valuemin={0} aria-valuemax={4} aria-valuenow={strength}
    aria-valuetext={value.length === 0 ? 'Sin contraseña' : PASSWORD_STRENGTH_LABELS[strength]}>
    <div className="flex items-center justify-between gap-4"><p className="text-sm font-semibold text-code-foreground">Fortaleza</p>
      <p className="text-xs text-code-muted">{value.length === 0 ? 'Sin contraseña' : PASSWORD_STRENGTH_LABELS[strength]}</p></div>
    <div className="mt-2 grid grid-cols-4 gap-1.5" aria-hidden="true">{[1, 2, 3, 4].map((level) =>
      <span key={level} className="h-1.5 rounded-full bg-code-border data-[active=true]:bg-code-accent" data-active={strength >= level} />)}</div>
  </div>;
}

function GuidanceList({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2>{title}</h2><ul>{children}</ul></section>;
}
function GuidanceItem({ met, children }: { met: boolean; children: ReactNode }) {
  const Icon = met ? CheckCircle2 : Circle;
  return <li data-state={met ? 'satisfied' : 'pending'}><Icon className="size-4 shrink-0" aria-hidden="true" />
    <span><span className="sr-only">{met ? 'Cumplido: ' : 'Pendiente: '}</span>{children}</span></li>;
}
function ResetError({ error }: { error: string }) {
  return error ? <p id="password-reset-error" className="password-reset-error" role="alert">{error}</p> : null;
}
function RecoveryBenefits() {
  return <ul className="password-reset-benefits" aria-label="Ventajas de CodeGym">{RECOVERY_BENEFITS.map((benefit) => {
    const Icon = benefit.icon;
    return <li key={benefit.firstLine} className="password-reset-benefit"><span className="password-reset-benefit__icon">
      <Icon className="size-5" aria-hidden="true" /></span><span><span className="block">{benefit.firstLine}</span>
      <span className="block">{benefit.secondLine}</span></span></li>;
  })}</ul>;
}

function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  return local && domain ? `${local[0]}${'•'.repeat(Math.max(3, local.length - 1))}@${domain}` : '••••••';
}
function formatTimer(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
function isValidEmail(email: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function createController(collection: Set<AbortController>): AbortController {
  const controller = new AbortController(); collection.add(controller); return controller;
}
function isAbortError(error: unknown): boolean { return error instanceof DOMException && error.name === 'AbortError'; }
function messageForRequestError(error: unknown): string {
  return error instanceof ApiError && error.status === 429
    ? 'Has realizado demasiadas solicitudes. Espera un poco antes de volver a intentarlo.'
    : 'No se pudo enviar el código. Inténtalo de nuevo.';
}
function messageForVerifyError(error: unknown): string {
  if (error instanceof ApiError && error.code === 'INVALID_RESET_CODE') {
    return 'El código introducido no es correcto.';
  }
  if (error instanceof ApiError && error.code === 'RESET_CODE_EXPIRED') {
    return 'Este código ha caducado. Solicita uno nuevo.';
  }
  if (error instanceof ApiError && error.code === 'RESET_CODE_ATTEMPTS_EXCEEDED') {
    return 'Has alcanzado el máximo de intentos. Solicita un nuevo código.';
  }
  if (error instanceof ApiError && error.status === 429) return 'Has realizado demasiados intentos. Espera un poco antes de volver a intentarlo.';
  return 'No se pudo verificar el código. Inténtalo de nuevo.';
}
function messageForConfirmError(error: unknown): string {
  if (error instanceof ApiError && error.status === 429) return 'Has realizado demasiados intentos. Espera un poco antes de volver a intentarlo.';
  if (error instanceof ApiError && ['RESET_TOKEN_EXPIRED', 'INVALID_RESET_TOKEN'].includes(error.code ?? '')) {
    return 'Tu sesión de recuperación ha caducado. Solicita un nuevo código.';
  }
  return 'No se pudo restablecer la contraseña. Inténtalo de nuevo.';
}
