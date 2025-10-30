import { notifyInfo, notifySuccess, notifyError } from '../stores/notificationStore';
import { confirmAsync } from '../stores/dialogStore';

export { notifyInfo, notifySuccess, notifyError, confirmAsync };

export function showAlert(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes('erro')) {
    notifyError(message);
  } else if (lower.includes('sucesso') || lower.includes('salvo') || lower.includes('registrado')) {
    notifySuccess(message);
  } else if (lower.includes('aviso') || lower.includes('atenção') || lower.includes('insuficiente')) {
    notifyInfo(message);
  } else {
    notifyInfo(message);
  }
}


