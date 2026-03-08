/** 
 * RTOS.js - Real-Time Task Scheduler Simulation
 * Simulates a priority-based deterministic scheduler.
 */

class Task {
  constructor(name, priority, period, deadline, callback) {
    this.name = name;
    this.priority = priority; // 0 = highest, 10 = lowest
    this.period = period;      // ms between executions
    this.deadline = deadline;  // ms max allowed execution time
    this.callback = callback;
    this.lastExecution = 0;
    this.jitter = 0;
    this.lastLatency = 0;
    this.misses = 0;
  }
}

class RTOSScheduler {
  constructor() {
    this.tasks = [];
    this.isRunning = false;
    this.metrics = {
      totalExecutions: 0,
      totalMisses: 0,
      avgLatency: 0
    };
  }

  addTask(task) {
    this.tasks.push(task);
    this.tasks.sort((a, b) => a.priority - b.priority);
  }

  async runTask(task) {
    const startTime = performance.now();

    // Simulate real-time jitter based on system load (random factor)
    const drift = startTime - (task.lastExecution + task.period);
    if (task.lastExecution !== 0) {
      task.jitter = Math.abs(drift);
    }

    try {
      await task.callback();
      const endTime = performance.now();
      task.lastLatency = endTime - startTime;

      if (task.lastLatency > task.deadline) {
        task.misses++;
        this.metrics.totalMisses++;
        // console.warn(`[RTOS] Deadline missed for task: ${task.name}`);
      }

      task.lastExecution = startTime;
      this.metrics.totalExecutions++;

    } catch (error) {
      console.error(`[RTOS] Task ${task.name} failed:`, error);
    }
  }

  start() {
    this.isRunning = true;
    this.loop();
  }

  async loop() {
    if (!this.isRunning) return;

    const now = performance.now();

    for (const task of this.tasks) {
      if (now - task.lastExecution >= task.period) {
        await this.runTask(task);
        // Break early if we're simulating a single-core priority scheduler
        // In a real RTOS, higher priority tasks preempt lower ones.
        // We'll process them in priority order.
      }
    }

    // Small delay to simulate system tick
    setTimeout(() => this.loop(), 10);
  }

  stop() {
    this.isRunning = false;
  }

  getMetrics() {
    return this.tasks.map(t => ({
      name: t.name,
      priority: t.priority,
      latency: t.lastLatency.toFixed(2),
      jitter: t.jitter.toFixed(2),
      misses: t.misses
    }));
  }
}

// Global Scheduler instance
const RTOS = new RTOSScheduler();

// Export for other modules if using modules, but here we use global scope
window.RTOS = RTOS;
window.RTOS_Task = Task;
