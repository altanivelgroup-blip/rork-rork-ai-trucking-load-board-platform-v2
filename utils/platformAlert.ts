import { Alert, Platform } from 'react-native';

type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

export function platformAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: { cancelable?: boolean }
): void {
  if (Platform.OS === 'web') {
    // Web fallback using browser confirm/alert
    const fullMessage = message ? `${title}\n\n${message}` : title;
    
    if (buttons && buttons.length > 1) {
      // For multiple buttons, use confirm dialog
      const result = window.confirm(fullMessage);
      const confirmButton = buttons.find(b => b.style !== 'cancel');
      const cancelButton = buttons.find(b => b.style === 'cancel');
      
      if (result && confirmButton?.onPress) {
        confirmButton.onPress();
      } else if (!result && cancelButton?.onPress) {
        cancelButton.onPress();
      }
    } else {
      // For single button or no buttons, use alert
      window.alert(fullMessage);
      if (buttons?.[0]?.onPress) {
        buttons[0].onPress();
      }
    }
  } else {
    // Native Alert.alert
    Alert.alert(title, message, buttons, options);
  }
}

// Simple alert for basic messages
export function showAlert(title: string, message?: string): void {
  platformAlert(title, message);
}

// Confirmation dialog
export function showConfirm(
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
): void {
  platformAlert(title, message, [
    { text: 'Cancel', style: 'cancel', onPress: onCancel },
    { text: 'OK', onPress: onConfirm },
  ]);
}