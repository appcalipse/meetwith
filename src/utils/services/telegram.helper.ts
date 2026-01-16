import { TelegramUserInfo } from '@meta/Telegram'

const apiUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

export const sendDm = async (chat_id: string, text: string) => {
  const response = await fetch(`${apiUrl}/sendMessage`, {
    body: JSON.stringify({
      chat_id,
      text,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  return await response.json()
}

export const getTelegramUserInfo = async (
  chat_id: string
): Promise<TelegramUserInfo | null> => {
  try {
    const response = await fetch(`${apiUrl}/getChat`, {
      body: JSON.stringify({
        chat_id,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })

    const data = await response.json()

    if (data.ok) {
      return {
        first_name: data.result?.first_name,
        id: data.result?.id,
        last_name: data.result?.last_name,
        username: data.result?.username,
      }
    }

    return null
  } catch (error) {
    console.error('Error fetching Telegram user info:', error)
    return null
  }
}
