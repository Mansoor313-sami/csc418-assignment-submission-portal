import {saveSubmission, listSubmissions} from './portal.mjs';
const form = document.querySelector('form');
const message = document.querySelector('#message');
function render() {
  const items = listSubmissions(localStorage);
  document.querySelector('#count').textContent = items.length;
  const container = document.querySelector('#submissions');
  container.replaceChildren();
  if (!items.length) {
    container.innerHTML = '<div class="empty"><div class="empty-symbol">▤</div><h3>A fresh start for your next submission</h3><p>Your saved assignments will appear here.<br>Add your first submission using the form.</p></div>';
    return;
  }
  for (const item of items) {
    const article = document.createElement('article'); article.className = 'submission';
    const top = document.createElement('div'); top.className='submission-top';
    const title = document.createElement('h3'); title.textContent = item.title;
    const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = 'SAVED';
    top.append(title, badge);
    const meta = document.createElement('div'); meta.className = 'meta'; meta.textContent = `${item.name}  ·  ${item.registration}`;
    const link = document.createElement('a'); link.textContent = item.url; link.href = item.url; link.target='_blank'; link.rel='noopener noreferrer';
    const date = document.createElement('time'); date.dateTime=item.submittedAt; date.textContent = new Date(item.submittedAt).toLocaleString();
    article.append(top, meta, link, date); container.append(article);
  }
}
form.addEventListener('submit', event => {
  event.preventDefault();
  for (const field of ['name','registration','title','url']) {document.querySelector(`#${field}-error`).textContent='';document.querySelector(`#${field}`).removeAttribute('aria-invalid');}
  try {
    const result = saveSubmission(Object.fromEntries(new FormData(form)), localStorage);
    if (!result.ok) {
      for (const [field,error] of Object.entries(result.errors)) {document.querySelector(`#${field}-error`).textContent=error;document.querySelector(`#${field}`).setAttribute('aria-invalid','true');}
      message.className='failure'; message.textContent='Please check the highlighted fields. Your submission was not saved.';
      document.querySelector('[aria-invalid=true]')?.focus(); return;
    }
    message.className='';message.textContent='Submission saved. Your assignment is now in the list.'; form.reset(); render();
  } catch {message.className='failure'; message.textContent='Could not save your submission. Check that browser storage is available.';}
});
try {render();} catch {message.className='failure'; message.textContent='Could not read saved submissions. Please check your browser storage.';}
