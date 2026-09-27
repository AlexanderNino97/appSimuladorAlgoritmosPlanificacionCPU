/**
 * Paleta de colores fija y consistente por proceso.
 * Garantiza que cada cliente/proceso mantenga siempre la misma identidad visual
 * en todas las vistas (Configuración, Fila Bancaria, Caja y Diagrama de Gantt).
 */
export const PROCESS_COLORS = {
  P1: '#06b6d4', // Cyan vibrante
  P2: '#10b981', // Verde esmeralda
  P3: '#f59e0b', // Ámbar / Dorado
  P4: '#8b5cf6', // Violeta intenso
  P5: '#ec4899', // Rosa neón
  P6: '#3b82f6', // Azul eléctrico
};

/**
 * Paleta secundaria para procesos dinámicos adicionales.
 */
export const FALLBACK_COLORS = [
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#3b82f6',
  '#14b8a6',
  '#f97316',
];

/**
 * Obtiene el color correspondiente a un ID de proceso.
 * @param {string} id - Identificador del proceso (ej. "P1")
 * @param {number} index - Índice numérico opcional
 * @returns {string} Código de color hexadecimal
 */
export function getProcessColor(id, index = 0) {
  if (PROCESS_COLORS[id]) {
    return PROCESS_COLORS[id];
  }
  return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

/**
 * Fábrica pura para crear un nuevo objeto Process.
 * Sigue el principio de inmutabilidad (Non-mutating state).
 * 
 * @param {Object} data - Datos iniciales del proceso
 * @param {string} data.id - Identificador único (ej. "P1")
 * @param {number} data.arrivalTime - Tiempo de llegada a la entidad bancaria (>= 0)
 * @param {number} data.burstTime - Tiempo de ráfaga / atención en caja (> 0)
 * @param {number} data.priority - Nivel de prioridad (menor número = mayor prioridad, 1 = VIP)
 * @param {string} [data.name] - Nombre o descripción amigable del cliente
 * @param {string} [data.color] - Color asignado
 * @param {number} [index] - Índice posicional
 * @returns {Object} Instancia pura de Process
 */
export function createProcess(data, index = 0) {
  const arrival = Math.max(0, parseInt(data.arrivalTime, 10) || 0);
  const burst = Math.max(1, parseInt(data.burstTime, 10) || 1);
  const prio = Math.max(1, parseInt(data.priority, 10) || 1);
  const id = data.id || `P${index + 1}`;

  return {
    id,
    name: data.name || `Cliente ${id}`,
    arrivalTime: arrival,
    burstTime: burst,
    priority: prio,
    remainingTime: burst,
    executedTime: 0,
    completionTime: null,
    waitingTime: null,
    turnaroundTime: null,
    responseTime: null,
    firstExecutionTime: null,
    color: data.color || getProcessColor(id, index),
  };
}

/**
 * Clona un proceso aplicando actualizaciones de forma inmutable.
 * Nunca muta el objeto original.
 * 
 * @param {Object} process - Proceso base
 * @param {Object} updates - Nuevas propiedades a sobreescribir
 * @returns {Object} Nuevo objeto de proceso
 */
export function cloneProcess(process, updates = {}) {
  return {
    ...process,
    ...updates,
  };
}

/**
 * Restablece un proceso a su estado inicial antes de ser ejecutado.
 * 
 * @param {Object} process - Proceso a reiniciar
 * @returns {Object} Nuevo proceso con métricas en cero
 */
export function resetProcess(process) {
  return cloneProcess(process, {
    remainingTime: process.burstTime,
    executedTime: 0,
    completionTime: null,
    waitingTime: null,
    turnaroundTime: null,
    responseTime: null,
    firstExecutionTime: null,
  });
}
