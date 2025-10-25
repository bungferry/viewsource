import { createApp } from 'vue'
import App from './App.vue'
import './styles.css' // Import CSS global (jika ada)
import 'highlight.js/styles/github-dark.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

// ... kode Vue lainnya
// Membuat aplikasi dari komponen App.vue dan menempelkannya ke elemen #app
createApp(App).mount('#app')
