import { Router } from 'express';
import { isAuthenticated, isGuest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { deleteFolderRecursive } from '../utils/utils.js';
import cloudinary from '../lib/cloudinary.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

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
	} catch (error) {
		console.log(error);
		res.status(500).send('Internal server error');
	}
});

homeUserRouter.get('/:username/folders/:folderId/delete', isAuthenticated, async (req, res) => {
	try {
		const { username, folderId } = req.params;
		const userId = req.session.userId;
		const userAuth = await prisma.user.findUnique({ where: { id: userId } });
		if (username !== userAuth.username) {
			return res.status(403).send('Forbidden');
		}
		const pathToFolder = await getPathToFolder(folderId, username);
		const currentFolder = await prisma.folder.findFirst({
			where: {
				id: parseInt(folderId),
				userId: userAuth.id,
			},
		});
		if (!currentFolder) {
			return res.status(404).send('Folder not found');
		}
		await deleteFolderRecursive(`${pathToFolder}`);

		await prisma.folder.delete({
			where: {
				id: parseInt(folderId),
			},
		});
		return res.redirect(`/home/${username}/folders/${currentFolder.parentId}`);
	} catch (error) {
		console.log(error);
		res.status(500).send(`'Internal server error' ${error}`);
	}
});

homeUserRouter.post('/:username/folders/:folderId/uploadFile', upload.single('file'), isAuthenticated, async (req, res) => {
	try {
		const { username, folderId } = req.params;
		const userId = req.session.userId;
		const userAuth = await prisma.user.findUnique({ where: { id: userId } });
		if (username !== userAuth.username) {
			return res.status(403).send('Forbidden');
		}
		const pathToFolder = await getPathToFolder(folderId, username);
		if (!pathToFolder) {
			return res.status(404).send('Folder not found');
		}
		const file = req.file;
		if (!file) {
			return res.status(400).send('No file uploaded');
		}
		const uploadResult = await new Promise((resolve, reject) => {
			cloudinary.uploader.upload_stream(
				{
					folder: `${pathToFolder}`,
					resource_type: 'auto',
				},
				(error, result) => {
					if (error) {
						console.log(error);
						reject(error);
					}
					resolve(result);
				}
			).end(file.buffer);
		}).then(async (uploadResult) => {
			await prisma.file.create({
				data: {
					name: file.originalname,
					type: uploadResult.resource_type + '/' + uploadResult.format,
					url: uploadResult.url,
					size: uploadResult.bytes,
					cloudinaryId: uploadResult.public_id,
					userId: userAuth.id,
					folderId: parseInt(folderId),
				},
			});
		});
		res.redirect(`/home/${username}/folders/${folderId}`);
	} catch (error) {
		console.log(error);
		res.status(500).send('Internal server error');
	}
});


export default homeUserRouter;