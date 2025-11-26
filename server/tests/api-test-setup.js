import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const prisma = new PrismaClient();

export { request, API_BASE_URL, prisma };
