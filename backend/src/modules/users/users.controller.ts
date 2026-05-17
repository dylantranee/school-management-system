import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../../config/db';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../middlewares/errorHandler';

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, role } = req.body;

  // Scenario 2: Duplicate Email Prevention
  const existingUser = await prisma.users.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new ApiError(409, 'A user with this email already exists.');
  }

  // Scenario 1: Hash password and insert
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const newUser = await prisma.users.create({
    data: {
      id: crypto.randomUUID(),
      email,
      password_hash: passwordHash,
      role
    }
  });

  // Return the newly created user (excluding password)
  const { password_hash, ...userWithoutPassword } = newUser;

  res.status(201).json({
    message: 'User created successfully',
    user: userWithoutPassword
  });
});
