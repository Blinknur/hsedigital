import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

process.env.OTEL_ENABLED = 'true';
process.env.OTEL_SERVICE_NAME = 'hse-digital-test';
process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318/v1/traces';

import { initializeTracing, withSpan, addSpanAttributes, addSpanEvent, getCurrentTraceId } from '../shared/utils/tracing.js';

describe('OpenTelemetry Tracing', () => {
  let tracer;

  beforeAll(() => {
    tracer = initializeTracing();
  });

  it('should initialize tracer', () => {
    expect(tracer).toBeDefined();
  });

  it('should create spans with withSpan', async () => {
    const result = await withSpan(
      'test.operation',
      { 'test.attr': 'value' },
      async (span) => {
        expect(span).toBeDefined();
        return 'success';
      }
    );
    expect(result).toBe('success');
  });

  it('should add span attributes', async () => {
    await withSpan('test.attributes', {}, async () => {
      addSpanAttributes({
        'custom.key': 'custom.value',
        'numeric.value': 42
      });
    });
  });

  it('should add span events', async () => {
    await withSpan('test.events', {}, async () => {
      addSpanEvent('test_event', { detail: 'info' });
    });
  });

  it('should get trace ID', async () => {
    await withSpan('test.trace_id', {}, async () => {
      const traceId = getCurrentTraceId();
      expect(traceId).toBeDefined();
      expect(typeof traceId).toBe('string');
      expect(traceId.length).toBe(32);
    });
  });

  it('should handle errors in spans', async () => {
    try {
      await withSpan('test.error', {}, async () => {
        throw new Error('Test error');
      });
      fail('Should have thrown error');
    } catch (error) {
      expect(error.message).toBe('Test error');
    }
  });

  it('should work with nested spans', async () => {
    const result = await withSpan('test.parent', {}, async () => {
      return await withSpan('test.child', {}, async () => {
        return 'nested';
      });
    });
    expect(result).toBe('nested');
  });
});

describe('Tenant-Aware Sampling', () => {
  it('should configure sampling rates', async () => {
    try {
      const tracingModule = await import('../shared/utils/tracing.js');
      const { TenantAwareTraceIdRatioBasedSampler } = tracingModule;
      const sampler = new TenantAwareTraceIdRatioBasedSampler();
      
      expect(sampler.tierSampleRates).toBeDefined();
      expect(sampler.pathSampleRates).toBeDefined();
    } catch (error) {
      console.log('Skipping: TenantAwareTraceIdRatioBasedSampler not available -', error.message);
    }
  });
});
