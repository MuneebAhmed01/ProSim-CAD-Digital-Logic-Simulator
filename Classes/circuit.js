import { LogicNode } from "./logicNode.js";

// DirectedEdge class - was missing
export class DirectedEdge {
    constructor(sourceNode, sourcePin, targetNode, targetPin) {
        this.sourceNode = sourceNode;
        this.sourcePin = sourcePin;
        this.targetNode = targetNode;
        this.targetPin = targetPin;
    }

    draw(ctx, isSelected = false) {
        const startX = this.sourceNode.outputPins[this.sourcePin].x;
        const startY = this.sourceNode.outputPins[this.sourcePin].y;
        const endX = this.targetNode.inputPins[this.targetPin].x;
        const endY = this.targetNode.inputPins[this.targetPin].y;

        const color = this.sourceNode.outputValue ? '#00ff00' : '#888888';
        
        ctx.strokeStyle = isSelected ? '#ff0000' : color;
        ctx.lineWidth = isSelected ? 3 : 2;

        const dx = endX - startX;
        const dy = endY - startY;
        const midX = startX + dx / 2;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(midX, startY);
        ctx.lineTo(midX, endY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }

    isPointNear(x, y, threshold = 5) {
        const startX = this.sourceNode.outputPins[this.sourcePin].x;
        const startY = this.sourceNode.outputPins[this.sourcePin].y;
        const endX = this.targetNode.inputPins[this.targetPin].x;
        const endY = this.targetNode.inputPins[this.targetPin].y;
        const midX = startX + (endX - startX) / 2;

        // Check horizontal segment 1
        if (y >= startY - threshold && y <= startY + threshold &&
            x >= Math.min(startX, midX) && x <= Math.max(startX, midX)) {
            return true;
        }
        // Check vertical segment
        if (x >= midX - threshold && x <= midX + threshold &&
            y >= Math.min(startY, endY) && y <= Math.max(startY, endY)) {
            return true;
        }
        // Check horizontal segment 2
        if (y >= endY - threshold && y <= endY + threshold &&
            x >= Math.min(midX, endX) && x <= Math.max(midX, endX)) {
            return true;
        }
        return false;
    }
}

export class Circuit {
    constructor() {
        this.nodes = new Map(); 
        this.edges = []; 
        this.nextNodeId = 0; 
        this.observers = []; 
    }

   //new node
    addNode(type, x, y) {
        const node = new LogicNode(type, x, y, this.nextNodeId++);
        this.nodes.set(node.id, node);
        return node;
    }
// remove node
    removeNode(node) {
    
        this.edges = this.edges.filter(edge => 
            edge.sourceNode !== node && edge.targetNode !== node
        );
       
        this.nodes.forEach(n => {
            n.incomingEdges = n.incomingEdges.filter(e => e.sourceNode !== node);
        });
       
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

export class CircuitObserver {
    /**
     * Called when the circuit state changes
     * @param {Circuit} circuit - The circuit that changed
     */
    update(circuit) {
        // Override in subclasses
    }
}

//canva renderor 
 export class CanvasRenderer extends CircuitObserver {
    constructor(canvas, ctx) {
        super();
        this.canvas = canvas;
        this.ctx = ctx;
    }

    update(circuit) {
        
    }
}