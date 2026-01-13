# Logic Gate Simulator - Architecture Documentation

## Overview

This is a professional-grade digital logic circuit simulator implementing proper software engineering patterns including **Topological Sort**, **Observer Pattern**, **Circuit Graph Management**, and **Component Serialization**.

---

## Phase 1: Data Structure Foundation

### Task 1.1: LogicNode Class

**Purpose**: Represents a single logic gate node in the circuit graph.

**Key Properties**:

- `id`: Unique identifier for the node
- `type`: Logic type (AND, OR, NOT, INPUT, CLK, OFF/probe)
- `state`: Current state (0 or 1) - user-controlled for INPUT/CLK
- `incomingEdges`: Array of directed edges feeding into this node
- `inputValues`: Array storing current values on input pins
- `outputValue`: Computed output value

**Key Methods**:

- `computeOutput()`: Evaluates logic function based on input values
- `setupPins()`: Initializes visual pin positions
- `draw()`: Renders the node on canvas

**Logic Types**:

- **INPUT**: Source node with user-controllable state (click to toggle 0/1)
- **CLK**: Clock signal source (toggleable)
- **OFF**: Probe/display node (sink, no output - displays input value)
- **AND**: Output = 1 if both inputs are 1
- **OR**: Output = 1 if at least one input is 1
- **NOT**: Output = inverse of input
- **XOR**: Output = 1 if inputs are different

---

### Task 1.2: Circuit Manager Class

**Purpose**: Central manager for the entire circuit graph. Maintains all nodes and edges.

**Key Properties**:

- `nodes`: Map<id, LogicNode> - All nodes in the circuit
- `edges`: Array<DirectedEdge> - All connections between nodes
- `nextNodeId`: Auto-increment counter for unique IDs
- `observers`: Array of CircuitObserver instances

**Key Methods**:

- `addNode(type, x, y)`: Creates and adds a new node
- `removeNode(node)`: Removes node and all connected edges
- `connect(sourceId, targetId, inputIndex)`: Creates directed edge
- `removeEdge(edge)`: Removes a specific connection

---

### Task 1.3: DirectedEdge Class

**Purpose**: Represents a wire connecting the output of one node to the input of another.

**Structure**:

```javascript
{
    sourceNode: LogicNode,  // Output node
    sourcePin: number,      // Output pin index (usually 0)
    targetNode: LogicNode,  // Input node
    targetPin: number       // Which input pin (0-based)
}
```

**Key Concept**: Edges establish the **dependency graph** used for topological sorting.

---

## Phase 2: Execution Engine (Topological Sort)

### Why Topological Sort?

**Problem**: In a digital circuit, signals must propagate in the correct order. If Gate A feeds into Gate B, we must calculate Gate A's output before Gate B's output.

**Solution**: Topological sort determines the correct evaluation order by analyzing the dependency graph.

---

### Task 2.1: In-Degree Calculation

**Function**: `calculateInDegrees()`

**Purpose**: Counts how many incoming edges (dependencies) each node has.

```javascript
calculateInDegrees() {
    const inDegrees = new Map();

    // Initialize all nodes with in-degree 0
    this.nodes.forEach((node, id) => {
        inDegrees.set(id, 0);
    });

    // Count incoming edges
    this.edges.forEach(edge => {
        const currentDegree = inDegrees.get(edge.targetNode.id);
        inDegrees.set(edge.targetNode.id, currentDegree + 1);
    });

    return inDegrees;
}
```

**Result**: Map of `nodeId → inDegreeCount`

---

### Task 2.2: Kahn's Algorithm Implementation

**Function**: `topologicalSort()`

**Purpose**: Produces a sorted list of nodes in evaluation order using Kahn's Algorithm.

**Algorithm Steps**:

1. **Find Source Nodes**: All nodes with in-degree = 0 (INPUT, CLK gates)
2. **Initialize Queue**: Add all source nodes to processing queue
3. **Process Queue**:
   - Remove a node from queue
   - Add it to sorted list
   - For each outgoing edge:
     - Decrement target node's in-degree
     - If target in-degree becomes 0, add to queue
4. **Cycle Detection**: If sorted list size < total nodes, circuit has a cycle

