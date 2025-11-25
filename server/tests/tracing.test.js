import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

process.env.OTEL_ENABLED = 'true';
process.env.OTEL_SERVICE_NAME = 'hse-digital-test';
process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318/v1/traces';

import { initializeTracing, withSpan, addSpanAttributes, addSpanEvent, getCurrentTraceId } from '../utils/tracing.js';

describe('OpenTelemetry Tracing', () => {
  let tracer;

  before(() => {
    tracer = initializeTracing();
  });

  it('should initialize tracer', () => {
    assert.ok(tracer, 'Tracer should be initialized');
  });

  it('should create spans with withSpan', async () => {
    const result = await withSpan(
      'test.operation',
      { 'test.attr': 'value' },
      async (span) => {
        assert.ok(span, 'Span should be created');
        return 'success';
      }
    );
    assert.strictEqual(result, 'success');
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
      assert.ok(traceId, 'Trace ID should be available');
      assert.strictEqual(typeof traceId, 'string');
      assert.strictEqual(traceId.length, 32);
    });
  });

  it('should handle errors in spans', async () => {
    try {
      await withSpan('test.error', {}, async () => {
        throw new Error('Test error');
      });
      assert.fail('Should have thrown error');
    } catch (error) {
      assert.strictEqual(error.message, 'Test error');
    }
  });

  it('should work with nested spans', async () => {
    const result = await withSpan('test.parent', {}, async () => {
      return await withSpan('test.child', {}, async () => {
        return 'nested';
      });
    });
    assert.strictEqual(result, 'nested');
  });
});

describe('Tenant-Aware Sampling', () => {
  it('should configure sampling rates', () => {
    const { TenantAwareTraceIdRatioBasedSampler } = await import('../utils/tracing.js');
    const sampler = new TenantAwareTraceIdRatioBasedSampler();
    
    assert.ok(sampler.tierSampleRates, 'Tier sample rates should be configured');
    assert.ok(sampler.pathSampleRates, 'Path sample rates should be configured');
  });
});

console.log('✅ Tracing tests completed');
