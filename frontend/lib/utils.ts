export function cn(...cls: Array<string | false | undefined | null>) {
  return cls.filter(Boolean).join(" ");
}
