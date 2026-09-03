import { body } from "express-validator";

export const fieldSignup = [
	body('firstName').trim().notEmpty().withMessage('First name is required').isLength({ min: 2 }).withMessage('First name must be at least 2 characters long'),
	body('lastName').trim().notEmpty().withMessage('Last name is required').isLength({ min: 2 }).withMessage('Last name must be at least 2 characters long'),
	body('username').trim().isAlphanumeric().withMessage('Username must be alphanumeric').isLength({ min: 1 }).withMessage('Username is required'),
	body('password').isLength({ min: 1 }).withMessage('Password is required').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
	body('confirmPassword').isLength({ min: 1 }).withMessage('Confirm password is required'),
];