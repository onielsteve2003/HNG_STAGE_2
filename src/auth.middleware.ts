import type { Context, Next } from 'hono';
import * as jwt from 'hono/jwt';
import type { AppEnv } from './server.js';

export async function authenticate(ctx: Context<AppEnv>, next: Next) {
	const authHeader = ctx.req.header('Authorization');
	if (!authHeader) {
		return ctx.json(
			{
				status: 'Bad Request',
				message: 'Client error',
				statusCode: 400,
			},
			400
		);
	}

	const token = authHeader.replace('Bearer ', '');

	try {
		const verified = await jwt.verify(token, ctx.env.JWT_SECRET as string);
		ctx.set('user', verified as { userId: string; email: string; exp: number });
		await next();
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
