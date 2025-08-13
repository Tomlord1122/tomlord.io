import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';

export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY);

export const STORAGE_BUCKET = 'tomtom-assets';

/**
 * Upload a file to Supabase Storage
 */
export async function uploadToStorage(
	file: File,
	path: string
): Promise<{ publicUrl: string; error: Error | null }> {
	const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
		upsert: true,
		contentType: file.type
	});

	if (uploadError) {
		return { publicUrl: '', error: new Error(uploadError.message) };
	}

	const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);

	return { publicUrl: urlData.publicUrl, error: null };
}

/**
 * Delete a file from Supabase Storage by its path inside the bucket
 */
export async function deleteFromStorage(path: string): Promise<{ error: Error | null }> {
	const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
	if (error) {
		return { error: new Error(error.message) };
	}
	return { error: null };
}

export interface StorageFile {
	name: string;
	publicUrl: string;
}

/**
 * List drawing files from Supabase Storage drawings/ folder
 */
export async function listDrawings(): Promise<{ files: StorageFile[]; error: Error | null }> {
	const { data, error: listError } = await supabase.storage
		.from(STORAGE_BUCKET)
		.list('drawings', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

	if (listError) {
		return { files: [], error: new Error(listError.message) };
	}

	if (!data) {
		return { files: [], error: null };
	}

	const files: StorageFile[] = data
		.filter((item) => !item.id?.endsWith('.emptyFolderPlaceholder'))
		.map((item) => {
			const { data: urlData } = supabase.storage
				.from(STORAGE_BUCKET)
				.getPublicUrl(`drawings/${item.name}`);
			return { name: item.name, publicUrl: urlData.publicUrl };
		});

	return { files, error: null };
}
