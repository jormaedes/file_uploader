import { body } from "express-validator";

const fieldLogin = [
	body('username')
		.trim()
		.notEmpty()
		.withMessage('O campo username é obrigatório'),
	body('password')
		.trim()
		.notEmpty()
		.withMessage('O campo password é obrigatório')
];

export default fieldLogin;