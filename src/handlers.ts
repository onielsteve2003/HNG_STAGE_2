import bcrypt from 'bcryptjs';
import type { Context } from 'hono';
import * as jwt from 'hono/jwt';
import { v4 as uuidv4 } from 'uuid';
import type { User } from '../app.types.js';
import type { AppEnv } from './server.js';
import { createOrganisationPayloadSchema, loginPayloadSchema, userPayloadSchema } from './zod.schema.js';

export async function handleRegistration(ctx: Context<AppEnv>) {
	try {
		const pgClient = ctx.get('pg-client')!;
		const userPayload = (await ctx.req.json()) as User;
		const { error, data, success } = userPayloadSchema.safeParse(userPayload);

		if (!success) {
			return ctx.json({ errors: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })) }, 422);
		}

		const { firstName, lastName, email, password, phone } = data;

		// Check for existing user
		const dbUserCheckRes = await pgClient.query('SELECT * FROM users WHERE email = $1', [email]);
		if (dbUserCheckRes.rows.length > 0) {
			return ctx.json(
				{
					errors: [{ field: 'email', message: 'Email already in use' }],
				},
				422
			);
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(password, 10);

		// Create user and default organisation
		const userId = uuidv4();
		const orgId = uuidv4();

		await Promise.all([
			pgClient.query('INSERT INTO users (userId, firstName, lastName, email, password, phone) VALUES ($1, $2, $3, $4, $5, $6)', [
				userId,
				firstName,
				lastName,
				email,
				hashedPassword,
				phone,
			]),
			pgClient.query('INSERT INTO organisations (orgId, name, description) VALUES ($1, $2, $3)', [
				orgId,
				`${firstName}'s Organisation`,
				`Default organisation for ${firstName} ${lastName}`,
			]),
			pgClient.query('INSERT INTO user_organisations (userId, orgId) VALUES ($1, $2)', [userId, orgId]),
		]);

		// Create JWT token
		const token = await jwt.sign({ userId, email, exp: Math.floor(Date.now() / 1000) + 60 * 5, /* 5 minutes */ }, ctx.env.JWT_SECRET as string);

		return ctx.json(
			{
				status: 'success',
				message: 'Registration successful',
				data: {
					accessToken: token,
					user: {
						userId,
						firstName,
						lastName,
						email,
						phone,
					},
				},
			},
			201
		);
	} catch (error) {
		console.error(error);
		return ctx.json(
			{
				status: 'error',
				message: 'An error occurred',
				error: (error as Error).message,
			},
			422
		);
	}
}

export async function handleLogin(ctx: Context<AppEnv>) {
	try {
		const pgClient = ctx.get('pg-client')!;
		const loginPayload = (await ctx.req.json()) as { email: string; password: string };
		const { error, data, success } = loginPayloadSchema.safeParse(loginPayload);

		if (!success) {
			return ctx.json({ errors: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })) }, 422);
		}

		const { email, password } = data;

		// Check for existing user
		const dbUserCheckRes = await pgClient.query('SELECT * FROM users WHERE email = $1', [email]);
		if (dbUserCheckRes.rows.length === 0) {
			return ctx.json(
				{
					status: 'Bad request',
					message: 'Authentication failed',
					statusCode: 401,
				},
				401
			);
		}

		const user = dbUserCheckRes.rows[0];
		// Check password
		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			return ctx.json(
				{
					status: 'Bad request',
					message: 'Authentication failed',
					statusCode: 401,
				},
				401
			);
		}

		// Create JWT token
		const token = await jwt.sign({ userId: user.userid, email, exp: Math.floor(60 * 60 * 60 * 24) * 1000 }, ctx.env.JWT_SECRET as string);

		return ctx.json({
			status: 'success',
			message: 'Login successful',
			data: {
				accessToken: token,
				user: {
					userId: user.userid,
					firstName: user.firstname,
					lastName: user.lastname,
					email: user.email,
					phone: user.phone,
				},
			},
		});
	} catch (error) {
		console.error(error);
		return ctx.json(
			{
				status: 'error',
				message: 'An error occurred',
				error: (error as Error).message,
			},
			422
		);
	}
}