**Code**:

```javascript
topologicalSort() {
    const inDegrees = this.calculateInDegrees();
    const queue = [];

    // Find source nodes (in-degree = 0)
    this.nodes.forEach((node, id) => {
        if (inDegrees.get(id) === 0) {
            queue.push(node);
        }
    });

    const sortedNodes = [];

    // Kahn's algorithm
    while (queue.length > 0) {
        const currentNode = queue.shift();
        sortedNodes.push(currentNode);

        this.edges.forEach(edge => {
            if (edge.sourceNode === currentNode) {
                const targetId = edge.targetNode.id;
                const newDegree = inDegrees.get(targetId) - 1;
                inDegrees.set(targetId, newDegree);

                if (newDegree === 0) {
                    queue.push(edge.targetNode);
                }
            }
        });
    }

    return sortedNodes;
}
```

**Example**:

```
Circuit: INPUT → AND → NOT → OUTPUT
         INPUT ↗

Evaluation Order: [INPUT, INPUT, AND, NOT, OUTPUT]
```

---

### Task 2.3: Simulation Trigger

**Function**: `simulate()`

**Purpose**: Evaluates the entire circuit in topological order. **Triggered whenever an INPUT/CLK is toggled.**

**Algorithm**:

1. Reset all input values to 0
2. Get evaluation order via topological sort
3. For each node in order:
   - Propagate values from incoming edges to input pins
   - Compute output using logic function
   - Update visual pin states
4. Notify all observers (trigger UI update)

**Code**:

```javascript
simulate() {
    // Reset inputs
    this.nodes.forEach(node => {
        node.inputValues.fill(0);
    });

    // Get correct evaluation order
    const evaluationOrder = this.topologicalSort();

    // Evaluate in order
    evaluationOrder.forEach(node => {
        // Propagate incoming values
        node.incomingEdges.forEach(edge => {
            node.inputValues[edge.targetPin] = edge.sourceNode.outputValue;
        });

        // Compute output
        node.computeOutput();
    });

    // Notify observers
    this.notifyObservers();
}
```

---

## Phase 3: Observer Pattern (Reactive UI)

### Why Observer Pattern?

**Problem**: Tight coupling between simulation logic and UI rendering makes code hard to maintain and test.

**Solution**: Circuit doesn't know about the UI. It simply notifies observers when state changes. The UI observes and updates itself.

---

### Task 3.1: CircuitObserver Interface

**Purpose**: Defines the contract for all observers.

```javascript
class CircuitObserver {
  update(circuit) {
    // Override in subclasses
    // Called when circuit state changes
  }
}
```

---

### Task 3.2: Subscription Logic

**Methods in Circuit class**:

```javascript
subscribe(observer) {
    this.observers.push(observer);
}

unsubscribe(observer) {
    this.observers = this.observers.filter(obs => obs !== observer);
}
```

**Usage**:

```javascript
const circuit = new Circuit();
const renderer = new CanvasRenderer(canvas, ctx);
circuit.subscribe(renderer);
```

---

### Task 3.3: Decoupled Rendering

**Implementation**: `CanvasRenderer` class extends `CircuitObserver`

```javascript
class CanvasRenderer extends CircuitObserver {
  update(circuit) {
    // Triggered when circuit notifies
    // Rendering happens in main draw loop
    // Ensures UI is synchronized with circuit state
  }
}
```

**Flow**:

1. User toggles INPUT → `simulate()` called
2. Circuit evaluates → calls `notifyObservers()`
3. Observers receive `update()` call
4. UI re-renders on next animation frame

**Benefits**:

- Circuit logic is UI-agnostic
- Easy to add new observers (e.g., console logger, data analyzer)
- Testable simulation without UI dependencies

---

## Phase 4: Persistence & Advanced Features

### Task 4.1: JSON Serialization

**Methods**:

**Serialize** (`serializeToJSON()`):

```javascript
{
    "version": "2.0",
    "timestamp": "2026-01-12T...",
    "nextNodeId": 5,
    "nodes": [
        { "id": 0, "type": "INPUT", "x": 100, "y": 150, "state": 1 },
        { "id": 1, "type": "AND", "x": 300, "y": 150, "state": 0 }
    ],
    "edges": [
        { "sourceId": 0, "sourcePin": 0, "targetId": 1, "targetPin": 0 }
    ]
}
```

