"use client";

import React, { useState, useEffect } from 'react';
import { 
  Briefcase, Clock, MapPin, Building2, 
  Send, History, AlertCircle, ChevronRight
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

interface Postulacion {
  id: number;
  estado: 'postulado' | 'revision' | 'entrevista' | 'contratado' | 'rechazado';
  fechaPostulacion: string;
  comentariosEmpresa?: string;
  oferta: {
    id: number;
    titulo: string;
    ubicacion: string;
    modalidad: string;
    activa?: boolean;
    empresa: {
      nombre?: string;
      nombre_empresa?: string;
    };
  };
}

interface HistorialItem {
  id: number;
  estadoNuevo?: string;
  estadoAnterior?: string;
  cambiadoPor?: number;
  comentario?: string;
  fechaCambio: string;
}

export default function MisPostulacionesPage() {
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPostulaciones();
  }, []);

  const fetchPostulaciones = async () => {
    setLoading(true);
    const sessionStr = localStorage.getItem('egresados-session');
    if (!sessionStr) return;
    const session = JSON.parse(sessionStr);
    const headers = { 'Authorization': `Bearer ${session.access_token}` };
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    try {
      const res = await fetch(`${API_URL}/ofertas/mis-postulaciones`, { headers });
      if (res.ok) {
        const data = await res.json();
        setPostulaciones(data);
      }
    } catch (error) {
      console.error('Error fetching postulaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const verHistorial = async (postulacionId: number, tituloOferta: string) => {
    const sessionStr = localStorage.getItem('egresados-session');
    const session = JSON.parse(sessionStr!);
    const headers = { 'Authorization': `Bearer ${session.access_token}` };
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    try {
      const res = await fetch(`${API_URL}/ofertas/postulaciones/${postulacionId}/historial`, { headers });
      if (res.ok) {
        const historial: HistorialItem[] = await res.json();
        
        const isDark = document.documentElement.classList.contains('dark');

        MySwal.fire({
          title: 'Historial de Postulación',
          html: `
            <div class="text-left space-y-6 pt-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              <p class="text-sm font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">${tituloOferta}</p>
              <div class="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-linear-to-b before:from-teal-500 before:via-slate-200 before:to-transparent">
                ${historial.map(item => {
                  const estado = (item as any).estadoNuevo ?? (item as any).estado ?? (item as any).estado_nuevo ?? 'postulado';
                  const comentario = (item as any).comentario ?? '';
                  return `
                  <div class="relative flex items-start group">
                    <div class="absolute left-0 h-10 w-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-900 border-2 border-teal-500 shadow-sm z-10">
                      <div class="h-2 w-2 rounded-full bg-teal-500"></div>
                    </div>
                    <div class="ml-14 pt-0.5">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">${estado}</span>
                        <span class="text-[10px] font-bold text-slate-400">${new Date(item.fechaCambio).toLocaleDateString()} ${new Date(item.fechaCambio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <p class="text-sm text-slate-500 dark:text-slate-400 italic">${comentario || 'Sin comentarios adicionales'}</p>
                    </div>
                  </div>
                `}).join('')}
              </div>
            </div>
          `,
          confirmButtonText: 'Cerrar',
          confirmButtonColor: '#0f172a',
          background: isDark ? '#1e293b' : '#ffffff',
          color: isDark ? '#f8fafc' : '#475569',
          customClass: {
            popup: 'rounded-[2.5rem] shadow-2xl border-none p-10',
            title: 'text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100'
          }
        });
      }
    } catch (error) {
      console.error('Error fetching historial:', error);
    }
  };

  const getStatusStyle = (estado: string) => {
    switch (estado) {
      case 'postulado': return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
      case 'revision': return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800';
      case 'entrevista': return 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800';
      case 'contratado': return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800';
      case 'rechazado': return 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const getOfertaStatusStyle = (activa?: boolean) => {
    if (activa === false) {
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60';
    }

    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60';
  };

  return (
    <div className="container mx-auto py-10 px-6 space-y-10 max-w-7xl">
      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-4">
          <div className="bg-teal-600 p-3 rounded-2xl text-white shadow-lg shadow-teal-600/20">
            <Send size={28} />
          </div>
          Mis Postulaciones
        </h1>
        <p className="text-lg text-slate-500 dark:text-slate-300 font-medium italic">Sigue el estado de tus aplicaciones laborales en tiempo real.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800/50 animate-pulse rounded-4xl"></div>
          ))
        ) : postulaciones.length === 0 ? (
          <div className="rounded-[2.5rem] border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl p-20 text-center space-y-4 shadow-sm">
            <AlertCircle size={64} className="mx-auto text-slate-300" />
            <p className="text-xl font-bold text-slate-400">Aún no te has postulado a ninguna oferta laboral.</p>
            <a href="/egresado/ofertas" className="inline-flex text-teal-600 font-bold hover:underline">Explorar ofertas ahora</a>
          </div>
        ) : (
          postulaciones.map((p) => (
            <div key={p.id} className="rounded-[2.5rem] border border-slate-100 dark:border-white/30 hover:shadow-2xl transition-all duration-500 overflow-hidden bg-white/80 dark:bg-transparent backdrop-blur-xl group">
              <div className="p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className="h-16 w-16 rounded-2xl bg-teal-50 dark:bg-white/5 flex items-center justify-center text-teal-600 dark:text-teal-400 border border-transparent dark:border-white/10">
                      <Building2 size={32} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-none group-hover:text-teal-600 transition-colors">{p.oferta.titulo}</h3>
                        {p.oferta.activa === false && (
                          <span className={cn(
                            'inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap',
                            getOfertaStatusStyle(p.oferta.activa)
                          )}>
                            Desactivado
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm font-bold text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5"><Building2 size={14} /> {p.oferta.empresa.nombre ?? p.oferta.empresa.nombre_empresa ?? 'Empresa'}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-white/20"></span>
                        <span className="flex items-center gap-1.5"><MapPin size={14} /> {p.oferta.ubicacion}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm",
                      getStatusStyle(p.estado)
                    )}>
                      {p.estado}
                    </div>
                    <button 
                      onClick={() => verHistorial(p.id, p.oferta.titulo)}
                      className="h-12 w-12 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-all flex items-center justify-center cursor-pointer shadow-sm active:scale-95 border border-slate-200 dark:border-white/10"
                      title="Ver historial de cambios"
                    >
                      <History size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
