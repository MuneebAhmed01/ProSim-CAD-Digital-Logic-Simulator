import { circuit } from "../app.js";

export function setupEventHandlers(circuit, packManager, canvas, ctx, state) {
    // Navbar button handlers
    document.getElementById('runBtn').addEventListener('click', () => {
        state.isSimulationRunning = !state.isSimulationRunning;
        
        const runBtn = document.getElementById('runBtn');
        if (state.isSimulationRunning) {
            runBtn.textContent = '⏸ Pause';
            runBtn.classList.add('pause');
            circuit.simulate();
            startClockToggle(circuit, state);
        } else {
            runBtn.textContent = '▶ Run';
            runBtn.classList.remove('pause');
            stopClockToggle(state);
        }
    });

    document.getElementById('saveBtn').addEventListener('click', () => {
        saveCircuit(circuit);
    });

    document.getElementById('loadBtn').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });

    document.getElementById('fileInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            loadCircuit(file, circuit);
        }
        e.target.value = '';
    });

    document.getElementById('savePackBtn').addEventListener('click', () => {
        if (state.selectedNodes.size === 0) {
            const btn = document.getElementById('savePackBtn');
            const prev = btn.textContent;
            btn.textContent = 'No component selected';
            setTimeout(() => { btn.textContent = prev; }, 1200);
            return;
        }
        packManager.saveSelectionAsPack(state.selectedNodes);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (state.selectedNodes.size > 0) {
                const toRemove = Array.from(state.selectedNodes);
                toRemove.forEach(node => circuit.removeNode(node));
                state.selectedNodes.clear();
                state.selectedForDelete = null;
                state.selectedConnection = null;
                if (state.isSimulationRunning) { circuit.simulate(); }
                return;
            }
            if (state.selectedForDelete) {
                circuit.removeNode(state.selectedForDelete);
                state.selectedForDelete = null;
                if (state.isSimulationRunning) { circuit.simulate(); }
            } else if (state.selectedConnection) {
                circuit.removeEdge(state.selectedConnection);
                state.selectedConnection = null;
                if (state.isSimulationRunning) {
                    circuit.simulate();
                }
            }
        }
    });

    // Drag and drop for gates
    document.querySelectorAll('.gate-btn').forEach(btn => {
        btn.addEventListener('dragstart', (e) => {
            const gateType = btn.getAttribute('data-gate');
            e.dataTransfer.setData('gateType', gateType);
            e.dataTransfer.effectAllowed = 'copy';
            btn.style.opacity = '0.5';
        });
        
        btn.addEventListener('dragend', (e) => {
            btn.style.opacity = '1';
        });
    });

    canvas.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });

    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        const gateType = e.dataTransfer.getData('gateType');
        if (gateType) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left - 50;
            const y = e.clientY - rect.top - 30;
            circuit.addNode(gateType, x, y);
            if (state.isSimulationRunning) {
                circuit.simulate();
            }
        }
    });

    // Mouse events
    canvas.addEventListener('mousedown', (e) => handleMouseDown(e, canvas, circuit, state));
    canvas.addEventListener('mousemove', (e) => handleMouseMove(e, canvas, packManager, state));
    canvas.addEventListener('mouseup', (e) => handleMouseUp(e, canvas, circuit, state));
    canvas.addEventListener('click', (e) => handleClick(e, canvas, circuit, state));

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth - 80;
        canvas.height = window.innerHeight;
        setPackDropToCenter(canvas, packManager, state);
    });
}

function handleMouseDown(e, canvas, circuit, state) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    let clickedPin = null;
    for (let node of circuit.nodes.values()) {
        const pin = node.getPinAt(x, y);
        if (pin) {
            clickedPin = pin;
            break;
        }
    }
    
    if (clickedPin && clickedPin.type === 'output') {
        state.isConnecting = true;
        state.selectedPin = clickedPin;
        state.selectedConnection = null;
        state.tempConnection = {
            x1: clickedPin.node.outputPins[clickedPin.index].x,
            y1: clickedPin.node.outputPins[clickedPin.index].y,
            x2: x,
            y2: y
        };
        canvas.style.cursor = 'crosshair';
        return;
    }

    if (!state.isConnecting) {
        for (let node of circuit.nodes.values()) {
            if (node.isPointInside(x, y)) {
                const pin = node.getPinAt(x, y);
                if (!pin) {
                    if (state.selectedNodes.has(node) && state.selectedNodes.size > 1) {
                        state.draggedNodes = [...state.selectedNodes];
                        state.dragOffsets.clear();
                        state.draggedNodes.forEach(n => {
                            state.dragOffsets.set(n, { x: x - n.x, y: y - n.y });
                        });
                        state.selectedForDelete = node;
                        state.selectedConnection = null;
                        canvas.style.cursor = 'move';
                        return;
                    }

                    state.draggedNode = node;
                    state.selectedNodes.clear();
                    state.selectedNodes.add(node);
                    state.selectedForDelete = node;
                    state.selectedConnection = null;
                    state.dragOffset.x = x - node.x;
                    state.dragOffset.y = y - node.y;
                    canvas.style.cursor = 'move';
                    return;
                }
            }
        }
        
        for (let edge of circuit.edges) {
            if (edge.isPointNear(x, y)) {
                state.selectedConnection = edge;
                state.selectedForDelete = null;
                state.selectedNodes.clear();
                return;
            }
        }
        
        state.selectedForDelete = null;
        state.selectedConnection = null;
        state.selectedNodes.clear();
        state.isSelectingArea = true;
        state.selectionStart = { x, y };
        state.selectionRect = { x, y, w: 0, h: 0 };
    }
}

