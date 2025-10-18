import Tesseract from 'tesseract.js';
import { stripDiacritics } from './helpers';
import { GeminiClient } from '../ai/gemini-client';
import fs from 'fs/promises';

export interface DocumentVerificationResult {
  text: string;
  normalizedText: string;
  nameMatches: boolean;
  documentMatches: boolean;
  isValid: boolean;
  missingNameTokens: string[];
  bestDocumentCandidate?: string;
  documentDistance?: number;
  matchedVariant?: string;
}

export interface VerifyDocumentParams {
  filePath: string;
  fullName: string;
  documentNumber: string;
  language?: string;
  mimeType?: string;
}

const DEFAULT_LANGUAGE = 'spa+eng';

const normalizeDigits = (value: string) => value.replace(/\D/g, '');

const tokenize = (value: string) => value.split(/\s+/).filter(Boolean);

const sanitizeAlphaNumeric = (value: string) => value.replace(/[^A-Z0-9]/g, '');

const formatDigitsWithSeparators = (digits: string) =>
  digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const extractDigitSequences = (value: string) => value.match(/\d+/g) ?? [];

const levenshteinDistance = (a: string, b: string) => {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let i = 0; i < rows; i += 1) dp[i][0] = i;
  for (let j = 0; j < cols; j += 1) dp[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[a.length][b.length];
};

const buildDocumentVariants = (digits: string) => {
  const withSeparators = formatDigitsWithSeparators(digits);
  return [
    `V ${withSeparators}`,
    `V${withSeparators}`,
    `V-${withSeparators}`,
    `V.${withSeparators}`,
    `V ${withSeparators.replace(/\./g, ' ')}`,
    `V${digits}`,
    `V ${digits}`,
    `V-${digits}`,
  ];
};

const computeDocumentMatch = (normalizedText: string, expectedDigits: string) => {
  const docLen = expectedDigits.length;
  if (!docLen) {
    return { matches: false, bestCandidate: undefined, distance: undefined };
  }

  const digitSequences = extractDigitSequences(normalizedText);
  const tolerance = Math.max(1, Math.ceil(docLen * 0.3));

  let bestCandidate: string | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const seq of digitSequences) {
    if (seq.includes(expectedDigits)) {
      return { matches: true, bestCandidate: seq, distance: 0 };
    }

    if (seq.length >= docLen) {
      for (let i = 0; i <= seq.length - docLen; i += 1) {
        const candidate = seq.slice(i, i + docLen);
        const distance = levenshteinDistance(candidate, expectedDigits);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestCandidate = candidate;
        }
        if (distance <= tolerance) {
          return { matches: true, bestCandidate: candidate, distance };
        }
      }
    }

    const distance = levenshteinDistance(seq, expectedDigits);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestCandidate = seq;
    }
    if (distance <= tolerance) {
      return { matches: true, bestCandidate: seq, distance };
    }
  }

  if (bestDistance !== Number.POSITIVE_INFINITY) {
    return { matches: false, bestCandidate, distance: bestDistance };
  }

  return { matches: false, bestCandidate: undefined, distance: undefined };
};

