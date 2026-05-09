"use client";

import { useEffect, useState } from 'react';
import { BarChart3, Briefcase, Users, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Session = {
  access_token: string;
  user: {
    id: string;
    email: string;
    rol: 'admin' | 'egresado' | 'empresa';
  };
};

type StatsEmpresa = {
  ofertasPublicadas: number;
  postulacionesRecibidas: number;
  contratados: number;
};

type RendimientoOferta = {
  id: number;
  titulo: string;
  postulaciones: number;
  contratados: number;
  tasaConversion: number;
};

export default function EmpresaPage() {
  const [stats, setStats] = useState<StatsEmpresa | null>(null);
  const [rendimiento, setRendimiento] = useState<RendimientoOferta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const sessionStr = localStorage.getItem('egresados-session');
      if (!sessionStr) return;
      const session = JSON.parse(sessionStr) as Session;
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const headers = { 'Authorization': `Bearer ${session.access_token}` };

      try {
        const [statsRes, perfRes] = await Promise.all([
          fetch(`${API_URL}/dashboard/stats-empresa`, { headers }),
          fetch(`${API_URL}/dashboard/rendimiento-ofertas`, { headers }),
        ]);

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats({
            ofertasPublicadas: Number(data?.ofertasPublicadas) || 0,
            postulacionesRecibidas: Number(data?.postulacionesRecibidas) || 0,
            contratados: Number(data?.contratados) || 0,
          });
        }

        if (perfRes.ok) {
          const data = await perfRes.json();
          setRendimiento(Array.isArray(data) ? data : []);
        }
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  return (
    <div className="space-y-6 p-6 lg:p-8 bg-background text-foreground transition-colors duration-300">
      {/* Header Section */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-400">
              Vista Segura
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Panel de Reclutamiento</h2>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              Monitorea tus KPIs y el rendimiento de tus vacantes publicadas.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card: Ofertas Publicadas */}
        <Card className="group relative overflow-hidden border-none bg-blue-500/10 transition-all duration-300 hover:scale-105 hover:bg-blue-500/15 dark:bg-slate-900/40 dark:hover:bg-slate-900/60 dark:ring-1 dark:ring-blue-500/20">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 transition-transform duration-500 group-hover:scale-125 dark:opacity-20">
            <Briefcase size={120} className="text-blue-600 dark:text-blue-500" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">Ofertas publicadas</CardTitle>
            <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 dark:text-white">{loading ? '—' : (stats?.ofertasPublicadas ?? 0)}</div>
            <p className="mt-1 text-xs font-medium text-blue-600 dark:text-blue-400/80">Gestión de vacantes</p>
          </CardContent>
        </Card>

        {/* Card: Postulaciones Recibidas */}
        <Card className="group relative overflow-hidden border-none bg-emerald-500/10 transition-all duration-300 hover:scale-105 hover:bg-emerald-500/15 dark:bg-slate-900/40 dark:hover:bg-slate-900/60 dark:ring-1 dark:ring-emerald-500/20">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 transition-transform duration-500 group-hover:scale-125 dark:opacity-20">
            <Users size={120} className="text-emerald-600 dark:text-emerald-500" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Postulaciones recibidas</CardTitle>
            <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-900 dark:text-white">{loading ? '—' : (stats?.postulacionesRecibidas ?? 0)}</div>
            <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400/80">Interés en vacantes</p>
          </CardContent>
        </Card>

        {/* Card: Candidatos Contratados */}
        <Card className="group relative overflow-hidden border-none bg-amber-500/10 transition-all duration-300 hover:scale-105 hover:bg-amber-500/15 dark:bg-slate-900/40 dark:hover:bg-slate-900/60 dark:ring-1 dark:ring-amber-500/20">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 transition-transform duration-500 group-hover:scale-125 dark:opacity-20">
            <CheckCircle2 size={120} className="text-amber-600 dark:text-amber-500" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Candidatos contratados</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-900 dark:text-white">{loading ? '—' : (stats?.contratados ?? 0)}</div>
            <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400/80">Éxito de reclutamiento</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-[2.5rem] border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/40 backdrop-blur-2xl p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Rendimiento por oferta</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300 italic">Postulaciones y tasa de conversión por vacante.</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <BarChart3 size={22} />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800/50 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : rendimiento.length === 0 ? (
          <div className="py-10 text-center text-slate-500 dark:text-slate-400 font-semibold">
            Aún no hay rendimiento para mostrar. Publica una oferta o espera postulaciones.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  <th className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Oferta</th>
                  <th className="py-3 px-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Postulaciones</th>
                  <th className="py-3 px-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Contratados</th>
                  <th className="py-3 px-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Conversión</th>
                </tr>
              </thead>
              <tbody>
                {rendimiento.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-black text-slate-800 dark:text-white truncate max-w-[28rem]">{r.titulo}</div>
                      <div className="text-xs text-slate-400">ID: {r.id}</div>
                    </td>
                    <td className="py-4 px-4 text-right font-black text-slate-700 dark:text-slate-200">{r.postulaciones}</td>
                    <td className="py-4 px-4 text-right font-black text-slate-700 dark:text-slate-200">{r.contratados}</td>
                    <td className="py-4 px-4 text-right">
                      <span className={cn(
                        "inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                        r.tasaConversion >= 20 ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800" :
                        r.tasaConversion > 0 ? "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800" :
                        "bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-900/20 dark:text-slate-300 dark:border-white/10"
                      )}>
                        {r.tasaConversion.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
