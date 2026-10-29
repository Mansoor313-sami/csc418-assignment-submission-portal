export const STORAGE_KEY = 'csc418-submissions-v1';

export function validateSubmission(input) {
  const errors = {};
  for (const [field, label] of Object.entries({ name: 'Student name', registration: 'Registration number', title: 'Assignment title', url: 'Submission URL' })) {
    if (typeof input[field] !== 'string' || !input[field].trim()) errors[field] = `${label} is required.`;
  }
  if (!errors.url) {
    try {
      const url = new URL(input.url.trim());
      if (!['https:', 'http:'].includes(url.protocol) || !url.hostname.includes('.')) throw new Error('Invalid URL');
    } catch { errors.url = 'Enter a valid HTTP or HTTPS submission URL.'; }
  }
  return errors;
}

export function listSubmissions(storage) {
  const value = storage.getItem(STORAGE_KEY);
  if (!value) return [];
  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed)) throw new Error('Saved submissions could not be read.');
  return parsed;
}

export function saveSubmission(input, storage) {
  const errors = validateSubmission(input);
  if (Object.keys(errors).length) return { ok: false, errors };
  const submission = {
    id: globalThis.crypto.randomUUID(),
    ...Object.fromEntries(['name', 'registration', 'title', 'url'].map(key => [key, input[key].trim()])),
    submittedAt: new Date().toISOString()
  };
  const submissions = listSubmissions(storage);
  submissions.unshift(submission);
  storage.setItem(STORAGE_KEY, JSON.stringify(submissions));
  return { ok: true, submission };
}
