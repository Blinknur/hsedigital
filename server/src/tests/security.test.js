import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';

jest.setTimeout(60000);

let app, prisma;
let authToken;
let testUser;
let testOrg;
let createdStations = [];
let testEnvironmentActive = true;

describe('Security Hardening Tests', () => {
    beforeAll(async () => {
        try {
            const dbModule = await import('../shared/utils/db.js');
            prisma = dbModule.default;
            
            const appModule = await import('../index.js');
            app = appModule.default;

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
        } catch (error) {
            console.error('Setup error:', error);
            throw error;
        }
    });

    afterAll(async () => {
        if (!testEnvironmentActive) {
            return;
        }

        testEnvironmentActive = false;

        const cleanupPromises = [];

        try {
            if (prisma && typeof prisma.$disconnect === 'function') {
                if (createdStations.length > 0) {
                    cleanupPromises.push(
                        prisma.station.deleteMany({
                            where: {
                                id: { in: createdStations }
                            }
                        }).catch(() => {})
                    );
                }

                if (testUser && testUser.id) {
                    cleanupPromises.push(
                        prisma.auditLog.deleteMany({
                            where: { userId: testUser.id }
                        }).catch(() => {})
                    );

                    cleanupPromises.push(
                        prisma.user.delete({ 
                            where: { id: testUser.id } 
                        }).catch(() => {})
                    );
                }

                if (testOrg && testOrg.id) {
                    cleanupPromises.push(
                        prisma.organization.delete({ 
                            where: { id: testOrg.id } 
                        }).catch(() => {})
                    );
                }

                await Promise.all(cleanupPromises);
                await prisma.$disconnect();
            }
        } catch (error) {
            console.error('Cleanup error (non-fatal):', error.message);
        }
    });

    describe('Input Validation', () => {
        it('should reject invalid station data', async () => {
            if (!testEnvironmentActive || !app) return;

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
            if (!testEnvironmentActive || !app) return;

            const response = await request(app)
                .post('/api/stations')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Valid Station',
                    riskCategory: 'Low',
                    region: 'North'
                });

            if (response.status === 201 && response.body.id) {
                createdStations.push(response.body.id);
            }

            expect(response.status).toBe(201);
            expect(response.body.name).toBe('Valid Station');
        });

        it('should validate audit schema', async () => {
            if (!testEnvironmentActive || !app) return;

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
            if (!testEnvironmentActive || !app) return;

            const response = await request(app)
                .get('/api/stations')
                .query({ region: "'; DROP TABLE stations; --" })
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('SQL injection');
        });

        it('should sanitize body inputs', async () => {
            if (!testEnvironmentActive || !app) return;

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
            if (!testEnvironmentActive || !app) return;

            const response = await request(app)
                .get('/api/stations')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.headers['x-csrf-token']).toBeDefined();
        });

        it('should reject POST without CSRF token', async () => {
            if (!testEnvironmentActive || !app) return;

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
            if (!testEnvironmentActive || !app) return;

            const requests = Array(10).fill().map(() =>
                request(app).get('/api/health')
            );

            const responses = await Promise.all(requests);
            const rateLimited = responses.some(r => r.status === 429);

            expect(rateLimited).toBe(true);
        });

        it('should provide rate limit headers', async () => {
            if (!testEnvironmentActive || !app) return;

            const response = await request(app)
                .get('/api/stations')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.headers['x-ratelimit-limit']).toBeDefined();
            expect(response.headers['x-ratelimit-remaining']).toBeDefined();
        });
    });

    describe('Request Sanitization', () => {
        it('should strip XSS attempts', async () => {
            if (!testEnvironmentActive || !app) return;

            const response = await request(app)
                .post('/api/stations')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: '<script>alert("xss")</script>Station',
                    riskCategory: 'Low'
                });

            if (response.status === 201) {
                if (response.body.id) {
                    createdStations.push(response.body.id);
                }
                expect(response.body.name).not.toContain('<script>');
            }
        });

        it('should escape dangerous characters', async () => {
            if (!testEnvironmentActive || !app) return;

            const response = await request(app)
                .post('/api/stations')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: '<img src=x onerror=alert(1)>',
                    riskCategory: 'Low'
                });

            if (response.status === 201) {
                if (response.body.id) {
                    createdStations.push(response.body.id);
                }
                expect(response.body.name).not.toContain('<img');
            }
        });
    });

    describe('Security Headers', () => {
        it('should include security headers', async () => {
            if (!testEnvironmentActive || !app) return;

            const response = await request(app).get('/api/health');

            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.headers['x-frame-options']).toBe('DENY');
            expect(response.headers['strict-transport-security']).toBeDefined();
        });

        it('should not expose server information', async () => {
            if (!testEnvironmentActive || !app) return;

            const response = await request(app).get('/api/health');

            expect(response.headers['x-powered-by']).toBeUndefined();
        });
    });

    describe('Audit Logging', () => {
        it('should log sensitive operations', async () => {
            if (!testEnvironmentActive || !app || !prisma) return;

            await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                });

            if (prisma && typeof prisma.auditLog !== 'undefined') {
                const logs = await prisma.auditLog.findMany({
                    where: {
                        action: 'Authentication attempt'
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                });

                expect(logs.length).toBeGreaterThan(0);
                expect(logs[0].ipAddress).toBeDefined();
            }
        });
    });

    describe('Authentication & Authorization', () => {
        it('should reject requests without auth token', async () => {
            if (!testEnvironmentActive || !app) return;

            const response = await request(app)
                .get('/api/stations');

            expect(response.status).toBe(401);
        });

        it('should reject expired tokens', async () => {
            if (!testEnvironmentActive || !app) return;

            const expiredToken = 'expired.jwt.token';
            const response = await request(app)
                .get('/api/stations')
                .set('Authorization', `Bearer ${expiredToken}`);

            expect(response.status).toBe(403);
        });

        it('should enforce RBAC permissions', async () => {
            if (!testEnvironmentActive || !app) return;

            const response = await request(app)
                .delete('/api/stations/some-id')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(403);
            expect(response.body.error).toBe('Access denied');
        });
    });
});
