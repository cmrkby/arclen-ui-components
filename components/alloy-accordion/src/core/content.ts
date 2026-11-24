const chatSilver = new URL('../../assets/chat-silver.webp', import.meta.url).href;
const notesSilver = new URL('../../assets/notes-silver.webp', import.meta.url).href;
const filesSilver = new URL('../../assets/files-silver.webp', import.meta.url).href;
const calendarSilver = new URL('../../assets/calendar-silver.webp', import.meta.url).href;
const mailSilver = new URL('../../assets/mail-silver.webp', import.meta.url).href;
const mail = new URL('../../assets/mail.webp', import.meta.url).href;
const calendar = new URL('../../assets/calendar.webp', import.meta.url).href;
const files = new URL('../../assets/files.webp', import.meta.url).href;
const notes = new URL('../../assets/notes.webp', import.meta.url).href;
const chat = new URL('../../assets/chat.webp', import.meta.url).href;

export const items = [
  {
    title: 'Mail', id: 'mail', image: mail, silver: mailSilver, colourKey: 'mailColor', scaleKey: 'mailScale',
    description: "Find the thread with the latest feedback. Reply while the brief is still open.",
    alt: "A letter rising from a polished envelope", action: "Open Gmail", href: "https://mail.google.com/",
  },
  {
    title: 'Calendar', id: 'calendar', image: calendar, silver: calendarSilver, colourKey: 'calendarColor', scaleKey: 'calendarScale',
    description: "Find a time for the review and put the project link in the invite.",
    alt: "A polished calendar with two polished binding loops", action: "Open Google Calendar", href: "https://calendar.google.com/",
  },
  {
    title: 'Files', id: 'files', image: files, silver: filesSilver, colourKey: 'filesColor', scaleKey: 'filesScale',
    description: "Keep the approved artwork and the final export in the same project folder.",
    alt: "Two tabbed polished file folders", action: "Open Google Drive", href: "https://drive.google.com/",
  },
  {
    title: 'Notes', id: 'notes', image: notes, silver: notesSilver, colourKey: 'notesColor', scaleKey: 'notesScale',
    description: "Write down the decision while it’s fresh. Keep the reason beside it.",
    alt: "A polished notepad and pencil", action: "Open Google Keep", href: "https://keep.google.com/",
  },
  {
    title: 'Chat', id: 'chat', image: chat, silver: chatSilver, colourKey: 'chatColor', scaleKey: 'chatScale',
    description: "Share the latest draft in the project channel and ask for one specific change.",
    alt: "Two overlapping polished speech bubbles", action: "Open Slack", href: "https://app.slack.com/",
  },
] as const;
