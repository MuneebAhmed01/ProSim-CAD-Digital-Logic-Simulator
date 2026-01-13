# Visual Architecture Diagrams

## 1. Class Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                         Circuit Manager                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ nodes: Map<id, LogicNode>                                 │  │
│  │ edges: Array<DirectedEdge>                                │  │
│  │ observers: Array<CircuitObserver>                         │  │
│  │ nextNodeId: number                                        │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │ + addNode(type, x, y): LogicNode                          │  │
│  │ + removeNode(node): void                                  │  │
│  │ + connect(sourceId, targetId, inputIndex): DirectedEdge   │  │
│  │ + removeEdge(edge): void                                  │  │
│  │ + calculateInDegrees(): Map<id, count>                    │  │
│  │ + topologicalSort(): Array<LogicNode>                     │  │
│  │ + simulate(): void                                        │  │
│  │ + subscribe(observer): void                               │  │
│  │ + notifyObservers(): void                                 │  │
│  │ + serializeToJSON(): string                               │  │
│  │ + deserializeFromJSON(json): void                         │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                    ↓ manages                ↓ manages
        ┌───────────────────────┐  ┌─────────────────────────┐
        │     LogicNode         │  │    DirectedEdge         │
        ├───────────────────────┤  ├─────────────────────────┤
        │ id: number            │  │ sourceNode: LogicNode   │
        │ type: string          │  │ sourcePin: number       │
        │ state: 0|1            │  │ targetNode: LogicNode   │
        │ incomingEdges: []     │  │ targetPin: number       │
        │ inputValues: []       │  ├─────────────────────────┤
        │ outputValue: 0|1      │  │ + draw(): void          │
        ├───────────────────────┤  │ + isPointNear(x,y):bool │
        │ + computeOutput()     │  └─────────────────────────┘
        │ + draw()              │
        │ + setupPins()         │
        │ + updatePinPositions()│
        └───────────────────────┘

                    ┌──────────────────────────┐
                    │  CircuitObserver (Base)  │
                    ├──────────────────────────┤
                    │ + update(circuit): void  │
                    └──────────────────────────┘
                                ↑
                                │ extends
                                │
                    ┌──────────────────────────┐
                    │    CanvasRenderer        │
                    ├──────────────────────────┤
                    │ canvas: HTMLCanvasElement│
                    │ ctx: CanvasContext       │
                    ├──────────────────────────┤
                    │ + update(circuit): void  │
                    └──────────────────────────┘
```

---

## 2. Data Flow - Simulation Pipeline

```
User Action
    │
    ▼
