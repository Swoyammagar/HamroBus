export type AdminUser = {
	id: string;
	email: string;
	fullname?: string;
	phone?: string | null;
};

export type ApiResponse = {
	success: boolean;
	message?: string;
};

export type LoginResponse = {
	admin?: { id: string; email: string; fullname?: string; phone?: string | null };
	success?: boolean;
	message?: string;
	accessToken?: string;
};
