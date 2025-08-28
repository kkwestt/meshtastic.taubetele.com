<template>
  <dots-map @infoOpen="handleInfoOpen" @devicesCount="handleDevicesCount" />

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
</template>

<script setup>
import { ref } from "vue";
import DotsMap from "./components/map/DotsMap.vue";
import Modal from "./components/Modal.vue";

const shouldShowInfoModal = ref(false);
const devicesCount = ref(0);

const handleInfoOpen = () => {
  shouldShowInfoModal.value = true;
};

const handleInfoClose = () => {
  shouldShowInfoModal.value = false;
};

const handleDevicesCount = (count) => {
  devicesCount.value = count;
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
</style>
