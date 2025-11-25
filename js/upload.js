// upload.js - handles file selection, validation, compression, saving to IndexedDB

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED = ["image/jpeg","image/png","image/webp","image/gif","video/mp4","video/webm"];

function bytesToHuman(n){
  if (!n) return '0 B';
  const k=1024, sizes=['B','KB','MB','GB'];
  const i=Math.floor(Math.log(n)/Math.log(k));
  return `${(n/Math.pow(k,i)).toFixed(2)} ${sizes[i]}`;
}

function makeId(){
  return 'f_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
}

async function compressImageIfNeeded(file, maxBytes=MAX_SIZE){
  if (file.size <= maxBytes) return file;
  // Use canvas
  return new Promise((res, rej) => {
    const img = document.createElement("img");
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    img.onload = async () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      // scale down to reduce size
      const maxDim = Math.max(img.width, img.height);
      const scale = maxDim > 2000 ? 2000 / maxDim : 1;
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      let quality = 0.9;
      const tryBlob = async (q) => {
        return new Promise((r) => {
          canvas.toBlob((b) => r(b), 'image/jpeg', q);
        });
      };

      let blob = await tryBlob(quality);
      while (blob && blob.size > maxBytes && quality > 0.25) {
        quality -= 0.15;
        blob = await tryBlob(quality);
      }
      if (!blob) return rej('Compression failed');
      const newFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: blob.type });
      res(newFile);
    };
    img.onerror = (e) => rej('Image decode error');
    reader.onerror = (e) => rej('Read error');
    reader.readAsDataURL(file);
  });
}

async function renderFilesList() {
  const owner = getCurrentUser();
  const container = document.getElementById("uploadList");
  container.innerHTML = '';
  if (!owner) return;
  const files = await getFilesByOwner(owner);
  if (!files.length) {
    container.innerHTML = '<div class="muted center">No files yet</div>';
    return;
  }

  files.sort((a,b)=>b.createdAt - a.createdAt);
  for (const f of files) {
    const item = document.createElement("div");
    item.className = 'file-item';
    const left = document.createElement("div"); left.className='meta';
    const name = document.createElement("div"); name.className='file-name'; name.textContent = f.name;
    const info = document.createElement("div"); info.className='muted'; info.textContent = ` • ${bytesToHuman(f.size)} • ${f.type}`;
    left.appendChild(name); left.appendChild(info);

    const right = document.createElement("div"); right.className='row';
    const view = document.createElement("button"); view.className='btn ghost'; view.textContent='View';
    const down = document.createElement("button"); down.className='btn ghost'; down.textContent='Download';
    const share = document.createElement("button"); share.className='btn ghost'; share.textContent='Share';
    const del = document.createElement("button"); del.className='btn'; del.textContent='Delete';

    view.onclick = async () => {
      const rec = await getFileById(f.id);
      if (!rec) return alert('File missing');
      const url = URL.createObjectURL(rec.blob);
      window.open(url);
    };
    down.onclick = async () => {
      const rec = await getFileById(f.id);
      if (!rec) return alert('File missing');
      const url = URL.createObjectURL(rec.blob);
      const a = document.createElement('a'); a.href = url; a.download = rec.name; document.body.appendChild(a); a.click(); a.remove();
    };
    share.onclick = async () => {
      const link = `${location.origin}${location.pathname.replace(/[^\/]*$/,'')}view.html?id=${encodeURIComponent(f.id)}`;
      try { await navigator.clipboard.writeText(link); alert('Link copied. Note: works in same browser/profile.'); }
      catch { prompt('Copy link (works in same browser/profile):', link); }
    };
    del.onclick = async () => {
      if (!confirm('Delete this file?')) return;
      await deleteFile(f.id);
      renderFilesList();
    };

    right.appendChild(view); right.appendChild(down); right.appendChild(share); right.appendChild(del);
    item.appendChild(left); item.appendChild(right);
    container.appendChild(item);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const cur = getCurrentUser();
  if (!cur) return window.location.href = 'login.html';
  document.getElementById('user-email').textContent = cur;

  const fileInput = document.getElementById("fileInput");
  const btnUpload = document.getElementById("btnUpload");
  const bar = document.getElementById("upload-bar");
  const ptext = document.getElementById("progress-text");
  const btnLogout = document.getElementById("logoutBtn");
  const btnClear = document.getElementById("btnClear");

  btnUpload.addEventListener("click", async () => {
    const file = fileInput.files[0];
    if (!file) return alert('Choose a file');
    if (!ALLOWED.includes(file.type.split(';')[0])) return alert('Unsupported file type');

    let final = file;
    if (file.size > MAX_SIZE) {
      if (file.type.startsWith('image/')) {
        ptext.textContent = 'Compressing...';
        try { final = await compressImageIfNeeded(file, MAX_SIZE); }
        catch(e) { alert('Compression failed, try smaller file'); return; }
      } else {
        alert('Videos >10MB unsupported in this demo; compress externally.');
        return;
      }
    }

    // read as arrayBuffer then create blob
    const arrBuf = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => rej('Read error');
      r.readAsArrayBuffer(final);
    });
    const blob = new Blob([arrBuf], { type: final.type });
    const rec = {
      id: makeId(),
      owner: cur,
      name: final.name,
      type: final.type,
      size: final.size,
      createdAt: Date.now(),
      blob: blob
    };

    try {
      // simulate progress
      bar.style.width='20%'; ptext.textContent='Saving...';
      await putFile(rec);
      bar.style.width='100%';
      setTimeout(()=>{ bar.style.width='0%'; ptext.textContent=''; }, 600);
      fileInput.value = '';
      renderFilesList();
      alert('Upload done');
    } catch (err) {
      alert('Save failed: ' + err);
    }
  });

  btnLogout && (btnLogout.onclick = () => logoutUser());
  btnClear && (btnClear.onclick = async () => { if(!confirm('Delete all files?')) return; await clearFilesByOwner(cur); renderFilesList(); });

  renderFilesList();
});
