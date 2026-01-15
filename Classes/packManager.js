import { Circuit,CircuitObserver, CanvasRenderer } from "./circuit.js";

export class PackManager {
    constructor(circuit) {
        this.circuit = circuit;
        this.packs = this.loadPacksFromStorage();
        this.updatePacksList();
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

        // Confirm if current circuit exists
        if (this.circuit.nodes.size > 0) {
            const confirmLoad = window.confirm(`Loading this pack will replace the current circuit. Continue?`);
            if (!confirmLoad) return;
        }

        try {
            this.circuit.deserializeFromJSON(pack.data);
            console.log(`Pack "${packName}" loaded successfully!`);
        } catch (error) {
            alert('Error loading pack: ' + error.message);
            console.error('Pack load error:', error);
        }
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
        })}
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