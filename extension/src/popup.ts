// Popup entry point. Scaffold for now — the scan flow, hint, and fallbacks are
// wired up in later commits. Kept deliberately minimal so the unpacked
// extension loads and shows the shell.
const app = document.querySelector<HTMLDivElement>('#app')!;

const header = document.createElement('header');
const h1 = document.createElement('h1');
h1.textContent = 'ClearClause';
const tagline = document.createElement('p');
tagline.className = 'tagline';
tagline.textContent = 'See what this page’s privacy policy actually says.';
header.append(h1, tagline);
app.append(header);
