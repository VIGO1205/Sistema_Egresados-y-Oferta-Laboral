'use client';

import { useCallback, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CalendarDateRangePicker } from '@/components/ui/date-range-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Briefcase, GraduationCap, TrendingUp, PieChart as PieIcon, BarChart3, Lightbulb, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';
import { DownloadReportModal } from '@/components/download-report-modal';
import { useTheme } from 'next-themes';
import { useEffect } from 'react';

const DEFAULT_KPIS = {
  totalEgresados: 0,
  tasaEmpleabilidad: 0,
  ofertasActivas: 0,
  crecimiento: 0,
  distribucionCarreras: [],
};

const toSafeNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default function AdminDashboard() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Initialize date range: last 12 months to today
  const getDefaultDateRange = () => {
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return { from: oneYearAgo, to: today };
  };

  const [dateRange, setDateRange] = useState(getDefaultDateRange());

  const [kpis, setKpis] = useState<any>(null);
  const [evolucionData, setEvolucionData] = useState<any[]>([]);
  const [habilidadesDemandadas, setHabilidadesDemandadas] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    const sessionStr = localStorage.getItem('egresados-session');
    if (!sessionStr) return;

    let session: any;
    try {
      session = JSON.parse(sessionStr);
    } catch {
      return;
    }

    const token = session?.access_token;
    if (!token) return;

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const queryParams = new URLSearchParams({
      fechaInicio: formatDate(dateRange.from),
      fechaFin: formatDate(dateRange.to),
    });

    try {
      const [kpisRes, evolucionRes, habilidadesRes] = await Promise.all([
        fetch(`${API_URL}/dashboard/kpis?${queryParams}`, { headers, cache: 'no-store' }),
        fetch(`${API_URL}/dashboard/evolucion-mensual?${queryParams}`, { headers, cache: 'no-store' }),
        fetch(`${API_URL}/dashboard/top-habilidades?${queryParams}`, { headers, cache: 'no-store' }),
      ]);

      if (kpisRes.ok) {
        const raw = await kpisRes.json();
        const distribucion = Array.isArray(raw?.distribucionCarreras)
          ? raw.distribucionCarreras.map((item: any) => ({
              carrera: item?.carrera || 'Sin Carrera',
              cantidad: toSafeNumber(item?.cantidad),
            }))
          : [];

        setKpis({
          totalEgresados: toSafeNumber(raw?.totalEgresados),
          tasaEmpleabilidad: toSafeNumber(raw?.tasaEmpleabilidad),
          ofertasActivas: toSafeNumber(raw?.ofertasActivas),
          crecimiento: toSafeNumber(raw?.crecimiento),
          distribucionCarreras: distribucion,
        });
      } else {
        setKpis((prev: any) => prev ?? DEFAULT_KPIS);
      }

      if (evolucionRes.ok) {
        const rawEvolucion = await evolucionRes.json();
        const safeEvolucion = Array.isArray(rawEvolucion)
          ? rawEvolucion.map((item: any) => ({
              mes: item?.mes || 'N/A',
              ofertas: toSafeNumber(item?.ofertas),
              postulaciones: toSafeNumber(item?.postulaciones),
            }))
          : [];
        setEvolucionData(safeEvolucion);
      }

      if (habilidadesRes.ok) {
        const rawHabilidades = await habilidadesRes.json();
        const safeHabilidades = Array.isArray(rawHabilidades)
          ? rawHabilidades.map((item: any) => ({
              name: item?.name || 'N/A',
              cantidad: toSafeNumber(item?.cantidad),
            }))
          : [];
        setHabilidadesDemandadas(safeHabilidades);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setKpis((prev: any) => prev ?? DEFAULT_KPIS);
    }
  }, [dateRange]);

  useEffect(() => {
    setMounted(true);
    fetchData();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    };

    window.addEventListener('focus', fetchData);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('focus', fetchData);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchData]);

  if (!mounted || !kpis) return <div className="p-8 text-center">Cargando dashboard...</div>;

  const topHabilidad = (habilidadesDemandadas && habilidadesDemandadas.length > 0)
    ? (habilidadesDemandadas[0] || { name: 'N/A', cantidad: 0 })
    : { name: 'N/A', cantidad: 0 };

  const carreraPrincipal = (kpis && kpis.distribucionCarreras && kpis.distribucionCarreras.length > 0)
    ? (kpis.distribucionCarreras[0] || { carrera: 'N/A', cantidad: 0 })
    : { carrera: 'N/A', cantidad: 0 };

  const ultimaEvolucion = (evolucionData && evolucionData.length > 0)
    ? (evolucionData[evolucionData.length - 1] || { postulaciones: 0, ofertas: 0 })
    : { postulaciones: 0, ofertas: 0 };

  const totalHabilidades = habilidadesDemandadas && habilidadesDemandadas.length > 0
    ? habilidadesDemandadas.reduce((a, b) => a + b.cantidad, 0)
    : 1; // Evitar división por cero

  const ofertasPorModalidad = [
    { name: 'Remoto', value: 45 },
    { name: 'Híbrido', value: 30 },
    { name: 'Presencial', value: 25 },
  ];

  const postulacionesPorEstado = [
    { name: 'Postulado', cantidad: 120 },
    { name: 'Revisión', cantidad: 80 },
    { name: 'Entrevista', cantidad: 45 },
    { name: 'Contratado', cantidad: 25 },
  ];

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];

  return (
    <div className="space-y-6 p-6 lg:p-8 bg-background text-foreground transition-colors duration-300">
      {/* Header Section */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400">
              Vista Segura
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Panel de administración</h2>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              Monitorea egresados, ofertas y empleabilidad con una vista clara, moderna y lista para crecer.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <CalendarDateRangePicker
              date={dateRange}
              setDate={setDateRange}
            />
          </div>
        </div>
      </div>

      {/* KPI Cards Section */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Card: Total Egresados */}
        <Card className="group relative overflow-hidden border-none bg-blue-500/10 transition-all duration-300 hover:scale-105 hover:bg-blue-500/15 dark:bg-slate-900/40 dark:hover:bg-slate-900/60 dark:ring-1 dark:ring-blue-500/20">
          <div className="absolute opacity-10 transition-transform duration-500 group-hover:scale-125 dark:opacity-20" style={{ right: -10, top: -10 }}>
            <GraduationCap size={120} className="text-blue-600 dark:text-blue-500" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">Total Egresados</CardTitle>
            <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 dark:text-white">{kpis.totalEgresados}</div>
            <p className="mt-1 text-xs font-medium text-blue-600 dark:text-blue-400/80">+20% desde el mes pasado</p>
          </CardContent>
        </Card>

        {/* Card: Tasa de Empleabilidad */}
        <Card className="group relative overflow-hidden border-none bg-emerald-500/10 transition-all duration-300 hover:scale-105 hover:bg-emerald-500/15 dark:bg-slate-900/40 dark:hover:bg-slate-900/60 dark:ring-1 dark:ring-emerald-500/20">
          <div className="absolute opacity-10 transition-transform duration-500 group-hover:scale-125 dark:opacity-20" style={{ right: -10, top: -10 }}>
            <Users size={120} className="text-emerald-600 dark:text-emerald-500" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Tasa Empleabilidad</CardTitle>
            <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-900 dark:text-white">{kpis.tasaEmpleabilidad}%</div>
            <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400/80">+5% vs cohorte anterior</p>
          </CardContent>
        </Card>

        {/* Card: Ofertas Activas */}
        <Card className="group relative overflow-hidden border-none bg-amber-500/10 transition-all duration-300 hover:scale-105 hover:bg-amber-500/15 dark:bg-slate-900/40 dark:hover:bg-slate-900/60 dark:ring-1 dark:ring-amber-500/20">
          <div className="absolute opacity-10 transition-transform duration-500 group-hover:scale-125 dark:opacity-20" style={{ right: -10, top: -10 }}>
            <Briefcase size={120} className="text-amber-600 dark:text-amber-500" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Ofertas Activas</CardTitle>
            <Briefcase className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-900 dark:text-white">{kpis.ofertasActivas}</div>
            <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400/80">+12 nuevas esta semana</p>
          </CardContent>
        </Card>

        {/* Card: Crecimiento */}
        <Card className="group relative overflow-hidden border-none bg-indigo-500/10 transition-all duration-300 hover:scale-105 hover:bg-indigo-500/15 dark:bg-slate-900/40 dark:hover:bg-slate-900/60 dark:ring-1 dark:ring-indigo-500/20">
          <div className="absolute opacity-10 transition-transform duration-500 group-hover:scale-125 dark:opacity-20" style={{ right: -10, top: -10 }}>
            <TrendingUp size={120} className="text-indigo-600 dark:text-indigo-500" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">Crecimiento Reciente</CardTitle>
            <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-900 dark:text-white">+{kpis.crecimiento}%</div>
            <p className="mt-1 text-xs font-medium text-indigo-600 dark:text-indigo-400/80">Impulso sobre el trimestre anterior</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section - 2x2 Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Chart 1: Evolución Mensual (AreaChart) */}
        <Card className="overflow-hidden border-none shadow-sm transition-all hover:shadow-md dark:bg-slate-950/40 dark:border-slate-800/50 backdrop-blur-sm dark:ring-1 dark:ring-white/5">
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 border-b bg-slate-50/50 px-6 py-4 dark:bg-slate-900/50 dark:border-slate-800/50">
            <TrendingUp className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
            <CardTitle className="text-base font-bold text-slate-800 dark:text-white">Evolución Mensual: Ofertas vs Postulaciones</CardTitle>
          </CardHeader>
          <CardContent className="p-6" style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolucionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOfertas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPostulaciones" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#334155" : "#f1f5f9"} />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#020617' : '#fff',
                    borderRadius: '12px',
                    border: isDark ? '1px solid #1e293b' : 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    color: isDark ? '#f1f5f9' : '#000'
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Area type="monotone" dataKey="ofertas" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorOfertas)" name="Ofertas" />
                <Area type="monotone" dataKey="postulaciones" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPostulaciones)" name="Postulaciones" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 2: Distribución por Carrera (BarChart) */}
        <Card className="overflow-hidden border-none shadow-sm transition-all hover:shadow-md dark:bg-slate-950/40 dark:border-slate-800/50 backdrop-blur-sm dark:ring-1 dark:ring-white/5">
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 border-b bg-slate-50/50 px-6 py-4 dark:bg-slate-900/50 dark:border-slate-800/50">
            <BarChart3 className="h-5 w-5 text-blue-500 dark:text-blue-400" />
            <CardTitle className="text-base font-bold text-slate-800 dark:text-white">Egresados por Carrera</CardTitle>
          </CardHeader>
          <CardContent className="p-6" style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kpis.distribucionCarreras} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? "#334155" : "#f1f5f9"} />
                <XAxis type="number" axisLine={false} tickLine={false} hide />
                <YAxis dataKey="carrera" type="category" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#cbd5e1' : '#64748b', fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: isDark ? '#1e293b' : '#f8fafc' }}
                  contentStyle={{
                    backgroundColor: isDark ? '#020617' : '#fff',
                    borderRadius: '12px',
                    border: isDark ? '1px solid #1e293b' : 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    color: isDark ? '#f1f5f9' : '#000'
                  }}
                />
                <Bar dataKey="cantidad" radius={[0, 4, 4, 0]} barSize={20}>
                  {kpis.distribucionCarreras.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 3: Postulaciones por Estado (PieChart) */}
        <Card className="overflow-hidden border-none shadow-sm transition-all hover:shadow-md dark:bg-slate-950/40 dark:border-slate-800/50 backdrop-blur-sm dark:ring-1 dark:ring-white/5">
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 border-b bg-slate-50/50 px-6 py-4 dark:bg-slate-900/50 dark:border-slate-800/50">
            <PieIcon className="h-5 w-5 text-rose-500 dark:text-rose-400" />
            <CardTitle className="text-base font-bold text-slate-800 dark:text-white">Estado de Postulaciones</CardTitle>
          </CardHeader>
          <CardContent className="p-6" style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={postulacionesPorEstado}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="cantidad"
                  stroke="none"
                >
                  {postulacionesPorEstado.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#020617' : '#fff',
                    borderRadius: '12px',
                    border: isDark ? '1px solid #1e293b' : 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    color: isDark ? '#f1f5f9' : '#000'
                  }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 4: Habilidades Demandadas (BarChart) */}
        <Card className="overflow-hidden border-none shadow-sm transition-all hover:shadow-md dark:bg-slate-950/40 dark:border-slate-800/50 backdrop-blur-sm dark:ring-1 dark:ring-white/5">
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 border-b bg-slate-50/50 px-6 py-4 dark:bg-slate-900/50 dark:border-slate-800/50">
            <BarChart3 className="h-5 w-5 text-amber-500 dark:text-amber-400" />
            <CardTitle className="text-base font-bold text-slate-800 dark:text-white">Habilidades más Solicitadas</CardTitle>
          </CardHeader>
          <CardContent className="p-6" style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={habilidadesDemandadas} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#334155" : "#f1f5f9"} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#020617' : '#fff',
                    borderRadius: '12px',
                    border: isDark ? '1px solid #1e293b' : 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    color: isDark ? '#f1f5f9' : '#000'
                  }}
                />
                <Bar dataKey="cantidad" radius={[4, 4, 0, 0]} barSize={30}>
                  {habilidadesDemandadas.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={isDark ? 0.7 : 0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Analysis & Suggestions Section */}
      <Card className="border-none shadow-xl transition-all duration-300 bg-card text-foreground dark:bg-transparent dark:ring-1 dark:ring-white/10">
        <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b border-border px-6 py-5">
          <div className="rounded-xl bg-blue-500/10 dark:bg-blue-500/20 p-2">
            <Lightbulb className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold">Análisis y Sugerencias Estratégicas</CardTitle>
            <p className="text-xs text-muted-foreground">Resumen inteligente basado en el rendimiento actual</p>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Suggestion 1: Demand & Skills */}
            <div className="group space-y-3 rounded-2xl bg-muted/40 dark:bg-slate-800/40 p-4 transition-all hover:bg-muted/60 dark:hover:bg-slate-800/60 dark:ring-1 dark:ring-white/5">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Sparkles size={18} />
                <h4 className="text-sm font-bold uppercase tracking-wider">Oportunidad de Mercado</h4>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground dark:text-slate-300">
                La habilidad <span className="font-bold text-foreground dark:text-white">"{topHabilidad?.name || 'N/A'}"</span> lidera la demanda.
                Se recomienda organizar un bootcamp especializado para los egresados de {carreraPrincipal?.carrera || 'su especialidad'}.
              </p>
            </div>

            {/* Suggestion 2: Career Distribution */}
            <div className="group space-y-3 rounded-2xl bg-muted/40 dark:bg-slate-800/40 p-4 transition-all hover:bg-muted/60 dark:hover:bg-slate-800/60 dark:ring-1 dark:ring-white/5">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={18} />
                <h4 className="text-sm font-bold uppercase tracking-wider">Fortaleza Académica</h4>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground dark:text-slate-300">
                <span className="font-bold text-foreground dark:text-white">{carreraPrincipal?.carrera || 'N/A'}</span> representa un sector clave con {carreraPrincipal?.cantidad || 0} egresados.
                La tasa de empleabilidad del {kpis?.tasaEmpleabilidad || 0}% indica una excelente validación de la currícula.
              </p>
            </div>

            {/* Suggestion 3: Conversion/Funnel */}
            <div className="group space-y-3 rounded-2xl bg-muted/40 dark:bg-slate-800/40 p-4 transition-all hover:bg-muted/60 dark:hover:bg-slate-800/60 dark:ring-1 dark:ring-white/5">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertCircle size={18} />
                <h4 className="text-sm font-bold uppercase tracking-wider">Optimización de Embudo</h4>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground dark:text-slate-300">
                Se observa una actividad de {ultimaEvolucion?.postulaciones || 0} postulaciones recientes.
                Sugerimos implementar un módulo de <span className="font-bold text-foreground dark:text-white">Simulación de Entrevistas</span> para mejorar el ratio de conversión.
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between rounded-xl bg-blue-500/5 p-4 border border-blue-500/10 dark:border-white/10 dark:bg-slate-800/20">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-blue-600 dark:text-blue-400" />
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                El crecimiento proyectado para el próximo trimestre es de un <span className="text-lg font-bold text-blue-700 dark:text-blue-400">12%</span> basado en la tendencia de ofertas actuales.
              </p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold transition-all hover:bg-blue-500 active:scale-95 text-white shadow-md shadow-blue-500/20">
              Descargar Informe Completo
            </button>
          </div>
        </CardContent>
      </Card>

      <DownloadReportModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}