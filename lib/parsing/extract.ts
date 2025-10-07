interface PiiFields {
  name?: string;
  email?: string;
  phone?: string;
}

interface PiiConfidence {
  name: number;
  email: number;
  phone: number;
}

export interface PIIResult {
  fields: PiiFields;
  confidence: PiiConfidence;
}

const emailRegex = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

const phoneRegex = /(?:\+\d{1,3}[\s-]?)?(?:\(?\d{3}\)?[\s-]?){2,4}\d{3,4}/g;

/** Extracts name/email/phone heuristics from resume text */
export function extractPII(text: string): PIIResult {
  const normalized = text.replace(/\r\n/g, '\n');
  const fields: PiiFields = {};
  const confidence: PiiConfidence = { name: 0, email: 0, phone: 0 };

  // Extract email (first unique, prefer ones near top)
  const emails = Array.from(normalized.matchAll(emailRegex), m => m[0]);
  if (emails.length > 0) {
    const unique = [...new Set(emails.map(e => e.toLowerCase()))];
    const firstEmail = unique[0];
    fields.email = firstEmail;
    confidence.email = unique.length === 1 ? 0.95 : 0.8;
  }

  // Extract phone (prefer E.164-like, otherwise first valid)
  const phones = Array.from(normalized.matchAll(phoneRegex), m => m[0]);
  const cleaned = phones
    .map(raw => raw.replace(/[^\d+]/g, ''))
    .filter(d => {
      const digits = d.replace(/\D/g, '');
      return digits.length >= 7 && digits.length <= 15;
    });
  if (cleaned.length > 0) {
    const e164 = cleaned.find(p => /^\+\d{7,15}$/.test(p));
    const phone = e164 || cleaned[0];
    fields.phone = phone;
    confidence.phone = e164 ? 0.95 : 0.8;
  }

  // Extract name: scan first 8 non-empty lines, pick best-candidate by heuristics
  const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 12);
  const disqualifiers = [/https?:\/\//i, /www\./i, /@/, /linkedin\.com/i, /github\.com/i];
  const sectionHeaders = [/summary/i, /experience/i, /education/i, /skills/i, /projects?/i];

  let bestName: string | undefined;
  let bestScore = 0;
  for (const line of lines) {
    if (fields.email && line.includes(fields.email)) continue;
    if (fields.phone && line.includes(fields.phone)) continue;
    if (disqualifiers.some(rx => rx.test(line))) continue;
    if (sectionHeaders.some(rx => rx.test(line))) continue;
    if (line.length < 2 || line.length > 60) continue;

    const words = line.split(/\s+/);
    const hasTwoWords = words.length >= 2 && words.length <= 6;
    const titleCaseWords = words.filter(w => /^[A-Z][a-z'\-]{1,}$/.test(w)).length;
    const allCapsWords = words.filter(w => /^[A-Z]{2,}$/.test(w)).length;

    // Score: prefer 2-4 TitleCase words, penalize ALLCAPS, reward top lines
    let score = 0;
    if (hasTwoWords) score += 2;
    score += Math.min(3, titleCaseWords);
    if (allCapsWords > 0) score -= 1;
    // bonus if contains common name separators
    if (/\s/.test(line)) score += 1;

    if (score > bestScore) {
      bestScore = score;
      bestName = line;
    }
  }

  if (bestName) {
    fields.name = bestName;
    confidence.name = bestScore >= 4 ? 0.9 : 0.7;
  }

  return { fields, confidence };
}

// remove unused helper functions
// normalize whitespace not needed here

function normalize(text: string): string {
  return text.replace(/\r\n/g, '\n');
}
