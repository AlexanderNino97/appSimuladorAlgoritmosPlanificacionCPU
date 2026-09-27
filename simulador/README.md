# 🎮 Simulador CPU: La Gran Carrera Bancaria (Edición Retro 8-Bit)

Una aplicación web interactiva de **pantalla única** desarrollada con **React 18 + Vite + Framer Motion**, con estética de videojuego clásico RPG (Light Retro Theme, tipografía pixel-art `'Press Start 2P'`, bordes contrastados y animaciones de física de personajes).

Permite observar y comparar en **tiempo real y de forma simultánea** a los **5 algoritmos clásicos de planificación de CPU** (FCFS, SJF, SRTF, Round Robin y Prioridad) compitiendo sincronizados bajo un **Reloj Maestro Global**.

---

## 🏛️ La Metáfora Bancaria

| Concepto de Sistema Operativo | Equivalente en la Metáfora Bancaria |
| :--- | :--- |
| **CPU (Procesador)** | **🏦 Ventanilla del Cajero Bancario:** Recurso único central donde solo se puede atender a un cliente a la vez (Modelo Monoprocesador). |
| **Procesos ($P_1, P_2, \dots$)** | **👥 Clientes:** Personas que llegan al banco con solicitudes o pagos que requieren un tiempo de atención determinado. |
| **Tiempo de Llegada ($T_{ll}$)** | **📥 Hora de Entrada:** Momento exacto en que el cliente cruza la puerta del banco y toma turno en la fila. |
| **Tiempo de Ráfaga ($T_{ej}$)** | **⏳ Duración del Trámite:** Cantidad de segundos que el cajero necesita para procesar y sellar las transacciones del cliente. |
| **Prioridad** | **🏆 Fila VIP vs Fila General:** Clientes con Prioridad 1 son atendidos en la Fila VIP (adultos mayores, mujeres embarazadas o clientes preferenciales). |
| **Quantum ($Q$)** | **⏱️ Límite de Tiempo por Turno:** Tiempo máximo continuo que el cajero dedica a un cliente en Round Robin antes de pedirle que vuelva al final de la fila. |
| **Desalojo (Preemption)** | **⚡ Interrupción Amable:** El cajero suspende temporalmente al cliente en ventanilla al llegar alguien con un trámite más urgente/corto, conservando su avance. |
| **CPU Ociosa (IDLE)** | **🟢 Caja en Espera:** La ventanilla está libre y el cajero espera pacientemente la llegada de nuevos clientes. |

---

## ⚙️ Algoritmos Implementados

### 1. FCFS (First-Come, First-Served)
- **Tipo:** No apropiativo (Non-preemptive).
- **Lógica:** Estricto orden de llegada a la fila del banco. Quien llega primero a la ventanilla es atendido hasta terminar todo su trámite.
- **Desempate:** Por orden de llegada y luego por identificador numérico ($P_1, P_2$).

### 2. SJF (Shortest Job First)
- **Tipo:** No apropiativo (Non-preemptive).
- **Lógica:** Siempre que la ventanilla se desocupa, el cajero selecciona de la fila al cliente con el trámite más corto (menor tiempo de ráfaga inicial).
- **Desempate:** Menor tiempo de llegada y luego ID.

### 3. SRTF (Shortest Remaining Time First)
- **Tipo:** Apropiativo cada segundo (Preemptive).
- **Lógica:** En cada segundo, el sistema evalúa a todos los clientes presentes. Si un nuevo cliente tiene un tiempo restante **estrictamente menor** que el tiempo que le falta al cliente en caja, ocurre un **⚡ DESALOJO**. El cliente actual regresa a la fila conservando su avance y el nuevo cliente toma la caja.
- **Documentación educativa detallada:** Ver comentarios completos en `src/algorithms/srtf.js`.

### 4. Round Robin (RR)
- **Tipo:** Apropiativo por cuotas de tiempo (Time-Sharing).
- **Lógica:** El cajero atiende a cada cliente durante un **Quantum ($Q$)** configurable (ej. 2 segundos). Si el cliente no termina en ese lapso, se emite el evento **⏱️ FIN DEL TURNO** y regresa al final de la cola FIFO.
- **Regla de encolamiento estándar:** Los clientes que llegan en el segundo $T$ entran a la fila antes de que se reincorpore el cliente cuyo turno acaba de expirar en $T$.

### 5. Planificación por Prioridad
- **Tipo:** No apropiativo (Non-preemptive).
- **Lógica:** Menor número representa mayor prioridad ($1 = \text{VIP / Máxima Prioridad}$). Los clientes con Prioridad 1 se ubican en la **🏆 FILA VIP**. Cuando la caja queda libre, el cajero siempre atiende primero a los clientes de la fila VIP antes que a los de la fila general.

