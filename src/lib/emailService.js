import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

export const sendTempPasswordEmail = async ({ toEmail, toName, accountId, tempPassword }) => {
    if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
        console.warn('[Email] EmailJS 환경변수가 설정되지 않았습니다.');
        throw new Error('이메일 서비스 설정이 올바르지 않습니다.');
    }
    const result = await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
        to_email: toEmail,
        to_name: toName,
        account_id: accountId,
        temp_password: tempPassword,
    }, PUBLIC_KEY);
    console.log('[Email] 발송 결과:', result);
    return true;
};