**Deserialize** (`deserializeFromJSON(jsonString)`):

1. Parse JSON
2. Clear existing circuit
3. Recreate all nodes with original IDs
4. Recreate all edges using node IDs
5. Run simulation

**Benefits**:

- Save/load circuit designs
- Share circuits between users
- Version control for circuit files
- Foundation for cloud storage

---

### Task 4.2: Sub-Graph Extraction (Component System)

**Concept**: "Composition over Inheritance" - Build complex components from simpler ones.

**Future Implementation Sketch**:

```javascript
class CustomComponent extends LogicNode {
  constructor(name, internalCircuit) {
    super("CUSTOM", x, y, id);
    this.name = name;
    this.internalCircuit = internalCircuit; // Sub-circuit
    this.inputMappings = []; // Map external inputs to internal nodes
    this.outputMappings = []; // Map internal outputs to external
  }

  computeOutput() {
    // Map external inputs to internal circuit
    this.inputMappings.forEach((mapping, i) => {
      mapping.internalNode.state = this.inputValues[i];
    });

    // Simulate internal circuit
    this.internalCircuit.simulate();

    // Map internal outputs to external
    this.outputMappings.forEach((mapping, i) => {
      this.outputValue = mapping.internalNode.outputValue;
    });
  }
}
```

**Use Cases**:

- Create a "Half Adder" component from XOR and AND gates
- Build a "4-bit Counter" from flip-flops
- Design a "7-segment Display Decoder" as a reusable component
- Hierarchical circuit design

---

## How Everything Works Together

### 1. Adding a Node

```
User drags gate → canvas.drop event
→ circuit.addNode(type, x, y)
→ LogicNode created with unique ID
→ Added to circuit.nodes Map
→ circuit.simulate() called
→ Observers notified
→ UI updates
```

### 2. Creating a Connection

```
User clicks output pin → mousedown sets selectedPin
User drags → mousemove updates preview
User releases on input pin → mouseup
→ circuit.connect(sourceId, targetId, inputIndex)
→ DirectedEdge created
→ Added to circuit.edges array
→ Added to targetNode.incomingEdges
→ circuit.simulate() called
→ Topological sort determines evaluation order
→ Signals propagate in correct order
→ Observers notified
→ Wires change color based on signal values
```

### 3. Toggling an Input

```
User clicks INPUT node → canvas.click event
→ node.state toggled (0 ↔ 1)
→ circuit.simulate() triggered (Task 2.3)
→ topologicalSort() determines order
→ Each node evaluated in order
→ Values propagate through circuit
→ notifyObservers() called
→ UI updates to show new states
```

### 4. Deleting a Node

```
User selects node → click sets selectedForDelete
User presses Delete → keydown event
→ circuit.removeNode(node)
→ All connected edges removed
→ Node removed from circuit.nodes
→ circuit.simulate() called
→ Circuit re-evaluated without deleted node
→ UI updates
```

### 5. Saving a Circuit

```
User clicks Save button
→ circuit.serializeToJSON()
→ Nodes and edges converted to plain objects
→ JSON.stringify creates string
→ Blob created with JSON data
→ Browser downloads .json file
```

### 6. Loading a Circuit

```
User selects .json file
→ FileReader reads file content
→ circuit.deserializeFromJSON(content)
→ JSON.parse extracts data
→ circuit.nodes cleared
→ New LogicNode instances created
→ DirectedEdge instances recreated
→ circuit.simulate() runs
→ Circuit fully restored
```

---

## Key Design Patterns Used

### 1. **Graph Data Structure**

- Nodes = LogicNode instances
- Edges = DirectedEdge instances
- Enables topological sort

### 2. **Topological Sort (Kahn's Algorithm)**

- Determines evaluation order
- Prevents incorrect signal propagation
- Detects cycles

### 3. **Observer Pattern**

- Decouples simulation from rendering
- Circuit notifies, observers react
- Extensible for new observers

### 4. **Serialization Pattern**

