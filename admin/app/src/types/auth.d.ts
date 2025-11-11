export type AdminUser = {
	id: string;
	email: string;
	fullname?: string;
};

export type ApiResponse = {
	success: boolean;
	message?: string;
};

export type LoginResponse = {
	admin?: { id: string; email: string };
	token?: string;
	refreshToken?: string;
	message?: string;
};
