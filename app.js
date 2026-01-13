// ============================================================================
// CANVAS SETUP
// ============================================================================
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth - 80;
canvas.height = window.innerHeight;

// ============================================================================
// PHASE 1: NODE DEFINITION & CIRCUIT MANAGER
// ============================================================================

/**
 * Task 1.1: LogicNode Class
 * Represents a single logic gate node in the circuit.
 * Stores its current state (0 or 1), logic type, and incoming edges.
 */
class LogicNode {
    constructor(type, x, y, id) {
        this.id = id; // Unique identifier for the node
        this.type = type; // Logic type: AND, OR, NOT, INPUT, CLK, OFF (probe)
        this.x = x; // X position on canvas
        this.y = y; // Y Position on canvas
        this.width = 80;  // Reduced from 100
        this.height = 50; // Reduced from 60
        this.borderRadius = 8; // Slightly smaller radius
        
        // Current state of the node (0 or 1)
        // For INPUT/CLK: user-controlled state
        // For logic gates: computed output
        this.state = 0;
        
        // List of incoming edges (directed connections from other nodes)
        this.incomingEdges = []; // Array of {sourceNode, sourcePin, targetPin}
        
        // Output value computed by the logic function
        this.outputValue = 0;
        
        // Input values for logic computation
        this.inputs = this.getInputCount();
        this.outputs = this.getOutputCount();
        this.inputValues = new Array(this.inputs).fill(0);
        
        // Visual pin representations for UI
        this.inputPins = [];
        this.outputPins = [];
        this.setupPins();
    }

    /**
     * Determines how many input pins this node type requires
     */
    getInputCount() {
        if (this.type === 'INPUT' || this.type === 'CLK') return 0; // No inputs (source nodes)
        if (this.type === 'OFF') return 1; // Probe with 1 input
        if (this.type === 'NOT') return 1; // NOT gate has 1 input
        return 2; // AND, OR, XOR have 2 inputs
    }

    /**
     * Determines how many output pins this node type provides
     */
    getOutputCount() {
        if (this.type === 'OFF') return 0; // Probe has no output (sink node)
        return 1; // All gates have 1 output
    }

    /**
     * Initialize visual pin positions based on node type
     */
    setupPins() {
        this.inputPins = [];
        this.outputPins = [];
        
        // OFF node (probe/display) - only has input
        if (this.type === 'OFF') {
            this.inputPins.push({
                x: this.x,
                y: this.y + this.height / 2,
                active: false
            });
            return;
        }
        
        // INPUT and CLK - only have output (source nodes)
        if (this.type === 'INPUT' || this.type === 'CLK') {
            this.outputPins.push({
                x: this.x + this.width,
                y: this.y + this.height / 2,
                active: false
            });
            return;
        }
        
        // Standard logic gates - distribute input pins vertically
        const pinSpacing = this.height / (this.inputs + 1);
        for (let i = 0; i < this.inputs; i++) {
            this.inputPins.push({
                x: this.x,
                y: this.y + pinSpacing * (i + 1),
                active: false
            });
        }
        // Single output pin in the middle
        this.outputPins.push({
            x: this.x + this.width,
            y: this.y + this.height / 2,
            active: false
        });
    }

    /**
     * Update pin positions after node is moved
     */
    updatePinPositions() {
        if (this.type === 'OFF') {
            this.inputPins[0].x = this.x;
            this.inputPins[0].y = this.y + this.height / 2;
            return;
        }
        
        if (this.type === 'INPUT' || this.type === 'CLK') {
            this.outputPins[0].x = this.x + this.width;
            this.outputPins[0].y = this.y + this.height / 2;
            return;
        }
        
        const pinSpacing = this.height / (this.inputs + 1);
        for (let i = 0; i < this.inputs; i++) {
            this.inputPins[i].x = this.x;
            this.inputPins[i].y = this.y + pinSpacing * (i + 1);
        }
        this.outputPins[0].x = this.x + this.width;
        this.outputPins[0].y = this.y + this.height / 2;
    }

