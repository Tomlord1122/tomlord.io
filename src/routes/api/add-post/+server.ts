import { json } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';

export async function POST({ request }) {
	const { filename, content } = await request.json();

	// Define the path where posts will be saved
	const postsDir = path.join(process.cwd(), 'src', 'markdown', 'posts');

	// Create directory if it doesn't exist
	if (!fs.existsSync(postsDir)) {
		fs.mkdirSync(postsDir, { recursive: true });
	}

	// Write the file
	const filePath = path.join(postsDir, filename);
	fs.writeFileSync(filePath, content);

	return json({ success: true, path: filePath });
}
