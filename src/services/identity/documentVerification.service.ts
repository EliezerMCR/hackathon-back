import Tesseract from 'tesseract.js';
import { stripDiacritics } from './helpers';

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
