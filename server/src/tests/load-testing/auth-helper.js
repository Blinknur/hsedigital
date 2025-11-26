import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';

export class AuthHelper {
  constructor() {
    this.tokens = new Map();
  }

  generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId
    };
    
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
  }

  getAuthHeaders(user) {
    let token = this.tokens.get(user.id);
    
    if (!token) {
      token = this.generateToken(user);
      this.tokens.set(user.id, token);
    }
    
    return {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': user.organizationId,
      'Content-Type': 'application/json'
    };
  }

  clearTokens() {
    this.tokens.clear();
  }
}
