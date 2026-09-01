export function isGuest(req, res, next) {
	if (req.isAuthenticated && req.isAuthenticated()) {
		return res.redirect('/');
	}
	next();
}

export function isAuth(req, res, next) {
	if (req.isAuthenticated && req.isAuthenticated()) {
		return next();
	}

	if (req.originalUrl.startsWith('/api') || req.headers.accept?.includes('application/json')) {
		return res.status(401).json({ error: 'Utilizador não autenticado. Faça login primeiro.' });
	}

	res.redirect('/login');
}

export const ensureAuthenticated = isAuth;
export const ensureGuest = isGuest;
