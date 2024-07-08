import { z } from 'zod';

export const userPayloadSchema = z.object({
	firstName: z.string().min(1),
	lastName: z.string().min(1),
	email: z.string().email('email must be a valid email address'),
	password: z.string(),
	phone: z.string(),
});

export const loginPayloadSchema = z.object({
  email: z.string().email('email must be a valid email address'),
  password: z.string().min(8),
});

export const createOrganisationPayloadSchema = z.object({
	name: z.string().min(1, "Name cannot be empty"),
	description: z.string().min(1, "Description cannot be empty"),
});