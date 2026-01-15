//wire/connector/edge
export class DirectedEdge {
    constructor(sourceNode, sourcePin, targetNode, targetPin) {
        this.sourceNode = sourceNode; 
        this.sourcePin = sourcePin; 
        this.targetNode = targetNode; 
        this.targetPin = targetPin;   
    }

    draw(ctx, selectedConnection) {
        const c = ctx || (typeof window !== 'undefined' ? window.ctx : null);
        if (!c) return;

        const from = this.sourceNode.outputPins[this.sourcePin];
        const to = this.targetNode.inputPins[this.targetPin];

        const color = this.sourceNode.outputValue ? '#4caf50' : '#f44336';
        this.drawSmartLine(c, from.x, from.y, to.x, to.y, color, selectedConnection);

        if (selectedConnection === this) {
            c.strokeStyle = '#00bfff';
            c.lineWidth = 5;
            this.drawSmartLine(c, from.x, from.y, to.x, to.y, '#00bfff', selectedConnection);
        }
    }

    drawSmartLine(ctx, x1, y1, x2, y2, color, selectedConnection) {
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