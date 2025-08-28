<template>
  <div id="map" class="w-full h-full" @click="handleMapClick">
    <div class="node-counter">
      <span v-if="Object.keys(devices).length === 0"
        >🔄 Загрузка данных...</span
      >
      <span v-else>
        Узлов: {{ Object.keys(devices).length }} | Видимых: {{ pointsOnMap }}
      </span>
      <div class="update-indicator" v-if="updateInterval">
        <span class="update-dot"></span>
        <span class="update-text">Автообновление</span>
      </div>
    </div>

    <!-- Геолокация статус -->
    <div class="geolocation-status" v-if="geolocationStatus">
      <span :class="geolocationStatus.type">{{
        geolocationStatus.message
      }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
import {
  MAP_CONFIG,
  MAP_PRESETS,
  UI_CONFIG,
  HARDWARE_MODELS,
  DEVICE_ROLES,
  REGIONS,
} from "../../utils/constants.js";
import { debounce, isPointInBounds } from "../../utils/helpers.js";
import { meshtasticApi } from "../../utils/api.js";

const emit = defineEmits([
  "infoOpen",
  "devicesCount",
  "searchOpen",
  "focusOnDevice",
]);

const props = defineProps({
  devices: {
    type: Object,
    default: () => ({}),
  },
});

let map, openedNodeId;

const handleMapClick = (event) => {
  const { nodeId } = event.target.dataset;
  if (nodeId) {
    // Обработка клика по узлу
  }
};

const devices = ref({});
const pointsOnMap = ref(0);
const filteredDevicesCache = ref(new Map());
const geolocationStatus = ref(null);

const clearGeolocationStatus = () => {
  setTimeout(() => {
    if (geolocationStatus.value?.type === "success") {
      geolocationStatus.value = null;
    }
  }, 5000); // Очищаем успешный статус через 5 секунд
};

const filterDevicesByBounds = (devices, bounds) => {
  if (!bounds || !devices) return [];

  const cacheKey = `${bounds.getSouthWest()}-${bounds.getNorthEast()}`;

  if (filteredDevicesCache.value.has(cacheKey)) {
    return filteredDevicesCache.value.get(cacheKey);
  }

  const filtered = [];
  const now = Date.now();

  for (const index in devices) {
    const device = devices[index];

    if (!device.latitude || !device.longitude) continue;

    const deviceTime = device.s_time;
    const timeDiffHours = (now - deviceTime) / (1000 * 60 * 60);
    if (timeDiffHours > 24) continue;

    if (!isPointInBounds(device.latitude, device.longitude, bounds)) continue;

    filtered.push(device);
  }

  filteredDevicesCache.value.set(cacheKey, filtered);

  if (filteredDevicesCache.value.size > 10) {
    const firstKey = filteredDevicesCache.value.keys().next().value;
    filteredDevicesCache.value.delete(firstKey);
  }

  return filtered;
};

const debouncedRenderBallons = debounce((devices, isUpdate) => {
  renderBallons(devices, isUpdate);
}, 500);

const formatTime = (timestamp) => {
  if (!timestamp || timestamp === "undefined" || timestamp === 0) {
    return "Неизвестно";
  }

  const numTimestamp = Number(timestamp);
  if (isNaN(numTimestamp)) {
    return "Неизвестно";
  }

  let date;
  if (Math.abs(numTimestamp) > 10000) {
    date = new Date(numTimestamp);
  } else {
    date = new Date(numTimestamp * 1000);
  }

  if (isNaN(date.getTime())) {
    return "Неизвестно";
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return `${diffSeconds} сек назад`;
  } else if (diffMinutes < 60) {
    return `${diffMinutes} мин назад`;
  } else if (diffHours < 24) {
    return `${diffHours} ч назад`;
  } else if (diffDays < 7) {
    return `${diffDays} дн назад`;
  } else {
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
};

const createBalloonContent = async (device, nodeId) => {
  let nodeInfoHtml = "";
  let positionInfoHtml = "";
  let telemetryInfoHtml = "";
  let textMessagesHtml = "";
  let mapReportHtml = "";
  let tracerouteHtml = "";

  try {
    const nodeInfo = await meshtasticApi.getNodeInfo(nodeId);
    if (nodeInfo && nodeInfo.data && nodeInfo.data.length > 0) {
      // Берем последнюю запись (самую свежую)
      const latestInfo = nodeInfo.data[0];
      const rawData = latestInfo.rawData;

      if (rawData) {
        nodeInfoHtml = `
    ${
      device.mqtt === "1"
        ? '<div style="font-weight: bold; color: #2E7D32; margin-bottom: 4px;">MQTT Шлюз</div>'
        : ""
    }
    <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #eee;">
    <div style="font-weight: bold;">Информация об узле: ${formatTime(
      latestInfo.timestamp
    )}</div>
    <div style="display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; font-size: 11px; line-height: 1.2;">
    ${
      rawData.is_unmessagable
        ? `<span>Принимает сообщения:</span><span>${
            !rawData.is_unmessagable ? "Да" : "Нет"
          }</span>`
        : ""
    }
    ${
      rawData.id
        ? `<span>ID:</span><span>${rawData.id} (${nodeId}) </span>`
        : ""
    }
    ${
      rawData.hwModel
        ? `<span>Модель:</span><span>${HARDWARE_MODELS[rawData.hwModel]}</span>`
        : ""
    }
    </div>
    </div>
    `;

        // Формируем компактную строку с метриками для информации об узле
        const nodeMetrics = [];
        if (latestInfo.rxSnr !== undefined && latestInfo.rxRssi !== undefined) {
          if (latestInfo.rxSnr === 0 && latestInfo.rxRssi === 0) {
            // Данные через MQTT - показываем в одной строке с Gateway
            const mqttLine = `Данные: Через MQTT${
              latestInfo.gatewayId ? ` | Gateway: ${latestInfo.gatewayId}` : ""
            }`;
            nodeInfoHtml += `
    <div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">
    <div>${mqttLine}</div>
    </div>
    `;
          } else {
            // Обычные данные - показываем метрики и Gateway на новой строке
            if (latestInfo.rxSnr !== undefined)
              nodeMetrics.push(`SNR: ${latestInfo.rxSnr} dB`);
            if (latestInfo.rxRssi !== undefined)
              nodeMetrics.push(`RSSI: ${latestInfo.rxRssi} dBm`);
            if (latestInfo.hopLimit !== undefined) {
              const hops =
                7 - latestInfo.hopLimit === 0
                  ? "Direct"
                  : 7 - latestInfo.hopLimit;
              nodeMetrics.push(`Hops: ${hops}`);
            }

            if (nodeMetrics.length > 0) {
              nodeInfoHtml += `
    <div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">
    <div>${nodeMetrics.join(" | ")}</div>
    ${
      latestInfo.gatewayId
        ? `<div style="margin-top: 1px;">Gateway: ${latestInfo.gatewayId}</div>`
        : ""
    }
    </div>
    `;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Ошибка загрузки информации об узле:", error);
  }

  try {
    const positionInfo = await meshtasticApi.getPositionInfo(nodeId);
    if (positionInfo && positionInfo.data && positionInfo.data.length > 0) {
      // Берем последнюю запись (самую свежую)
      const latestPosition = positionInfo.data[0];

      positionInfoHtml = `
    <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #eee;">
    <div style="font-weight: bold; margin-bottom: 2px;">Данные о позиции: ${formatTime(
      latestPosition.timestamp
    )}</div>

    <div style="display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; font-size: 11px; line-height: 1.2;">
    ${
      latestPosition.rawData.latitude_i !== undefined
        ? `<span>Координаты:</span><span>${(
            latestPosition.rawData.latitude_i / 1e7
          ).toFixed(4)}, ${(latestPosition.rawData.longitude_i / 1e7).toFixed(
            4
          )}${
            latestPosition.rawData.altitude !== undefined
              ? `, ${latestPosition.rawData.altitude}м`
              : ""
          }${
            latestPosition.rawData.sats_in_view !== undefined
              ? `, ${latestPosition.rawData.sats_in_view}Sat`
              : ""
          }</span>`
        : ""
    }
    </div>
    </div>
    `;

      // Формируем компактную строку с метриками для данных о позиции
      if (
        latestPosition.rxSnr !== undefined &&
        latestPosition.rxRssi !== undefined
      ) {
        if (latestPosition.rxSnr === 0 && latestPosition.rxRssi === 0) {
          // Данные через MQTT - показываем в одной строке с Gateway
          const mqttLine = `Данные: Через MQTT${
            latestPosition.gatewayId
              ? ` | Gateway: ${latestPosition.gatewayId}`
              : ""
          }`;
          positionInfoHtml += `
    <div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">
    <div>${mqttLine}</div>
    </div>
    `;
        } else {
          // Обычные данные - показываем метрики и Gateway на новой строке
          const positionMetrics = [];
          if (latestPosition.rxSnr !== undefined)
            positionMetrics.push(`SNR: ${latestPosition.rxSnr} dB`);
          if (latestPosition.rxRssi !== undefined)
            positionMetrics.push(`RSSI: ${latestPosition.rxRssi} dBm`);
          if (latestPosition.hopLimit !== undefined) {
            const hops =
              7 - latestPosition.hopLimit === 0
                ? "Direct"
                : 7 - latestPosition.hopLimit;
            positionMetrics.push(`Hops: ${hops}`);
          }

          if (positionMetrics.length > 0) {
            positionInfoHtml += `
    <div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">
    <div>${positionMetrics.join(" | ")}</div>
    ${
      latestPosition.gatewayId
        ? `<div style="margin-top: 1px;">Gateway: ${latestPosition.gatewayId}</div>`
        : ""
    }
    </div>
    `;
          }
        }
      }
    }
  } catch (error) {
    console.error("Ошибка загрузки информации о позиции:", error);
  }

  try {
    const telemetryInfo = await meshtasticApi.getTelemetryInfo(nodeId);
    if (telemetryInfo && telemetryInfo.data && telemetryInfo.data.length > 0) {
      // Разделяем данные по типам
      let deviceMetricsData = null;
      let environmentMetricsData = null;
      let latestDeviceMetrics = null;
      let latestEnvironmentMetrics = null;

      // Ищем последние данные каждого типа
      for (const entry of telemetryInfo.data) {
        if (
          entry.rawData &&
          entry.rawData.type === "deviceMetrics" &&
          !latestDeviceMetrics
        ) {
          latestDeviceMetrics = entry;
          deviceMetricsData =
            entry.rawData.variant && entry.rawData.variant.value
              ? entry.rawData.variant.value
              : null;
        }
        if (
          entry.rawData &&
          entry.rawData.type === "environmentMetrics" &&
          !latestEnvironmentMetrics
        ) {
          latestEnvironmentMetrics = entry;
          environmentMetricsData =
            entry.rawData.variant && entry.rawData.variant.value
              ? entry.rawData.variant.value
              : null;
        }
      }

      // Формируем HTML для данных узла (deviceMetrics)
      let deviceMetricsHtml = "";
      if (latestDeviceMetrics && deviceMetricsData) {
        deviceMetricsHtml = `
    <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #eee;">
    <div style="font-weight: bold; margin-bottom: 2px;">Телеметрия узла: ${formatTime(
      latestDeviceMetrics.timestamp
    )}</div>

    <div style="display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; font-size: 11px; line-height: 1.2;">
    ${
      deviceMetricsData.battery_level !== undefined
        ? `<span>Батарея:</span><span>${Math.min(
            deviceMetricsData.battery_level,
            100
          )}%</span>`
        : ""
    }
    ${
      deviceMetricsData.voltage !== undefined
        ? `<span>Напряжение:</span><span>${deviceMetricsData.voltage.toFixed(
            2
          )} В</span>`
        : ""
    }
    ${
      deviceMetricsData.channel_utilization !== undefined
        ? `<span>Загрузка канала:</span><span>${deviceMetricsData.channel_utilization.toFixed(
            1
          )}%</span>`
        : ""
    }
    ${
      deviceMetricsData.air_util_tx !== undefined
        ? `<span>Эфир TX:</span><span>${deviceMetricsData.air_util_tx.toFixed(
            1
          )}%</span>`
        : ""
    }
    ${
      deviceMetricsData.uptime_seconds !== undefined
        ? `<span>Время работы:</span><span>${Math.floor(
            deviceMetricsData.uptime_seconds / 3600
          )}ч ${Math.floor(
            (deviceMetricsData.uptime_seconds % 3600) / 60
          )}м</span>`
        : ""
    }
    </div>
    </div>
    `;

        // Формируем компактную строку с метриками для телеметрии узла
        if (
          latestDeviceMetrics.rxSnr !== undefined &&
          latestDeviceMetrics.rxRssi !== undefined
        ) {
          if (
            latestDeviceMetrics.rxSnr === 0 &&
            latestDeviceMetrics.rxRssi === 0
          ) {
            // Данные через MQTT - показываем в одной строке с Gateway
            const mqttLine = `Данные: Через MQTT${
              latestDeviceMetrics.gatewayId
                ? ` | Gateway: ${latestDeviceMetrics.gatewayId}`
                : ""
            }`;
            deviceMetricsHtml += `
    <div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">
    <div>${mqttLine}</div>
    </div>
    `;
          } else {
            // Обычные данные - показываем метрики и Gateway на новой строке
            const deviceMetrics = [];
            if (latestDeviceMetrics.rxSnr !== undefined)
              deviceMetrics.push(`SNR: ${latestDeviceMetrics.rxSnr} dB`);
            if (latestDeviceMetrics.rxRssi !== undefined)
              deviceMetrics.push(`RSSI: ${latestDeviceMetrics.rxRssi} dBm`);
            if (latestDeviceMetrics.hopLimit !== undefined) {
              const hops =
                7 - latestDeviceMetrics.hopLimit === 0
                  ? "Direct"
                  : 7 - latestDeviceMetrics.hopLimit;
              deviceMetrics.push(`Hops: ${hops}`);
            }

            if (deviceMetrics.length > 0) {
              deviceMetricsHtml += `
    <div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">
    <div>${deviceMetrics.join(" | ")}</div>
    ${
      latestDeviceMetrics.gatewayId
        ? `<div style="margin-top: 1px;">Gateway: ${latestDeviceMetrics.gatewayId}</div>`
        : ""
    }
    </div>
    `;
            }
          }
        }
      }

      // Формируем HTML для сенсоров (environmentMetrics)
      let environmentMetricsHtml = "";
      if (latestEnvironmentMetrics && environmentMetricsData) {
        environmentMetricsHtml = `
    <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #eee;">
    <div style="font-weight: bold; margin-bottom: 2px;">Сенсоры: ${formatTime(
      latestEnvironmentMetrics.timestamp
    )}</div>

    <div style="display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; font-size: 11px; line-height: 1.2;">
    ${
      environmentMetricsData.temperature !== undefined
        ? `<span>Температура:</span><span>${environmentMetricsData.temperature.toFixed(
            1
          )}°C</span>`
        : ""
    }
    ${
      environmentMetricsData.lux !== undefined
        ? `<span>Освещенность:</span><span>${environmentMetricsData.lux} lux</span>`
        : ""
    }
    ${
      environmentMetricsData.humidity !== undefined
        ? `<span>Влажность:</span><span>${environmentMetricsData.humidity.toFixed(
            1
          )}%</span>`
        : ""
    }
    ${
      environmentMetricsData.pressure !== undefined
        ? `<span>Давление:</span><span>${environmentMetricsData.pressure.toFixed(
            1
          )} hPa</span>`
        : ""
    }
    </div>
    </div>
    `;

        // Формируем компактную строку с метриками для сенсоров
        if (
          latestEnvironmentMetrics.rxSnr !== undefined &&
          latestEnvironmentMetrics.rxRssi !== undefined
        ) {
          if (
            latestEnvironmentMetrics.rxSnr === 0 &&
            latestEnvironmentMetrics.rxRssi === 0
          ) {
            // Данные через MQTT - показываем в одной строке с Gateway
            const mqttLine = `Данные: Через MQTT${
              latestEnvironmentMetrics.gatewayId
                ? ` | Gateway: ${latestEnvironmentMetrics.gatewayId}`
                : ""
            }`;
            environmentMetricsHtml += `
    <div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">
    <div>${mqttLine}</div>
    </div>
    `;
          } else {
            // Обычные данные - показываем метрики и Gateway на новой строке
            const envMetrics = [];
            if (latestEnvironmentMetrics.rxSnr !== undefined)
              envMetrics.push(`SNR: ${latestEnvironmentMetrics.rxSnr} dB`);
            if (latestEnvironmentMetrics.rxRssi !== undefined)
              envMetrics.push(`RSSI: ${latestEnvironmentMetrics.rxRssi} dBm`);
            if (latestEnvironmentMetrics.hopLimit !== undefined) {
              const hops =
                7 - latestEnvironmentMetrics.hopLimit === 0
                  ? "Direct"
                  : 7 - latestEnvironmentMetrics.hopLimit;
              envMetrics.push(`Hops: ${hops}`);
            }

            if (envMetrics.length > 0) {
              environmentMetricsHtml += `
    <div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">
    <div>${envMetrics.join(" | ")}</div>
    ${
      latestEnvironmentMetrics.gatewayId
        ? `<div style="margin-top: 1px;">Gateway: ${latestEnvironmentMetrics.gatewayId}</div>`
        : ""
    }
    </div>
    `;
            }
          }
        }
      }

      telemetryInfoHtml = deviceMetricsHtml + environmentMetricsHtml;
    }
  } catch (error) {
    console.error("Ошибка загрузки телеметрии:", error);
  }

  try {
    const textMessages = await meshtasticApi.getTextMessages(nodeId);
    if (textMessages && textMessages.data && textMessages.data.length > 0) {
      // Берем последнее сообщение (самое свежее)
      const latestMessage = textMessages.data[0];
      const rawData = latestMessage.rawData;

      if (rawData && rawData.text) {
        textMessagesHtml = `
    <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #eee;">
    <div style="font-weight: bold; margin-bottom: 2px;">Последнее сообщение: ${formatTime(
      latestMessage.timestamp
    )}</div>

    <div style="display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; font-size: 11px; line-height: 1.2;">
    <span>Текст:</span><span style="word-break: break-word;">${
      rawData.text
    }</span>

    ${
      latestMessage.to !== undefined
        ? `<span>Кому:</span><span>${
            latestMessage.to === 4294967295 ? "Всем" : latestMessage.to
          }</span>`
        : ""
    }
    </div>
    </div>
    `;

        // Формируем компактную строку с метриками для текстового сообщения
        if (
          latestMessage.rxSnr !== undefined &&
          latestMessage.rxRssi !== undefined
        ) {
          if (latestMessage.rxSnr === 0 && latestMessage.rxRssi === 0) {
            // Данные через MQTT - показываем в одной строке с Gateway
            const mqttLine = `Данные: Через MQTT${
              latestMessage.gatewayId
                ? ` | Gateway: ${latestMessage.gatewayId}`
                : ""
            }`;
            textMessagesHtml += `
    <div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">
    <div>${mqttLine}</div>
    </div>
    `;
          } else {
            // Обычные данные - показываем метрики и Gateway на новой строке
            const messageMetrics = [];
            if (latestMessage.rxSnr !== undefined)
              messageMetrics.push(`SNR: ${latestMessage.rxSnr} dB`);
            if (latestMessage.rxRssi !== undefined)
              messageMetrics.push(`RSSI: ${latestMessage.rxRssi} dBm`);
            if (latestMessage.hopLimit !== undefined) {
              const hops =
                7 - latestMessage.hopLimit === 0
                  ? "Direct"
                  : 7 - latestMessage.hopLimit;
              messageMetrics.push(`Hops: ${hops}`);
            }

            if (messageMetrics.length > 0) {
              textMessagesHtml += `
    <div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">
    <div>${messageMetrics.join(" | ")}</div>
    ${
      latestMessage.gatewayId
        ? `<div style="margin-top: 1px;">Gateway: ${latestMessage.gatewayId}</div>`
        : ""
    }
    </div>
    `;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Ошибка загрузки текстовых сообщений:", error);
  }

  try {
    const mapReportInfo = await meshtasticApi.getMapReportInfo(nodeId);
    if (mapReportInfo && mapReportInfo.data && mapReportInfo.data.length > 0) {
      // Берем последний отчет (самый свежий)
      const latestReport = mapReportInfo.data[0];
      const rawData = latestReport.rawData;

      if (rawData) {
        mapReportHtml = `
    <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #eee;">
    <div style="font-weight: bold; margin-bottom: 2px;">Отчет карты: ${formatTime(
      latestReport.timestamp
    )}</div>

    <div style="display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; font-size: 11px; line-height: 1.2;">
    ${
      rawData.decoded.role !== undefined
        ? `<span>Роль:</span><span>${DEVICE_ROLES[rawData.decoded.role]}</span>`
        : ""
    }
    ${
      rawData.decoded.hwModel !== undefined
        ? `<span>Модель:</span><span>${
            HARDWARE_MODELS[rawData.decoded.hwModel]
          }</span>`
        : ""
    }
    ${
      rawData.decoded.firmwareVersion
        ? `<span>Прошивка:</span><span>${rawData.decoded.firmwareVersion}</span>`
        : ""
    }
    ${
      rawData.decoded.region !== undefined
        ? `<span>Регион:</span><span>${REGIONS[rawData.decoded.region]}</span>`
        : ""
    }
    ${
      rawData.decoded.modemPreset !== undefined
        ? `<span>Пресет модема:</span><span>${rawData.decoded.modemPreset}</span>`
        : ""
    }
    ${
      rawData.decoded.hasDefaultChannel !== undefined
        ? `<span>Канал по умолчанию:</span><span>${
            rawData.decoded.hasDefaultChannel ? "Да" : "Нет"
          }</span>`
        : ""
    }
    ${
      rawData.decoded.numOnlineLocalNodes !== undefined
        ? `<span>Рядом других устройств:</span><span>${rawData.decoded.numOnlineLocalNodes}</span>`
        : ""
    }
    </div>
    </div>
    `;

        // Формируем компактную строку с метриками для отчета карты
        if (
          latestReport.rxSnr !== undefined &&
          latestReport.rxRssi !== undefined
        ) {
          if (latestReport.rxSnr === 0 && latestReport.rxRssi === 0) {
            // Данные через MQTT - показываем в одной строке с Gateway
            const mqttLine = `Данные: Через MQTT${
              latestReport.gatewayId
                ? ` | Gateway: ${latestReport.gatewayId}`
                : ""
            }`;
            mapReportHtml += `
    <div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">
    <div>${mqttLine}</div>
    </div>
    `;
          } else {
            // Обычные данные - показываем метрики и Gateway на новой строке
            const reportMetrics = [];
            if (latestReport.rxSnr !== undefined)
              reportMetrics.push(`SNR: ${latestReport.rxSnr} dB`);
            if (latestReport.rxRssi !== undefined)
              reportMetrics.push(`RSSI: ${latestReport.rxRssi} dBm`);
            if (latestReport.hopLimit !== undefined)
              reportMetrics.push(`Hops: ${latestReport.hopLimit}`);

            if (reportMetrics.length > 0) {
              mapReportHtml += `
    <div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">
    <div>${reportMetrics.join(" | ")}</div>
    ${
      latestReport.gatewayId
        ? `<div style="margin-top: 1px;">Gateway: ${latestReport.gatewayId}</div>`
        : ""
    }
    </div>
    `;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Ошибка загрузки отчета карты:", error);
  }

  // Загружаем данные traceroute
  try {
    const tracerouteInfo = await meshtasticApi.getTracerouteInfo(nodeId);
    if (
      tracerouteInfo &&
      tracerouteInfo.data &&
      tracerouteInfo.data.length > 0
    ) {
      // Берем последнюю запись (самую свежую)
      const latestTrace = tracerouteInfo.data[0];
      const rawData = latestTrace.rawData;

      // Ищем обратный маршрут (от получателя к отправителю)
      let reverseTraceroute = null;
      try {
        if (rawData && rawData.route && rawData.route.length > 0) {
          console.log("Ищем обратный traceroute для:", {
            from: latestTrace.from,
            to: latestTrace.to,
            fromHex: latestTrace.from.toString(16),
            toHex: latestTrace.to.toString(16),
          });

          // Конвертируем hex ID в числовой для поиска
          const toNodeId = parseInt(latestTrace.to.toString(16), 16);
          console.log("Конвертированный toNodeId:", toNodeId);

          // Ищем traceroute в обратном направлении по числовому ID
          const reverseTracerouteInfo = await meshtasticApi.getTracerouteInfo(
            toNodeId.toString(16)
          );
          console.log("Получен reverseTracerouteInfo:", reverseTracerouteInfo);

          if (
            reverseTracerouteInfo &&
            reverseTracerouteInfo.data &&
            reverseTracerouteInfo.data.length > 0
          ) {
            // Ищем запись, где получатель = отправитель исходного traceroute
            for (const trace of reverseTracerouteInfo.data) {
              console.log("Проверяем trace:", {
                traceFrom: trace.from,
                traceTo: trace.to,
                targetFrom: latestTrace.from,
              });
              if (trace.to === latestTrace.from) {
                reverseTraceroute = trace;
                console.log("Найден обратный traceroute:", reverseTraceroute);
                break;
              }
            }
          }

          // Если не нашли через API, попробуем использовать route_back из исходных данных
          if (
            !reverseTraceroute &&
            rawData.route_back &&
            rawData.route_back.length > 0
          ) {
            console.log(
              "Используем route_back из исходных данных:",
              rawData.route_back
            );
          }
        }
      } catch (error) {
        console.log("Обратный traceroute не найден:", error.message);
        // Это не критическая ошибка, продолжаем работу
      }

      if (rawData) {
        // Формируем компактный маршрут с SNR
        let routeDisplay = "";

        if (rawData.route && rawData.route.length > 0) {
          // Создаем маршрут с SNR для каждого хопа
          const routeParts = [];

          // Добавляем источник
          routeParts.push(`!${latestTrace.from.toString(16)}`);

          // Добавляем промежуточные узлы с SNR
          for (let i = 0; i < rawData.route.length; i++) {
            const nodeHex = `!${rawData.route[i].toString(16)}`;
            const snr =
              rawData.snr_towards && rawData.snr_towards[i]
                ? `(${rawData.snr_towards[i]}dB)`
                : "";
            routeParts.push(`${nodeHex}${snr}`);
          }

          // Добавляем назначение
          routeParts.push(`!${latestTrace.to.toString(16)}`);

          routeDisplay = routeParts.join(" → ");
        } else {
          // Если нет промежуточных узлов, показываем прямой маршрут
          routeDisplay = `!${latestTrace.from.toString(
            16
          )} → !${latestTrace.to.toString(16)}`;
        }

        // Формируем обратный маршрут если есть
        let backRouteDisplay = "";
        if (
          reverseTraceroute &&
          reverseTraceroute.rawData &&
          reverseTraceroute.rawData.route &&
          reverseTraceroute.rawData.route.length > 0
        ) {
          // Используем найденный обратный traceroute
          const backParts = [];

          // Добавляем источник (получатель исходного traceroute)
          backParts.push(`!${reverseTraceroute.from.toString(16)}`);

          // Добавляем промежуточные узлы с SNR
          for (let i = 0; i < reverseTraceroute.rawData.route.length; i++) {
            const nodeHex = `!${reverseTraceroute.rawData.route[i].toString(
              16
            )}`;
            const snr =
              reverseTraceroute.rawData.snr_towards &&
              reverseTraceroute.rawData.snr_towards[i]
                ? `(${reverseTraceroute.rawData.snr_towards[i]}dB)`
                : "";
            backParts.push(`${nodeHex}${snr}`);
          }

          // Добавляем назначение (отправитель исходного traceroute)
          backParts.push(`!${reverseTraceroute.to.toString(16)}`);

          backRouteDisplay = backParts.join(" → ");
        } else if (rawData.route_back && rawData.route_back.length > 0) {
          // Fallback к данным route_back если есть
          console.log(
            "Формируем обратный маршрут из route_back:",
            rawData.route_back,
            "snr_back:",
            rawData.snr_back
          );
          const backParts = [];

          // Добавляем назначение исходного traceroute (откуда идет обратный маршрут)
          backParts.push(`!${latestTrace.to.toString(16)}`);

          // Добавляем промежуточные узлы с SNR
          for (let i = 0; i < rawData.route_back.length; i++) {
            const nodeHex = `!${rawData.route_back[i].toString(16)}`;
            const snr =
              rawData.snr_back && rawData.snr_back[i]
                ? `(${rawData.snr_back[i]}dB)`
                : "";
            backParts.push(`${nodeHex}${snr}`);
          }

          // Добавляем источник исходного traceroute (куда идет обратный маршрут)
          backParts.push(`!${latestTrace.from.toString(16)}`);

          backRouteDisplay = backParts.join(" → ");
          console.log("Сформирован backRouteDisplay:", backRouteDisplay);
        } else {
          backRouteDisplay = "нет маршрута";
          console.log("Нет данных для обратного маршрута");
        }

        // Формируем компактную строку с метриками
        const metrics = [];
        if (latestTrace.rxSnr !== undefined)
          metrics.push(`SNR: ${latestTrace.rxSnr} dB`);
        if (latestTrace.rxRssi !== undefined)
          metrics.push(`RSSI: ${latestTrace.rxRssi} dBm`);
        if (latestTrace.hopLimit !== undefined)
          metrics.push(`Hops: ${latestTrace.hopLimit}`);

        const metricsLine = metrics.join(" | ");

        // Отладочная информация
        console.log("Traceroute debug:", {
          routeDisplay,
          backRouteDisplay,
          rawData: rawData,
          reverseTraceroute: reverseTraceroute,
        });

        // Детальная отладка rawData
        console.log("Детальная информация rawData:", {
          route: rawData.route,
          route_back: rawData.route_back,
          snr_towards: rawData.snr_towards,
          snr_back: rawData.snr_back,
          decoded: rawData.decoded,
        });

        tracerouteHtml = `
    <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #eee;">
    <div style="font-weight: bold; margin-bottom: 2px;">Traceroute: ${formatTime(
      latestTrace.timestamp
    )}</div>
    <div style="font-size: 11px; line-height: 1.3;">
    <div style="margin-bottom: 4px; font-weight: 600; color: #1f2937;">
      От: !${latestTrace.from.toString(16)} → К: !${latestTrace.to.toString(16)}
    </div>
    ${
      routeDisplay
        ? `<div style="margin-bottom: 2px; word-break: break-all;">Туда: ${routeDisplay}</div>`
        : ""
    }
    ${
      backRouteDisplay !== "нет маршрута"
        ? `<div style="margin-bottom: 2px;">Обратно: ${backRouteDisplay}</div>`
        : ""
    }
    ${
      metricsLine
        ? `<div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">${metricsLine}</div>`
        : ""
    }
    ${
      latestTrace.gatewayId
        ? `<div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">Gateway: ${latestTrace.gatewayId} </div>`
        : ""
    }
    ${
      reverseTraceroute
        ? `<div style="font-size: 10px; color: #666; margin-top: 2px; line-height: 1.2;">Обратный маршрут найден: ${formatTime(
            reverseTraceroute.timestamp
          )}</div>`
        : ""
    }
    </div>
    </div>
    `;
      }
    }
  } catch (error) {
    console.error("Ошибка загрузки данных traceroute:", error);
  }

  return `
    <div style="max-width: 350px; font-size: 12px;">

    ${nodeInfoHtml}
    ${positionInfoHtml}
    ${telemetryInfoHtml}
    ${textMessagesHtml}
    ${mapReportHtml}
    ${tracerouteHtml}
    </div>
  `;
};

const renderPath = async (nodeId) => {
  if (!nodeId) return;

  try {
    const gpsData = await meshtasticApi.getGpsTrack(nodeId);

    if (!gpsData || !gpsData.length) return;

    const polyline = new ymaps.Polyline(
      gpsData.map(({ latitudeI, longitudeI }) => [
        latitudeI / 10000,
        longitudeI / 10000,
      ]),
      {},
      {
        strokeColor: MAP_CONFIG.PATH_STROKE_COLOR,
        strokeWidth: MAP_CONFIG.PATH_STROKE_WIDTH,
      }
    );

    map.geoObjects.add(polyline);
  } catch (error) {
    console.error("Ошибка отображения пути:", error);
  }
};

const renderBallons = (devices, isUpdate = false) => {
  try {
    if (!devices || Object.keys(devices).length === 0) {
      return;
    }

    // Сохраняем информацию об открытом баллуне перед обновлением
    let openedBalloonInfo = null;
    let openedBalloonContent = null;
    if (isUpdate && openedNodeId) {
      // Находим текущий открытый баллун и сохраняем его состояние
      const currentPlacemarks = map.geoObjects.getAll();
      for (let placemark of currentPlacemarks) {
        if (
          placemark.properties._data &&
          placemark.properties._data.nodeId === openedNodeId &&
          placemark.balloon.isOpen()
        ) {
          openedBalloonInfo = {
            nodeId: openedNodeId,
            isOpen: true,
          };
          // Сохраняем текущее содержимое баллуна
          openedBalloonContent = placemark.properties.get("balloonContentBody");
          break;
        }
      }
    }

    if (isUpdate) {
      clearDeviceMarkers();
    }

    const placemarks = [];
    const state = map.action.getCurrentState();
    const now = Date.now();

    for (const index in devices) {
      const device = devices[index];
      const nodeId = device.device_id || device.hex_id || device.id || index;

      if (!device.latitude || !device.longitude) continue;

      const deviceTime = device.s_time;
      const timeDiffHours = (now - deviceTime) / (1000 * 60 * 60);

      if (timeDiffHours > 24) continue;

      const bounds = map.getBounds();
      if (!isPointInBounds(device.latitude, device.longitude, bounds)) continue;

      let presetcolor;
      let iconOptions = {};

      if (timeDiffHours < 6 && (device.mqtt === "1" || device.mqtt === 1)) {
        // Если точка онлайн И подключена через MQTT - зеленая
        presetcolor = MAP_PRESETS.MQTT;
        iconOptions = {
          preset: `${presetcolor}`,
        };
      } else if (timeDiffHours < 6) {
        // Если точка онлайн, но НЕ MQTT - цвет ONLINE
        presetcolor = MAP_PRESETS.ONLINE;
        iconOptions = {
          preset: `${presetcolor}`,
        };
      } else if (timeDiffHours >= 6) {
        // Если точка не передавала данные больше 6 часов - серая
        presetcolor = MAP_PRESETS.INACTIVE;
        iconOptions = {
          preset: `${presetcolor}`,
        };
      }
      // Иначе точку не показываем (iconOptions остается пустым)

      const timestampfooter = formatTime(device.s_time);

      const placemark = new window.ymaps.Placemark(
        [device.latitude, device.longitude],
        {
          iconContent: device.shortName,
          balloonContentHeader: device.longName + " (" + device.shortName + ")",
          balloonContentBody: `
    <div style="max-width: 350px; font-size: 12px;">

    <div style="margin-top: 8px; color: #666;">🔄 Загрузка информации об узле...</div>
    </div>
    `,
          balloonContentFooter: `Updated: ${timestampfooter}`,
          clusterCaption: `Node: <strong>${
            device.shortName || device.short_name || nodeId
          }</strong>`,
          nodeId,
        },
        iconOptions
      );

      placemark.events.add("balloonopen", async (event) => {
        const nodeId =
          event.originalEvent.currentTarget.properties._data.nodeId;
        openedNodeId = nodeId;
        renderPath(openedNodeId);

        // Загружаем полное содержимое баллуна
        try {
          const fullContent = await createBalloonContent(device, nodeId);
          placemark.properties.set("balloonContentBody", fullContent);
        } catch (error) {
          console.error("Ошибка загрузки содержимого баллуна:", error);
          placemark.properties.set(
            "balloonContentBody",
            `
    <div style="max-width: 350px; font-size: 12px;">
    <div style="margin-top: 8px; color: #f44336;">❌ Ошибка загрузки данных</div>
    </div>
    `
          );
        }
      });

      placemark.events.add("balloonclose", () => {
        openedNodeId = null;
      });

      placemarks.push(placemark);
    }

    if (state.zoom > MAP_CONFIG.MIN_ZOOM_FOR_INDIVIDUAL_MARKERS) {
      placemarks.forEach((p) => {
        map.geoObjects.add(p);

        // Восстанавливаем открытый баллун после обновления данных
        if (
          openedBalloonInfo &&
          p.properties._data.nodeId === openedBalloonInfo.nodeId
        ) {
          // Если у нас есть сохраненное содержимое, используем его
          if (openedBalloonContent) {
            p.properties.set("balloonContentBody", openedBalloonContent);
          }

          p.balloon.events.add("beforeuserclose", () => {
            openedNodeId = null;
          });

          // Открываем баллун автоматически после обновления
          setTimeout(() => {
            p.balloon.open(undefined, undefined, {
              balloonAutoPan: false,
            });
          }, 100);
        }
      });

      pointsOnMap.value = placemarks.length;
      return;
    }

    const clusterer = new ymaps.Clusterer({
      preset: MAP_PRESETS.CLUSTER,
      gridSize: MAP_CONFIG.CLUSTER_GRID_SIZE,
      groupByCoordinates: false,
      clusterDisableClickZoom: true,
      clusterHideIconOnBalloonOpen: false,
      geoObjectHideIconOnBalloonOpen: false,
    });

    clusterer.add(placemarks);
    map.geoObjects.add(clusterer);

    // Восстанавливаем открытый баллун для кластеризованных маркеров
    if (openedBalloonInfo) {
      // Находим маркер с нужным nodeId в кластерере
      const placemarksInCluster = clusterer.getGeoObjects();
      for (let placemark of placemarksInCluster) {
        if (
          placemark.properties._data &&
          placemark.properties._data.nodeId === openedBalloonInfo.nodeId
        ) {
          // Если у нас есть сохраненное содержимое, используем его
          if (openedBalloonContent) {
            placemark.properties.set(
              "balloonContentBody",
              openedBalloonContent
            );
          }

          placemark.balloon.events.add("beforeuserclose", () => {
            openedNodeId = null;
          });

          // Открываем баллун для этого маркера
          setTimeout(() => {
            placemark.balloon.open(undefined, undefined, {
              balloonAutoPan: false,
            });
          }, 100);
          break;
        }
      }
    }

    pointsOnMap.value = placemarks.length;
  } catch (error) {
    console.error("❌ Ошибка в renderBallons:", error);
    pointsOnMap.value = 0;
  }
};

const renderBallonsWithState = (
  devices,
  openedBalloonInfo = null,
  openedBalloonContent = null
) => {
  try {
    if (!devices || Object.keys(devices).length === 0) {
      return;
    }

    const placemarks = [];
    const state = map.action.getCurrentState();
    const now = Date.now();

    for (const index in devices) {
      const device = devices[index];
      const nodeId = device.device_id || device.hex_id || device.id || index;

      if (!device.latitude || !device.longitude) continue;

      const deviceTime = device.s_time;
      const timeDiffHours = (now - deviceTime) / (1000 * 60 * 60);

      if (timeDiffHours > 24) continue;

      const bounds = map.getBounds();
      if (!isPointInBounds(device.latitude, device.longitude, bounds)) continue;

      let presetcolor;
      let iconOptions = {};

      if (timeDiffHours < 6 && (device.mqtt === "1" || device.mqtt === 1)) {
        presetcolor = MAP_PRESETS.MQTT;
        iconOptions = {
          preset: `${presetcolor}`,
        };
      } else if (timeDiffHours < 6) {
        presetcolor = MAP_PRESETS.ONLINE;
        iconOptions = {
          preset: `${presetcolor}`,
        };
      } else if (timeDiffHours >= 6) {
        presetcolor = MAP_PRESETS.INACTIVE;
        iconOptions = {
          preset: `${presetcolor}`,
        };
      }

      const timestampfooter = formatTime(device.s_time);

      const placemark = new window.ymaps.Placemark(
        [device.latitude, device.longitude],
        {
          iconContent: device.shortName,
          balloonContentHeader: device.longName + " (" + device.shortName + ")",
          balloonContentBody: `
          <div style="max-width: 350px; font-size: 12px;">
          <div style="margin-top: 8px; color: #666;">🔄 Загрузка информации об узле...</div>
          </div>
          `,
          balloonContentFooter: `Updated: ${timestampfooter}`,
          clusterCaption: `Node: <strong>${
            device.shortName || device.short_name || nodeId
          }</strong>`,
          nodeId,
        },
        iconOptions
      );

      placemark.events.add("balloonopen", async (event) => {
        const nodeId =
          event.originalEvent.currentTarget.properties._data.nodeId;
        openedNodeId = nodeId;
        renderPath(openedNodeId);

        try {
          const fullContent = await createBalloonContent(device, nodeId);
          placemark.properties.set("balloonContentBody", fullContent);
        } catch (error) {
          console.error("Ошибка загрузки содержимого баллуна:", error);
          placemark.properties.set(
            "balloonContentBody",
            `
            <div style="max-width: 350px; font-size: 12px;">
            <div style="margin-top: 8px; color: #f44336;">❌ Ошибка загрузки данных</div>
            </div>
            `
          );
        }
      });

      placemark.events.add("balloonclose", () => {
        openedNodeId = null;
      });

      placemarks.push(placemark);
    }

    if (state.zoom > MAP_CONFIG.MIN_ZOOM_FOR_INDIVIDUAL_MARKERS) {
      placemarks.forEach((p) => {
        map.geoObjects.add(p);

        // Восстанавливаем открытый баллун после обновления данных
        if (
          openedBalloonInfo &&
          p.properties._data.nodeId === openedBalloonInfo.nodeId
        ) {
          // Если у нас есть сохраненное содержимое, используем его
          if (openedBalloonContent) {
            p.properties.set("balloonContentBody", openedBalloonContent);
          }

          // Открываем баллун автоматически после обновления
          setTimeout(() => {
            p.balloon.open(undefined, undefined, {
              balloonAutoPan: false,
            });
          }, 50);
        }
      });

      pointsOnMap.value = placemarks.length;
      return;
    }

    const clusterer = new ymaps.Clusterer({
      preset: MAP_PRESETS.CLUSTER,
      gridSize: MAP_CONFIG.CLUSTER_GRID_SIZE,
      groupByCoordinates: false,
      clusterDisableClickZoom: true,
      clusterHideIconOnBalloonOpen: false,
      geoObjectHideIconOnBalloonOpen: false,
    });

    clusterer.add(placemarks);
    map.geoObjects.add(clusterer);

    // Восстанавливаем открытый баллун для кластеризованных маркеров
    if (openedBalloonInfo) {
      const placemarksInCluster = clusterer.getGeoObjects();
      for (let placemark of placemarksInCluster) {
        if (
          placemark.properties._data &&
          placemark.properties._data.nodeId === openedBalloonInfo.nodeId
        ) {
          if (openedBalloonContent) {
            placemark.properties.set(
              "balloonContentBody",
              openedBalloonContent
            );
          }

          setTimeout(() => {
            placemark.balloon.open(undefined, undefined, {
              balloonAutoPan: false,
            });
          }, 50);
          break;
        }
      }
    }

    pointsOnMap.value = placemarks.length;
  } catch (error) {
    console.error("❌ Ошибка в renderBallonsWithState:", error);
    pointsOnMap.value = 0;
  }
};

const fetchDevicesData = async () => {
  try {
    const response = await fetch("https://meshtasticback.taubetele.com/dots");

    if (!response.ok) {
      if (response.status === 502) {
        throw new Error(
          "Сервер временно недоступен (502 Bad Gateway). Попробуйте позже."
        );
      } else if (response.status >= 500) {
        throw new Error(
          `Ошибка сервера (${response.status}). Попробуйте позже.`
        );
      } else if (response.status >= 400) {
        throw new Error(
          `Ошибка запроса (${response.status}). Проверьте настройки.`
        );
      }
    }

    const data = await response.json();

    if (data && data.data) {
      devices.value = data.data;
      const count = Object.keys(data.data).length;
      emit("devicesCount", count, data.data);

      if (typeof debouncedRenderBallons === "function") {
        debouncedRenderBallons(devices.value, false);
      }
    } else {
      devices.value = {};
      emit("devicesCount", 0, {});
    }
  } catch (error) {
    console.error("❌ Ошибка загрузки данных устройств:", error);

    // Показываем пользователю понятное сообщение об ошибке
    if (error.message.includes("Failed to fetch")) {
      geolocationStatus.value = {
        type: "error",
        message:
          "❌ Не удается подключиться к серверу. Проверьте интернет-соединение или попробуйте позже.",
      };
    } else {
      geolocationStatus.value = {
        type: "error",
        message: `❌ ${error.message}`,
      };
    }

    devices.value = {};
    emit("devicesCount", 0, {});

    // Автоматически скрываем ошибку через 10 секунд
    setTimeout(() => {
      if (geolocationStatus.value?.type === "error") {
        geolocationStatus.value = null;
      }
    }, 10000);
  }
};

let updateInterval = null;

const startDataUpdates = () => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }

  updateInterval = setInterval(async () => {
    await updateDevicesData();
  }, 60000);
};

const stopDataUpdates = () => {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
};

const clearDeviceMarkers = () => {
  if (!map) return;

  // Сохраняем геолокационные маркеры и пути
  const geoObjectsToKeep = [];
  const allObjects = map.geoObjects.getAll();

  for (let obj of allObjects) {
    // Сохраняем геолокационные маркеры (они имеют preset geolocation)
    if (obj.options && obj.options.get("preset") === MAP_PRESETS.GEOLOCATION) {
      geoObjectsToKeep.push(obj);
    }
    // Сохраняем полилинии (пути GPS)
    else if (obj instanceof ymaps.Polyline) {
      geoObjectsToKeep.push(obj);
    }
  }

  // Удаляем все объекты
  map.geoObjects.removeAll();

  // Возвращаем сохраненные объекты
  geoObjectsToKeep.forEach((obj) => {
    map.geoObjects.add(obj);
  });

  pointsOnMap.value = 0;
};

const updateDevicesData = async () => {
  try {
    const response = await fetch("https://meshtasticback.taubetele.com/dots");
    const data = await response.json();

    if (data && data.data) {
      devices.value = data.data;
      const count = Object.keys(data.data).length;
      emit("devicesCount", count, data.data);

      if (typeof debouncedRenderBallons === "function") {
        debouncedRenderBallons(devices.value, true);
      }
    }
  } catch (error) {
    console.error("❌ Ошибка обновления данных устройств:", error);
  }
};

onMounted(async () => {
  // Проверяем наличие API ключа
  const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY;
  if (!apiKey) {
    console.error(
      "❌ Yandex Maps API ключ не найден! Создайте файл .env с VITE_YANDEX_MAPS_API_KEY"
    );
    geolocationStatus.value = {
      type: "error",
      message: "❌ API ключ Yandex Maps не найден. Создайте файл .env",
    };
    return;
  }

  startDataUpdates();

  onUnmounted(() => {
    stopDataUpdates();
    // Очищаем глобальную функцию фокусировки
    if (window.focusOnDevice) {
      delete window.focusOnDevice;
    }
  });

  const renderSelfBallon = (shouldSetCenter = false) => {
    // Проверяем поддержку геолокации
    if (!navigator.geolocation) {
      geolocationStatus.value = {
        type: "error",
        message: "Геолокация не поддерживается браузером",
      };
      if (shouldSetCenter) {
        map.setCenter(MAP_CONFIG.DEFAULT_CENTER, MAP_CONFIG.DEFAULT_ZOOM);
      }
      return;
    }

    // Сначала пробуем браузерную геолокацию
    navigator.geolocation.getCurrentPosition(
      (position) => {
        try {
          const coords = [position.coords.latitude, position.coords.longitude];

          // Создаем маркер геолокации
          const geolocationPlacemark = new ymaps.Placemark(
            coords,
            {
              balloonContentBody: "Вы здесь!",
            },
            {
              preset: MAP_PRESETS.GEOLOCATION,
            }
          );

          map.geoObjects.add(geolocationPlacemark);

          if (shouldSetCenter) {
            map.setCenter(coords, MAP_CONFIG.DEFAULT_ZOOM + 3);
          }
        } catch (error) {
          console.error("Ошибка обработки браузерной геолокации:", error);
          geolocationStatus.value = {
            type: "error",
            message: "Ошибка обработки геолокации",
          };
          if (shouldSetCenter) {
            map.setCenter(MAP_CONFIG.DEFAULT_CENTER, MAP_CONFIG.DEFAULT_ZOOM);
          }
        }
      },
      (error) => {
        // Fallback к Yandex Maps геолокации
        ymaps.geolocation
          .get({
            provider: "auto",
            mapStateAutoApply: false,
            timeout: 10000,
          })
          .then(function (result) {
            try {
              result.geoObjects.options.set("preset", MAP_PRESETS.GEOLOCATION);
              result.geoObjects
                .get(0)
                .properties.set({ balloonContentBody: "Вы здесь!" });
              map.geoObjects.add(result.geoObjects);

              if (shouldSetCenter) {
                const coords = result.geoObjects
                  .get(0)
                  .geometry.getCoordinates();
                map.setCenter(coords, MAP_CONFIG.DEFAULT_ZOOM + 1);
              }
            } catch (error) {
              console.error("Ошибка обработки Yandex Maps геолокации:", error);
              geolocationStatus.value = {
                type: "error",
                message: "Ошибка обработки Yandex Maps геолокации",
              };
              if (shouldSetCenter) {
                map.setCenter(
                  MAP_CONFIG.DEFAULT_CENTER,
                  MAP_CONFIG.DEFAULT_ZOOM
                );
              }
            }
          })
          .catch(function (error) {
            if (shouldSetCenter) {
              map.setCenter(MAP_CONFIG.DEFAULT_CENTER, MAP_CONFIG.DEFAULT_ZOOM);
            }
          });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 10000, // 1 минута
      }
    );
  };

  // Функция для фокусировки карты на устройстве
  const focusOnDevice = (coordinates) => {
    if (
      !map ||
      !coordinates ||
      !coordinates.latitude ||
      !coordinates.longitude
    ) {
      console.warn("Не удалось сфокусироваться на устройстве:", coordinates);
      return;
    }

    try {
      const coords = [coordinates.latitude, coordinates.longitude];
      console.log("Фокусируем карту на устройстве:", coords);

      // Центрируем карту на координатах устройства с увеличенным зумом
      map.setCenter(coords, MAP_CONFIG.DEFAULT_ZOOM + 2);

      // Показываем статус успешной фокусировки
      geolocationStatus.value = {
        type: "success",
        message: `📍 Карта сфокусирована на устройстве`,
      };

      // Автоматически скрываем статус через 3 секунды
      setTimeout(() => {
        if (geolocationStatus.value?.type === "success") {
          geolocationStatus.value = null;
        }
      }, 3000);
    } catch (error) {
      console.error("Ошибка фокусировки на устройстве:", error);
      geolocationStatus.value = {
        type: "error",
        message: "Ошибка фокусировки на устройстве",
      };
    }
  };

  const initYMap = () => {
    map = new ymaps.Map("map", {
      center: MAP_CONFIG.DEFAULT_CENTER,
      zoom: MAP_CONFIG.DEFAULT_ZOOM,
    });
    map.controls.remove("fullscreenControl");
    map.controls.remove("searchControl");

    let infoButton = new ymaps.control.Button("INFO");
    map.controls.add(infoButton, {
      selectOnClick: false,
      float: "left",
      floatIndex: 1,
    });
    infoButton.events.add("click", function () {
      emit("infoOpen");
    });

    let searchButton = new ymaps.control.Button("ПОИСК");
    map.controls.add(searchButton, {
      selectOnClick: false,
      float: "left",
      floatIndex: 2,
    });
    searchButton.events.add("click", function () {
      emit("searchOpen");
    });

    const onBoundsChange = async () => {
      // Сохраняем информацию об открытом баллуне перед обновлением
      let openedBalloonInfo = null;
      let openedBalloonContent = null;
      if (openedNodeId) {
        // Находим текущий открытый баллун и сохраняем его состояние
        const currentPlacemarks = map.geoObjects.getAll();
        for (let obj of currentPlacemarks) {
          // Проверяем обычные маркеры
          if (
            obj.properties &&
            obj.properties._data &&
            obj.properties._data.nodeId === openedNodeId &&
            obj.balloon &&
            obj.balloon.isOpen()
          ) {
            openedBalloonInfo = {
              nodeId: openedNodeId,
              isOpen: true,
            };
            openedBalloonContent = obj.properties.get("balloonContentBody");
            break;
          }
          // Проверяем кластеры
          else if (obj.getGeoObjects) {
            const placemarksInCluster = obj.getGeoObjects();
            for (let placemark of placemarksInCluster) {
              if (
                placemark.properties &&
                placemark.properties._data &&
                placemark.properties._data.nodeId === openedNodeId &&
                placemark.balloon &&
                placemark.balloon.isOpen()
              ) {
                openedBalloonInfo = {
                  nodeId: openedNodeId,
                  isOpen: true,
                };
                openedBalloonContent =
                  placemark.properties.get("balloonContentBody");
                break;
              }
            }
            if (openedBalloonInfo) break;
          }
        }
      }

      // Загружаем новые данные при изменении границ карты
      try {
        geolocationStatus.value = {
          type: "warning",
          message: "🔄 Загрузка новых данных...",
        };
        await fetchDevicesData();
        // Скрываем статус загрузки через 2 секунды
        setTimeout(() => {
          if (geolocationStatus.value?.type === "warning") {
            geolocationStatus.value = null;
          }
        }, 2000);
      } catch (error) {
        geolocationStatus.value = {
          type: "error",
          message: "❌ Ошибка загрузки новых данных",
        };
        // Скрываем ошибку через 5 секунд
        setTimeout(() => {
          if (geolocationStatus.value?.type === "error") {
            geolocationStatus.value = null;
          }
        }, 5000);
        // Продолжаем работу с существующими данными
      }

      filteredDevicesCache.value.clear();
      clearDeviceMarkers();
      pointsOnMap.value = 0;

      // Рендерим баллуны с сохранением состояния открытого баллуна
      renderBallonsWithState(
        devices?.value,
        openedBalloonInfo,
        openedBalloonContent
      );
    };

    map.events.add(
      "boundschange",
      debounce(onBoundsChange, UI_CONFIG.DEBOUNCE_MAP_DELAY)
    );

    map.events.add(
      "zoomchange",
      debounce(onBoundsChange, UI_CONFIG.DEBOUNCE_MAP_DELAY)
    );
  };

  const init = async () => {
    initYMap();
    renderSelfBallon(true);
    await fetchDevicesData();
    debouncedRenderBallons(devices?.value);

    // Слушаем событие фокусировки на устройстве
    emit("focusOnDevice", focusOnDevice);

    // Делаем функцию фокусировки доступной глобально
    window.focusOnDevice = focusOnDevice;

    watch(devices, (newDevices) => {
      map.geoObjects?.removeAll();
      pointsOnMap.value = 0;
      filteredDevicesCache.value.clear();
      renderSelfBallon(false);
      debouncedRenderBallons(newDevices);
      renderPath(openedNodeId);
    });
  };

  if (window.ymaps) {
    window.ymaps.ready(() => init().catch(console.error));
  } else {
    const script = document.createElement("script");
    const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY;
    if (!apiKey) {
      console.error(
        "❌ Yandex Maps API ключ не найден! Создайте файл .env с VITE_YANDEX_MAPS_API_KEY"
      );
      return;
    }
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
    script.async = true;

    script.onload = () => {
      if (window.ymaps) {
        window.ymaps.ready(() => init().catch(console.error));
      }
    };

    script.onerror = () => {
      console.error("❌ Ошибка загрузки Yandex Maps API");
    };

    document.head.appendChild(script);
  }
});
</script>

<style lang="scss">
.node-counter {
  position: absolute;
  bottom: 35px;
  left: 7px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(5px);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.1);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  z-index: 1000;
  user-select: none;
  pointer-events: none;
}

.update-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 11px;
  color: #666;
}

.update-dot {
  width: 6px;
  height: 6px;
  background: #4caf50;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.update-text {
  font-size: 10px;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  40% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}

.geolocation-status {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(5px);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.1);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  z-index: 1000;
  user-select: none;
  pointer-events: none;
  max-width: 300px;
  word-wrap: break-word;
}

.geolocation-status .success {
  color: #2e7d32;
}

.geolocation-status .warning {
  color: #f57c00;
}

.geolocation-status .error {
  color: #d32f2f;
}
</style>
