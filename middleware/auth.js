import { prisma } from '../lib/prisma.js';

export async function isGuest(req, res, next) {
	if (!req.session.userId) {
		return next();
	}
	const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
	return res.redirect(`/homeUser/${user.username}`);
}

export function isAuthenticated(req, res, next) {
	if (req.session.userId) {
		return next();
	}
	return res.redirect('/login');
}

export const ensureAuthenticated = isAuthenticated;
export const ensureGuest = isGuest;
