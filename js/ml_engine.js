/**
 * ml_engine.js - Simulated ML Slot Detection
 * Uses a mock YOLO-based detection model.
 */

class MLEngine {
    constructor(slotCount, availableCount = slotCount) {
        this.slotCount = slotCount;
        const slotsPerRow = 10;
        this.slots = Array.from({ length: slotCount }, (_, i) => {
            const rowChar = String.fromCharCode(65 + Math.floor(i / slotsPerRow));
            const colNum = (i % slotsPerRow) + 1;
            return {
                id: i + 1,
                label: `${rowChar}${colNum}`,
                status: 'available',
                confidence: 0.98 + (Math.random() * 0.02),
                lastUpdate: Date.now()
            };
        });

        // Map DB available vs total slots randomly
        let occupiedToAssign = slotCount - availableCount;
        let indices = Array.from({length: slotCount}, (_, i) => i).sort(() => Math.random() - 0.5);
        for(let i=0; i < occupiedToAssign; i++) {
            this.slots[indices[i]].status = 'occupied';
        }

        // Performance Metrics
        this.metrics = {
            accuracy: 0.965,
            precision: 0.95,
            recall: 0.97,
            inferenceTime: 120, // ms
            processedFrames: 0
        };
    }

    detectSlots() {
        this.metrics.processedFrames++;

        this.slots.forEach(slot => {
            // Small chance of state change (simulated cars coming/going)
            const changeProb = Math.random();

            // Don't change "booked" slots - these are controlled by booking logic
            if (slot.status !== 'booked') {
                if (slot.status === 'available' && changeProb < 0.02) {
                    slot.status = 'occupied';
                    slot.lastUpdate = Date.now();
                } else if (slot.status === 'occupied' && changeProb < 0.05) {
                    slot.status = 'available';
                    slot.lastUpdate = Date.now();
                }
            }

            // Confidence variations based on "lighting/resolution" simulation
            slot.confidence = 0.95 + (Math.random() * 0.05);
        });

        return this.slots;
    }

    getMetrics() {
        return {
            accuracy: (this.metrics.accuracy * 100).toFixed(1) + '%',
            precision: (this.metrics.precision * 100).toFixed(1) + '%',
            recall: (this.metrics.recall * 100).toFixed(1) + '%',
            inferenceTime: this.metrics.inferenceTime + (Math.random() * 10).toFixed(1) + 'ms',
            processedFrames: this.metrics.processedFrames
        };
    }
}

// Global ML instance
const ML = new MLEngine(40);
window.ML = ML;
window.MLEngine = MLEngine;
