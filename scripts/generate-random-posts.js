import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs(argv) {
	const args = { count: 1, lang: 'en', prefix: '', dryRun: false };
	for (let i = 2; i < argv.length; i += 1) {
		const arg = argv[i];
		if (arg === '--count' && argv[i + 1]) {
			args.count = Math.max(1, parseInt(argv[i + 1], 10) || 1);
			i += 1;
		} else if (arg === '--lang' && argv[i + 1]) {
			args.lang = argv[i + 1];
			i += 1;
		} else if (arg === '--prefix' && argv[i + 1]) {
			args.prefix = argv[i + 1];
			i += 1;
		} else if (arg === '--dry-run') {
			args.dryRun = true;
		} else if (arg === '--help' || arg === '-h') {
			printHelp();
			process.exit(0);
		}
	}
	return args;
}

function printHelp() {
	console.log('Usage: node scripts/generate-random-posts.js [--count N] [--lang en|zh-tw] [--prefix TEXT] [--dry-run]');
	console.log('Examples:');
	console.log('  pnpm generate:posts -- --count 3');
	console.log('  pnpm generate:posts -- --count 2 --lang zh-tw');
}

function randomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function choice(list) {
	return list[randomInt(0, list.length - 1)];
}

function slugify(input) {
	return input
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
}

function formatDate(date) {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

const englishTitleFragments = [
	'Reflections on',
	'Exploring',
	'Notes about',
	'Lessons from',
	'What I learned about',
	'A quick take on',
	'Building',
	'Rethinking',
	'Behind the scenes of'
];

const englishSubjects = [
	'personal productivity',
	'web performance',
	'SvelteKit',
	'TypeScript ergonomics',
	'content workflow',
	'project planning',
	'creative routines'
];

const chineseTitleFragments = ['隨筆', '心得', '筆記', '想法', '觀察', '記錄'];
const chineseSubjects = ['開發工作流', '學習計畫', '日常生活', '網站優化', '前端體驗', '寫作練習'];

const englishParagraphs = [
	"Today I sketched a tiny idea and iterated on it. It's surprising how much clarity you get by just writing things down.",
	"I tried a different approach to structuring content. Keeping the draft short helped me keep momentum without overthinking.",
	"Small, consistent steps compound over time. The trick is to make starting easy and stopping hard.",
	"Tools matter less than habits, yet the right defaults make good habits lighter to carry.",
	"Shipping something imperfect taught me more than waiting for the perfect moment ever did."
];

const chineseParagraphs = [
	'今天把一個小想法記錄下來並實作了一點點，寫下來之後思緒竟然變清楚了不少。',
	'嘗試用不同的方式來整理內容，先寫短一點、把節奏維持住，比起一次追求完美還有效。',
	'小小的累積會慢慢發酵，關鍵是讓開始變得容易、停下來有點可惜。',
	'工具固然重要，但好習慣更重要。不過如果預設值選得好，好的習慣也會輕鬆許多。',
	'先把不完美的版本推出去，比等待完美的時機更能學到東西。'
];

const tagPool = ['Life', 'Career', 'Tech', 'Notes', 'Writing'];
const durations = ['1min', '2min', '3min', '5min'];

function generateTitle(lang) {
	if (lang === 'zh-tw') {
		return `${choice(chineseTitleFragments)}：${choice(chineseSubjects)}`;
	}
	return `${choice(englishTitleFragments)} ${choice(englishSubjects)}`;
}

function generateContent(lang, title, maybeImage = false) {
	const lines = [];
	if (lang === 'en') {
		lines.push(`## ${title}`);
		if (maybeImage) {
			lines.push('');
			lines.push('<div class="flex justify-center">');
			lines.push('<img src="/photography_assets/2.webp" alt="2.webp" class="photo-post">');
			lines.push('</div>');
		}
		lines.push('');
		const count = randomInt(2, 4);
		for (let i = 0; i < count; i += 1) lines.push(choice(englishParagraphs));
	} else {
		const count = randomInt(2, 4);
		for (let i = 0; i < count; i += 1) lines.push(choice(chineseParagraphs));
	}
	return lines.join('\n\n');
}

function ensureUniqueSlug(baseSlug, postsDir) {
	let slug = baseSlug;
	let suffix = 1;
	while (fs.existsSync(path.join(postsDir, `${slug}.svx`))) {
		slug = `${baseSlug}-${suffix}`;
		suffix += 1;
	}
	return slug;
}

function toFrontmatter({ title, date, slug, lang, duration, tags }) {
	const tagsLiteral = `[${tags.map((t) => `'${t}'`).join(', ')}]`;
	return [
		'---',
		`title: '${title}'`,
		`date: '${date}'`,
		`slug: '${slug}'`,
		`lang: '${lang}'`,
		`duration: '${duration}'`,
		`tags: ${tagsLiteral}`,
		'---',
		''
	].join('\n');
}

async function main() {
	const { count, lang, prefix, dryRun } = parseArgs(process.argv);
	const postsDir = path.join(__dirname, '..', 'src', 'markdown', 'posts');

	if (!fs.existsSync(postsDir)) {
		fs.mkdirSync(postsDir, { recursive: true });
	}

	const created = [];
	for (let i = 0; i < count; i += 1) {
		const titleCore = generateTitle(lang);
		const title = prefix ? `${prefix} ${titleCore}` : titleCore;
		const baseSlug = slugify(title);
		const slug = ensureUniqueSlug(baseSlug || `post-${Date.now()}`, postsDir);
		const date = formatDate(new Date(Date.now() - randomInt(0, 365) * 24 * 60 * 60 * 1000));
		const duration = choice(durations);
		const chosenTags = Array.from(new Set([choice(tagPool), choice(tagPool)])).slice(0, randomInt(1, 2));
		const showImage = lang === 'en' && Math.random() < 0.4;
		const body = generateContent(lang, title, showImage);

		const fm = toFrontmatter({ title, date, slug, lang, duration, tags: chosenTags });
		const content = `${fm}\n${body}\n`;
		const filePath = path.join(postsDir, `${slug}.svx`);

		if (dryRun) {
			console.log(`Would write: ${filePath}`);
		} else {
			fs.writeFileSync(filePath, content, 'utf-8');
			created.push({ filePath, slug, title });
		}
	}

	if (!dryRun) {
		console.log(`\n✅ Generated ${created.length} post(s):`);
		for (const item of created) {
			console.log(` - ${path.basename(item.filePath)}  →  ${item.title}`);
		}
	}
}

main().catch((err) => {
	console.error('Failed to generate posts:', err);
	process.exit(1);
});


