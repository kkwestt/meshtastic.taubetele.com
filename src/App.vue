<template>
  <dots-map
    :devices="devices"
    @infoOpen="handleInfoOpen"
    @devicesCount="handleDevicesCount"
    @searchOpen="handleSearchOpen"
    @devicesModalOpen="handleDevicesModalOpen"
  />

  <modal
    v-if="shouldShowInfoModal"
    title="🌐 Что такое Meshtastic?"
    @close="handleInfoClose"
  >
    <div class="info-section">
      <p>
        <strong>Meshtastic</strong> — это открытая mesh-сеть для автономной
        связи без интернета и сотовой связи. Использует недорогие
        LoRa-радиомодули для создания децентрализованной сети дальнего действия.
      </p>
    </div>

    <div class="info-section">
      <h3>📡 Как это работает?</h3>
      <ul>
        <li>
          <strong>LoRa технология</strong> — связь на расстоянии до 2+ км в
          городе, до 50+ км на открытой местности. Рекорд больше 200 км.
        </li>
        <li>
          <strong>Mesh-сеть</strong> — сообщения автоматически ретранслируются
          через другие узлы
        </li>
        <li>
          <strong>Автономность</strong> — работает от батареи недели/месяцы,
          солнечные панели
        </li>
        <li><strong>Шифрование</strong> — все сообщения защищены AES-256</li>
      </ul>
    </div>

    <div class="info-section">
      <h3>🗺️ Эта карта показывает:</h3>
      <p>
        Публичные узлы Meshtastic-сети в реальном времени. Устройства появляются
        здесь при включении MQTT или подключении к существующей сети.
      </p>

      <div class="devices-counter">
        <strong>📊 Статистика сети:</strong>
        <div class="counter-item">
          <span class="counter-label">Всего узлов:</span>
          <span class="counter-value">{{ devicesCount }}</span>
        </div>
      </div>

      <table class="legend-table">
        <thead>
          <tr>
            <th colspan="2">Условные обозначения</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>🔵</td>
            <td>Узел онлайн (активность менее 6 часов назад)</td>
          </tr>
          <tr>
            <td>🟢</td>
            <td>MQTT узел (gateway = hex_id)</td>
          </tr>
          <tr>
            <td>🔘</td>
            <td>Узел был онлайн (от 6 до 24 часов назад)</td>
          </tr>
          <tr>
            <td>🔴</td>
            <td>Ваша геолокация</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="info-section">
      <h3>🚀 Применение:</h3>
      <ul>
        <li>
          <strong>Экстренная связь</strong> — при отключении интернета/сотовой
          связи
        </li>
        <li><strong>Туризм и походы</strong> — связь в удаленных местах</li>
        <li>
          <strong>Сельская местность</strong> — где нет покрытия операторов
        </li>
        <li>
          <strong>IoT и мониторинг</strong> — датчики, метеостанции, трекеры
        </li>
      </ul>
    </div>

    <div class="info-section">
      <h3>💡 Как подключиться?</h3>
      <p>
        Купите совместимое устройство (LilyGO T-Beam, Heltec, RAK и др.),
        прошейте firmware Meshtastic, настройте через приложение и
        присоединяйтесь к сети!
      </p>
      <p>
        <strong>Подробнее:</strong>
        <a href="https://meshtastic.org" target="_blank" rel="noopener">
          meshtastic.org</a
        >
      </p>
    </div>

    <template v-slot:footer>
      <div class="footer-info">
        🔗 Открытый проект | 📱 Бесплатные приложения | 🌍 Глобальная сеть
      </div>
    </template>
  </modal>

  <search-modal
    v-if="shouldShowSearchModal"
    :devices="devices"
    @close="handleSearchClose"
    @selectDevice="handleDeviceSelect"
  />

  <modal
    v-if="shouldShowDevicesModal"
    title="🔧 Устройства"
    @close="handleDevicesModalClose"
  >
    <div class="info-section">
      <p>Список популярных устройств, используемых в Meshtastic сети:</p>

      <table class="devices-table">
        <thead>
          <tr>
            <th>Устройство</th>
            <th>Описание</th>
            <th>Частота</th>
            <th>Мощность</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>LilyGO T-Beam v1.2</strong></td>
            <td>ESP32 + LoRa + GPS NEO-6M, встроенный аккумулятор</td>
            <td>868 МГц</td>
            <td>22 дБм (0.140 Вт)</td>
            <td>
              <a
                href="https://www.ozon.ru/product/lilygo-ttgo-t-beam-v1-2-esp32-868-mgts-wifi-bluetooth-esp32-gps-neo-6m-podhodit-dlya-1596536893/"
                target="_blank"
                rel="noopener"
                class="buy-link"
              >
                Купить
              </a>
            </td>
          </tr>
          <tr>
            <td><strong>LilyGO T-Beam v1.2</strong></td>
            <td>ESP32 + LoRa + GPS NEO-6M, встроенный аккумулятор</td>
            <td>433 МГц</td>
            <td>22 дБм (0.140 Вт)</td>
            <td>
              <a
                href="https://www.ozon.ru/product/lilygo-ttgo-t-beam-v1-2-esp32-433-mgts-wifi-bluetooth-esp32-gps-neo-6m-podhodit-dlya-2114972062/?oos_search=false"
                target="_blank"
                rel="noopener"
                class="buy-link"
              >
                Купить
              </a>
            </td>
          </tr>
          <tr>
            <td><strong>LilyGO LoRa32 T3S3 v1.0</strong></td>
            <td>ESP32-S3 + LoRa SX1262, компактный модуль</td>
            <td>868 МГц</td>
            <td>22 дБм (0.140 Вт)</td>
            <td>
              <a
                href="https://www.ozon.ru/product/modul-lilygo-lora32-t3s3-v1-0-esp32-s3-sx1262-868mgts-podhodit-dlya-podklyucheniya-k-seti-meshtastic-939962207/?oos_search=false"
                target="_blank"
                rel="noopener"
                class="buy-link"
              >
                Купить
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="info-section">
      <h3>💡 Рекомендации по выбору:</h3>
      <ul>
        <li>
          <strong>T-Beam 868 МГц</strong> — рекомендуется для России и Европы,
          лучшая дальность
        </li>
        <li>
          <strong>T-Beam 433 МГц</strong> — альтернативная частота, еще большая
          дальность в открытой местности
        </li>
        <li>
          <strong>LoRa32 T3S3</strong> — компактное современное решение на базе
          ESP32-S3
        </li>
      </ul>
    </div>

    <template v-slot:footer>
      <div class="footer-info">
        📦 Выбирайте устройства с частотой 868 МГц для России и Европы
      </div>
    </template>
  </modal>