    /**
     * Compute the output value based on logic type and input values
     * This is called during topological sort evaluation
     */
    computeOutput() {
        if (this.type === 'INPUT' || this.type === 'CLK') {
            // Source nodes: output their state
            this.outputValue = this.state;
        } else if (this.type === 'OFF') {
            // Probe/display: no output
            this.outputValue = 0;
        } else if (this.type === 'NOT') {
            // NOT gate: invert input
            this.outputValue = this.inputValues[0] ? 0 : 1;
        } else if (this.type === 'AND') {
            // AND gate: 1 if both inputs are 1
            this.outputValue = this.inputValues[0] && this.inputValues[1] ? 1 : 0;
        } else if (this.type === 'OR') {
            // OR gate: 1 if at least one input is 1
            this.outputValue = this.inputValues[0] || this.inputValues[1] ? 1 : 0;
        } else if (this.type === 'XOR') {
            // XOR gate: 1 if inputs are different
            this.outputValue = this.inputValues[0] !== this.inputValues[1] ? 1 : 0;
        }
        
        // Update pin visual states
        this.updatePinStates();
    }

    /**
     * Update visual state of pins based on current values
     */
    updatePinStates() {
        this.inputPins.forEach((pin, i) => {
            pin.active = this.inputValues[i] === 1;
        });
        this.outputPins.forEach((pin) => {
            pin.active = this.outputValue === 1;
        });
    }

