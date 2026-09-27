import { cloneProcess, resetProcess } from '../models/Process.js';
import { calculateStats } from './calculateStats.js';

/**
 * =========================================================================================
 * ALGORITMO SRTF (Shortest Remaining Time First / Menor Tiempo Restante Primero)
 * =========================================================================================
 * 
 * 🏦 METÁFORA BANCARIA (LA CAJA CON DESALOJO):
 * Imaginemos una ventanilla de banco donde el cajero (la CPU) está atendiendo a un cliente.
 * Supongamos que el cliente P1 está en caja y aún le faltan 3 minutos de trámites (remainingTime = 3).
 * De repente, por la puerta del banco entra el cliente P2 (arrivalTime = T), quien únicamente
 * necesita pagar una factura rápida de 1 minuto (burstTime = 1).
 * 
 * En SRTF, el cajero aplica la regla de "apropiación" (preemption):
 * Como el tiempo restante de P2 (1 min) es MENOR que lo que le falta a P1 (3 min), el cajero
 * interrumpe amablemente a P1, guarda el avance que ya realizó, lo regresa a la fila de espera
 * con su saldo pendiente, y atiende de inmediato a P2.
 * 
 * -----------------------------------------------------------------------------------------
 * CONCEPTOS PEDAGÓGICOS CLAVE:
 * 
 * 1. 📥 LLEGADA (Arrival Time):
 *    Momento exacto en que un proceso ingresa a la memoria y pasa a la cola de "Listos"
 *    (Ready Queue). En cada segundo de simulación, el sistema evalúa si ingresaron nuevos
 *    procesos que compitan por la CPU.
 * 
 * 2. ⚡ DESALOJO (Preemption):
 *    Ocurre cuando la CPU le quita el control a un proceso en ejecución porque ha aparecido
 *    otro proceso cuyo tiempo restante es estrictamente menor. El proceso desalojado conserva
 *    su progreso (executedTime acumulado) y espera una nueva oportunidad en la fila.
 * 
 * 3. ⏳ TIEMPO RESTANTE (Remaining Time):
 *    Es la cantidad de ráfaga de CPU que aún le falta al proceso para culminar su labor:
 *    remainingTime = burstTime - executedTime.
 *    En SRTF, este valor se recalcula y compara cada segundo (tick).
 * 
 * 4. ⏱️ TIEMPO DE ESPERA (Waiting Time):
 *    Es el tiempo total que un proceso pasa en la fila sin recibir servicio de la CPU.
 *    En algoritmos apropiativos como SRTF, este tiempo se acumula de forma fragmentada
 *    (antes de empezar y durante los períodos posteriores a cada desalojo).
 *    Fórmula: Waiting Time = Turnaround Time - Burst Time.
 * 
 * 5. 🔄 TIEMPO DE RETORNO (Turnaround Time):
 *    Es el ciclo de vida completo del proceso en el sistema, desde su llegada hasta su finalización:
 *    Turnaround Time = Completion Time - Arrival Time.
 * =========================================================================================
 * 
 * @param {Array<Object>} inputProcesses - Colección de procesos a simular
 * @returns {Object} { timeline, processes, metrics, events }
 */
