import { getTypeDossierLabel } from './constants'

/**
 * Generate an .ics file content for a prospect relance
 */
export function generateICS(prospect, { title, description, date, durationMinutes = 30 }) {
  const start = new Date(date)
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000)

  const formatICSDate = (d) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CRM Avocat Restaurateurs//FR',
    'BEGIN:VEVENT',
    `DTSTART:${formatICSDate(start)}`,
    `DTEND:${formatICSDate(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    `UID:${prospect.id}-${start.getTime()}@crm-avocat`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  return ics
}

/**
 * Download an .ics file
 */
export function downloadICS(prospect, date) {
  const typeDossier = getTypeDossierLabel(prospect.type_dossier)
  const title = `Relance — ${prospect.nom}`
  const description = [
    `Prospect : ${prospect.nom}`,
    prospect.etablissement ? `Établissement : ${prospect.etablissement}` : null,
    `Type : ${typeDossier}`,
    prospect.telephone ? `Tél : ${prospect.telephone}` : null,
    prospect.email ? `Email : ${prospect.email}` : null,
  ].filter(Boolean).join('\n')

  const ics = generateICS(prospect, { title, description, date })
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `relance-${prospect.nom.replace(/\s+/g, '-').toLowerCase()}.ics`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Google Calendar URL
 */
export function getGoogleCalUrl(prospect, date) {
  const typeDossier = getTypeDossierLabel(prospect.type_dossier)
  const start = new Date(date)
  const end = new Date(start.getTime() + 30 * 60 * 1000)

  const formatGCal = (d) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

  const title = `Relance — ${prospect.nom}`
  const details = [
    `Type : ${typeDossier}`,
    prospect.telephone ? `Tél : ${prospect.telephone}` : null,
    prospect.email ? `Email : ${prospect.email}` : null,
  ].filter(Boolean).join('\n')

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatGCal(start)}/${formatGCal(end)}`,
    details,
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Outlook Web URL
 */
export function getOutlookCalUrl(prospect, date) {
  const typeDossier = getTypeDossierLabel(prospect.type_dossier)
  const start = new Date(date)
  const end = new Date(start.getTime() + 30 * 60 * 1000)

  const title = `Relance — ${prospect.nom}`
  const body = [
    `Type : ${typeDossier}`,
    prospect.telephone ? `Tél : ${prospect.telephone}` : null,
    prospect.email ? `Email : ${prospect.email}` : null,
  ].filter(Boolean).join('\n')

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: title,
    body,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
  })

  return `https://outlook.live.com/calendar/0/action/compose?${params.toString()}`
}
