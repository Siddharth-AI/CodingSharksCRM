import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '@/lib/supabase';
import { 
  AdminUser, 
  CreateAdminUserRequest, 
  UpdateAdminUserRequest,
  JWTPayload,
  PasswordHashResult,
  TokenValidationResult 
} from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const SALT_ROUNDS = 12;

export class AuthModel {
  /**
   * Hash a password with bcrypt
   */
  static async hashPassword(password: string): Promise<PasswordHashResult> {
    try {
      const salt = await bcrypt.genSalt(SALT_ROUNDS);
      const hash = await bcrypt.hash(password, salt);
      
      return { hash, salt };
    } catch (error) {
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify a password against a hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      throw new Error('Failed to verify password');
    }
  }

  /**
   * Generate JWT token for authenticated user
   */
  static generateToken(user: AdminUser): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      iat: Math.floor(Date.now() / 1000)
      // Remove exp from payload - let jwt.sign() handle it with expiresIn option
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
  }

  /**
   * Verify and decode JWT token
   */
  static verifyToken(token: string): TokenValidationResult {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
      return { isValid: true, payload };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return { isValid: false, error: 'Token expired' };
      } else if (error instanceof jwt.JsonWebTokenError) {
        return { isValid: false, error: 'Invalid token' };
      } else {
        return { isValid: false, error: 'Token verification failed' };
      }
    }
  }

  /**
   * Create a new admin user
   */
  static async createAdminUser(userData: CreateAdminUserRequest): Promise<AdminUser> {
    try {
      // Hash the password
      const { hash } = await this.hashPassword(userData.password);

      // Insert user into database
      const { data, error } = await supabase
        .from('admin_users')
        .insert({
          email: userData.email,
          name: userData.name,
          password_hash: hash,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create admin user: ${error.message}`);
      }

      return this.mapDatabaseUserToAdminUser(data);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find admin user by email
   */
  static async findByEmail(email: string): Promise<AdminUser | null> {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return null;
      }

      return this.mapDatabaseUserToAdminUser(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * Find admin user by ID
   */
  static async findById(id: string): Promise<AdminUser | null> {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return null;
      }

      return this.mapDatabaseUserToAdminUser(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * Authenticate user with email and password
   */
  static async authenticate(email: string, password: string): Promise<AdminUser | null> {
    try {
      // Get user with password hash
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return null;
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(password, data.password_hash);
      if (!isValidPassword) {
        return null;
      }

      // Update last login timestamp
      await supabase
        .from('admin_users')
        .update({ 
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id);

      return this.mapDatabaseUserToAdminUser(data);
    } catch (error) {
      throw new Error('Authentication failed');
    }
  }

  /**
   * Update admin user
   */
  static async updateAdminUser(id: string, updates: UpdateAdminUserRequest): Promise<AdminUser> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Hash new password if provided
      if (updates.password) {
        const { hash } = await this.hashPassword(updates.password);
        updateData.password_hash = hash;
      }

      // Add other fields
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.email !== undefined) updateData.email = updates.email;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

      const { data, error } = await supabase
        .from('admin_users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update admin user: ${error.message}`);
      }

      return this.mapDatabaseUserToAdminUser(data);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Deactivate admin user (soft delete)
   */
  static async deactivateAdminUser(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to deactivate admin user: ${error.message}`);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Map database user record to AdminUser interface
   */
  private static mapDatabaseUserToAdminUser(data: any): AdminUser {
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      isActive: data.is_active,
      lastLoginAt: data.last_login_at ? new Date(data.last_login_at) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate secure random password
   */
  static generateSecurePassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
  }
}