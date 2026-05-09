'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, ArrowRight, BadgeCheck, BriefcaseBusiness, Eye, EyeOff, GraduationCap, KeyRound, Mail, ShieldCheck, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Role = 'admin' | 'egresado' | 'empresa';
type RecoveryStep = 'login' | 'identify' | 'verify' | 'reset';

type Session = {
  access_token: string;
  user: {
    id: string;
    email: string;
    rol: Role;
  };
};

const roleMeta: Record<Role, { title: string; description: string; icon: typeof ShieldCheck }> = {
  admin: {
    title: 'Administrador',
    description: 'Gestiona usuarios, métricas, reportes y catálogos.',
    icon: ShieldCheck,
  },
  egresado: {
    title: 'Egresado',
    description: 'Consulta ofertas, postulaciones y tu historial.',
    icon: GraduationCap,
  },
  empresa: {
    title: 'Empresa',
    description: 'Publica vacantes y revisa postulantes.',
    icon: BriefcaseBusiness,
  },
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [recoveryStep, setRecoveryStep] = useState<RecoveryStep>('login');
  
  const changeRecoveryStep = (step: RecoveryStep) => {
    setMessage('');
    setRecoveryStep(step);
  };

  const [maskedEmail, setMaskedEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...verificationCode];
    newCode[index] = value.slice(-1);
    setVerificationCode(newCode);

    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const sessionStr = window.localStorage.getItem('egresados-session');
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr) as Session;
        const rol = session.user.rol;
        router.replace(rol === 'admin' ? '/admin' : rol === 'empresa' ? '/empresa' : '/egresado/dashboard');
      } catch {
        router.replace('/admin');
      }
    }
  }, [router]);

  const maskEmail = (email: string) => {
    const [user, domain] = email.split('@');
    if (user.length <= 3) return `***@${domain}`;
    const visiblePart = user.slice(-3);
    return `********${visiblePart}@${domain}`;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || 'No se pudo iniciar sesión';
        throw new Error(errorMessage);
      }

      const session = (await response.json()) as Session;
      window.localStorage.setItem('egresados-session', JSON.stringify(session));
      
      const rol = session.user.rol;
      router.replace(rol === 'admin' ? '/admin' : rol === 'empresa' ? '/empresa' : '/egresado/dashboard');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    changeRecoveryStep('identify');
  };

  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const startTime = Date.now();

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/auth/identify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('No se encontró una cuenta con ese correo');
      }

      const data = await response.json();
      
      // Asegurar al menos 2 segundos de carga
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 2000 - elapsedTime);
      await new Promise(resolve => setTimeout(resolve, remainingTime));

      setMaskedEmail(maskEmail(data.recoveryEmail || 'usuario@ejemplo.com'));
      changeRecoveryStep('verify');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error al identificar cuenta');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeString = verificationCode.join('');
    if (codeString.length !== 6) {
      setMessage('El código debe tener 6 dígitos');
      return;
    }

    setLoading(true);
    setMessage('');
    const startTime = Date.now();

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: codeString }),
      });

      if (!response.ok) {
        throw new Error('Código de verificación incorrecto');
      }

      // Asegurar al menos 2 segundos de carga
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 2000 - elapsedTime);
      await new Promise(resolve => setTimeout(resolve, remainingTime));

      changeRecoveryStep('reset');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error al verificar código');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage('Las contraseñas no coinciden');
      return;
    }

    if (newPassword.length < 6) {
      setMessage('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    setMessage('');
    const startTime = Date.now();

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode.join(''), password: newPassword }),
      });

      if (!response.ok) {
        throw new Error('No se pudo restablecer la contraseña');
      }

      // Asegurar al menos 2 segundos de carga
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 2000 - elapsedTime);
      await new Promise(resolve => setTimeout(resolve, remainingTime));

      changeRecoveryStep('login');
      setMessage('Contraseña actualizada con éxito. Ya puedes iniciar sesión.');
      setNewPassword('');
      setConfirmPassword('');
      setVerificationCode(['', '', '', '', '', '']);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error al restablecer contraseña');
    } finally {
      setLoading(false);
    }
  };

  const renderRecoveryFlow = () => {
    const steps: RecoveryStep[] = ['identify', 'verify', 'reset'];
    const currentStepIndex = steps.indexOf(recoveryStep);
    const progress = ((currentStepIndex + 1) / steps.length) * 100;

    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-slate-50">
        <style dangerouslySetInnerHTML={{ __html: `
          /* Ocultar controles nativos de visibilidad/clear en algunos navegadores */
          input[type=password]::-ms-reveal, input[type=password]::-ms-clear { display: none; }
          input::-webkit-credentials-auto-fill-button { display: none !important; }
        ` }} />
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes progress-fill {
            0% { width: 0%; }
            100% { width: 100%; }
          }
          .animate-progress-fill {
            animation: progress-fill 2s forwards cubic-bezier(0.4, 0, 0.2, 1);
          }
        `}} />
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="w-full max-w-[950px] min-h-[400px] overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col">
            {/* Barra de progreso superior interna del contenedor - Solo visible en loading */}
            <div className="h-1.5 w-full bg-slate-50 overflow-hidden relative">
              {loading && (
                <div className="absolute inset-0 h-full bg-sky-600 animate-progress-fill shadow-[0_0_15px_rgba(2,132,199,0.6)]" />
              )}
            </div>

            <div className="flex-1 p-10 md:p-16 flex flex-col justify-center">
              <div className="flex flex-col md:flex-row gap-16 items-center">
                
                {/* Lado izquierdo: Logo e información tipo Google */}
                <div className="flex-1 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-600 text-white">
                      <KeyRound className="h-6 w-6" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-slate-900">Sistema Egresados</span>
                  </div>
                  
                  <div className="space-y-4">
                    <h2 className="text-3xl font-medium text-slate-900">
                      {recoveryStep === 'identify' && 'Recupera tu cuenta'}
                      {recoveryStep === 'verify' && 'Verifica tu identidad'}
                      {recoveryStep === 'reset' && 'Crea una contraseña segura'}
                    </h2>
                    <p className="text-base text-slate-600 leading-relaxed">
                      {recoveryStep === 'identify' && 'Introduce el correo electrónico institucional que usas para acceder al sistema.'}
                      {recoveryStep === 'verify' && (
                        <>
                          Hemos enviado un código de seguridad a tu correo de recuperación: <br/>
                          <span className="font-semibold text-slate-900">{maskedEmail}</span>
                        </>
                      )}
                      {recoveryStep === 'reset' && 'La nueva contraseña debe ser diferente a las anteriores para garantizar la seguridad de tu cuenta.'}
                    </p>
                  </div>
                </div>

                {/* Lado derecho: Formulario interactivo */}
                <div className="flex-1">
                  {(() => {
                    switch (recoveryStep) {
                      case 'identify':
                      return (
                        <form className="space-y-8" onSubmit={handleIdentify}>
                          <div className="relative group">
                            <input
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              type="email"
                              className="peer w-full rounded-md border border-slate-300 px-4 py-4 text-base outline-none transition-all focus:border-sky-600 focus:ring-1 focus:ring-sky-600"
                              placeholder=" "
                            />
                            <label className="absolute left-4 top-4 z-10 origin-[0] -translate-y-7 scale-75 transform bg-white px-1 text-sm text-slate-500 duration-300 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-7 peer-focus:scale-75 peer-focus:text-sky-600">
                              Correo del sistema
                            </label>
                          </div>

                            {message && (
                              <div className="flex items-center gap-2 text-sm text-rose-600 animate-in fade-in zoom-in duration-300">
                                <AlertTriangle className="h-4 w-4" />
                                {message}
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-4">
                              <button
                              type="button"
                              onClick={() => changeRecoveryStep('login')}
                              className="text-sm font-semibold text-sky-600 hover:text-sky-700 transition-colors"
                            >
                              Volver al login
                            </button>
                              <button
                                disabled={loading}
                                type="submit"
                                className="flex items-center gap-2 rounded-full bg-sky-600 px-8 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-sky-700 hover:shadow-lg disabled:opacity-50"
                              >
                                {loading ? (
                                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                  'Siguiente'
                                )}
                              </button>
                            </div>
                          </form>
                        );
                      case 'verify':
                      return (
                        <form className="space-y-8" onSubmit={handleVerify}>
                          <div className="flex justify-between gap-2">
                            {verificationCode.map((digit, index) => (
                              <input
                                key={index}
                                id={`code-${index}`}
                                required
                                type="text"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleCodeChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                className="w-12 h-16 text-center text-2xl font-bold rounded-xl border border-slate-300 outline-none transition-all focus:border-sky-600 focus:ring-1 focus:ring-sky-600 bg-white"
                              />
                            ))}
                          </div>

                          {message && (
                            <div className="flex items-center gap-2 text-sm text-rose-600 animate-in fade-in zoom-in duration-300">
                              <AlertTriangle className="h-4 w-4" />
                              {message}
                            </div>
                          )}

                            <div className="flex items-center justify-between pt-4">
                              <button
                                type="button"
                                onClick={() => changeRecoveryStep('identify')}
                                className="text-sm font-semibold text-sky-600 hover:text-sky-700 transition-colors"
                              >
                                No recibí el código
                              </button>
                              <button
                                disabled={loading}
                                type="submit"
                                className="flex items-center gap-2 rounded-full bg-sky-600 px-8 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-sky-700 hover:shadow-lg disabled:opacity-50"
                              >
                                {loading ? (
                                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                  'Verificar'
                                )}
                              </button>
                            </div>
                          </form>
                        );
                      case 'reset':
                        return (
                          <form className="space-y-6" onSubmit={handleReset}>
                            <div className="relative group">
                              <input
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                type="password"
                                className="peer w-full rounded-md border border-slate-300 px-4 py-4 text-base outline-none transition-all focus:border-sky-600 focus:ring-1 focus:ring-sky-600"
                                placeholder=" "
                              />
                              <label className="absolute left-4 top-4 z-10 origin-[0] -translate-y-7 scale-75 transform bg-white px-1 text-sm text-slate-500 duration-300 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-7 peer-focus:scale-75 peer-focus:text-sky-600">
                                Nueva contraseña
                              </label>
                            </div>

                            <div className="relative group">
                              <input
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                type="password"
                                className="peer w-full rounded-md border border-slate-300 px-4 py-4 text-base outline-none transition-all focus:border-sky-600 focus:ring-1 focus:ring-sky-600"
                                placeholder=" "
                              />
                              <label className="absolute left-4 top-4 z-10 origin-[0] -translate-y-7 scale-75 transform bg-white px-1 text-sm text-slate-500 duration-300 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-7 peer-focus:scale-75 peer-focus:text-sky-600">
                                Confirmar contraseña
                              </label>
                            </div>

                            {message && (
                              <div className="flex items-center gap-2 text-sm text-rose-600 animate-in fade-in zoom-in duration-300">
                                <AlertTriangle className="h-4 w-4" />
                                {message}
                              </div>
                            )}

                            <div className="flex items-center justify-end pt-4">
                              <button
                                disabled={loading}
                                type="submit"
                                className="flex items-center gap-2 rounded-full bg-sky-600 px-8 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-sky-700 hover:shadow-lg disabled:opacity-50"
                              >
                                {loading ? (
                                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                  'Cambiar contraseña'
                                )}
                              </button>
                            </div>
                          </form>
                        );
                      default:
                        return null;
                    }
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[1.1fr_0.9fr]">
      <section className="bg-slate-950 p-8 flex flex-col justify-center relative overflow-hidden">
        {/* Decoración de fondo */}
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        
        <div className="relative z-10 max-w-2xl mx-auto w-full">
          <div className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200">
            <BadgeCheck className="h-4 w-4" />
            Acceso institucional seguro
          </div>

          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.32em] text-sky-300">Sistema Web</p>
            <h1 className="text-4xl font-bold leading-tight text-white sm:text-6xl">
              Egresados y Oferta Laboral con acceso por rol
            </h1>
            <p className="text-base leading-7 text-slate-300">
              Inicia sesión con tu cuenta institucional para acceder al panel correspondiente a tu perfil. El sistema reconoce tres roles: administrador, egresado y empresa.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {Object.entries(roleMeta).map(([key, meta]) => {
              const Icon = meta.icon;

              return (
                <div key={key} className="rounded-3xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{meta.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-400">{meta.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center bg-white p-8 text-slate-900">
        <div className="w-full max-w-md space-y-8">
          <div className="text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">Inicio de sesión</p>
            <h2 className="mt-2 text-4xl font-bold text-slate-950">Ingresa a tu panel</h2>
            <p className="mt-2 text-sm text-slate-600">Introduce tus credenciales autorizadas.</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Correo electrónico</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none ring-0 transition focus:border-sky-500 focus:bg-white"
                placeholder="ejemplo@correo.com"
              />
            </label>

            <label className="block space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Contraseña</span>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-bold text-sky-700 hover:text-sky-900 transition-colors cursor-pointer"
                  aria-label="Olvidé mi contraseña"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 pr-12 outline-none ring-0 transition focus:border-sky-500 focus:bg-white"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute inset-y-0 right-0 flex items-center justify-center px-4 text-slate-500 transition hover:text-slate-900 cursor-pointer z-10"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
                </button>
              </div>
            </label>

            {message && recoveryStep === 'login' ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-4 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 shadow-xl shadow-slate-950/20 cursor-pointer"
            >
              {loading ? 'Ingresando...' : 'Entrar al sistema'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </section>

      {recoveryStep !== 'login' && renderRecoveryFlow()}
    </div>
  );
}