- Convert live objects to JSON
- Reconstruct from JSON
- Enables persistence

### 5. **Composition over Inheritance**

- Build complex components from simple ones
- Reusable sub-circuits
- Hierarchical design

---

## Performance Considerations

### Time Complexity:

- **Topological Sort**: O(V + E) where V = nodes, E = edges
- **Simulation**: O(V + E) per simulation
- **Rendering**: O(V + E) per frame

### Space Complexity:

- **Circuit Storage**: O(V + E)
- **In-Degree Map**: O(V)
- **Evaluation Order**: O(V)

### Optimizations:

- Single topological sort per simulation (not per iteration)
- Efficient Map-based node lookup (O(1) access)
- Incremental rendering (only redraw on change)

---

## Testing Scenarios

### 1. Basic Gates

- Create INPUT, connect to NOT, verify output inverts

### 2. Combinational Logic

- Build half-adder (XOR + AND)
- Test all input combinations (00, 01, 10, 11)

### 3. Multiple Dependencies

```
INPUT1 ──┐
         ├── AND ──→ OR ──→ OUTPUT
INPUT2 ──┘           ↑
INPUT3 ──────────────┘
```

- Verify topological sort order
- Verify correct output for all input combinations

### 4. Cycle Detection

- Create A → B → A
- Verify warning message

### 5. Save/Load

- Build complex circuit
- Save to JSON
- Reload and verify identical behavior

---

## Future Enhancements

### 1. Custom Components

- Group selection tool
- "Create Component" button
- Component library

### 2. Sequential Logic

- Flip-flops (D, JK, T, SR)
- Registers
- Counters
- Memory elements

### 3. Timing Simulation

- Clock-driven simulation
- Propagation delays
- Setup/hold time violations

### 4. Truth Tables

- Auto-generate truth tables
- Export to CSV

### 5. Verilog Export

- Convert circuit to Verilog HDL
- VHDL support

### 6. Collaboration

- Real-time multi-user editing
- WebSocket synchronization
- Cloud storage

---

## Usage Guide

### Creating a Circuit:

1. **Drag gates** from sidebar to canvas
2. **Click output pins** to start wire
3. **Drag to input pin** and release
4. **Click INPUT/CLK gates** to toggle state
5. **Press Delete** to remove selected elements

### Keyboard Shortcuts:

- `Delete/Backspace`: Remove selected node or connection
- `Click`: Toggle INPUT/CLK state
- `Drag`: Move gates

### File Operations:

- **Save**: Creates `.json` file with circuit
- **Load**: Restores circuit from `.json` file

---

## Code Structure

```
app.js
├── LogicNode class          [Phase 1.1]
├── DirectedEdge class       [Phase 1.3]
├── Circuit class            [Phase 1.2, 2, 3, 4]
│   ├── addNode()
│   ├── connect()            [Task 1.3]
│   ├── calculateInDegrees() [Task 2.1]
│   ├── topologicalSort()    [Task 2.2]
│   ├── simulate()           [Task 2.3]
│   ├── subscribe()          [Task 3.2]
│   ├── notifyObservers()    [Task 3.3]
│   ├── serializeToJSON()    [Task 4.1]
│   └── deserializeFromJSON() [Task 4.1]
├── CircuitObserver class    [Task 3.1]
├── CanvasRenderer class     [Task 3.3]
└── Event Handlers
    ├── Drag & Drop
    ├── Mouse Interactions
    ├── Keyboard Shortcuts
    └── File I/O
```

---

## Conclusion

This logic simulator implements professional software engineering practices:

✅ **Proper data structures** (Graph with nodes and directed edges)  
✅ **Topological sort** (Kahn's algorithm for correct evaluation order)  
✅ **Observer pattern** (Decoupled, reactive UI)  
✅ **Serialization** (Save/load functionality)  
✅ **Extensible architecture** (Easy to add new gate types and components)  
✅ **Well-commented code** (Clear explanations of algorithms)

The architecture is production-ready and suitable for:

- Educational tools
- Digital design prototyping
- Logic circuit verification
- Component library development

---

**Built with modern JavaScript ES6+ features**  
**No external dependencies required**  
**Runs entirely in the browser**