┌───────────────────────────────────────────────────────────────────┐
│ 1. EVENT TRIGGER                                                  │
│    • User toggles INPUT/CLK                                       │
│    • User creates/removes connection                              │
│    • User adds new gate                                           │
└───────────────────────────────────────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────────────────────────────────────┐
│ 2. CIRCUIT.SIMULATE() CALLED                                      │
│    • Reset all input values to 0                                  │
└───────────────────────────────────────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────────────────────────────────────┐
│ 3. TOPOLOGICAL SORT (Kahn's Algorithm)                            │
│    ┌─────────────────────────────────────────────────────────┐   │
│    │ a) Calculate in-degrees                                  │   │
│    │    For each node, count incoming edges                   │   │
│    │    Result: Map<nodeId, inDegreeCount>                    │   │
│    └─────────────────────────────────────────────────────────┘   │
│    ┌─────────────────────────────────────────────────────────┐   │
│    │ b) Find source nodes (in-degree = 0)                     │   │
│    │    INPUT, CLK gates have no inputs                       │   │
│    │    Add to queue: [INPUT1, INPUT2, CLK1]                  │   │
│    └─────────────────────────────────────────────────────────┘   │
│    ┌─────────────────────────────────────────────────────────┐   │
│    │ c) Process queue                                         │   │
│    │    While queue not empty:                                │   │
│    │      - Remove node from queue                            │   │
│    │      - Add to sorted list                                │   │
│    │      - For each outgoing edge:                           │   │
│    │        * Decrement target's in-degree                    │   │
│    │        * If target in-degree = 0, add to queue           │   │
│    └─────────────────────────────────────────────────────────┘   │
│    Result: [INPUT1, INPUT2, CLK1, AND1, OR1, NOT1, PROBE1]       │
└───────────────────────────────────────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────────────────────────────────────┐
│ 4. EVALUATE IN ORDER                                              │
│    For each node in sorted list:                                  │
│    ┌─────────────────────────────────────────────────────────┐   │
│    │ a) Propagate incoming values                             │   │
│    │    node.incomingEdges.forEach(edge => {                  │   │
│    │        node.inputValues[edge.targetPin] =                │   │
│    │            edge.sourceNode.outputValue                   │   │
│    │    })                                                     │   │
│    └─────────────────────────────────────────────────────────┘   │
│    ┌─────────────────────────────────────────────────────────┐   │
│    │ b) Compute output                                        │   │
│    │    node.computeOutput()                                  │   │
│    │    • INPUT/CLK: output = state                           │   │
│    │    • AND: output = input[0] && input[1]                  │   │
│    │    • OR: output = input[0] || input[1]                   │   │
│    │    • NOT: output = !input[0]                             │   │
│    │    • XOR: output = input[0] XOR input[1]                 │   │
│    └─────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────────────────────────────────────┐
│ 5. NOTIFY OBSERVERS (Observer Pattern)                            │
│    circuit.notifyObservers()                                      │
│    ┌─────────────────────────────────────────────────────────┐   │
│    │ For each observer:                                       │   │
│    │     observer.update(circuit)                             │   │
│    └─────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────────────────────────────────────┐
│ 6. UI UPDATE                                                      │
│    CanvasRenderer.update() triggered                              │
│    • Draw loop renders updated circuit state                     │
│    • Wires change color based on signal values                   │
│    • Gates show new output states                                │
└───────────────────────────────────────────────────────────────────┘
```

---

## 3. Example Circuit Evaluation

### Circuit Diagram:

```
        ┌─────┐
        │ IN1 │──┐
        │  1  │  │
        └─────┘  │    ┌─────┐      ┌─────┐      ┌──────┐
                 ├───→│ AND │─────→│ NOT │─────→│PROBE │
        ┌─────┐  │    │  1  │      │  0  │      │  0   │
        │ IN2 │──┘    └─────┘      └─────┘      └──────┘
        │  1  │
        └─────┘
```

### Step-by-Step Evaluation:

#### Step 1: Calculate In-Degrees

```
Node     | In-Degree | Reason
---------|-----------|------------------
IN1      | 0         | No inputs (source)
IN2      | 0         | No inputs (source)
AND      | 2         | 2 incoming edges
NOT      | 1         | 1 incoming edge
PROBE    | 1         | 1 incoming edge
```

#### Step 2: Topological Sort

```
Queue: [IN1, IN2]  (nodes with in-degree 0)
Sorted: []

Iteration 1:
  - Process IN1: output = 1
  - Decrement AND in-degree: 2 → 1
  - Queue: [IN2], Sorted: [IN1]

Iteration 2:
  - Process IN2: output = 1
  - Decrement AND in-degree: 1 → 0
  - Add AND to queue
  - Queue: [AND], Sorted: [IN1, IN2]

Iteration 3:
  - Process AND: inputs = [1, 1], output = 1 && 1 = 1
  - Decrement NOT in-degree: 1 → 0
  - Add NOT to queue
  - Queue: [NOT], Sorted: [IN1, IN2, AND]

Iteration 4:
  - Process NOT: input = [1], output = !1 = 0
  - Decrement PROBE in-degree: 1 → 0
  - Add PROBE to queue
  - Queue: [PROBE], Sorted: [IN1, IN2, AND, NOT]

