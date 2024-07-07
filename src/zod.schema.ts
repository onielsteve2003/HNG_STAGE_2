import { z } from 'zod';

export const userPayloadSchema = z.object({
	firstName: z.string().min(1),
	lastName: z.string().min(1),
	email: z.string().email('email must be a valid email address'),
	password: z
		.string()
		.min(8)
		.regex(
			// regex for At least one number, one lowercase and one uppercase letter, one special character and at least 8 characters
			/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*\W)(?!.* ).{8,}$/,
			'password must contain at least one number, one lowercase and one uppercase letter, one special character and at least 8 characters'
		),
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