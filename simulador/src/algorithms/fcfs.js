import { cloneProcess, resetProcess } from '../models/Process.js';
import { calculateStats } from './calculateStats.js';

/**
 * Algoritmo FCFS (First-Come, First-Served / Primero en Llegar, Primero en Ser Atendido).
 * 
 * Metáfora Bancaria:
 * Es la fila bancaria tradicional por estricto orden de llegada. Los clientes toman
 * su turno según la hora exacta en que ingresaron por la puerta. El cajero atiende
 * a cada cliente de principio a fin sin interrupciones (no apropiativo).
 * 
 * Características:
 * - Tipo: No apropiativo (Non-preemptive).
 * - Criterio de Selección: Menor tiempo de llegada (arrivalTime).
 * - Desempate determinista: Orden de ID / posición inicial en la lista.
 * 
 * @param {Array<Object>} inputProcesses - Lista de procesos configurados
 * @returns {Object} { timeline, processes, metrics, events }
 */
export function runFCFS(inputProcesses) {
  if (!inputProcesses || inputProcesses.length === 0) {
    return { timeline: [], processes: [], metrics: {}, events: [] };
  }

  // Clonamos y reiniciamos los procesos de forma inmutable
  let stateProcesses = inputProcesses.map((p) => resetProcess(p));
  
  const timeline = [];
  const events = [];
  let currentTime = 0;
  let completedCount = 0;
  const totalCount = stateProcesses.length;

  // Control del proceso actualmente en caja
  let currentRunning = null;

  // Límite de seguridad para evitar bucles infinitos
  const maxSimulationTime = 500;

  while (completedCount < totalCount && currentTime < maxSimulationTime) {
    // 1. Registrar llegadas en el segundo actual
    const newlyArrived = stateProcesses.filter((p) => p.arrivalTime === currentTime);
    newlyArrived.forEach((proc) => {
      events.push({
        time: currentTime,
        type: 'ARRIVAL',
        processId: proc.id,
        title: `📥 Llegada de ${proc.id}`,
        description: `El cliente ${proc.id} entra al banco y se ubica en la fila general. Requiere ${proc.burstTime}s de atención en caja.`,
        queue: stateProcesses
          .filter((p) => p.arrivalTime <= currentTime && p.remainingTime > 0 && (!currentRunning || p.id !== currentRunning.id))
          .map((p) => p.id),
        activeProcessId: currentRunning ? currentRunning.id : null,
      });
    });

    // 2. Si no hay proceso en ejecución, buscar el siguiente en la fila
    if (!currentRunning) {
      // Filtrar procesos que ya llegaron y aún tienen tiempo restante
      const readyProcesses = stateProcesses
        .filter((p) => p.arrivalTime <= currentTime && p.remainingTime > 0)
        .sort((a, b) => {
          if (a.arrivalTime !== b.arrivalTime) {
            return a.arrivalTime - b.arrivalTime;
          }
          return a.id.localeCompare(b.id, undefined, { numeric: true });
        });

      if (readyProcesses.length > 0) {
        currentRunning = readyProcesses[0];
        
        // Registrar primer tiempo de ejecución si aplica
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
          title: `🏁 Inicio de Atención: ${currentRunning.id}`,
          description: `El cajero llama a ${currentRunning.id} por ser el primero en la fila (Llegada: ${currentRunning.arrivalTime}s). Inicia atención sin interrupciones.`,
          queue: stateProcesses
            .filter((p) => p.arrivalTime <= currentTime && p.remainingTime > 0 && p.id !== currentRunning.id)
            .map((p) => p.id),
          activeProcessId: currentRunning.id,
        });
      }
    }

    // 3. Ejecutar 1 segundo en la CPU / Caja
    if (currentRunning) {
      timeline.push(currentRunning.id);

      // Decrementar tiempo restante e incrementar ejecutado
      const updatedRemaining = currentRunning.remainingTime - 1;
      const updatedExecuted = currentRunning.executedTime + 1;

      if (updatedRemaining === 0) {
        // El proceso finalizó en currentTime + 1
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
          description: `El cliente ${currentRunning.id} finalizó todas sus transacciones en caja en T = ${finishTime}s y se retira satisfecho del banco.`,
          queue: stateProcesses
            .filter((p) => p.arrivalTime <= finishTime && p.remainingTime > 0 && p.id !== currentRunning.id)
            .map((p) => p.id),
          activeProcessId: null,
        });

        completedCount++;
        currentRunning = null; // Caja liberada para el siguiente ciclo
      } else {
        // Continúa en ejecución en el siguiente ciclo
        currentRunning = cloneProcess(currentRunning, {
          remainingTime: updatedRemaining,
          executedTime: updatedExecuted,
        });
        stateProcesses = stateProcesses.map((p) =>
          p.id === currentRunning.id ? currentRunning : p
        );
      }
    } else {
      // Ningún proceso está listo: CPU IDLE
      timeline.push('IDLE');
      events.push({
        time: currentTime,
        type: 'IDLE',
        processId: 'IDLE',
        title: '🟢 CPU LIBRE (Caja en Espera)',
        description: 'No hay clientes esperando en la fila. El cajero permanece disponible esperando la llegada del próximo cliente.',
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
