import { toast as sonnerToast } from 'sonner';

interface ToastOptions {
  title: string;
  description?: string;
  color?: 'green' | 'red' | 'blue' | 'yellow' | 'neutral';
}

export function useToast() {
  function add(opts: ToastOptions) {
    const { title, description, color } = opts;
    const message = description ? `${title}: ${description}` : title;
    switch (color) {
      case 'green':
        sonnerToast.success(message);
        break;
      case 'red':
        sonnerToast.error(message);
        break;
      case 'blue':
        sonnerToast.info(message);
        break;
      case 'yellow':
        sonnerToast.warning(message);
        break;
      default:
        sonnerToast(message);
    }
  }

  return { add };
}
