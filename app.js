// Bg setup by this
import { Circuit, CanvasRenderer } from "./Classes/circuit.js";
import { PackManager } from "./Classes/packManager.js";

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    
    if (!canvas) {
        console.error('Canvas element not found! Make sure your HTML has <canvas id="canvas"></canvas>');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Ensure canvas is visible with CSS
    canvas.style.display = 'block';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.backgroundColor = '#F5F6FA';

    canvas.width = window.innerWidth - 80;
    canvas.height = window.innerHeight;
    
    console.log('Canvas initialized:', canvas.width, 'x', canvas.height);
// Task 1.1: Node Definition. Create a class LogicNode. It should store its current state
// (0 or 1), its logic type (AND, OR, etc.), and a list of incomingEdges Acheived by this class



// Topological Sorting: To simulate the circuit correctly.........
// 3. Observer Pattern: The UI and the Logic Engine are decoupled. When a component’s.............



const circuit = new Circuit();

const canvasRenderer = new CanvasRenderer(canvas, ctx);
circuit.subscribe(canvasRenderer);

let selectedPin = null;
let tempConnection = null;
let draggedNode = null;
let dragOffset = { x: 0, y: 0 };
let selectedForDelete = null;
let hoveredPin = null;
let isConnecting = false;
let selectedConnection = null;

let isSimulationRunning = false;

let clkInterval = null;
//main draw which render whole circuit
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    //bg
    ctx.fillStyle = '#F5F6FA';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
//breadboard like patern
    ctx.fillStyle = '#dcdde1';
    for (let x = 12; x < canvas.width; x += 12) {
        for (let y = 12; y < canvas.height; y += 12) {
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // edges draw
    circuit.edges.forEach(edge => {
        edge.draw(ctx, edge === selectedConnection);
    });
    
    // Draw temporary connection during wire creation
    if (tempConnection && isConnecting) {
        const color = '#00bfff';
        const dx = tempConnection.x2 - tempConnection.x1;
        const dy = tempConnection.y2 - tempConnection.y1;
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        // Only straight line if directly in front (small vertical offset) and to the right
        if (dx > 0 && Math.abs(dy) < 10) {
            ctx.beginPath();
            ctx.moveTo(tempConnection.x1, tempConnection.y1);
            ctx.lineTo(tempConnection.x2, tempConnection.y2);
            ctx.stroke();
        } else {
            // Orthogonal routing
            const midX = tempConnection.x1 + dx / 2;
            
            ctx.beginPath();
            ctx.moveTo(tempConnection.x1, tempConnection.y1);
            ctx.lineTo(midX, tempConnection.y1);
            ctx.lineTo(midX, tempConnection.y2);
            ctx.lineTo(tempConnection.x2, tempConnection.y2);
            ctx.stroke();
        }
        
        ctx.setLineDash([]);
    }
    
    // Draw all nodes - pass circuit reference
    circuit.nodes.forEach(node => {
        node.draw(ctx, node === selectedForDelete, circuit);
    });
    
    // Draw hover indicator on pins
    if (hoveredPin && !draggedNode && !isConnecting) {
        const pin = hoveredPin.type === 'input' 
            ? hoveredPin.node.inputPins[hoveredPin.index]
            : hoveredPin.node.outputPins[hoveredPin.index];
        
        ctx.strokeStyle = '#00bfff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pin.x, pin.y, 10, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw crosshair
        ctx.beginPath();
        ctx.moveTo(pin.x - 12, pin.y);
        ctx.lineTo(pin.x + 12, pin.y);
        ctx.moveTo(pin.x, pin.y - 12);
        ctx.lineTo(pin.x, pin.y + 12);
        ctx.stroke();
    }
    
    requestAnimationFrame(draw);
}

//drag and drop
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
        
        // Add node to circuit using the Circuit Manager
        circuit.addNode(gateType, x, y);
        
        // Only simulate if simulation is running
        if (isSimulationRunning) {
            circuit.simulate();
        }
    }
});

//navbar btn handler run,save laod etc
document.getElementById('runBtn').addEventListener('click', () => {
    isSimulationRunning = !isSimulationRunning;
    
    const runBtn = document.getElementById('runBtn');
    if (isSimulationRunning) {
        runBtn.textContent = '⏸ Pause';
        runBtn.classList.add('pause');
        circuit.simulate();
        startClockToggle();
    } else {
        runBtn.textContent = '▶ Run';
        runBtn.classList.remove('pause');
        stopClockToggle();
    }
});

document.getElementById('saveBtn').addEventListener('click', () => {
    saveCircuit();
});

document.getElementById('loadBtn').addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        loadCircuit(file);
    }
    e.target.value = ''; 
});

document.getElementById('savePackBtn').addEventListener('click', () => {
    packManager.saveCircuitAsPack();
});

