import { Router } from 'express';
import multer from 'multer';
import cloudinary from '../lib/cloudinary.js';
import { prisma } from '../lib/prisma.js';

const uploadRouter = Router();

const upload = multer({ storage: multer.memoryStorage() });

function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated && req.isAuthenticated()) {
		return next();
	}
	return res.status(401).json({ error: 'Utilizador não autenticado. Faça login primeiro.' });
}

function uploadToCloudinary(buffer, cloudinaryFolder) {
	return new Promise((resolve, reject) => {
		const stream = cloudinary.uploader.upload_stream(
			{ resource_type: 'auto', folder: cloudinaryFolder },
			(error, result) => (error ? reject(error) : resolve(result))
		);
		stream.end(buffer);
	});
}

uploadRouter.post('/upload', ensureAuthenticated, upload.single('file'), async (req, res, next) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: 'Nenhum ficheiro enviado.' });
		}

		const userId = req.user.id;
		const folderId = req.body.folderId ? parseInt(req.body.folderId, 10) : null;

		// Definir o caminho da pasta no Cloudinary isolado por utilizador
		// Exemplo: "file-uploader/user_1" ou "file-uploader/user_1/folder_5"
		let cloudinaryFolderPath = `file-uploader/user_${userId}`;

		if (folderId) {
			// Validar se a pasta pertence ao utilizador autenticado
			const folder = await prisma.folder.findFirst({
				where: { id: folderId, userId: userId },
			});

			if (!folder) {
				return res.status(404).json({ error: 'Pasta de destino não encontrada.' });
			}
			cloudinaryFolderPath += `/folder_${folderId}`;
		}

		// 1. Upload para o Cloudinary na pasta do utilizador
		const result = await uploadToCloudinary(req.file.buffer, cloudinaryFolderPath);

		// 2. Registar o ficheiro na Base de Dados via Prisma
		const savedFile = await prisma.file.create({
			data: {
				name: req.file.originalname,
				type: req.file.mimetype,
				url: result.secure_url,
				cloudinaryId: result.public_id,
				size: req.file.size,
				userId: userId,
				folderId: folderId,
			},
		});

		res.status(201).json({
			message: 'Ficheiro enviado com sucesso!',
			file: savedFile,
		});
	} catch (error) {
		next(error);
	}
});

export default uploadRouter;

