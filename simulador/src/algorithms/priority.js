import { cloneProcess, resetProcess } from '../models/Process.js';
import { calculateStats } from './calculateStats.js';

/**
 * Algoritmo de Planificación por Prioridad (Priority Scheduling - No Apropiativo).
 * 
 * Metáfora Bancaria:
 * En una sucursal bancaria existen diferentes categorías de clientes. Los clientes
 * con Prioridad 1 son clientes VIP ("🏆 FILA VIP") como personas de la tercera edad,
 * mujeres embarazadas o clientes corporativos preferenciales.
 * Siempre que la caja se desocupa, el cajero atiende primero a los clientes de la fila VIP
 * antes de atender a los clientes de la fila general (Prioridad >= 2).
 * Como es NO APROPIATIVO, una vez que el cajero comienza a atender a un cliente,
 * terminará su trámite completo sin importar si llega un cliente VIP mientras atiende.
 * 
 * Características:
 * - Tipo: No apropiativo (Non-preemptive).
 * - Criterio de Selección: Menor valor numérico de prioridad (1 = Mayor Prioridad / VIP).
 * - Desempates:
 *     1. Menor tiempo de llegada (arrivalTime).
 *     2. Identificador de proceso (P1, P2, ...).
 * 
 * @param {Array<Object>} inputProcesses - Colección de procesos configurados
 * @returns {Object} { timeline, processes, metrics, events }
 */
export function runPriority(inputProcesses) {
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
    // 1. Registrar arribos en el segundo actual
    const newlyArrived = stateProcesses.filter((p) => p.arrivalTime === currentTime);
    newlyArrived.forEach((proc) => {
      const isVIP = proc.priority === 1;
      events.push({
        time: currentTime,
        type: 'ARRIVAL',
        processId: proc.id,
        title: isVIP ? `🏆 Llegada VIP: ${proc.id}` : `📥 Llegada General: ${proc.id}`,
        description: isVIP
          ? `El cliente VIP ${proc.id} (Prioridad 1) ingresa al banco y se posiciona en la 🏆 FILA VIP preferencial.`
          : `El cliente ${proc.id} (Prioridad ${proc.priority}) entra y se forma en la fila regular.`,
        queue: stateProcesses
          .filter((p) => p.arrivalTime <= currentTime && p.remainingTime > 0 && (!currentRunning || p.id !== currentRunning.id))
          .map((p) => p.id),
        activeProcessId: currentRunning ? currentRunning.id : null,
      });
    });

    // 2. Si la ventanilla está libre, seleccionar al proceso con menor valor de prioridad
    if (!currentRunning) {
      const readyProcesses = stateProcesses
        .filter((p) => p.arrivalTime <= currentTime && p.remainingTime > 0)
        .sort((a, b) => {
          // Criterio 1: Menor número de prioridad = mayor preferencia
          if (a.priority !== b.priority) {
            return a.priority - b.priority;
          }
          // Criterio 2: Desempate por hora de llegada
          if (a.arrivalTime !== b.arrivalTime) {
            return a.arrivalTime - b.arrivalTime;
          }
          // Criterio 3: Desempate por ID
          return a.id.localeCompare(b.id, undefined, { numeric: true });
        });

      if (readyProcesses.length > 0) {
        currentRunning = readyProcesses[0];
        const isVIP = currentRunning.priority === 1;

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
          title: isVIP ? `🏆 Atención VIP: ${currentRunning.id}` : `🏁 Inicio en Caja: ${currentRunning.id}`,
          description: isVIP
            ? `El cajero llama a ${currentRunning.id} desde la 🏆 FILA VIP por tener máxima prioridad (1). Ráfaga: ${currentRunning.burstTime}s.`
            : `El cajero llama a ${currentRunning.id} por tener la mayor prioridad disponible (${currentRunning.priority}).`,
          queue: stateProcesses
            .filter((p) => p.arrivalTime <= currentTime && p.remainingTime > 0 && p.id !== currentRunning.id)
            .map((p) => p.id),
          activeProcessId: currentRunning.id,
        });
      }
    }

    // 3. Ejecutar 1 segundo en caja
    if (currentRunning) {
      timeline.push(currentRunning.id);

      const nextRemaining = currentRunning.remainingTime - 1;
      const nextExecuted = currentRunning.executedTime + 1;

      if (nextRemaining === 0) {
        const finishTime = currentTime + 1;
        stateProcesses = stateProcesses.map((p) =>
          p.id === currentRunning.id
            ? cloneProcess(p, {
                remainingTime: 0,
                executedTime: nextExecuted,
                completionTime: finishTime,
              })
            : p
        );

        events.push({
          time: finishTime,
          type: 'FINISH',
          processId: currentRunning.id,
          title: `✅ Cliente Atendido: ${currentRunning.id}`,
          description: `El cliente ${currentRunning.id} (Prioridad ${currentRunning.priority}) finalizó su atención en T = ${finishTime}s.`,
          queue: stateProcesses
            .filter((p) => p.arrivalTime <= finishTime && p.remainingTime > 0 && p.id !== currentRunning.id)
            .map((p) => p.id),
          activeProcessId: null,
        });

        completedCount++;
        currentRunning = null;
      } else {
        currentRunning = cloneProcess(currentRunning, {
          remainingTime: nextRemaining,
          executedTime: nextExecuted,
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
        description: 'La caja bancaria está desocupada. Ni en la fila VIP ni en la fila general hay clientes esperando.',
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
