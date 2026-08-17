const EMBED_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "www.youtube-nocookie.com",
  "youtube-nocookie.com",
  "player.vimeo.com",
]);

export function isSafeEmbedUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:") {
      return false;
    }
    if (!EMBED_HOSTS.has(parsed.hostname)) {
      return false;
    }
    if (parsed.hostname.includes("youtube") && !parsed.pathname.startsWith("/embed/")) {
      return false;
    }
    if (parsed.hostname === "player.vimeo.com" && !parsed.pathname.startsWith("/video/")) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function youtubeToEmbed(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      if (id) {
        return `https://www.youtube.com/embed/${id}`;
      }
      if (parsed.pathname.startsWith("/embed/")) {
        return `https://www.youtube.com/embed/${parsed.pathname.slice("/embed/".length)}`;
      }
    }
    return null;
  } catch {
    return null;
  }
}
