export function contactDetails(html = '') {
  const document = new DOMParser().parseFromString(String(html), 'text/html')
  document.querySelectorAll('script, style, iframe, object').forEach((node) => node.remove())
  const text = document.body.textContent.trim()
  const mailLink =
    document.querySelector('a[href^="mailto:"]')?.getAttribute('href')?.slice(7).split('?')[0] || ''
  const email = (mailLink || text).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || ''
  return { text, email }
}

export function contactMailto(email, name, replyTo, message) {
  return (
    'mailto:' +
    encodeURIComponent(email) +
    '?subject=' +
    encodeURIComponent('SocialKNKT support request') +
    '&body=' +
    encodeURIComponent('Name: ' + name + '\nEmail: ' + replyTo + '\n\n' + message)
  )
}
