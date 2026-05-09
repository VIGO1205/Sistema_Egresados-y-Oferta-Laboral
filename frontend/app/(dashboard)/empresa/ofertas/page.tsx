"use client";

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { 
  Plus, Edit, Trash2, Search, Briefcase, 
  MapPin, Clock, DollarSign, Users, 
  ChevronDown, Filter, RotateCcw, History, Eye, Download
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
  fechaLimite?: string;
  activa: boolean;
  fechaPublicacion: string;
}

interface Postulante {
  id: number;
  egresado: {
    id: number;
    nombre: string;
    apellido: string;
    carrera: string;
    user: {
      email: string;
    }
  };
  estado: 'postulado' | 'revision' | 'entrevista' | 'contratado' | 'rechazado';
  fechaPostulacion: string;
  comentariosEmpresa?: string;
}

interface Habilidad {
  id: number;
  nombre: string;
  tipo?: string;
}

interface EgresadoProfile {
  id: number;
  nombre: string;
  apellido: string;
  carrera: string;
  anioEgreso: number;
  cvUrl: string | null;
  empleadoActualmente: boolean;
  empresaActual: string | null;
  user: {
    email: string;
  };
  habilidades: Habilidad[];
}

export default function EmpresaOfertasPage() {
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(6);

  useEffect(() => {
    fetchOfertas();
  }, []);

  const fetchOfertas = async () => {
    setLoading(true);
    const sessionStr = localStorage.getItem('egresados-session');
    if (!sessionStr) return;
    const session = JSON.parse(sessionStr);
    const headers = { 'Authorization': `Bearer ${session.access_token}` };
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    
    try {
      const res = await fetch(`${API_URL}/ofertas?mine=true`, { headers });
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

  const openOfertaModal = (oferta: Partial<Oferta> | null = null) => {
    const isEdit = !!oferta?.id;
    const isDark = document.documentElement.classList.contains('dark');
    
    MySwal.fire({
      title: isEdit ? 'Editar Oferta' : 'Nueva Oferta Laboral',
      html: `
        <div class="space-y-4 pt-4 text-left">
          <input id="swal-titulo" class="flex h-12 w-full rounded-lg border-2 border-slate-100 bg-white px-4 py-2 text-sm text-black focus:border-teal-500 focus:outline-none transition-all" value="${oferta?.titulo || ''}" placeholder="Título de la vacante">
          <textarea id="swal-descripcion" class="flex h-32 w-full rounded-lg border-2 border-slate-100 bg-white px-4 py-2 text-sm text-black focus:border-teal-500 focus:outline-none transition-all" placeholder="Descripción de la oferta">${oferta?.descripcion || ''}</textarea>
          <div class="grid grid-cols-2 gap-4">
            <input id="swal-ubicacion" class="flex h-12 w-full rounded-lg border-2 border-slate-100 bg-white px-4 py-2 text-sm text-black focus:border-teal-500 focus:outline-none transition-all" value="${oferta?.ubicacion || ''}" placeholder="Ubicación">
            <select id="swal-modalidad" class="flex h-12 w-full rounded-lg border-2 border-slate-100 bg-white px-4 py-2 text-sm text-black focus:border-teal-500 focus:outline-none transition-all">
              <option value="presencial" ${oferta?.modalidad === 'presencial' ? 'selected' : ''}>Presencial</option>
              <option value="remoto" ${oferta?.modalidad === 'remoto' ? 'selected' : ''}>Remoto</option>
              <option value="hibrido" ${oferta?.modalidad === 'hibrido' ? 'selected' : ''}>Híbrido</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <input id="swal-salarioMin" type="number" class="flex h-12 w-full rounded-lg border-2 border-slate-100 bg-white px-4 py-2 text-sm text-black focus:border-teal-500 focus:outline-none transition-all" value="${oferta?.salarioMin || ''}" placeholder="Salario Mín">
            <input id="swal-salarioMax" type="number" class="flex h-12 w-full rounded-lg border-2 border-slate-100 bg-white px-4 py-2 text-sm text-black focus:border-teal-500 focus:outline-none transition-all" value="${oferta?.salarioMax || ''}" placeholder="Salario Máx">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Horario Inicio</label>
              <input id="swal-horarioInicio" type="time" class="flex h-12 w-full rounded-lg border-2 border-slate-100 bg-white px-4 py-2 text-sm text-black focus:border-teal-500 focus:outline-none transition-all" value="${oferta?.horarioInicio || '08:00'}">
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Horario Fin</label>
              <input id="swal-horarioFin" type="time" class="flex h-12 w-full rounded-lg border-2 border-slate-100 bg-white px-4 py-2 text-sm text-black focus:border-teal-500 focus:outline-none transition-all" value="${oferta?.horarioFin || '17:00'}">
            </div>
          </div>
          <div class="space-y-1">
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Fecha Límite (Opcional)</label>
            <input id="swal-fechaLimite" type="date" class="flex h-12 w-full rounded-lg border-2 border-slate-100 bg-white px-4 py-2 text-sm text-black focus:border-teal-500 focus:outline-none transition-all" value="${oferta?.fechaLimite ? new Date(oferta.fechaLimite).toISOString().split('T')[0] : ''}">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: isEdit ? 'Guardar' : 'Publicar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0d9488',
      cancelButtonColor: '#64748b',
      background: isDark ? '#1e293b' : '#ffffff',
      color: isDark ? '#f8fafc' : '#475569',
      customClass: {
        popup: 'rounded-2xl shadow-2xl p-10',
        title: 'text-3xl font-bold',
        confirmButton: 'rounded-lg px-8 py-3 text-sm font-bold uppercase cursor-pointer',
        cancelButton: 'rounded-lg px-8 py-3 text-sm font-bold uppercase cursor-pointer'
      },
      preConfirm: async () => {
        const titulo = (document.getElementById('swal-titulo') as HTMLInputElement).value;
        const descripcion = (document.getElementById('swal-descripcion') as HTMLTextAreaElement).value;
        const ubicacion = (document.getElementById('swal-ubicacion') as HTMLInputElement).value;
        const modalidad = (document.getElementById('swal-modalidad') as HTMLSelectElement).value;
        const salarioMin = parseFloat((document.getElementById('swal-salarioMin') as HTMLInputElement).value);
        const salarioMax = parseFloat((document.getElementById('swal-salarioMax') as HTMLInputElement).value);
        const horarioInicio = (document.getElementById('swal-horarioInicio') as HTMLInputElement).value;
        const horarioFin = (document.getElementById('swal-horarioFin') as HTMLInputElement).value;
        const fechaLimite = (document.getElementById('swal-fechaLimite') as HTMLInputElement).value;

        if (!titulo || !descripcion) {
          Swal.showValidationMessage('Título y descripción son obligatorios');
          return false;
        }

        const sessionStr = localStorage.getItem('egresados-session');
        const session = JSON.parse(sessionStr!);
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        const method = isEdit ? 'PATCH' : 'POST';
        const url = isEdit ? `${API_URL}/ofertas/${oferta?.id}` : `${API_URL}/ofertas`;

        try {
          const res = await fetch(url, {
            method,
            headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              titulo, 
              descripcion, 
              ubicacion, 
              modalidad, 
              salarioMin, 
              salarioMax, 
              horarioInicio, 
              horarioFin,
              fechaLimite: fechaLimite || null
            })
          });
          if (!res.ok) throw new Error('Error al guardar');
          return true;
        } catch (error) {
          Swal.showValidationMessage(`Error: ${error}`);
          return false;
        }
      }
    }).then((result) => {
      if (result.isConfirmed) {
        fetchOfertas();
        MySwal.fire({ icon: 'success', title: isEdit ? 'Actualizada' : 'Publicada', showConfirmButton: false, timer: 1500 });
      }
    });
  };

  const deleteOferta = async (id: number) => {
    const result = await MySwal.fire({
      title: '¿Eliminar oferta?',
      text: "La oferta dejará de ser visible para los egresados.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
    });

    if (!result.isConfirmed) return;
    
    const sessionStr = localStorage.getItem('egresados-session');
    const session = JSON.parse(sessionStr!);
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    
    try {
      await fetch(`${API_URL}/ofertas/${id}`, { 
        method: 'DELETE', 
        headers: { 'Authorization': `Bearer ${session.access_token}` } 
      });
      fetchOfertas();
      MySwal.fire({ icon: 'success', title: 'Eliminada', showConfirmButton: false, timer: 1500 });
    } catch (error) {
      MySwal.fire({ icon: 'error', title: 'Error' });
    }
  };

  const reactivateOferta = async (id: number) => {
    const result = await MySwal.fire({
      title: '¿Reactivar oferta?',
      text: "La oferta volverá a ser visible para los egresados.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, reactivar',
      confirmButtonColor: '#0d9488',
      cancelButtonColor: '#64748b',
    });

    if (!result.isConfirmed) return;
    
    const sessionStr = localStorage.getItem('egresados-session');
    const session = JSON.parse(sessionStr!);
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    
    try {
      await fetch(`${API_URL}/ofertas/${id}/reactivate`, { 
        method: 'PATCH', 
        headers: { 'Authorization': `Bearer ${session.access_token}` } 
      });
      fetchOfertas();
      MySwal.fire({ icon: 'success', title: 'Reactivada', showConfirmButton: false, timer: 1500 });
    } catch (error) {
      MySwal.fire({ icon: 'error', title: 'Error' });
    }
  };

  const handleUpdatePostulacion = async (postulacionId: number, currentEstado: string, ofertaId: number) => {
    const isDark = document.documentElement.classList.contains('dark');
    
    const { value: formValues } = await MySwal.fire({
      title: 'Gestionar Postulante',
      html: `
        <div class="space-y-4 pt-4 text-left">
          <div class="space-y-1">
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Estado de la Postulación</label>
            <select id="swal-estado" class="flex h-12 w-full rounded-lg border-2 border-slate-100 bg-white px-4 py-2 text-sm text-black focus:border-teal-500 focus:outline-none transition-all">
              <option value="postulado" ${currentEstado === 'postulado' ? 'selected' : ''}>Postulado</option>
              <option value="revision" ${currentEstado === 'revision' ? 'selected' : ''}>En Revisión</option>
              <option value="entrevista" ${currentEstado === 'entrevista' ? 'selected' : ''}>Entrevista</option>
              <option value="contratado" ${currentEstado === 'contratado' ? 'selected' : ''}>Contratado</option>
              <option value="rechazado" ${currentEstado === 'rechazado' ? 'selected' : ''}>Rechazado</option>
            </select>
          </div>
          <div class="space-y-1">
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Comentarios (Opcional)</label>
            <textarea id="swal-comentarios" class="flex h-24 w-full rounded-lg border-2 border-slate-100 bg-white px-4 py-2 text-sm text-black placeholder-slate-600 focus:border-teal-500 focus:outline-none transition-all" placeholder="Escribe un comentario para el egresado..."></textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Actualizar Estado',
      confirmButtonColor: '#0d9488',
      background: isDark ? '#1e293b' : '#ffffff',
      color: isDark ? '#f8fafc' : '#475569',
      customClass: {
        popup: 'rounded-2xl shadow-2xl p-8',
        confirmButton: 'rounded-lg px-6 py-3 text-sm font-bold uppercase',
        cancelButton: 'rounded-lg px-6 py-3 text-sm font-bold uppercase'
      },
      preConfirm: () => {
        return {
          estado: (document.getElementById('swal-estado') as HTMLSelectElement).value,
          comentariosEmpresa: (document.getElementById('swal-comentarios') as HTMLTextAreaElement).value
        }
      }
    });

    if (formValues) {
      const sessionStr = localStorage.getItem('egresados-session');
      const session = JSON.parse(sessionStr!);
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

      try {
        const res = await fetch(`${API_URL}/ofertas/postulaciones/${postulacionId}/status`, {
          method: 'PUT',
          headers: { 
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formValues)
        });

        if (res.ok) {
          MySwal.fire({ icon: 'success', title: 'Estado actualizado', showConfirmButton: false, timer: 1500 });
          viewPostulantes(ofertaId); // Recargar la lista
        }
      } catch (error) {
        MySwal.fire({ icon: 'error', title: 'Error al actualizar' });
      }
    }
  };

  const viewPerfilPostulante = async (egresadoId: number, nombre: string, apellido: string) => {
    const sessionStr = localStorage.getItem('egresados-session');
    const session = JSON.parse(sessionStr!);
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const isDark = document.documentElement.classList.contains('dark');

    try {
      const res = await fetch(`${API_URL}/egresados/${egresadoId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      if (!res.ok) throw new Error();
      const profile: EgresadoProfile = await res.json();

      const habilidadesHTML = profile.habilidades && profile.habilidades.length > 0
        ? profile.habilidades.map(h => `
            <div class="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
              <span class="font-medium text-slate-700 dark:text-slate-200">${h.nombre}</span>
              <span class="px-2 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded text-xs font-bold">
                ${h.tipo || 'general'}
              </span>
            </div>
          `).join('')
        : '<p class="text-slate-400 text-center py-4">Sin habilidades registradas</p>';

      MySwal.fire({
        title: `Perfil de ${profile.nombre} ${profile.apellido}`,
        width: '920px',
        background: isDark ? '#0f172a' : '#ffffff',
        color: isDark ? '#f8fafc' : '#0f172a',
        html: `
          <div class="pt-2 text-left">
            <div class="flex items-center gap-4 mb-4">
              <div class="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg font-bold text-slate-700 dark:text-slate-200">${(profile.nombre || 'E').charAt(0)}${(profile.apellido || 'X').charAt(0)}</div>
              <div>
                <div class="text-lg font-bold text-slate-800 dark:text-slate-100">${profile.nombre} ${profile.apellido}</div>
                <div class="text-xs text-slate-500 dark:text-slate-400">${profile.carrera} • ${profile.anioEgreso}</div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-6">
              <div>
                <div class="mb-3 text-xs text-slate-500">Contacto</div>
                <div class="text-sm text-slate-800 dark:text-slate-200 mb-3">${profile.user?.email || 'N/D'}</div>

                <div class="mb-3 text-xs text-slate-500">Estado laboral</div>
                <div class="flex items-center gap-3 mb-3">
                  <span class="px-3 py-1 rounded-full text-sm font-semibold ${profile.empleadoActualmente ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-600'}">${profile.empleadoActualmente ? 'Trabajando' : 'No trabaja'}</span>
                  ${profile.empleadoActualmente && profile.empresaActual ? `<span class="text-sm text-slate-600 dark:text-slate-400">${profile.empresaActual}</span>` : ''}
                </div>

                <div class="mb-3 text-xs text-slate-500">Curriculum</div>
                <div>
                  ${profile.cvUrl ? `<a href="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${profile.cvUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-slate-800 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400" style="color:#ffffff;">Descargar CV</a>` : `<div class="text-sm text-slate-400">CV no disponible</div>`}
                </div>
              </div>

              <div>
                <div class="mb-3 text-xs text-slate-500">Habilidades</div>
                <div class="grid gap-2 max-h-56 overflow-auto pr-2">
                  ${profile.habilidades && profile.habilidades.length > 0 ? profile.habilidades.map(h => `
                    <div class="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <div class="text-sm text-slate-800 dark:text-slate-200">${h.nombre}</div>
                      <div class="text-xs text-slate-500">${h.tipo || ''}</div>
                    </div>
                  `).join('') : '<div class="text-sm text-slate-400">Sin habilidades registradas</div>'}
                </div>
              </div>
            </div>
          </div>
        `,
        showConfirmButton: false,
        showCloseButton: true,
        customClass: {
          popup: 'rounded-[1.75rem] p-6 shadow-2xl border border-slate-200/60 dark:border-white/10',
        }
      });
    } catch (error) {
      MySwal.fire({ icon: 'error', title: 'Error al cargar perfil del postulante' });
    }
  };

  const viewPostulantes = async (ofertaId: number) => {
    const sessionStr = localStorage.getItem('egresados-session');
    const session = JSON.parse(sessionStr!);
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const isDark = document.documentElement.classList.contains('dark');

    try {
      const res = await fetch(`${API_URL}/ofertas/${ofertaId}/postulaciones`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      if (!res.ok) throw new Error();
      const postulantes: Postulante[] = await res.json();

      MySwal.fire({
        title: 'Postulantes',
        width: '800px',
        background: isDark ? '#1e293b' : '#ffffff',
        color: isDark ? '#f8fafc' : '#475569',
        html: `
          <div class="mt-4 overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-slate-200 dark:border-slate-700">
                  <th class="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Postulante</th>
                  <th class="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Carrera</th>
                  <th class="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Estado</th>
                  <th class="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Acción</th>
                </tr>
              </thead>
              <tbody>
                ${postulantes.length === 0 ? `
                  <tr>
                    <td colspan="4" class="py-10 text-center text-slate-400 font-bold">No hay postulaciones para esta oferta.</td>
                  </tr>
                ` : postulantes.map(p => `
                  <tr class="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td class="py-4 px-4">
                      <div class="font-bold text-slate-700 dark:text-slate-200">${p.egresado.nombre} ${p.egresado.apellido}</div>
                      <div class="text-xs text-slate-400">${p.egresado.user.email}</div>
                    </td>
                    <td class="py-4 px-4 text-sm text-slate-500 dark:text-slate-400">${p.egresado.carrera}</td>
                    <td class="py-4 px-4">
                      <span class="inline-flex items-center justify-center whitespace-nowrap min-w-27 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.16em] leading-none text-center ${
                        p.estado === 'contratado' ? 'bg-emerald-100 text-emerald-700' :
                        p.estado === 'rechazado' ? 'bg-rose-100 text-rose-700' :
                        p.estado === 'entrevista' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }">
                        ${p.estado}
                      </span>
                    </td>
                    <td class="py-4 px-4">
                      <div class="flex gap-2">
                        <button onclick="window.viewPerfilPostulante(${p.egresado.id}, '${p.egresado.nombre}', '${p.egresado.apellido}')" class="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer" title="Ver perfil">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                        <button onclick="window.updatePostulacionStatus(${p.id}, '${p.estado}', ${ofertaId})" class="p-2 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg hover:bg-teal-100 transition-colors cursor-pointer" title="Editar estado">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `,
        showConfirmButton: false,
        showCloseButton: true,
        customClass: {
          popup: 'rounded-3xl shadow-2xl',
        },
        didOpen: () => {
          // Exponer las funciones globalmente para que el onclick del HTML de SweetAlert funcione
          (window as any).updatePostulacionStatus = (id: number, estado: string, oId: number) => {
            handleUpdatePostulacion(id, estado, oId);
          };
          (window as any).viewPerfilPostulante = (egresadoId: number, nombre: string, apellido: string) => {
            viewPerfilPostulante(egresadoId, nombre, apellido);
          };
        }
      });
    } catch (error) {
      MySwal.fire({ icon: 'error', title: 'Error al cargar postulantes' });
    }
  };

  return (
    <div className="container mx-auto py-10 px-6 space-y-10 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-4">
            <div className="bg-teal-600 p-3 rounded-2xl text-white shadow-lg shadow-teal-600/20">
              <Briefcase size={28} />
            </div>
            Mis Ofertas Laborales
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-300 font-medium italic">Gestiona las vacantes de tu empresa y revisa los postulantes.</p>
        </div>
        <button 
          onClick={() => openOfertaModal()}
          className="inline-flex items-center justify-center rounded-2xl bg-teal-600 px-8 py-4 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-teal-700 shadow-xl shadow-teal-600/20 active:scale-95 cursor-pointer"
        >
          <Plus className="mr-3 h-5 w-5 stroke-[3px]" /> Nueva Oferta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-72 bg-slate-100 dark:bg-slate-800/50 animate-pulse rounded-[2.5rem]"></div>
          ))
        ) : ofertas.length === 0 ? (
          <div className="col-span-full py-20 text-center space-y-4">
            <Briefcase size={48} className="mx-auto text-slate-300" />
            <p className="text-xl font-bold text-slate-400">No has publicado ninguna oferta laboral todavía.</p>
          </div>
        ) : (
          ofertas.slice(0, visibleCount).map((oferta) => (
            <div key={oferta.id} className={cn("rounded-[2.5rem] border hover:shadow-2xl transition-all duration-500 overflow-hidden backdrop-blur-xl group", oferta.activa ? "border-black/30 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/20" : "border-slate-300/40 dark:border-slate-600/30 bg-slate-100/40 dark:bg-slate-800/20 opacity-60")}>
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-tight line-clamp-2 group-hover:text-teal-600 transition-colors">{oferta.titulo}</h3>
                  <div className="flex gap-2 items-start">
                    {!oferta.activa && (
                      <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 whitespace-nowrap">
                        Desactivada
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => openOfertaModal(oferta)} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-teal-600 transition-colors cursor-pointer border border-slate-100 dark:border-slate-700">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => oferta.activa ? deleteOferta(oferta.id) : reactivateOferta(oferta.id)} className={cn("p-2 rounded-xl transition-colors cursor-pointer border", oferta.activa ? "bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-600 border-slate-100 dark:border-slate-700" : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 hover:text-emerald-700 border-emerald-100 dark:border-emerald-700/50")}>
                        {oferta.activa ? <Trash2 size={18} /> : <RotateCcw size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 italic leading-relaxed">{oferta.descripcion}</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 bg-slate-50/80 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/10">
                    <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm"><MapPin size={18} className="text-teal-500" /></div>
                    <div className="overflow-hidden">
                      <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-tighter">Ubicación</p>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-100 truncate">{oferta.ubicacion}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50/80 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/10">
                    <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm"><Clock size={18} className="text-teal-500" /></div>
                    <div className="overflow-hidden">
                      <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-tighter">Modalidad</p>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-100 truncate uppercase">{oferta.modalidad}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50/80 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/10">
                    <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm"><Clock size={18} className="text-amber-500" /></div>
                    <div className="overflow-hidden">
                      <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-tighter">Horario Laboral</p>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-100">
                        {oferta.horarioInicio?.substring(0, 5) || '--:--'} - {oferta.horarioFin?.substring(0, 5) || '--:--'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50/80 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/10">
                    <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm"><History size={18} className={cn(oferta.fechaLimite ? "text-rose-500" : "text-slate-400")} /></div>
                    <div className="overflow-hidden">
                      <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-tighter">Fecha Límite</p>
                      <p className={cn(
                        "text-xs font-bold truncate",
                        oferta.fechaLimite ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"
                      )}>
                        {oferta.fechaLimite 
                          ? new Date(oferta.fechaLimite).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) 
                          : 'Sin límite'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800/50 flex justify-between items-center">
                  <div className="text-teal-600 dark:text-teal-400 font-black text-lg tracking-tight">
                    ${oferta.salarioMin.toLocaleString()} - ${oferta.salarioMax.toLocaleString()}
                  </div>
                  <button 
                    onClick={() => viewPostulantes(oferta.id)}
                    className="h-10 px-4 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black dark:hover:bg-slate-600 transition-all flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <Users size={14} /> Postulantes
                  </button>
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
  );
}