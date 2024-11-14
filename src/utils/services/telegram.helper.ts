const apiUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`

export const sendDm = async (chat_id: string, text: string) => {
  console.log({
    chat_id,
    text,
  })
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
