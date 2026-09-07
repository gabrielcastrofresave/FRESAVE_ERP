// src/pages/api/whatsapp/start.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { initWhatsAppBot } from '../../utils/whatsapp-bot';

let botInstance: any = null;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!botInstance) {
      botInstance = await initWhatsAppBot();
      return res.status(200).json({ 
        status: 'Bot iniciado com sucesso' 
      });
    } else {
      return res.status(200).json({ 
        status: 'Bot já está ativo' 
      });
    }
  } catch (error) {
    return res.status(500).json({ 
      error: 'Erro ao iniciar bot' 
    });
  }
}