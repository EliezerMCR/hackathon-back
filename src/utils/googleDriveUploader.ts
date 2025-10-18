import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const serviceAccountEmail = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL;
const serviceAccountPrivateKey = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
const defaultFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

if (!serviceAccountEmail || !serviceAccountPrivateKey) {
    console.warn('⚠️  Google Drive service account credentials are not fully configured. Uploads will fail until GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL and GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY are set.');
}

let driveClient: ReturnType<typeof google.drive> | null = null;

const getDriveClient = () => {
    if (!serviceAccountEmail || !serviceAccountPrivateKey) {
        throw new Error(
            'Google Drive credentials are missing. Set GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL and GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY env vars.',
        );
    }

    if (!driveClient) {
        const auth = new google.auth.JWT({
            email: serviceAccountEmail,
            key: serviceAccountPrivateKey,
            scopes: SCOPES,
        });

        driveClient = google.drive({ version: 'v3', auth });
    }

    return driveClient;
};

export interface DriveUploadOptions {
    filePath: string;
    mimeType: string;
    fileName?: string;
    folderId?: string;
    removeAfterUpload?: boolean;
}

export const uploadFileToDrive = async ({
    filePath,
    mimeType,
    fileName,
    folderId,
    removeAfterUpload = false,
}: DriveUploadOptions): Promise<string> => {
    if (!defaultFolderId && !folderId) {
        throw new Error('Google Drive folder id is not configured. Define GOOGLE_DRIVE_FOLDER_ID or pass folderId explicitly.');
    }

    const resolvedFileName = fileName ?? path.basename(filePath);

    const fileMetadata = {
        name: resolvedFileName,
        parents: [folderId ?? defaultFolderId as string],
    };

    const media = {
        mimeType,
        body: fs.createReadStream(filePath),
    };

    try {
            const drive = getDriveClient();

            const response = await drive.files.create({
            requestBody: fileMetadata,
            media,
            fields: 'id',
        });

        if (!response.data.id) {
            throw new Error('Google Drive did not return a file id.');
        }

        if (removeAfterUpload) {
            await fs.promises.unlink(filePath).catch(() => undefined);
        }

        return response.data.id;
    } catch (error) {
        console.error('Error uploading file to Google Drive', error);
        throw error;
    }
};