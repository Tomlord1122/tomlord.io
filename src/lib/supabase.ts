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
	const { error: uploadError } = await supabase.storage
		.from(STORAGE_BUCKET)
		.upload(path, file, {
			upsert: true,
			contentType: file.type
		});

	if (uploadError) {
		return { publicUrl: '', error: new Error(uploadError.message) };
	}

	const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);

	return { publicUrl: urlData.publicUrl, error: null };
}