function handleMouseMove(e, canvas, packManager, state) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    state.lastMousePos = { x, y };
    packManager.setDropPoint(state.lastMousePos);

    if (state.draggedNodes) {
        state.draggedNodes.forEach(n => {
            const off = state.dragOffsets.get(n);
            n.x = x - off.x;
            n.y = y - off.y;
            n.updatePinPositions();
        });
        state.hoveredPin = null;
    } else if (state.draggedNode) {
        state.draggedNode.x = x - state.dragOffset.x;
        state.draggedNode.y = y - state.dragOffset.y;
        state.draggedNode.updatePinPositions();
        state.hoveredPin = null;
    } else if (state.isSelectingArea && state.selectionRect) {
        const x1 = state.selectionStart.x;
        const y1 = state.selectionStart.y;
        state.selectionRect.x = Math.min(x1, x);
        state.selectionRect.y = Math.min(y1, y);
        state.selectionRect.w = Math.abs(x - x1);
        state.selectionRect.h = Math.abs(y - y1);
        state.hoveredPin = null;
        canvas.style.cursor = 'default';
    } else if (state.isConnecting && state.tempConnection) {
        state.tempConnection.x2 = x;
        state.tempConnection.y2 = y;
        
        state.hoveredPin = null;
        for (let node of circuit.nodes.values()) {
            const pin = node.getPinAt(x, y);
            if (pin && pin.type === 'input') {
                state.hoveredPin = pin;
                canvas.style.cursor = 'crosshair';
                break;
            }
        }
    } else {
        state.hoveredPin = null;
        for (let node of circuit.nodes.values()) {
            const pin = node.getPinAt(x, y);
            if (pin) {
                state.hoveredPin = pin;
                canvas.style.cursor = 'crosshair';
                return;
            }
        }
        canvas.style.cursor = 'default';
    }
}

function handleMouseUp(e, canvas, circuit, state) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (state.isConnecting && state.selectedPin) {
        let targetPin = null;
        for (let node of circuit.nodes.values()) {
            const pin = node.getPinAt(x, y);
            if (pin && pin.type === 'input') {
                targetPin = pin;
                break;
            }
        }
        
        if (targetPin && state.selectedPin.type === 'output') {
            circuit.connect(
                state.selectedPin.node.id,
                targetPin.node.id,
                targetPin.index
            );
            
            if (state.isSimulationRunning) {
                circuit.simulate();
            }
        }
        
        state.isConnecting = false;
        state.selectedPin = null;
        state.tempConnection = null;
        canvas.style.cursor = 'default';
    }
    
    if (state.draggedNodes) {
        state.draggedNodes = null;
        state.dragOffsets.clear();
        canvas.style.cursor = 'default';
    }

    if (state.draggedNode) {
        state.draggedNode = null;
        canvas.style.cursor = 'default';
    }

    if (state.isSelectingArea && state.selectionRect) {
        const rx = state.selectionRect.x;
        const ry = state.selectionRect.y;
        const rw = state.selectionRect.w;
        const rh = state.selectionRect.h;

        state.selectedNodes.clear();
        for (let node of circuit.nodes.values()) {
            const within =
                node.x >= rx &&
                node.y >= ry &&
                node.x + node.width <= rx + rw &&
                node.y + node.height <= ry + rh;
            if (within) state.selectedNodes.add(node);
        }

        state.isSelectingArea = false;
        state.selectionRect = null;
    }
}

function handleClick(e, canvas, circuit, state) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (state.draggedNode || state.isSelectingArea) return;
    
    let clickedNode = null;
    for (let node of circuit.nodes.values()) {
        if (node.isPointInside(x, y)) {
            clickedNode = node;
            break;
        }
    }

    if (clickedNode && clickedNode.type === 'INPUT') {
        clickedNode.state = clickedNode.state ? 0 : 1;
        if (state.isSimulationRunning) {
            circuit.simulate();
        }
    }
}

function saveCircuit(circuit) {
    const jsonString = circuit.serializeToJSON();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `circuit_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function loadCircuit(file, circuit) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            circuit.deserializeFromJSON(e.target.result);
            console.log('Circuit loaded successfully!');
        } catch (error) {
            alert('Error loading circuit: Invalid file format');
            console.error('Load error:', error);
        }
    };
    
    reader.onerror = () => {
        alert('Error reading file');
    };
    
    reader.readAsText(file);
}

function startClockToggle(circuit, state) {
    stopClockToggle(state);
    state.clkInterval = setInterval(() => {
        if (state.isSimulationRunning) {
            circuit.nodes.forEach(node => {
                if (node.type === 'CLK') {
                    node.state = node.state ? 0 : 1;
                }
            });
            circuit.simulate();
        }
    }, 500);
}

function stopClockToggle(state) {
    if (state.clkInterval) {
        clearInterval(state.clkInterval);
        state.clkInterval = null;
    }
}

function setPackDropToCenter(canvas, packManager, state) {
    const SIDEBAR_WIDTH = 80;
    const center = { 
        x: (canvas.width / 2) + (SIDEBAR_WIDTH / 2),
        y: canvas.height / 2 
    };
    state.lastMousePos = center;
    packManager.setDropPoint(center);
}