    /**
     * Render this node on the canvas
     */
    draw() {
        // Highlight if selected for deletion
        if (selectedForDelete === this) {
            ctx.strokeStyle = '#00bfff';
            ctx.lineWidth = 3;
            this.roundRect(this.x - 3, this.y - 3, this.width + 6, this.height + 6, this.borderRadius + 3);
            ctx.stroke();
        }
        
        // Draw node body - color based on state
        if (this.type === 'INPUT') {
            ctx.fillStyle = this.state ? '#4caf50' : '#ffffff';
        } else if (this.type === 'CLK') {
            ctx.fillStyle = this.state ? '#4caf50' : '#ffffff';
        } else if (this.type === 'OFF') {
            ctx.fillStyle = this.inputValues[0] ? '#4caf50' : '#ffffff';
        } else {
            ctx.fillStyle = '#ffffff';
        }
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        this.roundRect(this.x, this.y, this.width, this.height, this.borderRadius);
        ctx.fill();
        ctx.stroke();

        // Draw node label
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px Arial'; // Slightly smaller font
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (this.type === 'INPUT') {
            ctx.font = 'bold 26px Arial'; // Reduced from 32px
            ctx.fillText(this.state ? '1' : '0', this.x + this.width / 2, this.y + this.height / 2);
        } else if (this.type === 'CLK') {
            ctx.fillText('CLK', this.x + this.width / 2, this.y + this.height / 2);
        } else if (this.type === 'OFF') {
            ctx.font = 'bold 16px Arial'; // Reduced from 20px
            ctx.fillText(this.inputValues[0] ? 'ON' : 'OFF', this.x + this.width / 2, this.y + this.height / 2);
        } else {
            ctx.fillText(this.type, this.x + this.width / 2, this.y + this.height / 2);
        }

        // Draw input pins
        this.inputPins.forEach((pin, i) => {
            ctx.beginPath();
            ctx.arc(pin.x, pin.y, 5, 0, Math.PI * 2); // Reduced from 6
            
            const isConnected = this.incomingEdges.some(edge => edge.targetPin === i);
            
            if (isConnected && pin.active) {
                ctx.fillStyle = '#00bfff';
            } else {
                ctx.fillStyle = '#ffffff';
            }
            ctx.fill();
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        // Draw output pins
        this.outputPins.forEach((pin, i) => {
            ctx.beginPath();
            ctx.arc(pin.x, pin.y, 5, 0, Math.PI * 2); // Reduced from 6
            
            const isConnected = circuit.hasOutgoingEdge(this);
            
            if (isConnected && pin.active) {
                ctx.fillStyle = '#00bfff';
            } else {
                ctx.fillStyle = '#ffffff';
            }
            ctx.fill();
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    }

    roundRect(x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.arcTo(x + width, y, x + width, y + radius, radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
        ctx.lineTo(x + radius, y + height);
        ctx.arcTo(x, y + height, x, y + height - radius, radius);
        ctx.lineTo(x, y + radius);
        ctx.arcTo(x, y, x + radius, y, radius);
        ctx.closePath();
    }

    isPointInside(x, y) {
        return x >= this.x && x <= this.x + this.width &&
               y >= this.y && y <= this.y + this.height;
    }

    getPinAt(x, y) {
        for (let i = 0; i < this.inputPins.length; i++) {
            const pin = this.inputPins[i];
            const dist = Math.sqrt((x - pin.x) ** 2 + (y - pin.y) ** 2);
            if (dist < 10) {
                return { type: 'input', index: i, node: this };
            }
        }
        for (let i = 0; i < this.outputPins.length; i++) {
            const pin = this.outputPins[i];
            const dist = Math.sqrt((x - pin.x) ** 2 + (y - pin.y) ** 2);
            if (dist < 10) {
                return { type: 'output', index: i, node: this };
            }
        }
        return null;
    }
}

/**
 * Represents a directed edge (wire) between two nodes
 */
class DirectedEdge {
    constructor(sourceNode, sourcePin, targetNode, targetPin) {
        this.sourceNode = sourceNode; // Output node
        this.sourcePin = sourcePin;   // Output pin index
        this.targetNode = targetNode; // Input node
        this.targetPin = targetPin;   // Input pin index
    }

    draw() {
        const from = this.sourceNode.outputPins[this.sourcePin];
        const to = this.targetNode.inputPins[this.targetPin];
        
        // Color based on signal value
        const color = this.sourceNode.outputValue ? '#4caf50' : '#f44336';
        
        this.drawSmartLine(from.x, from.y, to.x, to.y, color);
        
        // Highlight if selected
        if (selectedConnection === this) {
            ctx.strokeStyle = '#00bfff';
            ctx.lineWidth = 5;
            this.drawSmartLine(from.x, from.y, to.x, to.y, '#00bfff');
        }
    }

    drawSmartLine(x1, y1, x2, y2, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = selectedConnection === this ? 5 : 2.5;
        
        const dx = x2 - x1;
        const dy = y2 - y1;
        
        // Only use straight line if target is directly in front (very small vertical difference)
        // and the target is to the right of source
        if (dx > 0 && Math.abs(dy) < 10) {
            // Straight horizontal line
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        } else {
            // Orthogonal (zigzag) routing for all other cases
            const midX = x1 + dx / 2;
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(midX, y1);
            ctx.lineTo(midX, y2);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }

    isPointNear(x, y, threshold = 10) {
        const from = this.sourceNode.outputPins[this.sourcePin];
        const to = this.targetNode.inputPins[this.targetPin];
        
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        
        if (Math.abs(dy) < Math.abs(dx) * 0.5) {
            return this.distanceToLineSegment(x, y, from.x, from.y, to.x, to.y) < threshold;
        } else {
            const midX = from.x + dx / 2;
            
            return (
                this.distanceToLineSegment(x, y, from.x, from.y, midX, from.y) < threshold ||
                this.distanceToLineSegment(x, y, midX, from.y, midX, to.y) < threshold ||
                this.distanceToLineSegment(x, y, midX, to.y, to.x, to.y) < threshold
            );
        }
    }

    distanceToLineSegment(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) param = dot / lenSq;

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

/**
 * Task 1.2: Circuit Manager Class
 * Central manager for all nodes and connections.
 * Implements observer pattern and topological sort.
 */
class Circuit {
    constructor() {
        this.nodes = new Map(); // Map<id, LogicNode>
        this.edges = []; // Array of DirectedEdge
        this.nextNodeId = 0; // Auto-increment ID for nodes
        this.observers = []; // List of CircuitObserver instances
    }

    /**
     * Add a new node to the circuit
     */
    addNode(type, x, y) {
        const node = new LogicNode(type, x, y, this.nextNodeId++);
        this.nodes.set(node.id, node);
        return node;
    }

    /**
     * Remove a node and all connected edges
     */
    removeNode(node) {
        // Remove all edges connected to this node
        this.edges = this.edges.filter(edge => 
            edge.sourceNode !== node && edge.targetNode !== node
        );
        // Remove from incoming edges of other nodes
        this.nodes.forEach(n => {
            n.incomingEdges = n.incomingEdges.filter(e => e.sourceNode !== node);
        });
        // Remove the node itself
        this.nodes.delete(node.id);
    }

    /**
     * Task 1.3: Connect Method
     * Creates a directed edge from source node's output to target node's input.
     * @param {number} sourceId - ID of the source node
     * @param {number} targetId - ID of the target node
     * @param {number} inputIndex - Which input pin on the target node (0-based)
     */
    connect(sourceId, targetId, inputIndex) {
        const sourceNode = this.nodes.get(sourceId);
        const targetNode = this.nodes.get(targetId);
        
        if (!sourceNode || !targetNode) {
            console.error('Invalid node IDs for connection');
            return null;
        }
        
        // Create the directed edge
        const edge = new DirectedEdge(sourceNode, 0, targetNode, inputIndex);
        this.edges.push(edge);
        
        // Add to target node's incoming edges list
        targetNode.incomingEdges.push({
            sourceNode: sourceNode,
            sourcePin: 0,
            targetPin: inputIndex
        });
        
        return edge;
    }

    /**
     * Check if a node has any outgoing edges
     */
    hasOutgoingEdge(node) {
        return this.edges.some(edge => edge.sourceNode === node);
    }

    /**
     * Remove a specific edge
     */
    removeEdge(edge) {
        // Remove from edges array
        this.edges = this.edges.filter(e => e !== edge);
        // Remove from target node's incoming edges
        edge.targetNode.incomingEdges = edge.targetNode.incomingEdges.filter(
            ie => !(ie.sourceNode === edge.sourceNode && ie.targetPin === edge.targetPin)
        );
    }

    /**
     * PHASE 2: TOPOLOGICAL SORT & SIMULATION
     */

    /**
     * Task 2.1: Calculate In-Degree for Each Node
     * In-degree = number of incoming edges to a node
     * @returns {Map} Map of node ID to in-degree count
     */
    calculateInDegrees() {
        const inDegrees = new Map();
        
        // Initialize all nodes with in-degree 0
        this.nodes.forEach((node, id) => {
            inDegrees.set(id, 0);
        });
        
        // Count incoming edges for each node
        this.edges.forEach(edge => {
            const currentDegree = inDegrees.get(edge.targetNode.id);
            inDegrees.set(edge.targetNode.id, currentDegree + 1);
        });
        
        return inDegrees;
    }

    /**
     * Task 2.2: Kahn's Algorithm for Topological Sort
     * Determines the order in which nodes should be evaluated.
     * Nodes with no dependencies (in-degree = 0) are processed first.
     * 
     * @returns {Array<LogicNode>} Sorted list of nodes in evaluation order
     */
    topologicalSort() {
        // Step 1: Calculate in-degrees for all nodes
        const inDegrees = this.calculateInDegrees();
        
        // Step 2: Find all nodes with in-degree 0 (source nodes: INPUT, CLK)
        const queue = [];
        this.nodes.forEach((node, id) => {
            if (inDegrees.get(id) === 0) {
                queue.push(node);
            }
        });
        
        const sortedNodes = [];
        
        // Step 3: Process queue using Kahn's algorithm
        while (queue.length > 0) {
            // Remove a node from queue
            const currentNode = queue.shift();
            sortedNodes.push(currentNode);
            
            // For each outgoing edge from this node
            this.edges.forEach(edge => {
                if (edge.sourceNode === currentNode) {
                    // Decrement in-degree of target node
                    const targetId = edge.targetNode.id;
                    const newDegree = inDegrees.get(targetId) - 1;
                    inDegrees.set(targetId, newDegree);
                    
                    // If in-degree becomes 0, add to queue
                    if (newDegree === 0) {
                        queue.push(edge.targetNode);
                    }
                }
            });
        }
        
        // Check for cycles (if sortedNodes.length < nodes.size, there's a cycle)
        if (sortedNodes.length !== this.nodes.size) {
            console.warn('Circuit contains a cycle! Topological sort incomplete.');
        }
        
        return sortedNodes;
    }

    /**
     * Task 2.3: Simulate Circuit
     * Evaluates all nodes in topological order and propagates signals.
     * This is triggered whenever an input switch is toggled.
     */
    simulate() {
        // Reset all input values
        this.nodes.forEach(node => {
            node.inputValues.fill(0);
        });
        
        // Get evaluation order using topological sort
        const evaluationOrder = this.topologicalSort();
        
        // Process nodes in topological order
        evaluationOrder.forEach(node => {
            // Propagate input values from incoming edges
            node.incomingEdges.forEach(edge => {
                node.inputValues[edge.targetPin] = edge.sourceNode.outputValue;
            });
            
            // Compute output based on logic function
            node.computeOutput();
        });
        
        // Notify all observers that simulation is complete
        this.notifyObservers();
    }

    /**
     * PHASE 3: OBSERVER PATTERN
     */

    /**
     * Task 3.2: Add an observer to the circuit
     */
    subscribe(observer) {
        this.observers.push(observer);
    }

    /**
     * Remove an observer
     */
    unsubscribe(observer) {
        this.observers = this.observers.filter(obs => obs !== observer);
    }

    /**
     * Task 3.3: Notify all observers when simulation completes
     */
    notifyObservers() {
        this.observers.forEach(observer => {
            observer.update(this);
        });
    }

    /**
     * PHASE 4: SERIALIZATION & PERSISTENCE
     */

    /**
     * Task 4.1: Serialize circuit to JSON
     * @returns {string} JSON representation of the circuit
     */
    serializeToJSON() {
        const nodesData = [];
        this.nodes.forEach(node => {
            nodesData.push({
                id: node.id,
                type: node.type,
                x: node.x,
                y: node.y,
                state: node.state
            });
        });
        
        const edgesData = this.edges.map(edge => ({
            sourceId: edge.sourceNode.id,
            sourcePin: edge.sourcePin,
            targetId: edge.targetNode.id,
            targetPin: edge.targetPin
        }));
        
        const circuitData = {
            version: "2.0",
            timestamp: new Date().toISOString(),
            nextNodeId: this.nextNodeId,
            nodes: nodesData,
            edges: edgesData
        };
        
        return JSON.stringify(circuitData, null, 2);
    }

    /**
     * Deserialize circuit from JSON
     * @param {string} jsonString - JSON representation
     */
    deserializeFromJSON(jsonString) {
        const data = JSON.parse(jsonString);
        
        // Clear existing circuit
        this.nodes.clear();
        this.edges = [];
        this.nextNodeId = data.nextNodeId || 0;
        
        // Recreate nodes
        data.nodes.forEach(nodeData => {
            const node = new LogicNode(nodeData.type, nodeData.x, nodeData.y, nodeData.id);
            node.state = nodeData.state || 0;
            this.nodes.set(node.id, node);
        });
        
        // Recreate edges
        data.edges.forEach(edgeData => {
            const sourceNode = this.nodes.get(edgeData.sourceId);
            const targetNode = this.nodes.get(edgeData.targetId);
            
            if (sourceNode && targetNode) {
                const edge = new DirectedEdge(
                    sourceNode,
                    edgeData.sourcePin,
                    targetNode,
                    edgeData.targetPin
                );
                this.edges.push(edge);
                
                targetNode.incomingEdges.push({
                    sourceNode: sourceNode,
                    sourcePin: edgeData.sourcePin,
                    targetPin: edgeData.targetPin
                });
            }
        });
        
        // Don't simulate automatically - let user control when to run
    }
}

/**
 * Task 3.1: Observer Interface
 * Defines the contract for observers that react to circuit changes
 */
class CircuitObserver {
    /**
     * Called when the circuit state changes
     * @param {Circuit} circuit - The circuit that changed
     */
    update(circuit) {
        // Override in subclasses
    }
}

/**
 * Canvas Renderer Observer
 * Handles all UI rendering in response to circuit changes
 */
class CanvasRenderer extends CircuitObserver {
    constructor(canvas, ctx) {
        super();
        this.canvas = canvas;
        this.ctx = ctx;
    }

    /**
     * Task 3.3: Decoupled Rendering
     * Triggered by circuit notifications, not directly by simulation
     */
    update(circuit) {
        // Rendering happens in the main draw loop
        // This ensures UI updates are synchronized with circuit state
    }
}

// ============================================================================
// GLOBAL STATE & INITIALIZATION
// ============================================================================

// Create the circuit manager instance
const circuit = new Circuit();

// Create and subscribe the renderer observer
const canvasRenderer = new CanvasRenderer(canvas, ctx);
circuit.subscribe(canvasRenderer);

// UI state variables
let selectedPin = null;
let tempConnection = null;
let draggedNode = null;
let dragOffset = { x: 0, y: 0 };
let selectedForDelete = null;
let hoveredPin = null;
let isConnecting = false;
let selectedConnection = null;

// Simulation control
let isSimulationRunning = false;

// CLK auto-toggle
let clkInterval = null;

// ============================================================================
// RENDERING & ANIMATION LOOP
// ============================================================================

/**
 * Main draw function - renders the entire circuit state
 * Called continuously via requestAnimationFrame
 */
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw dull white background
    ctx.fillStyle = '#F5F6FA';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw dotted grid pattern - closer together and subtle
    ctx.fillStyle = '#dcdde1';
    for (let x = 12; x < canvas.width; x += 12) {
        for (let y = 12; y < canvas.height; y += 12) {
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Draw all edges (connections)
    circuit.edges.forEach(edge => edge.draw());
    
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
    
    // Draw all nodes
    circuit.nodes.forEach(node => node.draw());
    
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

// ============================================================================
// USER INTERFACE EVENT HANDLERS
// ============================================================================

/**
 * Handle drag-and-drop from sidebar to add new nodes
 */
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

/**
 * Toolbar button handlers
 */
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
    e.target.value = ''; // Reset for re-loading same file
});

document.getElementById('savePackBtn').addEventListener('click', () => {
    packManager.saveCircuitAsPack();
});

/**
 * Task 4.1: Save circuit to JSON file
 */
function saveCircuit() {
    const jsonString = circuit.serializeToJSON();
    
    // Create downloadable file
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

/**
 * Load circuit from JSON file
 */
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

/**
 * Keyboard shortcuts - Delete key removes selected elements
 */
document.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedForDelete) {
            // Remove node and all connected edges
            circuit.removeNode(selectedForDelete);
            selectedForDelete = null;
            if (isSimulationRunning) {
                circuit.simulate();
            }
        } else if (selectedConnection) {
            // Remove edge
            circuit.removeEdge(selectedConnection);
            selectedConnection = null;
            if (isSimulationRunning) {
                circuit.simulate();
            }
        }
    }
});

// ============================================================================
// MOUSE INTERACTION HANDLERS
// ============================================================================

/**
 * Mouse down - Start connection, drag node, or select element
 */
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if clicking on a pin
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

/**
 * Mouse click - Toggle INPUT/CLK node states
 */
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Don't process click if we just finished dragging
    if (draggedNode) return;
    
    // Check if clicking on a node
    let clickedNode = null;
    for (let node of circuit.nodes.values()) {
        if (node.isPointInside(x, y)) {
            clickedNode = node;
            break;
        }
    }
    
    // Only toggle INPUT state on click - CLK is automatic only
    if (clickedNode && clickedNode.type === 'INPUT') {
        clickedNode.state = clickedNode.state ? 0 : 1;
        // Only trigger simulation if running
        if (isSimulationRunning) {
            circuit.simulate();
        }
    }
    // CLK nodes cannot be manually toggled
});

/**
 * Window resize handler
 */
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth - 80;
    canvas.height = window.innerHeight;
});