export const verifyIdentityDocument = async ({
  filePath,
  fullName,
  documentNumber,
  language = DEFAULT_LANGUAGE,
}: VerifyDocumentParams): Promise<DocumentVerificationResult> => {
  const { data } = await Tesseract.recognize(filePath, language);

  const normalizedText = stripDiacritics(data.text).toUpperCase();
  const normalizedName = stripDiacritics(fullName).toUpperCase();
  const nameTokens = tokenize(normalizedName);

  const missingNameTokens = nameTokens.filter((token) => !normalizedText.includes(token));
  const nameMatches = missingNameTokens.length === 0;

  const expectedDocumentDigits = normalizeDigits(documentNumber);
  const documentDigitsInText = normalizeDigits(normalizedText);
  const directMatch = documentDigitsInText.includes(expectedDocumentDigits);
  let documentMatches = directMatch;
  let bestDocumentCandidate: string | undefined;
  let documentDistance: number | undefined;
  let matchedVariant: string | undefined;

  const sanitizedText = sanitizeAlphaNumeric(normalizedText);
  const expectedSanitized = `V${expectedDocumentDigits}`;

  if (!documentMatches && sanitizedText.includes(expectedSanitized)) {
    documentMatches = true;
    matchedVariant = 'V + digits (sanitized)';
  }

  if (!documentMatches) {
    const variants = buildDocumentVariants(expectedDocumentDigits);
    for (const variant of variants) {
      const sanitizedVariant = sanitizeAlphaNumeric(variant);
      if (sanitizedVariant && sanitizedText.includes(sanitizedVariant)) {
        documentMatches = true;
        matchedVariant = variant;
        break;
      }
    }
  }

  if (!documentMatches) {
    const fuzzy = computeDocumentMatch(normalizedText, expectedDocumentDigits);
    documentMatches = fuzzy.matches;
    bestDocumentCandidate = fuzzy.bestCandidate;
    documentDistance = fuzzy.distance;
  }

  return {
    text: data.text,
    normalizedText,
    nameMatches,
    documentMatches,
    isValid: nameMatches && documentMatches,
    missingNameTokens,
    bestDocumentCandidate,
    documentDistance,
    matchedVariant,
  };
};

export const verifyIdentityDocumentWithGemini = async ({
  filePath,
  fullName,
  documentNumber,
  mimeType = 'image/jpeg',
}: VerifyDocumentParams): Promise<DocumentVerificationResult> => {
  const geminiClient = new GeminiClient();
  const model = geminiClient.getModel();

  const prompt = `
Eres un asistente de validación de identidad. Tu tarea es analizar la imagen de un documento de identidad y verificar si los datos coinciden con la información proporcionada.

Información del usuario:
- Nombre completo: ${fullName}
- Número de documento: ${documentNumber}

Analiza la imagen adjunta y responde en formato JSON con la siguiente estructura:
{
  "nameMatches": boolean, // true si el nombre en el documento coincide con el nombre proporcionado
  "documentMatches": boolean, // true si el número de documento coincide con el número proporcionado
  "extractedName": string, // El nombre completo extraído del documento
  "extractedDocumentNumber": string, // El número de documento extraído del documento
  "isValid": boolean // true si tanto el nombre como el número de documento coinciden
}

Si no puedes encontrar el nombre o el número de documento, los campos correspondientes en el JSON deben ser null.
  `;

  const imageBuffer = await fs.readFile(filePath);
  const imageBase64 = imageBuffer.toString('base64');

  const imagePart = {
    inlineData: {
      data: imageBase64,
      mimeType,
    },
  };

  const result = await model.generateContent([prompt, imagePart]);
  const responseText = result.response.text();
  const jsonResponse = JSON.parse(responseText.replace(/```json|```/g, '').trim());
  // Normalize extracted document number (remove dots and non-digits) before comparing
  const extractedRaw: string | null = jsonResponse.extractedDocumentNumber ?? null;
  const extractedDigits = extractedRaw ? normalizeDigits(String(extractedRaw)) : '';
  const expectedDigits = normalizeDigits(documentNumber);

  // Determine document match based on digits-only equality (or inclusion as fallback)
  let documentMatches = false;
  if (extractedDigits && expectedDigits) {
    documentMatches = extractedDigits === expectedDigits || extractedDigits.includes(expectedDigits) || expectedDigits.includes(extractedDigits);
  }

  const nameMatches = Boolean(jsonResponse.nameMatches);
  const isValid = nameMatches && documentMatches;

  return {
    text: responseText,
    normalizedText: '',
    nameMatches,
    documentMatches,
    isValid,
    missingNameTokens: [],
    // debugging helpers
    bestDocumentCandidate: extractedDigits || undefined,
    matchedVariant: extractedRaw || undefined,
  };
};
