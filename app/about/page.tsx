import { redirect } from "next/navigation";

// The About screen now lives inside the Profile page as a bottom
// pull-up card (see app/profile/page.tsx). This route is kept only
// so any old links (e.g. bookmarks, the previous bottom-nav tab)
// still land somewhere sensible instead of 404ing.
export default function AboutPage() {
  redirect("/profile");
}

