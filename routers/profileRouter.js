import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import cloudinary from '../lib/cloudinary.js';
import multer from 'multer';
import bcrypt from 'bcryptjs';

const upload = multer({ storage: multer.memoryStorage() });
const profileRouter = Router();

// GET /profile - Exibir página de perfil do usuário
profileRouter.get('/', isAuthenticated, async (req, res) => {
	try {
		const userId = req.session.userId;
		const user = await prisma.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			return res.redirect('/login');
		}

		// Obter arquivos do usuário para calcular estatísticas de armazenamento
		const userFiles = await prisma.file.findMany({
			where: { userId: user.id },
		});

		let totalSizeBytes = 0;
		let imagesSizeBytes = 0;
		let videosSizeBytes = 0;
		let docsSizeBytes = 0;
		let othersSizeBytes = 0;

		userFiles.forEach((file) => {
			const size = file.size || 0;
			totalSizeBytes += size;
			const type = (file.type || '').toLowerCase();
			if (type.includes('image') || type.includes('png') || type.includes('jpg')) {
				imagesSizeBytes += size;
			} else if (type.includes('video') || type.includes('mp4')) {
				videosSizeBytes += size;
			} else if (type.includes('pdf') || type.includes('doc') || type.includes('text')) {
				docsSizeBytes += size;
			} else {
				othersSizeBytes += size;
			}
		});

		res.render('profile', {
			user,
			stats: {
				totalSizeBytes,
				imagesSizeBytes,
				videosSizeBytes,
				docsSizeBytes,
				othersSizeBytes,
				fileCount: userFiles.length,
			},
			errors: null,
			success: req.query.success || null,
		});
	} catch (error) {
		console.error('Erro ao carregar perfil:', error);
		res.status(500).send('Erro interno ao carregar perfil.');
	}
});

// POST /profile/update - Atualizar dados pessoais e foto de perfil
profileRouter.post('/update', isAuthenticated, upload.single('profilePicture'), async (req, res) => {
	try {
		const userId = req.session.userId;
		const { firstName, lastName, username } = req.body;

		const currentUser = await prisma.user.findUnique({
			where: { id: userId },
		});

		if (!currentUser) {
			return res.redirect('/login');
		}

		let newProfilePictureUrl = currentUser.profilePicture;

		// Se o usuário enviou uma nova foto de perfil
		if (req.file) {
			// Encontrar a pasta raiz (home) do usuário no banco de dados
			const rootFolder = await prisma.folder.findFirst({
				where: {
					userId: currentUser.id,
					parentId: null,
				},
			});

			const folderPath = `${currentUser.username}/`;

			// 1. Upload para o Cloudinary na pasta do usuário
			const uploadResult = await new Promise((resolve, reject) => {
				cloudinary.uploader.upload_stream(
					{
						folder: folderPath,
						resource_type: 'auto',
					},
					(error, result) => {
						if (error) reject(error);
						else resolve(result);
					}
				).end(req.file.buffer);
			});

			newProfilePictureUrl = uploadResult.url;

			// 2. Salvar o arquivo no banco de dados na pasta raiz do usuário
			if (rootFolder) {
				await prisma.file.create({
					data: {
						name: `profile_${Date.now()}_${req.file.originalname}`,
						type: uploadResult.resource_type + '/' + uploadResult.format,
						url: uploadResult.url,
						cloudinaryId: uploadResult.public_id,
						size: uploadResult.bytes,
						userId: currentUser.id,
						folderId: rootFolder.id,
					},
				});
			}
		}

		// Verificar se o novo nome de usuário já está em uso por outro usuário
		if (username && username !== currentUser.username) {
			const existingUser = await prisma.user.findUnique({
				where: { username },
			});
			if (existingUser) {
				const userFiles = await prisma.file.findMany({ where: { userId: currentUser.id } });
				return res.render('profile', {
					user: currentUser,
					stats: { totalSizeBytes: 0, fileCount: userFiles.length },
					errors: [{ msg: 'Este nome de usuário já está sendo utilizado.' }],
					success: null,
				});
			}
		}

		// 3. Atualizar dados do usuário no banco de dados
		const updatedUser = await prisma.user.update({
			where: { id: userId },
			data: {
				firstName: firstName || currentUser.firstName,
				lastName: lastName || currentUser.lastName,
				username: username || currentUser.username,
				profilePicture: newProfilePictureUrl,
			},
		});

		res.redirect('/profile?success=Perfil+atualizado+com+sucesso!');
	} catch (error) {
		console.error('Erro ao atualizar perfil:', error);
		res.status(500).send(`Erro interno ao atualizar perfil: ${error.message}`);
	}
});

// POST /profile/change-password - Alterar senha
profileRouter.post('/change-password', isAuthenticated, async (req, res) => {
	try {
		const userId = req.session.userId;
		const { currentPassword, newPassword, confirmNewPassword } = req.body;

		const user = await prisma.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			return res.redirect('/login');
		}

		if (!currentPassword || !newPassword || !confirmNewPassword) {
			return res.redirect('/profile?error=Preencha+todos+os+campos+de+senha.');
		}

		if (newPassword !== confirmNewPassword) {
			return res.redirect('/profile?error=A+nova+senha+e+a+confirma%C3%A7%C3%A3o+n%C3%A3o+coincidem.');
		}

		if (newPassword.length < 6) {
			return res.redirect('/profile?error=A+nova+senha+deve+ter+pelo+menos+6+caracteres.');
		}

		const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
		if (!isPasswordValid) {
			return res.redirect('/profile?error=A+senha+atual+est%C3%A1+incorreta.');
		}

		const hashedPassword = await bcrypt.hash(newPassword, 10);
		await prisma.user.update({
			where: { id: userId },
			data: { password: hashedPassword },
		});

		res.redirect('/profile?success=Senha+alterada+com+sucesso!');
	} catch (error) {
		console.error('Erro ao alterar senha:', error);
		res.status(500).send('Erro interno ao alterar senha.');
	}
});

export default profileRouter;
