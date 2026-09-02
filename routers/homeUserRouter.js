import { Router } from 'express';
import { isAuthenticated, isGuest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import cloudinary from '../lib/cloudinary.js';

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

async function getPathToFolder(folderId, userName) {
	let pathToFolder = '';
	if (folderId) {
		const currentFolder = await prisma.folder.findFirst({
			where: {
				id: parseInt(folderId),
			},
		});
		if (!currentFolder) {
			return null;
		}
		pathToFolder = await getPathToFolder(currentFolder.parentId, userName) + `${currentFolder.name}/`;
	}
	return pathToFolder;
}

homeUserRouter.post('/:username/folders/:folderId/createFolder', isAuthenticated, async (req, res) => {
	try {
		const { folderName } = req.body;
		const { username, folderId } = req.params;
		const userId = req.session.userId;
		const userAuth = await prisma.user.findUnique({ where: { id: userId } });
		if (username !== userAuth.username) {
			return res.status(403).send('Forbidden');
		}
		const pathToFolder = await getPathToFolder(folderId, username);
		console.log(pathToFolder);
		if (!pathToFolder) {
			return res.status(404).send('Folder not found');
		}
		await cloudinary.api.create_folder(`${pathToFolder}${folderName}`);
		const currentFolder = await prisma.folder.findFirst({
			where: {
				id: parseInt(folderId),
			},
		});
		if (!currentFolder) {
			return res.status(404).send('Folder not found');
		}
		const newFolder = await prisma.folder.create({
			data: {
				name: folderName,
				userId: userAuth.id,
				parentId: currentFolder.id,
			},
		});
		res.redirect(`/home/${username}/folders/${currentFolder.id}`);
		// res.send('Success');
	} catch (error) {
		console.log(error);
		res.status(500).send('Internal server error');
	}
});

export default homeUserRouter;