export async function handleGetSingleUser(ctx: Context<AppEnv, '/api/users/:id'>) {
	try {
		const pgClient = ctx.get('pg-client')!;
		const userId = ctx.req.param('id');
		const verifiedUser = ctx.get("user")!;
		if (userId === verifiedUser.userId) {
			const dbUserCheckRes = await pgClient.query('SELECT * FROM users WHERE userId = $1', [userId]);
			if (dbUserCheckRes.rows.length === 0) {
				return ctx.json(
					{
						status: 'Bad request',
						message: 'User not found',
						statusCode: 404,
					},
					404
				);
			}
			const user = dbUserCheckRes.rows[0];
			return ctx.json({
				status: 'success',
				message: 'User found',
				data: {
					user: {
						userId: user.userid,
						firstName: user.firstname,
						lastName: user.lastname,
						email: user.email,
						phone: user.phone,
					},
				},
			});
		}

		// Check if user is in the same organisation as verifiedUser
		const dbUserOrgRes = await pgClient.query('SELECT * FROM user_organisations WHERE userId = $1', [userId]);
		const dbVerifiedUserOrgRes = await pgClient.query('SELECT * FROM user_organisations WHERE userId = $1', [verifiedUser.userId]);
		const userOrgs = dbUserOrgRes.rows.map((row) => row.orgid);
		const verifiedUserOrgs = dbVerifiedUserOrgRes.rows.map((row) => row.orgid);
		const commonOrgs = userOrgs.filter((org) => verifiedUserOrgs.includes(org));
		if (commonOrgs.length === 0) {
			return ctx.json(
				{
					status: 'Bad request',
					message: 'User not found',
					statusCode: 404,
				},
				404
			);
		}

		const dbUserCheckRes = await pgClient.query('SELECT * FROM users WHERE userId = $1', [userId]);

		if (dbUserCheckRes.rows.length === 0) {
			return ctx.json(
				{
					status: 'Bad request',
					message: 'User not found',
					statusCode: 404,
				},
				404
			);
		}
		const user = dbUserCheckRes.rows[0];
		return ctx.json({
			status: 'success',
			message: 'User found',
			data: {
				user: {
					userId: user.userid,
					firstName: user.firstname,
					lastName: user.lastname,
					email: user.email,
					phone: user.phone,
				},
			},
		});
	} catch (error) {
		console.error(error);
		return ctx.json(
			{
				status: 'error',
				message: 'An error occurred',
				error: (error as Error).message,
			},
			422
		);
	}
}

export async function handleGetAllOrganisations(ctx: Context<AppEnv, '/api/organisations'>) {
	try {
		const pgClient = ctx.get('pg-client')!;
		const verifiedUser = ctx.get("user")!;
		// get all the organisations the user is part of
		const dbOrgsRes = await pgClient.query('SELECT * FROM organisations WHERE orgid IN (SELECT orgid FROM user_organisations WHERE userid = $1)', [
			verifiedUser.userId,
		]);
		return ctx.json({
			status: 'success',
			message: 'Organisations found',
			data: {
				organisations: dbOrgsRes.rows.map((org) => ({
					orgId: org.orgid,
					name: org.name,
					description: org.description,
				})),
			},
		});
	} catch (error) {
		console.error(error);
		return ctx.json(
			{
				status: 'error',
				message: 'An error occurred',
				error: (error as Error).message,
			},
			422
		);
	}
}

export async function handleGetSingleOrganisation(ctx: Context<AppEnv, '/api/organisatons/:orgId'>) {
	try {
		const pgClient = ctx.get('pg-client')!;
		const orgId = ctx.req.param('orgId');
		const verifiedUser = ctx.get('user')!;

		// Check for existing organisation and make sure users can't access other organisations they are not part of
		const dbOrgRes = await pgClient.query('SELECT * FROM organisations WHERE orgid = $1', [orgId]);
		if (dbOrgRes.rows.length === 0) {
			return ctx.json(
				{
					status: 'Bad request',
					message: 'Organisation not found',
					statusCode: 404,
				},
				404
			);
		}
		const dbUserOrgRes = await pgClient.query('SELECT * FROM user_organisations WHERE userId = $1 AND orgId = $2', [verifiedUser.userId, orgId]);
		if (dbUserOrgRes.rows.length === 0) {
			return ctx.json(
				{
					status: 'Bad request',
					message: 'User not part of organisation',
					statusCode: 403,
				},
				403
			);
		}

		const org = dbOrgRes.rows[0];

		return ctx.json({
			status: 'success',
			message: 'Organisation found',
			data: {
				organisation: {
					orgId: org.orgid,
					name: org.name,
					description: org.description,
				},
			},
		});
	} catch (error) {
		console.error(error);
		return ctx.json(
			{
				status: 'error',
				message: 'An error occurred',
				error: (error as Error).message,
			},
			422
		);
	}
}

