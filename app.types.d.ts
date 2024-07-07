import type { Client } from "pg";

export type User = {
	userId: string; // must be unique
	firstName: string; // must not be null
	lastName: string; // must not be null
	email: string; // must be unique and must not be null
	password: string; // must not be null
	phone: string;
};

export type validationError = {
	errors: [
		{
			field: string;
			message: string;
		}
	];
};

export type Bindings = {} & Env

interface Variables {
  "pg-client": Client | null,
	user: {
		userId: string,
		email: string,
		exp: number,
	},
  [key: string]: unknown
}

declare namespace NodeJS {
	interface ProcessEnv {
		PORT: number,
		DATABASE_URL: string,
		JWT_SECRET: string,
		DB_NAME: string,
		DB_USERNAME: string,
		DB_HOST: string,
		DB_PORT: number,
		JWT_SECRET: string,
		DB_PASSWORD: string
	}
  }