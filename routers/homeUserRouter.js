import { Router } from 'express';
import { isAuthenticated, isGuest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { deleteFolderRecursive } from '../utils/utils.js';
import cloudinary from '../lib/cloudinary.js';
import multer from 'multer';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

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
			return res.status(403).render('403', { url: req.originalUrl });
		}
		const currentFolder = await prisma.folder.findFirst({
			where: {
				parentId: null,
				userId: userAuth.id,
			},
		});
		if (!currentFolder) {
			return res.status(404).render('404', { url: req.originalUrl });
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
			errorMessage: req.query.error || null,
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
			return res.status(403).render('403', { url: req.originalUrl });
		}
		const currentFolder = await prisma.folder.findFirst({
			where: {
				id: parseInt(folderId),
				userId: userAuth.id,
			},
		});
		if (!currentFolder) {
			return res.status(404).render('404', { url: req.originalUrl });
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
			errorMessage: req.query.error || null,
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
			return res.status(403).render('403', { url: req.originalUrl });
		}
		const pathToFolder = await getPathToFolder(folderId, username);
		if (!pathToFolder) {
			return res.status(404).render('404', { url: req.originalUrl });
		}
		const isExistFolder = await prisma.folder.findFirst({
			where: {
				name: folderName,
				parentId: parseInt(folderId),
				userId: userAuth.id,
			},
		});
		if (isExistFolder) {
			return res.redirect(`/home/${username}/folders/${folderId}?error=Ja+existe+uma+pasta+com+o+nome+"${encodeURIComponent(folderName)}"+neste+diretorio.`);
		}
		await cloudinary.api.create_folder(`${pathToFolder}${folderName}`);
		const currentFolder = await prisma.folder.findFirst({
			where: {
				id: parseInt(folderId),
			},
		});
		if (!currentFolder) {
			return res.status(404).render('404', { url: req.originalUrl });
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
			return res.status(403).render('403', { url: req.originalUrl });
		}
		const pathToFolder = await getPathToFolder(folderId, username);
		const currentFolder = await prisma.folder.findFirst({
			where: {
				id: parseInt(folderId),
				userId: userAuth.id,
			},
		});
		if (!currentFolder) {
			return res.status(404).render('404', { url: req.originalUrl });
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
			return res.status(403).render('403', { url: req.originalUrl });
		}
		const pathToFolder = await getPathToFolder(folderId, username);
		if (!pathToFolder) {
			return res.status(404).render('404', { url: req.originalUrl });
		}
		const file = req.file;
		if (!file) {
			return res.status(400).send('No file uploaded');
		}
		const size = file.size;
		if (size > 5 * 1024 * 1024) {
			return res.redirect(`/home/${username}/folders/${folderId}?error=O+arquivo+é+maior+que+5MB.`);
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

homeUserRouter.get('/:username/folders/:folderId/deleteFile/:fileId', isAuthenticated, async (req, res) => {
	try {
		const { username, folderId } = req.params;
		const fileId = req.params.fileId;
		const userId = req.session.userId;
		const userAuth = await prisma.user.findUnique({ where: { id: userId } });
		if (username !== userAuth.username) {
			return res.status(403).render('403', { url: req.originalUrl });
		}
		const pathToFolder = await getPathToFolder(folderId, username);
		if (!pathToFolder) {
			return res.status(404).render('404', { url: req.originalUrl });
		}
		const file = await prisma.file.findFirst({
			where: {
				id: parseInt(fileId),
				userId: userAuth.id,
			},
		});
		if (!file) {
			return res.status(404).render('404', { url: req.originalUrl });
		}
		await cloudinary.uploader.destroy(file.cloudinaryId, { resource_type: file.type.split('/')[0] });
		await prisma.file.delete({
			where: {
				id: parseInt(fileId),
			},
		});
		return res.redirect(`/home/${username}/folders/${folderId}`);
	} catch (error) {
		console.log(error);
		res.status(500).send(`'Internal server error' ${error.message}`);
	}
});

homeUserRouter.get('/:username/folders/:folderId/downloadFile/:fileId', isAuthenticated, async (req, res) => {
	let temporaryDirectory;
	try {
		const { username, fileId } = req.params;
		const userId = req.session.userId;
		const userAuth = await prisma.user.findUnique({ where: { id: userId } });

		if (!userAuth || username !== userAuth.username) {
			return res.status(403).render('403', { url: req.originalUrl });
		}

		const file = await prisma.file.findFirst({
			where: {
				id: parseInt(fileId, 10),
				userId: userAuth.id,
			},
		});

		if (!file) {
			return res.status(404).render('404', { url: req.originalUrl });
		}

		const fileUrl = new URL(file.url);
		const cloudName = cloudinary.config().cloud_name;
		if (
			fileUrl.hostname !== 'res.cloudinary.com' ||
			!fileUrl.pathname.startsWith(`/${cloudName}/`)
		) {
			console.error(`URL Cloudinary inválido para o ficheiro ${file.id}.`);
			return res.status(502).send('Não foi possível descarregar este ficheiro.');
		}

		fileUrl.protocol = 'https:';
		const pathSegments = fileUrl.pathname.split('/');
		const uploadSegmentIndex = pathSegments.indexOf('upload');
		const resourceType = pathSegments[uploadSegmentIndex - 1];
		if (uploadSegmentIndex < 1 || !['image', 'video', 'raw'].includes(resourceType)) {
			console.error(`Tipo de recurso Cloudinary inválido para o ficheiro ${file.id}.`);
			return res.status(502).send('Não foi possível descarregar este ficheiro.');
		}

		if (resourceType !== 'raw') {
			pathSegments.splice(uploadSegmentIndex + 1, 0, 'fl_attachment');
			fileUrl.pathname = pathSegments.join('/');
		}

		const upstream = await fetch(fileUrl);
		if (!upstream.ok || !upstream.body) {
			await upstream.body?.cancel();
			console.error(`Falha ao obter ficheiro ${file.id} do Cloudinary: ${upstream.status}.`);
			return res.status(502).send('Não foi possível descarregar este ficheiro.');
		}

		temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'jfloader-download-'));
		const temporaryFile = path.join(temporaryDirectory, 'download');
		await pipeline(Readable.fromWeb(upstream.body), createWriteStream(temporaryFile));

		res.attachment(file.name);
		res.type('application/octet-stream');
		await pipeline(createReadStream(temporaryFile), res);
	} catch (error) {
		console.error('Erro ao descarregar ficheiro:', error);
		if (!res.headersSent) {
			res.status(500).send('Erro interno ao descarregar o ficheiro.');
		}
	} finally {
		if (temporaryDirectory) {
			try {
				await rm(temporaryDirectory, { recursive: true, force: true });
			} catch (error) {
				console.error('Erro ao apagar o ficheiro temporário do download:', error);
			}
		}
	}
});

export default homeUserRouter;