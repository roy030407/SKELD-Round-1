import { redirect } from 'next/navigation'

// Check-in used to be a separate manual "confirm you've arrived" step after
// registering and logging in. Registration now checks the player in
// automatically (filling out the form in person at the venue IS check-in),
// so this page's job is done before anyone can reach it - anything still
// linking here (an old tab, a bookmark, a QR code someone printed) should
// just land where a player actually wants to be.
export default function CheckInRedirect() {
  redirect('/player')
}
