import { Router } from "express";
import { isAuthenticated } from "../middleware/auth.js";

const logoutRouter = Router();

logoutRouter.get("/", isAuthenticated, (req, res) => {
	req.session.destroy((err) => {
		if (err) {
			return res.redirect("/");
		}
		res.clearCookie('connect.sid');
		res.redirect("/login");
	});
});

export default logoutRouter;