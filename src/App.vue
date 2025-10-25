<script setup>
import { ref, onMounted, nextTick } from 'vue';

// --- IMPORT LIBRARY EXTERNAL (Sudah di-install via npm) ---
import hljs from 'highlight.js/lib/core';
import htmlBeautify from 'js-beautify';
import hljsLinenumbers from 'highlightjs-line-numbers.js';

// Daftarkan bahasa HTML (XML)
import xml from 'highlight.js/lib/languages/xml'; 
hljs.registerLanguage('html', xml);
hljs.addPlugin(hljsLinenumbers); 
// -----------------------------------------------------------

// --- STATE (Data Reaktif) ---
const urlInput = ref('https://example.com');
const codeContent = ref('');
const statusMessage = ref('');
const useProxy = ref(true); // checked
const useLocalProxy = ref(false);
const codeActionsActive = ref(false);
const isLoading = ref(false);
const codeBlockRef = ref(null); // Ref untuk elemen <code>
let lastBlobUrl = null; 

// --- KONSTANTA ---
const DEFAULT_URL = 'https://example.com';
const FALLBACK_FETCH_PROXY = 'https://api.allorigins.win/raw?url=';
const LOCAL_PROXY_BASE_URL = '/proxy?url=';

// --- FUNGSI UTILITAS ---
function showCodeActions(url) {
    codeActionsActive.value = (url.trim() !== DEFAULT_URL);
}

function hideCodeActions() {
    codeActionsActive.value = false;
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// --- FUNGSI AKSI ---

function copyCode() {
    const codeText = codeContent.value;
    navigator.clipboard.writeText(codeText).then(() => {
        alert('Kode sumber berhasil disalin!');
    }).catch(err => {
        console.error('Gagal menyalin: ', err);
        alert('Gagal menyalin kode. Browser Anda mungkin tidak mendukung fitur ini.');
    });
}

function downloadCode() {
    const codeText = codeContent.value;
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

async function fetchSource(url) {
    if (!url) {
        statusMessage.value = 'Masukkan URL yang valid.';
        return;
    }
    
    isLoading.value = true;
    codeContent.value = '';
    hideCodeActions();
    statusMessage.value = '';

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
        
        const formattedHtml = htmlBeautify.html_beautify(html, {
            indent_size: 2,
            space_in_empty_paren: true,
            end_with_newline: true
        });

        codeContent.value = formattedHtml;
        
        // Tunggu DOM diupdate
        await nextTick();
        
        // Lakukan highlighting dan line numbers
        if (codeBlockRef.value) {
            hljs.highlightElement(codeBlockRef.value);
            if (codeBlockRef.value.textContent.trim().length > 0) {
              hljs.lineNumbersBlock(codeBlockRef.value);
            }
        }

        // --- PEMBUATAN URL BLOB ---
        const baseTag = `<base href="${url}">`;
        const htmlWithBase = formattedHtml.replace(/<head[^>]*>/i, `$&${baseTag}`);
        const blob = new Blob([htmlWithBase], { type: 'text/html' });
        const previewBlobUrl = URL.createObjectURL(blob);
        lastBlobUrl = previewBlobUrl; 
        
        // PEMBARUAN STATUS DENGAN LINK BLOB
        statusMessage.value = `Fetched ${formattedSize} in ${duration} seconds. <br> Sumber Preview: <a href="${previewBlobUrl}" target="_blank">${url}</a>`;

        showCodeActions(url);

    } catch (err) {
        statusMessage.value = `Error: ${err.message}. Gagal mengambil sumber dari ${url}`;
        codeContent.value = 'Gagal memuat konten. Periksa URL dan koneksi Anda, atau coba proxy lain.';
        hideCodeActions();
    } finally {
        isLoading.value = false;
    }
}

// --- LIFECYCLE HOOKS (Mengganti onload dan addEventListener) ---
onMounted(() => {
    fetchSource(urlInput.value.trim());
});

window.addEventListener('unload', () => {
    if (lastBlobUrl) {
        URL.revokeObjectURL(lastBlobUrl);
    }
});
</script>

<template>
  <div class="container">
    <h1>View Source Online</h1>
    
    <div class="controls">
      <input type="text" v-model="urlInput" placeholder="https://example.com" />
      <button @click="fetchSource(urlInput.trim())" :disabled="isLoading">
        {{ isLoading ? 'Memuat...' : 'View Source' }}
      </button>
    </div>
    
    <div class="options">
      <label><input type="checkbox" v-model="useProxy"> Gunakan Proxy Statis</label>
      <label><input type="checkbox" v-model="useLocalProxy"> Gunakan Proxy Lokal</label>
    </div>
    
    <div id="status" v-html="statusMessage"></div>
    
    <div class="code-container">
        <div class="code-actions" :class="{ active: codeActionsActive }">
            <button @click="copyCode"><i class="fas fa-copy"></i> Salin</button>
            <button @click="downloadCode"><i class="fas fa-download"></i> Unduh</button>
        </div>
        <pre><code ref="codeBlockRef" id="codeBlock" class="html">{{ codeContent }}</code></pre>
    </div>
    
    <footer>View Source dibuat dengan <i class="fa-solid fa-heart love"></i> oleh <a href="https://bungferry.github.io/">Ferry Ayunda</a>. </footer>
  </div>
</template>