export function runSRTF(inputProcesses) {
  if (!inputProcesses || inputProcesses.length === 0) {
    return { timeline: [], processes: [], metrics: {}, events: [] };
  }

  // 1. Clonación inmutable del estado inicial de los procesos
  let stateProcesses = inputProcesses.map((p) => resetProcess(p));
  
  const timeline = [];
  const events = [];
  let currentTime = 0;
  let completedCount = 0;
  const totalCount = stateProcesses.length;

  let currentRunning = null;
  const maxSimulationTime = 500; // Guarda de seguridad contra desbordamientos

  while (completedCount < totalCount && currentTime < maxSimulationTime) {
    // -------------------------------------------------------------------------------------
    // PASO A: REGISTRO DE LLEGADAS EN EL SEGUNDO ACTUAL (T)
    // -------------------------------------------------------------------------------------
    const newlyArrived = stateProcesses.filter((p) => p.arrivalTime === currentTime);
    newlyArrived.forEach((proc) => {
      events.push({
        time: currentTime,
        type: 'ARRIVAL',
        processId: proc.id,
        title: `📥 Llegada de ${proc.id}`,
        description: `El cliente ${proc.id} llega al banco en T = ${currentTime}s con ráfaga inicial de ${proc.burstTime}s. Se evalúa su tiempo restante frente a la caja.`,
        queue: stateProcesses
          .filter((p) => p.arrivalTime <= currentTime && p.remainingTime > 0 && (!currentRunning || p.id !== currentRunning.id))
          .map((p) => p.id),
        activeProcessId: currentRunning ? currentRunning.id : null,
      });
    });

    // -------------------------------------------------------------------------------------
    // PASO B: EVALUACIÓN DE CANDIDATOS LISTOS (READY QUEUE)
    // -------------------------------------------------------------------------------------
    // Obtenemos todos los procesos que ya llegaron y tienen trabajo pendiente
    const readyProcesses = stateProcesses
      .filter((p) => p.arrivalTime <= currentTime && p.remainingTime > 0)
      .sort((a, b) => {
        // Criterio Primario: Menor tiempo restante (Remaining Time)
        if (a.remainingTime !== b.remainingTime) {
          return a.remainingTime - b.remainingTime;
        }
        // Desempate 1: Menor tiempo de llegada (quien llegó primero tiene prioridad)
        if (a.arrivalTime !== b.arrivalTime) {
          return a.arrivalTime - b.arrivalTime;
        }
        // Desempate 2: ID lexicográfico/numérico
        return a.id.localeCompare(b.id, undefined, { numeric: true });
      });

    // -------------------------------------------------------------------------------------
    // PASO C: LÓGICA DE APROPIACIÓN / DESALOJO (PREEMPTION)
    // -------------------------------------------------------------------------------------
    if (readyProcesses.length > 0) {
      const bestCandidate = readyProcesses[0];

      if (!currentRunning) {
        // La caja estaba vacía: Asignamos directamente al mejor candidato
        currentRunning = bestCandidate;

        // Registrar tiempo de primera respuesta si es la primera vez que ingresa a caja
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
          title: `🏁 Inicio en Caja: ${currentRunning.id}`,
          description: `El cliente ${currentRunning.id} pasa a ventanilla. Tiempo restante: ${currentRunning.remainingTime}s.`,
          queue: stateProcesses
            .filter((p) => p.arrivalTime <= currentTime && p.remainingTime > 0 && p.id !== currentRunning.id)
            .map((p) => p.id),
          activeProcessId: currentRunning.id,
        });
      } else if (bestCandidate.id !== currentRunning.id && bestCandidate.remainingTime < currentRunning.remainingTime) {
        // ¡⚡ DESALOJO DETECTADO!
        // Un nuevo cliente en espera tiene estrictamente menor tiempo restante que el cliente en caja.
        const preemptedProcess = currentRunning;
        currentRunning = bestCandidate;

        // Registrar primer tiempo de respuesta para el nuevo proceso si entra por primera vez
        if (currentRunning.firstExecutionTime === null) {
          stateProcesses = stateProcesses.map((p) =>
            p.id === currentRunning.id ? cloneProcess(p, { firstExecutionTime: currentTime }) : p
          );
          currentRunning = cloneProcess(currentRunning, { firstExecutionTime: currentTime });
        }

        events.push({
          time: currentTime,
          type: 'PREEMPT',
          processId: currentRunning.id,
          title: `⚡ DESALOJO: ${currentRunning.id} reemplaza a ${preemptedProcess.id}`,
          description: `¡Desalojo en ventanilla! El cliente ${currentRunning.id} (restante: ${currentRunning.remainingTime}s) desaloja a ${preemptedProcess.id} (restante: ${preemptedProcess.remainingTime}s). ${preemptedProcess.id} vuelve a la fila de espera conservando su progreso.`,
          queue: stateProcesses
            .filter((p) => p.arrivalTime <= currentTime && p.remainingTime > 0 && p.id !== currentRunning.id)
            .map((p) => p.id),
          activeProcessId: currentRunning.id,
        });
      }
    }

    // -------------------------------------------------------------------------------------
    // PASO D: EJECUCIÓN DE 1 SEGUNDO DE CPU (TICK)
    // -------------------------------------------------------------------------------------
    if (currentRunning) {
      timeline.push(currentRunning.id);

      const nextRemaining = currentRunning.remainingTime - 1;
      const nextExecuted = currentRunning.executedTime + 1;

      if (nextRemaining === 0) {
        // El proceso finaliza en T + 1
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
          time: currentTime + 1,
          type: 'FINISH',
          processId: currentRunning.id,
          title: `✅ Cliente Atendido: ${currentRunning.id}`,
          description: `El cliente ${currentRunning.id} completó su tiempo total en T = ${finishTime}s. Deja la caja bancaria libre para el siguiente proceso con menor tiempo restante.`,
          queue: stateProcesses
            .filter((p) => p.arrivalTime <= finishTime && p.remainingTime > 0 && p.id !== currentRunning.id)
            .map((p) => p.id),
          activeProcessId: null,
        });

        completedCount++;
        currentRunning = null; // Se evaluará al mejor candidato en el siguiente ciclo
      } else {
        // El proceso continúa con su tiempo restante decrementado
        currentRunning = cloneProcess(currentRunning, {
          remainingTime: nextRemaining,
          executedTime: nextExecuted,
        });
        stateProcesses = stateProcesses.map((p) =>
          p.id === currentRunning.id ? currentRunning : p
        );
      }
    } else {
      // -----------------------------------------------------------------------------------
      // PASO E: CPU EN ESTADO OCIOSO (IDLE)
      // -----------------------------------------------------------------------------------
      timeline.push('IDLE');
      events.push({
        time: currentTime,
        type: 'IDLE',
        processId: 'IDLE',
        title: '🟢 CPU LIBRE (Caja en Espera)',
        description: 'La caja bancaria se encuentra libre sin clientes en fila. Esperando el arribo del siguiente proceso.',
        queue: [],
        activeProcessId: null,
      });
    }

    currentTime++;
  }

  // ---------------------------------------------------------------------------------------
  // PASO F: CÁLCULO RIGUROSO DE MÉTRICAS FINALES
  // ---------------------------------------------------------------------------------------
  const { processes: finalProcesses, metrics } = calculateStats(stateProcesses, timeline, events);

  return {
    timeline,
    processes: finalProcesses,
    metrics,
    events,
  };
}
