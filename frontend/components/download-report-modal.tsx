'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import Swal from 'sweetalert2';

interface DownloadReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DownloadReportModal({ isOpen, onClose }: DownloadReportModalProps) {
  const { theme, systemTheme } = useTheme();
  const isRunningRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen || isRunningRef.current) return;
    isRunningRef.current = true;

    const sessionStr = typeof window !== 'undefined' ? window.localStorage.getItem('egresados-session') : null;
    const session = sessionStr ? JSON.parse(sessionStr) : null;
    const sessionEmail = session?.user?.email || '';
    const sessionToken = session?.access_token || '';

    const isDark = theme === 'dark' || (theme === 'system' && systemTheme === 'dark');
    const getInput = (selector: string) => Swal.getPopup()?.querySelector(selector) as HTMLInputElement | null;

    const run = async () => {
      // Step 1: Re-authentication modal
      const result = await Swal.fire({
        title: 'Verificación de Seguridad',
        html: `
          <p style="text-align:left;margin:0 0 16px;${isDark ? 'color:#cbd5e1' : 'color:#475569'};line-height:1.5;font-size:14px;">
            Para descargar el informe completo de la base de datos, verifica tu identidad con tus credenciales.
          </p>
          <input id="swal-email" class="swal2-input" type="email" placeholder="Correo electrónico" value="${sessionEmail}" style="${isDark ? 'background-color:#1e293b;color:#f1f5f9;border-color:#475569' : ''}" />
          <input id="swal-password" class="swal2-input" type="password" placeholder="Contraseña" style="${isDark ? 'background-color:#1e293b;color:#f1f5f9;border-color:#475569' : ''}" />
        `,
        icon: 'question',
        background: isDark ? '#0f172a' : '#ffffff',
        color: isDark ? '#f1f5f9' : '#1e293b',
        showCancelButton: true,
        confirmButtonText: 'Descargar Informe',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#2563eb',
        cancelButtonColor: isDark ? '#475569' : '#94a3b8',
        allowOutsideClick: false,
        allowEscapeKey: true,
        focusConfirm: false,
        didOpen: () => {
          const emailInput = getInput('#swal-email');
          if (emailInput) emailInput.focus();
          if (isDark) {
            const popup = Swal.getPopup();
            if (popup) {
              popup.style.borderRadius = '12px';
              popup.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.5)';
            }
          }
        },
        preConfirm: async () => {
          const emailInput = getInput('#swal-email');
          const passwordInput = getInput('#swal-password');
          const email = emailInput?.value?.trim() || '';
          const password = passwordInput?.value || '';

          if (!sessionToken || !sessionEmail || !email || !password) {
            Swal.showValidationMessage('Completa todos los campos.');
            return false;
          }

          if (email !== sessionEmail) {
            Swal.showValidationMessage('Credenciales incorrectas.');
            return false;
          }

          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
          const authResponse = await fetch(`${apiUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          if (!authResponse.ok) {
            Swal.showValidationMessage('Contraseña incorrecta.');
            return false;
          }

          // Request report generation
          const solicitarResponse = await fetch(`${apiUrl}/reportes/solicitar-completo`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionToken}`,
            },
            body: JSON.stringify({}),
          });

          if (!solicitarResponse.ok) {
            throw new Error('Error al solicitar el informe');
          }

          const { reporteId } = await solicitarResponse.json();

          // Show loading button with Clock icon spinning
          Swal.update({
            title: 'Generando PDF...',
            html: `
              <div style="text-align:center;padding:40px 20px;">
                <div style="display:flex;justify-content:center;margin-bottom:24px;">
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#2563eb;animation:spin 1s linear infinite;">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <style>
                    @keyframes spin {
                      from { transform: rotate(0deg); }
                      to { transform: rotate(360deg); }
                    }
                  </style>
                </div>
                <p style="font-size:16px;font-weight:600;${isDark ? 'color:#f1f5f9' : 'color:#1e293b'};margin:0;">Generando tu informe...</p>
              </div>
            `,
            showConfirmButton: false,
            showCancelButton: false,
            allowOutsideClick: false,
          });

          // Polling loop
          let estado = 'generando';
          let intentos = 0;
          const maxIntentos = 30;

          while (estado === 'generando' && intentos < maxIntentos) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            intentos++;

            const misReportesResponse = await fetch(`${apiUrl}/reportes/mis-reportes`, {
              headers: { Authorization: `Bearer ${sessionToken}` },
            });

            if (misReportesResponse.ok) {
              const reportes = await misReportesResponse.json();
              const reporte = reportes.find((r: any) => r.id === reporteId);
              if (reporte) {
                estado = reporte.estado;

                if (estado === 'error') {
                  throw new Error('Error al generar el informe. Intenta de nuevo.');
                }
              }
            }
          }

          if (estado !== 'completado') {
            throw new Error('La generación tardó demasiado. Intenta de nuevo.');
          }

          // Show download button when ready with CheckCircle2 icon
          Swal.update({
            title: 'PDF Listo',
            html: `
              <div style="text-align:center;padding:40px 20px;">
                <div style="display:flex;justify-content:center;margin-bottom:24px;">
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#10b981;">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <button id="download-btn" style="padding:12px 32px;background:#10b981;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;display:inline-flex;align-items:center;gap:8px;transition:background 0.2s;font-family:inherit;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Descargar PDF
                </button>
              </div>
            `,
            showConfirmButton: false,
            showCancelButton: false,
            allowOutsideClick: false,
          });

          // Wait for download button click
          return new Promise((resolve, reject) => {
            const checkDownloadBtn = setInterval(() => {
              const downloadBtn = document.getElementById('download-btn') as HTMLButtonElement;
              if (downloadBtn) {
                downloadBtn.addEventListener('click', async () => {
                  clearInterval(checkDownloadBtn);
                  try {
                    const downloadResponse = await fetch(`${apiUrl}/reportes/descargar-completo/${reporteId}`, {
                      method: 'GET',
                      headers: { Authorization: `Bearer ${sessionToken}` },
                    });

                    if (!downloadResponse.ok) {
                      throw new Error('Error al descargar el informe');
                    }

                    const blob = await downloadResponse.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `informe-completo-${new Date().getTime()}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);

                    resolve(true);
                  } catch (error) {
                    reject(error);
                  }
                });
              }
            }, 100);
          });
        },
      });

      if (result.isConfirmed) {
        await Swal.fire({
          icon: 'success',
          title: 'Informe descargado',
          text: 'El PDF se descargó correctamente.',
          confirmButtonColor: '#2563eb',
          background: isDark ? '#0f172a' : '#ffffff',
          color: isDark ? '#f1f5f9' : '#1e293b',
        });
      }

      onCloseRef.current();
      isRunningRef.current = false;
    };

    run().catch(async (error) => {
      console.error('Error:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Ocurrió un error inesperado.',
        confirmButtonColor: '#2563eb',
        background: isDark ? '#0f172a' : '#ffffff',
        color: isDark ? '#f1f5f9' : '#1e293b',
      });
      onCloseRef.current();
      isRunningRef.current = false;
    });

    return () => {
      // Release lock if component closes/unmounts unexpectedly
      if (!isOpen) {
        isRunningRef.current = false;
      }
    };
  }, [isOpen, theme, systemTheme]);

  return null;
}