Iteration 5:
  - Process PROBE: input = [0], display = 0
  - Queue: [], Sorted: [IN1, IN2, AND, NOT, PROBE]

Final Order: [IN1, IN2, AND, NOT, PROBE] ✓ Correct!
```

---

## 4. Observer Pattern Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                         Circuit (Subject)                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ observers: [                                               │  │
│  │     CanvasRenderer,                                        │  │
│  │     ConsoleLogger,    ← Multiple observers can subscribe  │  │
│  │     DataAnalyzer                                           │  │
│  │ ]                                                          │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  simulate() {                                                     │
│      // ... evaluation logic ...                                 │
│      this.notifyObservers(); ← Broadcast to all                  │
│  }                                                                │
└───────────────────────────────────────────────────────────────────┘
                              │
                              │ notifyObservers()
                              ▼
        ┌─────────────────────┴─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌────────────────┐    ┌──────────────┐
│CanvasRenderer │    │ ConsoleLogger  │    │DataAnalyzer  │
│   .update()   │    │   .update()    │    │  .update()   │
└───────┬───────┘    └────────┬───────┘    └──────┬───────┘
        │                     │                    │
        ▼                     ▼                    ▼
   Re-render UI       Log to console      Analyze signals
```

---

## 5. Serialization Process

### Save (Serialize):

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Live Circuit State                                       │
│    ┌──────────────────────────────────────────────────┐    │
│    │ nodes: Map {                                     │    │
│    │   0 => LogicNode { type: 'INPUT', x: 100, ... } │    │
│    │   1 => LogicNode { type: 'AND', x: 300, ... }   │    │
│    │ }                                                │    │
│    │ edges: [                                         │    │
│    │   DirectedEdge { sourceNode: 0, targetNode: 1 } │    │
│    │ ]                                                │    │
│    └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ serializeToJSON()
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Plain JavaScript Objects                                 │
│    {                                                         │
│      version: "2.0",                                         │
│      nodes: [                                                │
│        { id: 0, type: 'INPUT', x: 100, y: 150, state: 1 },  │
│        { id: 1, type: 'AND', x: 300, y: 150, state: 0 }     │
│      ],                                                      │
│      edges: [                                                │
│        { sourceId: 0, sourcePin: 0, targetId: 1, ... }      │
│      ]                                                       │
│    }                                                         │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ JSON.stringify()
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. JSON String (saved to file)                              │
│    "{                                                        │
│      \"version\": \"2.0\",                                   │
│      \"nodes\": [...],                                       │
│      \"edges\": [...]                                        │
│    }"                                                        │
└─────────────────────────────────────────────────────────────┘
```

### Load (Deserialize):

```
┌─────────────────────────────────────────────────────────────┐
│ 1. JSON String (from file)                                  │
│    "{ \"version\": \"2.0\", \"nodes\": [...], ... }"        │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ JSON.parse()
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Plain JavaScript Objects                                 │
│    { version: "2.0", nodes: [...], edges: [...] }           │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ deserializeFromJSON()
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Reconstruct Circuit                                      │
│    • Create LogicNode for each node data                    │
│    • Create DirectedEdge for each edge data                 │
│    • Restore all connections                                │
│    • Run simulate() to compute states                       │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Live Circuit State (fully restored)                      │
│    Ready to use!                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Composition Pattern (Future - Task 4.2)

### Building a Half Adder Component:

```
Step 1: Create Internal Circuit
┌─────────────────────────────────────────────────────────────┐
│                      Half Adder                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  A ──┐                                              │     │
│  │      ├──→ XOR ──→ Sum                              │     │
│  │  B ──┤                                              │     │
│  │      └──→ AND ──→ Carry                            │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘

Step 2: Collapse into Single Component
┌─────────────────┐
│  Half Adder     │
│  A ──┬──→ Sum   │  ← External interface
│  B ──┘──→ Carry │
└─────────────────┘

Step 3: Use as Building Block
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Half Adder 1   │  │  Half Adder 2   │  │  Half Adder 3   │
│  A ──┬──→ Sum   │  │  A ──┬──→ Sum   │  │  A ──┬──→ Sum   │
│  B ──┘──→ Carry │─→│  B ──┘──→ Carry │─→│  B ──┘──→ Carry │
└─────────────────┘  └─────────────────┘  └─────────────────┘
     4-Bit Ripple Carry Adder (built from Half Adders)

Benefits:
✓ Reusable components
✓ Hierarchical design
✓ Easier to understand
✓ Composition > Inheritance
```

