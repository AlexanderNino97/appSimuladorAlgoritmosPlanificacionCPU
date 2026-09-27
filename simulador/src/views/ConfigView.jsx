import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  Clock, 
  Zap, 
  Award, 
  Play, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import { createProcess, getProcessColor } from '../models/Process.js';
import './ConfigView.css';

/**
 * Vista de Configuración de Procesos y Parámetros del Simulador.
 * 
 * Permite al usuario definir los tiempos de llegada, ráfaga y prioridad
 * de los clientes (procesos), además del Quantum para Round Robin.
 * Incluye validación estricta en español y casos preconfigurados de prueba.
 */
export default function ConfigView({ 
  processes, 
  setProcesses, 
  quantum, 
  setQuantum, 
  onStartSimulation, 
  onViewResults 
}) {
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState('');

  // Validar campos numéricos
  const handleProcessChange = (id, field, value) => {
    const numValue = value === '' ? '' : parseInt(value, 10);
    
    setProcesses((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return {
            ...p,
            [field]: isNaN(numValue) ? '' : numValue,
          };
        }
        return p;
      })
    );

    // Limpiar error del campo
    if (errors[`${id}_${field}`]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[`${id}_${field}`];
        return updated;
      });
    }
  };

  // Validación completa antes de iniciar
  const validateInputs = () => {
    const newErrors = {};

    processes.forEach((p) => {
      if (p.arrivalTime === '' || isNaN(p.arrivalTime) || p.arrivalTime < 0) {
        newErrors[`${p.id}_arrivalTime`] = 'Llegada debe ser >= 0';
      }
      if (p.burstTime === '' || isNaN(p.burstTime) || p.burstTime <= 0) {
        newErrors[`${p.id}_burstTime`] = 'Ráfaga debe ser > 0';
      }
      if (p.priority === '' || isNaN(p.priority) || p.priority <= 0) {
        newErrors[`${p.id}_priority`] = 'Prioridad debe ser >= 1';
      }
    });

    if (quantum === '' || isNaN(quantum) || quantum <= 0) {
      newErrors['quantum'] = 'El Quantum debe ser un entero > 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStart = () => {
    if (validateInputs()) {
      onStartSimulation();
    }
  };

  const handleDirectResults = () => {
    if (validateInputs()) {
      onViewResults();
    }
  };

  // Agregar un nuevo cliente (máximo 6)
  const handleAddProcess = () => {
    if (processes.length >= 6) {
      return;
    }
    const nextIndex = processes.length;
    const nextId = `P${nextIndex + 1}`;
    const newP = createProcess({
      id: nextId,
      name: `Cliente ${nextId}`,
      arrivalTime: nextIndex * 2,
      burstTime: 4,
      priority: 2,
      color: getProcessColor(nextId, nextIndex),
    }, nextIndex);

    setProcesses([...processes, newP]);
    setSuccessMsg(`Cliente ${nextId} agregado exitosamente.`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Eliminar el último cliente (mínimo 2)
  const handleRemoveProcess = (id) => {
    if (processes.length <= 2) {
      return;
    }
    setProcesses(processes.filter((p) => p.id !== id));
  };

  // Presets pedagógicos
  const applyPreset = (presetName) => {
    let presetData = [];
    let presetQuantum = 2;

    switch (presetName) {
      case 'standard':
        presetData = [
          { id: 'P1', name: 'Cliente P1', arrivalTime: 0, burstTime: 6, priority: 3 },
          { id: 'P2', name: 'Cliente P2', arrivalTime: 2, burstTime: 3, priority: 1 },
          { id: 'P3', name: 'Cliente P3', arrivalTime: 4, burstTime: 1, priority: 4 },
          { id: 'P4', name: 'Cliente P4', arrivalTime: 6, burstTime: 4, priority: 2 },
        ];
        presetQuantum = 2;
        break;

      case 'srtf_demo':
        presetData = [
          { id: 'P1', name: 'Cliente P1', arrivalTime: 0, burstTime: 8, priority: 2 },
          { id: 'P2', name: 'Cliente P2 (Desalojo)', arrivalTime: 1, burstTime: 4, priority: 1 },
          { id: 'P3', name: 'Cliente P3 (Rápido)', arrivalTime: 2, burstTime: 2, priority: 3 },
          { id: 'P4', name: 'Cliente P4 (Flash)', arrivalTime: 3, burstTime: 1, priority: 2 },
        ];
        presetQuantum = 2;
        break;

      case 'round_robin_demo':
        presetData = [
          { id: 'P1', name: 'Cliente P1', arrivalTime: 0, burstTime: 5, priority: 2 },
          { id: 'P2', name: 'Cliente P2', arrivalTime: 1, burstTime: 4, priority: 2 },
          { id: 'P3', name: 'Cliente P3', arrivalTime: 2, burstTime: 6, priority: 2 },
          { id: 'P4', name: 'Cliente P4', arrivalTime: 3, burstTime: 3, priority: 2 },
        ];
        presetQuantum = 2;
        break;

      case 'vip_priority_demo':
        presetData = [
          { id: 'P1', name: 'Cliente P1 (General)', arrivalTime: 0, burstTime: 4, priority: 3 },
          { id: 'P2', name: 'Cliente P2 (🏆 VIP)', arrivalTime: 1, burstTime: 3, priority: 1 },
          { id: 'P3', name: 'Cliente P3 (General)', arrivalTime: 2, burstTime: 5, priority: 4 },
          { id: 'P4', name: 'Cliente P4 (🏆 VIP)', arrivalTime: 3, burstTime: 2, priority: 1 },
        ];
        presetQuantum = 3;
        break;

      default:
        return;
    }

    const formatted = presetData.map((d, idx) =>
      createProcess(d, idx)
    );
    setProcesses(formatted);
    setQuantum(presetQuantum);
    setErrors({});
    setSuccessMsg(`Preset "${presetName}" cargado correctamente.`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="config-container">
      {/* Encabezado Pedagógico con Metáfora */}
      <header className="config-header">
        <div className="header-badge">
          <Building2 size={18} className="badge-icon" />
          <span>Metáfora del Sistema Operativo</span>
        </div>
        <h1 className="config-title">Simulador de Planificación de CPU</h1>
        <p className="config-subtitle">
          El <strong>Cajero Bancario (🏦 CPU)</strong> atiende las transacciones de los <strong>Clientes en Fila (Procesos)</strong>.
          Configura los tiempos de llegada, duración de los trámites y categorías VIP para simular y comparar los 5 algoritmos clásicos.
        </p>
      </header>

      {/* Tarjetas Informativas de la Metáfora */}
      <section className="metaphor-cards-grid">
        <div className="metaphor-card">
          <div className="metaphor-icon-box cyan">
            <Building2 size={24} />
          </div>
          <div>
            <h3>🏦 Ventanilla / CPU</h3>
            <p>El recurso central donde solo un cliente puede ser atendido a la vez (Monoprocesador).</p>
          </div>
        </div>

        <div className="metaphor-card">
          <div className="metaphor-icon-box emerald">
            <Users size={24} />
          </div>
          <div>
            <h3>👥 Clientes / Procesos</h3>
            <p>Personas que llegan al banco con solicitudes que toman una cantidad específica de segundos (Ráfaga).</p>
          </div>
        </div>

        <div className="metaphor-card">
          <div className="metaphor-icon-box amber">
            <Award size={24} />
          </div>
          <div>
            <h3>🏆 Fila VIP / Prioridad</h3>
            <p>Clientes preferenciales (Prioridad 1) con derecho de atención inmediata sobre la fila general.</p>
          </div>
        </div>

        <div className="metaphor-card">
          <div className="metaphor-icon-box purple">
            <Clock size={24} />
          </div>
          <div>
            <h3>⏱️ Quantum / Turno</h3>
            <p>Tiempo máximo continuo de atención por cliente en Round Robin antes de ceder el turno al siguiente.</p>
          </div>
        </div>
      </section>

      {/* Barra de Presets Rápidos */}
      <section className="presets-section">
        <div className="presets-label">
          <Sparkles size={16} />
          <span>Cargar Escenario Demostrativo:</span>
        </div>
        <div className="presets-buttons">
          <button 
            type="button" 
            className="preset-btn"
            onClick={() => applyPreset('standard')}
          >
            📋 Caso Estándar
          </button>
          <button 
            type="button" 
            className="preset-btn highlight-rose"
            onClick={() => applyPreset('srtf_demo')}
          >
            ⚡ Desalojo SRTF
          </button>
          <button 
            type="button" 
            className="preset-btn highlight-purple"
            onClick={() => applyPreset('round_robin_demo')}
          >
            ⏱️ Round Robin Activo
          </button>
          <button 
            type="button" 
            className="preset-btn highlight-amber"
            onClick={() => applyPreset('vip_priority_demo')}
          >
            🏆 Fila VIP (Prioridad)
          </button>
        </div>
      </section>

      {successMsg && (
        <div className="alert-message success">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabla de Configuración de Clientes */}
      <div className="table-wrapper">
        <div className="table-header-controls">
          <div>
            <h2>📋 Lista de Clientes Bancarios (Procesos)</h2>
            <p className="table-caption">
              Edita los valores directamente en la tabla. Mínimo 2 procesos, máximo 6 procesos.
            </p>
          </div>
          <div className="table-actions">
            <button
              type="button"
              className="action-btn add-btn"
              onClick={handleAddProcess}
              disabled={processes.length >= 6}
            >
              <Plus size={16} />
              <span>Agregar Cliente ({processes.length}/6)</span>
            </button>
          </div>
        </div>

        <table className="config-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Identidad / Color</th>
              <th>Tiempo Llegada (s)</th>
              <th>Ráfaga / Trámite (s)</th>
              <th>Prioridad</th>
              <th>Categoría</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {processes.map((proc, index) => {
              const arrivalError = errors[`${proc.id}_arrivalTime`];
              const burstError = errors[`${proc.id}_burstTime`];
              const priorityError = errors[`${proc.id}_priority`];
              const isVIP = proc.priority === 1;

              return (
                <tr key={proc.id} className={isVIP ? 'vip-row' : ''}>
                  <td className="proc-id-cell">
                    <span 
                      className="color-dot" 
                      style={{ backgroundColor: proc.color }} 
                    />
                    <strong>{proc.id}</strong>
                  </td>

                  <td>
                    <input
                      type="text"
                      className="text-input"
                      value={proc.name}
                      onChange={(e) => handleProcessChange(proc.id, 'name', e.target.value)}
                      placeholder="Nombre del Cliente"
                    />
                  </td>

                  <td>
                    <div className="input-group">
                      <input
                        type="number"
                        min="0"
                        className={`num-input ${arrivalError ? 'has-error' : ''}`}
                        value={proc.arrivalTime}
                        onChange={(e) => handleProcessChange(proc.id, 'arrivalTime', e.target.value)}
                      />
                      {arrivalError && <span className="field-error">{arrivalError}</span>}
                    </div>
                  </td>

                  <td>
                    <div className="input-group">
                      <input
                        type="number"
                        min="1"
                        className={`num-input ${burstError ? 'has-error' : ''}`}
                        value={proc.burstTime}
                        onChange={(e) => handleProcessChange(proc.id, 'burstTime', e.target.value)}
                      />
                      {burstError && <span className="field-error">{burstError}</span>}
                    </div>
                  </td>

                  <td>
                    <div className="input-group">
                      <input
                        type="number"
                        min="1"
                        className={`num-input ${priorityError ? 'has-error' : ''}`}
                        value={proc.priority}
                        onChange={(e) => handleProcessChange(proc.id, 'priority', e.target.value)}
                      />
                      {priorityError && <span className="field-error">{priorityError}</span>}
                    </div>
                  </td>

                  <td>
                    {isVIP ? (
                      <span className="badge-vip">
                        <Award size={14} /> 🏆 FILA VIP
                      </span>
                    ) : (
                      <span className="badge-general">
                        👤 General (P{proc.priority})
                      </span>
                    )}
                  </td>

                  <td>
                    <button
                      type="button"
                      className="delete-btn"
                      onClick={() => handleRemoveProcess(proc.id)}
                      disabled={processes.length <= 2}
                      title={processes.length <= 2 ? 'Se requiere un mínimo de 2 procesos' : 'Eliminar proceso'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Configuración Adicional: Quantum */}
      <div className="quantum-card">
        <div className="quantum-info">
          <Clock size={24} className="quantum-icon" />
          <div>
            <h3>Parámetro de Turno: Quantum para Round Robin (Q)</h3>
            <p>Cantidad de segundos continuos que cada cliente puede usar la caja bancaria por turno.</p>
          </div>
        </div>
        <div className="quantum-input-box">
          <label htmlFor="quantum-input">Valor del Quantum (seg):</label>
          <input
            id="quantum-input"
            type="number"
            min="1"
            max="20"
            className={`quantum-input ${errors['quantum'] ? 'has-error' : ''}`}
            value={quantum}
            onChange={(e) => {
              const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
              setQuantum(isNaN(val) ? '' : val);
              if (errors['quantum']) {
                setErrors((prev) => {
                  const updated = { ...prev };
                  delete updated['quantum'];
                  return updated;
                });
              }
            }}
          />
          {errors['quantum'] && <span className="field-error">{errors['quantum']}</span>}
        </div>
      </div>

      {/* Botones de Acción Principal */}
      <div className="config-footer-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={handleDirectResults}
        >
          <Layers size={18} />
          <span>Ver Comparativa Directa (Resultados)</span>
        </button>

        <button
          type="button"
          className="btn-primary"
          onClick={handleStart}
        >
          <Play size={20} />
          <span>Iniciar Simulación Visual en Caja</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
