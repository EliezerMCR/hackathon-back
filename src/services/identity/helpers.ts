import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

export const stripDiacritics = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[“”]/g, '"');

const dataUrlRegex = /^data:(?<mime>[^;]+);base64,(?<data>.+)$/;

const resolveBase64Payload = (input: string) => {
  const match = dataUrlRegex.exec(input.trim());
  if (match?.groups?.data) {
    return {
      payload: match.groups.data,
      mimeType: match.groups.mime ?? 'image/png',
    };
  }

  return {
    payload: input.trim(),
    mimeType: 'image/png',
  };
};

const extensionFromMime = (mimeType: string) => {
  if (!mimeType.includes('/')) {
    return 'png';
  }
  const [, subtype] = mimeType.split('/');
  if (!subtype) {
    return 'png';
  }
  if (subtype.includes('+')) {
    return subtype.split('+')[0];
  }
  return subtype;
};

export const saveBase64ImageToTempFile = async (
  base64: string,
  prefix = 'identity-document',
) => {
  if (!base64) {
    throw new Error('Empty base64 payload');
  }

  const { payload, mimeType } = resolveBase64Payload(base64);

  let buffer: Buffer;
  try {
    buffer = Buffer.from(payload, 'base64');
  } catch {
    throw new Error('Invalid base64 payload');
  }

  if (!buffer.length) {
    throw new Error('Invalid base64 payload');
  }

  const extension = extensionFromMime(mimeType) || 'png';
  const fileName = `${prefix}-${crypto.randomUUID()}.${extension}`;
  const filePath = path.join(os.tmpdir(), fileName);

  await fs.promises.writeFile(filePath, buffer);

  return {
    filePath,
    mimeType,
    extension: `.${extension}`,
  };
};
