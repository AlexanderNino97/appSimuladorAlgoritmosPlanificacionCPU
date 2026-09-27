import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  ChevronRight,
  ChevronLeft,
  Building2,
  Clock,
  Award,
  Zap,
  CheckCircle2,
  Sliders,
  Settings,
  BarChart3,
  HelpCircle,
  AlertTriangle,
  UserCheck,
  Flame,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { runFCFS } from '../algorithms/fcfs.js';
import { runSJF } from '../algorithms/sjf.js';
import { runSRTF } from '../algorithms/srtf.js';
import { runRoundRobin } from '../algorithms/roundRobin.js';
import { runPriority } from '../algorithms/priority.js';
import './SimulationView.css';

/**
 * Vista de Simulación Interactiva con Metáfora Bancaria.
 * 
 * CPU = Caja Bancaria (🏦 CAJA/CPU)
 * Procesos = Clientes esperando en fila
 * Prioridad = Fila VIP (🏆 FILA VIP)
 */
export default function SimulationView({
  processes,
  quantum,
  selectedAlgorithm,
  setSelectedAlgorithm,
  onBackToConfig,
  onViewResults,
}) {
  // Estado de la simulación
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(600); // 100ms - 1500ms
  const timerRef = useRef(null);

  // Ejecución del algoritmo seleccionado
  const simulationData = useMemo(() => {
    switch (selectedAlgorithm) {
      case 'FCFS':
        return runFCFS(processes);
      case 'SJF':
        return runSJF(processes);
      case 'SRTF':
        return runSRTF(processes);
      case 'RR':
        return runRoundRobin(processes, { quantum });
      case 'PRIORITY':
        return runPriority(processes);
      default:
        return runFCFS(processes);
    }
  }, [processes, selectedAlgorithm, quantum]);

  const { timeline, events, processes: finalProcesses, metrics } = simulationData;
  const maxTime = timeline.length;
  const isFinished = currentTime >= maxTime;

  // Manejo del temporizador de reproducción
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev + 1 >= maxTime) {
            setIsPlaying(false);
            return maxTime;
          }
          return prev + 1;
        });
      }, speedMs);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, maxTime, speedMs]);

  // Al cambiar de algoritmo, reiniciar tiempo y detener
  const handleSelectAlgorithm = (algoKey) => {
    setIsPlaying(false);
    setSelectedAlgorithm(algoKey);
    setCurrentTime(0);
  };

  // Controles de paso
  const handlePlayPause = () => {
    if (isFinished) {
      setCurrentTime(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    if (currentTime < maxTime) {
      setCurrentTime((prev) => prev + 1);
    }
  };

  const handleStepBackward = () => {
    setIsPlaying(false);
    if (currentTime > 0) {
      setCurrentTime((prev) => prev - 1);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleCompleteAll = () => {
    setIsPlaying(false);
    setCurrentTime(maxTime);
  };

  // Determinar qué proceso está en CPU en el segundo actual
  const currentProcessId = currentTime < maxTime ? timeline[currentTime] : null;
  const isCpuIdle = currentProcessId === 'IDLE';

  // Calcular estado dinámico de cada proceso en currentTime
  const dynamicProcessStates = useMemo(() => {
    return processes.map((p) => {
      // Ticks ejecutados hasta currentTime
      const executed = timeline
        .slice(0, currentTime)
        .filter((id) => id === p.id).length;

      const remaining = Math.max(0, p.burstTime - executed);
      const hasArrived = p.arrivalTime <= currentTime;
      const isCompleted = executed === p.burstTime;
      const isCurrentlyInCpu = currentProcessId === p.id;
      const isInWaitingQueue = hasArrived && !isCompleted && !isCurrentlyInCpu;

      // Porcentaje de progreso de atención
      const progressPercent = Math.min(
        100,
        Math.round((executed / p.burstTime) * 100)
      );

      return {
        ...p,
        executed,
        remaining,
        hasArrived,
        isCompleted,
        isCurrentlyInCpu,
        isInWaitingQueue,
        progressPercent,
      };
    });
  }, [processes, timeline, currentTime, currentProcessId]);

  // Proceso en ventanilla actual
  const activeProcess = dynamicProcessStates.find((p) => p.isCurrentlyInCpu);

  // Clasificación de filas según el algoritmo
  const isPriorityMode = selectedAlgorithm === 'PRIORITY';

  // Fila VIP (Prioridad 1) vs Fila General (Prioridad > 1)
  const vipQueue = dynamicProcessStates.filter(
    (p) => p.isInWaitingQueue && p.priority === 1
  );
  const generalQueue = dynamicProcessStates.filter(
    (p) => p.isInWaitingQueue && (!isPriorityMode || p.priority > 1)
  );

  // Clientes aún no llegados (En camino)
  const incomingProcesses = dynamicProcessStates.filter((p) => !p.hasArrived);

  // Clientes ya finalizados
  const completedProcesses = dynamicProcessStates.filter((p) => p.isCompleted);

  // Eventos ocurridos en el segundo actual (para el panel educativo)
  const currentEvents = events.filter((e) => e.time === currentTime);
  const recentEvents = currentEvents.length > 0 
    ? currentEvents 
    : events.filter((e) => e.time <= currentTime).slice(-2);

  // Detección de desalojo en el segundo actual
  const hasPreemptionNow = currentEvents.some((e) => e.type === 'PREEMPT');
  const hasQuantumExpireNow = currentEvents.some((e) => e.type === 'QUANTUM_EXPIRE');

  return (
    <div className="simulation-container">
      {/* Barra Superior de Control y Algoritmos */}
      <header className="simulation-header">
        <div className="header-left">
          <div className="algo-selector-tabs">
            <button
              type="button"
              className={`algo-tab ${selectedAlgorithm === 'FCFS' ? 'active' : ''}`}
              onClick={() => handleSelectAlgorithm('FCFS')}
            >
              FCFS
            </button>
            <button
              type="button"
              className={`algo-tab ${selectedAlgorithm === 'SJF' ? 'active' : ''}`}
              onClick={() => handleSelectAlgorithm('SJF')}
            >
              SJF
            </button>
            <button
              type="button"
              className={`algo-tab ${selectedAlgorithm === 'SRTF' ? 'active' : ''}`}
              onClick={() => handleSelectAlgorithm('SRTF')}
            >
              ⚡ SRTF (Desalojo)
            </button>
            <button
              type="button"
              className={`algo-tab ${selectedAlgorithm === 'RR' ? 'active' : ''}`}
              onClick={() => handleSelectAlgorithm('RR')}
            >
              Round Robin {selectedAlgorithm === 'RR' && `(Q=${quantum})`}
            </button>
            <button
              type="button"
              className={`algo-tab ${selectedAlgorithm === 'PRIORITY' ? 'active' : ''}`}
              onClick={() => handleSelectAlgorithm('PRIORITY')}
            >
              🏆 Prioridad (VIP)
            </button>
          </div>
        </div>

        <div className="header-nav-actions">
          <button
            type="button"
            className="nav-btn secondary"
            onClick={onBackToConfig}
          >
            <Settings size={16} />
            <span>Configuración</span>
          </button>
          <button
            type="button"
            className="nav-btn primary"
            onClick={onViewResults}
          >
            <BarChart3 size={16} />
            <span>Ver Métricas & Gantt</span>
          </button>
        </div>
      </header>

      {/* Barra de Tiempo y Métricas Clave en Vivo */}
      <section className="live-metrics-bar">
        <div className="timer-badge">
          <Clock size={20} className={isPlaying ? 'icon-spin' : ''} />
          <div className="timer-info">
            <span className="timer-label">Segundo Actual (Ciclo CPU)</span>
            <span className="timer-value">
              T = {currentTime}s <span className="timer-max">/ {maxTime}s</span>
            </span>
          </div>
        </div>

        <div className="quick-metric">
          <span className="quick-metric-label">Clientes en Fila</span>
          <span className="quick-metric-val">
            {vipQueue.length + generalQueue.length}
          </span>
        </div>

        <div className="quick-metric">
          <span className="quick-metric-label">Atendidos</span>
          <span className="quick-metric-val emerald">
            {completedProcesses.length} / {processes.length}
          </span>
        </div>

        <div className="quick-metric">
          <span className="quick-metric-label">Utilización CPU</span>
          <span className="quick-metric-val cyan">
            {currentTime > 0
              ? `${Math.round(
                  (timeline.slice(0, currentTime).filter((x) => x !== 'IDLE').length /
                    currentTime) *
                    100
                )}%`
              : '0%'}
          </span>
        </div>

        {selectedAlgorithm === 'RR' && (
          <div className="quick-metric">
            <span className="quick-metric-label">Quantum Asignado</span>
            <span className="quick-metric-val purple">{quantum}s</span>
          </div>
        )}
      </section>

      {/* Escenario Bancario Visual Principal */}
      <main className="bank-stage">
        {/* Lado Izquierdo: Las Filas de Espera */}
        <section className="bank-queues-area">
          {/* Fila VIP si está en modo Prioridad */}
          {isPriorityMode && (
            <div className="queue-block vip-block">
              <div className="queue-title-bar vip">
                <div className="title-with-icon">
                  <Award size={18} className="vip-icon" />
                  <h3>🏆 FILA VIP (Prioridad 1)</h3>
                </div>
                <span className="queue-count">{vipQueue.length} en espera</span>
              </div>
              <div className="queue-clients-list">
                {vipQueue.length === 0 ? (
                  <div className="empty-queue-msg">No hay clientes VIP en espera</div>
                ) : (
                  vipQueue.map((p, idx) => (
                    <div
                      key={p.id}
                      className="client-card vip-card"
                      style={{ borderLeftColor: p.color }}
                    >
                      <div className="client-badge-num">#{idx + 1}</div>
                      <div className="client-main-info">
                        <div className="client-name-row">
                          <span className="client-id" style={{ color: p.color }}>
                            {p.id}
                          </span>
                          <span className="vip-tag">VIP</span>
                        </div>
                        <span className="client-name">{p.name}</span>
                        <div className="client-times">
                          <span>⏳ Restante: <strong>{p.remaining}s</strong></span>
                          <span>📥 Llegó: {p.arrivalTime}s</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Fila General / Ready Queue */}
          <div className="queue-block general-block">
            <div className="queue-title-bar">
              <div className="title-with-icon">
                <Building2 size={18} />
                <h3>
                  {isPriorityMode
                    ? '👤 Fila General (Prioridades 2+)'
                    : '👥 Fila de Espera (Ready Queue)'}
                </h3>
              </div>
              <span className="queue-count">{generalQueue.length} en espera</span>
            </div>

            <div className="queue-clients-list">
              {generalQueue.length === 0 ? (
                <div className="empty-queue-msg">
                  No hay clientes en esta fila de espera
                </div>
              ) : (
                generalQueue.map((p, idx) => (
                  <div
                    key={p.id}
                    className="client-card"
                    style={{ borderLeftColor: p.color }}
                  >
                    <div className="client-badge-num">#{idx + 1}</div>
                    <div className="client-main-info">
                      <div className="client-name-row">
                        <span className="client-id" style={{ color: p.color }}>
                          {p.id}
                        </span>
                        <span className="prio-tag">Prio {p.priority}</span>
                      </div>
                      <span className="client-name">{p.name}</span>
                      <div className="client-times">
                        <span>⏳ Restante: <strong>{p.remaining}s</strong></span>
                        <span>📥 Llegó: {p.arrivalTime}s</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Clientes En Camino (Aún no han llegado al banco) */}
          {incomingProcesses.length > 0 && (
            <div className="incoming-block">
              <span className="incoming-title">🚶 Clientes en camino (Aún no llegan):</span>
              <div className="incoming-chips">
                {incomingProcesses.map((p) => (
                  <div key={p.id} className="incoming-chip">
                    <span className="dot" style={{ backgroundColor: p.color }} />
                    <span>{p.id} (llega en T={p.arrivalTime}s)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Centro: Ventanilla del Cajero Bancario (🏦 CAJA/CPU) */}
        <section className={`cashier-desk-area ${hasPreemptionNow ? 'flash-preempt' : ''}`}>
          <div className="cashier-booth-header">
            <div className="booth-title">
              <Building2 size={24} className="booth-icon" />
              <div>
                <h2>🏦 VENTANILLA DE ATENCIÓN (CPU)</h2>
                <span className="booth-status-text">
                  {isFinished
                    ? '🎉 Todas las solicitudes fueron atendidas'
                    : isCpuIdle
                    ? '🟢 CAJA LIBRE (Esperando clientes)'
                    : activeProcess
                    ? `Atendiendo a ${activeProcess.id} (${activeProcess.name})`
                    : 'Preparando siguiente turno...'}
                </span>
              </div>
            </div>

            {hasPreemptionNow && (
              <div className="alert-badge-preempt">
                <Zap size={16} /> ⚡ ¡DESALOJO EN CURSO!
              </div>
            )}
            {hasQuantumExpireNow && (
              <div className="alert-badge-quantum">
                <Clock size={16} /> ⏱️ FIN DE TURNO (QUANTUM)
              </div>
            )}
          </div>

          {/* Slot de Atención en Ventanilla */}
          <div className="cashier-slot">
            {isFinished ? (
              <div className="slot-empty-state finished">
                <CheckCircle2 size={48} className="icon-emerald" />
                <h3>¡Simulación Completada!</h3>
                <p>Todos los procesos han culminado su tiempo de ráfaga.</p>
                <button
                  type="button"
                  className="btn-gantt-jump"
                  onClick={onViewResults}
                >
                  <BarChart3 size={18} /> Ver Diagrama de Gantt y Métricas
                </button>
              </div>
            ) : isCpuIdle ? (
              <div className="slot-empty-state idle">
                <div className="idle-teller-avatar">
                  <span className="avatar-emoji">👨‍💼</span>
                  <div className="idle-indicator-dot" />
                </div>
                <h3>🟢 CPU LIBRE (Caja en Reposo)</h3>
                <p>No hay ningún proceso listo para atender en T = {currentTime}s.</p>
                <span className="idle-subtext">Esperando la llegada del siguiente cliente...</span>
              </div>
            ) : activeProcess ? (
              <div className="active-client-desk">
                <div className="teller-and-client">
                  {/* Cajero */}
                  <div className="teller-side">
                    <div className="teller-badge">👨‍💼 Cajero CPU</div>
                    <span className="teller-action">Procesando solicitud...</span>
                  </div>

                  <ArrowRight size={28} className="exchange-arrow" />

                  {/* Cliente en Caja */}
                  <div 
                    className="client-service-box"
                    style={{ borderColor: activeProcess.color }}
                  >
                    <div className="client-service-top">
                      <div className="client-id-badge" style={{ backgroundColor: activeProcess.color }}>
                        {activeProcess.id}
                      </div>
                      <div>
                        <h4 className="active-proc-name">{activeProcess.name}</h4>
                        <div className="active-proc-tags">
                          {activeProcess.priority === 1 ? (
                            <span className="badge-vip-small">🏆 VIP</span>
                          ) : (
                            <span className="badge-prio-small">Prio {activeProcess.priority}</span>
                          )}
                          <span className="badge-burst-small">
                            Ráfaga Total: {activeProcess.burstTime}s
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Barra de Progreso de Atención */}
                    <div className="progress-section">
                      <div className="progress-labels">
                        <span>Progreso de Atención</span>
                        <span className="progress-val">{activeProcess.progressPercent}%</span>
                      </div>
                      <div className="progress-bar-track">
                        <div
                          className="progress-bar-fill"
                          style={{
                            width: `${activeProcess.progressPercent}%`,
                            backgroundColor: activeProcess.color,
                          }}
                        />
                      </div>
                    </div>

                    {/* Tiempos en Caja */}
                    <div className="service-stats-grid">
                      <div className="stat-box">
                        <span className="stat-box-label">Atendido</span>
                        <span className="stat-box-num">
                          {activeProcess.executed}s
                        </span>
                      </div>
                      <div className="stat-box">
                        <span className="stat-box-label">Restante</span>
                        <span className="stat-box-num highlight-amber">
                          {activeProcess.remaining}s
                        </span>
                      </div>
                      <div className="stat-box">
                        <span className="stat-box-label">Llegó en</span>
                        <span className="stat-box-num">
                          {activeProcess.arrivalTime}s
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Mini Tira de Tiempo Reciente (Gantt en Vivo) */}
          <div className="mini-timeline-strip">
            <span className="strip-title">Ruta de Ejecución hasta T={currentTime}s:</span>
            <div className="strip-slots">
              {timeline.slice(0, Math.max(1, currentTime)).map((slotId, idx) => {
                const proc = processes.find((p) => p.id === slotId);
                const isIdleSlot = slotId === 'IDLE';
                return (
                  <div
                    key={idx}
                    className={`mini-slot ${isIdleSlot ? 'idle-slot' : ''} ${
                      idx === currentTime - 1 ? 'current-slot-highlight' : ''
                    }`}
                    style={
                      !isIdleSlot && proc ? { backgroundColor: proc.color } : {}
                    }
                    title={`Segundo ${idx}: ${slotId}`}
                  >
                    <span>{slotId}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Lado Derecho: Clientes Atendidos */}
        <section className="bank-finished-area">
          <div className="finished-title-bar">
            <div className="title-with-icon">
              <CheckCircle2 size={18} className="icon-emerald" />
              <h3>✅ Clientes Atendidos ({completedProcesses.length})</h3>
            </div>
          </div>

          <div className="finished-clients-list">
            {completedProcesses.length === 0 ? (
              <div className="empty-queue-msg">
                Aún no ha finalizado ningún cliente
              </div>
            ) : (
              completedProcesses.map((p) => {
                const finalInfo = finalProcesses.find((fp) => fp.id === p.id) || p;
                return (
                  <div
                    key={p.id}
                    className="finished-card"
                    style={{ borderLeftColor: p.color }}
                  >
                    <div className="finished-header">
                      <span className="finished-id" style={{ color: p.color }}>
                        {p.id}
                      </span>
                      <span className="finished-badge">
                        Terminó en T = {finalInfo.completionTime}s
                      </span>
                    </div>
                    <div className="finished-metrics-row">
                      <span>Espera: <strong>{finalInfo.waitingTime}s</strong></span>
                      <span>Retorno: <strong>{finalInfo.turnaroundTime}s</strong></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      {/* Panel Educativo Dinámico: "¿QUÉ ESTÁ PASANDO?" */}
      <section className="educational-event-panel">
        <div className="edu-panel-header">
          <div className="title-with-icon">
            <HelpCircle size={20} className="icon-cyan" />
            <h3>💡 ¿QUÉ ESTÁ PASANDO EN ESTE SEGUNDO? (T = {currentTime}s)</h3>
          </div>
          <span className="edu-algo-tag">Regla Activa: {selectedAlgorithm}</span>
        </div>

        <div className="edu-panel-body">
          {recentEvents.length === 0 ? (
            <p className="edu-text">
              La simulación está en su estado inicial (T = 0s). Presiona el botón de inicio para ver cómo interactúa el despachador de CPU según el algoritmo seleccionado.
            </p>
          ) : (
            <div className="events-log-list">
              {recentEvents.map((evt, idx) => (
                <div key={idx} className={`event-log-item type-${evt.type.toLowerCase()}`}>
                  <div className="event-item-top">
                    <span className="event-time-badge">T = {evt.time}s</span>
                    <strong className="event-title">{evt.title}</strong>
                  </div>
                  <p className="event-description">{evt.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Barra de Controles de Simulación Inferior */}
      <footer className="simulation-controls-dock">
        <div className="controls-group">
          {/* Botón Reiniciar */}
          <button
            type="button"
            className="ctrl-btn"
            onClick={handleReset}
            title="Reiniciar Simulación al segundo 0"
          >
            <RotateCcw size={18} />
            <span>Reiniciar</span>
          </button>

          {/* Paso Atrás */}
          <button
            type="button"
            className="ctrl-btn"
            onClick={handleStepBackward}
            disabled={currentTime === 0}
            title="Paso Anterior (-1 seg)"
          >
            <ChevronLeft size={20} />
            <span>-1 Seg</span>
          </button>

          {/* Botón Principal Reproducir / Pausa */}
          <button
            type="button"
            className={`ctrl-btn play-pause-btn ${isPlaying ? 'playing' : ''}`}
            onClick={handlePlayPause}
          >
            {isPlaying ? (
              <>
                <Pause size={20} />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play size={20} />
                <span>{isFinished ? 'Repetir' : 'Iniciar'}</span>
              </>
            )}
          </button>

          {/* Paso Adelante */}
          <button
            type="button"
            className="ctrl-btn"
            onClick={handleStepForward}
            disabled={isFinished}
            title="Siguiente Segundo (+1 seg)"
          >
            <span>+1 Seg</span>
            <ChevronRight size={20} />
          </button>

          {/* Simular Todo */}
          <button
            type="button"
            className="ctrl-btn"
            onClick={handleCompleteAll}
            disabled={isFinished}
            title="Ir al final de la simulación"
          >
            <SkipForward size={18} />
            <span>Completar</span>
          </button>
        </div>

        {/* Control de Velocidad (Slider) */}
        <div className="speed-control-slider">
          <div className="speed-label">
            <Sliders size={16} />
            <span>Velocidad: {speedMs}ms / ciclo</span>
          </div>
          <div className="slider-wrapper">
            <span className="slider-hint">Rápido</span>
            <input
              type="range"
              min="100"
              max="1500"
              step="50"
              value={speedMs}
              onChange={(e) => setSpeedMs(parseInt(e.target.value, 10))}
              className="speed-range-input"
            />
            <span className="slider-hint">Lento (Paso a paso)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
