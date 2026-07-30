import { uploadToBlob } from '../../services/blob';

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event);
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: '업로드할 파일이 없습니다.' });
  }

  const file = formData[0];
  if (!file.filename || !file.data) {
    throw createError({ statusCode: 400, statusMessage: '유효한 파일이 아닙니다.' });
  }

  const blob = await uploadToBlob(`uploads/${Date.now()}-${file.filename}`, file.data, {
    contentType: file.type,
    access: 'public',
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
    contentType: blob.contentType,
  };
});
