"use client";

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import {
  Search, Briefcase, MapPin, Clock,
  DollarSign, Filter, RotateCcw, ChevronDown,
  CheckCircle2, Send, Building2, FileText,
  History, Eye, AlertCircle
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const MySwal = withReactContent(Swal);

interface Oferta {
  id: number;
  titulo: string;
  descripcion: string;
  ubicacion: string;
  modalidad: 'remoto' | 'hibrido' | 'presencial';
  tipoContrato: string;
  salarioMin: number;
  salarioMax: number;
  horarioInicio?: string;
  horarioFin?: string;
  empresa: {
    nombre?: string;
    nombreEmpresa?: string;
  };
  fechaPublicacion: string;
  fechaLimite?: string;
}

interface Postulacion {
  id: number;
  estado: 'postulado' | 'revision' | 'entrevista' | 'contratado' | 'rechazado';
  oferta: { id: number };
}

export default function EgresadoOfertasPage() {
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModalidad, setFilterModalidad] = useState('');
  const [filterContrato, setFilterContrato] = useState('');
  const [filterUbicacion, setFilterUbicacion] = useState('');
  const [filterSalario, setFilterSalario] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(6);
  const [postulacionesMap, setPostulacionesMap] = useState<Map<number, Postulacion>>(new Map());

  useEffect(() => {
    fetchOfertas();
    fetchPostulaciones();
  }, [filterModalidad, filterContrato, filterSalario]);

  useEffect(() => {
    try {
      const sessionStr = localStorage.getItem('egresados-session');
      if (!sessionStr) return;
      const session = JSON.parse(sessionStr);
      const key = `ofertas-vistas:${session.user?.id ?? ''}`;
      if (!key || !session.user?.id) return;

      const visibles = ofertas.slice(0, visibleCount).map(o => o.id);
      if (visibles.length === 0) return;

      const raw = localStorage.getItem(key);
      const prev: number[] = raw ? JSON.parse(raw) : [];
      const set = new Set<number>(Array.isArray(prev) ? prev : []);
      visibles.forEach(id => set.add(id));
      localStorage.setItem(key, JSON.stringify(Array.from(set)));
    } catch {
      return;
    }
  }, [ofertas, visibleCount]);

  const fetchOfertas = async () => {
    setLoading(true);
    const sessionStr = localStorage.getItem('egresados-session');
    if (!sessionStr) return;
    const session = JSON.parse(sessionStr);
    const headers = { 'Authorization': `Bearer ${session.access_token}` };
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    try {
      const params = new URLSearchParams();
      if (filterModalidad) params.append('modalidad', filterModalidad);
      if (filterContrato) params.append('tipoContrato', filterContrato);
      if (filterUbicacion) params.append('ubicacion', filterUbicacion);
      if (filterSalario) params.append('salarioMin', filterSalario);
      if (searchTerm) params.append('search', searchTerm);

      const res = await fetch(`${API_URL}/ofertas?${params.toString()}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setOfertas(data);
        setVisibleCount(6);
      }
    } catch (error) {
      console.error('Error fetching ofertas:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPostulaciones = async () => {
    const sessionStr = localStorage.getItem('egresados-session');
    if (!sessionStr) return;
    const session = JSON.parse(sessionStr);
    const headers = { 'Authorization': `Bearer ${session.access_token}` };
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    try {
      const res = await fetch(`${API_URL}/ofertas/mis-postulaciones`, { headers });
      if (res.ok) {
        const data: Postulacion[] = await res.json();
        const map = new Map<number, Postulacion>();
        data.forEach(p => map.set(p.oferta.id, p));
        setPostulacionesMap(map);
      }
    } catch (error) {
      console.error('Error fetching postulaciones:', error);
    }
  };

  const verHistorialPostulacion = async (postulacionId: number, tituloOferta: string) => {
    const sessionStr = localStorage.getItem('egresados-session');
    const session = JSON.parse(sessionStr!);
    const headers = { 'Authorization': `Bearer ${session.access_token}` };
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    try {
      const res = await fetch(`${API_URL}/ofertas/postulaciones/${postulacionId}/historial`, { headers });
      if (res.ok) {
        const historial = await res.json();
        const isDark = document.documentElement.classList.contains('dark');

        MySwal.fire({
          title: 'Historial de Postulación',
          html: `
            <div class="text-left space-y-6 pt-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              <p class="text-sm font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">${tituloOferta}</p>
              <div class="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-linear-to-b before:from-teal-500 before:via-slate-200 before:to-transparent">
                ${historial.map((item: any) => {
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

  const handlePostular = async (ofertaId: number, titulo: string) => {
    const sessionStr = localStorage.getItem('egresados-session');
    if (!sessionStr) return;
    const session = JSON.parse(sessionStr!);
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    // Try to fetch perfil to check employment and horarios
    let perfil: any = null;
    try {
      const perfilRes = await fetch(`${API_URL}/egresados/perfil`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (perfilRes.ok) perfil = await perfilRes.json();
    } catch (e) {
      console.error('No se pudo obtener perfil para validar horarios', e);
    }

    const ofertaObj = ofertas.find((o) => o.id === ofertaId);
    const perfilInicio = perfil?.horarioInicio ?? null;
    const perfilFin = perfil?.horarioFin ?? null;
    const ofertaInicio = ofertaObj?.horarioInicio ?? null;
    const ofertaFin = ofertaObj?.horarioFin ?? null;

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
          // Overlap detection: oferta interval intersects perfil interval
          if (oStart < pEnd && oEnd > pStart) showWarning = true;
        }
      }
    } catch (e) {
      console.error('Error al comparar horarios', e);
    }

    const title = showWarning ? 'Advertencia: posible conflicto de horarios' : '¿Confirmar postulación?';
    const text = showWarning
      ? `Atención: tu horario actual (${perfilInicio?.substring(0, 5) ?? '--:--'} - ${perfilFin?.substring(0, 5) ?? '--:--'}) parece solaparse con el horario de la oferta (${ofertaInicio?.substring(0, 5) ?? '--:--'} - ${ofertaFin?.substring(0, 5) ?? '--:--'}). ¿Aún deseas postularte a: ${titulo}?`
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
        cancelButton: 'rounded-xl px-6 py-3',
      },
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}/ofertas/${ofertaId}/postular`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        MySwal.fire({
          icon: 'success',
          title: '¡Postulación enviada!',
          text: 'Puedes ver el estado en "Mis Postulaciones".',
          showConfirmButton: false,
          timer: 2000,
          customClass: { popup: 'rounded-3xl' },
        });
        // Refresh postulaciones map to reflect new state
        fetchPostulaciones();
      } else {
        const err = await res.json().catch(() => ({}));
        MySwal.fire({
          icon: 'error',
          title: 'Aviso',
          text: err.message || 'Ya te has postulado a esta oferta',
          customClass: { popup: 'rounded-3xl' },
        });
      }
    } catch (error) {
      MySwal.fire({ icon: 'error', title: 'Error de conexión' });
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterModalidad('');
    setFilterContrato('');
    setFilterUbicacion('');
    setFilterSalario('');
    fetchOfertas();
  };

  return (
    <div className="container mx-auto py-10 px-6 space-y-10 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-4">
            <div className="bg-teal-600 p-3 rounded-2xl text-white shadow-lg shadow-teal-600/20">
              <Briefcase size={28} />
            </div>
            Oportunidades Laborales
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-300 font-medium italic">Filtra y encuentra el trabajo que mejor se adapte a tu perfil profesional.</p>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-2xl rounded-[2.5rem] p-8 border border-slate-200 dark:border-white/10 dark:shadow-none transition-colors duration-300">
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
              <input
                type="text"
                placeholder="Buscar por cargo, empresa o palabras clave..."
                className="w-full h-14 rounded-3xl border-none bg-slate-100/50 dark:bg-slate-950/50 pl-14 pr-6 text-sm font-bold text-slate-700 dark:text-slate-100 shadow-inner focus:ring-4 focus:ring-teal-500/10 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchOfertas()}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "h-14 px-8 rounded-3xl text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer shadow-sm",
                  showFilters
                    ? "bg-teal-600 text-white"
                    : "bg-white dark:bg-white/5 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-100 dark:border-white/10"
                )}
              >
                <Filter size={18} /> Filtros {showFilters ? 'activos' : ''}
              </button>
              <button
                onClick={resetFilters}
                className="h-14 px-6 rounded-3xl bg-slate-900 dark:bg-slate-800 text-white hover:bg-black dark:hover:bg-slate-700 transition-all cursor-pointer shadow-sm"
              >
                <RotateCcw size={20} />
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-6 border-t border-slate-200 dark:border-white/10 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Modalidad</label>
                <select
                  className="w-full h-12 rounded-2xl border-none bg-slate-100/50 dark:bg-slate-950/50 px-4 text-sm font-bold text-slate-600 dark:text-slate-100 cursor-pointer shadow-sm focus:ring-2 focus:ring-teal-500/20"
                  value={filterModalidad}
                  onChange={(e) => setFilterModalidad(e.target.value)}
                >
                  <option value="" className="bg-white dark:bg-slate-900">Todas</option>
                  <option value="remoto" className="bg-white dark:bg-slate-900">Remoto</option>
                  <option value="hibrido" className="bg-white dark:bg-slate-900">Híbrido</option>
                  <option value="presencial" className="bg-white dark:bg-slate-900">Presencial</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Ubicación</label>
                <input
                  className="w-full h-12 rounded-2xl border-none bg-slate-100/50 dark:bg-slate-950/50 px-4 text-sm font-bold text-slate-700 dark:text-slate-100 shadow-sm focus:ring-2 focus:ring-teal-500/20"
                  placeholder="Ej. Lima, Perú"
                  value={filterUbicacion}
                  onChange={(e) => setFilterUbicacion(e.target.value)}
                  onBlur={fetchOfertas}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Tipo Contrato</label>
                <select
                  className="w-full h-12 rounded-2xl border-none bg-slate-100/50 dark:bg-slate-950/50 px-4 text-sm font-bold text-slate-600 dark:text-slate-100 cursor-pointer shadow-sm focus:ring-2 focus:ring-teal-500/20"
                  value={filterContrato}
                  onChange={(e) => setFilterContrato(e.target.value)}
                >
                  <option value="" className="bg-white dark:bg-slate-900">Cualquiera</option>
                  <option value="Tiempo Completo" className="bg-white dark:bg-slate-900">Tiempo Completo</option>
                  <option value="Medio Tiempo" className="bg-white dark:bg-slate-900">Part-time</option>
                  <option value="Freelance" className="bg-white dark:bg-slate-900">Freelance</option>
                  <option value="Practicas" className="bg-white dark:bg-slate-900">Prácticas</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Salario Mínimo</label>
                <select
                  className="w-full h-12 rounded-2xl border-none bg-slate-100/50 dark:bg-slate-950/50 px-4 text-sm font-bold text-slate-600 dark:text-slate-100 cursor-pointer shadow-sm focus:ring-2 focus:ring-teal-500/20"
                  value={filterSalario}
                  onChange={(e) => setFilterSalario(e.target.value)}
                >
                  <option value="" className="bg-white dark:bg-slate-900">Sin mínimo</option>
                  <option value="1000" className="bg-white dark:bg-slate-900">$1,000+</option>
                  <option value="2000" className="bg-white dark:bg-slate-900">$2,000+</option>
                  <option value="3000" className="bg-white dark:bg-slate-900">$3,000+</option>
                  <option value="5000" className="bg-white dark:bg-slate-900">$5,000+</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="-mt-6 space-y-4">
        {/* Contador de ofertas */}
        {!loading && ofertas.length > 0 && (
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-black text-slate-800 dark:text-white">
              {ofertas.length}
            </span>
            <span className="text-lg font-bold text-slate-500 dark:text-slate-400">
              {ofertas.length === 1 ? 'oferta encontrada' : 'ofertas encontradas'}
            </span>
          </div>
        )}

        {/* Offers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-64 bg-slate-100 dark:bg-slate-800/50 animate-pulse rounded-[2.5rem]"></div>
            ))
          ) : ofertas.length === 0 ? (
            <div className="col-span-full py-20 text-center space-y-4">
              <AlertCircle size={48} className="mx-auto text-slate-300" />
              <p className="text-xl font-bold text-slate-400">No encontramos ofertas que coincidan con tus filtros.</p>
            </div>
          ) : (
            ofertas.slice(0, visibleCount).map((oferta) => (
              <div key={oferta.id} className="rounded-[2.5rem] border border-black/20 dark:border-white/30 bg-white/80 dark:bg-transparent backdrop-blur-2xl hover:shadow-xl dark:hover:bg-white/5 transition-all duration-500 overflow-hidden group">
                <div className="p-10 space-y-8">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-teal-600 dark:text-teal-400 font-black text-sm uppercase tracking-widest">
                        <Building2 size={16} /> {oferta.empresa.nombreEmpresa ?? oferta.empresa.nombre ?? 'Empresa no registrada'}
                      </div>
                      <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight leading-none group-hover:text-teal-600 transition-colors">{oferta.titulo}</h3>
                    </div>
                    <div className="bg-slate-100 dark:bg-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-200 border border-slate-200 dark:border-white/20">
                      {oferta.modalidad}
                    </div>
                  </div>

                  <p className="text-slate-500 dark:text-slate-300 text-sm leading-relaxed line-clamp-3 italic">{oferta.descripcion}</p>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 bg-slate-50/80 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/10">
                      <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm"><MapPin size={18} className="text-teal-500" /></div>
                      <div className="overflow-hidden">
                        <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-tighter">Ubicación</p>
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-100 truncate">{oferta.ubicacion}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50/80 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/10">
                      <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm"><DollarSign size={18} className="text-teal-500" /></div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-tighter">Rango Salarial</p>
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-100">${oferta.salarioMin.toLocaleString()} - ${oferta.salarioMax.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50/80 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/10">
                      <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm"><Clock size={18} className="text-amber-500" /></div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-tighter">Horario Laboral</p>
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-100">
                          {oferta.horarioInicio?.substring(0, 5) || '--:--'} - {oferta.horarioFin?.substring(0, 5) || '--:--'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50/80 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/10">
                      <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm"><History size={18} className={cn(oferta.fechaLimite ? "text-rose-500" : "text-slate-400")} /></div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-tighter">Fecha Límite</p>
                        <p className={cn(
                          "text-xs font-bold",
                          oferta.fechaLimite ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"
                        )}>
                          {oferta.fechaLimite 
                            ? new Date(oferta.fechaLimite).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) 
                            : 'Sin fecha límite'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-100 dark:border-white/10 flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-widest flex items-center gap-2">
                        <Clock size={14} /> Publicado hoy
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handlePostular(oferta.id, oferta.titulo)}
                        disabled={postulacionesMap.has(oferta.id)}
                        className={cn(
                          "inline-flex items-center justify-center rounded-2xl px-10 py-4 text-sm font-black uppercase tracking-widest transition-all shadow-xl active:scale-95",
                          postulacionesMap.has(oferta.id)
                            ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none hover:bg-slate-300"
                            : "bg-teal-600 text-white hover:bg-teal-700 shadow-teal-600/20 cursor-pointer"
                        )}
                      >
                        <Send className="mr-3 h-4 w-4" /> {postulacionesMap.has(oferta.id) ? 'Postulando' : 'Postular'}
                      </button>
                      {postulacionesMap.has(oferta.id) && (
                        <button
                          onClick={() => {
                            const postulacion = postulacionesMap.get(oferta.id)!;
                            verHistorialPostulacion(postulacion.id, oferta.titulo);
                          }}
                          className="h-14 w-14 rounded-2xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-500/20 transition-all flex items-center justify-center cursor-pointer shadow-sm active:scale-95 border border-teal-200 dark:border-teal-500/30"
                          title="Ver estado de postulación"
                        >
                          <Clock size={20} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Botón Ver más */}
        {!loading && visibleCount < ofertas.length && (
          <div className="flex justify-center pt-4">
            <button
              onClick={() => setVisibleCount(prev => prev + 6)}
              className="inline-flex items-center gap-3 px-10 py-4 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 shadow-sm transition-all cursor-pointer"
            >
              <ChevronDown size={18} />
              Ver más ({ofertas.length - visibleCount} restantes)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