</template>

<script setup>
import { ref } from "vue";
import DotsMap from "./components/map/DotsMap.vue";
import Modal from "./components/Modal.vue";
import SearchModal from "./components/SearchModal.vue";

const shouldShowInfoModal = ref(false);
const shouldShowSearchModal = ref(false);
const shouldShowDevicesModal = ref(false);
const devicesCount = ref(0);
const devices = ref({});

const handleInfoOpen = () => {
  shouldShowInfoModal.value = true;
};

const handleInfoClose = () => {
  shouldShowInfoModal.value = false;
};

const handleDevicesCount = (count, devicesData) => {
  devicesCount.value = count;
  if (devicesData) {
    devices.value = devicesData;
  }
};

const handleSearchOpen = () => {
  shouldShowSearchModal.value = true;
};

const handleSearchClose = () => {
  shouldShowSearchModal.value = false;
};

const handleDeviceSelect = (data) => {
  // Проверяем, есть ли координаты для фокусировки карты
  if (data.latitude && data.longitude) {
    // Вызываем функцию фокусировки карты, если она доступна
    if (window.focusOnDevice) {
      window.focusOnDevice(data);
    }
  }
  // Закрываем модальное окно поиска
  shouldShowSearchModal.value = false;
};

const handleOpenCharts = (data) => {
  // Вызываем глобальную функцию для открытия графиков
  if (window.openChartModal) {
    window.openChartModal(data.nodeId, data.deviceName);
  }
  // Закрываем модальное окно поиска
  shouldShowSearchModal.value = false;
};

const handleDevicesModalOpen = () => {
  shouldShowDevicesModal.value = true;
};

const handleDevicesModalClose = () => {
  shouldShowDevicesModal.value = false;
};
</script>

<style lang="scss">
html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
    sans-serif;
}

#app {
  width: 100%;
  height: 100vh;
  position: relative;
}

#map {
  width: 100%;
  height: 100vh;
  height: 100dvh;
}

/* Стили для десктопных устройств */
@media screen and (min-width: 769px) {
  #map {
    height: 100vh;
    height: 100dvh;
  }
}

.info-section {
  margin-bottom: 1.5rem;

  h3 {
    color: #1f2937;
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
    border-bottom: 2px solid #e5e7eb;
    padding-bottom: 0.25rem;
  }

  p {
    line-height: 1.6;
    margin-bottom: 0.75rem;
  }

  ul {
    margin-left: 1rem;

    li {
      margin-bottom: 0.5rem;
      line-height: 1.5;
    }
  }

  a {
    color: #2563eb;
    text-decoration: underline;

    &:hover {
      color: #1d4ed8;
    }
  }
}

.devices-counter {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;

  .counter-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.5rem;

    .counter-label {
      font-weight: 500;
      color: #374151;
    }

    .counter-value {
      font-weight: 600;
      color: #059669;
      font-size: 1.1rem;
    }
  }
}

.legend-table {
  margin: 1rem 0;
  border-collapse: collapse;
  width: 100%;

  th,
  td {
    border: 1px solid #d1d5db;
    padding: 0.5rem;
    text-align: left;
  }

  th {
    background-color: #f9fafb;
    font-weight: 600;
  }

  td:first-child {
    text-align: center;
    width: 40px;
  }
}

.footer-info {
  text-align: center;
  color: #6b7280;
  font-size: 0.9rem;
}

.devices-table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;

  th,
  td {
    border: 1px solid #d1d5db;
    padding: 0.75rem;
    text-align: left;
  }

  th {
    background-color: #f9fafb;
    font-weight: 600;
    color: #374151;
  }

  tbody tr:hover {
    background-color: #f9fafb;
  }

  td:last-child {
    text-align: center;
    width: 100px;
  }

  .buy-link {
    display: inline-block;
    padding: 0.5rem 1rem;
    background-color: #2563eb;
    color: white;
    text-decoration: none;
    border-radius: 6px;
    font-weight: 500;
    transition: background-color 0.2s;

    &:hover {
      background-color: #1d4ed8;
    }
  }

  .buy-link-placeholder {
    color: #9ca3af;
  }
}
</style>
