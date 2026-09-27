import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  ChevronRight,
  ChevronLeft,
  Trophy,
  Award,
  Zap,
  Clock,
  Sparkles,
  X,
  Sliders,
  Users,
  Plus,
  Trash2,
  Building2,
  CheckCircle2
} from 'lucide-react';
import { createProcess, getProcessColor } from './models/Process.js';
import { runFCFS } from './algorithms/fcfs.js';
import { runSJF } from './algorithms/sjf.js';
import { runSRTF } from './algorithms/srtf.js';
import { runRoundRobin } from './algorithms/roundRobin.js';
import { runPriority } from './algorithms/priority.js';
import './App.css';

/**
 * Procesos iniciales por defecto (Caso balanceado).
 */
const DEFAULT_PROCESSES = [
  createProcess({ id: 'P1', name: 'Caballero P1', arrivalTime: 0, burstTime: 6, priority: 3 }, 0),
  createProcess({ id: 'P2', name: 'Princesa P2 (VIP)', arrivalTime: 2, burstTime: 3, priority: 1 }, 1),
  createProcess({ id: 'P3', name: 'Mago P3', arrivalTime: 4, burstTime: 1, priority: 4 }, 2),
  createProcess({ id: 'P4', name: 'Arquero P4', arrivalTime: 6, burstTime: 4, priority: 2 }, 3),
];

// Emojis de personajes RPG retro
const CHARACTER_AVATARS = {
  P1: '🛡️',
  P2: '👑',
  P3: '🧙',
  P4: '🏹',
  P5: '🗡️',
  P6: '🧝',
  P7: '🥷',
  P8: '🐉',
};