// saving data into json
function saveCircuit() {
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

function loadCircuit(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            circuit.deserializeFromJSON(e.target.result);
            
            // Reset UI state
            selectedForDelete = null;
            selectedConnection = null;
            
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

//keyboard shorcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedForDelete) {
         
            circuit.removeNode(selectedForDelete);
            selectedForDelete = null;
            if (isSimulationRunning) { circuit.simulate(); }
        } else if (selectedConnection) {
            circuit.removeEdge(selectedConnection);
            selectedConnection = null;
            if (isSimulationRunning) {
                circuit.simulate();
            }
        }
    }
});
//mouse connection when when i click pin,i then control edge through mouse
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // connect if pin is on output
    let clickedPin = null;
    for (let node of circuit.nodes.values()) {
        const pin = node.getPinAt(x, y);
        if (pin) {
            clickedPin = pin;
            break;
        }
    }
    
    // Start creating connection from output pin
    if (clickedPin && clickedPin.type === 'output') {
        isConnecting = true;
        selectedPin = clickedPin;
        selectedConnection = null;
        tempConnection = {
            x1: clickedPin.node.outputPins[clickedPin.index].x,
            y1: clickedPin.node.outputPins[clickedPin.index].y,
            x2: x,
            y2: y
        };
        canvas.style.cursor = 'crosshair';
        return;
    }
    // Check for node dragging (if not connecting)
    if (!isConnecting) {
        for (let node of circuit.nodes.values()) {
            if (node.isPointInside(x, y)) {
                const pin = node.getPinAt(x, y);
                if (!pin) {
                    // Start dragging node
                    draggedNode = node;
                    selectedForDelete = node;
                    selectedConnection = null;
                    dragOffset.x = x - node.x;
                    dragOffset.y = y - node.y;
                    canvas.style.cursor = 'move';
                    return;
                }
            }
        }
        // Check if clicking on an edge
        for (let edge of circuit.edges) {
            if (edge.isPointNear(x, y)) {
                selectedConnection = edge;
                selectedForDelete = null;
                return;
            }
        }
        // Deselect if clicking empty space
        selectedForDelete = null;
        selectedConnection = null;
    }
});

/**
 * Mouse move - Update drag position or connection preview
 */
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (draggedNode) {
        // Update node position while dragging
        draggedNode.x = x - dragOffset.x;
        draggedNode.y = y - dragOffset.y;
        draggedNode.updatePinPositions();
        hoveredPin = null;
    } else if (isConnecting && tempConnection) {
        // Update temporary connection preview
        tempConnection.x2 = x;
        tempConnection.y2 = y;
        
        // Check if hovering over an input pin
        hoveredPin = null;
        for (let node of circuit.nodes.values()) {
            const pin = node.getPinAt(x, y);
            if (pin && pin.type === 'input') {
                hoveredPin = pin;
                canvas.style.cursor = 'crosshair';
                break;
            }
        }
    } else {
        // Check for pin hover when not dragging/connecting
        hoveredPin = null;
        for (let node of circuit.nodes.values()) {
            const pin = node.getPinAt(x, y);
            if (pin) {
                hoveredPin = pin;
                canvas.style.cursor = 'crosshair';
                return;
            }
        }
        canvas.style.cursor = 'default';
    }
});

/**
 * Mouse up - Complete connection or stop dragging
 */
canvas.addEventListener('mouseup', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (isConnecting && selectedPin) {
        // Check if released on an input pin
        let targetPin = null;
        for (let node of circuit.nodes.values()) {
            const pin = node.getPinAt(x, y);
            if (pin && pin.type === 'input') {
                targetPin = pin;
                break;
            }
        }
        
        if (targetPin && selectedPin.type === 'output') {
            // Create connection using Circuit Manager
            circuit.connect(
                selectedPin.node.id,
                targetPin.node.id,
                targetPin.index
            );
            
            // Only simulate if running
            if (isSimulationRunning) {
                circuit.simulate();
            }
        }
        
        // Reset connection state
        isConnecting = false;
        selectedPin = null;
        tempConnection = null;
        canvas.style.cursor = 'default';
    }
    
    if (draggedNode) {
        draggedNode = null;
        canvas.style.cursor = 'default';
    }
});

//toggle input state
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (draggedNode) return;
    let clickedNode = null;
    for (let node of circuit.nodes.values()) {
        if (node.isPointInside(x, y)) {
            clickedNode = node;
            break;
        }
    }

    if (clickedNode && clickedNode.type === 'INPUT') {
        clickedNode.state = clickedNode.state ? 0 : 1;
       
        if (isSimulationRunning) {
            circuit.simulate();
        }
    }
});
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth - 80;
    canvas.height = window.innerHeight;
});
const packManager = new PackManager(circuit);
// app start
draw();

// clk automatic toggle per sec
function startClockToggle() {
    stopClockToggle();
    clkInterval = setInterval(() => {
        if (isSimulationRunning) {
            // Toggle all CLK nodes
            circuit.nodes.forEach(node => {
                if (node.type === 'CLK') {
                    node.state = node.state ? 0 : 1;
                }
            });
            circuit.simulate();
        }
    }, 500); 
}
function stopClockToggle() {
    if (clkInterval) {
        clearInterval(clkInterval);
        clkInterval = null;
    }
}
}); // End of DOMContentLoaded
