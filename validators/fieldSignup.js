import { body } from "express-validator";

export const fieldSignup = [
	body('firstName').trim().isAlpha().withMessage('First name must be alphabetic').isLength({ min: 1 }).withMessage('First name is required'),
	body('lastName').trim().isAlpha().withMessage('Last name must be alphabetic').isLength({ min: 1 }).withMessage('Last name is required'),
	body('username').trim().isAlphanumeric().withMessage('Username must be alphanumeric').isLength({ min: 1 }).withMessage('Username is required'),
	body('password').isLength({ min: 1 }).withMessage('Password is required').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
	body('confirmPassword').isLength({ min: 1 }).withMessage('Confirm password is required'),
];