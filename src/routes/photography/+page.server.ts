import type { PageServerLoad } from "./$types.ts";

// Define the structure for a photo object
interface Photo {
  src: string;
  alt: string;
}

export const load: PageServerLoad = async () => {
  try {
    // 使用 import.meta.glob 來獲取 static/photo 資料夾中的圖片資源
    // 我們將使用回傳物件的鍵 (keys)
    const imageModules = import.meta.glob(
      "/static/photo/**/*.{png,jpg,jpeg,gif,webp}",
      {
        eager: true,
        // 注意：這裡不再使用 import: 'default'
      },
    );

    // Object.keys(imageModules) 會得到一個專案相對路徑的陣列,
    // 例如: ['/static/photo/1.jpg', '/static/photo/2.png']
    const projectRelativePaths = Object.keys(imageModules);

    const photos: Photo[] = projectRelativePaths
      .map((relativePath) => {
        // 將專案相對路徑轉換為公開的網頁路徑
        // 例如, 將 '/static/photo/image.jpg' 轉換為 '/photo/image.jpg'
        const publicSrc = relativePath.startsWith("/static/")
          ? relativePath.substring("/static".length) // 移除 '/static' 前綴
          : relativePath; // 作為備用，但路徑應該總是符合預期格式

        // 從 publicSrc 中提取檔案名稱用於 alt 文字
        const filename = publicSrc.substring(publicSrc.lastIndexOf("/") + 1);
        return {
          src: publicSrc, // 現在 src 是正確的網頁路徑, 例如 '/photo/image.jpg'
          alt: `Photo ${filename}`,
        };
      })
      .sort((a, b) => {
        // 沿用您原有的排序邏輯
        const numA = parseInt(a.src.match(/\/(\d+)\.\w+$/)?.[1] || "0");
        const numB = parseInt(b.src.match(/\/(\d+)\.\w+$/)?.[1] || "0");
        if (numA !== numB) return numA - numB;
        return a.src.localeCompare(b.src);
      });

    return {
      photos,
      error: null,
    };
  } catch (processingErr) {
    console.error(
      "Error processing photo file list with import.meta.glob (keys method):",
      processingErr,
    );
    return {
      photos: [] as Photo[],
      error: "There was an issue organizing the photo data.",
    };
  }
};
