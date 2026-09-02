import cloudinary from "../lib/cloudinary.js";

export async function getAllSubFolders(folderPath) {
	let foldersList = [];

	try {
		const result = await cloudinary.api.sub_folders(folderPath);
		const subFolders = result.folders || [];

		for (const folder of subFolders) {
			const childFolders = await getAllSubFolders(folder.path);
			foldersList = foldersList.concat(childFolders);
		}
	} catch (error) {
		if (error.http_code !== 404) {
			console.error(`Error getting subfolders from ${folderPath}:`, error);
		}
	}
	foldersList.push(folderPath);
	return foldersList;
}

export async function deleteFolderResources(folderPath) {
	try {
		const obj = await cloudinary.api.resources_by_asset_folder(folderPath);
		const resources = obj.resources;
		for (const resource of resources) {
			await cloudinary.uploader.destroy(resource.public_id, { resource_type: resource.resource_type });
		}
	} catch (error) {
		console.error(`Error deleting files from folder ${folderPath}:`, error);
	}
}

export async function deleteFolderRecursive(rootFolderPath) {
	try {
		const hierarchicalFolders = await getAllSubFolders(rootFolderPath);
		for (const folder of hierarchicalFolders) {
			await deleteFolderResources(folder);
		}
		for (const folder of hierarchicalFolders) {
			await cloudinary.api.delete_folder(folder);
		}

		return true;
	} catch (error) {
		console.error(`Error deleting folder ${rootFolderPath} and its subfolders:`, error);
		throw error;
	}
}