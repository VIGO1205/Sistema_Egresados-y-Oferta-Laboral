"use client";

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { 
  FileText, Download, Filter, 
  Search, Calendar, FileDown, 
  Clock, CheckCircle2, AlertCircle,
  FileSpreadsheet, FilePieChart, BarChart3,
  Users, Briefcase, GraduationCap, ClipboardList,
  ChevronRight, Send
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

type Reporte = {
  id: number;
  codigo: string;
  tipoReporte: string;
  fechaSolicitud: string;
  estado: string;
  urlPdf: string | null;
};

export default function ReportesPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'operacionales' | 'gestion'>('operacionales');

  useEffect(() => {
    fetchReportes();
    const interval = setInterval(fetchReportes, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchReportes = async () => {
    const sessionStr = localStorage.getItem('egresados-session');
    if (!sessionStr) return;
    const session = JSON.parse(sessionStr);
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    try {
      const res = await fetch(`${API_URL}/reportes/mis-reportes`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReportes(data);
      }
    } catch (error) {
      console.error('Error fetching reportes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNuevoReporte = async (tipo: string, label: string) => {
    const { value: formValues } = await MySwal.fire({
      title: `<span class="text-xl font-bold">Generar ${label}</span>`,
      html: `
        <div class="space-y-4 p-2 text-left">
          <div>
            <label class="text-sm font-semibold mb-1 block text-slate-900 dark:text-white">Carrera</label>
            <select id="swal-carrera" class="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-black text-sm transition-colors">
              <option value="">Todas las carreras</option>
              <option value="Sistemas">Ingeniería de Sistemas</option>
              <option value="Industrial">Ingeniería Industrial</option>
              <option value="Civil">Ingeniería Civil</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-semibold mb-1 block text-slate-900 dark:text-white">Desde</label>
              <input type="date" id="swal-desde" class="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-black text-sm transition-colors">
            </div>
            <div>
              <label class="text-sm font-semibold mb-1 block text-slate-900 dark:text-white">Hasta</label>
              <input type="date" id="swal-hasta" class="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-black text-sm transition-colors">
            </div>
          </div>
          <div class="flex items-center gap-2 pt-2">
            <input type="checkbox" id="swal-programado" class="rounded accent-sky-500">
            <label for="swal-programado" class="text-xs font-medium text-slate-900 dark:text-white">Programar generación (Background Job)</label>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Generar PDF',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0284c7',
      customClass: {
        popup: 'rounded-[2rem] bg-black border border-slate-700 max-w-md mx-auto',
        title: 'text-white',
        htmlContainer: 'text-white',
        confirmButton: 'rounded-xl px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-medium',
        cancelButton: 'rounded-xl px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium'
      },
      preConfirm: () => {
        return {
          carrera: (document.getElementById('swal-carrera') as HTMLSelectElement).value,
          desde: (document.getElementById('swal-desde') as HTMLInputElement).value,
          hasta: (document.getElementById('swal-hasta') as HTMLInputElement).value,
          programado: (document.getElementById('swal-programado') as HTMLInputElement).checked
        }
      }
    });

    if (formValues) {
      MySwal.fire({
        title: 'Procesando...',
        text: 'Estamos enviando tu solicitud al servidor.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
        customClass: { popup: 'rounded-[2rem]' }
      });

      const sessionStr = localStorage.getItem('egresados-session');
      const session = JSON.parse(sessionStr!);
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

      try {
        const res = await fetch(`${API_URL}/reportes/solicitar`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ tipoReporte: tipo, filtros: formValues })
        });

        if (res.ok) {
          MySwal.fire({
            icon: 'success',
            title: '¡Solicitud enviada!',
            text: formValues.programado 
              ? 'El reporte se generará en segundo plano. Te avisaremos cuando esté listo.'
              : 'El reporte se está generando. Aparecerá en el historial en unos segundos.',
            timer: 3000,
            showConfirmButton: false,
            customClass: { popup: 'rounded-[2rem]' }
          });
          fetchReportes();
        } else {
          const errorData = await res.json().catch(() => ({}));
          MySwal.fire({
            icon: 'error',
            title: 'No se pudo generar el reporte',
            text: errorData.message || 'El servidor respondió con un error. Verifica tus permisos.',
            customClass: { popup: 'rounded-[2rem]' }
          });
        }
      } catch (error) {
        MySwal.fire({ 
          icon: 'error', 
          title: 'Error de conexión',
          text: 'No se pudo contactar con el servidor. Verifica tu conexión.',
          customClass: { popup: 'rounded-[2rem]' }
        });
      }
    }
  };

  const reportesOperacionales = [
    { id: 'egresados_carrera_contacto', label: 'Egresados por Carrera', desc: 'Listado con datos de contacto.', icon: Users, color: 'sky' },
    { id: 'ofertas_activas_requisitos', label: 'Ofertas con Requisitos', desc: 'Detalle de vacantes vigentes.', icon: Briefcase, color: 'emerald' },
    { id: 'postulaciones_por_oferta', label: 'Postulaciones por Oferta', desc: 'Seguimiento de candidatos.', icon: ClipboardList, color: 'amber' },
  ];

  const reportesGestion = [
    { id: 'empleabilidad_carrera_anio', label: 'Reporte de Empleabilidad', desc: 'Egresados empleados vs no empleados.', icon: BarChart3, color: 'emerald' },
    { id: 'demanda_laboral_habilidades', label: 'Demanda Laboral', desc: 'Top habilidades y sectores.', icon: FilePieChart, color: 'amber' },
    { id: 'satisfaccion_empresas', label: 'Satisfacción Empresas', desc: 'Resultados de encuestas.', icon: GraduationCap, color: 'rose' },
    { id: 'comparativo_cohorte', label: 'Comparativo Cohorte', desc: 'Evolución entre promociones.', icon: Send, color: 'violet' },
  ];

  return (
    <div className="space-y-6 p-6 lg:p-8 bg-background text-foreground transition-colors duration-300">
      {/* Header Section */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-400">
              Vista Segura
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Gestión de Reportes</h2>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              Genera reportes operativos y de gestión en PDF profesional con diseño institucional.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex gap-2 p-1 bg-muted/50 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('operacionales')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
            activeTab === 'operacionales' ? "bg-white dark:bg-slate-800 shadow-sm text-sky-600" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Reportes Operacionales
        </button>
        <button 
          onClick={() => setActiveTab('gestion')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
            activeTab === 'gestion' ? "bg-white dark:bg-slate-800 shadow-sm text-indigo-600" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Reportes de Gestión
        </button>
      </div>

      {/* Grid de Reportes Disponibles */}
      <div className={cn("grid gap-6 md:grid-cols-2", activeTab === 'operacionales' ? "lg:grid-cols-3" : "lg:grid-cols-4")}>
        {(activeTab === 'operacionales' ? reportesOperacionales : reportesGestion).map((rep) => (
          <Card 
            key={rep.id} 
            onClick={() => handleNuevoReporte(rep.id, rep.label)}
            className={cn(
              "group relative overflow-hidden border-none transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer",
              rep.color === 'sky' && "bg-sky-500/10 hover:bg-sky-500/15 dark:bg-slate-900/40 dark:hover:bg-slate-900/60 dark:ring-1 dark:ring-sky-500/20",
              rep.color === 'teal' && "bg-teal-500/10 hover:bg-teal-500/15 dark:bg-slate-900/40 dark:hover:bg-slate-900/60 dark:ring-1 dark:ring-teal-500/20",
              rep.color === 'indigo' && "bg-indigo-500/10 hover:bg-indigo-500/15 dark:bg-slate-900/40 dark:hover:bg-slate-900/60 dark:ring-1 dark:ring-indigo-500/20",
              rep.color === 'emerald' && "bg-emerald-500/10 hover:bg-emerald-500/15 dark:bg-slate-900/40 dark:hover:bg-slate-900/60 dark:ring-1 dark:ring-emerald-500/20",
              rep.color === 'amber' && "bg-amber-500/10 hover:bg-amber-500/15 dark:bg-slate-900/40 dark:hover:bg-slate-900/60 dark:ring-1 dark:ring-amber-500/20",
              rep.color === 'rose' && "bg-rose-500/10 hover:bg-rose-500/15 dark:bg-slate-900/40 dark:hover:bg-slate-900/60 dark:ring-1 dark:ring-rose-500/20",
              rep.color === 'violet' && "bg-violet-500/10 hover:bg-violet-500/15 dark:bg-slate-900/40 dark:hover:bg-slate-900/60 dark:ring-1 dark:ring-violet-500/20",
            )}
          >
            <CardContent className="pt-8 text-center relative z-10">
              <div className={cn(
                "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-colors",
                rep.color === 'sky' && "bg-sky-500/10 text-sky-600 group-hover:bg-sky-500 group-hover:text-white",
                rep.color === 'teal' && "bg-teal-500/10 text-teal-600 group-hover:bg-teal-500 group-hover:text-white",
                rep.color === 'indigo' && "bg-indigo-500/10 text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white",
                rep.color === 'emerald' && "bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white",
                rep.color === 'amber' && "bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white",
                rep.color === 'rose' && "bg-rose-500/10 text-rose-600 group-hover:bg-rose-500 group-hover:text-white",
                rep.color === 'violet' && "bg-violet-500/10 text-violet-600 group-hover:bg-violet-500 group-hover:text-white",
              )}>
                <rep.icon size={32} />
              </div>
              <h3 className="font-black text-slate-900 dark:text-white">{rep.label}</h3>
              <p className="mt-1 text-xs text-muted-foreground font-medium italic">{rep.desc}</p>
              
              <div className="mt-4 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 group-hover:translate-x-1 transition-transform">
                Generar <ChevronRight size={14} />
              </div>
            </CardContent>
            {/* Fondo decorativo */}
            <div className={cn(
              "absolute right-[-10px] bottom-[-10px] opacity-10 transition-transform duration-500 group-hover:scale-125",
              rep.color === 'sky' && "text-sky-600 dark:text-sky-500 dark:opacity-20",
              rep.color === 'teal' && "text-teal-600 dark:text-teal-500 dark:opacity-20",
              rep.color === 'indigo' && "text-indigo-600 dark:text-indigo-500 dark:opacity-20",
              rep.color === 'emerald' && "text-emerald-600 dark:text-emerald-500 dark:opacity-20",
              rep.color === 'amber' && "text-amber-600 dark:text-amber-500 dark:opacity-20",
              rep.color === 'rose' && "text-rose-600 dark:text-rose-500 dark:opacity-20",
              rep.color === 'violet' && "text-violet-600 dark:text-violet-500 dark:opacity-20",
            )}>
              <rep.icon size={100} />
            </div>
          </Card>
        ))}
      </div>

      {/* Tabla de Historial */}
      <Card className="rounded-[2.5rem] border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/40 backdrop-blur-2xl shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-white/10 px-8 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Historial de Reportes</CardTitle>
              <p className="text-xs text-muted-foreground italic font-medium">Últimos reportes generados profesionalmente.</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar por ID o tipo..." 
                className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all sm:w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/20">
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Código</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo de Reporte</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha Solicitud</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Estado</th>
                  <th className="px-8 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-8 py-4 h-16 bg-slate-50/20"></td>
                    </tr>
                  ))
                ) : reportes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-10 text-center text-slate-500 font-medium italic">No se han generado reportes todavía.</td>
                  </tr>
                ) : reportes.map((reporte) => (
                  <tr key={reporte.id} className="group transition-colors hover:bg-slate-50/60 dark:hover:bg-white/5">
                    <td className="px-8 py-4">
                      <span className="font-mono text-[10px] font-black bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-slate-500">
                        {reporte.codigo || `#${reporte.id}`}
                      </span>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl p-2 bg-rose-500/10 text-rose-600">
                          <FileText size={16} />
                        </div>
                        <span className="font-black text-slate-700 dark:text-slate-200 text-sm capitalize">
                          {reporte.tipoReporte.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-xs font-semibold text-slate-500">
                      {new Date(reporte.fechaSolicitud).toLocaleDateString()} {new Date(reporte.fechaSolicitud).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-8 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest",
                        reporte.estado === 'completado' && "bg-emerald-500/10 text-emerald-600",
                        reporte.estado === 'generando' && "bg-blue-500/10 text-blue-600",
                        reporte.estado === 'error' && "bg-rose-500/10 text-rose-600"
                      )}>
                        {reporte.estado === 'completado' ? <CheckCircle2 size={12} /> : 
                         reporte.estado === 'generando' ? <Clock size={12} className="animate-spin" /> : <AlertCircle size={12} />}
                        {reporte.estado}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-right">
                      {reporte.urlPdf ? (
                        <a 
                          href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${reporte.urlPdf}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 transition-all hover:bg-sky-500 hover:text-white shadow-lg shadow-sky-500/5 active:scale-90"
                        >
                          <Download size={18} />
                        </a>
                      ) : (
                        <button disabled className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-300 cursor-not-allowed">
                          <Download size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

