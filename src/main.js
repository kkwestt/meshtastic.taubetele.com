import { createApp } from 'vue';
import HighchartsVue from 'highcharts-vue';
import FontAwesomeIcon from "./utils/fontawesome";
import App from './App.vue'

import './assets/main.scss'

createApp(App)
  .use(HighchartsVue)
  .component("font-awesome-icon", FontAwesomeIcon)
  .mount('#app')