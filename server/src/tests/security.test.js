import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import prisma from '../shared/utils/db.js';
import app from '../index.js';

describe('Security Hardening Tests', () => {
    let authToken;
    let testUser;
    let testOrg;

    beforeAll(async () => {
        testOrg = await prisma.organization.create({
            data: {
                name: 'Security Test Org',
                subscriptionPlan: 'free'
            }
        });

        testUser = await prisma.user.create({
            data: {
                email: 'security.test@example.com',
                name: 'Security Test User',
                password: '$2b$10$abcdefghijklmnopqrstuv',
                role: 'Station Manager',
                organizationId: testOrg.id,
                isEmailVerified: true
            }
        });

        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'security.test@example.com',
                password: 'SecurePass123!'
            });

        authToken = response.body.accessToken;
    });

    afterAll(async () => {
        await prisma.user.delete({ where: { id: testUser.id } });
        await prisma.organization.delete({ where: { id: testOrg.id } });
        await prisma.$disconnect();
    });

    describe('Input Validation', () => {
        it('should reject invalid station data', async () => {
            const response = await request(app)
                .post('/api/stations')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: '',
                    riskCategory: 'InvalidCategory'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Validation failed');
        });

        it('should accept valid station data', async () => {
            const response = await request(app)
                .post('/api/stations')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Valid Station',
                    riskCategory: 'Low',
                    region: 'North'
                });

            expect(response.status).toBe(201);
            expect(response.body.name).toBe('Valid Station');
        });

        it('should validate audit schema', async () => {
            const response = await request(app)
                .post('/api/audits')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    stationId: 'invalid',
                    auditorId: 'invalid',
                    scheduledDate: 'not-a-date'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Validation failed');
        });
    });

    describe('SQL Injection Prevention', () => {
        it('should block SQL injection in query parameters', async () => {
            const response = await request(app)
                .get('/api/stations')
                .query({ region: "'; DROP TABLE stations; --" })
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('SQL injection');
        });

        it('should sanitize body inputs', async () => {
            const response = await request(app)
                .post('/api/stations')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: "Test'; DELETE FROM users; --",
                    riskCategory: 'Low'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('SQL injection');
        });
    });

    describe('CSRF Protection', () => {
        it('should provide CSRF token on GET requests', async () => {
            const response = await request(app)
                .get('/api/stations')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.headers['x-csrf-token']).toBeDefined();
        });

        it('should reject POST without CSRF token', async () => {
            const response = await request(app)
                .post('/api/stations')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Test Station',
                    riskCategory: 'Low'
                });

            expect(response.status).toBe(403);
            expect(response.body.error).toBe('CSRF token missing');
        });
    });

    describe('Rate Limiting', () => {
        it('should enforce IP-based rate limits', async () => {
            const requests = Array(10).fill().map(() =>
                request(app).get('/api/health')
            );

            const responses = await Promise.all(requests);
            const rateLimited = responses.some(r => r.status === 429);

            expect(rateLimited).toBe(true);
        });

        it('should provide rate limit headers', async () => {
            const response = await request(app)
                .get('/api/stations')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.headers['x-ratelimit-limit']).toBeDefined();
            expect(response.headers['x-ratelimit-remaining']).toBeDefined();
        });
    });

    describe('Request Sanitization', () => {
        it('should strip XSS attempts', async () => {
            const response = await request(app)
                .post('/api/stations')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: '<script>alert("xss")</script>Station',
                    riskCategory: 'Low'
                });

            if (response.status === 201) {
                expect(response.body.name).not.toContain('<script>');
            }
        });

        it('should escape dangerous characters', async () => {
            const response = await request(app)
                .post('/api/stations')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: '<img src=x onerror=alert(1)>',
                    riskCategory: 'Low'
                });

            if (response.status === 201) {
                expect(response.body.name).not.toContain('<img');
            }
        });
    });

    describe('Security Headers', () => {
        it('should include security headers', async () => {
            const response = await request(app).get('/api/health');

            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.headers['x-frame-options']).toBe('DENY');
            expect(response.headers['strict-transport-security']).toBeDefined();
        });

        it('should not expose server information', async () => {
            const response = await request(app).get('/api/health');

            expect(response.headers['x-powered-by']).toBeUndefined();
        });
    });

    describe('Audit Logging', () => {
        it('should log sensitive operations', async () => {
            await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                });

            const logs = await prisma.auditLog.findMany({
                where: {
                    action: 'Authentication attempt'
                },
                orderBy: { createdAt: 'desc' },
                take: 1
            });

            expect(logs.length).toBeGreaterThan(0);
            expect(logs[0].ipAddress).toBeDefined();
        });
    });

    describe('Authentication & Authorization', () => {
        it('should reject requests without auth token', async () => {
            const response = await request(app)
                .get('/api/stations');

            expect(response.status).toBe(401);
        });

        it('should reject expired tokens', async () => {
            const expiredToken = 'expired.jwt.token';
            const response = await request(app)
                .get('/api/stations')
                .set('Authorization', `Bearer ${expiredToken}`);

            expect(response.status).toBe(403);
        });

        it('should enforce RBAC permissions', async () => {
            const response = await request(app)
                .delete('/api/stations/some-id')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(403);
            expect(response.body.error).toBe('Access denied');
        });
    });
});
