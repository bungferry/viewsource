<template>
  <div class="container">
    <h1>View Source Online</h1>
    
    <div class="controls">
      <input 
        type="text" 
        id="urlInput" 
        placeholder="https://example.com" 
        v-model="urlInput" 
        @keyup.enter="fetchSource"
      />
      <button id="viewBtn" @click="fetchSource">View Source</button>
    </div>

    <div class="options">
      <label><input type="checkbox" id="useProxy" v-model="useProxy"> Gunakan Proxy Statis</label>
      <label><input type="checkbox" id="useLocalProxy" v-model="useLocalProxy"> Gunakan Proxy Lokal</label>
    </div>

    <div id="status" v-html="statusMessage"></div>

    <div class="code-container">
      <div class="code-actions" :class="{ active: showActions }" id="codeActions">
        <button id="copyBtn" @click="copyCode"><i class="fas fa-copy"></i> Salin</button>
        <button id="downloadBtn" @click="downloadCode"><i class="fas fa-download"></i> Unduh</button>
      </div>
      <pre><code id="codeBlock" class="html" ref="codeBlockRef"></code></pre>
    </div>

    <footer>View Source dibuat dengan <i class="fa-solid fa-heart love"></i> oleh <a href="https://bungferry.github.io/">Ferry Ayunda</a>. </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
// Import library yang sebelumnya dimuat melalui CDN
// Catatan: Anda perlu menginstal ini via npm/yarn jika belum
// Contoh: npm install highlight.js js-beautify highlightjs-line-numbers
import hljs from 'highlight.js';
import { html_beautify } from 'js-beautify';
import hljsLinenumbers from 'highlightjs-line-numbers'; 

// Inisialisasi plugin line numbers
hljs.initLineNumbersOnLoad = false;
hljsLinenumbers(hljs);

// --- STATE MANAGEMENT (menggunakan ref) ---
const DEFAULT_URL = 'https://example.com';
const FALLBACK_FETCH_PROXY = 'https://api.allorigins.win/raw?url=';
const LOCAL_PROXY_BASE_URL = '/proxy?url=';

const urlInput = ref(DEFAULT_URL);
const useProxy = ref(true); // default true seperti di HTML
const useLocalProxy = ref(false);
const statusMessage = ref('');
const codeBlockRef = ref(null); // Ref untuk elemen <code>
const showActions = ref(false);
let lastBlobUrl = null; 

// --- HELPER FUNCTIONS ---

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// --- ACTION HANDLERS ---

function copyCode() {
    const codeText = codeBlockRef.value.textContent;
    navigator.clipboard.writeText(codeText).then(() => {
        alert('Kode sumber berhasil disalin!');
    }).catch(err => {
        console.error('Gagal menyalin: ', err);
        alert('Gagal menyalin kode. Browser Anda mungkin tidak mendukung fitur ini.');
    });
}

function downloadCode() {
    const codeText = codeBlockRef.value.textContent;
    const url = urlInput.value.trim();
    let fileName = 'source.html';
    try {
        const urlObj = new URL(url);
        fileName = urlObj.pathname.split('/').pop() || 'source.html';
        if (!fileName.includes('.')) fileName += '.html';
    } catch (e) {
        fileName = 'source.html';
    }
    const blob = new Blob([codeText], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- CORE FETCH LOGIC ---

async function fetchSource() {
  const url = urlInput.value.trim();
  if (!url) {
    statusMessage.value = 'Masukkan URL yang valid.';
    return;
  }
    
  if (codeBlockRef.value) codeBlockRef.value.textContent = '';
  showActions.value = false;
  
  // Hapus URL blob lama sebelum fetch baru
  if (lastBlobUrl) {
      URL.revokeObjectURL(lastBlobUrl);
      lastBlobUrl = null;
  }
  
  let finalFetchUrl = url;
  let usedProxyInfo = 'langsung';

  if (useProxy.value) {
      finalFetchUrl = FALLBACK_FETCH_PROXY + encodeURIComponent(url);
      usedProxyInfo = 'proxy allorigins.win';
  } else if (useLocalProxy.value) {
      finalFetchUrl = LOCAL_PROXY_BASE_URL + encodeURIComponent(url);
      usedProxyInfo = 'proxy lokal';
  }

  const startTime = performance.now();
  
  try {
    statusMessage.value = `Mengambil kode sumber dari ${url} (melalui ${usedProxyInfo})...`;
    const res = await fetch(finalFetchUrl);
    
    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(6);

    if (!res.ok) throw new Error(`Gagal memuat kode: ${res.status} ${res.statusText}`);
    
    const html = await res.text();
    
    const encoder = new TextEncoder();
    const byteLength = encoder.encode(html).length;
    const formattedSize = formatBytes(byteLength);
    
    const formattedHtml = html_beautify(html, {
        indent_size: 2,
        space_in_empty_paren: true,
        end_with_newline: true
    });

    // Perbarui konten setelah DOM di-update
    await nextTick(); 
    if (codeBlockRef.value) {
        codeBlockRef.value.textContent = formattedHtml;
        
        // Lakukan highlighting dan line numbers
        hljs.highlightElement(codeBlockRef.value);
        hljs.lineNumbersBlock(codeBlockRef.value);
    }

    // --- PEMBUATAN URL BLOB ---
    const baseTag = `<base href="${url}">`;
    const htmlWithBase = formattedHtml.replace(/<head[^>]*>/i, `$&${baseTag}`);
    const blob = new Blob([htmlWithBase], { type: 'text/html' });
    const previewBlobUrl = URL.createObjectURL(blob);
    lastBlobUrl = previewBlobUrl; 
    
    // --- PEMBARUAN STATUS DENGAN LINK BLOB TERSEMBUNYI ---
    const statusText = `Fetched ${formattedSize} in ${duration} seconds. <br> Sumber Preview: <a href="${previewBlobUrl}" target="_blank">${url}</a>`;
        
    statusMessage.value = statusText; 

    if (url.trim() !== DEFAULT_URL) showActions.value = true;

  } catch (err) {
    statusMessage.value = `Error: ${err.message}. Gagal mengambil sumber dari ${url}`;
    if (codeBlockRef.value) {
        codeBlockRef.value.textContent = 'Gagal memuat konten. Periksa URL dan koneksi Anda, atau coba proxy lain.';
    }
    showActions.value = false;
  }
}

// --- LIFECYCLE HOOKS ---

onMounted(() => {
    // Jalankan fetch awal saat komponen dimuat
    fetchSource(); 
});

onUnmounted(() => {
    // Revoke URL Blob saat komponen di-unmount
    if (lastBlobUrl) {
        URL.revokeObjectURL(lastBlobUrl);
    }
});
</script>
