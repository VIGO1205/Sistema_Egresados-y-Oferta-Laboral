"use client";

import { useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { Building2, CalendarDays, Mail, MapPin, Save, School, Upload, Trash2, UserRound, Briefcase, Clock3, Globe, BadgeCheck, Phone } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const MySwal = withReactContent(Swal);
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type Session = {
    access_token: string;
    user: {
        id: string;
        email: string;
        rol: 'admin' | 'egresado' | 'empresa';
    };
};

type EgresadoPerfil = {
    id: number;
    nombre: string;
    apellido: string;
    carrera: string;
    anioEgreso: number;
    cvUrl?: string | null;
    datosContacto?: {
        telefono?: string;
        direccion?: string;
        linkedin?: string;
    } | null;
    empleadoActualmente?: boolean;
    empresaActual?: string | null;
    horarioInicio?: string | null;
    horarioFin?: string | null;
    emailRecuperacion?: string | null;
    habilidades?: Array<{ id?: number; nombre: string; tipo?: string }>;
    empresaContratada?: string | null;
    user?: {
        id: number;
        email: string;
        rol: string;
    };
};

type PostulacionConOferta = {
    estado?: 'postulado' | 'revision' | 'entrevista' | 'contratado' | 'rechazado';
    fechaPostulacion?: string;
    ultimaActualizacion?: string;
    oferta?: {
        empresa?: {
            nombreEmpresa?: string;
        } | null;
    } | null;
};

type FormState = {
    nombre: string;
    apellido: string;
    carrera: string;
    anioEgreso: string;
    emailSistema: string;
    emailRecuperacion: string;
    telefono: string;
    direccion: string;
    linkedin: string;
};

function getCvFileNameKey(userId: string) {
    return `egresados-cv-file:${userId}`;
}

function getFileNameFromUrl(url?: string | null) {
    if (!url) return null;
    const withoutQuery = url.split('?')[0];
    const parts = withoutQuery.split('/');
    return parts[parts.length - 1] || null;
}

export default function EgresadoPerfilPage() {
    const [perfil, setPerfil] = useState<EgresadoPerfil | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [cvFile, setCvFile] = useState<File | null>(null);
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [form, setForm] = useState<FormState>({
        nombre: '',
        apellido: '',
        carrera: '',
        anioEgreso: '',
        emailSistema: '',
        emailRecuperacion: '',
        telefono: '',
        direccion: '',
        linkedin: '',
    });

    const session = useMemo(() => {
        if (typeof window === 'undefined') return null;
        try {
            const raw = localStorage.getItem('egresados-session');
            return raw ? (JSON.parse(raw) as Session) : null;
        } catch {
            return null;
        }
    }, []);

    const loadPerfilWithPostulaciones = async (data: EgresadoPerfil, accessToken: string) => {
        const postulacionesRes = await fetch(`${API_URL}/ofertas/mis-postulaciones`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        let empresaContratada = data.empresaContratada ?? null;

        if (postulacionesRes.ok) {
            const postulaciones: PostulacionConOferta[] = await postulacionesRes.json();
            const postulacionContratada = postulaciones
                .filter((postulacion) => postulacion.estado === 'contratado')
                .sort((a, b) => {
                    const fechaA = new Date(a.ultimaActualizacion ?? a.fechaPostulacion ?? 0).getTime();
                    const fechaB = new Date(b.ultimaActualizacion ?? b.fechaPostulacion ?? 0).getTime();
                    return fechaB - fechaA;
                })[0];

            empresaContratada =
                postulacionContratada?.oferta?.empresa?.nombreEmpresa ?? empresaContratada;
        }

        return {
            ...data,
            empresaContratada: empresaContratada ?? data.empresaContratada ?? null,
        };
    };

    useEffect(() => {
        const fetchPerfil = async () => {
            if (typeof window === 'undefined') return;
            const rawSession = localStorage.getItem('egresados-session');
            if (!rawSession) return;

            try {
                const parsed = JSON.parse(rawSession) as Session;
                const res = await fetch(`${API_URL}/egresados/perfil`, {
                    headers: { Authorization: `Bearer ${parsed.access_token}` },
                });

                if (!res.ok) {
                    throw new Error('No se pudo cargar el perfil');
                }

                const data: EgresadoPerfil = await res.json();
                const perfilConEmpresa = await loadPerfilWithPostulaciones(data, parsed.access_token);

                const storedFileName = localStorage.getItem(getCvFileNameKey(parsed.user.id));
                setUploadedFileName(storedFileName || getFileNameFromUrl(data.cvUrl));
                setPerfil(perfilConEmpresa);
                setForm({
                    nombre: data.nombre ?? '',
                    apellido: data.apellido ?? '',
                    carrera: data.carrera ?? '',
                    anioEgreso: data.anioEgreso ? String(data.anioEgreso) : '',
                    emailSistema: data.user?.email ?? parsed.user.email ?? '',
                    emailRecuperacion: data.emailRecuperacion ?? '',
                    telefono: data.datosContacto?.telefono ?? '',
                    direccion: data.datosContacto?.direccion ?? '',
                    linkedin: data.datosContacto?.linkedin ?? '',
                });
            } catch (error) {
                console.error(error);
                await MySwal.fire({
                    icon: 'error',
                    title: 'Error al cargar el perfil',
                    text: 'No se pudo obtener tu información desde el backend.',
                    confirmButtonColor: '#0f172a',
                });
            } finally {
                setLoading(false);
            }
        };

        fetchPerfil();
    }, []);

    const handleChange = (field: keyof FormState, value: string | boolean) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!perfil || !session) return;

        setSaving(true);
        try {
            const payload = {
                nombre: form.nombre,
                apellido: form.apellido,
                carrera: form.carrera,
                anioEgreso: form.anioEgreso ? Number(form.anioEgreso) : undefined,
                emailSistema: form.emailSistema || null,
                emailRecuperacion: form.emailRecuperacion || null,
                datosContacto: {
                    telefono: form.telefono || null,
                    direccion: form.direccion || null,
                    linkedin: form.linkedin || null,
                },
            };
            console.log('>>> PAYLOAD ENVIADO DESDE FRONTEND:', JSON.stringify(payload, null, 2));

            const res = await fetch(`${API_URL}/egresados/${perfil.id}`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'No se pudo actualizar el perfil');
            }

            const updated: EgresadoPerfil = await res.json();
            const perfilConEmpresa = await loadPerfilWithPostulaciones(updated, session.access_token);
            setPerfil(perfilConEmpresa);
            await MySwal.fire({
                icon: 'success',
                title: 'Perfil actualizado',
                text: 'Tus cambios se guardaron correctamente.',
                confirmButtonColor: '#0f172a',
            });
        } catch (error) {
            await MySwal.fire({
                icon: 'error',
                title: 'Error al guardar',
                text: error instanceof Error ? error.message : 'No se pudo guardar el perfil.',
                confirmButtonColor: '#0f172a',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleUploadCV = async () => {
        if (!cvFile || !session) return;
        await uploadCVFile(cvFile);
    };

    const uploadCVFile = async (file: File | null) => {
        if (!file || !session) return;
        setUploading(true);
        const uploadingName = file.name;
        const formData = new FormData();
        formData.append('cv', file);

        try {
            const res = await fetch(`${API_URL}/egresados/cv`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'No se pudo subir el CV');
            }

            const updated: EgresadoPerfil = await res.json();
            const perfilConEmpresa = await loadPerfilWithPostulaciones(updated, session.access_token);
            setPerfil(perfilConEmpresa);
            setUploadedFileName(uploadingName);
            localStorage.setItem(getCvFileNameKey(session.user.id), uploadingName);
            setCvFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            await MySwal.fire({
                icon: 'success',
                title: 'CV actualizado',
                text: 'Tu archivo PDF fue cargado correctamente.',
                confirmButtonColor: '#0f172a',
            });
        } catch (error) {
            await MySwal.fire({
                icon: 'error',
                title: 'Error al subir CV',
                text: error instanceof Error ? error.message : 'No se pudo subir el archivo.',
                confirmButtonColor: '#0f172a',
            });
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteCV = async () => {
        if (!session) return;

        const result = await MySwal.fire({
            title: '¿Eliminar CV?',
            text: 'Se quitará el archivo PDF de tu perfil.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',
        });

        if (!result.isConfirmed) return;

        try {
            const res = await fetch(`${API_URL}/egresados/cv`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            });

            if (!res.ok) {
                throw new Error('No se pudo eliminar el CV');
            }

            const updated: EgresadoPerfil = await res.json();
            const perfilConEmpresa = await loadPerfilWithPostulaciones(updated, session.access_token);
            setPerfil(perfilConEmpresa);
            setUploadedFileName(null);
            localStorage.removeItem(getCvFileNameKey(session.user.id));
            await MySwal.fire({
                icon: 'success',
                title: 'CV eliminado',
                confirmButtonColor: '#0f172a',
            });
        } catch (error) {
            await MySwal.fire({
                icon: 'error',
                title: 'Error al eliminar CV',
                text: error instanceof Error ? error.message : 'No se pudo eliminar el archivo.',
                confirmButtonColor: '#0f172a',
            });
        }
    };

    return (
        <div className="space-y-6 p-6 lg:p-8 bg-background text-foreground transition-colors duration-300">
            <div className="rounded-[2.5rem] border border-slate-200 dark:border-white/10 bg-white/85 dark:bg-slate-900/50 backdrop-blur-2xl p-8 shadow-sm">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-3">
                        <span className="inline-flex rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300">
                            Mi Perfil
                        </span>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                            {loading ? 'Cargando perfil...' : `${perfil?.nombre ?? 'Egresado'} ${perfil?.apellido ?? ''}`.trim()}
                        </h1>
                        <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-300 sm:text-base">
                            Tu información personal, habilidades, horario y CV están centralizados aquí usando los datos del backend.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Link href="/egresado/ofertas" className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-widest text-white! dark:text-white! transition-all hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600">
                            Ver ofertas
                        </Link>
                        <Link href="/egresado/postulaciones" className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-700 transition-all hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/30 dark:text-slate-200 dark:hover:bg-slate-800/60">
                            Mis postulaciones
                        </Link>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-2 h-112 rounded-4xl bg-slate-100 dark:bg-slate-800/40 animate-pulse" />
                    <div className="h-112 rounded-4xl bg-slate-100 dark:bg-slate-800/40 animate-pulse" />
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-2 space-y-6">
                        <Card className="rounded-4xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/40 shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white">
                                    <UserRound className="h-5 w-5 text-teal-600" /> Información del perfil
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Field label="Nombre" value={form.nombre} onChange={(value) => handleChange('nombre', value)} placeholder="Ej. Juan" />
                                    <Field label="Apellido" value={form.apellido} onChange={(value) => handleChange('apellido', value)} placeholder="Ej. Pérez" />
                                    <Field label="Carrera" value={form.carrera} onChange={(value) => handleChange('carrera', value)} placeholder="Ej. Ingeniería en Sistemas" />
                                    <Field label="Año de egreso" value={form.anioEgreso} onChange={(value) => handleChange('anioEgreso', value)} type="number" placeholder="2023" />
                                    <Field label="Email del sistema" value={form.emailSistema} onChange={(value) => handleChange('emailSistema', value)} type="email" placeholder="Ej. tuemail@ejemplo.com" />
                                    <Field label="Email de recuperación" value={form.emailRecuperacion} onChange={(value) => handleChange('emailRecuperacion', value)} type="email" placeholder="Ej. recuperacion@ejemplo.com" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Field label="Teléfono" value={form.telefono} onChange={(value) => handleChange('telefono', value)} placeholder="+1 (555) 123-4567" />
                                    <Field label="Dirección" value={form.direccion} onChange={(value) => handleChange('direccion', value)} placeholder="Calle Principal 123, Apto 4" />
                                    <Field label="LinkedIn" value={form.linkedin} onChange={(value) => handleChange('linkedin', value)} placeholder="linkedin.com/in/tunombre" />
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="inline-flex items-center justify-center rounded-2xl bg-teal-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        <Save className="mr-2 h-4 w-4" /> {saving ? 'Guardando...' : 'Guardar cambios'}
                                    </button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-4xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/40 shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white">
                                    <BadgeCheck className="h-5 w-5 text-amber-500" /> Datos calculados y horario
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <InfoBox icon={<Mail className="h-4 w-4" />} label="Usuario" value={perfil?.user?.email ?? 'N/D'} />
                                <InfoBox icon={<Briefcase className="h-4 w-4" />} label="Estado laboral" value={perfil?.empleadoActualmente ? 'Trabajando' : 'No trabaja'} />
                                <InfoBox
                                    icon={<Building2 className="h-4 w-4" />}
                                    label="Empresa actual"
                                    value={perfil?.empleadoActualmente ? perfil?.empresaContratada || perfil?.empresaActual || 'No registra' : 'No aplica'}
                                />
                                <InfoBox icon={<Clock3 className="h-4 w-4" />} label="Horario inicio" value={perfil?.horarioInicio ? perfil.horarioInicio.substring(0, 5) : 'No definido'} />
                                <InfoBox icon={<Clock3 className="h-4 w-4" />} label="Horario fin" value={perfil?.horarioFin ? perfil.horarioFin.substring(0, 5) : 'No definido'} />
                                <InfoBox icon={<CalendarDays className="h-4 w-4" />} label="Año egreso" value={perfil?.anioEgreso?.toString() ?? 'N/D'} />
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card className="rounded-4xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/40 shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white">
                                    <Upload className="h-5 w-5 text-teal-600" /> CV y contacto
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div>
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Cargar PDF</span>
                                    <input
                                        id="cv-input"
                                        ref={fileInputRef}
                                        type="file"
                                        accept="application/pdf"
                                        onChange={(event) => {
                                            const f = event.target.files?.[0] ?? null;
                                            setCvFile(f);
                                            if (f) uploadCVFile(f);
                                        }}
                                        className="sr-only"
                                    />

                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="mt-2 cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-slate-950/30 dark:text-slate-200 flex items-center justify-between"
                                    >
                                        <span className={cn(cvFile || uploadedFileName ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-500')}>
                                            {cvFile?.name ?? uploadedFileName ?? getFileNameFromUrl(perfil?.cvUrl) ?? 'No hay archivo seleccionado'}
                                        </span>
                                        <span className="text-xs text-slate-400">PDF</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!cvFile) fileInputRef.current?.click();
                                            else uploadCVFile(cvFile);
                                        }}
                                        disabled={uploading}
                                        className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <Upload className="mr-2 h-4 w-4" />
                                        {uploading ? 'Subiendo...' : 'Subir CV'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDeleteCV}
                                        className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-xs font-black uppercase tracking-widest text-rose-700 transition-all hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar CV
                                    </button>
                                </div>

                                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/30 space-y-3">
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Contacto</p>
                                    <ContactLine icon={<Phone className="h-4 w-4" />} text={perfil?.datosContacto?.telefono || 'Sin teléfono'} />
                                    <ContactLine icon={<MapPin className="h-4 w-4" />} text={perfil?.datosContacto?.direccion || 'Sin dirección'} />
                                    <ContactLine icon={<Globe className="h-4 w-4" />} text={perfil?.datosContacto?.linkedin || 'Sin LinkedIn'} />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-4xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/40 shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white">
                                    <School className="h-5 w-5 text-sky-600" /> Habilidades
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {perfil?.habilidades?.length ? (
                                    <div className="flex flex-wrap gap-2">
                                        {perfil.habilidades.map((habilidad, index) => (
                                            <span
                                                key={`${habilidad.nombre}-${index}`}
                                                className={cn(
                                                    'rounded-full border px-3 py-1 text-xs font-bold',
                                                    habilidad.tipo === 'tecnica'
                                                        ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300'
                                                        : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300',
                                                )}
                                            >
                                                {habilidad.nombre}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Aún no hay habilidades registradas para tu perfil.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}

function Field({
    label,
    value,
    onChange,
    type = 'text',
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    placeholder?: string;
}) {
    return (
        <label className="block space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</span>
            <input
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition-all focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 dark:border-white/10 dark:bg-slate-950/30 dark:text-slate-100"
            />
        </label>
    );
}

function InfoBox({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/30">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {icon}
                {label}
            </div>
            <div className="mt-3 text-sm font-bold text-slate-900 dark:text-white wrap-break-word">{value}</div>
        </div>
    );
}

function ContactLine({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-200 wrap-break-word">
            <span className="text-slate-400 dark:text-slate-500">{icon}</span>
            <span>{text}</span>
        </div>
    );
}