/**
 * Pack Manager - Handles saving and loading circuit packs
 */
class PackManager {
    constructor() {
        this.packs = this.loadPacksFromStorage();
        this.updatePacksList();
    }

    /**
     * Load all saved packs from localStorage
     */
    loadPacksFromStorage() {
        const stored = localStorage.getItem('circuitPacks');
        return stored ? JSON.parse(stored) : [];
    }

    /**
     * Save packs to localStorage
     */
    savePacksToStorage() {
        localStorage.setItem('circuitPacks', JSON.stringify(this.packs));
    }

    /**
     * Save current circuit as a pack
     */
    saveCircuitAsPack() {
        // Check if there are any nodes in the circuit
        if (circuit.nodes.size === 0) {
            alert('No circuit to save! Please create a circuit first.');
            return;
        }

        // Prompt for pack name
        let packName = prompt('Enter a name for this pack (leave empty for auto-naming):');
        
        // Auto-generate name if empty
        if (!packName || packName.trim() === '') {
            let packNumber = 1;
            while (this.packs.some(p => p.name === `Pack ${packNumber}`)) {
                packNumber++;
            }
            packName = `Pack ${packNumber}`;
        } else {
            packName = packName.trim();
        }

        // Check for duplicate names
        if (this.packs.some(p => p.name === packName)) {
            const overwrite = confirm(`A pack named "${packName}" already exists. Overwrite?`);
            if (!overwrite) return;
            // Remove existing pack
            this.packs = this.packs.filter(p => p.name !== packName);
        }

        // Serialize current circuit
        const circuitData = circuit.serializeToJSON();
        
        // Create pack object
        const pack = {
            name: packName,
            data: circuitData,
            timestamp: new Date().toISOString(),
            nodeCount: circuit.nodes.size,
            edgeCount: circuit.edges.length
        };

        // Add to packs array
        this.packs.push(pack);
        
        // Save to localStorage
        this.savePacksToStorage();
        
        // Update UI
        this.updatePacksList();
        
        alert(`Pack "${packName}" saved successfully!`);
    }

