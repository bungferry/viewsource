<template>
  <div class="container">
    <h1>View Source Online</h1>

    <!-- Controls -->
    <div class="controls">
      <input
        type="text"
        v-model="urlInput"
        placeholder="https://example.com"
        @keyup.enter="fetchSource(urlInput.trim())"
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

      <pre><code ref="codeBlockRef" id="codeBlock" class="html hljs">
{{ codeContent }}
</code></pre>
    </div>

    <footer>
      View Source dibuat dengan
      <i class="fa-solid fa-heart love"></i> oleh
      <a href="https://bungferry.github.io/">Ferry Ayunda</a>.
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import hljs from "highlight.js/lib/core";
import xml from "highlight.js/lib/languages/xml";
import "highlight.js/styles/github-dark.css";
import "highlightjs-line-numbers.js";

// Register language
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

// Fungsi fetchSource
async function fetchSource(url) {
  if (!url) {
    statusMessage.value = "URL tidak valid.";
    return;
  }
  isLoading.value = true;
  statusMessage.value = "Memuat sumber...";
  codeContent.value = "";
  try {
    const response = await fetchSourceFromUrl(url);
    if (response) {
      codeContent.value = response;
      // Setelah update DOM, lakukan highlight
      await nextTick();
      hljs.highlightBlock(codeBlockRef.value);
      // Aktifkan line number
      hljs.lineNumbersBlock(codeBlockRef.value);
      // Tampilkan aksi
      toggleCodeActions(true);
      statusMessage.value = "Sumber berhasil dimuat.";
    } else {
      statusMessage.value = "Gagal memuat sumber.";
    }
  } catch (error) {
    statusMessage.value = "Error: " + error.message;
  } finally {
    isLoading.value = false;
  }
}

// Fungsi fetch dari URL
async function fetchSourceFromUrl(url) {
  // di sini bisa menyesuaikan proxy jika perlu
  const response = await fetch(url);
  if (response.ok) {
    return await response.text();
  }
  throw new Error("Gagal fetch");
}

// Fungsi copy code
function copyCode() {
  navigator.clipboard.writeText(codeContent.value).then(() => {
    alert("Kode disalin!");
  });
}

// Fungsi download code
function downloadCode() {
  const blob = new Blob([codeContent.value], { type: "text/plain" });
  if (lastBlobUrl) URL.revokeObjectURL(lastBlobUrl);
  lastBlobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = lastBlobUrl;
  a.download = "source.html";
  a.click();
}

// Toggle aksi tombol
function toggleCodeActions(show) {
  codeActionsActive.value = show;
}

onMounted(() => {
  fetchSource(urlInput.value.trim());
});
</script>

<style scoped>
/* Tambahkan CSS dari styles.css disini, atau import dari file eksternal */
@import './styles.css';
</style>
