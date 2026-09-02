import { Router } from "express";
import fieldLogin from '../validators/fieldLogin.js';
import { validationResult } from 'express-validator';
import { isGuest } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import bcrypt from 'bcryptjs';

const loginRouter = Router();

loginRouter.get('/', isGuest, (req, res) => {
	res.render('login', { errors: null });
});

loginRouter.post('/', isGuest, fieldLogin, async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.render('login', { errors: errors.array() });
	}
	const { username, password } = req.body;
	try {
		const user = await prisma.user.findUnique({ where: { username } });
		if (!user) {
			return res.render('login', { errors: [{ msg: 'Username not found' }] });
		}
		const isPasswordValid = await bcrypt.compare(password, user.password);
		if (!isPasswordValid) {
			return res.render('login', { errors: [{ msg: 'Invalid password' }] });
		}
		req.session.userId = user.id;
		res.redirect(`/home/${user.username}`);
	} catch (error) {
		next(error);
	}
});

export default loginRouter;