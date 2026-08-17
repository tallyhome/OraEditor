export function parseSemver(version: string): { major: number; minor: number; patch: number } {
  const [major = "0", minor = "0", patch = "0"] = version.trim().replace(/^v/, "").split(".");
  return {
    major: Number(major) || 0,
    minor: Number(minor) || 0,
    patch: Number.parseInt(patch, 10) || 0,
  };
}

function compare(a: string, b: string): number {
  const left = parseSemver(a);
  const right = parseSemver(b);
  if (left.major !== right.major) {
    return left.major - right.major;
  }
  if (left.minor !== right.minor) {
    return left.minor - right.minor;
  }
  return left.patch - right.patch;
}

export function satisfies(version: string, range: string): boolean {
  const trimmed = range.trim();
  if (trimmed === "*" || trimmed === "") {
    return true;
  }
  if (trimmed.startsWith("^")) {
    const base = parseSemver(trimmed.slice(1));
    const current = parseSemver(version);
    if (compare(version, trimmed.slice(1)) < 0) {
      return false;
    }
    if (base.major === 0) {
      return current.major === 0 && current.minor === base.minor;
    }
    return current.major === base.major;
  }
  if (trimmed.startsWith(">=")) {
    return compare(version, trimmed.slice(2).trim()) >= 0;
  }
  if (trimmed.startsWith("<=")) {
    return compare(version, trimmed.slice(2).trim()) <= 0;
  }
  return version.replace(/^v/, "") === trimmed.replace(/^v/, "");
}
