import os from 'os';
import { performance } from 'perf_hooks';

export class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: [],
      latencies: [],
      errors: [],
      throughput: [],
      resources: []
    };
    this.startTime = null;
    this.endTime = null;
    this.monitoringInterval = null;
  }

  start() {
    this.startTime = Date.now();
    this.startResourceMonitoring();
  }

  stop() {
    this.endTime = Date.now();
    this.stopResourceMonitoring();
  }

  recordRequest(duration, statusCode, endpoint) {
    this.metrics.requests.push({
      timestamp: Date.now(),
      duration,
      statusCode,
      endpoint,
      success: statusCode >= 200 && statusCode < 300
    });
    this.metrics.latencies.push(duration);
  }

  recordError(error, endpoint) {
    this.metrics.errors.push({
      timestamp: Date.now(),
      error: error.message || error,
      endpoint
    });
  }

  startResourceMonitoring() {
    this.monitoringInterval = setInterval(() => {
      const cpuUsage = process.cpuUsage();
      const memUsage = process.memoryUsage();
      
      this.metrics.resources.push({
        timestamp: Date.now(),
        cpu: {
          user: cpuUsage.user / 1000000,
          system: cpuUsage.system / 1000000
        },
        memory: {
          rss: memUsage.rss / 1024 / 1024,
          heapUsed: memUsage.heapUsed / 1024 / 1024,
          heapTotal: memUsage.heapTotal / 1024 / 1024,
          external: memUsage.external / 1024 / 1024
        },
        system: {
          freeMem: os.freemem() / 1024 / 1024,
          totalMem: os.totalmem() / 1024 / 1024,
          loadAvg: os.loadavg()
        }
      });
    }, 1000);
  }

  stopResourceMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }

  calculatePercentile(arr, percentile) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  getStatistics() {
    const duration = (this.endTime - this.startTime) / 1000;
    const successfulRequests = this.metrics.requests.filter(r => r.success).length;
    const totalRequests = this.metrics.requests.length;
    const errorRate = totalRequests > 0 ? (totalRequests - successfulRequests) / totalRequests : 0;
    
    const latencies = this.metrics.latencies;
    const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    
    const throughput = totalRequests / duration;
    
    const resources = this.metrics.resources;
    const avgMemory = resources.length > 0
      ? resources.reduce((sum, r) => sum + r.memory.heapUsed, 0) / resources.length
      : 0;
    
    const peakMemory = resources.length > 0
      ? Math.max(...resources.map(r => r.memory.heapUsed))
      : 0;

    return {
      duration,
      requests: {
        total: totalRequests,
        successful: successfulRequests,
        failed: totalRequests - successfulRequests,
        errorRate: (errorRate * 100).toFixed(2) + '%'
      },
      latency: {
        min: Math.min(...latencies) || 0,
        max: Math.max(...latencies) || 0,
        mean: avgLatency,
        p50: this.calculatePercentile(latencies, 50),
        p75: this.calculatePercentile(latencies, 75),
        p90: this.calculatePercentile(latencies, 90),
        p95: this.calculatePercentile(latencies, 95),
        p99: this.calculatePercentile(latencies, 99)
      },
      throughput: {
        requestsPerSecond: throughput,
        requestsPerMinute: throughput * 60
      },
      resources: {
        memory: {
          average: avgMemory,
          peak: peakMemory,
          unit: 'MB'
        },
        cpu: {
          samples: resources.length
        }
      },
      errors: this.metrics.errors
    };
  }

  getDetailedReport() {
    const stats = this.getStatistics();
    
    const endpointStats = {};
    this.metrics.requests.forEach(req => {
      if (!endpointStats[req.endpoint]) {
        endpointStats[req.endpoint] = {
          count: 0,
          success: 0,
          failed: 0,
          latencies: []
        };
      }
      endpointStats[req.endpoint].count++;
      if (req.success) {
        endpointStats[req.endpoint].success++;
      } else {
        endpointStats[req.endpoint].failed++;
      }
      endpointStats[req.endpoint].latencies.push(req.duration);
    });

    Object.keys(endpointStats).forEach(endpoint => {
      const latencies = endpointStats[endpoint].latencies;
      const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      endpointStats[endpoint].avgLatency = avg;
      endpointStats[endpoint].p95 = this.calculatePercentile(latencies, 95);
      delete endpointStats[endpoint].latencies;
    });

    return {
      summary: stats,
      byEndpoint: endpointStats,
      resourceTimeline: this.metrics.resources
    };
  }

  reset() {
    this.metrics = {
      requests: [],
      latencies: [],
      errors: [],
      throughput: [],
      resources: []
    };
    this.startTime = null;
    this.endTime = null;
  }
}
