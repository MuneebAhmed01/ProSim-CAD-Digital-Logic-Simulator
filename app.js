import { Circuit, CanvasRenderer } from "./Classes/circuit.js";
import { PackManager } from "./Classes/packManager.js";
import { setupEventHandlers } from "./Classes/eventHandlers.js";

export const circuit = new Circuit();
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    canvas.style.display = 'block';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.backgroundColor = '#F5F6FA';

    canvas.width = window.innerWidth - 80;
    canvas.height = window.innerHeight;
    
    console.log('Canvas initialized:', canvas.width, 'x', canvas.height);

    const canvasRenderer = new CanvasRenderer(canvas, ctx);
    circuit.subscribe(canvasRenderer);
    const packManager = new PackManager(circuit);

    // Application state
    const state = {
        selectedPin: null,
        tempConnection: null,
        draggedNode: null,
        dragOffset: { x: 0, y: 0 },
        selectedForDelete: null,
        hoveredPin: null,
        isConnecting: false,
        selectedConnection: null,
        selectedNodes: new Set(),
        isSelectingArea: false,
        selectionStart: { x: 0, y: 0 },
        selectionRect: null,
        draggedNodes: null,
        dragOffsets: new Map(),
        lastMousePos: { x: 0, y: 0 },
        isSimulationRunning: false,
        clkInterval: null
    };

    // Setup all event handlers
    setupEventHandlers(circuit, packManager, canvas, ctx, state);

    // Initialize pack drop point
    const SIDEBAR_WIDTH = 80;
    state.lastMousePos = {
        x: (canvas.width / 2) + (SIDEBAR_WIDTH / 2),
        y: canvas.height / 2
    };
    packManager.setDropPoint(state.lastMousePos);

    // Main draw loop
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#F5F6FA';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#dcdde1';
        for (let x = 12; x < canvas.width; x += 12) {
            for (let y = 12; y < canvas.height; y += 12) {
                ctx.beginPath();
                ctx.arc(x, y, 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        circuit.edges.forEach(edge => {
            edge.draw(ctx, edge === state.selectedConnection);
        });
        
        if (state.tempConnection && state.isConnecting) {
            const dx = state.tempConnection.x2 - state.tempConnection.x1;
            const dy = state.tempConnection.y2 - state.tempConnection.y1;
            
            ctx.strokeStyle = '#00bfff';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            
            if (dx > 0 && Math.abs(dy) < 10) {
                ctx.beginPath();
                ctx.moveTo(state.tempConnection.x1, state.tempConnection.y1);
                ctx.lineTo(state.tempConnection.x2, state.tempConnection.y2);
                ctx.stroke();
            } else {
                const midX = state.tempConnection.x1 + dx / 2;
                ctx.beginPath();
                ctx.moveTo(state.tempConnection.x1, state.tempConnection.y1);
                ctx.lineTo(midX, state.tempConnection.y1);
                ctx.lineTo(midX, state.tempConnection.y2);
                ctx.lineTo(state.tempConnection.x2, state.tempConnection.y2);
                ctx.stroke();
            }
            
            ctx.setLineDash([]);
        }
        
        circuit.nodes.forEach(node => {
            node.draw(ctx, state.selectedNodes.has(node), circuit);
        });

        if (state.isSelectingArea && state.selectionRect) {
            ctx.strokeStyle = '#00bfff';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(state.selectionRect.x, state.selectionRect.y, state.selectionRect.w, state.selectionRect.h);
            ctx.setLineDash([]);
        }
        
        if (state.hoveredPin && !state.draggedNode && !state.isConnecting) {
            const pin = state.hoveredPin.type === 'input' 
                ? state.hoveredPin.node.inputPins[state.hoveredPin.index]
                : state.hoveredPin.node.outputPins[state.hoveredPin.index];
            
            ctx.strokeStyle = '#00bfff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(pin.x, pin.y, 10, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(pin.x - 12, pin.y);
            ctx.lineTo(pin.x + 12, pin.y);
            ctx.moveTo(pin.x, pin.y - 12);
            ctx.lineTo(pin.x, pin.y + 12);
            ctx.stroke();
        }
        
        requestAnimationFrame(draw);
    }

    draw();
});
