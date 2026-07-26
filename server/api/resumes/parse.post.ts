import { parseDocumentText } from 'server/services/parser';

export default defineEventHandler(async (event) => {
  const files = await readMultipartFormData(event);
  if (!files || files.length === 0) {
    throw createError({ statusCode: 400, statusMessage: '업로드할 파일이 존재하지 않습니다.' });
  }

  const file = files[0];
  const extractedText = await parseDocumentText(file.data, file.type || '', file.filename || 'resume.pdf');

  return {
    filename: file.filename,
    extractedText,
    charCount: extractedText.length,
  };
});
