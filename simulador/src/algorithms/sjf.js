import { cloneProcess, resetProcess } from '../models/Process.js';
import { calculateStats } from './calculateStats.js';

/**
 * Algoritmo SJF (Shortest Job First / Trabajo Más Corto Primero).
 * 
 * Metáfora Bancaria:
 * El cajero inteligente inspecciona la fila de clientes presentes y llama primero
 * a aquel que tenga la transacción más rápida (menor tiempo de ráfaga).
 * Por ejemplo, quien solo va a pagar un recibo rápido pasa antes que quien va a
 * abrir una cuenta corporativa larga. Una vez que el cajero inicia la atención,
 * no lo interrumpe nadie hasta terminar (no apropiativo).
 * 
 * Características:
 * - Tipo: No apropiativo (Non-preemptive).
 * - Criterio de Selección: Menor tiempo de ráfaga inicial (burstTime).
 * - Desempate determinista: 
 *     1. Menor tiempo de llegada (arrivalTime).
 *     2. Orden alfabético/numérico de ID (P1, P2, ...).
 * 
 * @param {Array<Object>} inputProcesses - Lista de procesos configurados
 * @returns {Object} { timeline, processes, metrics, events }
 */
export function runSJF(inputProcesses) {
  if (!inputProcesses || inputProcesses.length === 0) {
    return { timeline: [], processes: [], metrics: {}, events: [] };
  }

  let stateProcesses = inputProcesses.map((p) => resetProcess(p));
  const timeline = [];
  const events = [];
  let currentTime = 0;
  let completedCount = 0;
  const totalCount = stateProcesses.length;

  let currentRunning = null;
  const maxSimulationTime = 500;

  while (completedCount < totalCount && currentTime < maxSimulationTime) {
    // 1. Registro de llegadas en este segundo
    const newlyArrived = stateProcesses.filter((p) => p.arrivalTime === currentTime);
    newlyArrived.forEach((proc) => {
      events.push({
        time: currentTime,
        type: 'ARRIVAL',
        processId: proc.id,
        title: `📥 Llegada de ${proc.id}`,
        description: `El cliente ${proc.id} llega con una solicitud corta de ${proc.burstTime}s. Se ubica en la fila a la espera de evaluación.`,
        queue: stateProcesses
          .filter((p) => p.arrivalTime <= currentTime && p.remainingTime > 0 && (!currentRunning || p.id !== currentRunning.id))
          .map((p) => p.id),
        activeProcessId: currentRunning ? currentRunning.id : null,
      });
    });

    // 2. Si la caja está libre, seleccionar el proceso con MENOR burstTime entre los listos
    if (!currentRunning) {
      const readyProcesses = stateProcesses
        .filter((p) => p.arrivalTime <= currentTime && p.remainingTime > 0)
        .sort((a, b) => {
          // Criterio 1: Menor ráfaga total
          if (a.burstTime !== b.burstTime) {
            return a.burstTime - b.burstTime;
          }
          // Criterio 2: Desempate por llegada
          if (a.arrivalTime !== b.arrivalTime) {
            return a.arrivalTime - b.arrivalTime;
          }
          // Criterio 3: Desempate por ID
          return a.id.localeCompare(b.id, undefined, { numeric: true });
        });

      if (readyProcesses.length > 0) {
        currentRunning = readyProcesses[0];

        if (currentRunning.firstExecutionTime === null) {
          stateProcesses = stateProcesses.map((p) =>
            p.id === currentRunning.id ? cloneProcess(p, { firstExecutionTime: currentTime }) : p
          );
          currentRunning = cloneProcess(currentRunning, { firstExecutionTime: currentTime });
        }

        events.push({
          time: currentTime,
          type: 'START',
          processId: currentRunning.id,
          title: `🏁 Inicio SJF: ${currentRunning.id}`,
          description: `El cajero selecciona a ${currentRunning.id} porque tiene la ráfaga más corta (${currentRunning.burstTime}s) entre todos los clientes en espera.`,
          queue: stateProcesses
            .filter((p) => p.arrivalTime <= currentTime && p.remainingTime > 0 && p.id !== currentRunning.id)
            .map((p) => p.id),
          activeProcessId: currentRunning.id,
        });
      }
    }

    // 3. Ejecución del segundo en curso
    if (currentRunning) {
      timeline.push(currentRunning.id);

      const updatedRemaining = currentRunning.remainingTime - 1;
      const updatedExecuted = currentRunning.executedTime + 1;

      if (updatedRemaining === 0) {
        const finishTime = currentTime + 1;
        stateProcesses = stateProcesses.map((p) =>
          p.id === currentRunning.id
            ? cloneProcess(p, {
                remainingTime: 0,
                executedTime: updatedExecuted,
                completionTime: finishTime,
              })
            : p
        );

        events.push({
          time: currentTime + 1,
          type: 'FINISH',
          processId: currentRunning.id,
          title: `✅ Cliente Atendido: ${currentRunning.id}`,
          description: `El cliente ${currentRunning.id} culminó su ráfaga de ${currentRunning.burstTime}s en T = ${finishTime}s. Caja liberada.`,
          queue: stateProcesses
            .filter((p) => p.arrivalTime <= finishTime && p.remainingTime > 0 && p.id !== currentRunning.id)
            .map((p) => p.id),
          activeProcessId: null,
        });

        completedCount++;
        currentRunning = null;
      } else {
        currentRunning = cloneProcess(currentRunning, {
          remainingTime: updatedRemaining,
          executedTime: updatedExecuted,
        });
        stateProcesses = stateProcesses.map((p) =>
          p.id === currentRunning.id ? currentRunning : p
        );
      }
    } else {
      timeline.push('IDLE');
      events.push({
        time: currentTime,
        type: 'IDLE',
        processId: 'IDLE',
        title: '🟢 CPU LIBRE (Caja en Espera)',
        description: 'No hay clientes listos en la fila. El cajero espera la próxima llegada.',
        queue: [],
        activeProcessId: null,
      });
    }

    currentTime++;
  }

  const { processes: finalProcesses, metrics } = calculateStats(stateProcesses, timeline, events);

  return {
    timeline,
    processes: finalProcesses,
    metrics,
    events,
  };
}
