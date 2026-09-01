import { Router } from "express";
import fieldLogin from '../validators/fieldLogin.js';
import { validationResult } from 'express-validator';
import { isGuest } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import bcrypt from 'bcryptjs';

const loginRouter = Router();

loginRouter.get('/', isGuest, (req, res) => {
	res.render('login', { errors: null, user: req.user });
});

loginRouter.post('/', isGuest, fieldLogin, async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.render('login', { errors: errors.array(), user: req.user });
	}
	const { username, password } = req.body;
	try {
		const user = await prisma.user.findUnique({ where: { username } });
		if (!user) {
			return res.render('login', { errors: [{ msg: 'Username not found' }], user: req.user });
		}
		const isPasswordValid = await bcrypt.compare(password, user.password);
		if (!isPasswordValid) {
			return res.render('login', { errors: [{ msg: 'Invalid password' }], user: req.user });
		}
		req.session.user = user;
		res.redirect('/');
	} catch (error) {
		next(error);
	}
});

export default loginRouter;