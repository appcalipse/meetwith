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

  return response.json()
}
