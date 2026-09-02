import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import { isGuest } from '../middleware/auth.js';
import { validationResult } from 'express-validator';
import { fieldSignup } from '../validators/fieldSignup.js';
import cloudinary from '../lib/cloudinary.js';

const signupRouter = Router();

signupRouter.get('/', isGuest, (req, res) => {
	res.render('signup', { user: req.user });
});

signupRouter.post('/', isGuest, fieldSignup, async (req, res, next) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).render('signup', { errors: errors.array(), user: req.user });
		}
		const { username, password, firstName, lastName } = req.body;
		const hashedPassword = await bcrypt.hash(password, 10);
		const user = await prisma.user.create({
			data: {
				username,
				password: hashedPassword,
				firstName,
				lastName,
			},
		});
		const homeUserFolder = user.id;
		await cloudinary.api.create_folder(`${homeUserFolder}/`);
		await prisma.folder.create({
			data: {
				name: `${homeUserFolder}/`,
				userId: user.id
			},
		});
		console.log('User created:', user);
		res.redirect('/login');
	} catch (error) {
		next(error);
	}
});

export default signupRouter;
