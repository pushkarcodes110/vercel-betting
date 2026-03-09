export const parseDate = (dateStr?: string | null): Date => {
  if (!dateStr) {
    const now = new Date()
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  }

  const parsed = new Date(`${dateStr}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD')
  }
  return parsed
}

export const formatDate = (date: Date): string => date.toISOString().slice(0, 10)

export const formatIstDateTime = (date: Date): string => {
  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })

  const parts = formatter
    .formatToParts(date)
    .filter((part) => part.type !== 'literal')
    .reduce<Record<string, string>>((acc, part) => {
      acc[part.type] = part.value
      return acc
    }, {})

  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second} ${parts.dayPeriod} IST`
}
