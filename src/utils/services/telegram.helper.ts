const apiUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

export const sendDm = async (chat_id: string, text: string) => {
  const response = await fetch(`${apiUrl}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id,
      text,
    }),
  })

  return await response.json()
}

export const getTelegramUserInfo = async (chat_id: string) => {
  try {
    const response = await fetch(`${apiUrl}/getChat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id,
      }),
    })

    const data = await response.json()

    if (data.ok) {
      return {
        username: data.result?.username,
        first_name: data.result?.first_name,
        last_name: data.result?.last_name,
        id: data.result?.id,
      }
    }

    return null
  } catch (error) {
    console.error('Error fetching Telegram user info:', error)
    return null
  }
}
