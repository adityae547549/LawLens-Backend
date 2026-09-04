/**
 * LawLens — Background Job Queue
 * Manages long-running tasks: imports, sync, benchmarks, indexing
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const JOBS_FILE = path.join(__dirname, '..', 'data', 'jobs.json');

class JobQueue {
  constructor() {
    this._jobs = this._load();
    this._listeners = new Map();
  }

  _load() {
    try {
      if (fs.existsSync(JOBS_FILE)) {
        return JSON.parse(fs.readFileSync(JOBS_FILE, 'utf-8'));
      }
    } catch {}
    return [];
  }

  _save() {
    const trimmed = this._jobs.slice(-500); // Keep last 500 jobs
    fs.writeFileSync(JOBS_FILE, JSON.stringify(trimmed, null, 2));
  }

  /**
   * Create a new job
   */
  create({ type, name, description, metadata = {}, priority = 0 }) {
    const job = {
      id: uuidv4(),
      type, // import, sync, benchmark, index, rebuild, heal
      name: name || type,
      description: description || '',
      status: 'queued', // queued, running, completed, failed, cancelled
      progress: 0,
      result: null,
      error: null,
      metadata,
      priority,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      logs: []
    };

    this._jobs.unshift(job);
    this._save();
    this._emit('created', job);
    return job;
  }

  /**
   * Start a job
   */
  start(jobId) {
    const job = this._jobs.find(j => j.id === jobId);
    if (!job) return null;
    job.status = 'running';
    job.startedAt = new Date().toISOString();
    job.logs.push({ timestamp: new Date().toISOString(), message: 'Job started' });
    this._save();
    this._emit('started', job);
    return job;
  }

  /**
   * Update job progress
   */
  progress(jobId, percent, message) {
    const job = this._jobs.find(j => j.id === jobId);
    if (!job) return null;
    job.progress = Math.min(100, Math.max(0, percent));
    if (message) {
      job.logs.push({ timestamp: new Date().toISOString(), message });
    }
    this._save();
    this._emit('progress', job);
    return job;
  }

  /**
   * Complete a job
   */
  complete(jobId, result = null) {
    const job = this._jobs.find(j => j.id === jobId);
    if (!job) return null;
    job.status = 'completed';
    job.progress = 100;
    job.result = result;
    job.completedAt = new Date().toISOString();
    job.logs.push({ timestamp: new Date().toISOString(), message: 'Job completed' });
    this._save();
    this._emit('completed', job);
    return job;
  }

  /**
   * Fail a job
   */
  fail(jobId, error) {
    const job = this._jobs.find(j => j.id === jobId);
    if (!job) return null;
    job.status = 'failed';
    job.error = error;
    job.completedAt = new Date().toISOString();
    job.logs.push({ timestamp: new Date().toISOString(), message: `Failed: ${error}` });
    this._save();
    this._emit('failed', job);
    return job;
  }

  /**
   * Cancel a job
   */
  cancel(jobId) {
    const job = this._jobs.find(j => j.id === jobId);
    if (!job) return null;
    if (job.status === 'completed' || job.status === 'failed') return job;
    job.status = 'cancelled';
    job.completedAt = new Date().toISOString();
    job.logs.push({ timestamp: new Date().toISOString(), message: 'Job cancelled' });
    this._save();
    this._emit('cancelled', job);
    return job;
  }

  /**
   * Retry a failed job
   */
  retry(jobId) {
    const job = this._jobs.find(j => j.id === jobId);
    if (!job || job.status !== 'failed') return null;
    job.status = 'queued';
    job.progress = 0;
    job.error = null;
    job.startedAt = null;
    job.completedAt = null;
    job.logs.push({ timestamp: new Date().toISOString(), message: 'Job queued for retry' });
    this._save();
    this._emit('retry', job);
    return job;
  }

  /**
   * Get job by ID
   */
  get(jobId) {
    return this._jobs.find(j => j.id === jobId) || null;
  }

  /**
   * Get jobs with filters
   */
  query({ type, status, limit = 50, offset = 0 } = {}) {
    let filtered = [...this._jobs];
    if (type) filtered = filtered.filter(j => j.type === type);
    if (status) filtered = filtered.filter(j => j.status === status);

    const total = filtered.length;
    const items = filtered.slice(offset, offset + limit);

    return { items, total, limit, offset };
  }

  /**
   * Get stats
   */
  getStats() {
    const counts = { queued: 0, running: 0, completed: 0, failed: 0, cancelled: 0 };
    this._jobs.forEach(j => { counts[j.status] = (counts[j.status] || 0) + 1; });
    return {
      total: this._jobs.length,
      ...counts,
      active: counts.queued + counts.running,
      recent: this._jobs.slice(0, 10)
    };
  }

  /**
   * Event system
   */
  on(event, fn) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push(fn);
  }

  _emit(event, data) {
    (this._listeners.get(event) || []).forEach(fn => {
      try { fn(data); } catch {}
    });
  }

  /**
   * Run a job with async function
   */
  async run(jobId, fn) {
    const job = this.start(jobId);
    if (!job) return null;

    try {
      const result = await fn(job, (progress, msg) => this.progress(jobId, progress, msg));
      return this.complete(jobId, result);
    } catch (err) {
      return this.fail(jobId, err.message || String(err));
    }
  }
}

module.exports = new JobQueue();
