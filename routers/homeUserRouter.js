import { Router } from 'express';
import { isAuthenticated, isGuest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const homeUserRouter = Router();

homeUserRouter.get('/', isGuest, (req, res) => {
	res.redirect('/login');
});

homeUserRouter.get('/:username', isAuthenticated, async (req, res) => {
	try {
		const { username } = req.params;
		const userId = req.session.userId;
		const userAuth = await prisma.user.findUnique({ where: { id: userId } });
		if (username !== userAuth.username) {
			return res.status(403).send('Forbidden');
		}
		const currentFolder = await prisma.folder.findFirst({
			where: {
				parentId: null,
				userId: userAuth.id,
			},
		});
		if (!currentFolder) {
			return res.status(404).send('Folder not found');
		}
		const folderChildren = await prisma.folder.findMany({
			where: {
				parentId: currentFolder.id,
			},
		});
		const files = await prisma.file.findMany({
			where: {
				folderId: currentFolder.id,
			},
		});
		res.render('homeUser', {
			user: userAuth,
			currentFolder: currentFolder,
			folderChildren: folderChildren,
			files: files,
		});
	} catch (error) {
		console.log(error);
		res.status(500).send('Internal server error');
	}
});

homeUserRouter.get('/:username/folders/:folderId', isAuthenticated, async (req, res) => {
	try {
		const { username, folderId } = req.params;
		const userId = req.session.userId;
		const userAuth = await prisma.user.findUnique({ where: { id: userId } });
		if (username !== userAuth.username) {
			return res.status(403).send('Forbidden');
		}
		const currentFolder = await prisma.folder.findFirst({
			where: {
				id: parseInt(folderId),
				userId: userAuth.id,
			},
		});
		if (!currentFolder) {
			return res.status(404).send('Folder not found');
		}
		const folderChildren = await prisma.folder.findMany({
			where: {
				parentId: currentFolder.id,
			},
		});
		const files = await prisma.file.findMany({
			where: {
				folderId: currentFolder.id,
			},
		});
		res.render('homeUser', {
			user: userAuth,
			currentFolder: currentFolder,
			folderChildren: folderChildren,
			files: files,
		});
	} catch (error) {
		console.log(error);
		res.status(500).send('Internal server error');
	}
});

export default homeUserRouter;