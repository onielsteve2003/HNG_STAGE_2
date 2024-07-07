import pg from 'pg';
import dotenv from 'dotenv'
import type { User } from '../../app.types';

dotenv.config();

async function createClient(env: NodeJS.ProcessEnv) {
	try {
		console.log(env)
		const client = new pg.Client({
			user: env.DB_USERNAME,
			password: env.DB_PASSWORD,
			host: env.DB_HOST,
			port: env.DB_PORT! as unknown as number,
			database: env.DB_NAME,
		});

		await client.connect();

		return [null, client];
	} catch (error) {
		return [error as Error, null];
	}
}

function addUser(client: pg.Client, user: User) {
	return client.query(`INSERT INTO users (userId, firstName, lastName, email, password, phone) VALUES ($1, $2, $3, $4, $5)`, [
		user.firstName,
		user.lastName,
		user.email,
		user.password,
		user.phone,
	]);
}

export { addUser, createClient };
