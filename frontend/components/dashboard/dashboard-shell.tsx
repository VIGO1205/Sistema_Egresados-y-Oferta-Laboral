'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  Briefcase,
  Building2,
  ChevronLeft,
  ChevronRight,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Send,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModeToggle } from '@/components/mode-toggle';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

type Session = {
  access_token: string;
  user: {
    id: string;
    email: string;
    rol: 'admin' | 'egresado' | 'empresa';
  };
};

const navigation = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, roles: ['admin'] },
  { label: 'Egresados', href: '/admin/egresados', icon: Users, roles: ['admin'] },
  { label: 'Dashboard', href: '/egresado/dashboard', icon: LayoutDashboard, roles: ['egresado'] },
  { label: 'Mi Perfil', href: '/egresado', icon: GraduationCap, roles: ['egresado'] },
  { label: 'Ofertas Laborales', href: '/egresado/ofertas', icon: Search, roles: ['egresado'] },
  { label: 'Mis Postulaciones', href: '/egresado/postulaciones', icon: Send, roles: ['egresado'] },
  { label: 'Mi Empresa', href: '/empresa', icon: Building2, roles: ['empresa'] },
  { label: 'Mis Ofertas Laborales', href: '/empresa/ofertas', icon: Briefcase, roles: ['empresa'] },
  { label: 'Reportes', href: '/reportes', icon: FileText, roles: ['admin'] },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session['user'] | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [showNotificaciones, setShowNotificaciones] = useState(false);
  const [lastSeenNotifAt, setLastSeenNotifAt] = useState(0);
  const [lastBannerForAt, setLastBannerForAt] = useState(0);
  const notifDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rawSession = window.localStorage.getItem('egresados-session');

    if (!rawSession) {
      router.replace('/login');
      return;
    }

    try {
      const parsed = JSON.parse(rawSession) as Session;
      setSession(parsed.user);
      const storedLastSeen = window.localStorage.getItem(`notif-last-seen:${parsed.user.id}`);
      setLastSeenNotifAt(storedLastSeen ? Number(storedLastSeen) : 0);
      fetchNotificaciones(parsed.access_token);

      // Polling de notificaciones cada 10 segundos
      const interval = setInterval(() => {
        fetchNotificaciones(parsed.access_token);
      }, 10000);

      return () => clearInterval(interval);
    } catch {
      window.localStorage.removeItem('egresados-session');
      router.replace('/login');
    }
  }, [router]);

  const fetchNotificaciones = async (token: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(`${API_URL}/notificaciones/mis-notificaciones`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotificaciones(data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const unreadCount = notificaciones.filter(n => !n.leida).length;
  const latestUnreadAt = useMemo(() => {
    const unread = notificaciones.filter(n => !n.leida && n.fechaEnvio);
    if (unread.length === 0) return 0;
    return Math.max(...unread.map(n => new Date(n.fechaEnvio).getTime()));
  }, [notificaciones]);

  const hasNewUnread = unreadCount > 0 && latestUnreadAt > lastSeenNotifAt;
  const shouldShowBadge = hasNewUnread && !showNotificaciones;

  const handleMarcarComoLeida = async (id: number) => {
    const rawSession = window.localStorage.getItem('egresados-session');
    if (!rawSession) return;
    const { access_token } = JSON.parse(rawSession);
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      await fetch(`${API_URL}/notificaciones/${id}/leer`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleEliminarNotificacion = async (id: number) => {
    const rawSession = window.localStorage.getItem('egresados-session');
    if (!rawSession) return;
    const { access_token } = JSON.parse(rawSession);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      await fetch(`${API_URL}/notificaciones/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      setNotificaciones(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  useEffect(() => {
    if (!hasNewUnread || showNotificaciones) return;
    if (latestUnreadAt <= lastBannerForAt) return;

    setLastBannerForAt(latestUnreadAt);

    const isDark = document.documentElement.classList.contains('dark');
    MySwal.fire({
      toast: true,
      position: 'top',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      background: isDark ? '#0f172a' : '#ffffff',
      color: isDark ? '#f8fafc' : '#0f172a',
      icon: 'info',
      title: unreadCount === 1 ? 'Tienes 1 notificación nueva' : `Tienes ${unreadCount} notificaciones nuevas`,
      didOpen: (popup) => {
        popup.style.marginTop = '84px';
      },
    });
  }, [hasNewUnread, latestUnreadAt, lastBannerForAt, showNotificaciones]);

  const toggleNotificaciones = () => {
    const next = !showNotificaciones;
    setShowNotificaciones(next);

    if (next && session) {
      Swal.close();
      const seenAt = Math.max(Date.now(), latestUnreadAt);
      setLastSeenNotifAt(seenAt);
      window.localStorage.setItem(`notif-last-seen:${session.id}`, String(seenAt));
    }
  };

  useEffect(() => {
    if (!showNotificaciones) return;

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(target)) {
        setShowNotificaciones(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowNotificaciones(false);
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showNotificaciones]);

  const visibleNavigation = useMemo(
    () => navigation.filter((item) => (session ? item.roles.includes(session.rol) : item.roles.includes('admin'))),
    [session],
  );

  const handleLogout = async () => {
    const isDark = document.documentElement.classList.contains('dark');

    const result = await MySwal.fire({
      title: '¿Deseas cerrar sesión?',
      text: 'Tu sesión actual se cerrará y tendrás que iniciar sesión de nuevo.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      background: isDark ? '#0f172a' : '#ffffff',
      color: isDark ? '#f8fafc' : '#0f172a',
      iconColor: '#f59e0b',
      confirmButtonColor: '#0ea5e9',
      cancelButtonColor: '#ef4444',
      customClass: {
        popup: 'rounded-3xl border border-slate-200 shadow-2xl dark:border-slate-700',
        confirmButton: 'px-5 py-2.5 rounded-xl font-semibold',
        cancelButton: 'px-5 py-2.5 rounded-xl font-semibold',
      },
    });

    if (!result.isConfirmed) return;

    window.localStorage.removeItem('egresados-session');
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/10 bg-slate-950 transition-all duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          isCollapsed ? 'lg:w-20' : 'lg:w-72',
          'w-72' // Default mobile width
        )}
      >
        <div className="flex h-full flex-col gap-6 px-4 py-5">
          {/* Logo Section */}
          <div className={cn(
            "flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4 transition-all duration-300",
            isCollapsed && "lg:p-2 lg:justify-center"
          )}>
            <div className={cn(
              "transition-all duration-300",
              isCollapsed ? "lg:opacity-0 lg:w-0 lg:hidden" : "opacity-100 w-auto"
            )}>
              <p className="text-xs uppercase tracking-[0.28em] text-sky-400">Sistema</p>
              <h1 className="text-lg font-semibold text-white">Egresados</h1>
            </div>
            
            {isCollapsed && (
              <div className="hidden lg:flex h-8 w-8 rounded-lg bg-sky-500/20 items-center justify-center text-sky-400 font-bold">
                S
              </div>
            )}
            
            <button className="lg:hidden text-white hover:bg-white/10 p-1 rounded-lg transition-colors" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {visibleNavigation.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200',
                    active 
                      ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' 
                      : 'text-white hover:bg-white/5 hover:text-white',
                    isCollapsed && "lg:justify-center lg:px-0"
                  )}
                  onClick={() => setSidebarOpen(false)}
                  title={isCollapsed ? item.label : ''}
                >
                  <Icon className="h-5 w-5 shrink-0 text-white" />
                  <span className={cn(
                    "transition-all duration-300 truncate text-white",
                    isCollapsed ? "lg:opacity-0 lg:w-0 lg:hidden" : "opacity-100 w-auto"
                  )}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* User & Logout */}
          <div className={cn(
            "space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm transition-all duration-300",
            isCollapsed && "lg:p-2"
          )}>
            <div className={cn("flex items-center gap-3", isCollapsed && "lg:justify-center")}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-400">
                <Users className="h-5 w-5" />
              </div>
              <div className={cn(
                "min-w-0 flex-1 transition-all duration-300",
                isCollapsed ? "lg:opacity-0 lg:w-0 lg:hidden" : "opacity-100 w-auto"
              )}>
                <p className="truncate font-medium text-white">{session?.email ?? 'Sesión'}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{session?.rol ?? 'guest'}</p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className={cn(
                "flex w-full items-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-white transition-all hover:bg-white/10 cursor-pointer",
                isCollapsed ? "lg:justify-center lg:px-0" : "px-4"
              )}
              title={isCollapsed ? "Cerrar sesión" : ""}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className={cn(
                "transition-all duration-300",
                isCollapsed ? "lg:opacity-0 lg:w-0 lg:hidden" : "opacity-100 w-auto"
              )}>
                Cerrar sesión
              </span>
            </button>
          </div>

          {/* Collapse Toggle Button (Desktop Only) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex absolute -right-3 top-20 h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-all shadow-md"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={cn(
        "flex min-h-screen flex-1 flex-col transition-all duration-300",
        isCollapsed ? "lg:pl-20" : "lg:pl-72"
      )}>
        <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 px-4 py-4 backdrop-blur-xl lg:px-6">
          <div className="flex items-center justify-between gap-4">
            <button
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-3 lg:hidden text-white"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            
            <div className="flex-1 lg:flex-none">
              <p className="text-xs uppercase tracking-[0.28em] text-sky-400">Vista segura</p>
              <h2 className="text-lg font-semibold text-white truncate">
                {session?.rol === 'admin' ? 'Panel de administración' : 'Panel operativo'}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              {/* Notificaciones */}
              <div ref={notifDropdownRef} className="relative">
                <button 
                  onClick={toggleNotificaciones}
                  className="relative p-3 rounded-2xl border border-white/10 bg-white/5 text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <Bell className={cn("h-5 w-5", shouldShowBadge && "bell-shake")} />
                  {shouldShowBadge && (
                    <span className="absolute top-2 right-2 h-4 w-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-slate-950">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotificaciones && (
                  <div className="absolute right-0 mt-3 w-80 max-h-[32rem] overflow-y-auto rounded-3xl border border-white/10 bg-slate-900 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                      <h3 className="font-bold text-white">Notificaciones</h3>
                      {unreadCount > 0 && <span className="text-[10px] bg-sky-500/20 text-sky-400 px-2 py-1 rounded-full font-black uppercase tracking-widest">{unreadCount} nuevas</span>}
                    </div>
                    <div className="divide-y divide-white/5">
                      {notificaciones.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-sm italic">No tienes notificaciones.</div>
                      ) : notificaciones.map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => !n.leida && handleMarcarComoLeida(n.id)}
                          className={cn(
                            "p-4 transition-colors cursor-pointer hover:bg-white/5 relative",
                            !n.leida ? "bg-sky-500/5 border-l-4 border-sky-500/60" : "opacity-60"
                          )}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEliminarNotificacion(n.id);
                            }}
                            className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            aria-label="Eliminar notificación"
                            title="Eliminar"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <div className="flex justify-between items-start gap-2">
                            <p className="font-bold text-sm text-slate-200">{n.titulo}</p>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{n.contenido}</p>
                          <p className="text-[10px] text-slate-500 mt-2 font-medium uppercase tracking-wider">
                            {new Date(n.fechaEnvio).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <ModeToggle />
              <div className="hidden sm:block rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-400 shadow-sm whitespace-nowrap">
                Acceso verificado
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 bg-background text-foreground transition-colors duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}
