export class LogicNode {
    
    
    constructor(type, x, y, id) {
        //id,type of gate,width,height of gates,br of gate 
        this.id = id; 
        this.type = type; 
        this.x = x;
        this.y = y; 
        this.width = 80;  
        this.height = 50; 
        this.borderRadius = 8; 
       //state setup to 0 and same for edge+ output val initially
        this.state = 0;
        this.incomingEdges = [];
        this.outputValue = 0;
        // to calculate LogicNode/logic_func
        this.inputs = this.getInputCount();
        this.outputs = this.getOutputCount();
        this.inputValues = new Array(this.inputs).fill(0);
        
        // Visual pin representations for UI
        this.inputPins = [];
        this.outputPins = [];
        this.setupPins();
    }
//input counter
    getInputCount() {
        if (this.type === 'INPUT' || this.type === 'CLK') return 0; 
        if (this.type === 'OFF') return 1; 
        if (this.type === 'NOT') return 1; 
        return 2; 
    }
  //output of all node is 1
    getOutputCount() {
        if (this.type === 'OFF') return 0; // Probe has no output (sink node)
        return 1; // All gates have 1 output
    }
// setup pins
    setupPins() {
        this.inputPins = [];
        this.outputPins = [];
        if (this.type === 'OFF') {
            this.inputPins.push({
                x: this.x,
                y: this.y + this.height / 2,
                active: false
            });
            return;
        }  
        if (this.type === 'INPUT' || this.type === 'CLK') {
            this.outputPins.push({
                x: this.x + this.width,
                y: this.y + this.height / 2,
                active: false
            });
            return;
        }
        const pinSpacing = this.height / (this.inputs + 1);
        for (let i = 0; i < this.inputs; i++) {
            this.inputPins.push({
                x: this.x,
                y: this.y + pinSpacing * (i + 1),
                active: false
            });
        }
        this.outputPins.push({
            x: this.x + this.width,
            y: this.y + this.height / 2,
            active: false
        });
    }

    
    //  Update pin positions after node is moved
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
            this.outputValue = this.state;
        } else if (this.type === 'OFF') {  
            this.outputValue = 0;
        } else if (this.type === 'NOT') {
            this.outputValue = this.inputValues[0] ? 0 : 1;
        } else if (this.type === 'AND') {
            
            this.outputValue = this.inputValues[0] && this.inputValues[1] ? 1 : 0;
        } else if (this.type === 'OR') {
            
            this.outputValue = this.inputValues[0] || this.inputValues[1] ? 1 : 0;
        } else if (this.type === 'XOR') {
            this.outputValue = this.inputValues[0] !== this.inputValues[1] ? 1 : 0;
        }
        // Update state visuals
        this.updatePinStates();
    }
   // Update state visuals
    updatePinStates() {
        this.inputPins.forEach((pin, i) => {
            pin.active = this.inputValues[i] === 1;
        });
        this.outputPins.forEach((pin) => {
            pin.active = this.outputValue === 1;
        });
    }
//showing node on canvas
    draw(ctx, isSelected = false, circuit = null) {
        
        //highlight to del/select for del
        if (isSelected) {
            ctx.strokeStyle = '#00bfff';
            ctx.lineWidth = 3;
            this.roundRect(ctx, this.x - 5, this.y - 5, this.width + 10, this.height + 10, this.borderRadius + 2);
            ctx.stroke();
        }
        
       //node body+ its color
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
        this.roundRect(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (this.type === 'INPUT') {
            ctx.font = 'bold 26px Arial';
            ctx.fillText(this.state ? '1' : '0', this.x + this.width / 2, this.y + this.height / 2);
        } else if (this.type === 'CLK') {
            ctx.fillText('CLK', this.x + this.width / 2, this.y + this.height / 2);
        } else if (this.type === 'OFF') {
            ctx.font = 'bold 16px Arial'; 
            ctx.fillText(this.inputValues[0] ? 'ON' : 'OFF', this.x + this.width / 2, this.y + this.height / 2);
        } else {
            ctx.fillText(this.type, this.x + this.width / 2, this.y + this.height / 2);
        }
        this.inputPins.forEach((pin, i) => {
            ctx.beginPath();
            ctx.arc(pin.x, pin.y, 5, 0, Math.PI * 2); 
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
            ctx.arc(pin.x, pin.y, 5, 0, Math.PI * 2);
            
            const isConnected = circuit ? circuit.hasOutgoingEdge(this) : false;
            
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

    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
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