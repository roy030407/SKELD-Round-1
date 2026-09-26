import { redirect } from 'next/navigation'

// Registration used to show the player's code here, then make them go log
// in separately. Registration now logs the player straight into their own
// session and takes them directly to /player (which shows a one-time "save
// your code" banner), so nothing links here anymore - redirect just in case
// an old tab or bookmark still does.
export default function RegisterSuccessRedirect() {
  redirect('/player')
}