---

## 📐 Fórmulas Matemáticas Rigurosas

Todas las métricas se calculan con exactitud a dos decimales (`src/algorithms/calculateStats.js`):

1. **Tiempo de Retorno (Turnaround Time):**
   $$T_{\text{retorno}} = T_{\text{finalización}} - T_{\text{llegada}}$$
2. **Tiempo de Espera (Waiting Time):**
   $$T_{\text{espera}} = T_{\text{retorno}} - T_{\text{ráfaga}}$$
3. **Tiempo de Respuesta (Response Time):**
   $$T_{\text{respuesta}} = T_{\text{primer servicio}} - T_{\text{llegada}}$$
4. **Utilización de CPU (%):**
   $$\text{Utilización} = \left(\frac{T_{\text{ocupado}}}{T_{\text{total}}}\right) \times 100$$

---

## 📁 Estructura del Proyecto

```
simulador/
├── public/
│   └── vite.svg
├── src/
│   ├── algorithms/
│   │   ├── calculateStats.js   # Cálculo matemático puro de métricas
│   │   ├── fcfs.js             # Primero en llegar, primero en ser atendido
│   │   ├── sjf.js              # Trabajo más corto primero
│   │   ├── srtf.js             # Menor tiempo restante con desalojo y comentarios didácticos
│   │   ├── roundRobin.js       # Turnos rotativos por Quantum y cola FIFO
│   │   └── priority.js         # Prioridad con soporte Fila VIP vs Fila General
│   ├── models/
│   │   └── Process.js          # Modelo inmutable de proceso y paleta de colores fija
│   ├── views/
│   │   ├── ConfigView.jsx      # Formulario de configuración con validación en español y presets
│   │   ├── ConfigView.css      # Estilos de la vista de configuración
│   │   ├── SimulationView.jsx  # Escenario bancario interactivo, controles, slider y caja CPU
│   │   ├── SimulationView.css  # Animaciones, ventanilla de caja y filas visuales
│   │   ├── ResultsView.jsx     # Comparativa simultánea de los 5 algoritmos y ganador
│   │   └── ResultsView.css     # Diagramas de Gantt interactivos y tablas de desglose
│   ├── assets/
│   │   └── react.svg
│   ├── App.jsx                 # Orquestación de vistas y estado principal
│   ├── App.css                 # Layout y barra de navegación superior
│   ├── index.css               # Tokens de diseño, tipografía Inter y modo oscuro
│   └── main.jsx                # Punto de entrada de React 18
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── README.md
└── vite.config.js
```

---

## 🚀 Instalación y Ejecución

### Prerrequisitos
- Node.js versión 18 o superior.
- npm versión 9 o superior.

### Pasos
1. Entrar al directorio del simulador:
   ```bash
   cd simulador
   ```
2. Instalar las dependencias del proyecto:
   ```bash
   npm install
   ```
3. Iniciar el servidor de desarrollo local:
   ```bash
   npm run dev
   ```
4. Abrir en el navegador en la URL:
   ```
   http://localhost:5173
   ```

---

## 🖥️ Características de la Experiencia de Usuario (UX)

- **Diseño Dividido (Split Dashboard):**
  - **Panel Lateral Izquierdo (Configuración):** Ajuste en tiempo real de los parámetros de los procesos, presets precargados, quantum y botones para **agregar o eliminar clientes dinámicamente** (+ Cliente / Eliminar).
  - **Arena Derecha Espaciosa:** Ocupa la mayor parte de la pantalla para visualizar cómodamente las 3 etapas (Fila de espera, Caja bancaria con barra de HP y Atendidos) de los 5 algoritmos en simultáneo.
- **Reloj Maestro Global:** Un único cronómetro síncrono que impulsa los 5 algoritmos al mismo tiempo para observar la carrera en vivo.
- **Estética Light Retro 8-Bit:** Tipografía `'Press Start 2P'`, bordes pixel-art de alto contraste (`#121212`), sombras duras y fichas de estadísticas RPG interactivas al hacer clic o pasar el cursor sobre los personajes.
- **Física de Personajes con `framer-motion`:** Desplazamiento fluido de tokens entre etapas y animación de rebote/sacudida (snappy ejection) en desalojos (SRTF) y expiración de turnos (Round Robin).
- **Controles Completos en Dock Inferior:** Iniciar, Pausar, Paso adelante (+1s), Paso atrás (-1s), Reiniciar ($T=0$), Completar simulación y slider continuo de velocidad (100ms - 1500ms).
