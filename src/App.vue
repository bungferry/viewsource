<template>
  <div class="container">
    <h1>View Source Online</h1>

    <!-- Controls -->
    <div class="controls">
      <input
        type="text"
        v-model="urlInput"
        placeholder="https://example.com"
      />
      <button @click="fetchSource(urlInput.trim())" :disabled="isLoading">
        {{ isLoading ? 'Memuat...' : 'View Source' }}
      </button>
    </div>

    <!-- Options -->
    <div class="options">
      <label>
        <input
          type="checkbox"
          v-model="useProxy"
          :disabled="useLocalProxy"
        />
        Gunakan Proxy Statis
      </label>
      <label>
        <input
          type="checkbox"
          v-model="useLocalProxy"
          :disabled="useProxy"
        />
        Gunakan Proxy Lokal
      </label>
    </div>

    <!-- Status -->
    <div id="status" v-html="statusMessage"></div>

    <!-- Code Viewer -->
    <div class="code-container">
      <div class="code-actions" :class="{ active: codeActionsActive }">
        <button @click="copyCode"><i class="fas fa-copy"></i> Salin</button>
        <button @click="downloadCode"><i class="fas fa-download"></i> Unduh</button>
      </div>

      <pre><code ref="codeBlockRef" id="codeBlock" class="html hljs line-numbers">{{ codeContent }}</code></pre>
    </div>

    <footer>
      View Source dibuat dengan
      <i class="fa-solid fa-heart love"></i> oleh
      <a href="https://bungferry.github.io/">Ferry Ayunda</a>.
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from "vue";
import hljs from "highlight.js/lib/core";
import xml from "highlight.js/lib/languages/xml";
import "highlight.js/styles/github-dark.css";
import "highlightjs-line-numbers.js";
import htmlBeautify from "js-beautify";

// Daftarkan bahasa HTML
hljs.registerLanguage("html", xml);

const urlInput = ref("https://example.com");
const codeContent = ref("");
const statusMessage = ref("");
const useProxy = ref(true);
const useLocalProxy = ref(false);
const codeActionsActive = ref(false);
const isLoading = ref(false);
const codeBlockRef = ref(null);
let lastBlobUrl = null;

// Konstanta URL
const DEFAULT_URL = "https://example.com";
const FALLBACK_FETCH_PROXY = "https://api.allorigins.win/raw?url=";
const LOCAL_PROXY_BASE_URL = "/proxy?url=";

// Utilitas
function showCodeActions(url) {
  codeActionsActive.value = url.trim() !== DEFAULT_URL;
}
function hideCodeActions() {
  codeActionsActive.value = false;
}
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
function cleanSourceCode(html) {
  let cleanedHtml = html;
  cleanedHtml = cleanedHtml.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  cleanedHtml = cleanedHtml.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  return cleanedHtml.trim();
}

// Aksi tombol
function copyCode() {
  navigator.clipboard
    .writeText(codeContent.value)
    .then(() => alert("Kode sumber berhasil disalin!"))
    .catch(() => alert("Gagal menyalin kode."));
}

function downloadCode() {
  const codeText = codeContent.value;
  const url = urlInput.value.trim();
  let fileName = "source.html";
  try {
    const urlObj = new URL(url);
    fileName = urlObj.pathname.split("/").pop() || "source.html";
    if (!fileName.includes(".")) fileName += ".html";
  } catch {
    fileName = "source.html";
  }
  const blob = new Blob([codeText], { type: "text/html" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Ambil kode sumber
async function fetchSource(url) {
  if (!url) {
    statusMessage.value = "Masukkan URL yang valid.";
    return;
  }

  isLoading.value = true;
  codeContent.value = "";
  hideCodeActions();
  statusMessage.value = "";

  if (lastBlobUrl) {
    URL.revokeObjectURL(lastBlobUrl);
    lastBlobUrl = null;
  }

  let finalFetchUrl = url;
  let usedProxyInfo = "langsung";

  if (useLocalProxy.value) {
    finalFetchUrl = LOCAL_PROXY_BASE_URL + encodeURIComponent(url);
    usedProxyInfo = "proxy lokal";
  } else if (useProxy.value) {
    finalFetchUrl = FALLBACK_FETCH_PROXY + encodeURIComponent(url);
    usedProxyInfo = "proxy allorigins.win";
  }

  const startTime = performance.now();

  try {
    statusMessage.value = `Mengambil kode sumber dari ${url} (melalui ${usedProxyInfo})...`;
    const res = await fetch(finalFetchUrl);
    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(6);

    if (!res.ok)
      throw new Error(`Gagal memuat kode: ${res.status} ${res.statusText}`);

    const html = await res.text();
    const cleanedHtml = cleanSourceCode(html);

    const encoder = new TextEncoder();
    const byteLength = encoder.encode(cleanedHtml).length;
    const formattedSize = formatBytes(byteLength);

    const formattedHtml = htmlBeautify.html_beautify(cleanedHtml, {
      indent_size: 2,
      space_in_empty_paren: true,
      end_with_newline: true,
    });

    codeContent.value = formattedHtml;
    await nextTick();

    // Highlight dan line number
    if (codeBlockRef.value) {
      hljs.highlightElement(codeBlockRef.value);
      if (typeof hljs.lineNumbersBlock === "function") {
        hljs.lineNumbersBlock(codeBlockRef.value);
      }
    }

    const baseTag = `<base href="${url}">`;
    const htmlWithBase = formattedHtml.replace(
      /<head[^>]*>/i,
      `$&${baseTag}`
    );
    const blob = new Blob([htmlWithBase], { type: "text/html" });
    const previewBlobUrl = URL.createObjectURL(blob);
    lastBlobUrl = previewBlobUrl;

    statusMessage.value = `Fetched ${formattedSize} in ${duration} seconds. <br> Sumber Preview: <a href="${previewBlobUrl}" target="_blank">${url}</a>`;

    showCodeActions(url);
  } catch (err) {
    console.error("FETCH ERROR DETAIL:", err);
    statusMessage.value = `Error: ${err.message}. Gagal memuat konten.`;
    codeContent.value = "Gagal memuat konten.";
    hideCodeActions();
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchSource(urlInput.value.trim());
});

window.addEventListener("unload", () => {
  if (lastBlobUrl) URL.revokeObjectURL(lastBlobUrl);
});
</script>
