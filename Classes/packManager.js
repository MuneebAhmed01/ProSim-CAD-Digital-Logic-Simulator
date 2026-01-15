export class PackManager {
    constructor(circuit) {
        this.circuit = circuit;
        this.packs = this.loadPacksFromStorage();
        this.dropPoint = null;
        this.updatePacksList();
    }

    setDropPoint(point) {
        this.dropPoint = point;
    }
    loadPacksFromStorage() {
        const stored = localStorage.getItem('circuitPacks');
        return stored ? JSON.parse(stored) : [];
    }
   //save pack to local storage
    savePacksToStorage() {
        localStorage.setItem('circuitPacks', JSON.stringify(this.packs));
    }
// save current circuit as pack
    saveCircuitAsPack() {
        // Check if there are any nodes in the circuit
        if (this.circuit.nodes.size === 0) {
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
        const circuitData = this.circuit.serializeToJSON();
        // Create pack object
        const pack = {
            name: packName,
            data: circuitData,
            timestamp: new Date().toISOString(),
            nodeCount: this.circuit.nodes.size,
            edgeCount: this.circuit.edges.length
        };
        // Add to packs array
        this.packs.push(pack);
        // Save to localStorage
        this.savePacksToStorage();
        // Update UI
        this.updatePacksList();
        
        alert(`Pack "${packName}" saved successfully!`);
    }

    
     //Load a pack into the current circuit
     
 loadPack(packName) {
    const pack = this.packs.find(p => p.name === packName);
    if (!pack) {
        alert('Pack not found!');
        return;
    }

    let data;
    try {
        data = JSON.parse(pack.data);
    } catch (error) {
        alert('Error loading pack: Invalid data');
        console.error('Pack load error:', error);
        return;
    }

    const nodes = data.nodes || [];
    const edges = data.edges || [];
    if (nodes.length === 0) {
        alert('Pack is empty.');
        return;
    }

    // --- calculate pack bounds ---
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    nodes.forEach(n => {
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + 80);
        maxY = Math.max(maxY, n.y + 50);
    });

    const packW = maxX - minX;
    const packH = maxY - minY;

    // --- real canvas center (sidebar safe) ---
    const SIDEBAR = 80;
    const center = {
        x: (window.innerWidth - SIDEBAR) / 2 + SIDEBAR,
        y: window.innerHeight / 2
    };

    // --- stacking ---
    if (!this.stackIndex) this.stackIndex = 0;
    const stackOffset = this.stackIndex * 30;

    // --- final offset ---
    const offsetX = center.x - packW / 2 - minX;
    const offsetY = center.y - packH / 2 - minY + stackOffset;

    const idMap = new Map();
    nodes.forEach(n => {
        const newNode = this.circuit.addNode(n.type, n.x + offsetX, n.y + offsetY);
        newNode.state = n.state || 0;
        newNode.zIndex = Date.now();   // top focus
        idMap.set(n.id, newNode.id);
    });

    edges.forEach(e => {
        const s = idMap.get(e.sourceId);
        const t = idMap.get(e.targetId);
        if (s != null && t != null) {
            this.circuit.connect(s, t, e.targetPin);
        }
    });

    this.stackIndex++;
    console.log(`Pack "${packName}" added to canvas.`);
}

// Delete a pack
    deletePack(packName) {
        const confirmDelete = confirm(`Are you sure you want to delete pack "${packName}"?`);
        if (!confirmDelete) return;
        this.packs = this.packs.filter(p => p.name !== packName);
        this.savePacksToStorage();
        this.updatePacksList();
    }
    //Update the packs list in the sidebar
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

    saveSelectionAsPack(selectedNodes) {
        const selectedIds = new Set([...selectedNodes].map(n => n.id));
        if (selectedIds.size === 0) {
            alert('No component selected!');
            return;
        }

        let packName = prompt('Enter a name for this pack (leave empty for auto-naming):');
        if (!packName || packName.trim() === '') {
            let packNumber = 1;
            while (this.packs.some(p => p.name === `Pack ${packNumber}`)) {
                packNumber++;
            }
            packName = `Pack ${packNumber}`;
        } else {
            packName = packName.trim();
        }

        if (this.packs.some(p => p.name === packName)) {
            const overwrite = confirm(`A pack named "${packName}" already exists. Overwrite?`);
            if (!overwrite) return;
            this.packs = this.packs.filter(p => p.name !== packName);
        }

        const nodesData = [];
        selectedIds.forEach(id => {
            const node = this.circuit.nodes.get(id);
            if (node) {
                nodesData.push({
                    id: node.id,
                    type: node.type,
                    x: node.x,
                    y: node.y,
                    state: node.state
                });
            }
        });

        const edgesData = this.circuit.edges
            .filter(edge => selectedIds.has(edge.sourceNode.id) && selectedIds.has(edge.targetNode.id))
            .map(edge => ({
                sourceId: edge.sourceNode.id,
                sourcePin: edge.sourcePin,
                targetId: edge.targetNode.id,
                targetPin: edge.targetPin
            }));

        const maxId = nodesData.reduce((m, n) => Math.max(m, n.id), -1);
        const circuitData = JSON.stringify({
            version: "2.0",
            timestamp: new Date().toISOString(),
            nextNodeId: maxId + 1,
            nodes: nodesData,
            edges: edgesData
        }, null, 2);

        const pack = {
            name: packName,
            data: circuitData,
            timestamp: new Date().toISOString(),
            nodeCount: nodesData.length,
            edgeCount: edgesData.length
        };

        this.packs.push(pack);
        this.savePacksToStorage();
        this.updatePacksList();

        alert(`Pack "${packName}" saved successfully!`);
    }
}