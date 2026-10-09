const paths = {
  camera: 'M4 8h3l2-3h6l2 3h3v11H4z M15.5 13a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0',
  photo: 'M6 4h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z M21 16l-5-5-9 9 M11 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
  check: 'M5 12.5l4.5 4.5L19 7',
  download: 'M12 3v13 M7 11l5 5 5-5 M5 17v4h14v-4',
  lock: 'M7 10V7a5 5 0 0 1 10 0v3 M5 10h14v11H5z M12 14v3',
} as const;

export function Icon({ name }: { name: keyof typeof paths }) {
  return <svg className="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