    /**
     * Load a pack into the current circuit
     */
    loadPack(packName) {
        const pack = this.packs.find(p => p.name === packName);
        if (!pack) {
            alert('Pack not found!');
            return;
        }

        // Confirm if current circuit exists
        if (circuit.nodes.size > 0) {
            const confirm = window.confirm(`Loading this pack will replace the current circuit. Continue?`);
            if (!confirm) return;
        }

        try {
            circuit.deserializeFromJSON(pack.data);
            
            // Reset UI state
            selectedForDelete = null;
            selectedConnection = null;
            
            console.log(`Pack "${packName}" loaded successfully!`);
        } catch (error) {
            alert('Error loading pack: ' + error.message);
            console.error('Pack load error:', error);
        }
    }

    /**
     * Delete a pack
     */
    deletePack(packName) {
        const confirmDelete = confirm(`Are you sure you want to delete pack "${packName}"?`);
        if (!confirmDelete) return;

        this.packs = this.packs.filter(p => p.name !== packName);
        this.savePacksToStorage();
        this.updatePacksList();
    }

    /**
     * Update the packs list in the sidebar
     */
    updatePacksList() {
        const packsList = document.getElementById('packsList');
        packsList.innerHTML = '';

        // Display packs in reverse order (latest first)
        const reversedPacks = [...this.packs].reverse();

        reversedPacks.forEach(pack => {
            const packItem = document.createElement('div');
            packItem.className = 'pack-item';
            
            const packInfo = document.createElement('div');
            packInfo.className = 'pack-name';
            packInfo.textContent = pack.name;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'pack-delete';
            deleteBtn.textContent = '×';
            deleteBtn.title = 'Delete pack';
            
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deletePack(pack.name);
            });
            
            packItem.appendChild(packInfo);
            packItem.appendChild(deleteBtn);
            
            // Load pack on click
            packItem.addEventListener('click', () => {
                this.loadPack(pack.name);
            });
            
            packsList.appendChild(packItem);
        });
    }
}

// Initialize pack manager
const packManager = new PackManager();

// ============================================================================
// START APPLICATION
// ============================================================================

// Start the animation loop
draw();

/**
 * Start automatic CLK toggle
 */
function startClockToggle() {
    stopClockToggle(); // Clear any existing interval
    
    clkInterval = setInterval(() => {
        if (isSimulationRunning) {
            // Toggle all CLK nodes
            circuit.nodes.forEach(node => {
                if (node.type === 'CLK') {
                    node.state = node.state ? 0 : 1;
                }
            });
            // Simulate the circuit with new CLK states
            circuit.simulate();
        }
    }, 500); // Toggle every 0.5 seconds (500ms)
}

/**
 * Stop automatic CLK toggle
 */
function stopClockToggle() {
    if (clkInterval) {
        clearInterval(clkInterval);
        clkInterval = null;
    }
}