---

## 7. Complete System Overview

```
┌────────────────────────────────────────────────────────────────┐
│                           USER                                  │
│  • Drags gates from sidebar                                    │
│  • Connects pins with wires                                    │
│  • Toggles INPUT/CLK states                                    │
│  • Saves/loads circuits                                        │
└────────────────────────────────────────────────────────────────┘
                            │ ▲
                   User     │ │ Visual
                   Actions  │ │ Feedback
                            ▼ │
┌────────────────────────────────────────────────────────────────┐
│                      USER INTERFACE LAYER                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Canvas Rendering (CanvasRenderer extends CircuitObserver)│  │
│  │  • Draws gates, wires, grid                              │  │
│  │  • Shows signal values (colors)                          │  │
│  │  • Handles mouse interactions                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                            │ ▲
                   Events   │ │ update()
                            │ │ notifications
                            ▼ │
┌────────────────────────────────────────────────────────────────┐
│                    CIRCUIT MANAGER LAYER                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Circuit Class                                            │  │
│  │  • Manages all nodes (Map<id, LogicNode>)                │  │
│  │  • Manages all edges (DirectedEdge[])                    │  │
│  │  • Orchestrates simulation                               │  │
│  │  • Notifies observers                                    │  │
│  │  • Handles serialization                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                            │
                            │ uses
                            ▼
┌────────────────────────────────────────────────────────────────┐
│                   SIMULATION ENGINE LAYER                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Topological Sort (Kahn's Algorithm)                      │  │
│  │  1. calculateInDegrees() → Map<nodeId, count>            │  │
│  │  2. topologicalSort() → [node1, node2, ...]             │  │
│  │  3. simulate() → Evaluate in correct order              │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                            │
                            │ operates on
                            ▼
┌────────────────────────────────────────────────────────────────┐
│                      DATA MODEL LAYER                           │
│  ┌──────────────────────┐       ┌─────────────────────────┐   │
│  │    LogicNode         │       │    DirectedEdge         │   │
│  │  • Stores state      │◄──────┤  • sourceNode           │   │
│  │  • Logic functions   │       │  • targetNode           │   │
│  │  • Input/output pins │       │  • Represents wires     │   │
│  └──────────────────────┘       └─────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
                            │
                            │ persisted as
                            ▼
┌────────────────────────────────────────────────────────────────┐
│                    PERSISTENCE LAYER                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ JSON Serialization                                       │  │
│  │  • serializeToJSON() → Save to file                      │  │
│  │  • deserializeFromJSON() → Load from file                │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

---

## Summary of Architecture Benefits

### ✅ Layered Architecture

- Clear separation of concerns
- Each layer has specific responsibility
- Easy to modify one layer without affecting others

### ✅ Design Patterns Applied

1. **Graph Pattern**: Nodes + Directed Edges = Circuit structure
2. **Observer Pattern**: Circuit → Observers (decoupled UI)
3. **Serialization Pattern**: Live objects ↔ JSON
4. **Composition Pattern**: Complex components from simple ones

### ✅ Algorithms Implemented

1. **Kahn's Algorithm**: Topological sort for evaluation order
2. **Breadth-First Search**: Queue-based graph traversal
3. **Cycle Detection**: Incomplete sort indicates cycles

### ✅ Professional Practices

- Comprehensive comments
- Clear naming conventions
- Modular code organization
- Testable components
- Extensible architecture

---

**All diagrams represent the actual implemented code!**