export async function handleCreateOrganisation(ctx: Context<AppEnv, '/api/organisations'>) {
	try {
		const pgClient = ctx.get('pg-client')!;
		const userId = ctx.get('user')!.userId;
		const orgPayload = (await ctx.req.json()) as { name: string; description: string };
		const { data, success } = createOrganisationPayloadSchema.safeParse(orgPayload);

		if (!success) {
			return ctx.json(
				{
					status: 'Bad Request',
					message: 'Client error',
					statusCode: 400,
				},
				400
			);
		}

		const { name, description } = data;

		const orgId = uuidv4();
		await Promise.all([
			pgClient.query('INSERT INTO organisations (orgid, name, description) VALUES ($1, $2, $3)', [orgId, name, description]),
			pgClient.query('INSERT INTO user_organisations (userId, orgId) VALUES ($1, $2)', [userId, orgId]),
		]);

		return ctx.json(
			{
				status: 'success',
				message: 'Organisation created successfully',
				data: {
					organisation: {
						orgId,
						name,
						description,
					},
				},
			},
			201
		);
	} catch (error) {
		console.error(error);
		return ctx.json(
			{
				status: 'Bad Request',
				message: 'Client error',
				statusCode: 400,
			},
			400
		);
	}
}

export async function handleAddUserToOrganisation(ctx: Context<AppEnv, '/api/organisations/:orgId/users'>) {
	try {
		const pgClient = ctx.get('pg-client')!;
		const orgId = ctx.req.param('orgId');
		const { userId: userToAddId } = (await ctx.req.json()) as { userId: string };

		const dbOrgRes = await pgClient.query('SELECT * FROM organisations WHERE orgid = $1', [orgId]);
		if (dbOrgRes.rows.length === 0) {
			return ctx.json(
				{
					status: 'Bad Request',
					message: 'Client error',
					statusCode: 400,
				},
				400
			);
		}
		const dbUserRes = await pgClient.query('SELECT * FROM users WHERE userId = $1', [userToAddId]);
		if (dbUserRes.rows.length === 0) {
			return ctx.json(
				{
					status: 'Bad Request',
					message: 'Client error',
					statusCode: 400,
				},
				400
			);
		}
		await pgClient.query('INSERT INTO user_organisations (userId, orgId) VALUES ($1, $2)', [userToAddId, orgId]);

		return ctx.json(
			{
				status: 'success',
				message: 'User added to organisation successfully',
			},
			201
		);
	} catch (error) {
		console.error(error);
		return ctx.json(
			{
				status: 'Bad Request',
				message: 'Client error',
				statusCode: 400,
			},
			400
		);
	}
}

// a little extra bonus handler
export async function handleGetAllUsersInAOrganisation(ctx: Context<AppEnv, '/api/organisations/:orgId/users'>) {
	try {
		const pgClient = ctx.get('pg-client')!;
		const orgId = ctx.req.param('orgId');
		const dbOrgRes = await pgClient.query('SELECT * FROM organisations WHERE orgid = $1', [orgId]);
		if (dbOrgRes.rows.length === 0) {
			return ctx.json(
				{
					status: 'Bad Request',
					message: 'Client error',
					statusCode: 400,
				},
				400
			);
		}
		const dbUsersRes = await pgClient.query(
			'SELECT * FROM users WHERE userId IN (SELECT userId FROM user_organisations WHERE orgId = $1)',
			[orgId]
		);
		return ctx.json({
			status: 'success',
			message: 'Users found',
			data: {
				users: dbUsersRes.rows.map((user) => ({
					userId: user.userid,
					firstName: user.firstname,
					lastName: user.lastname,
					email: user.email,
					phone: user.phone,
				})),
			},
		});
	} catch (error) {
		console.error(error);
		return ctx.json(
			{
				status: 'Bad Request',
				message: 'Client error',
				statusCode: 400,
			},
			400
		);
	}
}
