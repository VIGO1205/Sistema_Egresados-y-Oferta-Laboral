// Utility para validar conflictos de horarios entre egresados y ofertas

export interface HorarioConflicto {
  hayConflicto: boolean;
  empleoActual?: string;
  horarioActual?: {
    inicio: string;
    fin: string;
  };
  ofertaPropuesta?: {
    titulo: string;
    horarioInicio: string;
    horarioFin: string;
  };
  mensaje?: string;
}

/**
 * Convierte una hora en formato HH:MM:SS a minutos desde media noche
 */
function horaAMinutos(hora: string): number {
  if (!hora) return 0;
  const [h, m, s] = hora.split(':').map(Number);
  return h * 60 + m + (s ? s / 60 : 0);
}

/**
 * Verifica si dos rangos horarios se superponen
 * @param inicio1 Hora de inicio del rango 1 (HH:MM:SS)
 * @param fin1 Hora de fin del rango 1 (HH:MM:SS)
 * @param inicio2 Hora de inicio del rango 2 (HH:MM:SS)
 * @param fin2 Hora de fin del rango 2 (HH:MM:SS)
 * @returns true si hay superposición, false si no hay
 */
export function verificarSuperposicionHoraria(
  inicio1: string,
  fin1: string,
  inicio2: string,
  fin2: string,
): boolean {
  // Si algún horario está vacío, no hay conflicto validable
  if (!inicio1 || !fin1 || !inicio2 || !fin2) {
    return false;
  }

  const min1Inicio = horaAMinutos(inicio1);
  const min1Fin = horaAMinutos(fin1);
  const min2Inicio = horaAMinutos(inicio2);
  const min2Fin = horaAMinutos(fin2);

  // Dos rangos se superponen si:
  // NO (rango1.fin <= rango2.inicio) Y NO (rango1.inicio >= rango2.fin)
  const noHaySuperposicion = min1Fin <= min2Inicio || min1Inicio >= min2Fin;
  return !noHaySuperposicion;
}

/**
 * Valida si un egresado puede postularse a una oferta considerando horarios
 * @param empleadoActualmente Si el egresado está empleado
 * @param empresaActual Empresa donde trabaja actualmente
 * @param horarioActualInicio Hora de inicio del trabajo actual
 * @param horarioActualFin Hora de fin del trabajo actual
 * @param ofertaTitulo Título de la oferta
 * @param ofertaHorarioInicio Hora de inicio de la oferta
 * @param ofertaHorarioFin Hora de fin de la oferta
 * @returns Objeto con información del conflicto
 */
export function validarDisponibilidadEgresado(
  empleadoActualmente: boolean,
  empresaActual: string,
  horarioActualInicio: string,
  horarioActualFin: string,
  ofertaTitulo: string,
  ofertaHorarioInicio: string,
  ofertaHorarioFin: string,
): HorarioConflicto {
  // Si no está empleado, no hay conflicto
  if (!empleadoActualmente) {
    return {
      hayConflicto: false,
      mensaje: 'Egresado disponible para trabajar',
    };
  }

  // Si no tiene horarios definidos, asumimos disponibilidad (evitar falsos positivos)
  if (!horarioActualInicio || !horarioActualFin || !ofertaHorarioInicio || !ofertaHorarioFin) {
    return {
      hayConflicto: false,
      mensaje: 'No hay datos de horario suficientes para validar',
    };
  }

  // Verificar superposición
  const hayConflicto = verificarSuperposicionHoraria(
    horarioActualInicio,
    horarioActualFin,
    ofertaHorarioInicio,
    ofertaHorarioFin,
  );

  if (hayConflicto) {
    return {
      hayConflicto: true,
      empleoActual: empresaActual,
      horarioActual: {
        inicio: horarioActualInicio,
        fin: horarioActualFin,
      },
      ofertaPropuesta: {
        titulo: ofertaTitulo,
        horarioInicio: ofertaHorarioInicio,
        horarioFin: ofertaHorarioFin,
      },
      mensaje: `⚠️ Conflicto de horario detectado. Trabajas en ${empresaActual} de ${horarioActualInicio} a ${horarioActualFin}, y esta oferta es de ${ofertaHorarioInicio} a ${ofertaHorarioFin}.`,
    };
  }

  return {
    hayConflicto: false,
    mensaje: '✅ No hay conflicto de horario. Puedes postularte.',
  };
}
