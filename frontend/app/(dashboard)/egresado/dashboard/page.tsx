"use client";

import { useEffect, useMemo, useState } from 'react';
import { Briefcase, Eye, TrendingUp, Sparkles, Building2, MapPin, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
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

type StatsEgresado = {
  totalPostulaciones: number;
  ofertasVistas: number | null;
  totalRespondidas: number;
  tasaRespuesta: string;
};

type RecomendacionOferta = {
  id: number;
  titulo: string;
  ubicacion: string;
  modalidad: string;
  tipoContrato: string;
  salarioMin: number;
  salarioMax: number;
  empresa: { nombre: string };
  coincidencias: number;
};

export default function DashboardEgresadoPage() {
  const [stats, setStats] = useState<StatsEgresado | null>(null);
  const [recomendaciones, setRecomendaciones] = useState<RecomendacionOferta[]>([]);
  const [loading, setLoading] = useState(true);

  const handlePostular = async (ofertaId: number, titulo: string) => {
    const sessionStr = localStorage.getItem('egresados-session');
    if (!sessionStr) return;
    const session = JSON.parse(sessionStr!);
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    // Fetch perfil to validate employment and horarios
    let perfil: any = null;
    try {
      const perfilRes = await fetch(`${API_URL}/egresados/perfil`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (perfilRes.ok) perfil = await perfilRes.json();
    } catch (e) {
      console.error('No se pudo obtener perfil para validar horarios', e);
    }

    // We don't have ofertas array here, try to rely on API or skip horario check
    let ofertaInicio: string | null = null;
    let ofertaFin: string | null = null;
    try {
      const ofertaRes = await fetch(`${API_URL}/ofertas/${ofertaId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (ofertaRes.ok) {
        const ofertaData = await ofertaRes.json();
        ofertaInicio = ofertaData.horarioInicio ?? null;
        ofertaFin = ofertaData.horarioFin ?? null;
      }
    } catch (e) {
      console.error('No se pudo obtener oferta para validar horarios', e);
    }

    const perfilInicio = perfil?.horarioInicio ?? null;
    const perfilFin = perfil?.horarioFin ?? null;

    const toMinutes = (t?: string | null) => {
      if (!t) return null;
      const hhmm = t.substring(0, 5);
      const parts = hhmm.split(':');
      const h = Number(parts[0] ?? 0);
      const m = Number(parts[1] ?? 0);
      if (Number.isNaN(h) || Number.isNaN(m)) return null;
      return h * 60 + m;
    };

    let showWarning = false;
    try {
      if (perfil?.empleadoActualmente && perfilInicio && perfilFin && ofertaInicio && ofertaFin) {
        const pStart = toMinutes(perfilInicio);
        const pEnd = toMinutes(perfilFin);
        const oStart = toMinutes(ofertaInicio);
        const oEnd = toMinutes(ofertaFin);
        if (pStart !== null && pEnd !== null && oStart !== null && oEnd !== null) {
          if (oStart < pEnd && oEnd > pStart) showWarning = true;
        }
      }
    } catch (e) {
      console.error('Error al comparar horarios', e);
    }

    const title = showWarning ? 'Advertencia: posible conflicto de horarios' : '¿Confirmar postulación?';
    const text = showWarning
      ? `Atención: tu horario actual (${perfilInicio?.substring(0,5) ?? '--:--'} - ${perfilFin?.substring(0,5) ?? '--:--'}) parece solaparse con el horario de la oferta (${ofertaInicio?.substring(0,5) ?? '--:--'} - ${ofertaFin?.substring(0,5) ?? '--:--'}). ¿Aún deseas postularte a: ${titulo}?`
      : `Te postularás a la vacante: ${titulo}`;

    const result = await MySwal.fire({
      title,
      text,
      icon: showWarning ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, postularme',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: showWarning ? '#dc2626' : '#0d9488',
      cancelButtonColor: '#64748b',
      background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
      color: document.documentElement.classList.contains('dark') ? '#f8fafc' : '#475569',
      customClass: {
        popup: 'rounded-3xl',
        confirmButton: 'rounded-xl px-6 py-3',
        cancelButton: 'rounded-xl px-6 py-3'
      }
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}/ofertas/${ofertaId}/postular`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (res.ok) {
        MySwal.fire({
          icon: 'success',
          title: '¡Postulación enviada!',
          text: 'Puedes ver el estado en "Mis Postulaciones".',
          showConfirmButton: false,
          timer: 2000,
          customClass: { popup: 'rounded-3xl' }
        });
      } else {
        const err = await res.json().catch(() => ({}));
        MySwal.fire({
          icon: 'error',
          title: 'Aviso',
          text: err.message || 'No se pudo postular a esta oferta.',
          customClass: { popup: 'rounded-3xl' }
        });
      }
    } catch {
      MySwal.fire({ icon: 'error', title: 'Error de conexión' });
    }
  };

  const ofertasVistas = useMemo(() => {
    try {
      const sessionStr = localStorage.getItem('egresados-session');
      if (!sessionStr) return 0;
      const session = JSON.parse(sessionStr) as Session;
      const raw = localStorage.getItem(`ofertas-vistas:${session.user.id}`);
      if (!raw) return 0;
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return 0;
      return arr.length;
    } catch {
      return 0;
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const sessionStr = localStorage.getItem('egresados-session');
      if (!sessionStr) return;
      const session = JSON.parse(sessionStr) as Session;
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const headers = { 'Authorization': `Bearer ${session.access_token}` };

      try {
        const [statsRes, recRes] = await Promise.all([
          fetch(`${API_URL}/dashboard/stats-egresado`, { headers }),
          fetch(`${API_URL}/dashboard/recomendaciones-ofertas?limit=6`, { headers }),
        ]);

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats({
            totalPostulaciones: Number(data?.totalPostulaciones) || 0,
            ofertasVistas,
            totalRespondidas: Number(data?.totalRespondidas) || 0,
            tasaRespuesta: String(data?.tasaRespuesta ?? '0'),
          });
        }

        if (recRes.ok) {
          const data = await recRes.json();
          setRecomendaciones(Array.isArray(data) ? data : []);
        }
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [ofertasVistas]);

  return (
    <div className="space-y-6 p-6 lg:p-8 bg-background text-foreground transition-colors duration-300">
      {/* Header Section */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-400">
              Vista Segura
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Mi Dashboard</h2>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              Revisa tu actividad y descubre recomendaciones basadas en tu perfil.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card: Postulaciones */}
        <Card className="group relative overflow-hidden border-none bg-blue-500/10 transition-all duration-300 hover:scale-105 hover:bg-blue-500/15 dark:bg-slate-900/40 dark:hover:bg-slate-900/60 dark:ring-1 dark:ring-blue-500/20">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 transition-transform duration-500 group-hover:scale-125 dark:opacity-20">
            <Briefcase size={120} className="text-blue-600 dark:text-blue-500" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">Postulaciones</CardTitle>
            <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 dark:text-white">{loading ? '—' : (stats?.totalPostulaciones ?? 0)}</div>
            <p className="mt-1 text-xs font-medium text-blue-600 dark:text-blue-400/80">Actividad reciente</p>
          </CardContent>
        </Card>

        {/* Card: Ofertas Vistas */}
        <Card className="group relative overflow-hidden border-none bg-emerald-500/10 transition-all duration-300 hover:scale-105 hover:bg-emerald-500/15 dark:bg-slate-900/40 dark:hover:bg-slate-900/60 dark:ring-1 dark:ring-emerald-500/20">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 transition-transform duration-500 group-hover:scale-125 dark:opacity-20">
            <Eye size={120} className="text-emerald-600 dark:text-emerald-500" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Ofertas vistas</CardTitle>
            <Eye className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-900 dark:text-white">{loading ? '—' : (stats?.ofertasVistas ?? 0)}</div>
            <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400/80">Interés en el mercado</p>
          </CardContent>
        </Card>

        {/* Card: Tasa de Respuesta */}
        <Card className="group relative overflow-hidden border-none bg-amber-500/10 transition-all duration-300 hover:scale-105 hover:bg-amber-500/15 dark:bg-slate-900/40 dark:hover:bg-slate-900/60 dark:ring-1 dark:ring-amber-500/20">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 transition-transform duration-500 group-hover:scale-125 dark:opacity-20">
            <Sparkles size={120} className="text-amber-600 dark:text-amber-500" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Tasa de respuesta</CardTitle>
            <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-900 dark:text-white">{loading ? '—' : `${stats?.tasaRespuesta ?? '0'}%`}</div>
            <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400/80">
              {loading ? '' : `${stats?.totalRespondidas ?? 0} de ${stats?.totalPostulaciones ?? 0} con respuesta`}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-[2.5rem] border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/40 backdrop-blur-2xl p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Recomendaciones</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300 italic">Basadas en habilidades coincidentes.</p>
          </div>
          <a
            href="/egresado/ofertas"
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 dark:bg-slate-700 px-6 py-3 text-[10px] font-black uppercase tracking-widest !text-white hover:bg-black dark:hover:bg-slate-600 transition-all"
          >
            Ver todas las ofertas
          </a>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 bg-slate-100 dark:bg-slate-800/50 animate-pulse rounded-3xl" />
            ))}
          </div>
        ) : recomendaciones.length === 0 ? (
          <div className="py-10 text-center text-slate-500 dark:text-slate-400 font-semibold">
            Aún no hay recomendaciones. Agrega habilidades a tu perfil para recibir ofertas sugeridas.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recomendaciones.map((oferta) => (
              <div key={oferta.id} className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/30 p-6 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 text-xs font-black uppercase tracking-widest">
                      <Building2 size={14} /> {oferta.empresa.nombre}
                    </div>
                    <p className="mt-2 text-lg font-black text-slate-900 dark:text-white truncate">{oferta.titulo}</p>
                  </div>
                  <span className={cn(
                    "shrink-0 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                    oferta.coincidencias >= 3 ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800" :
                    "bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-800"
                  )}>
                    {oferta.coincidencias} match
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-2 text-slate-500 dark:text-slate-300 text-sm font-semibold">
                  <MapPin size={16} className="text-slate-400" />
                  <span className="truncate">{oferta.ubicacion}</span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className="uppercase text-[11px] font-black tracking-widest">{oferta.modalidad}</span>
                </div>

                <div className="mt-6 pt-5 border-t border-slate-100 dark:border-white/10 flex items-center justify-end">
                  <button
                    onClick={() => handlePostular(oferta.id, oferta.titulo)}
                    className="inline-flex items-center justify-center rounded-2xl bg-teal-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-teal-700 shadow-lg shadow-teal-600/20 active:scale-95 cursor-pointer"
                  >
                    <Send className="mr-2 h-4 w-4" /> Postularme
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
