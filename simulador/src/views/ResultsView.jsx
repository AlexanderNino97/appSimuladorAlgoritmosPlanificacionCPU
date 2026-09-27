import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Award,
  BarChart3,
  RotateCcw,
  Settings,
  Clock,
  Zap,
  CheckCircle2,
  Copy,
  Check,
  TrendingDown,
  Layers,
  ArrowLeft,
  Info,
  Calendar,
  Sparkles
} from 'lucide-react';
import { runFCFS } from '../algorithms/fcfs.js';
import { runSJF } from '../algorithms/sjf.js';
import { runSRTF } from '../algorithms/srtf.js';
import { runRoundRobin } from '../algorithms/roundRobin.js';
import { runPriority } from '../algorithms/priority.js';
import './ResultsView.css';

/**
 * Vista de Resultados y Comparativa de Algoritmos.
 * 
 * Calcula y compara los 5 algoritmos simultáneamente para el mismo conjunto de datos:
 * 1. Tabla comparativa global (T.E.P., T.R.P., Utilización, Desalojos).
 * 2. Determinación dinámica del algoritmo ganador con menor tiempo de espera.
 * 3. Diagrama de Gantt técnico individual y comparativo multi-algoritmo.
 * 4. Desglose detallado por proceso y algoritmo.
 */