export default function App() {
  // Lista dinámica de procesos (clientes)
  const [processes, setProcesses] = useState(DEFAULT_PROCESSES);
  const [quantum, setQuantum] = useState(2);

  // Reloj Maestro Global (Global Master Clock)
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(700);
  const timerRef = useRef(null);

  // Modal interactivo de ficha de personaje
  const [selectedCharacterModal, setSelectedCharacterModal] = useState(null);

  // --------------------------------------------------------------------------
  // CÁLCULO DE LOS 5 ALGORITMOS EN PARALELO
  // --------------------------------------------------------------------------
  const allSimulations = useMemo(() => {
    return {
      FCFS: {
        key: 'FCFS',
        name: 'FCFS (Primero en Llegar)',
        badgeClass: 'badge-fcfs',
        data: runFCFS(processes),
      },
      SJF: {
        key: 'SJF',
        name: 'SJF (Trabajo Más Corto)',
        badgeClass: 'badge-sjf',
        data: runSJF(processes),
      },
      SRTF: {
        key: 'SRTF',
        name: 'SRTF (⚡ Menor Restante - Desalojo)',
        badgeClass: 'badge-srtf',
        data: runSRTF(processes),
      },
      RR: {
        key: 'RR',
        name: `Round Robin (⏱️ Quantum = ${quantum}s)`,
        badgeClass: 'badge-rr',
        data: runRoundRobin(processes, { quantum }),
      },
      PRIORITY: {
        key: 'PRIORITY',
        name: 'Prioridad (🏆 Fila VIP)',
        badgeClass: 'badge-prio',
        data: runPriority(processes),
      },
    };
  }, [processes, quantum]);

  // Duración máxima de la simulación
  const maxSimulationDuration = useMemo(() => {
    return Math.max(
      ...Object.values(allSimulations).map((sim) => sim.data.timeline.length),
      1
    );
  }, [allSimulations]);

  const isCompleted = currentTime >= maxSimulationDuration;

  // --------------------------------------------------------------------------
  // TEMPORIZADOR DEL RELOJ MAESTRO
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev + 1 >= maxSimulationDuration) {
            setIsPlaying(false);
            return maxSimulationDuration;
          }
          return prev + 1;
        });
      }, speedMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, maxSimulationDuration, speedMs]);

  // Controles
  const handlePlayPause = () => {
    if (isCompleted) {
      setCurrentTime(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    if (currentTime < maxSimulationDuration) {
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
    setCurrentTime(maxSimulationDuration);
  };

  // --------------------------------------------------------------------------
  // GESTIÓN DINÁMICA DE CLIENTES (AGREGAR / QUITAR)
  // --------------------------------------------------------------------------
  const handleAddProcess = () => {
    if (processes.length >= 8) return;
    const nextIndex = processes.length;
    const nextId = `P${nextIndex + 1}`;
    const maxArrival = processes.length > 0 
      ? Math.max(...processes.map((p) => p.arrivalTime)) 
      : 0;

    const newProc = createProcess({
      id: nextId,
      name: `Cliente ${nextId}`,
      arrivalTime: maxArrival + 1,
      burstTime: 3,
      priority: 2,
      color: getProcessColor(nextId, nextIndex),
    }, nextIndex);

    setProcesses([...processes, newProc]);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleRemoveProcess = (id) => {
    if (processes.length <= 2) return; // Mínimo 2 procesos para simulación
    setProcesses(processes.filter((p) => p.id !== id));
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleProcessParamChange = (id, field, value) => {
    const num = value === '' ? '' : parseInt(value, 10);
    setProcesses((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return {
            ...p,
            [field]: isNaN(num) ? 0 : num,
          };
        }
        return p;
      })
    );
    setCurrentTime(0);
    setIsPlaying(false);
  };

  // --------------------------------------------------------------------------
  // PRESETS DIDÁCTICOS
  // --------------------------------------------------------------------------
  const loadPreset = (presetType) => {
    setIsPlaying(false);
    setCurrentTime(0);

    let presetList = [];
    let presetQ = 2;

    switch (presetType) {
      case 'srtf_demo':
        presetList = [
          { id: 'P1', name: 'Caballero P1', arrivalTime: 0, burstTime: 8, priority: 2 },
          { id: 'P2', name: 'Rápido P2 (⚡ Desalojo)', arrivalTime: 1, burstTime: 4, priority: 1 },
          { id: 'P3', name: 'Mago P3', arrivalTime: 2, burstTime: 2, priority: 3 },
          { id: 'P4', name: 'Flash P4', arrivalTime: 3, burstTime: 1, priority: 2 },
        ];
        presetQ = 2;
        break;

      case 'round_robin':
        presetList = [
          { id: 'P1', name: 'Caballero P1', arrivalTime: 0, burstTime: 5, priority: 2 },
          { id: 'P2', name: 'Escudero P2', arrivalTime: 1, burstTime: 4, priority: 2 },
          { id: 'P3', name: 'Mago P3', arrivalTime: 2, burstTime: 6, priority: 2 },
          { id: 'P4', name: 'Arquero P4', arrivalTime: 3, burstTime: 3, priority: 2 },
        ];
        presetQ = 2;
        break;

      case 'vip_prio':
        presetList = [
          { id: 'P1', name: 'Cliente P1 (General)', arrivalTime: 0, burstTime: 4, priority: 3 },
          { id: 'P2', name: 'Rey P2 (👑 VIP)', arrivalTime: 1, burstTime: 3, priority: 1 },
          { id: 'P3', name: 'Cliente P3 (General)', arrivalTime: 2, burstTime: 5, priority: 4 },
          { id: 'P4', name: 'Reina P4 (👑 VIP)', arrivalTime: 3, burstTime: 2, priority: 1 },
        ];
        presetQ = 3;
        break;

      case 'standard':
      default:
        presetList = [
          { id: 'P1', name: 'Caballero P1', arrivalTime: 0, burstTime: 6, priority: 3 },
          { id: 'P2', name: 'Princesa P2 (VIP)', arrivalTime: 2, burstTime: 3, priority: 1 },
          { id: 'P3', name: 'Mago P3', arrivalTime: 4, burstTime: 1, priority: 4 },
          { id: 'P4', name: 'Arquero P4', arrivalTime: 6, burstTime: 4, priority: 2 },
        ];
        presetQ = 2;
        break;
    }

    setProcesses(presetList.map((p, idx) => createProcess(p, idx)));
    setQuantum(presetQ);
  };

  // Ranking en vivo
  const liveRankings = useMemo(() => {
    const list = Object.values(allSimulations).map((sim) => ({
      key: sim.key,
      name: sim.name,
      avgWaiting: sim.data.metrics.avgWaitingTime,
      avgTurnaround: sim.data.metrics.avgTurnaroundTime,
      preemptions: sim.data.metrics.preemptions,
    }));

    list.sort((a, b) => a.avgWaiting - b.avgWaiting);
    return list;
  }, [allSimulations]);

  return (
    <div className="app-retro-container">
      {/* 1. ENCABEZADO SUPERIOR RETRO */}
      <header className="retro-top-banner">
        <div className="banner-left">
          <div className="pixel-logo-icon">🏦</div>
          <div>
            <h1 className="game-title">⚔️ SIMULADOR CPU: LA GRAN CARRERA BANCARIA ⚔️</h1>
            <p className="game-subtitle">
              [8-BIT CPU SCHEDULING ARENA] • 5 ALGORITMOS COMPITIENDO SIMULTÁNEAMENTE EN TIEMPO REAL
            </p>
          </div>
        </div>

        <div className="banner-stats">
          <span className="retro-chip accent-amber">
            <Trophy size={14} /> Líder: <strong>{liveRankings[0].key}</strong> ({liveRankings[0].avgWaiting}s)
          </span>
          <span className="retro-chip">
            <Users size={14} /> Clientes: <strong>{processes.length}</strong>
          </span>
        </div>
      </header>

      {/* 2. LAYOUT DIVIDIDO: PANEL IZQUIERDO + ARENA DERECHA */}
      <div className="dashboard-split-layout">
        {/* ==================================================================
            PANEL LATERAL IZQUIERDO: CONFIGURACIÓN DINÁMICA DE CLIENTES
           ================================================================== */}
        <aside className="sidebar-config-panel">
          <div className="sidebar-header">
            <div className="sidebar-title-row">
              <Sliders size={18} />
              <span>📜 CONFIGURACIÓN</span>
            </div>
          </div>

          {/* Botones de Presets Rápidos */}
          <div className="sidebar-presets-box">
            <span className="sidebar-sublabel">ESCENARIOS PRECARGADOS:</span>
            <div className="presets-vertical-grid">
              <button
                type="button"
                className="preset-pixel-btn btn-srtf"
                onClick={() => loadPreset('srtf_demo')}
              >
                ⚡ Desalojo SRTF
              </button>
              <button
                type="button"
                className="preset-pixel-btn"
                onClick={() => loadPreset('standard')}
              >
                📋 Caso Estándar
              </button>
              <button
                type="button"
                className="preset-pixel-btn"
                onClick={() => loadPreset('round_robin')}
              >
                ⏱️ Round Robin
              </button>
              <button
                type="button"
                className="preset-pixel-btn"
                onClick={() => loadPreset('vip_prio')}
              >
                🏆 Fila VIP
              </button>
            </div>
          </div>

          {/* Input de Quantum */}
          <div className="sidebar-quantum-box">
            <div className="quantum-header">
              <Clock size={16} />
              <span>QUANTUM (Q) PARA RR:</span>
            </div>
            <input
              type="number"
              min="1"
              max="15"
              className="quantum-input-field"
              value={quantum}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setQuantum(isNaN(val) || val <= 0 ? 1 : val);
                setCurrentTime(0);
                setIsPlaying(false);
              }}
              title="Quantum en segundos para Round Robin"
            />
          </div>

          {/* Lista Dinámica de Procesos */}
          <div className="sidebar-processes-section">
            <div className="processes-header-row">
              <span className="sidebar-sublabel">
                CLIENTES ACTIVOS ({processes.length}/8):
              </span>
              <button
                type="button"
                className="add-client-pixel-btn"
                onClick={handleAddProcess}
                disabled={processes.length >= 8}
                title="Agregar nuevo cliente"
              >
                <Plus size={14} /> + CLIENTE
              </button>
            </div>

            <div className="sidebar-processes-list">
              {processes.map((proc) => {
                const isVIP = proc.priority === 1;
                return (
                  <div
                    key={proc.id}
                    className="sidebar-proc-card"
                    style={{ borderLeftColor: proc.color }}
                  >
                    <div className="proc-card-header">
                      <div className="proc-header-left">
                        <span className="proc-avatar-icon">
                          {CHARACTER_AVATARS[proc.id] || '👤'}
                        </span>
                        <strong className="proc-id-text" style={{ color: proc.color }}>
                          {proc.id}
                        </strong>
                        {isVIP && <span className="vip-mini-tag">👑 VIP</span>}
                      </div>

                      <button
                        type="button"
                        className="delete-proc-btn"
                        onClick={() => handleRemoveProcess(proc.id)}
                        disabled={processes.length <= 2}
                        title={
                          processes.length <= 2
                            ? 'Mínimo 2 clientes requeridos'
                            : `Eliminar ${proc.id}`
                        }
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="proc-fields-row">
                      <div className="field-box">
                        <label className="field-label">Llegada (s)</label>
                        <input
                          type="number"
                          min="0"
                          className="field-input"
                          value={proc.arrivalTime}
                          onChange={(e) =>
                            handleProcessParamChange(proc.id, 'arrivalTime', e.target.value)
                          }
                        />
                      </div>

                      <div className="field-box">
                        <label className="field-label">Ráfaga (s)</label>
                        <input
                          type="number"
                          min="1"
                          className="field-input"
                          value={proc.burstTime}
                          onChange={(e) =>
                            handleProcessParamChange(proc.id, 'burstTime', e.target.value)
                          }
                        />
                      </div>

                      <div className="field-box">
                        <label className="field-label">Prio (1=VIP)</label>
                        <input
                          type="number"
                          min="1"
                          className="field-input"
                          value={proc.priority}
                          onChange={(e) =>
                            handleProcessParamChange(proc.id, 'priority', e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* ==================================================================
            PARTE DERECHA: ARENA DE SIMULACIÓN COMPLETA Y ESPACIOSA
           ================================================================== */}
        <section className="main-simulation-arena">
          {/* Podio de la Gran Carrera */}
          <div className="live-podium-card">
            <div className="podium-title-group">
              <Trophy size={18} />
              <span>🏆 TABLA DE POSICIONES EN TIEMPO REAL:</span>
            </div>
            <div className="podium-rankings-row">
              {liveRankings.map((item, idx) => (
                <div
                  key={item.key}
                  className={`podium-rank-badge ${idx === 0 ? 'rank-1' : ''}`}
                >
                  <span>#{idx + 1}</span>
                  <strong>{item.key}</strong>
                  <span>({item.avgWaiting}s)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Los 5 Carriles de Algoritmos */}
          <div className="lanes-stack">
            {Object.values(allSimulations).map((sim) => {
              const { key, name, badgeClass, data } = sim;
              const { timeline, events, metrics } = data;

              // Proceso activo en CPU
              const activeProcessId = currentTime < timeline.length ? timeline[currentTime] : null;
              const isCpuIdle = activeProcessId === 'IDLE';

              // Detección de eventos en currentTime
              const eventsAtCurrent = events.filter((e) => e.time === currentTime);
              const isPreemptedNow = eventsAtCurrent.some((e) => e.type === 'PREEMPT');
              const isQuantumExpNow = eventsAtCurrent.some((e) => e.type === 'QUANTUM_EXPIRE');

              // Estados dinámicos de cada cliente en este algoritmo
              const dynamicProcessList = processes.map((p) => {
                const executedTicks = timeline
                  .slice(0, currentTime)
                  .filter((id) => id === p.id).length;

                const remaining = Math.max(0, p.burstTime - executedTicks);
                const hasArrived = p.arrivalTime <= currentTime;
                const isCompletedProc = executedTicks === p.burstTime;
                const isInCpu = activeProcessId === p.id;
                const isInWaiting = hasArrived && !isCompletedProc && !isInCpu;

                const wasJustPreempted = isPreemptedNow && eventsAtCurrent.some(
                  (e) => e.type === 'PREEMPT' && e.processId !== p.id && e.queue.includes(p.id)
                );
                const wasJustQuantumExp = isQuantumExpNow && eventsAtCurrent.some(
                  (e) => e.type === 'QUANTUM_EXPIRE' && e.processId === p.id
                );

                return {
                  ...p,
                  executed: executedTicks,
                  remaining,
                  hasArrived,
                  isCompleted: isCompletedProc,
                  isInCpu,
                  isInWaiting,
                  wasJustPreempted,
                  wasJustQuantumExp,
                  progressPercent: Math.min(100, Math.round((executedTicks / p.burstTime) * 100)),
                };
              });

              const currentActiveProc = dynamicProcessList.find((p) => p.isInCpu);
              const isPriorityLane = key === 'PRIORITY';
              const vipQueue = dynamicProcessList.filter((p) => p.isInWaiting && p.priority === 1);
              const generalQueue = dynamicProcessList.filter((p) => p.isInWaiting && (!isPriorityLane || p.priority > 1));
              const finishedList = dynamicProcessList.filter((p) => p.isCompleted);
              const isLeading = liveRankings[0].key === key;

              return (
                <div
                  key={key}
                  className={`algorithm-lane-card ${isLeading ? 'leading-lane' : ''}`}
                >
                  {/* Encabezado del Carril */}
                  <div className="lane-header">
                    <div className="lane-title-group">
                      <span className={`algo-badge ${badgeClass}`}>{key}</span>
                      <span className="lane-name-text">{name}</span>

                      {isPreemptedNow && (
                        <span className="lane-alert-badge preempt">
                          <Zap size={14} /> ⚡ ¡DESALOJO!
                        </span>
                      )}
                      {isQuantumExpNow && (
                        <span className="lane-alert-badge quantum-exp">
                          <Clock size={14} /> ⏱️ FIN DE QUANTUM
                        </span>
                      )}
                      {isCpuIdle && !isCompleted && (
                        <span className="lane-alert-badge idle">
                          🟢 CPU LIBRE
                        </span>
                      )}
                    </div>

                    <div className="lane-metrics-group">
                      <span className="metric-pill highlight" title="Tiempo de Espera Promedio">
                        T. Espera: <strong>{metrics.avgWaitingTime}s</strong>
                      </span>
                      <span className="metric-pill" title="Tiempo de Retorno Promedio">
                        T. Retorno: <strong>{metrics.avgTurnaroundTime}s</strong>
                      </span>
                      <span className="metric-pill" title="Utilización de CPU">
                        CPU: <strong>{metrics.cpuUtilization}%</strong>
                      </span>
                      <span className="metric-pill" title="Desalojos">
                        Desalojos: <strong>{metrics.preemptions}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Etapas Animadas con Framer Motion: Fila -> CPU -> Atendidos */}
                  <div className="lane-stages-grid">
                    {/* ETAPA 1: FILA DE ESPERA */}
                    <div className="stage-box">
                      <div className="stage-title">
                        <span>👥 FILA DE ESPERA</span>
                        <span>({vipQueue.length + generalQueue.length})</span>
                      </div>

                      {/* Sub-fila VIP para Prioridad */}
                      {isPriorityLane && vipQueue.length > 0 && (
                        <div className="vip-queue-subbox">
                          <span className="vip-subbox-title">👑 FILA VIP (PRIORIDAD 1):</span>
                          <div className="queue-items-flow">
                            {vipQueue.map((proc) => (
                              <motion.div
                                key={proc.id}
                                layout
                                layoutId={`${key}-${proc.id}`}
                                className="process-character-token"
                                style={{ borderColor: proc.color }}
                                onClick={() => setSelectedCharacterModal({ ...proc, algoKey: key })}
                                whileHover={{ scale: 1.08 }}
                                transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                              >
                                <span className="token-icon">{CHARACTER_AVATARS[proc.id] || '👤'}</span>
                                <span className="token-id" style={{ color: proc.color }}>{proc.id}</span>
                                <span className="token-stat">HP {proc.remaining}s</span>
                                <span className="token-vip-crown">👑</span>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="queue-items-flow">
                        {generalQueue.length === 0 && (!isPriorityLane || vipQueue.length === 0) ? (
                          <span className="empty-stage-text">Sin clientes en espera</span>
                        ) : (
                          generalQueue.map((proc) => {
                            const isBouncing = proc.wasJustPreempted || proc.wasJustQuantumExp;
                            return (
                              <motion.div
                                key={proc.id}
                                layout
                                layoutId={`${key}-${proc.id}`}
                                className="process-character-token"
                                style={{ borderColor: proc.color }}
                                onClick={() => setSelectedCharacterModal({ ...proc, algoKey: key })}
                                initial={isBouncing ? { scale: 1.3, rotate: -15, y: -20 } : false}
                                animate={{ scale: 1, rotate: 0, y: 0 }}
                                whileHover={{ scale: 1.08 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                              >
                                <span className="token-icon">{CHARACTER_AVATARS[proc.id] || '👤'}</span>
                                <span className="token-id" style={{ color: proc.color }}>{proc.id}</span>
                                <span className="token-stat">HP {proc.remaining}s</span>
                                <span className="token-stat">P{proc.priority}</span>
                              </motion.div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* ETAPA 2: VENTANILLA DE ATENCIÓN (CPU / CAJA) */}
                    <div className="stage-box cpu-stage">
                      <div className="stage-title">
                        <span>🏦 CAJA / CPU</span>
                        <span className="idle-dot" />
                      </div>

                      {currentActiveProc ? (
                        <motion.div
                          layout
                          layoutId={`${key}-${currentActiveProc.id}`}
                          className="cashier-active-slot"
                          onClick={() => setSelectedCharacterModal({ ...currentActiveProc, algoKey: key })}
                          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        >
                          <div className="cashier-teller-label">
                            <span>
                              {CHARACTER_AVATARS[currentActiveProc.id] || '👤'}{' '}
                              <strong style={{ color: currentActiveProc.color }}>
                                {currentActiveProc.id}
                              </strong>{' '}
                              ({currentActiveProc.name})
                            </span>
                            <span>{currentActiveProc.progressPercent}%</span>
                          </div>

                          <div className="hp-bar-container">
                            <div className="hp-bar-labels">
                              <span>TRÁMITE: {currentActiveProc.executed}/{currentActiveProc.burstTime}s</span>
                              <span>RESTANTE: {currentActiveProc.remaining}s</span>
                            </div>
                            <div className="hp-bar-track">
                              <motion.div
                                className="hp-bar-fill"
                                style={{
                                  width: `${currentActiveProc.progressPercent}%`,
                                  backgroundColor: currentActiveProc.color,
                                }}
                              />
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <div className="cashier-idle-box">
                          <span className="idle-text">
                            {isCompleted ? '🏁 ATENCIÓN COMPLETADA' : '🟢 CAJA LIBRE'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#666' }}>
                            {isCompleted ? 'Todos atendidos' : 'Esperando turno...'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* ETAPA 3: CLIENTES ATENDIDOS */}
                    <div className="stage-box">
                      <div className="stage-title">
                        <span>✅ ATENDIDOS</span>
                        <span>({finishedList.length}/{processes.length})</span>
                      </div>

                      <div className="queue-items-flow">
                        {finishedList.length === 0 ? (
                          <span className="empty-stage-text">Ninguno finalizado</span>
                        ) : (
                          finishedList.map((proc) => {
                            const finalP = data.processes.find((fp) => fp.id === proc.id) || proc;
                            return (
                              <motion.div
                                key={proc.id}
                                layout
                                layoutId={`${key}-${proc.id}`}
                                className="process-character-token"
                                style={{ borderColor: proc.color, background: '#f8fafc' }}
                                onClick={() => setSelectedCharacterModal({ ...finalP, algoKey: key })}
                                whileHover={{ scale: 1.08 }}
                                transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                              >
                                <span className="token-icon">{CHARACTER_AVATARS[proc.id] || '👤'}</span>
                                <span className="token-id" style={{ color: proc.color }}>{proc.id}</span>
                                <span className="token-stat">Esp: {finalP.waitingTime}s</span>
                                <span className="token-stat">Ret: {finalP.turnaroundTime}s</span>
                              </motion.div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tira Mini-Gantt Histórica */}
                  <div className="mini-gantt-pixel-track">
                    {timeline.slice(0, Math.max(1, currentTime)).map((slotId, sec) => {
                      const proc = processes.find((p) => p.id === slotId);
                      const isIdle = slotId === 'IDLE';

                      return (
                        <div
                          key={sec}
                          className={`gantt-pixel-block ${isIdle ? 'idle' : ''}`}
                          style={!isIdle && proc ? { backgroundColor: proc.color } : {}}
                          title={`T=${sec}-${sec + 1}s: ${slotId}`}
                        >
                          {slotId}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* 3. DOCK FIJO INFERIOR: RELOJ MAESTRO Y CONTROLES GLOBALES */}
      <footer className="master-controls-dock">
        <div className="dock-content-wrapper">
          <div className="master-clock-display">
            <span className="clock-icon">⏱️</span>
            <div>
              <div className="clock-main-text">
                MASTER CLOCK: T = {currentTime}s / {maxSimulationDuration}s
              </div>
            </div>
            <span className="clock-status-pill">
              {isPlaying ? '▶ RUNNING' : isCompleted ? '🏁 FINISHED' : '⏸ PAUSED'}
            </span>
          </div>

          <div className="playback-buttons-group">
            <button
              type="button"
              className="rpg-ctrl-btn"
              onClick={handleReset}
              title="Reiniciar todo a T = 0"
            >
              <RotateCcw size={16} />
              <span>T=0</span>
            </button>

            <button
              type="button"
              className="rpg-ctrl-btn"
              onClick={handleStepBackward}
              disabled={currentTime === 0}
              title="Paso anterior (-1s)"
            >
              <ChevronLeft size={18} />
              <span>-1s</span>
            </button>

            <button
              type="button"
              className={`rpg-ctrl-btn play-btn ${isPlaying ? 'pause-mode' : ''}`}
              onClick={handlePlayPause}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              <span>{isPlaying ? 'PAUSAR' : isCompleted ? 'REPETIR' : 'INICIAR'}</span>
            </button>

            <button
              type="button"
              className="rpg-ctrl-btn"
              onClick={handleStepForward}
              disabled={isCompleted}
              title="Siguiente ciclo (+1s)"
            >
              <span>+1s</span>
              <ChevronRight size={18} />
            </button>

            <button
              type="button"
              className="rpg-ctrl-btn"
              onClick={handleCompleteAll}
              disabled={isCompleted}
              title="Simular toda la carrera hasta el final"
            >
              <SkipForward size={16} />
              <span>COMPLETAR</span>
            </button>
          </div>

          <div className="speed-slider-group">
            <span className="speed-title">VELOCIDAD: {speedMs}ms / CICLO</span>
            <input
              type="range"
              min="100"
              max="1500"
              step="50"
              value={speedMs}
              onChange={(e) => setSpeedMs(parseInt(e.target.value, 10))}
              className="speed-range"
            />
          </div>
        </div>
      </footer>

      {/* 4. MODAL INTERACTIVO DE FICHA DE PERSONAJE */}
      <AnimatePresence>
        {selectedCharacterModal && (
          <div
            className="rpg-modal-backdrop"
            onClick={() => setSelectedCharacterModal(null)}
          >
            <motion.div
              className="rpg-stat-window"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
            >
              <div className="window-header">
                <span className="window-title">
                  📜 FICHA DE PERSONAJE: {selectedCharacterModal.id}
                </span>
                <button
                  type="button"
                  className="close-btn"
                  onClick={() => setSelectedCharacterModal(null)}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="character-sheet-body">
                <div
                  className="character-portrait-box"
                  style={{
                    backgroundColor: selectedCharacterModal.color,
                    borderColor: '#121212',
                  }}
                >
                  {CHARACTER_AVATARS[selectedCharacterModal.id] || '👤'}
                </div>

                <div className="character-details-list">
                  <h3 className="char-name">{selectedCharacterModal.name}</h3>

                  <div className="char-stat-line">
                    <span>Algoritmo Evaluado:</span>
                    <strong>{selectedCharacterModal.algoKey}</strong>
                  </div>

                  <div className="char-stat-line">
                    <span>Nivel / Prioridad:</span>
                    <strong>
                      {selectedCharacterModal.priority === 1 ? '👑 VIP (1)' : `Nivel ${selectedCharacterModal.priority}`}
                    </strong>
                  </div>

                  <div className="char-stat-line">
                    <span>HP / Ráfaga Total:</span>
                    <strong>{selectedCharacterModal.burstTime}s</strong>
                  </div>

                  <div className="char-stat-line">
                    <span>HP / Tiempo Restante:</span>
                    <strong style={{ color: '#d97706' }}>
                      {selectedCharacterModal.remaining !== undefined
                        ? `${selectedCharacterModal.remaining}s`
                        : `${selectedCharacterModal.burstTime}s`}
                    </strong>
                  </div>

                  <div className="char-stat-line">
                    <span>Hora de Llegada:</span>
                    <strong>{selectedCharacterModal.arrivalTime}s</strong>
                  </div>

                  <div className="char-stat-line">
                    <span>Espera Acumulada:</span>
                    <strong style={{ color: '#16a34a' }}>
                      {selectedCharacterModal.waitingTime !== null && selectedCharacterModal.waitingTime !== undefined
                        ? `${selectedCharacterModal.waitingTime}s`
                        : `${Math.max(0, currentTime - selectedCharacterModal.arrivalTime - (selectedCharacterModal.executed || 0))}s`}
                    </strong>
                  </div>

                  <div className="char-stat-line">
                    <span>Estado en T={currentTime}s:</span>
                    <strong>
                      {selectedCharacterModal.isInCpu
                        ? '🔥 EN CAJA (ATENDIÉNDOSE)'
                        : selectedCharacterModal.isCompleted
                        ? '✅ ATENDIDO SATISFECHO'
                        : selectedCharacterModal.hasArrived
                        ? '⏳ EN FILA DE ESPERA'
                        : '🚶 EN CAMINO AL BANCO'}
                    </strong>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
