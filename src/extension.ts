import * as vscode from "vscode";
import sharp from "sharp";
import * as fs from "fs";
import * as path from "path";

const supportedFormats = [
  "webp",
  "avif",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "tiff",
  "bmp",
  "svg",
  "heif",
];

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "squosh.optimizeImages",
    async (uri: vscode.Uri) => {
      const folderPath = uri.fsPath;
      console.log(`Compressing images in folder: ${folderPath}`);
      const stats = fs.statSync(folderPath);

      try {
        const outputFormat = await getOutputFormat();
        const quality = await getQuality();

        if (!outputFormat) {
          return vscode.window.showErrorMessage(
            `Invalid format. Please enter webp, avif, or png. ect..`
          );
        }
        if (!quality) {
          return vscode.window.showErrorMessage(
            `Invalid quality. Please enter a number between 0 and 100. ect..`
          );
        }
        if (stats.isFile()) {
          await compressImage(folderPath, outputFormat, quality);
        } else if (stats.isDirectory()) {
          await compressImagesInDirectory(folderPath, outputFormat, quality);
        }
      } catch (error) {
        handleError(error);
      }
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}

async function getOutputFormat(): Promise<string | undefined> {
  return await vscode.window.showInputBox({
    prompt: "Enter output format (webp, avif, png)",
    placeHolder: "webp",
    validateInput: (value) => {
      if (supportedFormats.includes(value.toLowerCase())) {
        return null;
      } else {
        return "Invalid format. Please enter webp, avif, or png. ect..";
      }
    },
  });
}

async function getQuality(): Promise<string | undefined> {
  return await vscode.window.showInputBox({
    prompt: "Enter quality (0-100)",
    placeHolder: "80 (lower reduce size in kb)",
    validateInput: (value) => {
      const num = parseInt(value, 10);
      if (!isNaN(num) && num >= 0 && num <= 100) {
        return null;
      } else {
        return "Invalid quality. Please enter a number between  0 and  100.";
      }
    },
  });
}

async function compressImage(
  filePath: string,
  format: string,
  quality: string
): Promise<void> {
  const ext = path.extname(filePath).toLowerCase();
  if (supportedFormats.includes(ext.slice(1))) {
    const outputFilePath = `${filePath}-compressed.${format}`;
    await sharp(filePath)
      .rotate()
      //@ts-ignore
      .toFormat(format, { quality: parseInt(quality) })
      .withMetadata()
      .toFile(outputFilePath);
    console.log(`Compressed: ${outputFilePath}`);
  }
}

async function compressImagesInDirectory(
  folderPath: string,
  format: string,
  quality: string
): Promise<void> {
  const files = fs.readdirSync(folderPath);
  const imagePromises = files.map((file) => {
    const filePath = path.join(folderPath, file);
    return compressImage(filePath, format, quality);
  });

  await Promise.all(imagePromises);
  vscode.window.showInformationMessage(`Images compressed in ${folderPath}`);
}

function handleError(error: any): void {
  if (error instanceof Error) {
    vscode.window.showErrorMessage(
      `Failed to compress images: ${error.message}`
    );
  } else {
    vscode.window.showErrorMessage(`unknown error: ${error}`);
  }
}