export default function ResultsView({
  processes,
  quantum,
  selectedAlgorithm,
  setSelectedAlgorithm,
  onBackToSimulation,
  onBackToConfig,
}) {
  const [activeGanttAlgo, setActiveGanttAlgo] = useState(selectedAlgorithm || 'SRTF');
  const [copied, setCopied] = useState(false);

  // Ejecución simultánea de los 5 algoritmos para el análisis comparativo
  const allResults = useMemo(() => {
    return {
      FCFS: { name: 'FCFS (Primero en Llegar)', ...runFCFS(processes) },
      SJF: { name: 'SJF (Trabajo Más Corto)', ...runSJF(processes) },
      SRTF: { name: 'SRTF (Menor Restante - Desalojo)', ...runSRTF(processes) },
      RR: { name: `Round Robin (Quantum = ${quantum}s)`, ...runRoundRobin(processes, { quantum }) },
      PRIORITY: { name: 'Prioridad (VIP)', ...runPriority(processes) },
    };
  }, [processes, quantum]);

  // Determinar dinámicamente el algoritmo ganador (menor tiempo de espera promedio)
  const winnerAnalysis = useMemo(() => {
    const list = Object.entries(allResults).map(([key, data]) => ({
      key,
      name: data.name,
      avgWaiting: data.metrics.avgWaitingTime,
      avgTurnaround: data.metrics.avgTurnaroundTime,
      preemptions: data.metrics.preemptions,
    }));

    // Ordenar de menor a mayor tiempo de espera
    list.sort((a, b) => {
      if (a.avgWaiting !== b.avgWaiting) {
        return a.avgWaiting - b.avgWaiting;
      }
      return a.avgTurnaround - b.avgTurnaround;
    });

    const bestVal = list[0].avgWaiting;
    const tiedWinners = list.filter((item) => item.avgWaiting === bestVal);

    return {
      bestVal,
      winner: list[0],
      isTie: tiedWinners.length > 1,
      tiedWinners,
      ranking: list,
    };
  }, [allResults]);

  // Algoritmo activo para ver el desglose en detalle
  const currentResult = allResults[activeGanttAlgo] || allResults.FCFS;

  // Copiar resumen académico al portapapeles
  const handleCopySummary = () => {
    const summaryText = `
=== RESUMEN COMPARATIVO DE PLANIFICACIÓN DE CPU ===
Conjunto de Procesos: ${processes.map((p) => `${p.id}(Llegada:${p.arrivalTime}, Ráfaga:${p.burstTime}, Prioridad:${p.priority})`).join(', ')}
Quantum (RR): ${quantum}s

RESULTADOS GENERALES:
- FCFS: Espera Promedio = ${allResults.FCFS.metrics.avgWaitingTime}s | Retorno Promedio = ${allResults.FCFS.metrics.avgTurnaroundTime}s
- SJF: Espera Promedio = ${allResults.SJF.metrics.avgWaitingTime}s | Retorno Promedio = ${allResults.SJF.metrics.avgTurnaroundTime}s
- SRTF: Espera Promedio = ${allResults.SRTF.metrics.avgWaitingTime}s | Retorno Promedio = ${allResults.SRTF.metrics.avgTurnaroundTime}s
- Round Robin: Espera Promedio = ${allResults.RR.metrics.avgWaitingTime}s | Retorno Promedio = ${allResults.RR.metrics.avgTurnaroundTime}s
- Prioridad: Espera Promedio = ${allResults.PRIORITY.metrics.avgWaitingTime}s | Retorno Promedio = ${allResults.PRIORITY.metrics.avgTurnaroundTime}s

ALGORITMO ÓPTIMO EN TIEMPO DE ESPERA:
${winnerAnalysis.isTie 
  ? `Empate entre: ${winnerAnalysis.tiedWinners.map((w) => w.name).join(' y ')} con ${winnerAnalysis.bestVal}s` 
  : `${winnerAnalysis.winner.name} con un promedio de espera de ${winnerAnalysis.bestVal}s`}
    `.trim();

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="results-container">
      {/* Encabezado y Navegación */}
      <header className="results-header">
        <div className="header-left-title">
          <div className="results-badge">
            <BarChart3 size={16} />
            <span>Métricas Comparativas del Sistema</span>
          </div>
          <h1 className="results-title">Resultados y Diagrama de Gantt</h1>
          <p className="results-subtitle">
            Análisis de rendimiento, tiempos de espera, retorno y comparación directa de los 5 algoritmos de planificación.
          </p>
        </div>

        <div className="results-top-actions">
          <button
            type="button"
            className="action-btn secondary"
            onClick={onBackToConfig}
          >
            <Settings size={16} />
            <span>Nueva Configuración</span>
          </button>

          <button
            type="button"
            className="action-btn primary"
            onClick={onBackToSimulation}
          >
            <ArrowLeft size={16} />
            <span>Volver a Simulación Visual</span>
          </button>
        </div>
      </header>

      {/* Tarjeta Destacada: Ganador Óptimo */}
      <section className="winner-banner-card">
        <div className="trophy-box">
          <Trophy size={48} className="trophy-icon" />
        </div>
        <div className="winner-details">
          <span className="winner-sub">
            {winnerAnalysis.isTie ? '🤝 EMPATE EN RENDIMIENTO ÓPTIMO' : '🏆 MENOR TIEMPO DE ESPERA PROMEDIO'}
          </span>
          <h2 className="winner-name">
            {winnerAnalysis.isTie
              ? winnerAnalysis.tiedWinners.map((w) => w.name).join(' & ')
              : winnerAnalysis.winner.name}
          </h2>
          <p className="winner-explanation">
            {winnerAnalysis.isTie ? (
              <>
                Los algoritmos empatados lograron la menor espera promedio del sistema con solo{' '}
                <strong>{winnerAnalysis.bestVal}s</strong> por cliente.
              </>
            ) : (
              <>
                Este algoritmo optimizó el flujo de atención bancaria con un tiempo de espera promedio récord de{' '}
                <strong>{winnerAnalysis.bestVal}s</strong> y un tiempo de retorno de{' '}
                <strong>{winnerAnalysis.winner.avgTurnaround}s</strong>, reduciendo al máximo la congestión en ventanilla.
              </>
            )}
          </p>
        </div>

        <div className="winner-actions">
          <button
            type="button"
            className="btn-copy-summary"
            onClick={handleCopySummary}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? '¡Copiado!' : 'Copiar Resumen'}</span>
          </button>
        </div>
      </section>

      {/* Tabla Comparativa Global */}
      <section className="comparison-table-section">
        <div className="section-title-row">
          <div className="title-with-icon">
            <Layers size={20} className="icon-cyan" />
            <h2>Comparativa General de los 5 Algoritmos</h2>
          </div>
          <span className="caption-text">
            * Menor tiempo de espera y retorno indican mayor eficiencia en la atención.
          </span>
        </div>

        <div className="table-wrapper">
          <table className="results-table">
            <thead>
              <tr>
                <th>Algoritmo</th>
                <th>T. Espera Promedio (s)</th>
                <th>T. Retorno Promedio (s)</th>
                <th>T. Respuesta Promedio (s)</th>
                <th>Utilización CPU</th>
                <th>Desalojos / Cambios</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(allResults).map(([key, data]) => {
                const isBestWaiting = data.metrics.avgWaitingTime === winnerAnalysis.bestVal;

                return (
                  <tr
                    key={key}
                    className={`${isBestWaiting ? 'winner-row' : ''} ${
                      activeGanttAlgo === key ? 'active-row' : ''
                    }`}
                    onClick={() => setActiveGanttAlgo(key)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div className="algo-cell">
                        <strong>{data.name}</strong>
                        {activeGanttAlgo === key && (
                          <span className="viewing-badge">Viendo Gantt</span>
                        )}
                      </div>
                    </td>

                    <td className="metric-val">
                      <span className={`pill-val ${isBestWaiting ? 'best' : ''}`}>
                        {data.metrics.avgWaitingTime}s
                      </span>
                    </td>

                    <td className="metric-val">
                      <span className="pill-val">
                        {data.metrics.avgTurnaroundTime}s
                      </span>
                    </td>

                    <td className="metric-val">
                      <span className="pill-val">
                        {data.metrics.avgResponseTime}s
                      </span>
                    </td>

                    <td className="metric-val">
                      <span className="pill-val cyan">
                        {data.metrics.cpuUtilization}%
                      </span>
                    </td>

                    <td className="metric-val">
                      <span className="pill-val dim">
                        {data.metrics.preemptions} desalojos ({data.metrics.contextSwitches} cambios)
                      </span>
                    </td>

                    <td>
                      {isBestWaiting ? (
                        <span className="badge-best">
                          <Award size={14} /> Más Eficiente
                        </span>
                      ) : (
                        <span className="badge-standard">Estándar</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Diagrama Técnico de Gantt */}
      <section className="gantt-section">
        <div className="gantt-header-row">
          <div>
            <div className="title-with-icon">
              <Calendar size={20} className="icon-cyan" />
              <h2>Diagrama Técnico de Gantt</h2>
            </div>
            <p className="gantt-caption">
              Representación visual de la línea de tiempo segundo a segundo. Haz clic en las pestañas para alternar entre algoritmos.
            </p>
          </div>

          <div className="gantt-algo-switcher">
            {Object.keys(allResults).map((key) => (
              <button
                key={key}
                type="button"
                className={`gantt-tab ${activeGanttAlgo === key ? 'active' : ''}`}
                onClick={() => setActiveGanttAlgo(key)}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        {/* Bloque del Gráfico de Gantt */}
        <div className="gantt-canvas-box">
          <div className="gantt-title-tag">
            <span>Visualizando: <strong>{currentResult.name}</strong></span>
            <span>Duración Total: <strong>{currentResult.timeline.length} segundos</strong></span>
          </div>

          {/* Línea de Bloques de Ejecución */}
          <div className="gantt-timeline-wrapper">
            <div className="gantt-blocks-track">
              {currentResult.timeline.map((slotId, second) => {
                const proc = processes.find((p) => p.id === slotId);
                const isIdle = slotId === 'IDLE';

                return (
                  <div
                    key={second}
                    className={`gantt-unit-block ${isIdle ? 'gantt-idle-block' : ''}`}
                    style={!isIdle && proc ? { backgroundColor: proc.color } : {}}
                    title={
                      isIdle
                        ? `Segundo ${second} a ${second + 1}: CPU Ociosa (Libre)`
                        : `Segundo ${second} a ${second + 1}: Ejecución de ${slotId}`
                    }
                  >
                    <span className="block-label">{slotId}</span>
                  </div>
                );
              })}
            </div>

            {/* Escala de Tiempo Numérica (Marcadores de segundo) */}
            <div className="gantt-scale-track">
              {Array.from({ length: currentResult.timeline.length + 1 }).map((_, sec) => (
                <div key={sec} className="gantt-scale-marker">
                  <span className="marker-tick" />
                  <span className="marker-number">{sec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Leyenda de Procesos en Gantt */}
          <div className="gantt-legend-row">
            <span className="legend-label">Leyenda de Clientes:</span>
            <div className="legend-items">
              {processes.map((p) => (
                <div key={p.id} className="legend-item">
                  <span className="legend-color-dot" style={{ backgroundColor: p.color }} />
                  <span>{p.id}: {p.name}</span>
                </div>
              ))}
              <div className="legend-item">
                <span className="legend-color-dot idle-dot" />
                <span>IDLE (🟢 CPU Libre)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparativa Multi-Gantt (Vista Simultánea de los 5 Algoritmos) */}
      <section className="multi-gantt-section">
        <div className="section-title-row">
          <div className="title-with-icon">
            <Sparkles size={20} className="icon-cyan" />
            <h2>Comparativa Visual Simultánea de los 5 Diagramas de Gantt</h2>
          </div>
          <span className="caption-text">
            Compara directamente cómo se comportan las colas y los desalojos en cada algoritmo frente a la misma carga de trabajo.
          </span>
        </div>

        <div className="multi-gantt-list">
          {Object.entries(allResults).map(([key, data]) => (
            <div key={key} className="multi-gantt-item">
              <div className="multi-gantt-name-row">
                <strong className="algo-key-tag">{key}</strong>
                <span className="algo-fullname">{data.name}</span>
                <span className="algo-metrics-pill">
                  Espera: {data.metrics.avgWaitingTime}s | Retorno: {data.metrics.avgTurnaroundTime}s
                </span>
              </div>

              <div className="multi-gantt-track">
                {data.timeline.map((slotId, sec) => {
                  const proc = processes.find((p) => p.id === slotId);
                  const isIdle = slotId === 'IDLE';

                  return (
                    <div
                      key={sec}
                      className={`multi-slot ${isIdle ? 'idle' : ''}`}
                      style={!isIdle && proc ? { backgroundColor: proc.color } : {}}
                      title={`T=${sec}-${sec + 1}: ${slotId}`}
                    >
                      {slotId}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Desglose Detallado por Proceso para el Algoritmo Seleccionado */}
      <section className="process-details-section">
        <div className="section-title-row">
          <div className="title-with-icon">
            <Info size={20} className="icon-cyan" />
            <h2>Desglose Matemático por Cliente: {currentResult.name}</h2>
          </div>
          <span className="caption-text">
            Fórmulas: Retorno = Fin - Llegada | Espera = Retorno - Ráfaga
          </span>
        </div>

        <div className="table-wrapper">
          <table className="results-table details-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre del Cliente</th>
                <th>Llegada ($T_{ll}$)</th>
                <th>Ráfaga ($T_{ej}$)</th>
                <th>Prioridad</th>
                <th>Finalización ($T_f$)</th>
                <th>Retorno ($T_r$)</th>
                <th>Espera ($T_e$)</th>
                <th>Respuesta ($T_{resp}$)</th>
              </tr>
            </thead>
            <tbody>
              {currentResult.processes.map((proc) => (
                <tr key={proc.id}>
                  <td>
                    <div className="proc-id-cell">
                      <span className="color-dot" style={{ backgroundColor: proc.color }} />
                      <strong>{proc.id}</strong>
                    </div>
                  </td>
                  <td>{proc.name}</td>
                  <td className="mono-cell">{proc.arrivalTime}s</td>
                  <td className="mono-cell">{proc.burstTime}s</td>
                  <td>
                    {proc.priority === 1 ? (
                      <span className="badge-vip-small">🏆 VIP (1)</span>
                    ) : (
                      <span className="badge-prio-small">{proc.priority}</span>
                    )}
                  </td>
                  <td className="mono-cell highlight-blue">{proc.completionTime}s</td>
                  <td className="mono-cell highlight-purple">{proc.turnaroundTime}s</td>
                  <td className="mono-cell highlight-emerald">{proc.waitingTime}s</td>
                  <td className="mono-cell">{proc.responseTime}s</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="totals-row">
                <td colSpan="6">
                  <strong>PROMEDIOS GENERALES:</strong>
                </td>
                <td className="mono-cell highlight-purple">
                  <strong>{currentResult.metrics.avgTurnaroundTime}s</strong>
                </td>
                <td className="mono-cell highlight-emerald">
                  <strong>{currentResult.metrics.avgWaitingTime}s</strong>
                </td>
                <td className="mono-cell">
                  <strong>{currentResult.metrics.avgResponseTime}s</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Pie de Página con Botones de Navegación */}
      <footer className="results-footer">
        <button
          type="button"
          className="action-btn secondary"
          onClick={onBackToConfig}
        >
          <RotateCcw size={18} />
          <span>Configurar Nuevos Procesos</span>
        </button>

        <button
          type="button"
          className="action-btn primary"
          onClick={onBackToSimulation}
        >
          <ArrowLeft size={18} />
          <span>Regresar a la Simulación Interactiva</span>
        </button>
      </footer>
    </div>
  );
}
