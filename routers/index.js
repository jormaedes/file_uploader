import { Router } from "express";
import { isGuest } from "../middleware/auth.js";

const indexRouter = Router();

indexRouter.get("/", isGuest, (req, res) => {
	res.render("homepage");
});

export default indexRouter;