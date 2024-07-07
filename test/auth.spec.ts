import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import * as jwt from 'hono/jwt';
import type { Client } from 'pg';
import { createClient } from '../src/db/pg';

const user1Email = 'johndoe@email.com';
const user2Email = 'janedoe@email.com';
const user3Email = 'julietdoe@email.com';
let client: Client;

beforeAll(async () => {
	const [error, dbClient] = (await createClient(process.env)) as [Error, Client];
	if (error) {
		throw error;
	}
	client = dbClient;
	await client.query('DELETE FROM users WHERE email = $1', [user1Email]);
	await client.query('DELETE FROM users WHERE email = $1', [user2Email]);
	await client.query('DELETE FROM users WHERE email = $1', [user3Email]);
	await client.query('DELETE FROM organisations WHERE name = $1', ["John's Organisation"]);
	await client.query('DELETE FROM organisations WHERE name = $1', ["Jane's Organisation"]);
	await client.query('DELETE FROM organisations WHERE name = $1', ["Juliet's Organisation"]);
	await client.query('DELETE FROM organisations WHERE name = $1', ['Test Organisation']);
});

afterAll(async () => {
	await client.end();
});

describe('Auth Endpoints', () => {
	let user1AccessToken: string;
	let user2AccessToken: string;
	let user3AccessToken: string;
	let user1OrgId: string;
	let user2OrgId: string;
	let user3OrgId: string;

	describe('[POST] /auth/register', () => {
		it('should register user 1 successfully', async () => {
			const response = await fetch('http://localhost:8787/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					firstName: 'John',
					lastName: 'Doe',
					email: user1Email,
					password: 'C0mpl3xP@ssw0rd',
					phone: '1234567890',
				}),
			});

			const responseBody = (await response.json()) as {
				status: string;
				message: string;
				data: {
					user: {
						firstName: string;
						lastName: string;
						email: string;
					};
					accessToken: string;
				};
			};

			expect(response.status).toBe(201);
			expect(responseBody.status).not.toHaveProperty('errors');
			expect(responseBody).toMatchObject({
				status: 'success',
				message: 'Registration successful',
				data: {
					user: {
						firstName: 'John',
						lastName: 'Doe',
						email: user1Email,
					},
				},
			});

			user1AccessToken = responseBody.data.accessToken;
		});

		it('should register user 2 successfully', async () => {
			const response = await fetch('http://localhost:8787/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					firstName: 'Jane',
					lastName: 'Doe',
					email: user2Email,
					password: 'C0mpl3xP@ssw0rd',
					phone: '0987654321',
				}),
			});

			const responseBody = (await response.json()) as {
				status: string;
				message: string;
				data: {
					user: {
						firstName: string;
						lastName: string;
						email: string;
					};
					accessToken: string;
				};
			};

			expect(response.status).toBe(201);
			expect(responseBody.status).not.toHaveProperty('errors');
			expect(responseBody).toMatchObject({
				status: 'success',
				message: 'Registration successful',
				data: {
					user: {
						firstName: 'Jane',
						lastName: 'Doe',
						email: user2Email,
					},
				},
			});

			user2AccessToken = responseBody.data.accessToken;
		});

		it('should register user 3 successfully', async () => {
			const response = await fetch('http://localhost:8787/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					firstName: 'Juliet',
					lastName: 'Doe',
					email: user3Email,
					password: 'C0mpl3xP@ssw0rd',
					phone: '0987654321',
				}),
			});

			const responseBody = (await response.json()) as {
				status: string;
				message: string;
				data: {
					user: {
						firstName: string;
						lastName: string;
						email: string;
					};
					accessToken: string;
				};
			};

			expect(response.status).toBe(201);
			expect(responseBody.status).not.toHaveProperty('errors');
			expect(responseBody).toMatchObject({
				status: 'success',
				message: 'Registration successful',
				data: {
					user: {
						firstName: 'Juliet',
						lastName: 'Doe',
						email: user3Email,
					},
				},
			});

			user3AccessToken = responseBody.data.accessToken;
		});

		it('should verify token details and expiration for user 1', async () => {
			const currentTime = Math.floor(Date.now() / 1000);
			const { payload } = jwt.decode(user1AccessToken);
			expect(payload).toContainKeys(['userId', 'email', 'exp']);
			expect(payload.email).toEqual(user1Email);
			expect(payload.exp).toBeGreaterThan(currentTime);
		});

		it('should verify token details and expiration for user 2', async () => {
			const currentTime = Math.floor(Date.now() / 1000);
			const { payload } = jwt.decode(user2AccessToken);
			expect(payload).toContainKeys(['userId', 'email', 'exp']);
			expect(payload.email).toEqual(user2Email);
			expect(payload.exp).toBeGreaterThan(currentTime);
		});

		it('should verify token details and expiration for user 3', async () => {
			const currentTime = Math.floor(Date.now() / 1000);
			const { payload } = jwt.decode(user3AccessToken);
			expect(payload).toContainKeys(['userId', 'email', 'exp']);
			expect(payload.email).toEqual(user3Email);
			expect(payload.exp).toBeGreaterThan(currentTime);
		});
	});

	describe('[POST] /auth/login', () => {
		it('should log user 1 in successfully', async () => {
			const response = await fetch('http://localhost:8787/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: user1Email,
					password: 'C0mpl3xP@ssw0rd',
				}),
			});

			const responseBody = (await response.json()) as {
				status: string;
				message: string;
				data: {
					user: {
						firstName: string;
						lastName: string;
						email: string;
					};
					accessToken: string;
				};
			};
			expect(response.status).toBe(200);
			expect(responseBody).toMatchObject({
				status: 'success',
				message: 'Login successful',
				data: {
					user: {
						firstName: 'John',
						lastName: 'Doe',
						email: user1Email,
					},
				},
			});

			user1AccessToken = responseBody.data.accessToken;
		});

		it('should log user 2 in successfully', async () => {
			const response = await fetch('http://localhost:8787/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: user2Email,
					password: 'C0mpl3xP@ssw0rd',
				}),
			});

			const responseBody = (await response.json()) as {
				status: string;
				message: string;
				data: {
					user: {
						firstName: string;
						lastName: string;
						email: string;
					};
					accessToken: string;
				};
			};
			expect(response.status).toBe(200);
			expect(responseBody).toMatchObject({
				status: 'success',
				message: 'Login successful',
				data: {
					user: {
						firstName: 'Jane',
						lastName: 'Doe',
						email: user2Email,
					},
				},
			});

			user2AccessToken = responseBody.data.accessToken;
		});

		it('should log user 3 in successfully', async () => {
			const response = await fetch('http://localhost:8787/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: user3Email,
					password: 'C0mpl3xP@ssw0rd',
				}),
			});

			const responseBody = (await response.json()) as {
				status: string;
				message: string;
				data: {
					user: {
						firstName: string;
						lastName: string;
						email: string;
					};
					accessToken: string;
				};
			};
			expect(response.status).toBe(200);
			expect(responseBody).toMatchObject({
				status: 'success',
				message: 'Login successful',
				data: {
					user: {
						firstName: 'Juliet',
						lastName: 'Doe',
						email: user3Email,
					},
				},
			});

			user3AccessToken = responseBody.data.accessToken;
		});
	});

	describe('[POST] /api/organisations', () => {
		it('should create organisation for user 1 successfully', async () => {
			const response = await fetch('http://localhost:8787/api/organisations', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${user1AccessToken}`,
				},
				body: JSON.stringify({
					name: "John's Organisation",
					description: 'Default organisation for John Doe',
				}),
			});

			const responseBody = (await response.json()) as {
				status: string;
				message: string;
				data: {
					organisation: {
						orgId: string;
						name: string;
						description: string;
					};
				};
			};
			expect(response.status).toBe(201);
			expect(responseBody).toMatchObject({
				status: 'success',
				message: 'Organisation created successfully',
				data: {
					organisation: {
						name: "John's Organisation",
						description: 'Default organisation for John Doe',
					},
				},
			});
			user1OrgId = responseBody.data.organisation.orgId;
		});

		it('should create organisation for user 2 successfully', async () => {
			const response = await fetch('http://localhost:8787/api/organisations', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${user2AccessToken}`,
				},
				body: JSON.stringify({
					name: "Jane's Organisation",
					description: 'Default organisation for Jane Doe',
				}),
			});

			const responseBody = (await response.json()) as {
				status: string;
				message: string;
				data: {
					organisation: {
						orgId: string;
						name: string;
						description: string;
					};
				};
			};
			expect(response.status).toBe(201);
			expect(responseBody).toMatchObject({
				status: 'success',
				message: 'Organisation created successfully',
				data: {
					organisation: {
						name: "Jane's Organisation",
						description: 'Default organisation for Jane Doe',
					},
				},
			});
			user2OrgId = responseBody.data.organisation.orgId;
		});

		it('should create organisation for user 3 successfully', async () => {
			const response = await fetch('http://localhost:8787/api/organisations', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${user3AccessToken}`,
				},
				body: JSON.stringify({
					name: "Juliet's Organisation",
					description: 'Default organisation for Juliet Doe',
				}),
			});

			const responseBody = (await response.json()) as {
				status: string;
				message: string;
				data: {
					organisation: {
						orgId: string;
						name: string;
						description: string;
					};
				};
			};
			expect(response.status).toBe(201);
			expect(responseBody).toMatchObject({
				status: 'success',
				message: 'Organisation created successfully',
				data: {
					organisation: {
						name: "Juliet's Organisation",
						description: 'Default organisation for Juliet Doe',
					},
				},
			});
			user3OrgId = responseBody.data.organisation.orgId;
		});
	});

	describe('[GET] /api/organisations/:orgId', () => {
		it('should get organisation for user 1 successfully', async () => {
			const response = await fetch(`http://localhost:8787/api/organisations/${user1OrgId}`, {
				headers: {
					Authorization: `Bearer ${user1AccessToken}`,
				},
			});

			const responseBody = await response.json();
			expect(response.status).toBe(200);
			expect(responseBody).toMatchObject({
				status: 'success',
				data: {
					organisation: {
						orgId: user1OrgId,
						name: "John's Organisation",
						description: 'Default organisation for John Doe',
					},
				},
			});
		});

		it('should add user 3 to user 1’s organisation successfully', async () => {
			const user3Id = jwt.decode(user3AccessToken).payload.userId;
			const response = await fetch(`http://localhost:8787/api/organisations/${user1OrgId}/users`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${user1AccessToken}`,
				},
				body: JSON.stringify({
					userId: user3Id,
				}),
			});

			const responseBody = await response.json();
			expect(response.status).toBe(201);
			expect(responseBody).toMatchObject({
				status: 'success',
				message: 'User added to organisation successfully',
			});
		});

		it('should fail if user 1 tries to access user 2’s organisation', async () => {
			const response = await fetch(`http://localhost:8787/api/organisations/${user2OrgId}`, {
				headers: {
					Authorization: `Bearer ${user1AccessToken}`,
				},
			});

			const responseBody = await response.json();
			expect(response.status).toBe(403);
			expect(responseBody).toMatchObject({
				status: 'Bad request',
				message: 'User not part of organisation',
				statusCode: 403,
			});
		});

		it('should fail if user 2 tries to access user 1’s organisation', async () => {
			const response = await fetch(`http://localhost:8787/api/organisations/${user1OrgId}`, {
				headers: {
					Authorization: `Bearer ${user2AccessToken}`,
				},
			});

			const responseBody = await response.json();
			expect(response.status).toBe(403);
			expect(responseBody).toMatchObject({
				status: 'Bad request',
				message: 'User not part of organisation',
				statusCode: 403,
			});
		});
	});

	describe('[GET] /api/users/:id', () => {
		it('should get user 1 successfully', async () => {
			const user1Id = jwt.decode(user1AccessToken).payload.userId;
			const response = await fetch(`http://localhost:8787/api/users/${user1Id}`, {
				headers: {
					Authorization: `Bearer ${user1AccessToken}`,
				},
			});

			const responseBody = await response.json();
			expect(response.status).toBe(200);
			expect(responseBody).toMatchObject({
				status: 'success',
				data: {
					user: {
						firstName: 'John',
						lastName: 'Doe',
						email: user1Email,
					},
				},
			});
		});

		it('should get user 2 successfully', async () => {
			const user2Id = jwt.decode(user2AccessToken).payload.userId;
			const response = await fetch(`http://localhost:8787/api/users/${user2Id}`, {
				headers: {
					Authorization: `Bearer ${user2AccessToken}`,
				},
			});

			const responseBody = await response.json();
			expect(response.status).toBe(200);
			expect(responseBody).toMatchObject({
				status: 'success',
				data: {
					user: {
						firstName: 'Jane',
						lastName: 'Doe',
						email: user2Email,
					},
				},
			});
		});

		it('should get user 3 successfully', async () => {
			const user3Id = jwt.decode(user3AccessToken).payload.userId;
			const response = await fetch(`http://localhost:8787/api/users/${user3Id}`, {
				headers: {
					Authorization: `Bearer ${user3AccessToken}`,
				},
			});

			const responseBody = await response.json();
			expect(response.status).toBe(200);
			expect(responseBody).toMatchObject({
				status: 'success',
				data: {
					user: {
						firstName: 'Juliet',
						lastName: 'Doe',
						email: user3Email,
					},
				},
			});
		});

		it('should fail if user 1 tries to access user 2’s details because they are not in the same organization', async () => {
			const user2Id = jwt.decode(user2AccessToken).payload.userId;
			const response = await fetch(`http://localhost:8787/api/users/${user2Id}`, {
				headers: {
					Authorization: `Bearer ${user1AccessToken}`,
				},
			});

			const responseBody = await response.json();
			expect(response.status).toBe(404);
			expect(responseBody).toMatchObject({
				status: 'Bad request',
				message: 'User not found',
				statusCode: 404,
			});
		});

		it('should pass if user 1 tries to access user 3’s details because they are in the same organization', async () => {
			const user3Id = jwt.decode(user3AccessToken).payload.userId;
			const response = await fetch(`http://localhost:8787/api/users/${user3Id}`, {
				headers: {
					Authorization: `Bearer ${user1AccessToken}`,
				},
			});

			const responseBody = await response.json();
			expect(response.status).toBe(200);
			expect(responseBody).toMatchObject({
				status: 'success',
				data: {
					user: {
						firstName: 'Juliet',
						lastName: 'Doe',
						email: user3Email,
					},
				},
			});
		});
	});
});
