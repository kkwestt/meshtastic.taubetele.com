import { createApp } from 'vue'
import FontAwesomeIcon from "./utils/fontawesome";
import App from './App.vue'

import './assets/main.scss'

createApp(App)
  .component("font-awesome-icon", FontAwesomeIcon)
  .mount('#app')