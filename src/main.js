import { createApp } from 'vue';
import HighchartsVue from 'highcharts-vue';
import FontAwesomeIcon from "./utils/fontawesome";
import App from './App.vue'

import './assets/main.scss'

// Fetch the lang attribute from the HTML <html> tag
const htmlLang = document.documentElement.lang;

// Function to dynamically load the Yandex Maps API script
function loadYandexMapsScript() {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const apiKey = '8306b373-137c-462d-abe5-7601474f062b';
    script.src = `https://api-maps.yandex.ru/2.1/?lang=${htmlLang}&apikey=${apiKey}`;
    script.type = 'text/javascript';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Load the Yandex Maps API script and then initialize the app
loadYandexMapsScript().then(() => {
  console.log('Yandex Maps API script loaded');
  // Initialize the Vue app
  const app = createApp(App)
    .use(HighchartsVue)
    .component("font-awesome-icon", FontAwesomeIcon);

  // Make the lang attribute available globally within the Vue app
  app.config.globalProperties.$htmlLang = htmlLang;
  app.mount('#app');
}).catch(error => {
  console.error('Failed to load the Yandex Maps API script:', error);
});
