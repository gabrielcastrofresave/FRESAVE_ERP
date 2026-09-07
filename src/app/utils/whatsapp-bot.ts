// src/utils/whatsapp-bot.ts
import makeWASocket, { 
  useMultiFileAuthState,
  DisconnectReason 
} from '@whiskeysockets/baileys';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const conversationState = new Map();

export async function initWhatsAppBot() {
  const { state, saveCreds } = await useMultiFileAuthState(
    './whatsapp_auth'
  );

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const text = 
      msg.message.conversation || 
      msg.message.extendedTextMessage?.text || '';

    await handleMessage(sock, from, text);
  });

  return sock;
}

async function handleMessage(sock: any, from: string, text: string) {
  const state = conversationState.get(from) || { step: 0 };

  switch (state.step) {
    case 0:
      conversationState.set(from, { step: 1 });
      await sock.sendMessage(from, { 
        text: 'Olá! Indique a matrícula da viatura:' 
      });
      break;

    case 1:
      conversationState.set(from, { 
        step: 2, 
        matricula: text.toUpperCase() 
      });
      await sock.sendMessage(from, { 
        text: 'Obrigado! Agora indique os quilómetros:' 
      });
      break;

    case 2:
      const kms = parseInt(text.replace(/\D/g, ''));
      
      if (isNaN(kms)) {
        await sock.sendMessage(from, { 
          text: 'Por favor indique um número válido.' 
        });
        return;
      }

      const { error } = await supabase
        .from('viaturas')
        .upsert({
          matricula: state.matricula,
          kms,
          telefone: from,
          updated_at: new Date().toISOString()
        });

      await sock.sendMessage(from, { 
        text: error 
          ? '❌ Erro ao guardar dados' 
          : `✅ Dados guardados!\nMatrícula: ${state.matricula}\nKms: ${kms}`
      });

      conversationState.delete(from);
      break;
  }
}