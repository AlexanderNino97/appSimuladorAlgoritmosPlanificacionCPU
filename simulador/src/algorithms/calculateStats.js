import { cloneProcess } from '../models/Process.js';

/**
 * Módulo de cálculo matemático de estadísticas de planificación de CPU.
 * 
 * Ecuaciones fundamentales de sistemas operativos:
 * 1. Tiempo de Retorno (Turnaround Time): Tiempo total desde que el cliente llega hasta que termina.
 *    T_retorno = Tiempo de Finalización (Completion Time) - Tiempo de Llegada (Arrival Time)
 * 
 * 2. Tiempo de Espera (Waiting Time): Tiempo que el cliente pasó esperando en la fila sin ser atendido.
 *    T_espera = Tiempo de Retorno (Turnaround Time) - Tiempo de Ráfaga (Burst Time)
 * 
 * 3. Tiempo de Respuesta (Response Time): Tiempo transcurrido desde la llegada hasta la primera vez que es atendido en caja.
 *    T_respuesta = Primer Tiempo de Ejecución (First Execution Time) - Tiempo de Llegada (Arrival Time)
 * 
 * 4. Utilización de CPU: Porcentaje del tiempo total en que la caja estuvo atendiendo clientes (no ociosa).
 *    Utilización (%) = (Tiempo Ocupado / Tiempo Total) * 100
 * 
 * @param {Array<Object>} processes - Lista de procesos simulados
 * @param {Array<string>} timeline - Línea temporal de ejecución segundo a segundo (['P1', 'IDLE', ...])
 * @param {Array<Object>} [events=[]] - Lista cronológica de eventos registrados durante la simulación
 * @returns {Object} Objeto con la lista final de procesos enriquecida y el objeto de métricas globales
 */
export function calculateStats(processes, timeline = [], events = []) {
  // Cálculo individual para cada proceso de manera inmutable
  const calculatedProcesses = processes.map((proc) => {
    // Si el proceso nunca terminó, asignar valores seguros por defecto
    const completion = proc.completionTime !== null ? proc.completionTime : (proc.arrivalTime + proc.burstTime);
    const turnaround = Math.max(0, completion - proc.arrivalTime);
    const waiting = Math.max(0, turnaround - proc.burstTime);
    const response = proc.firstExecutionTime !== null 
      ? Math.max(0, proc.firstExecutionTime - proc.arrivalTime) 
      : waiting;

    return cloneProcess(proc, {
      completionTime: completion,
      turnaroundTime: turnaround,
      waitingTime: waiting,
      responseTime: response,
    });
  });

  const totalTime = timeline.length;
  const idleTicks = timeline.filter((slot) => slot === 'IDLE').length;
  const busyTicks = totalTime - idleTicks;

  // Utilización de CPU calculada con 2 decimales
  const cpuUtilization = totalTime > 0 
    ? Number(((busyTicks / totalTime) * 100).toFixed(2)) 
    : 0;

  // Promedios de Espera y Retorno con exactitud a 2 decimales
  const count = calculatedProcesses.length;
  const sumWaiting = calculatedProcesses.reduce((acc, p) => acc + p.waitingTime, 0);
  const sumTurnaround = calculatedProcesses.reduce((acc, p) => acc + p.turnaroundTime, 0);
  const sumResponse = calculatedProcesses.reduce((acc, p) => acc + p.responseTime, 0);

  const avgWaitingTime = count > 0 ? Number((sumWaiting / count).toFixed(2)) : 0;
  const avgTurnaroundTime = count > 0 ? Number((sumTurnaround / count).toFixed(2)) : 0;
  const avgResponseTime = count > 0 ? Number((sumResponse / count).toFixed(2)) : 0;

  // Conteo de Cambios de Contexto (Context Switches)
  let contextSwitches = 0;
  for (let i = 1; i < timeline.length; i++) {
    const prev = timeline[i - 1];
    const curr = timeline[i];
    // Se considera cambio de contexto si cambia de un proceso a otro distinto (excluyendo IDLE)
    if (prev !== curr && prev !== 'IDLE' && curr !== 'IDLE') {
      contextSwitches++;
    }
  }

  // Conteo de Desalojos (Preemptions) registrados en los eventos
  const preemptions = events.filter(
    (e) => e.type === 'PREEMPT' || e.type === 'QUANTUM_EXPIRE'
  ).length;

  return {
    processes: calculatedProcesses,
    metrics: {
      avgWaitingTime,
      avgTurnaroundTime,
      avgResponseTime,
      totalExecutionTime: totalTime,
      busyTime: busyTicks,
      idleTime: idleTicks,
      cpuUtilization,
      contextSwitches,
      preemptions,
    },
  };
}
