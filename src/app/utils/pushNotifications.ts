import { supabase } from "../api";

// Inicializar push notifications
export const initializePushNotifications = async () => {
  if (!('serviceWorker' in navigator)) {
    console.error('Service Worker não suportado');
    return false;
  }

  try {
    // Registar Service Worker
    const registration =
      await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registado:', registration);

    // Pedir permissão
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Permissão negada');
      return false;
    }

    // Gerar subscription
    const subscription =
      await registration.pushManager.getSubscription();
    if (!subscription) {
      const newSubscription =
        await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey:
            import.meta.env.VITE_VAPID_PUBLIC_KEY,
        });

      // Guardar subscription na Supabase
      await savePushSubscription(newSubscription);
    }

    return true;
  } catch (error) {
    console.error('Erro ao inicializar push:', error);
    return false;
  }
};

// Guardar subscription no Supabase
export const savePushSubscription = async (
  subscription: PushSubscription
) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('push_subscriptions').upsert({
      user_id: user.id,
      subscription: subscription.toJSON(),
      created_at: new Date(),
    });

    console.log('Subscription guardada');
  } catch (error) {
    console.error('Erro ao guardar subscription:', error);
  }
};

// Enviar notificações para o backend
export const sendPushNotifications = async (notifications: any[]) => {
  const notificacoesPush = notifications.filter(
    (n) => n.shouldPush
  );

  if (notificacoesPush.length === 0) return;

  try {
    // Enviar para Supabase processar
    await supabase.functions.invoke('send-notifications', {
      body: {
        notifications: notificacoesPush,
      },
    });
    console.log('Notificações enviadas');
  } catch (error) {
    console.error('Erro ao enviar notificações:', error);
  }
};

// Permissão (mantém se tiveres)
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('Browser não suporta notificações');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};