"use client";

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { 
  Search, Plus, Edit, Trash2, 
  ChevronLeft, ChevronRight, AlertTriangle,
  ChevronDown, ChevronUp, Filter, RotateCcw,
  GraduationCap, Calendar
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const MySwal = withReactContent(Swal);

interface Egresado {
  id: number;
  nombre: string;
  apellido: string;
  carrera: string;
  anioEgreso: number;
  emailRecuperacion?: string;
  user?: { email: string };
  empleadoActualmente: boolean;
  empresaActual?: string;
  datosContacto?: {
    telefono?: string;
    linkedin?: string;
    direccion?: string;
  };
  habilidades?: { id: number; nombre: string }[];
}

interface Habilidad {
  id: number;
  nombre: string;
}

export default function AdminEgresadosPage() {
  const [egresados, setEgresados] = useState<Egresado[]>([]);
  const [habilidadesDisponibles, setHabilidadesDisponibles] = useState<Habilidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCarrera, setFilterCarrera] = useState('');
  const [filterAnio, setFilterAnio] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    fetchEgresados();
    fetchHabilidades();
  }, [page, filterCarrera, filterAnio, limit]);

  const fetchHabilidades = async () => {
    const sessionStr = localStorage.getItem('egresados-session');
    if (!sessionStr) return;
    const session = JSON.parse(sessionStr);
    const headers = { 'Authorization': `Bearer ${session.access_token}` };
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    
    try {
      const res = await fetch(`${API_URL}/egresados/habilidades/disponibles`, { headers });
      if (res.ok) setHabilidadesDisponibles(await res.json());
    } catch (error) {
      console.error('Error fetching habilidades:', error);
    }
  };

  const fetchEgresados = async () => {
    setLoading(true);
    const sessionStr = localStorage.getItem('egresados-session');
    if (!sessionStr) return;
    const session = JSON.parse(sessionStr);
    const headers = { 
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    };

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filterCarrera && { carrera: filterCarrera }),
        ...(filterAnio && { anioEgreso: filterAnio }),
        ...(searchTerm && { search: searchTerm })
      });

      const res = await fetch(`${API_URL}/egresados?${queryParams}`, { headers });
      if (res.ok) {
        const result = await res.json();
        setEgresados(result.data);
        setTotal(result.total);
      }
    } catch (error) {
      console.error('Error fetching egresados:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEgresadoModal = (egresado: Partial<Egresado> | null = null) => {
    const isEdit = !!egresado?.id;
    const isDark = document.documentElement.classList.contains('dark');
    const egresadoHabilidadesIds = egresado?.habilidades?.map(h => h.id) || [];
    const createEmploymentHtml = `
          <div class="grid grid-cols-1 gap-4">
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase ml-1">¿Está trabajando actualmente?</label>
              <select id="swal-empleado" class="flex h-12 w-full rounded-lg border-2 border-slate-100 bg-white px-4 py-2 text-sm text-black focus:border-sky-500 focus:outline-none transition-all">
                <option value="false" selected>Buscando empleo</option>
                <option value="true">Laborando</option>
              </select>
            </div>
          </div>

          <div id="swal-empleo-detalles" class="grid grid-cols-1 md:grid-cols-3 gap-4" style="display:none;">
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase ml-1">Empresa actual</label>
              <input id="swal-empresa" class="flex h-12 w-full rounded-lg border-2 border-slate-100 bg-white px-4 py-2 text-sm text-black focus:border-sky-500 focus:outline-none transition-all" value="" placeholder="Nombre de la empresa">
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase ml-1">Horario inicio</label>
              <input id="swal-horario-inicio" type="time" class="flex h-12 w-full rounded-lg border-2 border-slate-100 bg-white px-4 py-2 text-sm text-black focus:border-sky-500 focus:outline-none transition-all" value="">
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase ml-1">Horario fin</label>
              <input id="swal-horario-fin" type="time" class="flex h-12 w-full rounded-lg border-2 border-slate-100 bg-white px-4 py-2 text-sm text-black focus:border-sky-500 focus:outline-none transition-all" value="">
            </div>
          </div>
    `;
    const editEmploymentHtml = '';
    
    MySwal.fire({
      title: isEdit ? 'Editar egresado' : 'Nuevo egresado',
      width: '800px',
      html: `
        <div class="space-y-6 pt-4 text-left max-h-[70vh] overflow-y-auto px-2">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase ml-1">Nombre</label>
              <input id="swal-nombre" class="flex h-12 w-full rounded-lg border-2 border-slate-100 bg-white px-4 py-2 text-sm text-black focus:border-sky-500 focus:outline-none transition-all" value="${egresado?.nombre || ''}" placeholder="Nombre">
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase ml-1">Apellido</label>
              <input id="swal-apellido" class="flex h-12 w-full rounded-lg border-2 border-slate-100 bg-white px-4 py-2 text-sm text-black focus:border-sky-500 focus:outline-none transition-all" value="${egresado?.apellido || ''}" placeholder="Apellido">
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase ml-1">Correo Electrónico (Sistema)</label>
              <input id="swal-email" type="email" class="flex h-12 w-full rounded-lg border-2 border-slate-100 bg-white px-4 py-2 text-sm text-black focus:border-sky-500 focus:outline-none transition-all ${isEdit ? 'bg-slate-50 border-slate-50 text-slate-400 cursor-not-allowed' : ''}" value="${egresado?.user?.email || ''}" placeholder="correo@sistema.com" ${isEdit ? 'disabled' : ''}>
              ${isEdit ? '<p class="text-[9px] text-amber-600 font-bold ml-1 italic">⚠️ Acceso al sistema.</p>' : ''}
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase ml-1">Correo de Recuperación (Opcional)</label>
              <input id="swal-email-recuperacion" type="email" class="flex h-12 w-full rounded-lg border-2 border-slate-100 bg-white px-4 py-2 text-sm text-black focus:border-sky-500 focus:outline-none transition-all" value="${egresado?.emailRecuperacion || ''}" placeholder="ejemplo@gmail.com">
              ${isEdit ? '<p class="text-[9px] text-teal-600 font-bold ml-1 italic">Canal seguro para recuperación.</p>' : ''}
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase ml-1">Carrera profesional</label>
              <select id="swal-carrera" class="flex h-12 w-full rounded-lg border-2 border-slate-100 bg-white px-4 py-2 text-sm text-black focus:border-sky-500 focus:outline-none transition-all">
                <option value="">Seleccionar carrera</option>
                <option value="Ingeniería de Sistemas" ${egresado?.carrera === 'Ingeniería de Sistemas' ? 'selected' : ''}>Ingeniería de Sistemas</option>
                <option value="Ingeniería Industrial" ${egresado?.carrera === 'Ingeniería Industrial' ? 'selected' : ''}>Ingeniería Industrial</option>
                <option value="Ingeniería Civil" ${egresado?.carrera === 'Ingeniería Civil' ? 'selected' : ''}>Ingeniería Civil</option>
                <option value="Administración" ${egresado?.carrera === 'Administración' ? 'selected' : ''}>Administración</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase ml-1">Año de Egreso</label>
              <input id="swal-anio" type="number" class="flex h-12 w-full rounded-lg border-2 border-slate-100 bg-white px-4 py-2 text-sm text-black focus:border-sky-500 focus:outline-none transition-all" value="${egresado?.anioEgreso || new Date().getFullYear()}">
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase ml-1">Teléfono</label>
              <input id="swal-telefono" class="flex h-12 w-full rounded-lg border-2 border-slate-100 bg-white px-4 py-2 text-sm text-black focus:border-sky-500 focus:outline-none transition-all" value="${egresado?.datosContacto?.telefono || ''}" placeholder="Ej. 987654321">
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase ml-1">LinkedIn</label>
              <input id="swal-linkedin" class="flex h-12 w-full rounded-lg border-2 border-slate-100 bg-white px-4 py-2 text-sm text-black focus:border-sky-500 focus:outline-none transition-all" value="${egresado?.datosContacto?.linkedin || ''}" placeholder="url del perfil">
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-[10px] font-bold text-slate-400 uppercase ml-1">Dirección</label>
            <input id="swal-direccion" class="flex h-12 w-full rounded-lg border-2 border-slate-100 bg-white px-4 py-2 text-sm text-black focus:border-sky-500 focus:outline-none transition-all" value="${egresado?.datosContacto?.direccion || ''}" placeholder="Dirección de residencia">
          </div>

          ${isEdit ? editEmploymentHtml : createEmploymentHtml}

          <div class="space-y-1">
            <label class="text-[10px] font-bold text-slate-400 uppercase ml-1">Habilidades</label>
            <div class="grid grid-cols-3 gap-2 p-4 bg-slate-50 rounded-xl border-2 border-slate-100 max-h-40 overflow-y-auto">
              ${habilidadesDisponibles.map(h => `
                <div class="flex items-center gap-2">
                  <input type="checkbox" name="swal-habilidades" value="${h.id}" id="hab-${h.id}" class="w-4 h-4 text-teal-600 rounded" ${egresadoHabilidadesIds.includes(h.id) ? 'checked' : ''}>
                  <label for="hab-${h.id}" class="text-xs font-medium text-slate-600 cursor-pointer">${h.nombre}</label>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: isEdit ? 'Guardar cambios' : 'Crear egresado',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0d9488',
      cancelButtonColor: '#64748b',
      background: isDark ? '#1e293b' : '#ffffff',
      color: isDark ? '#f8fafc' : '#475569',
      reverseButtons: true,
      didOpen: () => {
        if (isEdit) return;

        const empleadoSelect = document.getElementById('swal-empleado') as HTMLSelectElement | null;
        const empleoDetalles = document.getElementById('swal-empleo-detalles') as HTMLDivElement | null;

          const toggleEmpleoDetalles = () => {
          const shouldShow = empleadoSelect?.value === 'true';
          if (!empleoDetalles) return;
          empleoDetalles.style.display = shouldShow ? 'grid' : 'none';
        };

        empleadoSelect?.addEventListener('change', toggleEmpleoDetalles);
        toggleEmpleoDetalles();
      },
      customClass: {
        popup: 'rounded-2xl border-none shadow-2xl p-10',
        title: 'text-4xl font-bold text-slate-600 dark:text-slate-200',
        confirmButton: 'rounded-lg px-8 py-3 text-sm font-bold uppercase transition-all hover:opacity-90 cursor-pointer',
        cancelButton: 'rounded-lg px-8 py-3 text-sm font-bold uppercase transition-all hover:opacity-90 cursor-pointer'
      },
      preConfirm: async () => {
        const nombre = (document.getElementById('swal-nombre') as HTMLInputElement).value;
        const apellido = (document.getElementById('swal-apellido') as HTMLInputElement).value;
        const carrera = (document.getElementById('swal-carrera') as HTMLSelectElement).value;
        const anioRaw = (document.getElementById('swal-anio') as HTMLInputElement).value;
        const anioEgreso = anioRaw ? parseInt(anioRaw) : NaN;
        const empleadoActualmente = isEdit ? undefined : (document.getElementById('swal-empleado') as HTMLSelectElement).value === 'true';
        const empresaActual = isEdit ? undefined : (document.getElementById('swal-empresa') as HTMLInputElement).value;
        const horarioInicio = isEdit ? undefined : (document.getElementById('swal-horario-inicio') as HTMLInputElement).value;
        const horarioFin = isEdit ? undefined : (document.getElementById('swal-horario-fin') as HTMLInputElement).value;
        const telefono = (document.getElementById('swal-telefono') as HTMLInputElement).value;
        const linkedin = (document.getElementById('swal-linkedin') as HTMLInputElement).value;
        const direccion = (document.getElementById('swal-direccion') as HTMLInputElement).value;
        const email = (document.getElementById('swal-email') as HTMLInputElement).value;
        const emailRecuperacion = (document.getElementById('swal-email-recuperacion') as HTMLInputElement).value;
        
        const habilidadesCheckboxes = document.querySelectorAll('input[name="swal-habilidades"]:checked') as NodeListOf<HTMLInputElement>;
        const habilidadIds = Array.from(habilidadesCheckboxes).map(cb => parseInt(cb.value));

        if (!nombre || !apellido || !carrera || Number.isNaN(anioEgreso) || (!isEdit && !email)) {
          Swal.showValidationMessage('Campos básicos son obligatorios');
          return false;
        }

        const sessionStr = localStorage.getItem('egresados-session');
        if (!sessionStr) return;
        const session = JSON.parse(sessionStr);
        const headers = {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        };

        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        const method = isEdit ? 'PATCH' : 'POST';
        const url = isEdit ? `${API_URL}/egresados/${egresado?.id}` : `${API_URL}/egresados`;

        const payload = { 
          nombre, 
          apellido, 
          email,
          emailRecuperacion,
          carrera, 
          anioEgreso, 
          ...( !isEdit && { empleadoActualmente, empresaActual, horarioInicio, horarioFin }),
          datosContacto: { telefono, linkedin, direccion },
          ...( !isEdit && { password: 'password123' }) 
        };

        try {
          // 1. Guardar datos principales
          const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Error en el servidor');
          }

          // 2. Si es edición, actualizar habilidades por separado (según el patrón del controlador)
          if (isEdit) {
            const resHab = await fetch(`${API_URL}/egresados/${egresado?.id}/habilidades`, {
              method: 'PUT', 
              headers, 
              body: JSON.stringify({ habilidadIds })
            });
            if (!resHab.ok) throw new Error('Error al actualizar habilidades');
          }

          return true;
        } catch (error) {
          Swal.showValidationMessage(`Error: ${error}`);
          return false;
        }
      }
    }).then((result) => {
      if (result.isConfirmed) {
        fetchEgresados();
        MySwal.fire({ icon: 'success', title: isEdit ? 'Actualizado' : 'Creado', showConfirmButton: false, timer: 1500 });
      }
    });
  };

  const deleteEgresado = async (id: number) => {
    const isDark = document.documentElement.classList.contains('dark');
    const result = await MySwal.fire({
      title: '¿Eliminar registro?',
      text: "Esta acción no se puede deshacer.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      background: isDark ? '#1e293b' : '#ffffff',
      color: isDark ? '#f8fafc' : '#475569',
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'cursor-pointer',
        cancelButton: 'cursor-pointer'
      }
    });

    if (!result.isConfirmed) return;
    
    const sessionStr = localStorage.getItem('egresados-session');
    if (!sessionStr) return;
    const session = JSON.parse(sessionStr);
    const headers = { 'Authorization': `Bearer ${session.access_token}` };
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    
    try {
      const res = await fetch(`${API_URL}/egresados/${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        fetchEgresados();
        MySwal.fire({ icon: 'success', title: 'Eliminado', showConfirmButton: false, timer: 1500 });
      }
    } catch (error) {
      MySwal.fire({ icon: 'error', title: 'Error' });
    }
  };

  return (
    <div className="container mx-auto py-10 px-6 space-y-10 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-4">
            <div className="bg-sky-950 p-3 rounded-2xl text-white shadow-lg shadow-sky-950/20">
              <Search size={28} />
            </div>
            Egresados
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-300 font-medium italic">Administra el padrón de egresados y realiza búsquedas avanzadas.</p>
        </div>
        <button 
          onClick={() => openEgresadoModal()}
          className="inline-flex items-center justify-center rounded-2xl bg-teal-600 px-8 py-4 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-teal-700 shadow-xl shadow-teal-600/20 active:scale-95 cursor-pointer"
        >
          <Plus className="mr-3 h-5 w-5 stroke-[3px]" /> Nuevo Egresado
        </button>
      </div>

      {/* Filters Box */}
      <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-none">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-slate-800 dark:text-slate-200 font-black uppercase tracking-widest text-xs">
              <Filter size={18} className="text-teal-500" /> Filtros de búsqueda
            </div>
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <span>Mostrar:</span>
              <select 
                className="rounded-xl border-none bg-slate-100/50 dark:bg-slate-950/50 px-3 py-1.5 text-[10px] font-black focus:ring-2 focus:ring-teal-500/20 focus:outline-none cursor-pointer shadow-sm"
                value={limit}
                onChange={(e) => {
                  setLimit(parseInt(e.target.value));
                  setPage(1);
                }}
              >
                {[5, 10, 25, 50].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span>registros</span>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
              <input
                type="text"
                placeholder="Escribe para buscar por nombre, apellido o carrera..."
                className="w-full h-14 rounded-3xl border-none bg-slate-100/50 dark:bg-slate-950/50 pl-14 pr-6 text-sm font-bold text-slate-700 dark:text-slate-200 shadow-inner focus:ring-4 focus:ring-teal-500/10 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchEgresados()}
              />
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "h-14 px-8 rounded-3xl text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer shadow-sm",
                  showFilters 
                    ? "bg-sky-950 text-white" 
                    : "bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-100 dark:border-white/10"
                )}
              >
                {showFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />} Filtros
              </button>
              <button 
                onClick={() => {setSearchTerm(''); setFilterCarrera(''); setFilterAnio(''); fetchEgresados();}}
                className="h-14 px-6 rounded-3xl bg-slate-900 dark:bg-slate-700 text-white hover:bg-black dark:hover:bg-slate-600 transition-all cursor-pointer shadow-sm"
              >
                <RotateCcw size={20} />
              </button>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-200 dark:border-white/10 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1 flex items-center gap-2">
                  <GraduationCap size={14} /> Carrera
                </label>
                <select
                  className="w-full h-12 rounded-2xl border-none bg-slate-100/50 dark:bg-slate-950/50 px-4 text-sm font-bold text-slate-600 dark:text-slate-200 cursor-pointer shadow-sm focus:ring-2 focus:ring-teal-500/20"
                  value={filterCarrera}
                  onChange={(e) => setFilterCarrera(e.target.value)}
                >
                  <option value="">Todas las carreras</option>
                  <option value="Ingeniería de Sistemas">Ingeniería de Sistemas</option>
                  <option value="Ingeniería Industrial">Ingeniería Industrial</option>
                  <option value="Ingeniería Civil">Ingeniería Civil</option>
                  <option value="Administración">Administración</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1 flex items-center gap-2">
                  <Calendar size={14} /> Año de Egreso
                </label>
                <select
                  className="w-full h-12 rounded-2xl border-none bg-slate-100/50 dark:bg-slate-950/50 px-4 text-sm font-bold text-slate-600 dark:text-slate-200 cursor-pointer shadow-sm focus:ring-2 focus:ring-teal-500/20"
                  value={filterAnio}
                  onChange={(e) => setFilterAnio(e.target.value)}
                >
                  <option value="">Cualquier año</option>
                  {[2024, 2023, 2022, 2021, 2020, 2019, 2018].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-4">
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Listado de egresados</h2>
          <div className="bg-teal-50 dark:bg-white/5 text-teal-600 dark:text-teal-400 px-6 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border border-teal-100 dark:border-white/10 shadow-sm">
            {total} registros encontrados
          </div>
        </div>

        <div className="rounded-[2.5rem] border border-slate-100 dark:border-white/30 bg-white/80 dark:bg-transparent backdrop-blur-xl overflow-hidden shadow-xl dark:shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-900 dark:bg-white/10 text-white font-black uppercase tracking-[0.15em] text-[10px]">
                <tr>
                  <th className="px-8 py-6 w-24 text-center border-r border-white/5">N°</th>
                  <th className="px-8 py-6">Nombre y Apellido</th>
                  <th className="px-8 py-6">Carrera Profesional</th>
                  <th className="px-8 py-6 text-center">Año</th>
                  <th className="px-8 py-6">Estado Laboral</th>
                  <th className="px-8 py-6 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="px-8 py-8">
                        <div className="h-4 bg-slate-100 dark:bg-white/5 rounded-full w-full"></div>
                      </td>
                    </tr>
                  ))
                ) : egresados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center space-y-4">
                      <AlertTriangle size={48} className="mx-auto text-slate-200" />
                      <p className="text-xl font-bold text-slate-400">No se encontraron egresados con los filtros aplicados.</p>
                    </td>
                  </tr>
                ) : (
                  egresados.map((egresado, index) => (
                    <tr key={egresado.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-all duration-300 group">
                      <td className="px-8 py-6 font-black text-slate-900 dark:text-white text-center text-xs opacity-50 border-r border-slate-100 dark:border-white/5">
                        {((page - 1) * limit + index + 1).toString().padStart(2, '0')}
                      </td>
                      <td className="px-8 py-6">
                        <div className="font-bold text-slate-800 dark:text-white group-hover:text-teal-600 transition-colors">{egresado.nombre} {egresado.apellido}</div>
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-tighter mt-0.5">{egresado.user?.email || 'S/E'}</div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                          <GraduationCap size={14} className="text-teal-500" /> {egresado.carrera}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="text-xs font-black text-slate-400 bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-lg">
                          {egresado.anioEgreso}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span className={cn(
                          "inline-flex items-center rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest border shadow-sm transition-all",
                          egresado.empleadoActualmente 
                            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50" 
                            : "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800/50"
                        )}>
                          <span className={cn(
                            "h-2 w-2 rounded-full mr-2 shadow-sm animate-pulse",
                            egresado.empleadoActualmente ? "bg-emerald-500" : "bg-amber-500"
                          )}></span>
                          {egresado.empleadoActualmente ? 'Laborando' : 'Buscando'}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex justify-center gap-3">
                          <button 
                            onClick={() => openEgresadoModal(egresado)}
                            className="h-10 px-4 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20 active:scale-95"
                          >
                            <Edit size={14} /> Editar
                          </button>
                          <button 
                            onClick={() => deleteEgresado(egresado.id)}
                            className="h-10 px-4 rounded-xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-rose-600/20 active:scale-95"
                          >
                            <Trash2 size={14} /> Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between bg-slate-50/50 dark:bg-white/5 px-10 py-6 border-t border-slate-100 dark:border-white/5">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">
              Página <span className="text-slate-900 dark:text-white font-black">{page}</span> de <span className="text-slate-900 dark:text-white font-black">{Math.ceil(total / limit)}</span>
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:border-teal-500 hover:text-teal-600 disabled:opacity-20 transition-all shadow-sm cursor-pointer active:scale-90"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * limit >= total}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:border-teal-500 hover:text-teal-600 disabled:opacity-20 transition-all shadow-sm cursor-pointer active:scale-90"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}