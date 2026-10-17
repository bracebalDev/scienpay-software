import { z } from 'zod';
import { UserRole } from '../enums/roles.enum.js';
import { SECURITY } from '../constants/security.constants.js';

export const loginSchema = z.object({
  email: z.string().trim().email('El correo electrónico no es válido').toLowerCase(),
  password: z
    .string()
    .min(SECURITY.MIN_PASSWORD_LENGTH, `La contraseña debe contener al menos ${SECURITY.MIN_PASSWORD_LENGTH} caracteres`)
    .max(SECURITY.MAX_PASSWORD_LENGTH, 'La contraseña excede la longitud máxima permitida'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const createUserSchema = z.object({
  email: z.string().trim().email('El correo electrónico no es válido').toLowerCase(),
  fullName: z.string().trim().min(3, 'El nombre completo debe tener al menos 3 caracteres').max(100),
  role: z.nativeEnum(UserRole, { errorMap: () => ({ message: 'Rol de usuario inválido' }) }),
  password: z
    .string()
    .min(SECURITY.MIN_PASSWORD_LENGTH, `La contraseña debe contener al menos ${SECURITY.MIN_PASSWORD_LENGTH} caracteres`)
    .max(SECURITY.MAX_PASSWORD_LENGTH),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
