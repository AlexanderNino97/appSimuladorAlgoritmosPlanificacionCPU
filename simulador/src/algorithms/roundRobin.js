import { cloneProcess, resetProcess } from '../models/Process.js';
import { calculateStats } from './calculateStats.js';

/**
 * Algoritmo Round Robin (Turno Rotativo por Cuanto de Tiempo).
 * 
 * Metáfora Bancaria:
 * Política de atención justa e igualitaria (Time-Sharing). El cajero atiende a cada
 * cliente durante un tiempo máximo establecido llamado "Quantum" (ejemplo: 2 segundos).
 * Si el cliente aún tiene trámites pendientes al vencerse su turno, el cajero suspende
 * la atención, el cliente va al final de la fila ("⏱️ FIN DEL TURNO") y el cajero pasa
 * a atender al siguiente cliente en espera.
 * 
 * Características:
 * - Tipo: Apropiativo por tiempo (Preemptive by Quantum).
 * - Criterio de Selección: Cola FIFO estricta.
 * - Parámetro: Quantum configurable (Q > 0).
 * - Orden de Encolamiento: Procesos recién llegados en T se encolan antes que el proceso
 *   cuyo quantum acaba de expirar en T.
 * 
 * @param {Array<Object>} inputProcesses - Lista de procesos
 * @param {Object} [options={}] - Opciones de configuración
 * @param {number} [options.quantum=2] - Tamaño del cuanto de tiempo (Quantum)
 * @returns {Object} { timeline, processes, metrics, events }
 */
export function runRoundRobin(inputProcesses, options = {}) {
  const quantum = Math.max(1, parseInt(options.quantum, 10) || 2);

  if (!inputProcesses || inputProcesses.length === 0) {
    return { timeline: [], processes: [], metrics: {}, events: [] };
  }

  let stateProcesses = inputProcesses.map((p) => resetProcess(p));
  const timeline = [];
  const events = [];
  let currentTime = 0;
  let completedCount = 0;
  const totalCount = stateProcesses.length;

  // Cola FIFO de procesos listos (almacena IDs de procesos)
  const readyQueue = [];
  // Conjunto para evitar encolar duplicados en el mismo instante
  const enqueuedSet = new Set();

  let currentRunning = null;
  let currentQuantumUsed = 0;
  const maxSimulationTime = 500;

  while (completedCount < totalCount && currentTime < maxSimulationTime) {
    // 1. Agregar procesos que llegan exactamente en currentTime a la cola FIFO
    const newlyArrived = stateProcesses.filter(
      (p) => p.arrivalTime === currentTime && !enqueuedSet.has(p.id)
    );
    // Ordenar llegadas simultáneas por ID para predictibilidad
    newlyArrived.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

    newlyArrived.forEach((proc) => {
      readyQueue.push(proc.id);
      enqueuedSet.add(proc.id);

      events.push({
        time: currentTime,
        type: 'ARRIVAL',
        processId: proc.id,
        title: `📥 Llegada de ${proc.id}`,
        description: `El cliente ${proc.id} llega al banco y toma su turno al final de la fila. Requiere ${proc.burstTime}s de atención (Quantum = ${quantum}s).`,
        queue: [...readyQueue],
        activeProcessId: currentRunning ? currentRunning.id : null,
      });
    });

    // 2. Si la caja está libre, asignar el siguiente proceso de la cabeza de la cola
    if (!currentRunning && readyQueue.length > 0) {
      const nextId = readyQueue.shift();
      enqueuedSet.delete(nextId);
      currentRunning = stateProcesses.find((p) => p.id === nextId);
      currentQuantumUsed = 0;

      // Registrar primer tiempo de respuesta
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
        title: `🏁 Turno en Caja: ${currentRunning.id}`,
        description: `El cajero llama a ${currentRunning.id} para iniciar su turno de máximo ${quantum}s. Restante: ${currentRunning.remainingTime}s.`,
        queue: [...readyQueue],
        activeProcessId: currentRunning.id,
      });
    }

    // 3. Ejecutar 1 segundo en la CPU / Caja
    if (currentRunning) {
      timeline.push(currentRunning.id);

      const nextRemaining = currentRunning.remainingTime - 1;
      const nextExecuted = currentRunning.executedTime + 1;
      const nextQuantum = currentQuantumUsed + 1;
      const nextTime = currentTime + 1;

      // Paso 3.1: Encolar procesos que lleguen en nextTime ANTES de reenconlar el proceso desalojado
      const arrivalsAtNextTime = stateProcesses.filter(
        (p) => p.arrivalTime === nextTime && !enqueuedSet.has(p.id) && p.id !== currentRunning.id
      );
      arrivalsAtNextTime.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
      arrivalsAtNextTime.forEach((proc) => {
        readyQueue.push(proc.id);
        enqueuedSet.add(proc.id);
      });

      if (nextRemaining === 0) {
        // El proceso terminó antes o exactamente al vencer el quantum
        stateProcesses = stateProcesses.map((p) =>
          p.id === currentRunning.id
            ? cloneProcess(p, {
                remainingTime: 0,
                executedTime: nextExecuted,
                completionTime: nextTime,
              })
            : p
        );

        events.push({
          time: nextTime,
          type: 'FINISH',
          processId: currentRunning.id,
          title: `✅ Cliente Atendido: ${currentRunning.id}`,
          description: `El cliente ${currentRunning.id} completó su solicitud en T = ${nextTime}s y desocupa la ventanilla.`,
          queue: [...readyQueue],
          activeProcessId: null,
        });

        completedCount++;
        currentRunning = null;
        currentQuantumUsed = 0;
      } else if (nextQuantum === quantum) {
        // ⏱️ FIN DEL TURNO POR QUANTUM: Regresa al final de la fila
        const expiredProcess = cloneProcess(currentRunning, {
          remainingTime: nextRemaining,
          executedTime: nextExecuted,
        });

        stateProcesses = stateProcesses.map((p) =>
          p.id === expiredProcess.id ? expiredProcess : p
        );

        // Se envía al final de la fila
        readyQueue.push(expiredProcess.id);
        enqueuedSet.add(expiredProcess.id);

        events.push({
          time: nextTime,
          type: 'QUANTUM_EXPIRE',
          processId: expiredProcess.id,
          title: `⏱️ FIN DEL TURNO: ${expiredProcess.id}`,
          description: `El cliente ${expiredProcess.id} agotó su Quantum de ${quantum}s. Le quedan ${expiredProcess.remainingTime}s por atender y regresa al final de la fila bancaria.`,
          queue: [...readyQueue],
          activeProcessId: null,
        });

        currentRunning = null;
        currentQuantumUsed = 0;
      } else {
        // Continúa dentro de su mismo quantum
        currentRunning = cloneProcess(currentRunning, {
          remainingTime: nextRemaining,
          executedTime: nextExecuted,
        });
        currentQuantumUsed = nextQuantum;
        stateProcesses = stateProcesses.map((p) =>
          p.id === currentRunning.id ? currentRunning : p
        );
      }
    } else {
      // Caja libre
      timeline.push('IDLE');
      events.push({
        time: currentTime,
        type: 'IDLE',
        processId: 'IDLE',
        title: '🟢 CPU LIBRE (Caja en Espera)',
        description: 'La caja bancaria está vacía. Ningún cliente ha solicitado turno aún.',
        queue: [...readyQueue],
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
